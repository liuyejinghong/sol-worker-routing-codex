#!/usr/bin/env python3
"""Render the README benchmark charts from the paired benchmark CSV."""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "benchmarks" / "pilot-2026-08-09.csv"
ASSETS = ROOT / "docs" / "assets"
WORKERS = ("deepseek_worker", "luna_worker")
COLORS = ("#16A085", "#7357D8")


def paired_totals() -> tuple[int, dict[str, dict[str, int]]]:
    with DATA.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    passed = {
        (row["case"], row["worker"]): row
        for row in rows
        if row["acceptance"] == "pass" and row["worker"] in WORKERS
    }
    cases = sorted(
        case
        for case in {row["case"] for row in rows}
        if all((case, worker) in passed for worker in WORKERS)
    )
    totals = {
        worker: {
            "wall_seconds": sum(int(passed[(case, worker)]["wall_seconds"]) for case in cases),
            "generated_tokens": sum(
                int(passed[(case, worker)]["generated_tokens"]) for case in cases
            ),
        }
        for worker in WORKERS
    }
    return len(cases), totals


def configure_fonts() -> None:
    candidates = ["PingFang SC", "Hiragino Sans GB", "Arial Unicode MS", "DejaVu Sans"]
    available = {font.name for font in font_manager.fontManager.ttflist}
    plt.rcParams["font.family"] = next(font for font in candidates if font in available)
    plt.rcParams["axes.unicode_minus"] = False


def render(lang: str, case_count: int, totals: dict[str, dict[str, int]]) -> None:
    zh = lang == "zh"
    labels = ["DeepSeek", "Luna Max"]
    time_values = [totals[worker]["wall_seconds"] for worker in WORKERS]
    token_values = [totals[worker]["generated_tokens"] for worker in WORKERS]
    time_saved = 1 - time_values[0] / time_values[1]
    tokens_saved = 1 - token_values[0] / token_values[1]

    fig, axes = plt.subplots(1, 2, figsize=(12, 5.8), facecolor="#F7F8FB")
    fig.subplots_adjust(left=0.08, right=0.97, top=0.74, bottom=0.15, wspace=0.35)
    title = "同类任务成本对比" if zh else "Same-workload cost comparison"
    subtitle = (
        f"相同 {case_count} 项任务 · 两个 Worker 均通过 {case_count}/{case_count}"
        if zh
        else f"Same {case_count} tasks · both workers passed {case_count}/{case_count}"
    )
    fig.text(0.08, 0.91, title, fontsize=24, fontweight="bold", color="#172033")
    fig.text(0.08, 0.845, subtitle, fontsize=12.5, color="#5F6B7A")

    panels = [
        (
            axes[0],
            time_values,
            "Worker 耗时（秒）" if zh else "Worker time (seconds)",
            f"DeepSeek 少用 {time_saved:.1%}" if zh else f"DeepSeek used {time_saved:.1%} less",
        ),
        (
            axes[1],
            token_values,
            "生成 token" if zh else "Generated tokens",
            f"DeepSeek 少用 {tokens_saved:.1%}" if zh else f"DeepSeek used {tokens_saved:.1%} fewer",
        ),
    ]

    for axis, values, heading, takeaway in panels:
        bars = axis.bar(labels, values, color=COLORS, width=0.56)
        axis.set_title(heading, loc="left", fontsize=14, fontweight="bold", pad=18, color="#172033")
        axis.text(
            0,
            1.03,
            takeaway,
            transform=axis.transAxes,
            fontsize=11,
            fontweight="bold",
            color=COLORS[0],
        )
        axis.set_ylim(0, max(values) * 1.24)
        axis.grid(axis="y", color="#DDE2EA", linewidth=0.8)
        axis.set_axisbelow(True)
        axis.tick_params(axis="x", labelsize=11, colors="#39445A", length=0, pad=8)
        axis.tick_params(axis="y", labelsize=9, colors="#7A8495", length=0)
        for spine in axis.spines.values():
            spine.set_visible(False)
        for bar, value in zip(bars, values):
            axis.text(
                bar.get_x() + bar.get_width() / 2,
                value + max(values) * 0.035,
                f"{value:,}",
                ha="center",
                va="bottom",
                fontsize=12,
                fontweight="bold",
                color="#172033",
            )

    footnote = (
        "数值越低越好 · 生成 token = output token + reasoning token"
        if zh
        else "Lower is better · generated tokens = output tokens + reasoning tokens"
    )
    fig.text(0.08, 0.055, footnote, fontsize=9.5, color="#7A8495")
    output = ASSETS / f"benchmark-cost-comparison-{lang}-2026-08-09.png"
    fig.savefig(output, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def main() -> None:
    configure_fonts()
    case_count, totals = paired_totals()
    for language in ("zh", "en"):
        render(language, case_count, totals)


if __name__ == "__main__":
    main()
