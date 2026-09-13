# 切换到 Agent-Bridge

2026-09-12：用户确认采用通用本地 Agent 连接器，保留原生 Agent 的工具、权限和工作流；OpenCode 是当前已有资源，不是产品范围限制。

## 已完成

- 通过 uv tool 安装 Agent-Bridge 0.1.0，固定源码提交 `f8f544c6b0af304549868144e8a2f1c0d330118f`。入口 `/Users/ethan/.local/bin/agent-bridge`。
- 在 Codex 注册 `mcp_servers.agent_bridge`，沿用本机 HTTP/HTTPS 代理。使用项目原生 `AGENT_BRIDGE_SKIP_SKILL=1` 开关，避免它向其他应用自动写入技能。
- 仅复制原版协调技能到 `/Users/ethan/.codex/skills/agent-bridge/SKILL.md`。
- `/Users/ethan/.agent-bridge/agents.toml` 指向现有 OpenCode 可执行文件。未更改 OpenCode 的登录、模型目录、OMO 配置或原生权限。
- 将 `plugins."opencode-worker@personal".enabled` 设为 false；不删除安装缓存、源码和历史执行记录。停用前未发现未完成任务。
- 更新并同步 sol-worker-routing 的外部执行部分，改走 Agent-Bridge；原生 Luna 状态不变。旧插件的逐文件/命令白名单、单任务限制和固定 OMO 映射不再作为外部 Agent 的通用要求。

## 验证

Codex CLI 读回 Agent-Bridge 为 enabled。按保存的实际 command/env 完成 MCP 握手，发现 10 个工具，OpenCode 1.18.29 可用，coordinator=auto。两份技能通过格式校验，路由源码与安装副本一致。关键安装源码与先前实测提交逐字节一致。

安装环境的依赖为 MCP 2.2.0、ACP 0.12.1；上一轮临时测试环境为 MCP 2.0.0、ACP 0.12.1。安装后已复验 MCP 连接与发现；未再重复付费模型任务。此前两轮 OpenCode 真实派发与同会话续接均通过独立验收，详见[实测报告](2026-09-12-agent-bridge-live-acceptance.md)。

除 Agent-Bridge 新增配置及旧插件 enabled 外，其余 Codex 配置已逐项比对保持一致。Codex CLI 添加 MCP 时规范化了三个无关字段，已恢复原值。没有提交、推送或发布仓库修改。

当前已打开的会话仍可能持有旧工具列表。重启 Codex 并进入新会话加载新的工具与技能；本记录不声称当前对话已经热替换工具。

## 旧插件保留的价值

1. 请求 ID 的持久化、旧轮归档及不确定提交恢复：防止断线后重复执行。
2. 实际模型/推理档与父子任务结果核对：不把请求标签、截断输出或根任务“完成”当成功证据。
3. 假 OpenCode 后端与生命周期/任务树测试：便于低成本验证续接、取消、异常和恢复。
4. 历史真实调用与成本记录：作为比较和回溯资料。

这些保留在既有源码和测试中，不作为 Agent-Bridge 的新包装层。若以后需要改进，优先向上游贡献有复现的修复，不重新维护一套通用连接器。

## 备份

切换前配置与旧路由文件：`/Users/ethan/.codex/backups/agent-bridge-switch-20260912-143255/`。源码仍在 `plugins/opencode-worker/`，市场源仍在 `/Users/ethan/plugins/opencode-worker/`。

## 后续整合

旧插件已进一步完成退役归档并卸载，不再保留活动源码或安装缓存。Agent-Bridge 已更新为本地 A/B 补丁版 0.1.0+agentbench.1，Agent Bench 自动采集已接通；见[退役记录](2026-09-12-opencode-worker-retirement.md)与[整合完成记录](2026-09-12-agent-bench-integration-plan.md)。
