# OpenCode Worker 插件：开发与验收

日期：2026-09-07。实现基线：插件 0.1.0，已安装缓存版本 `0.1.0+codex.20260907061741`；工作流源码版本为 0.14.0。GitHub 源码同步已获用户授权；本次不创建 tag 或 GitHub Release。

## 当前交付

独立插件源码位于 `/Users/ethan/plugins/opencode-worker`，通过个人 marketplace 安装并启用。插件没有 Web 管理页面。现有工作流仓库只增加可选路由和相关文档，Luna 原生角色没有修改。

插件包含 `status / start / wait / followup / cancel` 五个本地 STDIO MCP 工具。模型固定为 `opencode-go/muse-spark-1.3-contributor`，通过本机 OpenCode + OMO 执行任务。Codex 负责判断、交接、整合和最终验收。

## 相对方案的实现细化

每轮任务使用独立后台 runner 和专属 OpenCode 服务；MCP 客户端断开后 runner 继续执行并落实时间上限。每轮结束关闭专属服务；返工时重新启动服务并恢复同一个 OpenCode 会话。这处理了早期实测中异步提交尚未进入 busy 就收到取消的竞态，不需要管理页面或常驻调度平台。

任务记录使用本地 JSON，跨 MCP 进程的提交临界区使用 `proper-lockfile`。同一 request_id 的相同请求返回已有任务，不重复启动；不同内容复用 ID 会被拒绝。首版只有一个活动任务槽。

OpenCode 会话权限与一个任务级工具前置检查共同落实路径和精确命令限制。前置检查验证实际路径与符号链接目标，禁止模型通过其他工具委派、使用 Skill/Web/MCP 或修改执行配置。它不把 shell 变成操作系统沙箱，明确授权的命令仍需是可信的前台检查命令。

模型/API 错误、工具未解决的失败和普通完成分别报告。已失败但随后对同一文件/命令成功的操作保留为证据，不永久阻塞正常完成。`completed` 仍然表示执行结束，验收为 pending。

## 验收结果

| 检查 | 结果 | 实际证据 |
|---|---|---|
| TypeScript 类型检查 | 通过 | `npm run check` |
| 本地契约测试 | 9 项通过 | 权限路径、精确命令、符号链接、重复提交、完成判定和推理正文排除 |
| 模拟 MCP 生命周期 | 通过 | 异步 idle、同会话返工、重复请求、取消、模型报错、错误身份、超时、runner 崩溃恢复及恢复后新任务 |
| 真实 MCP 读写与测试 | 通过 | 标准 MCP 客户端调用插件；真实读写、代码修复、独立复跑测试 |
| 同会话返工 | 通过 | session_id 不变，result.txt 从 phase=1 改为 phase=2 |
| 禁止路径 | 通过 | denied.txt 写入被拒绝，文件没有生成；插件返回 needs_attention |
| 客户端重连 | 通过 | MCP 客户端断开再连接后能收回原任务结果 |
| 两种取消时机 | 通过 | 提交后立即取消、运行中取消均确认停止 |
| 真实 shell 取消 | 通过 | 等待中的 Python 命令取消后，13 秒复核没有发生预定的延迟写入 |
| 工作流安装器升级夹具 | 通过 | 保留 Medium enabled、Max disabled；Skill 更新，模拟 Provider 配置不变 |
| 插件与 Skill 格式校验 | 通过 | 官方 plugin/skill 校验器；安装器 Bash 语法与 Git diff 检查 |
| 个人插件安装 | 通过 | CLI 安装记录 enabled，缓存文件与独立源码核对 |
| Codex 实际调用 | 通过 | App 自带 Codex 0.153.4 实际发现插件，调用 status/start/wait，读回完整合成标记 |

默认 `npm test` 运行 9 项契约测试；需要本机 TCP 的生命周期测试默认跳过，已用 `OPENCODE_WORKER_LIFECYCLE_TEST=1` 单独完整运行。生命周期测试没有调用真实模型。真实测试仅使用合成文件，没有把业务项目代码外发。

## 发现并处理的问题

1. **角色名**：实际角色为 `Sisyphus - ultraworker`。插件从运行时发现，不使用 CLI 短名回退。
2. **权限匹配基准**：OpenCode write 工具使用相对 worktree 的路径；实现据此生成规则，另以实际路径检查阻止越界。
3. **历史工具错误误报**：首次真实插件测试中，读未创建文件失败、随后创建成功，被过度标为 needs_attention。已修复并添加回归测试；失败记录保留。
4. **后台取消**：abort 返回 true 不代表尚未调度的提交已停止。实现记录取消意图并结束专属服务，真实 shell 测试进一步确认没有延迟写入。
5. **客户端版本差异**：Homebrew Codex 0.149.0 无法解析当前嵌套 context_management 设置，且不支持当前 Astra 模型。插件初次安装仅使用进程级配置覆盖，磁盘设置未变；实际模型验收改用 App 已有的 0.153.4，不升级用户 CLI。
6. **自动审批缺少具体外发证据**：初次 Codex start 被拒绝。补充完整的合成文件内容与父任务授权后，同一插件动作获准；没有降低审批或改走间接执行。
7. **网络环境未继承**：从终端直接运行的 MCP 验收成功，而通过 Codex 插件调用时返回 RegionError。发现宿主终端有代理环境变量，初始插件配置未转发。转发宿主已有变量后，同一 Provider 和模型的实际 Codex 调用通过。只记录变量名称，不记录值，不创建新代理或切换 Provider。App 新任务仍需继承其宿主实际网络环境，不能把变量缺失表示为已验证。

8. **临时端口**：OpenCode 的 `--port 0` 会优先选择 4096。已改为先取得系统临时端口并显式传入；最新生命周期回归和安装后的同会话回归均通过。

## Codex 实际调用与收尾

最终使用 `/Applications/ChatGPT.app/Contents/Resources/codex` 0.153.4 的 ephemeral 会话，保留用户当前 Astra 模型，使用原审批机制和只读验收工作目录。实际工具记录包含成功的 `opencode_worker.status`、`start` 和 `wait`。

- task_id：`c6d4f558-17f2-476b-8827-9b58d6029751`
- 实际身份：`Sisyphus - ultraworker` / `opencode-go` / `muse-spark-1.3-contributor`
- 结果：`completed`、finished=true，合成标记匹配，没有文件修改。
- 最终安装版本额外通过实际 Codex `followup/wait` 回归，保持同一 session，第 2 轮读取正确。该轮使用临时端口 51993，结束后确认没有监听进程。

源码、安装缓存逐文件一致；移除新增插件项后，Codex 配置的所有原有语义值与安装前一致，两条 Luna profile 内容和开关状态、其他 marketplace 条目也一致。原 context_management 配置未被命令行兼容性覆盖写回。

精简证据见 [开发验收 JSON](2026-09-07-opencode-worker-plugin-development-evidence.json)。标准 MCP 测试、异常生命周期测试与实际 Codex 测试各自证明对应层次，不把它们合并成大项目质量或任意宿主环境的保证。

## 工作流安装位置

实际发现：

- `~/.codex/skills/sol-worker-routing/SKILL.md` 存在，是已知历史内容。
- 仓库安装器规定的 `~/.agents/skills/sol-worker-routing/SKILL.md` 不存在。
- 两条 Luna profile 都 enabled，退役角色均 absent。

用户随后确认保留现目录更新。已将 `~/.codex/skills/sol-worker-routing/SKILL.md` 更新为仓库 0.14.0 内容，并核对逐字节一致；旧文件已备份。本次是用户明确授权的现有位置维护，没有迁移目录、创建第二份 Skill 或扩展安装器管理范围。两条 Luna profile 和 Provider 配置保持不变。

## 保留边界

- 没有修改主代理模型、Provider、凭据或 Luna profile；安装前后对无关配置做了语义核对。
- 没有修改 App Personalization；它不会因仓库文件变化自动生效。
- 写入范围快照和 diff 只覆盖交接中的 writable_paths；不能据此宣称审计了任意 shell 对整个文件系统的影响。
- 没有宣称 Muse 普遍优于 Luna；本轮验证接入和控制行为。
- 插件已在用户重启后的当前任务中成功调用 status。新版路由 Skill 已安装；后续新任务加载新版自动路由规则。

## 可复核材料

- 插件说明：`/Users/ethan/plugins/opencode-worker/README.md`
- 真实 MCP 完整测试：`/private/tmp/opencode-worker-live-cunob0/acceptance.json`
- 初次真实测试失败记录：`/private/tmp/opencode-worker-live-TXcgYB/acceptance.json`
- 生命周期测试：`/private/tmp/ocw-lifecycle-3XrI58`
- 真实 shell 取消：`/private/tmp/ocw-shell-cancel-PG19JY/acceptance.json`
- 安装器升级夹具：`/private/tmp/ocw-routing-upgrade-u00gz1cy`
- Codex 插件调用验收：`/private/tmp/codex-opencode-plugin-check`

临时文件可能被系统清理，长期结论以本文与随后保存的精简验收证据为准。原始推理与认证信息不复制到仓库。
