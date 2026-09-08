# OpenCode Worker 完成唤醒：宿主接入验证

日期：2026-09-08。范围：验证现有插件能否在后台任务完成后恢复当前桌面 App 的原 Codex 会话。未修改插件、App 配置或已有 heartbeat，未创建替代代理或启动另一套 App Server。

## 结论

本机协议具备 `turn/start.toolOutput`，但当前桌面 App 没有暴露插件可连接的官方控制 socket。直接完成回调方案止于宿主连接门槛，尚不能在当前安装上交付“主代理已经结束响应后，插件自动唤醒原会话”的端到端能力。

这不等于所有 Codex 宿主都不支持。可连接、可管理的 App Server 可以成为以后验证的目标；不能用新建服务器、resume 同一历史记录来冒充当前桌面会话已被唤醒。

## 已执行的验证

| 检查 | 结果 | 说明 |
|---|---|---|
| App 自带客户端版本 | 0.153.4 | `/Applications/ChatGPT.app/Contents/Resources/codex --version` |
| 默认运行中 daemon 连接 | 失败，ENOENT | `app-server daemon version` 无法连接默认控制 socket |
| 默认控制 socket | 不存在 | `/Users/ethan/.codex/app-server-control/app-server-control.sock` |
| 实际 App 后端 | 默认 stdio 连接 | App 进程启动的 backend PID 77858 运行 `app-server`，未带 unix/ws listen 参数；默认传输为 stdio |
| 该后端 Unix socket | 仅观察到匿名 socket 对 | `lsof -nP -a -p 77858 -U` 未显示命名控制 socket；没有连接或修改这些私有通信通道 |
| 本机生成的协议 schema | 支持 | `v2/TurnStartParams.json` 同时包含 threadId 和 toolOutput |

协议文件使用本机客户端生成在 `/private/tmp/ocw-completion-protocol-20260908`。没有发起模型任务来反复验证缺失的连接入口。

## 官方机制的边界

- App Server 的 `turn/start` 可以接收指定 threadId 的工具输出并开始处理；正在运行的会话可排队接收工具结果。这证明协议能力，不证明外部插件已经拥有当前 App 后端的连接。
- 普通异步 hook 不能填补这个缺口。官方文档明确：无活动 turn 时，异步 hook 输出等到下一次用户 turn 才交付，hook 完成不会启动新 turn。
- 同步 Stop hook 可以阻止结束并继续当前处理流程，但这是保留当前轮的另一种设计，不能当作“会话已经结束后的异步唤醒”已通过。长等待工具也应按这一边界描述。
- 当前主代理可见的 `send_message_to_thread` 是宿主提供的工具；仅有工具名称，不等于 detached runner 或 Muse 获得了可访问该工具的 MCP 服务入口。

参考：[App Server](https://learn.chatgpt.com/docs/app-server#start-a-turn)、[后台 hooks](https://learn.chatgpt.com/docs/hooks#how-background-hooks-run)、[Stop hook](https://learn.chatgpt.com/docs/hooks#stop)。

## 对现有插件的处理建议

1. 不先增加一个声称能唤醒的 report_complete 工具。没有宿主投递路径时，它最多写一个事件，不能解决原问题。
2. 后续若有受支持的宿主入口，由 runner 在确认停止并保存结果后投递，绑定原 thread/host、task_id 和 turn；主代理才恢复验收。不要依赖 Muse 必须执行最后一次工具调用。
3. 当前可继续使用已明确绑定的宿主 heartbeat，或让主代理在当前轮等待；两者的模型消耗和生命周期需如实说明。已有 Tokens heartbeat 本次没有修改。
4. 不为此改写 App 私有数据库、截取 stdio、伪造用户消息、替换 App 启动器或创建另一个代理冒充原会话。

只有观察到“原会话已结束 → 后台任务停止 → 正确原会话恢复 → 实际验收产物”，才可将原生完成唤醒标为通过。当前未达到该标准。
