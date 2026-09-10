# OMO 混合 Worker 开发验收

后续状态：已按新授权完成安装，见 [安装验收](2026-09-10-omo-installation-acceptance.md)。下文保留开发阶段的原始边界。

2026-09-10。已完成独立 OpenCode Worker 0.3.0 源码开发、真实模型验证与源码回写。当前已安装的 0.2 插件、日常 OMO/OpenCode 配置没有更新；本记录不代表安装或发布完成。

## 交付

源码位于 `/Users/ethan/plugins/opencode-worker`，配置合并样例为该目录的 `config/omo-profile.jsonc`。一个入口保留 run/status/start/wait/followup/cancel，通过完整 OMO profile 选择角色和分类模型。DeepSeek V4.1 Flash 在当前 Go 接口的模型 ID 为 `deepseek-flash`，使用 `max`；Muse Spark 1.3 Contributor 使用 `xhigh`。运行前核对 Provider 的最高推理档，请求前检查角色/模型，结果回读实际 assistant 身份。

允许一层直接子任务、最多两个未结束子任务、只读专家和串行分类任务。主控与子任务共用文件及命令范围，并互斥写入；禁止嵌套委派、任意技能、外部工具及静默 fallback。子任务结束后继续等待主控整理结果；取消覆盖所属任务树和专属服务。单模型模式使用同一配置的主控模型，并禁止委派。旧 0.2 任务可查询或取消，不能在 followup 中静默切换到新路由。

仓库内同步了路由 Skill、中英文 README 和 CHANGELOG。安装器登记前版 Skill 摘要，隔离升级验证保留 Luna Medium 启用、Luna Max 禁用的各自状态。既有安装器修复保留。

## 验证结果

开发运行基线：OpenCode 1.18.29、OMO 4.19.4；调用开发目录的实际 MCP 构建产物，仅使用临时合成文件。真实请求观察器只用于测试，记录模型、推理档、响应模型及 usage，不记录请求头或密钥，不是生产路由的一部分。

| 验证 | 结果 |
|---|---|
| DeepSeek 主控 → Muse Explore 读取 → 主控复述随机标记 | 通过，避免仅凭子任务结束提前报完成 |
| quick → Muse Junior 修改归一化逻辑并测试 | 通过 |
| deep → DeepSeek Junior 实现区间合并并测试 | 通过 |
| Oracle → DeepSeek 只读审查 | 通过 |
| 子任务实际尝试未授权文件写入 | 被拒绝，任务 needs_attention，无越界文件 |
| 子任务 shell 已运行后取消整树 | cancelled；等待超过脚本延迟后无 late.txt |
| 请求/响应身份与最高推理档 | 真实请求符合 DeepSeek max / Muse xhigh，响应模型一致 |
| 全局配置前后对比 | 三组真实验收均未改变配置 |
| TypeScript、构建、单元测试 | 通过；21 项通过，普通套件中 1 项生命周期测试跳过 |
| 独立生命周期测试 | 已单独通过，含超时与孤儿恢复 |
| 最终 MCP run 合约与任务树集成回归 | 通过 |
| 插件 manifest、两份 Skill 校验、diff whitespace | 通过 |
| 安装器隔离 HOME 回归 | 35 组通过；前版 Skill 升级额外通过 |

开发期间发现并修复了子任务完成先于主控整理、原生权限序列化错误及无关工具可见性问题。未成功的早期试验不计入通过证据。最终一次沙箱内 MCP 回归因本机监听 EPERM 在执行前失败；允许 loopback 后重跑通过。

## 证据与边界

可携带的脱敏摘要及本次回写 33 个文件的 SHA-256 见 [JSON 证据](2026-09-10-omo-development-evidence.json)。原始验收位于：

- `/private/tmp/ocw-omo-live-HwTYLJ/acceptance.json`：reader。
- `/private/tmp/ocw-omo-live-vCuCsO/acceptance.json`：quick、deep、oracle。
- `/private/tmp/ocw-tree-safety-snNvFa/acceptance.json`：越界与取消。
- `/private/tmp/ocw-run-contract-fGAdzD`、`/private/tmp/ocw-tree-integration-r3Y4aB`：最终集成回归。
- `/private/tmp/ocw-lifecycle-7UcnTd`：独立生命周期回归。

源码回写前核对全部原始摘要并备份，回写后核对每个变更摘要；备份在 `/var/folders/14/5s225v_91m7dfmkt32zcl6v40000gq/T/ocw-omo-dev-i5xuwwgc/source-backup`。临时目录可能被系统清理，因此核心摘要保存在本仓库。

上述测试证明有界合成任务的路由和保护行为，不证明模型在所有项目上的相对质量或成本优势。精确白名单 shell 命令仍须可信，工具保护不是操作系统沙箱。未来日常使用还需单独合并 profile、升级已安装插件并在新任务重新发现工具；本次未执行安装、全局配置写入、提交、推送或发布。
