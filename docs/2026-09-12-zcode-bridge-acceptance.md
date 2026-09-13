# ZCode 两模型接入验收与产品命名建议

2026-09-12。通过 Agent-Bridge → zcode-acp-server → ZCode 原生 app-server，GLM-5.3 与 GLM-5.3-Flash 都完成了同一合成编程任务，独立验收通过。

## 实测

| 配置 | 原生响应模型 | 推理档（实际记录） | 解题与验收耗时 | 结果 |
| --- | --- | --- | --- | --- |
| ZCode / GLM 5.3 | GLM-5.3 | max | 28.52 秒 | 通过 |
| ZCode / GLM 5.3 Flash | GLM-5.3-Flash | max | 38.56 秒 | 通过 |

两个项目分别实现标准库费用汇总函数与 JSON CLI；验收检查分类/总额、退款、空输入、输入不变性、中文类别和 CLI 输出。每个模型一次，不据此判断模型速度或质量排名。

ZCode CLI 为本机应用内的 0.16.5；账号渠道为已有 builtin:bigmodel-coding-plan。没有使用 OpenCode 的同名 GLM 模型。使用已发布的 [zcode-acp-server](https://github.com/william0wang/zcode-acp) 0.37.1，发布 gitHead 与源码检查提交均为 ad31b663eab446c2478f573498e5f7e3025d4c20，安装于 ~/.agent-bridge/adapters/zcode-acp，跳过安装脚本。运行中保留 ZCode 原生权限和开发工具，没有给子代理套用旧插件白名单。

## 模型确认及记录

先通过 Agent-Bridge 派发 `/model GLM-5.3` 或 `/model GLM-5.3-Flash`，收到原生切换成功反馈，再在同一会话派发编程任务。模型命令由 ACP 适配器调用原生设置接口，不交给模型猜测执行。

另从本次专属 ZCode 原生日志提取 model/provider/variant、response.modelId、requestId、attempt、usage、durationMs。两组响应的模型名称均与选择一致。没有复制请求头、认证、提示词或思考正文。

- GLM-5.3：Bridge sess_7b0c2ad644；ZCode sess_9baa1596-8266-4152-a985-75591fd9e7bb。
- GLM-5.3-Flash：Bridge sess_ff0f9fcb40；ZCode sess_d557af5b-e5ff-4326-b916-484dbf43f479。
- 两个会话已结束，测试容器用后删除。
- 产物、验收结果、脱敏用量字段保存在 `/Users/ethan/agent-bridge-trials/2026-09-12-zcode/`。

## 当前接入边界

已把通过测试的 zcode 条目加入 ~/.agent-bridge/agents.toml；原 OpenCode 配置保留。已连接的 Codex/Bridge 实例需要重新连接，才能载入新增 Worker。

当前 Agent-Bridge 对自定义 ACP Worker 不处理 dispatch_task.model/effort，所以 ZCode 暂用上述原生 /model 命令选择模型；不能把传入 model 参数当作已应用。它的发现版本会显示入口 Node 版本，而不是 ZCode CLI 版本。原生回读已弥补本次身份核验，但自动 benchmark 适配尚未实现。

日志中有不认识的 ZCode 扩展通知 `$/zcode/turnState` 等 Method not found 报告；本次未妨碍流式作答、结果返回和验收，但应作为兼容性噪音记录，不声称完全无警告。没有修改 Agent-Bridge 源码去处理这些扩展。

## 命名与升级范围

建议整体产品名用 **Agent Bench**，继续保留当前 `quant-agent-bench` 仓库和 `qbench` 命令。它表达的是比较不同 Agent/工作流的效果与资源消耗，不限于 OpenCode。

这在能力范围上是大升级，但不应把旧 opencode-worker 重新扩成通用连接器：Agent-Bridge 继续负责执行与 A/B 可靠性改进；现有 qbench 增加 C/D/E 的多来源采集、模型身份、用量及任务树统计。旧插件继续归档，保留测试场景和可复用的恢复/采集逻辑。

命名仅为建议，尚未重命名仓库或发布新版本。A–E 分工已确认，但这些改造并没有在此次 ZCode 接入测试中全部完成；本次增加的是可用执行路线与可读取的原生证据。
