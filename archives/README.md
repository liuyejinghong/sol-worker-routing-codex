# 历史源码归档

这里保存退役组件的版本快照，不是插件市场或当前构建入口。归档采用 tar.gz，目录中不提供可被发现的插件 manifest；不要将解包目录自动注册为插件。

## OpenCode Worker 0.3.2

- [源码与构建产物](opencode-worker-0.3.2-2026-09-12.tar.gz)
- [逐文件 SHA256 清单](opencode-worker-0.3.2-2026-09-12.manifest.json)
- [退役范围与收尾状态](../docs/2026-09-12-opencode-worker-retirement.md)

归档包含 38 个文件：源码、插件与 MCP manifest、配置样例、Skill、构建脚本、测试、package/lockfile 及 dist。排除 node_modules 和 .git。每个 tar 成员均已回读核对内容 SHA256，归档后再次核对原文件。

来源 Git HEAD：`6d406e4254d6f60336b6290a4743da6b91b10920`。插件 manifest 版本：`0.3.2+codex.20260911064656`。

归档 SHA256：`ec6324313ba01d7fe342095eb5a16ab9d209d25e35a217c1d425cbad989bd010`。

运行历史不打包在此归档中，仍保留于原有私有证据目录；归档不包含用户认证。
