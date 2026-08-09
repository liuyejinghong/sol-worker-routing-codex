<div align="center">
  <h1>Sol Worker Routing for Codex</h1>
  <p><strong>把合适的任务，交给合适的 Worker。</strong></p>
  <p>Sol 负责目标与判断，DeepSeek 处理证据和机械任务，Luna Max 完成需要语义理解的有界工作。</p>
  <p>
    <strong>简体中文</strong> ·
    <a href="README.en.md">English</a> ·
    <a href="CHANGELOG.md">更新日志</a>
  </p>
  <p>
    <a href="https://github.com/liuyejinghong/sol-worker-routing-codex/tags"><img src="https://img.shields.io/github/v/tag/liuyejinghong/sol-worker-routing-codex?label=version" alt="版本"></a>
    <a href="https://github.com/liuyejinghong/sol-worker-routing-codex/stargazers"><img src="https://img.shields.io/github/stars/liuyejinghong/sol-worker-routing-codex?style=flat" alt="GitHub Stars"></a>
  </p>
</div>

## 它解决什么问题

让同一个模型包办所有工作，通常会遇到两个问题：简单任务消耗了不必要的时间和 token，复杂任务又可能被过早交给只适合机械执行的 Worker。

Sol Worker Routing 按“任务需要怎样的理解和验收”来分流，而不是简单地按模型价格或能力排名。Sol 始终留在主线程，保留完整目标、授权边界和最终判断；两个 Worker 只接收已经收敛、能够独立验收的任务。

| 执行者 | 最适合的工作 | 典型例子 |
|---|---|---|
| **Sol** | 极小任务、模糊问题、架构与最终决策 | 判断是否该改、整合多个结果、直接完成一步修改 |
| **DeepSeek** | 来源固定、偏阅读、可机械验收 | 查找代码事实、整理证据、完成单文件机械补丁 |
| **Luna Max** | 有明确边界、但需要语义理解 | 代码审查、模块分析、独立实现、聚焦排障 |

## 同类任务，成本差多少

我们把相同的两项证据/机械任务分别交给 DeepSeek 和 Luna Max。任务目标、范围、验收命令和停止条件完全一致，两个 Worker 都通过了 **2/2** 项验收。

[![同类任务成本对比](docs/assets/benchmark-cost-comparison-zh-2026-08-09.png)](benchmarks/report-2026-08-09.md)

| Worker | 通过任务 | 总耗时 | 生成 token |
|---|---:|---:|---:|
| **DeepSeek** | 2 / 2 | **88 秒** | **5,081** |
| Luna Max | 2 / 2 | 235 秒 | 16,708 |

在相同验收结果下，DeepSeek 少用了 **147 秒**和 **11,627 个生成 token**，对应耗时减少 **62.6%**、生成 token 减少 **69.6%**。这说明把来源固定、可机械验收的工作从 Luna Max 分流出去，能够显著降低这一类任务的 Worker 成本。

> 这是两项配对任务的实测结果，不是通用模型排名。生成 token 为 `output token + reasoning token`，用于比较同一客户端内的工作量，不等同于美元账单或总 token。复现方法、逐项结果和样本限制见[完整报告](benchmarks/report-2026-08-09.md)，原始数据见 [CSV](benchmarks/pilot-2026-08-09.csv)。图表由 [`render_readme_chart.py`](benchmarks/render_readme_chart.py) 直接从 CSV 生成。

## 路由是怎样工作的

```mermaid
flowchart LR
    U["用户目标"] --> S["Sol<br/>理解、拆分、验收、整合"]
    S -->|"一步即可完成"| D["Sol 直接完成"]
    S -->|"证据固定、机械可验收"| DS["DeepSeek"]
    S -->|"需要有界语义理解"| L["Luna Max"]
    D --> O["最终结果"]
    DS --> S
    L --> S
    S --> O
```

DeepSeek 与 Luna Max 是并列的叶子 Worker，不是前后级关系。Sol 只在任务可以独立完成、范围不重叠时才并行；存在共享状态、顺序依赖或同一写入面时，任务会按顺序执行。

这个分工还有一个简单但重要的原则：如果 Sol 一步就能完成，就不为“使用子代理”而交接。交接本身也会消耗时间和 token。

## 安装

最简单的方式，是把下面这段话直接交给 Codex：

```text
请为我的 Codex 用户配置安装 https://github.com/liuyejinghong/sol-worker-routing-codex 。
先读取并遵守仓库里的 AGENTS.md，保留现有 Codex 配置，遇到冲突不要覆盖。
安装后验证 deepseek_worker、luna_worker 和 sol-worker-routing Skill，
并说明我还需要完成的人工步骤。
```

也可以在终端安装：

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

安装完成后还需要两步：

1. 从 [`personalization.md`](personalization.md) 复制一个完整语言块，粘贴到 Codex App 的“设置 → 个性化 → 自定义指令”。
2. 确认 Codex 已配置名为 `deepseek` 的 provider 和可用凭据，然后新建一个任务验证路由。

安装器不会编辑 `config.toml`、导入密钥或修改 App 设置。DeepSeek provider 不可用时，这条 lane 应明确返回不可用，不能假装已经调用成功。

## 实际使用方式

安装后不需要手动指定每个 Worker。正常描述目标即可，Sol 会先判断是否值得交接：

```text
查清这个固定提交里配置项的默认值和调用位置，每条结论给出行号。
```

来源和验收都固定时，适合交给 DeepSeek。

```text
审查这个模块的取消与资源清理路径，只报告能够定位和复现的问题。
```

需要跨文件语义理解，但范围清楚时，适合交给 Luna Max。

```text
判断这次需求是否值得改变现有架构，并给出最终方案。
```

这类问题保留给 Sol，因为 Worker 不应替主线程改变目标或做最终决策。

<details>
<summary>查看 Sol 交给 Worker 的任务合同</summary>

```text
Worker and mode:
Objective:
Scope and owned paths:
Relevant facts / source pins:
Non-goals:
Acceptance criteria:
Verification:
Stop condition:
Return format:
```

这不是额外的用户流程，而是 Sol 在后台给 Worker 的最小上下文。任务信息不足时，Worker 应返回明确的 blocker，而不是自行扩大范围。

</details>

## 少一些流程，多一些有效证据

这个工作流不强制 TDD、spec-first 或固定审查轮次。它先明确最终目标、不可变事实、最小验收标准和授权边界，再选择最短、最直接、可验证的路径。

默认只做“一次聚焦合同检查 + 一次真实链路结果核对”。新增测试、gate、dry-run 或工具之前，先确认它保护了什么具体风险，以及失败是否真的会改变决策。如果验证层开始比实现本身更复杂，就回到原始目标重新简化。

## 安装边界与项目文件

安装器只写入两个 Agent 配置和一个 Skill；遇到不同内容会在覆盖前停止：

```text
~/.codex/agents/deepseek-worker.toml
~/.codex/agents/luna-worker.toml
~/.agents/skills/sol-worker-routing/SKILL.md
```

| 文件 | 用途 |
|---|---|
| [`personalization.md`](personalization.md) | 需要手动粘贴的全局路由偏好 |
| [`skills/sol-worker-routing/SKILL.md`](skills/sol-worker-routing/SKILL.md) | Sol 的分流、验收和整合规则 |
| [`agents/`](agents/) | DeepSeek 与 Luna Max 的 Worker 配置 |
| [`scripts/install.sh`](scripts/install.sh) | 冲突检测、最小安装和旧名称迁移 |
| [`benchmarks/`](benchmarks/) | 基准案例、原始数据与完整报告 |

已知旧版 `sol-luna-workflow` 只会在内容与历史版本一致、且路径不是符号链接时迁移；未知内容不会被覆盖或删除。这是社区工作流，不是 OpenAI 官方预设。配置文件和 Worker 自述也不能单独证明路由成功，应以客户端实际返回的子代理信息和任务验收结果为准。

## 参考资料

- [Codex 子代理和自定义 Agent](https://developers.openai.com/codex/agent-configuration/subagents)
- [Codex Skills 与发现路径](https://developers.openai.com/codex/skills)
- [Codex 指令发现顺序](https://developers.openai.com/codex/guides/agents-md)
- [Oh My OpenAgent 编排参考](https://github.com/code-yeongyu/oh-my-openagent)
