# OpenCode Worker V4.1 修复验收

日期：2026-09-11。工作流 v0.16.1，插件 0.3.1，OpenCode 1.18.29。

## 修复范围

Go 模型目录当前提供 `opencode-go/deepseek-v4.1-flash`，其 `api.id` 也是 `deepseek-v4.1-flash`，最高 variant 为 `max`。`deepseek-flash` 出现在 `family` 字段，不能作为当前可调用 ID。同步更正默认 OMO profile、两份 Skill、配置样例及测试；禁止将用户指定的 V4.1 替换为 V4。

首轮真实读取已成功调用 V4.1，但 Muse explore 子任务在读到文件后尝试 `list_mcp_resources`，触发范围拒绝，整轮未通过。OpenCode 的 MCP 资源工具共用 `read` 权限，单独允许文件读取并不保证这些工具不可见。修复在插件自有运行环境的 config hook 中禁用继承的 MCP 服务，不改写全局配置，也不放宽工具范围。原拒绝逻辑保留。

依据：[OpenCode 权限规则](https://opencode.ai/docs/permissions/)、[资源工具实现](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/tools.ts)、[工具可见性实现](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/permission/index.ts)。运行时请求记录补充验证了实际工具列表。

## 验证结果

| 检查 | 结果 |
|---|---|
| TypeScript 检查、构建 | 通过 |
| 单元测试 | 21 通过，1 个独立 lifecycle 套件未启用；不计作通过 |
| 模拟树集成 | 通过父子模型识别、错误传播及整树取消 |
| v0.16.0 升级到修复版 | 隔离 HOME 验证通过；Max 仍启用，Medium 不存在 |
| Skill / 插件格式 | 通过 |
| 真实父子读取 | V4.1 max → Muse explore xhigh；父子均 completed，随机标记匹配 |
| 安装缓存真实写入 | V4.1 max → Muse quick xhigh；父子均 completed，仅 normalize.py 改动，独立 Python 断言通过 |

真实读取使用临时 profile 和受控请求观察器：10 个实际请求均返回 HTTP 200，响应模型标识与请求一致；推理档分别为 max / xhigh。请求工具列表不含 MCP 资源工具。读取前后全局 OMO、OpenCode 和 OMO 插件配置内容一致。

真实写入通过重新安装的插件缓存 `0.3.1+codex.20260911041724/scripts/launch.sh` 建立全新 MCP 连接，使用本机默认 `codex-worker` profile；未设置测试 profile 或 API 观察代理。只允许修改临时 `normalize.py`、执行 `python3 check.py`；检查文件不变，验证去空格、小写化、去空值、保序去重和空输入。测试前后全局配置内容一致。

## 本机证据索引

- 初次读取失败：`/private/tmp/ocw-omo-live-abXTPP/acceptance.json`；保留失败，不计入通过。
- 修复后读取通过：`/private/tmp/ocw-omo-live-g0kvoA/acceptance.json`。
- 安装缓存写入通过：`/private/tmp/ocw-installed-031-lMC5T8/acceptance.json`，task `0a04b938-6c06-449e-b593-fb64e9e817d3`。
- 模拟树集成：`/private/tmp/ocw-tree-integration-9wvd3Y`。

本机默认 profile 仅更改 `profiles.codex-worker.models.hard.model`；保留 max、注释和其他 profile。市场源与安装缓存已同步，路由 Skill 与仓库一致；Luna Max 仍启用，Medium 仍不存在。旧任务已加载的 MCP 服务不会因重装自动换版本，需新开 Codex 任务。

这些结果证明上述临时读写和交接路径通过，不代表所有任务、未来模型目录或额度状态均已验证。
