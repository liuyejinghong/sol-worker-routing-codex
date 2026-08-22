# 更新日志

版本遵循语义化版本。`0.1.0` 至 `0.3.1` 根据 Git 历史追溯整理。

## 0.12.0 - 2026-08-22

1. 因 Codex rust-v0.149.0 的官方 PR #39299 将子 Agent 的完整 `model_provider` 固定为继承父会话，退役 `spark_scout`、`deepseek_worker` 与 `deepseek_pro_worker`；issue #17598 的稳定版 macOS 独立复现确认 OpenAI 父会话会把外部模型 ID 送往 OpenAI 并触发 entitlement 错误
2. 当前拓扑收敛为 Sol + Luna Medium + Luna Max；Skill、Personalization、项目安装合同和中英文 README 均删除退役 lane 的路由、开关和验收声明，同时保留 HERO 对整个 Agent 的约束
3. 安装器只安装两条 Luna profile 并保留其既有 enabled/disabled 状态；升级时事务性移除内容摘要已知的 Spark、DeepSeek Flash 与 DeepSeek Pro enabled/disabled profile，未知内容仍 fail closed
4. 安装器不修改 DeepSeek Provider、凭据引用或 model catalog，也不执行退役路由的 `spawn_agent → followup_task → web_search` 验收；历史基准继续保留为历史证据，不代表当前可路由能力
5. Luna 并发从最多两个扩展为最多四个：默认仍从一个 Worker 开始，仅在任务独立、所有权互斥时扩展，并保持深度一层和写任务优先单 Worker

## 0.11.0 - 2026-08-21

1. 将 [HERO Anti-OverDefense](https://github.com/wanshuiyin/HERO-Anti-OverDefense) 提炼为整个主 Agent 始终生效、并由全部 Worker profile 直接携带的行为合同，而不是新增 Worker、固定 gate 或仅在路由时触发的规则
2. 中英文 Personalization 使用接近 HERO 完整版的常驻合同，保留 H/E/R/O、六种过度防御形状和四个关键反例；项目 AGENTS 使用中等校准版，五个 Worker profile 继续使用精简版
3. 中英文 README 明确通用核心、非通用威胁模型、四个生效入口、账号级主 Agent 的手动激活要求、自然语言约束上限，以及 HERO 案例库不会被安装或塞入每次任务上下文
4. 安装器接受 v0.10.0 的精确 Skill 摘要并将其识别为原有五-lane 拓扑，使升级保留 Spark、Flash、Pro、Luna Medium 与 Luna Max 的既有 enabled/disabled 状态

## 0.10.0 - 2026-08-18

1. 新增 `spark_scout`（`gpt-5.3-codex-spark` / `xhigh` / read-only）证据侦察 lane；它只返回结论、精确证据、不确定性、blocker 与窄后续检查，不拥有写入、架构、发布、风控或最终判断
2. `sol-worker-routing` 增加软禁用优先级、硬禁用可发现性和真实 route qualification 的路由治理；支持“本次不用 DeepSeek / Spark / 子代理”等任务级限制
3. 安装器增加 `--lane-status`、`--enable-lane` 与 `--disable-lane`，以 `<profile>.toml` / `.toml.disabled` 保存可逆状态；`deepseek` 同时操作 Flash 与 Pro，`all` 仅覆盖五个 Worker，停用 DeepSeek 不修改 Provider、凭据或模型目录
4. 识别 v0.4、v0.5-v0.7、v0.8 和 v0.9 老安装拓扑：保留已有状态，新引入 lane 默认 disabled；缺失应有 profile、未知内容、双状态、符号链接和非普通文件一律 fail closed
5. 同步安装合同、中英文 README 与个性化模板；安装和 profile 文件仍不替代每条新启用 lane 的真实 route probe

## 0.9.0 - 2026-08-16

1. 新增独立 `luna_medium_worker`（`gpt-5.6-luna` / `medium`），保留现有 `luna_worker` 作为不可替代的 Luna Max 深度 lane
2. 将路由收敛为显式升级：Medium 只接收路径、所有权、非目标与验收已固定的私有任务包；发现隐蔽耦合、根因未定或更广决策时返回 blocker，由 Sol 决定是否另发 Max 包
3. 安装器与安装合同扩展为四个 Agent profile 加一个 Skill，并按 profile 分别接受已知旧内容，保持未知内容、符号链接、非普通文件、暂存、回滚和精确匹配保护
4. 同步中英文 README 与个性化模板；当前本机已在新任务中完成 Medium 原生 route probe，但每次新安装或重大客户端变更仍须重新验证，profile 文件本身不能单独证明可用

## 0.8.0 - 2026-08-14

1. 新增独立的 DeepSeek V4 Pro 0813 Worker profile；它是 Flash 之外的候选 lane，用于范围明确但首次语义判断或重做成本更高的工作，不替换 Flash 或 Luna
2. 安装器、安装合同、个性化提示与中英文 README 同步支持四个受管文件，并明确 Pro 必须独立通过真实 route probe 后才可路由
3. 新增以“通过验收的一次完成成本”为核心的路由评估、TraceLab 公开工程轨迹复算、可重建图表与 Pro 原生 route probe 记录
4. 固化当前边界：Pro 已验证完整自包含任务、一次只读工具和原生网页搜索；私有动态任务包与后续追问仍不作为可用能力声明

## 0.7.1 - 2026-08-13

1. 安装器会在替换前暂存并备份已接受的目标与已知旧文件；普通命令失败或 `INT`/`TERM`/`HUP` 时逆序回滚，避免中途删除旧 runner 后留下半完成安装
2. 在暂存、替换、回滚和旧文件迁移前重新检查受管路径与可接受内容；明确说明便携 Bash 不能承诺抵抗并发父目录替换的绝对 no-follow 保证
3. 终端安装器不再把 `deepseek-api` 说成已验证的 provider；同时增加 Git Bash/MSYS/Cygwin 对 `C:/...` 路径的受限转换，并在文档中限定 Git Bash/MSYS/WSL 的兼容范围

## 0.7.0 - 2026-08-10

1. 增加状态驱动的 Worker 租约：单次等待结束、沉默、耗时较长或尚未写入文件均不得作为中断理由，并禁止对同一 turn 重复中断
2. 将 DeepSeek V4 Flash 从只读证据通道扩展为快速 1M 上下文通用 Worker，可承担有界语义分析、排障和多文件实现
3. 将当前 DeepSeek 路由收敛为官方 V4 Flash Responses API，安装官方 1,048,576-token 模型目录，并移除 LiteLLM/OpenCode Go 转换层
4. 优化中英文 README 与个性化 prompt，明确 Luna 的深度推理定位以及发布动作必须单独授权
5. 官方直连完成文本、Codex 内置工具和原生 web search 验收；联网研究改为 Sol 规定研究合同、DeepSeek 原生搜索与阅读、Sol 复核决定性来源
6. 记录当前 Codex custom-provider 子代理会丢失动态任务包的真实 blocker，禁止用直连成功冒充命名 Worker 可用
7. 第三方 MCP namespace 在官方 DeepSeek 路径下未通过控制验收；原生联网不依赖 MCP，不为无关工具恢复新增桥接层
8. DeepSeek Worker 默认推理档位调整为 `max`
9. 在 Codex 修复跨 provider 加密任务交接前，DeepSeek 仅使用 `fork_turns="1"` 的原生继承模式；只接受当前用户请求本身就是完整任务的场景
10. 明确禁止把 API 请求、`codex exec`、桥接进程或独立任务描述为 DeepSeek 子代理
11. 删除预发布的前台 DeepSeek runner；安装器仅按已知摘要安全清理其精确副本，并把符号链接冲突提前到任何写入之前

## 0.6.0 - 2026-08-09

1. 新增高上下文证据压缩路线：Sol 负责发现和固定网页或材料，DeepSeek 负责低成本阅读与结构化提取，Sol 复核来源并形成最终结论
2. 覆盖固定网页与论文、代码库与大 diff、CI 与日志、Issue 与发布记录、CSV/JSON/API 对账、翻译与依赖检查等高性价比场景
3. 并发策略由固定最多两个改为自适应扩容：先运行两个，首批验收通过后，相互独立的只读 DeepSeek 分片最多扩到四个
4. 明确 Sol 负责全部任务分发、来源判断和结果整合，并推荐日常使用 `gpt-5.6-sol` medium，复杂或高风险判断再升至 high
5. 更新中英文 README 与个性化提示词；详细分发合同仍只由 Skill 维护

## 0.5.3 - 2026-08-09

1. 修复 Codex Responses 历史转换为 OpenCode Go Chat 历史时，assistant 状态消息插入 `tool_calls` 与对应 `tool` 结果之间导致的 400
2. 在实际发往 OpenCode Go 前，仅按 `tool_call_id` 重排完整工具结果组；消息内容、工具参数与结果保持不变，不完整历史仍由上游明确拒绝
3. 真实 DeepSeek Worker 工具链已越过原 400，并连续获得 `/v1/responses` 200 响应
4. README 分开展示 DeepSeek 官方 API 与 OpenCode Go 两种配置，并说明选择方式、请求路径和运行要求

## 0.5.2 - 2026-08-09

1. 根据 OpenCode Go 真实请求修正 V4 Flash 的 Chat Completions 转发，确保上游模型 ID 保持为 `deepseek-v4-flash`
2. 移除 Go Worker 未受支持的固定 reasoning effort，并由桥接层丢弃上游明确不支持的 Responses 参数
3. 固定已通过启动与 Codex 实际请求验证的 LiteLLM、FastAPI 和 SOCKS 依赖组合
4. 安装器允许从已知的上一版 OpenCode Go Worker 安全升级

## 0.5.1 - 2026-08-09

1. 为 DeepSeek Worker 增加 OpenCode Go 上游选项，仅开放 `deepseek-v4-flash`
2. 增加本机 LiteLLM Responses-to-Chat 协议桥接，不要求安装或配置 OpenCode 软件
3. 安装器支持在 DeepSeek 官方 API 与 OpenCode Go 配置间安全选择
4. 更新中英文 README、安装合同和 Skill 的自动配置职责

## 0.5.0 - 2026-08-09

1. 新增 DeepSeek worker
2. 支持双 Worker 分流
3. 将 Skill 与仓库命名为 `sol-worker-routing`，避免把具体 Worker 供应商固化为公共接口
4. 增加可复现基准；README 用同类任务的耗时与生成 token 柱状图展示对照结果，详细方法与原始数据保留在独立报告
5. 增加探针决策说明
6. 更新安装、旧名安全迁移与个性化
7. 将 README 重写为项目介绍型结构，把任务合同、复现口径和安装边界下沉
8. 将第一性原理、最小流程与分流价值合并到 README 开篇总览
9. 由安装流程完成 DeepSeek provider 与真实路由验证，不绑定操作系统或凭据后端

## 0.4.1 - 2026-08-04

1. 重构 README 信息架构
2. 前置安装与使用说明
3. 增加委派场景对照
4. 同步中英文版式

## 0.4.0 - 2026-08-03

1. 迁移官方 Skill 路径
2. 增加旧路径安全迁移
3. 增加版本与更新日志
4. 嵌入 token 用量统计
5. 重写第一性原理说明

## 0.3.1 - 2026-08-02

1. 中文 README 设为默认
2. 英文 README 独立维护
3. 删除重复中文文档

## 0.3.0 - 2026-08-02

1. 明确 Sol 拆解职责
2. 增加独立性判定
3. 细化委派验收合同
4. 移除旧依赖声明

## 0.2.1 - 2026-08-02

1. 移除外部路由依赖
2. 固定 Luna 默认路由
3. 强化 worker 执行边界
4. 删除 Fast 模式说明

## 0.2.0 - 2026-08-02

1. 增加 Agent 部署合同
2. 增加安全安装脚本
3. 补充自托管安装流程
4. 加入 DeepSWE 榜单

## 0.1.0 - 2026-08-02

1. 新增 Sol/Luna 工作流
2. 新增 Luna worker 配置
3. 新增委派验证 Skill
4. 新增中英文使用文档
