# OpenCode Worker

一个 Codex 入口，通过用户选择的 OMO profile 在 OpenCode Go 中分配模型。Codex 保留任务范围、授权和最终验收。0.3.2 支持 Sisyphus 主控、一层子代理、只读并行和串行写入；所有参与模型使用其 Provider 目录支持的最高推理档。

模型映射来自 `~/.omo/omo.jsonc` 的 `profiles.codex-worker`，不写死 Muse 或 DeepSeek。随附 `config/omo-profile.jsonc` 是 DeepSeek V4.1 Flash `max` + Muse Spark 1.3 Contributor `xhigh` 的合并样例；不得用它覆盖整个用户配置。模型变化通常只需调整 profile，新任务会重新读取；角色/分类必须完整显式配置，缺失 profile 不回落到基础配置。

## 前提与使用

- Node.js 22+、Git、OpenCode，以及已连接的 OpenCode Go。
- 已安装支持统一 OMO profile 的 OMO；本次开发基线为 OpenCode 1.18.29 / OMO 4.19.4。
- 对任务涉及的外部模型已有授权。混编包含 Muse Contributor 时，提交内容可能用于 Meta 训练；DeepSeek 主控不使整条混编链路变为非训练模式。

```json
{
  "request_id": "normalize-tags-1",
  "profile": "codex-worker",
  "model_mode": "omo",
  "directory": "/absolute/path/to/assigned-worktree",
  "task": "按任务范围修复标签归一化，由适当分类完成实现并运行指定测试。",
  "mode": "write",
  "writable_paths": ["src/tags.py"],
  "allowed_commands": ["python3 -m unittest tests.test_tags"],
  "timeout_seconds": 900,
  "wait_seconds": 300
}
```

保留六个工具：`run/status/start/wait/followup/cancel`。正常使用 `run` 一次派发并在程序内等待。窗口到期不等于任务完成；继续同一请求或调用 wait，不能重新生成请求 ID。`start` 只供显式后台模式，不注册已结束 Codex 会话的唤醒。

`model_mode=single` 使用 profile 的 Sisyphus 模型及其最高推理档，辅助调用也使用它，并禁用委派。它用于单模型验证或相应的数据边界，不是另一个插件。

## 编排和保护

- 只开放 task 的已配置 category 与 Oracle/Metis/Momus/Explore/Librarian/Multimodal Looker 等只读专家。禁止子代理继续委派、调用任意技能或外部工具。Hephaestus 与 Team Mode 不属于该入口。
- category 任务必须前台执行；最多两个未结束子任务，同一时刻一个写执行者。主控不能在子写任务尚未结束时同时写入。
- 原有字面路径、符号链接、配置文件和精确命令保护同时适用于主控和子代理。读取范围是指定目录，写入范围是 writable_paths。只读模式没有 shell；允许的命令是可信前台命令，不是操作系统文件沙箱。
- 模型请求前核对任务归属、角色/分类和模型，并设置最高 reasoning；不允许静默换模型。实际 assistant 消息也会回读。
- 根会话先结束时继续等待子会话；子结果产生后，还要等主控完成结果整理。子错误不会被主控的成功措辞盖过。
- cancel 终止整棵所属任务树，再关闭专属 OpenCode 服务。只有停止确认后才释放文件所有权。RPC 等待中断不自动取消执行。

每个任务独占一个 runner 与私有 loopback OpenCode 服务。`finished=false` 包括未知执行状态，仍持有任务槽。`completed` 是执行结束，验收始终由 Codex 完成。结果的 sessions 列出根/子会话、role/category、模型、最高推理档、状态和错误；完整证据位于任务目录。回执保留根/子角色的 `finish_reasons` 和逐消息 token 数据（缺失为 `null`）；长度截断或无文本/工具产物返回 `needs_attention`，不自动换模型或推理档。

MCP 启动时读取 runner/guard，每轮派发前保存到该轮任务目录，运行和恢复均使用这份文件，随任务证据保留。插件缓存被清理不会删除在途执行文件；旧连接须重新加载插件才能获得此修复。恢复只在 `not_sent`、无 session/服务回执且日志明确证明 runner 入口缺失时收口为失败；证据不足或已尝试发送仍保留未知状态。

followup 保留原会话、权限和模型映射。若 profile 已变更，会拒绝在旧任务上静默应用。0.2 旧任务可查询/取消，不改写其历史；继续开发请在确认旧执行停止、审阅已有修改后开始新的 profile 任务。

## 配置与安装边界

插件不会修改日常 OpenCode/OMO 配置。先将样例 profile 合并到用户配置并安装新版插件，才能日常使用新功能；仅修改源码不改变已安装缓存。

可选环境变量：

| 变量 | 用途 |
|---|---|
| OPENCODE_WORKER_BIN | OpenCode 路径，默认 ~/.opencode/bin/opencode |
| OPENCODE_WORKER_NODE | Node 可执行文件 |
| OPENCODE_WORKER_STATE_DIR | 插件任务数据目录 |
| OPENCODE_WORKER_OMO_CONFIG | profile 读取文件，默认 ~/.omo/omo.jsonc；该配置也必须被原生 OMO 加载 |
| OPENCODE_WORKER_AGENT | 显式 Sisyphus 的完整显示名；不做短名回退 |

认证由 OpenCode 管理，不在源码或回执中存储密钥。继承已有代理网络环境，私有 API 始终直连。status 只检查依赖、profile 和历史验证，不声称知道账户实时剩余额度。

## 开发验证

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run test:run
npm run test:tree
OPENCODE_WORKER_LIFECYCLE_TEST=1 node --import tsx --test tests/lifecycle.test.ts
```

真实验收只使用临时目录合成文件并消耗 Go 额度：

```sh
OPENCODE_WORKER_LIVE_TEST=1 npm run test:omo
```

测试请求观察器仅用于验收，检查请求/响应模型及最高 reasoning，不记录密钥或请求头，不作为生产运行的额外代理。开发验证不自动授权安装、提交、推送或发布。

默认 DeepSeek 模型使用精确 ID `opencode-go/deepseek-v4.1-flash`，推理档为 `max`。`deepseek-flash` 是 family 名称，不能作为当前 Go 模型 ID；不得改用 V4 替代 V4.1。

Worker 启动的临时运行环境会禁用继承的 MCP 服务，避免范围外资源工具被暴露给子任务；不会改写全局 MCP 配置。
