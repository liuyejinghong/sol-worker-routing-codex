# Agent Bench 整合与退役计划

用户已授权实施。沿用 quant-agent-bench/qbench；不新建调度平台，不给外部 Agent 增加权限限制，不重跑主控工作代替验收。

1. 扩展当前执行记录：Codex 主控调用 Agent-Bridge 时给 Bridge 使用本轮记录目录，任务结束后关联 Bridge task/session 与 OpenCode/ZCode 原生会话。
2. 统一 C/D/E：记录请求/实际模型与档位、本轮用量、父子会话及结果覆盖。避免累计量重复相加；拿不到的数据保持 unknown。报告与评分使用已核对的合计，旧成绩不改写。
3. A/B 在 Agent-Bridge 的原有实现中小范围补齐：持久请求绑定防重启重复派发；对长度/轮次上限及拒绝给出清楚警告，不自动重试。保留补丁、基线版本与测试，避免包装第二层执行器。
4. 验证：保留现有功能回归，增加脱敏原生记录夹具、父子/重试用量边界检查、Bridge 重启与异常结束测试。最后用实际已授权模型做范围小的端到端验收。
5. 旧插件归档：保存源码、lockfile、测试及 dist（不含 node_modules），移出活动 plugins；移除 personal 市场单条登记并卸载对应缓存；删除仓库外旧市场源。保留历史运行数据、证据与其他插件/原生 Luna/OpenCode 配置。
6. 清除活动文档与路由中的旧安装入口，历史链接指向归档。完成后提供已验证能力、剩余限制与归档位置。此次不提交、推送或发布。

## 完成记录

Agent Bench 0.4.0-dev 已整合部署到 /Users/ethan/quant-agent-bench；A/B 本地 Bridge 补丁 0.1.0+agentbench.1 已安装；两条真实路线及自动采集均通过；旧插件已归档、卸载并删除活动源。验收：Agent Bench 76 项测试、Bridge 532 项测试，两条真实路线各 3/3 题、14/14 用例通过。详见 [整合说明](/Users/ethan/quant-agent-bench/docs/agent-bench-integration.md)。
