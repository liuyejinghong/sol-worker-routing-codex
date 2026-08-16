# 更新日志

版本遵循语义化版本。`0.1.0` 至 `0.3.1` 根据 Git 历史追溯整理。

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
