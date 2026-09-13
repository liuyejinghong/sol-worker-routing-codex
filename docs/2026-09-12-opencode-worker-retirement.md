# OpenCode Worker 退役归档

日期：2026-09-12。

状态：**已完成归档、卸载、市场登记清理和活动源码删除。**

## 原因与接替入口

外部 Agent 连接改用 Agent-Bridge，保留所选 Agent 的原生工作流与工具能力；Agent Bench 维护统一评测和证据。旧 OpenCode Worker 的专用 OMO 映射、单任务与工具限制不再作为通用连接器维护。

- [Agent-Bridge 切换记录](2026-09-12-agent-bridge-switch.md)
- [Agent Bench 独立项目入口](../BENCHMARK_PROJECT.md)

## 已准备的归档

[归档入口](../archives/README.md)包含 tar.gz 和逐文件 SHA256 清单。38 个文件覆盖原 `plugins/opencode-worker` 的源码、manifest、配置、Skill、构建脚本、测试、lockfile 与 dist；排除 node_modules 和 .git。归档逐成员回读校验通过，原文件在封存后再次核对一致。

源码版本：Git `6d406e4254d6f60336b6290a4743da6b91b10920`，插件 `0.3.2+codex.20260911064656`。归档不作为活动插件发现，也不注册为新市场源。

## 已执行的收尾范围

1. 核对执行已停止，卸载仅 `opencode-worker@personal`。
2. 从 `/Users/ethan/.agents/plugins/marketplace.json` 移除旧插件的单条登记。`personal` 市场根是 `/Users/ethan`，该条 `./plugins/opencode-worker` 指向 `/Users/ethan/plugins/opencode-worker`；保留整个市场及其 gpt-pro-codex-loop、nowledge-mem 条目。
3. 归档核对后删除仓库 `plugins/opencode-worker/`、对应外部市场源和旧安装缓存。根级 Luna 安装器与测试不属于删除范围。
4. 核查当前入口及历史链接，保留已完成的 Agent-Bridge 和路由修改。

## 保留的数据与边界

`/Users/ethan/.local/share/codex-opencode-worker` 的历史 state、任务回执、每轮 runner/guard、代码差异及既有备份不删除。过去的验收文档和发布记录保留；它们描述当时版本，不代表当前安装入口。

不修改 OpenCode/OMO 登录、Provider、模型目录或配置，不更改 Luna 开关，不删除其他插件。当前已连接的旧 MCP 不能仅凭磁盘卸载认定已经热替换；重新进入新会话后再核对工具发现。

归档准备阶段没有执行模型调用或卸载；后续卸载与清理已完成，见下方收尾记录。没有提交或推送。

## 主控收尾

已通过 Codex 支持的卸载入口卸载 opencode-worker@personal，移除 personal 市场单条登记；核对归档后删除仓库 plugins/opencode-worker 和 /Users/ethan/plugins/opencode-worker 两处活动源。其他 personal 插件及 ~/.local/share/codex-opencode-worker 历史数据保留。
