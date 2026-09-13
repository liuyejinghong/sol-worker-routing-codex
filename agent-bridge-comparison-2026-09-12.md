# Agent-Bridge 与 OpenCode Worker 对比

日期：2026-09-12。结论：Agent-Bridge 在通用连接器的产品完整度上领先；现有 OpenCode Worker 在 Codex → OpenCode Go/OMO 的受控执行、请求恢复和任务树核验上更贴合当前需求。不建议直接替换，优先借鉴状态展示、结果读取和协议适配思路。

## 检查范围与证据

- Agent-Bridge：公开 main 的 `f8f544c6b0af304549868144e8a2f1c0d330118f`，包版本 0.1.0。临时源码副本 528 项 pytest 通过（31.18 秒），ruff 通过，mypy 检查 36 个源码文件通过。[该提交 CI](https://github.com/FeiZhuLulu/Agent-Bridge/actions/runs/34671983618) 成功，矩阵为 Ubuntu/Windows × Python 3.11/3.12；本次另在 macOS 跑了测试。
- 我方：0.3.2，安装版本 `0.3.2+codex.20260911064656`，来源仓库 HEAD `6d406e4254d6f60336b6290a4743da6b91b10920`。市场源、Git 工作区与安装缓存的 38 个文件完全一致。类型检查通过；22 项单测通过，显式生命周期测试通过，run 与任务树集成测试通过。
- 两边本轮都没有调用真实模型。测试数量反映覆盖规模，不等于产品质量分。对方提供真实 CLI 演练方式，但没有随仓库提供一套可核对的全产品真实验收结果。我方历史 0.3.1 有实际 V4.1/Muse 调用记录，0.3.2 未重新进行真实模型路由验收。
- 未安装 Agent-Bridge 到 Codex，未改动现有插件或全局设置。

## 产品能力

| 维度 | Agent-Bridge | 我们的 OpenCode Worker |
| --- | --- | --- |
| 目标 | 把多种本地 Agent 接到协调者 | 专注 Codex 调用 OpenCode Go/OMO |
| 产品范围 | 多种宿主、多个 Worker；通用 ACP 加少数专用适配 | 单一专用执行通道，范围更窄 |
| 启动体验 | Agent 发现、配置、升级、偏好设置较齐全 | 一次 run 完成派发与等待，但前期需要精确工作包 |
| 结果读取 | 状态、完整结果分页、会话记录分页、变更文件 | 文本、工具、变更文件、结束原因及任务树证据集中返回 |
| 长任务 | 多会话、等待、取消、静默超时、闲置卸载与部分原生会话恢复 | 同一 store 一个活跃任务，有限等待、取消、同会话返工 |
| 模型配置 | 广泛接受 provider/model，并映射推理档位 | 明确 OMO 模型与角色，核对目录最高推理档 |
| 写入控制 | ACP 工具请求优先自动允许；部分产品强制 bypass 模式 | 文件路径限制、精确可信命令、一个 writer、最多两直接子任务 |
| 适合谁 | 想把多款本地 Agent 都用起来的人 | 想稳定完成有边界的 OpenCode 委派任务的人 |

Agent-Bridge 的[默认配置](https://github.com/FeiZhuLulu/Agent-Bridge/blob/f8f544c6b0af304549868144e8a2f1c0d330118f/src/agent_bridge/agents.toml)包含 Grok、Kimi、Cursor、DSH、Claude、OpenCode、Devin、Antigravity、Codex 条目。配置存在与自动测试通过不代表每个产品的当前版本都完成了本机真实验收。

## 完成度判断

它是有完整任务生命周期的早期可用产品，不是仅包装一条 shell 命令的演示项目。发现、派发、续接、取消、输出、日志、配额信息和跨平台 CI 已形成闭环。通用 ACP 使新产品接入成本较低；不同产品的模式、模型与恢复差异又有专门处理，说明已经处理过实际兼容问题。

仍不应直接视为成熟通用执行底座：模型接入差异、恢复细节和权限策略都有明确边界。比如额度只在部分产品有可靠来源，其他返回 unknown；DSH/Cursor 默认不可恢复；OpenCode 的 observed_model/effort 是适配器最后成功设置的值，并不是模型服务实际采样的完整回执。[产品说明](https://github.com/FeiZhuLulu/Agent-Bridge/blob/f8f544c6b0af304549868144e8a2f1c0d330118f/SETUP.md#L470)

## 三个关键差异

### 1. 跨重启重试可能重复执行：已复现

相同 UUID、相同参数，第一次正常完成并停止服务；第二个独立进程从同一 state 目录启动，再提交同一个请求。结果出现两个 task，第二次 `reused=false`。

实际复现：第一次 `task_480c4d59ba`，第二次 `task_63e13f1deb`，已知任务数从 1 变成 2。仅使用 fake Agent，没有真实模型或外部业务操作。

原因：请求去重表 `_requests` 只在内存中，保存状态仅写 sessions/tasks，启动也没有恢复请求绑定。同一服务进程内的重试有去重，重启后的同一请求没有。[实现](https://github.com/FeiZhuLulu/Agent-Bridge/blob/f8f544c6b0af304549868144e8a2f1c0d330118f/src/agent_bridge/registry.py#L130)

产品影响：连接器重启后，协调者因不确定是否成功而重试，可能把工作再做一遍。对于纯阅读是重复消耗，对于写入任务可能产生重复动作。我方请求 ID 与任务状态一起保存，旧请求读取旧轮归档，在这项能力上更符合现有使用方式。

### 2. 更顺畅，也更放权

ACP 权限选择优先 `allow-always`，其次 `allow-once`；Claude/Devin 等还会切换 bypass 模式。派发接口没有我们这一套逐文件写入范围与可信命令合同。这是明确的产品取舍，不能把“设置 cwd”当成文件隔离。[权限处理](https://github.com/FeiZhuLulu/Agent-Bridge/blob/f8f544c6b0af304549868144e8a2f1c0d330118f/src/agent_bridge/adapters/acp.py#L399)

我们的限制也有代价：禁用继承 MCP、任意 Skills 和深层委派，只支持特定 OMO 使用方式，不能无损透传 OpenCode 全部功能；精确白名单 shell 仍运行在用户账户下，也不是操作系统沙箱。

### 3. 模型档位兼容优先，不是精确实验优先

OpenCode 的 `max` 会按模型提供的档位映射为 max、xhigh、high 或 medium；无法映射/设置时，某些路径给出 warning 后继续执行。日常工作有利于完成任务，但不适合直接把“请求 max”当成全程实际 max。[档位映射](https://github.com/FeiZhuLulu/Agent-Bridge/blob/f8f544c6b0af304549868144e8a2f1c0d330118f/src/agent_bridge/opencode_meta.py#L20)

我方更强调精确模型、最高可用推理、父子角色和实际消息回读。这更适合目前固定 OpenCode/OMO 工作流及后续比较，但不能因此宣称我方记录覆盖所有账单或每一次底层请求。

## 值得借鉴的内容，按优先级

1. **统一“现在能不能用”的说明。**在现有 status 中清楚区分 CLI 是否存在、模型是否可用、当前任务是否占用、失败原因；如果未来产品有可靠额度接口，再展示额度，没有就保留 unknown。无需为拿额度另造抓取平台。
2. **结果按需读取。**默认只返回摘要、改动和关键失败原因，长日志/完整会话按需分页读取，减少协调者被大量输出淹没。对方 get_result/get_transcript 的分工值得借鉴。
3. **区分仍在工作、静默等待、已经停机。**借鉴 last activity 与静默时长展示，让超时不再只给一个含糊的状态；不把静默自动等同死锁。
4. **需要第二款 Agent 时再引入通用协议适配。**ACP 能复用会话与流式事件，但 OpenCode/OMO 的精确任务树控制可以继续走现有原生 API；不为了“支持更多”立即重写所有代码。

不建议照搬自动放行、档位降级继续和更激进的委派偏好。也不建议为了追平功能数量，马上添加配额抓取、平台界面或更多调度层。

## 建议

近期保留现有 OpenCode Worker，借鉴前两项体验改进；如果下一步确实需要统一调用 Grok、Kimi、Claude 等，Agent-Bridge 值得在独立项目试用，比从零再造一个多产品连接器更合理。试用时先验证实际所需的两三条模型路径，并避免依赖其跨重启请求去重。

我方细节依据：[运行入口](archives/README.md)、[任务存储](archives/README.md)、[运行器](archives/README.md)、[任务树规则](archives/README.md)。
