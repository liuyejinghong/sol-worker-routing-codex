# Worker 复盘改进：本地实现与验证

日期：2026-09-11。状态：工作流 v0.16.2 / 插件 0.3.2 补丁交付；本机安装结果见末节。

输入为 AItrading 的《外部 Worker 分工与验收复盘》。本次修改工作流行为 owner，不修改 QF-01，也不启动真实外部任务。

## 分工和验收

- 原路由表允许把已确定的功能开发包交给 Worker；现在对原生 Luna 和外部 Worker 统一默认：主 Agent 直接实现资金、权限、事务、状态机、恢复和核心接口。独立目录和 READY 包不足以证明语义独立。
- Worker 承接接口、例外和预期已冻结的外围任务。窄纯函数、固定预期测试和机械映射仍可委派；没有合适任务时主 Agent 直接做。
- 开发包要求独立输入/预期、业务或来源依据、实际入口、精确命令和停止条件。实现者不能改写预期以迎合实现；预期有争议时回到业务事实。
- 顺序和持久化问题验证公共入口与真实存储；故障测试检查断点中间事实，再核对恢复结果和重复副作用。自测数量和换模型重跑不构成独立证据。
- 同一根因再次失败或需要重建核心架构时，主 Agent 默认接管核心；先确认旧任务及子任务停止，保留有效代码。
- 沿用现有记录统计准备、等待、主 Agent 介入、返工和整合；代码、需求、工具问题分开归因。未知用量不记零，单项目样本不推导模型排名。

行为 owner 为 `skills/sol-worker-routing/SKILL.md`、`agents/luna-worker.toml` 和插件 Skill。README 同步摘要，未追加全局指令或第二套协议。安装器登记本次改动前的两个文件摘要，使既有启用/停用安装可升级。

## 插件修复

**截断与空产物。** 原 `terminalState` 会将 `finish=length`、无文本与工具产物的消息判为 `completed`。现在长度截断或无文本/工具产物返回 `needs_attention`。根/子会话回执保留 `finish_reasons`、文本、工具与 token 数据；缺失 token 为 `null`。文件差异继续由原有快照记录，`acceptance` 保持 `pending`。有工具但没有最终文本不自动判失败，仍需主 Agent 检查具体产物。

**运行文件生命周期。** 原 MCP 在派发和恢复时引用插件缓存的相对 runner 路径。现在 MCP 建立连接前读取 runner/guard 字节；每轮派发前保存到该轮任务目录，运行和恢复使用保留副本，子进程 cwd 明确设为工作目录。缓存目录消失后旧连接仍能派发和恢复。副本随任务证据保留，不新增后台清理程序。

**未发送恢复。** 原无服务回执时统一保留未知。现在只有 `not_sent`、无 session、无服务回执，并且 runner 日志明确记录 Node 找不到 runner 入口，才收口为 `failed`。`attempted` 或无法解释的退出仍是 `unknown` 且未结束；恢复沿原任务身份和权限执行，不手工改真实任务状态。旧任务没有保留 runner 时，当前连接可提供恢复入口；已有副本继续使用原副本。

## 验证

全部为本地测试；集成测试使用 fake OpenCode 的真实 HTTP/MCP 入口，不连接 Provider、不消费 Go 额度。

| 检查 | 结果与覆盖 |
|---|---|
| TypeScript、构建 | `npm run check`、`npm run build` 通过 |
| 单元测试 | `npm test`：22 项通过，1 项需要显式启用的生命周期测试默认跳过；覆盖截断、空输出、权限拒绝、模型映射、单写者等 |
| 子任务集成 | `npm run test:tree` 通过；子任务截断不能作为正常完成，错误模型拒绝，待运行子任务保留所有权，整树取消 |
| 生命周期 | 显式启用的 `tests/lifecycle.test.ts` 单独通过；删除临时插件缓存后续作、进程终止后恢复、根截断/空输出、未发送与未知分支 |
| 安装回归 | `python3 tests/test_install.py`，临时 HOME；既有 34 组加上一版 Max 启用/停用升级两组 |
| Skill 格式 | 两个修改后的 Skill 均通过 quick_validate |

生命周期恢复测试的已发送孤儿来自实际运行的模拟服务：等到 running 后 SIGKILL runner，再按原身份取消恢复。未发送测试使用临时任务记录和真实 Node 入口缺失日志；未知分支使用明确标注的状态 fixture，并验证新写者被拒绝。未模拟真实 Provider 丢回包，不能据此宣称真实模型恢复验收完成。

初次集成测试因沙箱禁止监听 127.0.0.1 失败；放行本地监听后通过。这属于执行环境限制。

## 生效边界

未更换 provider、模型版本或推理档，未扩大 shell 权限，未更新 App Personalization。工作流升为 0.16.2，插件升为 0.3.2，均为补丁版本。

本机安装及新建 MCP 连接的版本读回已执行；真实模型路由未重测。现有旧 MCP 连接不能被源码修改追溯修复，需要新开任务加载；依赖和版本读回不等于模型路由验收。保留副本随任务证据占用磁盘，清理已结束任务证据时可一并清理，不应删除仍在途任务目录。


## 本机安装记录

用户随后明确授权安装、提交和发布。通过仓库安装器更新 `/Users/ethan/.codex/agents/luna-worker.toml` 和 `/Users/ethan/.agents/skills/sol-worker-routing/SKILL.md`，Luna Max 保持 enabled；八个退役 Medium/Spark/DeepSeek 路径原本不存在，安装后仍不存在。

个人市场源 `/Users/ethan/plugins/opencode-worker` 经上一版内容核对后同步。使用 App 自带兼容 CLI 安装 `opencode-worker@personal`，版本 `0.3.2+codex.20260911064656`，缓存路径 `/Users/ethan/.codex/plugins/cache/personal/opencode-worker/0.3.2+codex.20260911064656`。市场源、缓存与仓库文件逐字一致，新 MCP 连接的 status 返回 plugin_version=0.3.2、available=true、原任务 completed/finished=true；没有启动新的外部模型任务。

Codex config.toml、auth.json 的安装前后摘要一致，Provider 定义及凭据引用一致。models_cache.json 的摘要在安装窗口内改变：未保留之前内容，无法断言变更来源或逐字段差异，不将其写成“模型目录逐字未变”。本次命令没有手工编辑或删除模型目录。

App Personalization 未修改；personalization.md 不会自动激活，如需应用其中通用偏好，应在 Settings → Personalization → Custom Instructions 替换旧工作流块并保留其他偏好，不追加重复块。Luna 未从关闭切到开启，本轮不重复路由探针；新任务加载后方可使用新 profile/Skill。
