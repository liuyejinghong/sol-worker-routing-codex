# Agent-Bridge 连接 OpenCode 的真实试用

2026-09-12。结论：真实 MCP → Agent-Bridge → OpenCode ACP 链路通过，两轮交付和独立验收成功，符合用户希望保留原生 Agent 能力的方向。可以进入日常试用；本轮没有把它注册到 Codex App，也未替换原插件。

## 实测结果

| 环节 | 结果 |
| --- | --- |
| 发现现有 OpenCode | 1.18.29，可用 |
| 首轮派发 | 实现整数分费用汇总、分类统计、负数退款及 JSON CLI |
| 首轮独立验收 | 通过；约 162.5 秒，含验收 |
| 同会话续接 | 追加多币种功能，保留原有接口和默认 CLI 行为 |
| 第二轮独立验收 | 通过；约 110.0 秒，含验收 |
| 原生模型回读 | 25 条 assistant 消息均为 opencode-go/deepseek-v4.1-flash，variant=max |
| 原生 Agent | Sisyphus - ultraworker |
| 实际工具 | bash、read、write、edit、todowrite、lsp_diagnostics |
| Bridge 警告 | 两轮均为空 |
| 会话结束 | end_session 返回 proc_state=dead |

两轮共用 Bridge session `sess_6ad4c149b0`，原生 session `ses_f6bba2779ffed9WrHvdQ3qjmrt`。独立验收在 Apple Container 中执行，检查整数金额、退款、空输入、输入不变性、CLI JSON、新功能以及旧接口回归。首次交付有单独副本，验收不会修改候选代码。

## 体验判断

不需要我们原插件的逐文件写入列表、逐命令白名单或专属 OMO 运行配置。任务通过自然语言交代，OpenCode 保留现有原生环境，并主动调用测试和 LSP 修正类型问题。续接只需传入同一个 session_id。

本轮验证的是文件/命令/开发工具与同会话继续工作；没有逐个调用所有 MCP、Skills，也没有验证多 Agent 委派、取消进行中任务或长时间断线恢复。不宣称这些未执行项目全部可用。

桥接层有两个值得注意的产品细节：

- get_result 返回的 result_text 含过程消息和最终答复，不总是只有最后一段总结。
- ACP usage.used 与容量字段用于当前上下文报告，不能把两轮 used 直接相加当作总消耗。OpenCode 原生导出记录了输入、输出、缓存与 reasoning；本轮未进行与旧插件的同题成本对照，因此不宣称更快或更省钱。

连接器沿用上一轮检查的提交 `f8f544c6b0af304549868144e8a2f1c0d330118f`。通过其原有 MCP server 启动，不改源码；采用独立 Bridge 数据目录，关闭与本次接入无关的额度查询。使用现有 OpenCode 登录与配置。为避免自动写入宿主技能目录，本次直接启动 MCP server，没有运行全局安装流程。

## 后续建议

按用户真实目标，建议将 Agent-Bridge 接入 Codex 后用于日常任务，原插件先保留作过渡。无需继续扩建原插件的控制层；后续有其他 Agent 时再逐个验证接入。

[测试记录与交付](/Users/ethan/agent-bridge-trials/2026-09-12-opencode/summary.json)；[最终代码](/Users/ethan/agent-bridge-trials/2026-09-12-opencode/work/expense_report.py)。
