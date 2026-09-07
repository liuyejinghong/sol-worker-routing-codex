# OpenCode 插件接入：本机验证记录

日期：2026-09-07。用途：为 [实施方案](2026-09-07-opencode-worker-plugin-plan.md) 提供真实运行依据。

## 结论

本机 OpenCode + OMO + Go Muse Contributor 已完成文件读取、实际写入、同会话代码修复、固定 shell 测试和主代理独立验收。运行中的会话可通过 API 取消。

发现需要进入插件实现的具体问题：角色短名回退、工具失败但 CLI 退出码仍为 0、异步提交与 idle 的时间差、过早 abort 未阻止随后启动，以及 Go 上游限流。在本记录对应的规划测试阶段，插件尚未实现或安装；后续交付见 [开发验收记录](2026-09-07-opencode-worker-plugin-development-acceptance.md)。本记录本身不是 Codex MCP 插件端到端验收，也不是 Muse 与 Luna 的性能评测。

## 环境与授权

| 项目 | 实际值 |
|---|---|
| OpenCode CLI | 1.18.29，`/Users/ethan/.opencode/bin/opencode` |
| OMO 已安装包 | `oh-my-openagent` 4.19.4 |
| Codex CLI | 0.149.0 |
| Provider / 模型 | `opencode-go` / `muse-spark-1.3-contributor` |
| OMO 实际主角色 | `Sisyphus - ultraworker` |
| 测试目录 | `/private/tmp/codex-opencode-probe-15k4_xhl` |
| 临时服务 | `127.0.0.1:43197`，本次测试专用 |
| CLI 初始会话 | `ses_f85bab954ffeg6SZnYhU4DfBQs` |
| API 成功执行会话 | `ses_f85b6297bffejKA8h6sqlDCyE9` |

用户已明确允许测试本机 OpenCode，并选择 Contributor。本轮只向该模型提供临时合成数据与几行测试代码。没有读取认证文件、打印密钥、提交代码、推送或安装插件。

默认 Codex 沙箱最初阻止 OpenCode 创建自己的日志文件，故以工具审批流程申请运行本机程序和访问本机服务。审批通过后继续。模型工具权限另行限定；没有使用 `--auto`。OpenCode 本身正常产生了日志、会话数据，以及临时目录下的 `.omo` 和 Python `__pycache__` 等运行产物。

## 实测顺序

### 1. CLI：真实读取通过，写入受阻

输入文件包含随机标记与 `17,23,41`。要求模型读文件后写 `result.json`，不能只在回复里给答案。

初次指定 `--agent sisyphus`，stderr 报告该角色不存在并回退到默认角色。模型实际调用 read，随后 write 被编辑路径规则拒绝。工具事件中明确有 `status=error`，模型最后报告阻塞；CLI 退出码仍为 0。耗时约 33.03 秒。

使用 `/agent` 后发现实际角色名称为 `Sisyphus - ultraworker`。以正确名称续接同一会话，未再出现角色回退告警，但新增相对文件名规则后写入仍被拒绝；耗时约 25.91 秒、CLI 退出码仍为 0。

这两次是失败证据，不记为成功写入。证明仅检查进程退出或最终 stop 事件不够。

### 2. API：正确身份下完成读写

通过新建会话和 `prompt_async` 提交，查询消息与状态回收结果。为隔离模型/工具链问题，此步会话级允许 edit，禁止外部目录和非必要工具，不用于证明窄路径限制正确。

实际 assistant 消息记录的身份是：

```text
agent      = Sisyphus - ultraworker
providerID = opencode-go
modelID    = muse-spark-1.3-contributor
```

工具 read、write 都 completed。主代理读取真实文件并断言：随机标记精确复制、sum=81、phase=1。该轮耗时约 21.53 秒。状态曾呈现 idle → busy → idle，说明异步提交后首次 idle 不能当完成。

### 3. 同会话返工、代码修复、测试

第二轮仍使用同一 API 会话，要求：

- 将 `result.json` phase 改成 2，保留 marker 和 sum。
- 修复 `normalize_tags`：去除首尾空白、转小写、丢弃空串、按首次出现顺序去重。
- 只读 `check.py`，执行且只执行指定 shell 命令 `python3 check.py`。

模型真实读取 3 个文件、执行两次 edit、一次 bash。shell 工具报告 `NORMALIZE_CHECK_PASS`；主代理随后用独立进程复跑固定测试，退出码 0，并再次核对 result.json 的所有字段。

该轮耗时约 26.33 秒。过程中捕获两段 retry 状态，消息为 Go 上游 `rate_limit_exceeded`。最终恢复并完成。本轮没有读取账户额度，不能判断该限流是订阅额度耗尽、上游并发限额还是其他服务限制。

测试断言覆盖：大小写和空白归一、去重后顺序、空字符串与空列表。它是接入用的微型代码任务，不代表大项目实现能力。

### 4. 取消：必须考虑提交竞态

第一次在 `prompt_async` 返回后立即取消：取消前未查询到该会话状态，abort 返回 true，1 秒后却查询到 busy。测试脚本因此以断言失败退出；此前已通过的文件与代码验收仍然有效。

随后补测等待 busy 后再取消：

```text
before_abort = busy
abort_response = true
after = idle
stable_after_2s = idle
assistant error = MessageAbortedError / Aborted
```

由此只能认定运行中取消路径通过。提交与取消竞态还需要插件自身防护，不能以 abort 返回 true 就宣称取消完成。

### 5. 配置重载与权限路径

测试期间调用 `/instance/dispose` 重新加载临时配置，随后一次 `/agent` 查询只出现原生 primary 角色；干净重启本次测试服务后恢复 OMO 角色。根因未深入定位，首版不要依赖 dispose 热重载来保持 OMO 身份，应重启自有服务后重新发现并核对角色。

`/path` 返回测试 directory 为临时目录，worktree 却为 `/`（该目录不是 Git 仓库）。因此绝对路径、相对 directory 和相对 worktree 不能混用。

随后创建独立权限测试会话 `ses_f85b248ceffeuCov24xGZaS23Z`：默认拒绝 edit，只为 `**/allowed.txt` 添加会话级允许规则。模型两次真实调用 write，写 allowed.txt 成功，写 denied.txt 返回权限错误。主代理验证 allowed.txt 精确为 `ALLOWED_OK`，denied.txt 不存在。该轮耗时约 29.36 秒。

工具返回标题 `private/tmp/.../allowed.txt`，与按 worktree 相对路径匹配的解释一致；这是运行证据支持的推断，未进行源码层确认。通配规则只用于定位匹配机制，正式插件应生成精确范围并在 Git worktree 重测。

## 正式实现仍需验证

- 真正的 Codex 插件发现、MCP 调用、打包安装和新任务加载。
- 在真实 Git worktree 内的文件范围规则、绝对/相对路径、只读任务和超范围 shell 行为。
- 提交阶段的取消竞态、断连或进程重启后的对账、重复 request_id 不重复写入。
- 待审批工具和模型提问的 needs_attention 行为。
- 限流终止、认证错误及无法获取配额时的准确报告。
- OMO 子代理被禁用的实际效果；本轮未出现子代理工具调用，但这不证明所有插件注入的委派工具都已被机制阻止。
- 大型项目的实际收益及与 Luna 的同任务比较。

## 证据与复核

保留一份仓库内的精简 [JSON 证据](2026-09-07-opencode-worker-plugin-evidence.json)，包含结果摘要、状态与独立验证结果。临时目录保留 API 消息、CLI 事件、测试脚本和产物以供本机复核；临时文件可能被系统清理，不能作为唯一长期证据。

原始消息没有整体复制进仓库，不包含认证信息。耗时是本次调用墙钟时间，混合了模型服务、工具和轮询开销；不能用于宣称模型吞吐或订阅实际扣费。

收尾已确认三个测试会话均为 idle，停止测试专用服务 PID 14214，并确认端口 43197 不再监听。临时测试材料保留，未清理用户日常 OpenCode 数据。最终工作区只新增本方案、测试记录和精简 JSON 证据三个文件。
