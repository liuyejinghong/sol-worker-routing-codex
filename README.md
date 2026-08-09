<div align="center">
  <h1>Sol Worker Routing for Codex</h1>
  <p><strong>Sol 保留目标与判断；DeepSeek 处理可机械验收的证据；Luna Max 完成有界的语义执行。</strong></p>
  <p>可直接交给 Codex 安装的双 Worker 工作流，用第一性原理限制过度编程、过度测试与无意义并行。</p>
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

## 交给 Codex 的三步安装

这个仓库既供人阅读，也可以直接交给 Agent 部署。仓库内的 [`AGENTS.md`](AGENTS.md) 把写入权限限制为两个 Agent 配置和一个 Skill；安装器先检测冲突，任何目标存在不同内容都会在写入前停止。

```text
请为我的 Codex 用户配置安装 https://github.com/liuyejinghong/sol-worker-routing-codex 。
先读取并遵守仓库里的 AGENTS.md，保留现有 Codex 配置，遇到冲突不要覆盖。
安装后验证 deepseek_worker、luna_worker 和 sol-worker-routing Skill，
并说明我还需要完成的人工步骤。
```

也可以在本地执行：

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

安装器只会写入以下文件：

```text
~/.codex/agents/deepseek-worker.toml
~/.codex/agents/luna-worker.toml
~/.agents/skills/sol-worker-routing/SKILL.md
```

接着在 Codex App 的“设置 → 个性化 → 自定义指令”中，从 [`personalization.md`](personalization.md) 复制一个完整语言块。GitHub 文件和 `AGENTS.md` 不能代替账号级个性化设置；通常无需重启，建议新建一个任务验证路由。

DeepSeek lane 还需要你已经在 Codex 中配置名为 `deepseek` 的 provider 与凭据。安装器不会写入 `config.toml`、导入密钥或替你开通服务；provider 不可用时，Sol 不应假装 DeepSeek 已运行。

## 一个主线程，三条执行路径

这个 Skill 的任务卡不是 Codex UI 功能，而是 Sol 写给 Worker 的最小执行合同。Sol 先把模糊性收敛为一个可验收结果，再决定是否需要交接。

```mermaid
flowchart LR
    U["用户目标"] --> S["Sol<br/>目标、边界、拆分、整合"]
    S -->|"一步即可完成"| D["Sol 直接执行"]
    S -->|"来源固定、可机械验收"| DS["DeepSeek worker<br/>证据与机械任务"]
    S -->|"有界但需语义理解"| L["Luna Max worker<br/>审查、分析、实现、诊断"]
    D --> O["Sol 验收并交付"]
    DS -->|"事实与检查结果"| S
    L -->|"变更、验证、风险"| S
    S --> O
```

| 任务性质 | 路由 | 原因 |
|---|---|---|
| 极小、一步即可完成 | Sol 直接完成 | 子代理交接会增加 token 和等待 |
| 固定来源、偏阅读、可机械验证 | `deepseek_worker` | 证据链短，验收可由命令或固定事实决定 |
| 代码审查、模块分析、独立实现、聚焦排障 | `luna_worker` | 需要跨文件理解或局部语义判断 |
| 模糊、耦合、共享状态、架构、最终决策 | Sol | 不能把整体判断外包给 Worker |

DeepSeek 与 Luna 是同一层级的叶子 Worker，不是前后级。只有“先查证据、再做实现”时才按 `DeepSeek → Sol → Luna` 顺序衔接；同一状态、同一写入面或存在顺序依赖时不并行。默认最多两个 Worker、深度一层，Worker 不再委派。

## Worker 收到什么

Sol 负责拆分，Worker 不负责发现自己的范围。每个包只带必要事实，并固定为：

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

DeepSeek 默认只读；只有明确列出可写路径、机械验收和授权时才允许做最小补丁。Luna 可以处理独立实现与诊断，但同样不能改变父目标、架构、优先级或授权边界。包不足时，正确结果是返回精确 blocker，而不是自行扩大调查范围。

一个适合 DeepSeek 的完整包可以是：

```text
Worker and mode: deepseek_worker | read-only evidence
Objective: 说明指定提交中某个开关的默认值和实际调用点。
Scope and owned paths: README.md, src/options.ts；不写文件。
Relevant facts / source pins: repository@<immutable-sha>。
Non-goals: 不提出架构建议，不安装依赖，不搜索其他分支。
Acceptance criteria: 每条结论附 file:line；运行指定只读命令。
Verification: git status --short 与给定断言命令。
Stop condition: 目标提交或事实不在本地时返回 blocker。
Return format: Facts; command result; files changed; risks.
```

## 为什么不是“所有任务都交给更便宜的模型”

[DeepSeek 官方 2026-07-31 更新](https://api-docs.deepseek.com/updates/)说明 `deepseek-v4-flash` 支持 Responses API，并针对 Codex 做了适配。它适合作为低成本证据 lane 的前提是任务已经被 Sol 收敛到固定来源和可机械验收，而不是让它自行解释模糊需求。

[DeepSWE v1.1 成本榜](https://deepswe.datacurve.ai/) 在 2026-08-07 的页面快照中报告：`deepseek-v4-flash[max]` 为 53%±4%、平均 $0.10/任务；`gpt-5.6-luna[max]` 为 67%±4%、平均 $0.61/任务。前者便宜约 83.6%，后者在该长程工程基准上成功率更高。它们不是“谁更强”的通用结论，而是把证据任务与语义执行拆开的理由。

[![DeepSWE v1.1 成本榜中的 DeepSeek 与 Luna](docs/assets/deepswe-v1.1-cost-leaderboard.png)](https://deepswe.datacurve.ai/)

图为历史快照；模型数字和榜单更新时间应以链接中的实时页面为准。

这套路由并不要求每个任务都使用 Worker。极小任务保留在 Sol，避免为了节省模型价格反而支付更多交接时间；需要语义判断的有界工作由 Luna Max 处理，避免低成本模型在不完整任务上引入返工。

## 首轮可复现基准

仓库提供了四类常见开源场景：代码事实查找、失败诊断、窄机械补丁和有界代码审查。它们均来自固定 GitHub 提交、PR 或讨论，且只在临时公开工作树运行。完整的案例、命令、原始聚合数据、图表和限制见 [`benchmarks/README.md`](benchmarks/README.md) 与 [`benchmarks/report-2026-08-09.md`](benchmarks/report-2026-08-09.md)。

[![双 Worker 首轮配对基准](docs/assets/benchmark-pilot-2026-08-09.png)](benchmarks/report-2026-08-09.md)

### 本仓库可复核的成本记录

| 路由 | 同合同案例 | 验收 | Worker 墙钟 | 生成 token |
|---|---|---:|---:|---:|
| 旧策略：全部交给 Luna Max | B1 只读证据 + B3 机械补丁 | 2 / 2 | 235s | 16,708 |
| 新策略：交给 DeepSeek evidence lane | 同一 B1 + B3 合同 | 2 / 2 | 88s | 5,081 |
| 差异 | 验收相同 | — | −147s（−62.6%） | −11,627（−69.6%） |

数据来自 [`pilot-2026-08-09.csv`](benchmarks/pilot-2026-08-09.csv)，逐例验收、命令和限制在[`完整报告`](benchmarks/report-2026-08-09.md)。`生成 token = output_tokens + reasoning_tokens`，只是在同一客户端和相同任务合同下的工作量代理；它**不是**输入/总 token 统计，也不是实际美元账单。样本只有两组、每组一次，不能外推为通用质量排名；它只验证了该 evidence / 机械 lane 的边界。

## 不规定流程，只约束工作方式

TDD、spec-first 和固定审查轮次可以有用，但它们不应成为模型工作的目标。能力增强后，重流程可能驱动模型继续生成抽象、测试、审查器和工具，直到工作量脱离原始问题。

这里不强制某个开发流程。它要求先明确最终目标、不可变事实、最小验收标准和授权边界，再选最短、最直接、可验证的路径。每增加一个测试、gate、dry-run、审查或工具，都必须能回答：它保护什么具体且不可逆的风险；失败会改变什么决策；为什么现有更便宜的证据不足。

默认验证是“一次聚焦合同检查 + 一次真实链路结果核对”。候选和事实未变化时不重复验证；如果验证比实现更贵，或连续两步只是在修复验证层而没有增加原始目标的事实，就停止扩张工具链并回到根问题。

## 不做常驻成本探针

Skill 不具备可靠的全局调用截获能力；给每个任务额外埋点也会增加上下文、I/O 和隐私面，容易把测量本身变成流程负担。因此本仓库不在正常委派中统计 token 或估算美元成本。

只有用户明确要求成本评估或重跑基准时，才建议由 Sol 启用可选诊断：记录 Worker、模型/推理强度、起止时间、终态和验收结果；客户端原生提供 usage 时才记录它，缺失就标为未知。它不记录完整对话、源码或密钥，也不从 Worker 自述推断账单。

## 配置与安全边界

| 文件 | 职责 |
|---|---|
| [`personalization.md`](personalization.md) | App 级路由偏好，需人工粘贴 |
| [`skills/sol-worker-routing/SKILL.md`](skills/sol-worker-routing/SKILL.md) | Sol 的直接门槛、分流、任务包、验收与整合 |
| [`agents/deepseek-worker.toml`](agents/deepseek-worker.toml) | DeepSeek 证据/机械 Worker 的模型与边界 |
| [`agents/luna-worker.toml`](agents/luna-worker.toml) | Luna Max 语义执行 Worker 的模型与边界 |
| [`scripts/install.sh`](scripts/install.sh) | 冲突前置、最小写入、旧 Skill 路径迁移 |
| [`AGENTS.md`](AGENTS.md) | Agent 部署本仓库时的授权合同 |
| [`benchmarks/`](benchmarks/) | 可复现案例、数据和首轮报告 |

安装器不会编辑 `config.toml`、其他 Agent、其他 Skill、全局或项目 `AGENTS.md`、以及 Codex App 设置。它只会把内容可验证为已知旧版本、且没有符号链接的 `sol-luna-workflow` 从 `~/.agents/skills/` 或旧的 `~/.codex/skills/` 迁移到 `~/.agents/skills/sol-worker-routing/`；任何未知旧内容都会停止，不会覆盖或删除。Agent 使用 `${CODEX_HOME:-~/.codex}`，Skill 使用官方用户路径 `~/.agents/skills`。

这是社区工作流，不是 OpenAI 官方预设。安装后应该先委派一个答案明确、只读的小任务，并查看客户端实际暴露的子代理元数据；Worker 文本自称某个模型不能证明有效路由。

作者环境使用 `codex-cli 0.147.0-alpha.6.5` 完成了 DeepSeek 的只读与最小补丁 smoke test，并解析了两个 TOML。该客户端仍可能对自定义 DeepSeek 模型显示 metadata fallback 或模型列表警告；这不等于任务必然失败，但出现调用或路由异常时应把 DeepSeek lane 视为不可用，而不是静默改写结果归属。

## 使用观测

下面是作者账号的 Codex 汇总用量。它可用于观察 Sol、Luna 与 DeepSeek 的总体分布，但不证明每个 token 都由本仓库触发，也不能替代每个任务的验收。

[![liuyejinghong 的 Codex token 使用情况](https://tokens.ci/api/embed/liuyejinghong/svg?tokens=compact&cost=compact)](https://tokens.ci/u/liuyejinghong)

## 参考资料

| 主题 | 来源 |
|---|---|
| Codex 子代理和自定义 Agent | [OpenAI Developers](https://developers.openai.com/codex/agent-configuration/subagents) |
| Codex Skills 与发现路径 | [OpenAI Developers](https://developers.openai.com/codex/skills) |
| Codex 指令发现顺序 | [OpenAI Developers](https://developers.openai.com/codex/guides/agents-md) |
| DeepSeek V4-Flash 更新 | [DeepSeek API Docs](https://api-docs.deepseek.com/updates/) |
| DeepSWE v1.1 榜单 | [DataCurve](https://deepswe.datacurve.ai/) |
| Oh My OpenAgent 编排参考 | [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) |
