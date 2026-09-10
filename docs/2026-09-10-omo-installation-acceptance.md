# OpenCode Worker 0.3 安装验收

2026-09-10。按用户授权安装完成；已从安装缓存中的真实启动入口验证混合路由，不再只是开发目录测试。

- 安装版本：`0.3.0+codex.20260910074819`。
- 安装位置：`~/.codex/plugins/cache/personal/opencode-worker/0.3.0+codex.20260910074819`。
- 配置：仅向 `~/.omo/omo.jsonc` 增加 `profiles.codex-worker`，保留基础配置与迁移标记。原配置备份位于 `/private/tmp/ocw-install-PALQcj/omo.before.jsonc`。
- 安装命令使用 App 自带的 Codex 0.153.4；PATH 中的旧 CLI 无法解析当前配置，因此未用它安装，也没有为兼容旧 CLI 改配置。
- 安装目录全部文件与本机插件源码逐字节一致；该源码同步纳入 `plugins/opencode-worker`，使仓库包含实际实现及构建产物。

## 实际验证

新建隔离合成文件目录，通过安装缓存的 `scripts/launch.sh` 建立全新 MCP 连接。使用真实用户 profile，不设置项目级测试 profile 或请求观察代理。六个工具可发现，run schema 包含 `model_mode`。

DeepSeek 主控以 `max` 委派 Muse Explore（`xhigh`）读取随机标记，主控最终返回完全一致的标记。根与子会话均完成，实际模型身份回读符合配置。原始结果为 `/private/tmp/ocw-install-PALQcj/acceptance.json`；可携带摘要见 [安装证据](2026-09-10-omo-installation-evidence.json)。任务使用隔离状态目录，不修改既有任务记录。

Codex config/auth、OpenCode auth/config、personal marketplace、两个 Luna profile 的前后 SHA-256 均一致。六个退役 Spark/DeepSeek profile 路径仍不存在。

## 使用边界

在新 Codex 任务中重新发现插件工具与 Skill；当前已打开任务不会凭安装操作自动刷新其工具定义。新 MCP 连接的实际安装验收已通过，但不把它描述成当前任务已经热加载。

Luna 两条线路保持 enabled。本机旧路由 Skill 在 `~/.codex/skills/sol-worker-routing`，安装合同指定的 `~/.agents/skills/sol-worker-routing` 缺失，因此没有运行 Luna 安装器或绕过其部分安装保护。仓库路由 Skill 已更新，插件自身 Skill 随 0.3 安装；旧路径路由 Skill 的迁移不包含在本次独立插件安装中。

本次没有修改 App Personalization。`personalization.md` 不会自动激活；如需采用其内容，应在 App Settings → Personalization → Custom Instructions 手动替换原工作流块并保留其他偏好，避免重复追加。
