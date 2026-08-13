#!/usr/bin/env python3
"""Recompute token-economics aggregates from the public TraceLab v0.0.1 trace.

The source is a sanitized public JSONL.gz release.  This script intentionally
does not collect local Codex/Claude transcripts and does not retain the raw
download: it streams the archive, emits only aggregate JSON/CSV, and validates
the published archive checksum when the official release asset is used.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import math
import ssl
import statistics
import sys
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, BinaryIO, Iterable


DEFAULT_URL = (
    "https://github.com/uw-syfi/TraceLab/releases/download/v0.0.1/"
    "syfi_coding_trace.jsonl.gz"
)
EXPECTED_RELEASE_SHA256 = "9d265eae69a31cae203848bea936f018148eed7ca8bf56050c5abe96da0b4e6b"


class HashingReader(io.RawIOBase):
    """A minimal binary wrapper that hashes exactly the compressed bytes read."""

    def __init__(self, raw: BinaryIO) -> None:
        self._raw = raw
        self.digest = hashlib.sha256()

    def readable(self) -> bool:
        return True

    def readinto(self, buffer: bytearray) -> int:
        chunk = self._raw.read(len(buffer))
        if not chunk:
            return 0
        self.digest.update(chunk)
        size = len(chunk)
        buffer[:size] = chunk
        return size

    def close(self) -> None:
        try:
            self._raw.close()
        finally:
            super().close()


def numeric(row: dict[str, Any], *names: str) -> int | None:
    for name in names:
        value = row.get(name)
        if value is None or isinstance(value, bool):
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def text_value(row: dict[str, Any], *names: str) -> str | None:
    for name in names:
        value = row.get(name)
        if value is not None:
            return str(value)
    return None


def tool_count(row: dict[str, Any]) -> int:
    for name in ("tools", "tool_calls"):
        value = row.get(name)
        if isinstance(value, list):
            return len(value)
    value = numeric(row, "tool_call_count", "num_tool_calls")
    return value or 0


def percentile(values: list[int], fraction: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(fraction * len(ordered)) - 1))
    return ordered[index]


def summary(values: list[int]) -> dict[str, int]:
    return {
        "p50": percentile(values, 0.50),
        "p90": percentile(values, 0.90),
        "p99": percentile(values, 0.99),
    }


def new_bucket() -> dict[str, int]:
    return {
        "steps": 0,
        "tools": 0,
        "input_tokens_total": 0,
        "prefix_tokens": 0,
        "newly_append_tokens": 0,
        "output_tokens": 0,
        "reasoning_output_tokens": 0,
        "reported_input_rows": 0,
        "input_total_mismatches": 0,
    }


def add_row(bucket: dict[str, int], values: dict[str, int], tools: int) -> None:
    bucket["steps"] += 1
    bucket["tools"] += tools
    for key in (
        "input_tokens_total",
        "prefix_tokens",
        "newly_append_tokens",
        "output_tokens",
        "reasoning_output_tokens",
    ):
        bucket[key] += values[key]


def source_stream(source_path: Path | None, url: str) -> BinaryIO:
    if source_path is not None:
        return source_path.open("rb")
    # The host's stale proxy must not redirect this public release download.
    # Keep certificate validation on.  Some framework Python builds do not
    # discover macOS's CA bundle automatically, whereas certifi or the system
    # bundle is available to this host.
    ca_candidates: list[Path] = []
    try:
        import certifi

        ca_candidates.append(Path(certifi.where()))
    except ImportError:
        pass
    ca_candidates.append(Path("/etc/ssl/cert.pem"))
    ca_file = next((path for path in ca_candidates if path.is_file()), None)
    context = ssl.create_default_context(cafile=str(ca_file) if ca_file else None)
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=context)
    )
    return opener.open(url, timeout=180)  # nosec B310: fixed public release URL


def validate_and_summarize(
    source_path: Path | None, url: str, max_rows: int | None = None
) -> dict[str, Any]:
    buckets: defaultdict[str, dict[str, int]] = defaultdict(new_bucket)
    input_total_per_session: defaultdict[str, int] = defaultdict(int)
    prefix_per_step: list[int] = []
    append_per_step: list[int] = []
    output_per_step: list[int] = []
    tools_per_step: list[int] = []
    observed_fields: Counter[str] = Counter()
    rows = 0
    source = source_stream(source_path, url)
    reader = HashingReader(source)

    with io.BufferedReader(reader) as buffered:
        with gzip.GzipFile(fileobj=buffered, mode="rb") as archive:
            with io.TextIOWrapper(archive, encoding="utf-8") as lines:
                for raw_line in lines:
                    if not raw_line.strip():
                        continue
                    row = json.loads(raw_line)
                    if not isinstance(row, dict):
                        raise ValueError("Trace row is not a JSON object")
                    observed_fields.update(row.keys())

                    prefix = numeric(row, "prefix_tokens", "cached_input_tokens") or 0
                    append = numeric(row, "newly_append_tokens", "append_tokens") or 0
                    reported_input = numeric(row, "input_tokens_total", "total_input_tokens")
                    input_total = reported_input if reported_input is not None else prefix + append
                    output = numeric(row, "output_tokens", "generated_tokens") or 0
                    reasoning = numeric(
                        row,
                        "reasoning_output_tokens",
                        "reasoning_tokens",
                    ) or 0
                    provider = text_value(row, "provider") or "unknown"
                    session = text_value(row, "session_id", "session", "conversation_id")
                    tools = tool_count(row)

                    values = {
                        "input_tokens_total": input_total,
                        "prefix_tokens": prefix,
                        "newly_append_tokens": append,
                        "output_tokens": output,
                        "reasoning_output_tokens": reasoning,
                    }
                    add_row(buckets["all"], values, tools)
                    add_row(buckets[provider], values, tools)
                    if reported_input is not None:
                        buckets["all"]["reported_input_rows"] += 1
                        buckets[provider]["reported_input_rows"] += 1
                        if reported_input != prefix + append:
                            buckets["all"]["input_total_mismatches"] += 1
                            buckets[provider]["input_total_mismatches"] += 1
                    if session is not None:
                        input_total_per_session[session] += input_total
                    prefix_per_step.append(prefix)
                    append_per_step.append(append)
                    output_per_step.append(output)
                    tools_per_step.append(tools)
                    rows += 1
                    if max_rows is not None and rows >= max_rows:
                        break

    all_bucket = buckets["all"]
    if rows == 0:
        raise ValueError("Trace contained no rows")
    checksum = reader.digest.hexdigest()
    complete_release = max_rows is None
    composition_denominator = all_bucket["input_tokens_total"] or 1

    return {
        "schema_version": 1,
        "source": {
            "label": "TraceLab v0.0.1 sanitized coding-agent trace",
            "url": url,
            "local_input": source_path.name if source_path is not None else None,
            "expected_sha256": EXPECTED_RELEASE_SHA256,
            "observed_sha256": checksum if complete_release else None,
            "partial_stream_sha256": checksum if not complete_release else None,
            "complete_release": complete_release,
            "stream_row_limit": max_rows,
            "release_checksum_matches": (
                checksum == EXPECTED_RELEASE_SHA256
                if complete_release
                else None
            ),
        },
        "record_count": rows,
        "session_count": len(input_total_per_session),
        "token_totals": all_bucket,
        "input_composition_percent": {
            "prefix_tokens": round(100 * all_bucket["prefix_tokens"] / composition_denominator, 3),
            "newly_append_tokens": round(
                100 * all_bucket["newly_append_tokens"] / composition_denominator,
                3,
            ),
        },
        "per_step_percentiles": {
            "prefix_tokens": summary(prefix_per_step),
            "newly_append_tokens": summary(append_per_step),
            "output_tokens": summary(output_per_step),
            "tool_calls": summary(tools_per_step),
        },
        "per_session_input_token_percentiles": summary(
            list(input_total_per_session.values())
        ),
        "provider_breakdown": {key: buckets[key] for key in sorted(buckets) if key != "all"},
        "observed_top_level_fields": sorted(observed_fields),
    }


def write_metrics_csv(summary_data: dict[str, Any], output: Path) -> None:
    rows: list[tuple[str, str, int | float, str]] = []
    totals = summary_data["token_totals"]
    for metric in (
        "input_tokens_total",
        "prefix_tokens",
        "newly_append_tokens",
        "output_tokens",
        "reasoning_output_tokens",
        "steps",
        "tools",
    ):
        rows.append(("all", metric, totals[metric], "tokens" if "tokens" in metric else "count"))
    for metric, value in summary_data["input_composition_percent"].items():
        rows.append(("all", metric, value, "percent_of_input"))
    for scope, values in summary_data["provider_breakdown"].items():
        for metric in ("steps", "tools", "input_tokens_total", "prefix_tokens", "newly_append_tokens", "output_tokens"):
            rows.append((scope, metric, values[metric], "tokens" if "tokens" in metric else "count"))
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(("scope", "metric", "value", "unit"))
        writer.writerows(rows)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Optional local JSONL.gz source")
    parser.add_argument("--url", default=DEFAULT_URL, help="Public JSONL.gz source URL")
    parser.add_argument(
        "--max-rows",
        type=int,
        help="Read a deterministic prefix sample only; disables full-release checksum validation.",
    )
    parser.add_argument("--output", type=Path, required=True, help="Aggregate JSON output")
    parser.add_argument("--metrics-csv", type=Path, required=True, help="Flat metric output")
    args = parser.parse_args(argv)

    if args.max_rows is not None and args.max_rows <= 0:
        parser.error("--max-rows must be positive")
    result = validate_and_summarize(args.input, args.url, args.max_rows)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_metrics_csv(result, args.metrics_csv)
    print(json.dumps({
        "record_count": result["record_count"],
        "session_count": result["session_count"],
        "release_checksum_matches": result["source"]["release_checksum_matches"],
        "input_composition_percent": result["input_composition_percent"],
    }, ensure_ascii=False))
    return 0 if result["source"]["release_checksum_matches"] is not False else 2


if __name__ == "__main__":
    sys.exit(main())
