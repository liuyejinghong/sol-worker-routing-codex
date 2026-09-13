# Agent Bench 整体评估交付

正式源码位于 /Users/ethan/quant-agent-bench，版本 0.5.0-dev。整体评估、独立 Reviewer、官方 API 等价计费、比较和建议已实现；正式目录 87 项回归通过。原任务未重跑，两组历史 C02 交付已独立评审。完整结果见该项目 docs/results/evaluation-2026-09-13.md。

Agent-Bridge coordinator.instructions 已持久保存按任务、能力、完成成本分工及 Luna Max 最低优先级，工具读回确认。模型基线见该项目 routing/model-policy.json。

本仓库与本机安装的 sol-worker-routing Skill 已同步。用户于 2026-09-13 明确批准将旧版 SHA256 `87d53f7effaa0c77a5c85d9c9753e229ed225d8b26d3a2d630a23ea0e77954f0` 纳入受控升级清单，随后通过 `bash scripts/install.sh` 完成更新。安装器读回为 skill accepted，安装文件与源码逐字节一致。临时 HOME 验证了这个旧版可升级、其他未知内容仍拒绝且不写入；仓库 TOML 解析通过。

安装前后配置、认证及配置引用文件哈希一致，Luna profile 未改变。此前直接复制的自动审批阻断已通过获批的受控安装解决。新任务加载新版 Skill；未改 App Personalization，它仍需用户在设置中手动替换完整工作流块才会生效。

Luna 当前 enabled，四种退休 Profile 均 absent；没有新启用 lane，无需新增探针。没有提交、推送或发布版本。
