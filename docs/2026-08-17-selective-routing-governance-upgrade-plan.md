# 路由治理优化升级方案

## 文档状态

| 项目 | 内容 |
|---|---|
| 状态 | `IMPLEMENTED_IN_REPOSITORY / USER_INSTALL_NOT_RUN` |
| 日期 | 2026-08-18（修订） |
| 适用仓库 | `/Users/ethan/codex-workflow` |
| 参考项目 | [DannyMac180/sol-advisor](https://github.com/DannyMac180/sol-advisor) |
| 补充决策来源 | Codex task `01a01052-240c-71f1-97a8-e09e16ce1eb1` 中的 DeepSeek 停用与 Spark Scout 设计、配置、真实 route probe 记录 |
| 仓库基线 | `sol-worker-routing` 的 Sol、Spark Scout、DeepSeek Flash、DeepSeek Pro、Luna Medium、Luna Max 路由体系；Skill 与安装器均已纳入 lane 开关合同 |
| 本机观察态 | DeepSeek 两个 profile 以 `.disabled` 后缀停用；`spark_scout` 已按 `gpt-5.3-codex-spark / xhigh / read-only` 配置并在新任务中通过真实 child lifecycle 探针 |
| 授权边界 | 本轮已获得仓库实现授权；仍未获得用户级安装、Provider/凭据、Git 历史、标签、Release 或外部运行状态的变更授权 |

本文把 Sol Advisor 中可复用的路由声明、生产者分工、接口不变量和审查终结语义，适配到现有 `sol-worker-routing`，同时把已经实测的 `spark_scout` 纳入正式拓扑，并为所有 Worker 增加可逆的启用/停用合同。升级目标不是增加一个新的编排层，而是让路线选择、成本偏好、可用状态和验收边界都可见、可控制，并保持当前 DeepSeek 全请求模式、Luna 私有任务包、安装事务和真实 route probe 边界不变。

## 本轮实施结果（2026-08-18）

已落入仓库的内容：`agents/spark-scout.toml`（`gpt-5.3-codex-spark / xhigh / 128K / read-only`）、Skill 的 Spark/软禁用/路由回执/接口不变量/单一生产者/审查 verdict 规则、安装器的 `--lane-status`、`--enable-lane`、`--disable-lane`，以及中英文 README、Personalization、安装合同与变更日志。安装器识别 v0.4、v0.5-v0.7、v0.8 与 v0.9，保留已有状态，并把目标版本新增的 lane 以 `.disabled` 加入。

本轮没有执行用户级安装、Provider/credential/model-catalog 修改、真实 Spark 新 route probe、App Personalization 粘贴、commit、push、tag、Release 或部署。真实路由仍必须在每个新安装或重大客户端变更后的新任务中单独验收；profile 与隔离安装测试都不是 route proof。

## 1. 目标与最小成功标准

当前工作流已经能按任务瓶颈选择执行者，但一次具体委派为什么成立、哪些 lane 当前允许使用、谁拥有实现、最终验收到哪里结束，主要存在于 Skill 的通用说明或本机文件状态中。升级后，非显然的委派应在执行前留下一个简短的任务级路由回执；用户可以按单次任务或持久状态关闭任意 Worker；Spark 只承担有界只读侦察；写任务应明确接口不变量；需要独立审查时应返回可执行的终结结论；源码验收不得被解释为发布或运行态授权。

| 最小成功标准 | 可观察结果 |
|---|---|
| 路由可解释 | 每次 Worker 委派前都能看到实际执行者、任务瓶颈、所有权、验收和授权边界 |
| Worker 可选择 | 用户能对单次任务关闭指定 lane，也能持久停用 DeepSeek、Spark 或全部 Worker；禁用不删除 Provider、凭据或 profile 内容 |
| 禁用不被逆转 | 安装或升级识别并保留受管 `.disabled` 状态，不会因重新安装静默恢复付费或低质量 lane |
| 老版本可迁移 | 已知旧版保留既有 lane 状态；升级中新引入的 lane 默认 disabled；缺失、混装和旧 Personalization 都有明确终态 |
| Spark 有边界 | `spark_scout` 只接收 128K 内、有界、只读、可独立验收的侦察任务，返回证据或 blocker，不拥有实现和最终判断 |
| 兼容性可检查 | 每个私有写任务包都包含 `Interfaces / invariants`，或明确写 `none` |
| 单一生产者 | 同一写入范围在一个阶段只有一个实现所有者，Sol 不与已派发 Worker 并行重复实现 |
| 审查可终结 | 进入独立审查的任务只返回 `ship`、`fix-first` 或 `rethink`，任何修复都会使旧 verdict 失效 |
| 授权不扩张 | `ship` 只表示本文定义的源码或研究合同通过，不授权 commit、push、merge、tag、release、deploy、账户或其他外部变更 |
| 验证不过量 | 默认是一项聚焦合同检查；Spark route 与持久开关各做一次真实结果检查，不新增固定多轮审查或多 Agent 投票 |

## 2. 当前基线与保留项

现有仓库已经完成四条 Worker lane、任务包、安装安全和运行时证明的主要建设。本机另有一个已通过真实探针的 Spark Scout，以及两个被可逆停用的 DeepSeek profile；这两项属于观察事实，尚不是仓库安装合同。本方案保留原有四条 lane 的语义，在其旁边增加 Spark 只读侦察 lane，并把启用状态提升为受管配置。

| 当前能力 | 单一事实来源 | 本方案决策 |
|---|---|---|
| Sol 保留目标、架构、授权和最终判断 | [`skills/sol-worker-routing/SKILL.md`](../skills/sol-worker-routing/SKILL.md) | 保留 |
| DeepSeek Flash 用于大上下文、强调吞吐的有界任务 | [`agents/deepseek-worker.toml`](../agents/deepseek-worker.toml) | 保留 |
| DeepSeek Pro 用于范围收敛、语义密度和重做成本较高的有界任务 | [`agents/deepseek-pro-worker.toml`](../agents/deepseek-pro-worker.toml) | 保留 |
| DeepSeek 只接受完整当前用户请求，不能接收私有窄包或可靠后续消息 | [`skills/sol-worker-routing/SKILL.md`](../skills/sol-worker-routing/SKILL.md) | 保留并在路由回执中显式说明 |
| Luna Medium 只接受路径、所有权、非目标和验收已经固定的私有窄包 | [`agents/luna-medium-worker.toml`](../agents/luna-medium-worker.toml) | 保留 |
| Luna Max 处理隐蔽耦合、长程语义和深度诊断 | [`agents/luna-worker.toml`](../agents/luna-worker.toml) | 保留 |
| Spark Scout 使用 `gpt-5.3-codex-spark / xhigh / read-only` 完成有界证据侦察 | task `01a01052-240c-71f1-97a8-e09e16ce1eb1` 及本机 `~/.codex/agents/spark-scout.toml` | 纳入仓库候选 profile；不替代 Sol、DeepSeek 或 Luna |
| DeepSeek 可以通过 `.toml` → `.toml.disabled` 可逆停用，且无需修改 Provider 或凭据 | 同一 task 的本机停用记录 | 提升为安装器受管状态，并扩展到 Spark 与全部 Worker |
| Profile 文件不等于可用，安装或重大客户端变化后需要真实 child lifecycle 与结果验收 | [`README.md`](../README.md) | 保留，不增加每任务 probe |
| 安装器暂存、备份、回滚并拒绝未知内容、符号链接和非普通文件 | [`scripts/install.sh`](../scripts/install.sh) | 保留，不引入 Sol Advisor 安装器 |

## 3. 需要解决的五个合同缺口

### 3.1 路由决策缺少任务级回执

当前 Skill 已经说明如何选择 Flash、Pro、Medium、Max，但一次任务的具体选择仍可能只存在于模型内部推理或零散 commentary 中。发生错误、成本异常、被禁用 lane 仍被选择或错误 lane 时，维护者需要重新阅读完整对话才能判断最初的路线前提是否成立。

任务级路由回执应只记录会改变执行和验收的字段。它不是新状态机，也不是每次工具调用前的固定仪式。

### 3.2 写任务包没有单独列出兼容性不变量

现有任务包已经包含目标、范围、来源、非目标、验收、验证和停止条件，但接口兼容约束仍可能分散在 `Relevant facts` 或 `Constraints` 中。多文件修改最常见的错误不是漏改一个文件，而是实现局部目标后破坏外部 API、配置键、迁移格式、调用顺序或既有运行合同。

将接口不变量设为写任务的显式字段，可以让 Worker 在修改前确认不可破坏的边界，也让 Sol 在验收时逐项核对。

### 3.3 审查结果缺少统一的终结语义

现有工作流允许 PR 深审、指定 diff 审查和 Luna Max 代码审查，但没有统一规定“通过、局部修复、架构重想”三类结果，以及修复后旧结论是否继续有效。模糊的“整体可以，但建议再看看”不提供可执行决策。

本方案只先定义 verdict 语义，不在 P0 新增 reviewer Agent。独立只读 reviewer 必须在真实需求、实际 sandbox 和 route probe 都成立后另行设计。

### 3.4 Spark 只有本机实验态，尚未进入仓库合同

指定 task 已证明 `spark_scout` 可以由当前客户端创建并回传固定答案与只读工具结果，但仓库没有对应 Agent 源文件、Skill 路由规则、安装目标和升级保护。仅把本机 TOML 留在用户目录，会造成新机器无法复现、重新安装不知如何处理、文档与实际拓扑不一致。

Spark 的价值限定为高速侦察而非最终质量门。它应负责定位入口、调用链、配置差异、日志/测试归类和一致性扫描；遇到隐藏耦合、架构、发布、风控或需要写入时返回 blocker，由 Sol 决定是否直接处理或形成 Luna 任务包。

### 3.5 Worker 缺少统一、可持续的关闭方式

当前 DeepSeek 的 `.disabled` 重命名证明了最小可逆停用路径，但该状态未被仓库安装器识别。重新安装可能再次写回 `.toml`，从而违背用户的成本选择。Spark 也需要相同能力，因为模型速度、能力、配额和价格都可能变化；工作流不能把某个模型的当前性价比写成永久事实。

关闭必须分成两层：当前任务中的软禁用用于立即阻止新委派，不修改文件；持久硬禁用通过受管 profile 状态阻止新任务发现该 Agent。两者都不得删除 Provider、凭据或 profile 内容，也不得自动中止已经运行的子代理。

## 4. P0 设计：任务级路由回执

路由回执只在第一次 Worker 委派前输出。Sol 一步即可完成并验收的普通任务不输出回执；没有委派价值时直接执行，避免增加固定文本成本。

```text
ROUTE RECEIPT
executor: spark_scout | deepseek_worker | deepseek_pro_worker | luna_medium_worker | luna_worker
lane-policy: <所选 lane 的启用依据；仅在禁用状态改变路线时列出被排除 lane>
reason: <本次选择对应的真实瓶颈或风险>
ownership: <谁实现，谁验证，谁保留最终判断>
acceptance: <一项聚焦合同检查 + 一项真实链路结果>
authorization: <允许的本地写入与明确不包含的外部变更>
review: none | fresh-context-required
```

| 字段 | 约束 |
|---|---|
| `executor` | 必须使用已安装的确切命名角色；不能写泛化的“子代理”或声称不可用的 Provider 已运行 |
| `lane-policy` | 先检查当前用户指令和受管 profile 状态；被禁用、未发现或未通过 route probe 的 lane 不得进入候选集合 |
| `reason` | 说明任务瓶颈，例如上下文吞吐、重做成本、私有窄包或隐蔽耦合；不能只写模型偏好 |
| `ownership` | 指定唯一实现生产者，并声明 Sol 只负责架构、验收、整合和授权判断 |
| `acceptance` | 使用可观察结果，不使用“完成研究”“测试充分”等不可验证描述 |
| `authorization` | 明确当前任务允许的文件或只读范围，并写清 commit、push、release、deploy、账户与外部状态是否排除 |
| `review` | 默认 `none`；只有独立结果会改变继续、修复或重想的决策时才设为 `fresh-context-required` |

### 4.1 DeepSeek 回执附加条件

DeepSeek 的回执必须确认当前用户请求本身就是完整任务。如果需要 Sol 私下补充路径、来源、顺序、非目标或验收，DeepSeek full-request lane 不成立，应保留给 Sol 或改用 Luna。回执不能伪造一个实际无法送达的 DeepSeek 私有 packet，也不能规划依赖可靠 follow-up 的后续步骤。

```text
ROUTE RECEIPT
executor: deepseek_worker
lane-policy: deepseek_worker enabled；未被当前任务或持久状态禁用
reason: 当前用户请求已固定来源、范围和输出；主要瓶颈是大上下文读取与吞吐
ownership: DeepSeek 完成当前完整请求；Sol 复核决定性证据并给出最终结论
acceptance: 返回指定证据矩阵；Sol 重开决定性来源并核对结论
authorization: read-only；不修改文件、配置或外部状态
review: none
```

### 4.2 Luna 回执附加条件

Luna Medium 和 Max 可以接收 Sol 的私有任务包。Medium 的回执必须表明路径、所有权、非目标和验收已经固定；如果这些条件尚未成立，应由 Sol 保留任务或直接选择 Max，而不是让 Medium 自行扩大范围。

```text
ROUTE RECEIPT
executor: luna_medium_worker
lane-policy: luna_medium_worker enabled；未被当前任务或持久状态禁用
reason: 私有任务包已收敛到一个模块和一个目标验证，未观察到隐蔽耦合
ownership: Luna Medium 只修改列出的文件；Sol 检查完整 diff 并重跑目标验证
acceptance: 指定测试通过，并且 Interfaces / invariants 全部保持
authorization: 仅允许列出的本地文件；不授权 commit、push 或发布
review: none
```

### 4.3 Spark Scout 回执附加条件

Spark 只接收有界、只读、可独立验收的私有侦察包。Sol 必须确认材料能在 Spark 的有效上下文内完成，目标是事实、候选路径或 blocker，而不是实现、架构结论或最终审查 verdict。`xhigh` 是质量选择，不构成扩大权限或任务范围的理由。

```text
ROUTE RECEIPT
executor: spark_scout
lane-policy: spark_scout enabled；本机 route probe 已通过
reason: 需要快速定位固定范围内的入口、调用链和精确证据，不需要写入或最终判断
ownership: Spark 只回传证据、不确定性和 blocker；Sol 复核决定性证据并决定后续
acceptance: 返回精确文件/符号/命令输出或 URL；Sol 重开至少一项决定性来源
authorization: read-only；不修改文件、配置或外部状态
review: none
```

## 5. P0 设计：Spark Scout 只读侦察 lane

`spark_scout` 是 Sol 可以发送私有窄包的本地 OpenAI 子代理，定位是“高推理、低延迟、只读证据侦察”。它不替代 1M 上下文的 DeepSeek，也不替代能够修改和深度诊断的 Luna。指定 task 中的本机 profile 使用 `gpt-5.3-codex-spark`、`xhigh` 和 `sandbox_mode = "read-only"`，并已在新任务中完成真实 child lifecycle 探针；仓库实施仍需把同一合同收录为受管源文件，并在目标安装后重新验证。

| 任务特征 | 路由决策 |
|---|---|
| 一次聚焦读取就能完成 | Sol 直接完成，不启动 Spark |
| 范围、来源和输出固定；只要证据、候选路径或 blocker；材料适合 128K 上下文 | `spark_scout` |
| 大型代码库、长文档或批量材料需要 1M 上下文与吞吐 | 已启用且合格时选择 DeepSeek；否则由 Sol 重新收敛范围或报告能力 blocker |
| 路径、非目标和验收固定，但需要修改或运行写入型验证 | Luna Medium |
| 隐藏耦合、根因未定、架构或高风险判断 | Sol 保留判断，必要时使用 Luna Max |

Spark 的返回合同固定为：

```text
CONCLUSION:
EVIDENCE: exact file / symbol / command output / URL
UNCERTAINTY:
BLOCKER: hidden coupling, scope escape, context overflow, write requirement, or unverifiable claim
NEXT CHECKS: only narrowly scoped checks for Sol to consider
```

Spark 不写文件，不运行可能改变工作区、缓存、数据库或外部状态的命令，不给出 `ship`，不拥有架构、发布、交易、风控、账户、政策或最终验收决定。发现这些需求时立即返回 blocker，不自行升级到 Luna，也不继续扩大扫描范围。

默认只启动一个 Spark，深度固定为一。只有两个来源或目录彼此独立、结果可分别验收且没有共享状态时，Sol 才能并发两个；不得为了投票而复制同一任务。不得设置全局 `default_subagent_model`，避免把 Luna 或其他未命名子任务意外改投 Spark。未来若评估 Spark 写入能力，必须使用单独 profile 和新的授权方案，不能扩大 `spark_scout` 的现有只读合同。

## 6. P0 设计：Worker 可选配置与关闭合同

工作流区分“本任务不使用”和“持久不发现”两种需求。前者是路由策略，不修改本机；后者改变 Agent profile 的可发现状态，并在新任务中生效。两者都只阻止后续委派，不自动中止已经运行的子代理；运行中任务仍遵循用户取消与现有中断合同。

### 6.1 决策优先级

| 优先级 | 来源 | 语义 |
|---|---|---|
| 1 | 当前用户请求 | “本次不用 DeepSeek”“不要 Spark”“只用 Sol”“不要任何子代理”等明确指令立即生效，禁止本任务后续新 spawn |
| 2 | 持久 profile 状态 | `.toml.disabled` 表示该 lane 在新任务中不可发现；当前请求不能把硬禁用 lane 静默恢复 |
| 3 | 真实 route qualification | profile 可见但未完成真实探针、重大客户端变化后未复验或观察到路由错误时，视为不合格 |
| 4 | Skill 默认矩阵 | 只在前述条件都允许时，才按上下文、吞吐、语义密度、私有拆包和隐藏耦合选择 lane |

用户明确禁用的 lane 不参加候选排序。最匹配 lane 被禁用时，Sol 只能在其余已启用且已验证的 lane 中重新判断；如果替代路线会改变质量、上下文容量、费用或授权边界，应在执行前说明。没有合格替代时由 Sol 直接完成可控范围，或返回精确 blocker，不得自动重启 DeepSeek、Spark 或任意其他 Worker。

工作流不联网抓取模型价格，也不根据临时单价自动切换 Provider。价格、质量和隐私偏好属于用户策略；路由只执行已声明的启用状态，避免把可能漂移的价格数据变成隐式控制面。

### 6.2 持久状态表示

每个受管 Agent 只能处于以下一种状态：

| 状态 | 文件形态 | Codex 新任务行为 |
|---|---|---|
| enabled | `<profile>.toml` | 可发现；仍需通过 Skill 资格判断后才会被选择 |
| disabled | `<profile>.toml.disabled` | 不可发现；完整 profile 内容保留，可逆恢复 |
| conflict | 两种文件同时存在、内容未知、符号链接或非普通文件 | 停止，不读取未知内容、不覆盖、不自动选择 |

持久开关沿用已验证过的重命名机制，但由安装器管理精确目标、已知摘要、普通文件检查、暂存、备份和失败回滚。关闭 DeepSeek 只移动 `deepseek-worker.toml` 与 `deepseek-pro-worker.toml`，不修改 `[model_providers.deepseek]`、模型目录或凭据。关闭 Spark 只移动 `spark-scout.toml`。`all` 组只涵盖五个 Worker，不包含 Sol 主线程。

未来安装器接口建议固定为：

```text
bash scripts/install.sh --lane-status
bash scripts/install.sh --disable-lane deepseek
bash scripts/install.sh --disable-lane spark_scout
bash scripts/install.sh --disable-lane all
bash scripts/install.sh --enable-lane deepseek_worker
bash scripts/install.sh --enable-lane spark_scout
```

精确 lane 名为 `spark_scout`、`deepseek_worker`、`deepseek_pro_worker`、`luna_medium_worker`、`luna_worker`；`deepseek` 是两个 DeepSeek profile 的组别名，`all` 是全部五个 Worker 的组别名。未知名称必须失败，不能模糊匹配。

升级已有安装时，安装器必须逐 lane 保留 enabled/disabled 状态：已禁用 profile 更新为新的 `.toml.disabled` 内容，不能因为源版本升级而重新创建可发现的 `.toml`。某个 lane 如果在已识别旧版本中尚不存在，升级时默认安装为 `.toml.disabled`，只有用户明确选择才启用；因此普通老用户不会因为升级自动获得 Spark。全新安装默认安装五个 profile 为 enabled，但安装文档和交给 Codex 的安装提示必须在写入前展示 `all enabled`、`deepseek disabled`、`spark disabled`、`sol-only` 四种选择；用户未要求改动已有状态时，永远选择“保留现状”。

启用或停用后只报告目标状态和是否需要新建任务重新加载 Agent 注册表。不得声称当前已经打开的任务热更新成功；不得通过删除文件、清理 Provider 或使凭据失效来实现 lane 关闭。

### 6.3 路由回执中的禁用证据

如果禁用状态实际改变了本次路线，Sol 在委派前增加一行可见说明，例如 `lane-policy: deepseek disabled persistently; spark disabled for this task; selected luna_medium_worker`。如果所有 Worker 都被禁用且 Sol 可以直接完成，保持普通直接执行；只有当禁用导致能力、时间或上下文限制时才提示该影响，避免把开关状态变成每次任务的固定噪声。

### 6.4 老版本迁移决策矩阵

老版本升级先识别安装代际，再决定每个 lane 的目标状态。代际识别以受管 Skill 和 Agent 的已知 digest 为依据，不依赖用户目录中的 `VERSION` 文本、文件修改时间或 profile 自述。识别与冲突检查必须在第一次写入前完成；不能识别时停止并报告，不把“看起来像旧版”当成升级许可。

| 观察到的老版本状态 | 升级决策 | 升级后状态 |
|---|---|---|
| 已知旧版，四个既有 profile 都是 enabled，Spark 不属于该版本 | 更新四个既有 profile 和 Skill；新增 Spark 但不启用 | 四个既有 lane enabled；`spark-scout.toml.disabled` |
| 已知旧版，DeepSeek 两个 profile 为已知 `.disabled`，Luna enabled，Spark 不存在 | 保留后缀并更新受管内容；不触碰 Provider/凭据；Spark 作为新 lane 默认关闭 | DeepSeek disabled；Luna enabled；Spark disabled |
| 已知旧版中某个 lane 尚未发布，例如更早版本没有 Luna Medium | 将该 lane 视为“升级中新引入”，不猜测用户意愿 | 新 lane 安装为 `.disabled`，由用户另行启用 |
| 本机已经存在与候选源精确一致的 Spark pilot profile | 视为明确的既有 enabled 状态；接管前再次核对普通文件、路径和摘要 | Spark 保持 enabled；其他 lane 按原状态迁移 |
| 所有已出现文件都属于支持的已知版本，但 Skill/Agent 来自不同代际 | 允许在一个事务中收敛，前提是每个应有 lane 都恰好存在一种状态且没有未知内容 | 全部升级到当前内容；每个 lane 的 enabled/disabled 后缀保持 |
| 某个在已识别旧版本中本应存在的 profile 既没有 `.toml`，也没有 `.toml.disabled` | 视为“手工删除还是安装损坏”无法判断 | 写前停止；要求用户明确选择恢复 enabled 或保持 disabled |
| 同一 lane 同时存在 `.toml` 与 `.toml.disabled` | 状态冲突 | 写前停止，不自动选择较新文件或 enabled 状态 |
| 任一受管文件内容未知、为符号链接或非普通文件 | 不具备自动迁移资格 | 写前停止，报告精确路径和冲突类型 |
| 只有部分受管文件且无法从已知 digest 证明完整旧代际 | 不按 fresh install 补齐，也不按 upgrade 猜测 | 写前停止，提供缺失清单和最小人工选择 |

“缺失”不能作为 disabled 的隐式表示。正式关闭必须落为已知 `.toml.disabled`，这样后续升级才能区分用户选择与安装损坏。用户确认“保持关闭”后，安装器才可以从仓库源创建对应 `.toml.disabled`；用户确认“恢复”后才创建 `.toml`。

迁移事务必须保留原文件内容和原后缀的备份。正常命令失败或 `INT`/`TERM`/`HUP` 时，回滚必须恢复每个老文件的字节与 enabled/disabled 状态；不能出现 Skill 已升级但 Agent 仍停留在半套新旧状态。断电或 `SIGKILL` 后仍按现有安装合同报告恢复文件，并通过一次经过验证的重跑收敛。

### 6.5 旧 Personalization 与任务注册表

仓库安装器无法替用户修改 Codex App Settings 中已经粘贴的 Custom Instructions。老用户文件迁移成功后，交付必须把“受管文件已升级”和“App Personalization 仍是旧版”分开报告，并提供完整新版语言块供用户手动替换；未完成该步骤时，不能声称 App 级 Spark/禁用偏好已经更新。

Agent 的发现状态通常在任务创建时加载。升级、启用或停用完成后，旧任务可能仍持有旧注册表；验收必须在新任务中进行。新任务发现结果才是 lane 开关是否生效的证据，当前任务中的 `unknown agent_type` 或仍可见旧 Agent 不能用重复安装来修复。

## 7. P0 设计：写任务包增加接口不变量

现有 Worker packet 保持原结构，只在写任务中增加一个字段。这个字段属于 Luna 私有 packet，也适用于未来上游修复后能够接收私有 packet 的 DeepSeek；在当前 DeepSeek full-request 模式下，不能假设该字段可通过隐藏消息送达。

```text
Worker and mode: spark_scout | deepseek_worker | deepseek_pro_worker | luna_medium_worker | luna_worker; read-only | write
Objective:
Scope and owned paths:
Relevant facts / source pins:
Interfaces / invariants:
Non-goals:
Acceptance criteria:
Verification:
State-based stop condition:
Return format:
```

`spark_scout` 只能使用 `read-only`，其 packet 必须把 `Interfaces / invariants` 写为 `none (read-only reconnaissance)` 或列出读取时不得假设/改变的外部合同。其他 Worker 的 `Interfaces / invariants` 应描述任务完成后仍须成立的外部合同。适用内容包括函数签名、配置键、JSON/TOML schema、CLI 参数、数据库迁移方向、事件顺序、幂等语义、错误终态、权限边界和发布接口。确实没有外部接口时明确写 `none`，避免通过省略字段掩盖未完成的分析。

Worker 的结构化返回需要增加一项 `INVARIANTS`，说明每个不变量如何保持，以及使用了哪一项代码检查、测试或真实结果作为证据。Sol 仍须直接检查完整 diff 并重跑命名验证；Worker 自报不替代父任务验收。

## 8. P0 设计：单一生产者与修正归属

辅助 Worker 的作用是替代一段父任务实现，而不是和 Sol 对同一范围同时生产两个候选结果。父任务可以在 Worker 运行期间检查边界、准备验收和处理用户新指令，但不能同时改写 Worker 已拥有的文件范围。

| 状态 | 实现所有者 | Sol 的职责 | 允许的下一步 |
|---|---|---|---|
| 未委派 | Sol | 收敛目标、架构、来源、授权和验收 | 直接完成或选择一个 Worker |
| Worker 执行中 | 已声明 Worker | 保护所有权、等待结果、准备验收 | 等待、非终止 checkpoint，或在明确越界/取消/死锁时中断 |
| Worker 返回 complete | Sol 接管验收 | 检查完整 diff、重跑验证、决定是否接受 | 接受、要求局部修正或重新做架构决策 |
| Worker 返回 blocked | Sol | 判断缺的是路径、证据、架构还是授权 | 补充后重新路由，或由 Sol 接管；Medium 不自行升级 Max |
| 发现架构错误 | Sol | 撤销旧任务合同，不沿用旧验收 | 重新设计后形成新的独立任务 |

对于 Luna 私有任务包，如果问题只是原 packet 的明确规格错误，可以在 Sol 修正 packet 后进行一次受控重试。对于 DeepSeek full-request，不能预先规划依赖后续私有消息的修正回合；新证据出现后由 Sol重新决定，不能把不可靠的跨 Provider follow-up 当作既定链路。

## 9. P1 候选：独立审查协议

P1 不属于首轮实施。只有实际维护中反复出现“父任务已完成验证，但仍需要一个新上下文判断才能决定交付”的任务，才值得新增独立 reviewer。评估 reviewer 之前，先采用统一 verdict 语义记录现有人工或 Worker 审查结果。

| Verdict | 含义 | 后续动作 |
|---|---|---|
| `ship` | 当前声明的源码、文档或研究合同通过，没有发现阻止交付的问题 | Sol 报告验证证据；外部发布仍需单独授权和对应工作流 |
| `fix-first` | 存在局部、可定位且不改变架构的必修问题 | 原实现所有者修正，Sol 重验；如果仍要求独立审查，必须启动新的 reviewer verdict |
| `rethink` | 目标、架构、边界或验收合同本身不成立 | 停止局部补丁，由 Sol 重设架构与任务合同 |

任何实现修改都会使旧 verdict 失效。Reviewer 不修改自己审查的文件，也不把 `ship` 扩张为 commit、push、merge、release、deploy 或外部状态授权。

当前 `luna_worker` 与其他实现 profile 请求的是 `workspace-write`，因此不能把行为上的“请只读”描述为受 sandbox 强制的只读隔离。如果未来创建 reviewer profile，最低验收必须包括确切角色、模型与 effort 的真实子任务证据，实际 sandbox 与 permission profile 观察，以及审查前后仓库和产物状态一致。无法观察隔离时只能报告行为约束，不能声称强制只读。

## 10. 单一事实来源与未来影响文件

P0 的路由行为只在 Skill 中定义一次。README、Personalization 和项目指令只描述用户入口和必要边界，避免复制整套状态语义形成多个事实来源。

| 文件 | 未来候选修改 | 修改原因 |
|---|---|---|
| `agents/spark-scout.toml` | 必需、新增 | 把已通过本机探针的 `gpt-5.3-codex-spark / xhigh / read-only` 合同纳入仓库源，不复制本机文件中的偶然状态 |
| `skills/sol-worker-routing/SKILL.md` | 必需 | 添加 Spark 路由与返回边界、lane eligibility/禁用优先级、回执、接口不变量、单一生产者和 verdict 语义 |
| `scripts/install.sh` | 必需 | 增加 Spark 受管目标、版本代际识别、lane status/enable/disable 接口、`.disabled` 状态保留与整事务回滚；同步支持旧版的已知摘要，不放宽未知内容保护 |
| `personalization.md` | 必需但保持简短 | 加入“当前任务明确禁用优先”和 Sol-only/禁用 DeepSeek/Spark 示例，不复制完整 Skill 或持久状态机 |
| `README.md`、`README.en.md` | 必需 | 说明 Spark Scout 的职责、五条 Worker lane、软/硬禁用方法、老版本迁移默认值、Personalization 手动更新、新任务重载要求、回执触发和 `ship` 授权边界 |
| `CHANGELOG.md`、`VERSION` | 仅发布时 | 记录实际已实现和已验证内容；方案批准不自动产生版本号 |
| `AGENTS.md` | 必需 | 安装目标从四个 Agent 扩为五个，并明确禁用状态、保留规则、Spark route probe 与“不得静默启用”边界 |
| `agents/deepseek-*.toml`、`agents/luna-*.toml` | 内容原则上不改 | 原模型、effort、sandbox 和职责保持；只增加安装器对 enabled/disabled 状态的管理 |

安装器使用已知 digest 保护用户修改。未来修改 Skill 或受管 profile 时，必须把当前正式发布版的精确摘要作为可接受旧内容加入对应数组，再通过受管安装器完成暂存、备份、替换、状态保留、回滚和安装后精确匹配。`.disabled` 不是未知备份文件，而是正式的互斥状态目标；隐藏 staging/backup 仍是临时恢复状态。不得用手工复制绕过该合同。

## 11. 分阶段实施顺序

| 阶段 | 范围 | 交付物 | 进入下一阶段的条件 |
|---|---|---|---|
| P0-A 路由合同实现 | 修改 Skill、Personalization 和必要说明文档 | Spark 路由、lane eligibility/禁用优先级、路由回执、接口不变量、单一生产者、verdict 语义 | 静态合同检查通过；禁用 lane 不会进入候选或被静默替换 |
| P0-B Spark 源与安装合同 | 新增 Spark profile，扩展 AGENTS 与安装器的第五个 Agent 目标 | `spark_scout` 精确源、`.toml/.toml.disabled` 互斥状态、status/enable/disable 接口 | TOML 解析通过；未知内容、双状态、链接和非普通文件在写前停止 |
| P0-C 老版本迁移验证 | 只在一次性目标覆盖 fresh、各支持代际、已禁用、已知混装、缺失、冲突、rollback | 精确安装、幂等重装、新 lane 默认 disabled、既有状态保留、组开关、整事务回滚和冲突拒绝 | 安装器保护没有退化；四个既有 profile 职责不变；Spark 与迁移状态精确匹配 |
| P0-D 用户级状态迁移 | 获得单独授权后更新用户级受管副本 | 普通老用户新增 lane 默认 disabled；本机已验证 pilot 可在精确匹配后保持 enabled；保留 DeepSeek/Luna 原状态 | 没有 Provider/凭据变化；没有缺失状态被自动修复；当前用户选择未被安装过程逆转 |
| P0-E 真实链路验收 | 在新任务中分别运行一个 Spark 只读侦察和一个开关结果检查 | Spark 回执、私有只读 packet、真实 child 返回；禁用 DeepSeek 不可发现；Sol 重验 | 一次聚焦合同检查和每项新行为各一次真实结果检查通过 |
| P0-F 交付判断 | 审阅完整 diff 与验收证据 | `IMPLEMENTATION_READY` 或精确 blocker | 用户另行授权 commit、push、tag 或 Release |
| P1 Reviewer 评估 | 只在真实高风险审查需求重复出现后启动 | reviewer 需求、隔离合同、单独 profile 与 route probe 方案 | 独立审查会改变实际决策，并且新增成本有证据支持 |

## 12. 验收矩阵

P0 验证遵循“一次聚焦合同检查 + 每项新增运行行为各一次真实链路结果核对”。本次新增了 Spark route 和持久开关两项运行行为，因此各做一次结果检查；不重复证明未变化的 DeepSeek Provider、Luna 模型或既有四条 lane。

| 场景 | 预期 |
|---|---|
| Sol 一步可完成的只读查询 | 不输出路由回执，不启动 Worker |
| Spark 适格的有界只读侦察 | spawn 前输出 Spark 回执；只读 packet 含精确范围和返回合同；Spark 返回证据或 blocker；Sol 重开决定性证据 |
| Spark 任务出现写入、隐藏耦合、超过上下文或高风险判断 | Spark 停止并返回 blocker；不自行写入、不自动升级 Luna、不给最终 verdict |
| Luna Medium 私有写任务 | spawn 前输出回执；packet 含 `Interfaces / invariants`；只有 Luna 拥有写范围；Sol 重跑命名验证 |
| DeepSeek 请求不完整、需要私下补充路径或验收 | 不启动 DeepSeek，不伪造私有消息；由 Sol 保留或改选 Luna |
| DeepSeek 当前用户请求完整且来源固定 | 回执声明 full-request 边界；只使用支持的原生完整请求模式；Sol 复核决定性来源 |
| 当前任务声明“不用 Spark” | 即使 profile 已加载，本任务也不 spawn Spark；其他 lane 只有在自身合格且不会静默改变边界时才能使用 |
| 持久关闭 DeepSeek | 两个 DeepSeek `.toml` 转为精确 `.toml.disabled`；Luna/Spark 不变；Provider、凭据和模型目录不变；新任务不可发现 DeepSeek |
| 持久关闭全部 Worker | 五个 profile 都处于精确 `.disabled`；Sol 正常工作；没有自动回退到泛化子代理 |
| 升级已有 disabled profile | 内容升级到新受管版本但后缀保持 `.disabled`；不得恢复为可发现状态 |
| 老版本原来没有 Spark | 升级后创建精确 `spark-scout.toml.disabled`；新任务不可发现 Spark；只有显式 enable 后才进入候选 |
| 老版本原来没有 Luna Medium 或其他后增 lane | 按同一“新 lane 默认 disabled”规则迁移，不因当前推荐拓扑自动启用 |
| 已知混合版本且所有应有 lane 都恰好有一种已知状态 | 一个事务收敛到当前内容，并逐 lane 保留 enabled/disabled 后缀 |
| 已识别旧版中本应存在的 profile 缺失 | 不自动补回；写前停止并要求选择恢复或保持关闭 |
| 部分安装且无法证明旧版本代际 | 不当作 fresh install；报告缺失清单并停止 |
| enable/disable 目标同时存在或内容未知 | 写前失败并报告精确冲突；不覆盖、不删除、不猜测用户意图 |
| 老用户仍使用旧 App Personalization | 文件升级可以完成，但交付明确标为 App 指令待手动更新；不宣称新偏好已激活 |
| 升级后仍在旧任务检查 Agent | 不把旧注册表当成最终结果；新建任务后再检查 Spark/disabled 的发现状态 |
| 普通 delegated 任务 | `review: none`，不增加固定审查轮次 |
| 高风险任务请求独立审查但实际 sandbox 不可观察 | 不声称强制只读；报告残余风险或停止审查 lane |
| Reviewer 返回 `fix-first` 后发生修复 | 旧 verdict 失效；只有新 reviewer 可以重新给出 `ship` |
| 源码合同通过但未获得发布授权 | 最终状态写明源码完成；不执行 commit、push、merge、tag、release 或 deploy |

本轮已执行 `git diff --check`、`bash -n scripts/install.sh`、五个 TOML profile 解析、隔离目录 fresh 安装、DeepSeek 与 `all` 的硬开关、双状态拒绝、v0.8 升级（新增 Spark 与 Luna Medium 默认 disabled）和已识别安装中缺失必有 profile 的 fail-closed 检查。尚未为每个历史代际、未知内容、FIFO、符号链接或回滚注入分别建专门 fixture；它们继续受既有安装器的同一受管路径/摘要/暂存机制保护。真实链路只验证 Spark 回执/只读结果、disabled 不可发现和新任务注册表，不重复证明未变化的 Provider、模型目录或 Luna 路由；这些用户级 route 验收不在本轮仓库实现授权内。

## 13. 风险与控制

| 风险 | 控制 |
|---|---|
| 回执变成每任务固定噪声 | 只在第一次 Worker 委派或确有独立审查时输出；Sol 直接任务不输出 |
| 回执成为第二套路由状态机 | 不引入 `solo/delegate/audit/full`；`executor` 只使用 Sol 和五个确切 Worker 名称 |
| Spark 因速度或 `xhigh` 被误当作高权限模型 | profile 强制 read-only；只返回证据或 blocker；架构、实现、发布和最终判断仍由 Sol/Luna 承担 |
| Spark 质量不足却被当作最终 gate | 不给 `ship`；Sol 必须重开决定性证据；用户可单次或持久禁用 Spark |
| DeepSeek 价格变化被写成自动路由逻辑 | 不抓取实时价格、不做阈值状态机；用户显式开关决定是否具备资格 |
| 安装升级静默重启已关闭 lane | `.disabled` 是受管正式状态；升级内容不改变状态；状态冲突在写前停止 |
| 老用户升级后被自动启用新 lane | 任何不属于已识别旧代际的新 lane 默认安装为 `.disabled`；只有显式选择才能启用 |
| 手工删除被误判为安装损坏并自动补回 | 已识别版本中本应存在的 profile 缺失时停止；由用户选择恢复或保持 disabled |
| 已知混装被逐文件更新成不可回滚的半套状态 | 写前完成全量资格检查，统一暂存并整事务回滚；所有后缀和内容一起恢复 |
| 文件已升级却误报 App 偏好生效 | Personalization 单独报告并要求手动替换；新任务真实发现才是 Agent 状态证据 |
| 关闭 DeepSeek 破坏 Provider 或凭据 | 开关只移动两个 Agent profile；Provider、模型目录和凭据不在关闭事务中 |
| 全部 Worker 关闭后偷偷使用泛化子代理 | Sol-only 是合法终态；无能力完成时返回 blocker，不创建未命名替代 |
| README、AGENTS、Personalization 与 Skill 漂移 | Skill 是路由行为的唯一事实来源；其他文件只保留入口、摘要和授权边界 |
| `Interfaces / invariants` 过度填充 | 只写会被本次改动影响的外部合同；无外部接口时明确 `none` |
| Review 变成固定质量门 | 默认 `review: none`；只有失败会改变交付决策且更便宜证据不足时才启用 |
| 行为只读被误报为 sandbox 只读 | 记录实际 sandbox 与 permission profile；不可观察时不声称强制隔离 |
| `ship` 被误解为发布授权 | 每个回执和 verdict 都保留 `authorization` 或 delivery boundary；发布使用独立授权和工作流 |
| Skill 更新绕过受管安装 | 更新旧 digest 列表，运行原安装器并检查精确匹配；不手工复制 |

## 14. 预期提升与观察方法

这次升级不以“模型更聪明”作为成功指标。它应降低路线误判后的排查成本、并行重复实现、接口回归和审查结论不终结四类维护损耗，同时让成本/质量偏好可以在不破坏 Provider 和凭据的前提下调整。

| 观察项 | 目标状态 | 证据位置 |
|---|---|---|
| 委派可追溯 | 非显然委派都能从任务记录直接看到 executor、reason、ownership、acceptance 和 authorization | 父任务 commentary 或最终任务记录 |
| 用户选择被执行 | 任务级禁用没有新 spawn；持久禁用在新任务中不可发现；升级前后状态一致 | 路由回执、Agent 文件状态和新任务发现结果 |
| 老版本安全收敛 | 新 lane 默认 disabled；既有状态保持；缺失或未知状态在写前停止；回滚恢复原字节和后缀 | 迁移矩阵测试和一次性安装目标 |
| Spark 侦察可复核 | Spark 返回精确证据和限制，Sol 至少复核一项决定性来源；没有 Spark 写入 | child result、父任务复核和工作树状态 |
| 写任务合同完整 | 私有写 packet 的不变量字段覆盖全部受影响外部接口，或明确 `none` | spawn packet 与 Worker return |
| 无重复生产 | 同一阶段没有 Sol 与 Worker 对同一 owned path 并行实现 | 工作树 diff、任务记录和 ownership 声明 |
| 审查有明确终态 | 所有独立审查只返回三种 verdict；修复后没有继续引用旧 verdict | reviewer 结果和修复后的新审查记录 |
| 授权保持分离 | 源码验收不会自动触发发布或外部变化 | 回执授权字段、发布日志和用户明确授权 |
| 验证成本受控 | P0 只新增一项合同检查、一次 Spark route 结果和一次持久开关结果，不新增固定多 Agent 投票 | 验收记录 |

## 15. 原实施前决策门与剩余授权

开始 P0 仓库实现前曾需要明确授权修改仓库文件；该授权已在本轮获得并使用。安装用户级受管副本、commit、push、tag、Release 和任何外部变化仍分别需要对应授权。

P0 的默认决策更新为“新增一个 `spark_scout` 只读 Agent、保持四个既有 profile 内容与 Provider 不变、为五个 Worker 增加可逆开关、不引入价格状态机或自动模型替换”。普通老版本升级中的新增 lane 默认 disabled；本机已存在且与候选源精确一致的 Spark pilot 可以作为明确 enabled 状态接管。迁移必须保留当前 DeepSeek/Luna 状态，缺失状态必须询问，旧 Personalization 必须单独交付，除非用户在实施时另行指定。如果实施过程中发现必须新增 reviewer、让 Spark 写入、修改 Provider、改变跨 Provider 交接方式或引入新的持久配置文件，应停止 P0，并把该事实作为新的架构决策提交，而不是在原方案中静默扩张。

## 结论

首轮升级的六项已落入仓库：任务级路由回执、Spark Scout 只读侦察 lane、Worker 单次与持久开关、写任务接口不变量、单一生产者规则和审查 verdict 语义。老用户迁移遵循“既有状态保持、新 lane 默认关闭、缺失不自动修复、已知混装整事务收敛、Personalization 单独更新”；它不修改 Provider 或四个既有 Agent 的职责。独立 reviewer 与 Spark 写入 lane 都延后到真实需求、额外授权和可观察隔离同时成立时再评估。
