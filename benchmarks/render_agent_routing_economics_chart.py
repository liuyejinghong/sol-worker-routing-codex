#!/usr/bin/env python3
"""Render the 2026-08-13 agent-routing evidence chart from checked-in data."""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager


ROOT = Path(__file__).resolve().parents[1]
TRACE = ROOT / "benchmarks" / "tracelab-token-economics-2026-08-13.json"
PILOT = ROOT / "benchmarks" / "pilot-2026-08-09.csv"
OUTPUT = ROOT / "docs" / "assets" / "agent-routing-economics-zh-2026-08-13.png"
FLASH = "deepseek_worker"
LUNA = "luna_worker"
COLORS = {"prefix": "#7357D8", "append": "#F5A623", FLASH: "#16A085", LUNA: "#4864D8"}


def paired_totals() -> dict[str, dict[str, int]]:
    with PILOT.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    by_case: defaultdict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    for row in rows:
        if row["acceptance"] == "pass" and row["worker"] in {FLASH, LUNA}:
            by_case[row["case"]][row["worker"]] = row
    pairs = [group for group in by_case.values() if set(group) == {FLASH, LUNA}]
    return {
        worker: {
            "wall_seconds": sum(int(pair[worker]["wall_seconds"]) for pair in pairs),
            "generated_tokens": sum(int(pair[worker]["generated_tokens"]) for pair in pairs),
        }
        for worker in (FLASH, LUNA)
    }


def configure_fonts() -> None:
    candidates = ["PingFang SC", "Hiragino Sans GB", "Arial Unicode MS", "DejaVu Sans"]
    available = {font.name for font in font_manager.fontManager.ttflist}
    plt.rcParams["font.family"] = next(font for font in candidates if font in available)
    plt.rcParams["axes.unicode_minus"] = False


def style_axis(axis: plt.Axes) -> None:
    axis.grid(axis="y", color="#DDE2EA", linewidth=0.8)
    axis.set_axisbelow(True)
    axis.tick_params(axis="x", labelsize=10, colors="#39445A", length=0, pad=8)
    axis.tick_params(axis="y", labelsize=9, colors="#7A8495", length=0)
    for spine in axis.spines.values():
        spine.set_visible(False)


def main() -> None:
    trace = json.loads(TRACE.read_text(encoding="utf-8"))
    totals = paired_totals()
    prefix_share = trace["input_composition_percent"]["prefix_tokens"]
    append_share = trace["input_composition_percent"]["newly_append_tokens"]
    input_total = trace["token_totals"]["input_tokens_total"] / 1_000_000_000

    configure_fonts()
    fig, axes = plt.subplots(1, 3, figsize=(16, 6.3), facecolor="#F7F8FB")
    fig.subplots_adjust(left=0.055, right=0.985, top=0.68, bottom=0.18, wspace=0.42)
    fig.text(0.055, 0.93, "为什么按任务分流，而不是只看单价", fontsize=24, fontweight="bold", color="#172033")
    fig.text(
        0.055,
        0.865,
        "全量公开工程轨迹说明：上下文重读主导 token 风险；本地同合同试点说明：边界清晰的工作不必默认交给深度模型。",
        fontsize=12,
        color="#5F6B7A",
    )

    axis = axes[0]
    axis.barh([0], [prefix_share], color=COLORS["prefix"], height=0.46, label="累积前缀")
    axis.barh([0], [append_share], left=[prefix_share], color=COLORS["append"], height=0.46, label="新追加")
    axis.set_xlim(0, 100)
    axis.set_yticks([])
    axis.set_xticks([0, 25, 50, 75, 100], ["0%", "25%", "50%", "75%", "100%"])
    axis.set_title("真实工程输入 token 组成", loc="left", y=1.18, fontsize=14, fontweight="bold", pad=0, color="#172033")
    axis.text(0, 1.09, f"{input_total:.2f}B 输入 token · 357,161 步", transform=axis.transAxes, fontsize=10.5, color="#5F6B7A")
    axis.text(prefix_share / 2, 0, f"前缀\n{prefix_share:.3f}%", ha="center", va="center", fontsize=11, fontweight="bold", color="white")
    axis.text(prefix_share + append_share / 2, 0, f"新追加\n{append_share:.3f}%", ha="center", va="center", fontsize=9, fontweight="bold", color="#172033")
    axis.legend(loc="lower left", bbox_to_anchor=(0, -0.47), ncol=2, frameon=False, fontsize=10)
    for spine in axis.spines.values():
        spine.set_visible(False)
    axis.tick_params(axis="x", labelsize=9, colors="#7A8495", length=0)

    labels = ["Flash", "Luna Max"]
    time_values = [totals[FLASH]["wall_seconds"], totals[LUNA]["wall_seconds"]]
    axis = axes[1]
    bars = axis.bar(labels, time_values, color=[COLORS[FLASH], COLORS[LUNA]], width=0.56)
    axis.set_ylim(0, max(time_values) * 1.26)
    axis.set_title("同合同任务：Worker 耗时", loc="left", y=1.18, fontsize=14, fontweight="bold", pad=0, color="#172033")
    axis.text(0, 1.09, "两组配对；两者均通过 2/2", transform=axis.transAxes, fontsize=10.5, color="#5F6B7A")
    style_axis(axis)
    axis.set_ylabel("秒", color="#7A8495", labelpad=8)
    for bar, value in zip(bars, time_values):
        axis.text(bar.get_x() + bar.get_width() / 2, value + max(time_values) * 0.04, f"{value:,}", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#172033")

    token_values = [totals[FLASH]["generated_tokens"], totals[LUNA]["generated_tokens"]]
    axis = axes[2]
    bars = axis.bar(labels, token_values, color=[COLORS[FLASH], COLORS[LUNA]], width=0.56)
    axis.set_ylim(0, max(token_values) * 1.26)
    axis.set_title("同合同任务：生成 token", loc="left", y=1.18, fontsize=14, fontweight="bold", pad=0, color="#172033")
    axis.text(0, 1.09, "output + reasoning；不是账单", transform=axis.transAxes, fontsize=10.5, color="#5F6B7A")
    style_axis(axis)
    axis.set_ylabel("token", color="#7A8495", labelpad=8)
    for bar, value in zip(bars, token_values):
        axis.text(bar.get_x() + bar.get_width() / 2, value + max(token_values) * 0.04, f"{value:,}", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#172033")

    fig.text(
        0.055,
        0.065,
        "左：TraceLab v0.0.1 公开脱敏全量轨迹，本仓库于 2026-08-13 完整校验并复算。中/右：本地历史配对试点；样本小，只支持固定来源、机械验收任务的路由结论。\n"
        "前缀 token 占比不等于账单占比：实际费用取决于缓存命中、价格、模型与重试。",
        fontsize=9.2,
        color="#7A8495",
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUTPUT, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


if __name__ == "__main__":
    main()
