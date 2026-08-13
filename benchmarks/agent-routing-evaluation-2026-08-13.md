# 平衡型子代理路由评估：DeepSeek V4 Pro 0813

日期：2026-08-13（Asia/Shanghai）
目的：把不同模型放到各自最有经济意义的工作单元中，优化**通过验收的一次完成成本**，而不是片面追求最快响应或最低单价。

![子代理路由经济性证据](../docs/assets/agent-routing-economics-zh-2026-08-13.png)

## 结论先行

DeepSeek V4 Pro 0813 已通过本机最小原生 route probe，可作为**受限的中高复杂度 Worker**使用；它不取代 Flash 或 Luna：

- 保留 **Flash** 作为清晰合同、读多改少、批量和机械可验收任务的默认高吞吐 lane。
- 把 **Pro** 放在“范围已经收敛，但一次 Flash 失败或多次来回的代价已超过 Pro 增量”的位置：多文件语义实现、复杂但有界诊断、隔离 PR 的第一轮深度审查、冲突证据的结构化综合。
- 继续把 **Luna Max** 留给隐藏耦合、并发/取消/状态机、难以局部验证的修复与审查；**Sol** 保留目标、授权、架构和最终风险判断。

这个位置由四类证据共同支持：公开真实工程轨迹显示，工程 token 的主要风险是已累积上下文重读；本仓库同合同试点显示，清晰、机械的任务不必默认交给深度模型；Pro 的官方 0813 指标显示它相对 Flash 的 Agent 能力有明确提升；而新 Codex task 的最小 probe 已验证完整自包含任务的原生启动、文本、只读工具和网页搜索。私有动态交接仍需独立验收。

## 已验证事实与边界

| 证据 | 本次结论 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| TraceLab v0.0.1 全量公开脱敏轨迹 | 357,161 步、4,265 会话、432,510 工具调用完整复算；发布 SHA-256 通过 | 真正工程 Agent 的 token 组成、重尾和工具循环风险 | 某个私有仓库的精确账单或成功率 |
| 本仓库 Flash/Luna 同合同试点 | 2 个成对任务都通过；Flash 88 秒 / 5,081 生成 token，Luna 235 秒 / 16,708 | 来源固定、验收机械时 Flash 是合理的优先 lane | 通用质量排序、端到端美元成本 |
| 本机 Pro profile / 官方 0813 公告与价格页 | 独立 `deepseek_pro_worker` 已受管安装，指向 `deepseek-v4-pro`、1M context、Responses API / 工具调用；公告公布较 Flash 更高的 Agent 分数 | Profile/catalog/安装合同、价格与厂商自报能力差异 | 本机 Codex 中的实际 route、工具契约或交接可靠性 |
| 新 Codex task 的 Pro route probe | 命名 Worker 启动并返回 `2+2=4`、`pwd` 与官方价格页搜索结果；页面正文打开受 `SSRF_BLOCKED` 限制 | 完整自包含初始任务的原生子代理生命周期、一次只读工具与一次 native search | 私有动态 packet、follow-up、wire-level telemetry，或 Pro 的通用性能 |
| 社区与 X 转贴的首日反馈 | 有正面使用报告，也有 think/harness 连贯性担忧 | 必须把“模型能力”和“harness/部署”分开测 | 稳定的性能结论或路由规则 |

因此，本文不把厂商基准、社媒样例或生成 token 当成通用账单。路由要看**成功调整后的总成本**：

`模型费用 + 重试/返工 + 上下文重放 + Sol 协调与验证`，除以 `通过最小验收的完成次数`。

## Pro 0813 的能力与价格位置

DeepSeek 在 [2026-08-13 变更公告](https://api-docs.deepseek.com/updates/)中将 GA 版本标记为 `deepseek-v4-pro` / `DeepSeek-V4-Pro-0813`，并声明原生支持 Responses API、面向 Codex；[官方价格页](https://api-docs.deepseek.com/quick_start/pricing/)显示 Flash 0731 与 Pro 0813 均为 1M context、最大输出 384K，均支持 thinking、工具调用和 Responses API。

### 厂商自报的 Flash 0731 → Pro 0813 差异

下表是同一份官方变更日志中公布的 Agent 测试分数，适合判断“是否值得测试”，不应当替代工作流内的验收。

| 测试 | Flash 0731 | Pro 0813 | Pro 增量 |
|---|---:|---:|---:|
| Terminal Bench 2.1 | 82.7 | 87.9 | +5.2 |
| NL2Repo | 54.2 | 61.5 | +7.3 |
| Cybergym | 76.7 | 83.3 | +6.6 |
| DeepSWE | 54.4 | 62.7 | +8.3 |
| Toolathlon-Verified | 70.3 | 74.1 | +3.8 |
| Agents' Last Exam | 25.2 | 25.7 | +0.5 |
| AutomationBench（Public） | 25.1 | 31.8 | +6.7 |
| DSBench-Hard | 59.6 | 67.2 | +7.6 |

这组数据的形状与“Pro 更适合高判断密度、带工具的有界任务”一致；它不表示每一次大上下文读取都该升 Pro，更不能跨厂商直接比较。

### 价格：先算增量，而不是只看模型名称

截至本报告日期、价格页显示的即时费率为每百万 token（美元）：

| 用量类别 | Flash | Pro | Pro / Flash |
|---|---:|---:|---:|
| 缓存命中输入 | $0.0028 | $0.003625 | 1.29× |
| 缓存未命中输入 | $0.14 | $0.435 | 3.11× |
| 输出 | $0.28 | $0.87 | 3.11× |

官方同时公告，**2026-08-16 16:00 UTC** 起采用峰/谷价：Pro 相对 Flash 在未命中输入和输出为 3×，缓存命中约为 3.14×。实际排程须以当日[价格页](https://api-docs.deepseek.com/quick_start/pricing/)为准。

在当前价格下，若客户端能提供 cache hit / miss usage，Pro 相比 Flash 的估计增量为：

`$0.000825 × 命中输入(M) + $0.295 × 未命中输入(M) + $0.59 × 输出(M)`。

这不是硬阈值。它的作用是把选择变成一个可检查的问题：**Flash 多一次失败、重新读上下文和 Sol 返工，预期会不会超过这笔增量？** 若会，Pro 是更经济的首选；若不会，保留 Flash。

## 真实工程的 token 主要花在哪里

### 本次可复算结果

本仓库下载了 TraceLab 固定发布的公开脱敏归档到一次性目录，先核对发布 SHA-256 `9d265eae69a31cae203848bea936f018148eed7ca8bf56050c5abe96da0b4e6b`，再由 [`verify_tracelab_token_economics.py`](verify_tracelab_token_economics.py)流式读取并只保存派生汇总。原始 53.6 MB 包和临时目录已经删除。

| 指标 | 本地复算值 |
|---|---:|
| 步数 / 会话 / 工具调用 | 357,161 / 4,265 / 432,510 |
| 总输入 token | 54,898,360,619 |
| 累积前缀 token | 52,562,847,366（95.746%） |
| 新追加 token | 2,335,513,253（4.254%） |
| 输出 token | 186,943,996 |
| 单步前缀 P50 / P90 / P99 | 118,656 / 247,834 / 816,664 |
| 单步新追加 P50 / P90 / P99 | 875 / 7,119 / 144,704 |
| 单步输出 P50 / P90 / P99 | 214 / 1,169 / 5,051 |

汇总数据在 [`tracelab-token-economics-2026-08-13.json`](tracelab-token-economics-2026-08-13.json) 和 [`tracelab-token-economics-2026-08-13.csv`](tracelab-token-economics-2026-08-13.csv)。这与 TraceLab 论文的结论相符：上下文前缀重读、长会话和极少数重尾步骤是主要量级风险，而非最终简短回答本身。[TraceLab 论文](https://arxiv.org/html/2606.30560)和[公开发布/代码](https://github.com/uw-syfi/TraceLab)均可复核。

这会直接改变路由：

- 让 Flash 去做有边界的大规模阅读、检索、归类和机械实现，是合理的；它能把一次性大上下文理解用在不需要反复转手的任务上。
- 不要为了“省 token”把同一上下文切成许多来回的小子任务。子代理交接、重复复述、无界工具输出和重新建立上下文往往比模型输出更贵。
- 不应只因输入很长就升级 Pro；先判断任务是否需要更高的**语义/诊断判断密度**。长输入但答案可机械验证，仍优先 Flash。

另有一项针对 2,848 次 provider-billed Agent 运行的配对研究发现，压缩原始工具输出不一定节省成本，某组 38% 的 raw 工具输出减少反而带来 6.8% 更高的配对费用，并伤害部分修复成功率。[Token Reduction Is Not Cost Reduction](https://arxiv.org/html/2607.12161)支持同一原则：先避免无效回合和失败重做，再优化 token 表面数量。

## 本仓库历史同合同试点

[`pilot-2026-08-09.csv`](pilot-2026-08-09.csv)记录了两个来源固定、验收明确的 Flash/Luna 配对任务。两种 Worker 都完成了相同验收：

| Worker | 通过任务 | 总耗时 | 生成 token |
|---|---:|---:|---:|
| Flash | 2 / 2 | 88 秒 | 5,081 |
| Luna Max | 2 / 2 | 235 秒 | 16,708 |

这支持一个窄结论：对于固定来源的事实查找、单文件机械补丁和目标测试，Flash lane 已有实际工程价值。它不支持“Flash 取代深度推理”或“生成 token 就是美元成本”的结论；完整方法、案例、原始数值和限制见[首轮报告](report-2026-08-09.md)。

## 重新划分的任务边界

| Lane | 进入条件 | 典型工作 | 经济理由 | 不应交给它 |
|---|---|---|---|---|
| **Sol** | 目标/授权仍模糊，或需要最终判断 | 任务拆分、架构取舍、跨结果综合、接受风险、外部写入决定 | 少一次错误路由和返工，比把主线判断外包更值钱 | 纯机械的一步工作 |
| **Flash** | 来源/路径/验收都明确；错一次的返工低 | 大仓库或长文档阅读、来源收集、批量分类、结构化提取、固定范围的多文件实现、可重复数据处理 | 保留 1M context 和低费率，把复杂度留给真正需要它的任务 | 隐性语义、开放式根因、关键安全/并发判断 |
| **Pro（本机 route 已通过）** | 范围已收敛、验收可观察，且用户当前请求本身完整；第一次判断质量明显影响返工 | 多文件行为变更、复杂但有界的诊断、隔离 PR 的深度第一审、冲突证据综合、需要工具链但不改变架构的实现 | 缓存命中时溢价小，未命中/输出约 3.1×；用来购买更高的一次通过率，而不是买“更大上下文” | 私有动态任务包、可靠 follow-up、最终架构、授权变化、部署/资金/生产外部操作、共享状态变更 |
| **Luna Max** | 有隐藏耦合或验证失败会带来高风险 | 并发/取消/资源泄漏、状态机、跨模块语义、疑难 review、复杂回归解释、关键实现 | 深度推理可避免多轮假设和表面补丁；适合判断密度最高的独立包 | 普通搜读、简单批处理、没验收的开放式任务 |

### 可执行的升级规则

1. 先由 Sol 写出目标、非目标、路径/来源、写入权和单一验收。一步可完成就不派发。
2. 合同清晰且可机械验证时，先给 Flash；它能承担完整、有界的 1M 上下文工作，不只是“廉价搜索器”。
3. 若任务仍有明确所有权，但会涉及多文件语义、复杂故障假设或一次错判就要重读大量上下文，估算 Flash 的预期重做成本；超过 Pro 增量时升 Pro。
4. 若核心风险是隐藏耦合、架构影响、并发/安全/状态语义，直接给 Luna；若任务会改变目标、授权或外部状态，回 Sol。
5. 无论使用哪个 Worker，Sol 只做一次聚焦合同检查和一次真实结果核对。不要为了度量本身再增加一层常驻 token 记录或审查循环。

## 社区信号：用于发现风险，不用于定级

发布首日的社区/X 转贴并不一致：有人报告 think 时间异常短或怀疑部署/回滚问题，也有人报告中等 effort 已产生长推理；另一些讨论强调，同一模型在不同 harness、上下文处理和工具解析下表现不同。可复核的讨论样例见 [r/DeepSeek：0813 发布失败的主张及反例](https://www.reddit.com/r/DeepSeek/comments/1vn5y49/deepseeks_v4_pro_0813_official_release_last_night/)、[r/DeepSeek：首日横向试用讨论](https://www.reddit.com/r/DeepSeek/comments/1vmy66e/okay_deepseek_v4_pro_0813_actually_looks_kinda/) 和 [Cline 长任务兼容性问题](https://github.com/cline/cline/issues/10551)。

所以社媒结论只有一个操作含义：route probe 必须拆开测“模型回答”“Responses/工具契约”“Codex 子代理 handoff”，并记录版本和 effort；不能把一个 demo 的好坏归因于模型本身。

## Pro 的最小原生 route 验收

本机官方模型目录已经列出 `deepseek-v4-pro`、1,048,576 context 和 native search 支持；独立 `deepseek-pro-worker.toml` 已通过受管安装器安装并与仓库源精确匹配，Flash 和 Luna 未变。原任务的 Agent registry 未刷新而返回 `unknown agent_type 'deepseek_pro_worker'`；随后新 Codex task `019ffb96-9a7c-7dc0-8386-5d917da83bca` 成功发现、启动并返回 Pro 子代理结果。详细记录见 [`deepseek-pro-route-probe-2026-08-13.md`](deepseek-pro-route-probe-2026-08-13.md)。

| 检查 | 成功标准 | 本次状态 / 失败时的解释 |
|---|---|---|
| Profile/目录 | 受管 profile 指向 `deepseek-v4-pro`、官方 1M catalog，且不覆盖 Flash | **通过**：安装后 `cmp` 精确匹配；这是文件/目录证据，不是 route 证据 |
| 直接有界任务 | 返回一个答案明确的任务结果，Sol 独立核对 | **通过**：Pro 返回 `2+2=4` |
| 原生网页搜索 | 返回来源可复核的官方网页结果 | **通过**：返回两个 DeepSeek 官方价格页 URL；直接 `open_page` 受 `SSRF_BLOCKED` 限制，正文未复核 |
| 只读工具工作 | 完成固定路径检查且满足验收 | **通过**：返回 `pwd` 为 `/Users/ethan/codex-workflow` |
| 子代理 lifecycle | 客户端暴露的 child 结果与验收都存在 | **通过**：新 task 成功启动并收到完成结果（205.47 秒）；thread reader 不暴露动态工具原始 payload |
| 动态任务包 | 只有确实收到完整任务包才算可用 | **未通过 / 不声称可用**：本次仅把完全相同的完整用户请求作为唯一初始任务；私有 Sol packet 与 follow-up 仍未验证 |

当前仓库已知跨 provider handoff 不能传递私有动态 payload，因此 Pro 的可用边界仍是“用户当前请求本身已经完整”的任务：客户端支持时继承 turn，否则唯一兼容后备是逐字复用该请求作为唯一原生初始消息。不要用直接 API runner 或桥接器伪造私有 packet 成功。最小 route probe 已单独记录，但不与本报告的能力/价格结论混为一谈。

## README 可采用的项目理念

> 我们不按“谁最快”或“谁最便宜”给子代理分工，而按通过验收的一次完成成本分流。Flash 负责边界清晰、可机械验证的大上下文与高吞吐工作；Pro 负责范围已收敛但判断密度更高、失败重做更贵的任务；Luna 负责隐蔽耦合和深度语义；Sol 始终保留目标、授权与最终结论。我们优先减少无效上下文重放、重复交接和返工，而不是单独压低一次调用的 token 数。

## 复现、来源与后续

- 数据复算脚本：[`verify_tracelab_token_economics.py`](verify_tracelab_token_economics.py)。它不读取本地对话，完整归档只作为一次性输入，最终只保留汇总文件。
- 图表生成脚本：[`render_agent_routing_economics_chart.py`](render_agent_routing_economics_chart.py)。图表从本次汇总 JSON 和历史 CSV 生成。
- Pro 原生 route probe：[`deepseek-pro-route-probe-2026-08-13.md`](deepseek-pro-route-probe-2026-08-13.md)。它记录本机完整任务 lane 的通过项和未验证的动态交接边界。
- 真实工程 token 研究：[TraceLab](https://arxiv.org/html/2606.30560)、[How Do Agents Spend Money?](https://arxiv.org/html/2604.22750)、[SWE-chat](https://arxiv.org/html/2604.20779)。
- Pro 版本、基准、Responses API 和价格：[DeepSeek 更新日志](https://api-docs.deepseek.com/updates/)、[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)、[Codex 集成文档](https://api-docs.deepseek.com/quick_start/agent_integrations/codex/)。

下一步不应扩大成模型排行榜，而应为一个“多文件语义、但合同明确”的固定公开案例做一次 Flash / Pro / Luna 同合同对照。只有该对照改变路由决策时，才增加样本。
