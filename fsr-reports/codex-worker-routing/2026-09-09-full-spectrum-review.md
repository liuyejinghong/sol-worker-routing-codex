# Codex Worker Routing 仓库审计

状态：审计交付完成；ChatGPT 独立复核返回 DONE（c2c_a941，iteration 2）。两项 P2 均为 OPEN，未实施修复。

## 结论

当前代码存在两项已复现的 P2 缺陷，均集中在安装器。正常首次安装、已安装状态保留、历史升级样本及升级器的正常和拒绝路径可用；不能据此宣称所有受支持环境的开关和中断恢复正常。没有发现需要重写整个工作流的证据。

本次仅新增审计材料，没有修改被审计实现，没有安装到真实用户配置，没有在被审计仓库创建提交或向外部远端推送。更新器控制流测试在临时 Git fixture 内创建了合成提交；这偏离了 ChatGPT 第一轮 PLAN 的“不创建新提交”要求，临时 fixture 与被审计仓库隔离。

## 审计边界与依据

- 仓库：liuyejinghong/sol-worker-routing-codex；展示名 Codex Worker Routing；版本 0.15.0。
- 审计提交：`375ce3e6441ac38889f1d0353887a0d289d62ea5`。开始时本地干净，GitHub HEAD/main 与本地一致。
- 日期：2026-09-09。
- full-spectrum-review 0.12.0，技能仓库 revision `3426e76ad6ce418ec22476e1864c5996e078443c`。
- 执行：按安装/升级、路由/配置、文档/证据顺序审计；ChatGPT 负责独立规划复核，Codex 负责源码核对和复现。
- Domain Pack：deploy v3，仅采用本项目实际具有的迁移、回滚和部分完成语义；无远程舰队、canary 或交易系统，不套用相应要求。trading v5 不适用。
- 规则依据：用户授权与 AGENTS.md 的安装合同、README 的用户承诺；实现是核验对象，历史记录仅证明当时观察。此前未发现本仓库审计账本。
- 环境：macOS 自带 GNU Bash 3.2.57；额外从 GNU 官方源码在临时目录构建 Bash 5.2.37，没有安装到系统。`bash-identity.txt` 保存测试后的二进制版本回读；`bash5-provenance.json` 记录原调用路径、参数和隔离方式。精确解释器与较早调用的关联来自执行者记录，矩阵未逐次保留版本原始输出；不把后补版本回读冒充当时每次调用的日志。

## 覆盖情况

| 范围 | 深度/状态 | 已取得的证据与限制 |
|---|---|---|
| 两条 Luna profile 与 Skill 的安装、重复执行 | deep / COMPLETE | 两条 profile TOML 可解析；当前四种 enabled/disabled 组合重复安装保留内容和状态 |
| enable/disable：两条 lane 与 all | deep / COMPLETE | Bash 5.2 的 12 个起始状态×动作×选择场景；六个实际转换全部失败，六个同状态操作通过 |
| 冲突预检 | deep / COMPLETE | 当前安装分别拒绝 unknown、dual、symlink、FIFO、missing；状态子命令的全局冲突边界另列观察 |
| 历史升级 | sampled / PARTIAL | 14 个历史 revision，各全启用/全禁用，共 28 次成功；未穷举所有历史 profile 版本与混合状态排列，v0.11 未单独构造 |
| 普通失败、TERM、SIGKILL 恢复 | deep / COMPLETE | 首次安装与禁用转换各注入首个 rename 后失败/TERM/KILL；前两者回滚通过，KILL 重跑失败 |
| HUP、INT 和其他每个中断点 | sampled / PARTIAL | 源码共用退出处理；尚未逐信号、逐替换点动态穷举，不把 TERM 结果当成所有信号的运行证明 |
| 自定义 CODEX_HOME、无关内容保留 | deep / COMPLETE | 含空格目录下安装成功；合成 Provider/config、凭据占位和模型目录标记字节未变；未读取或修改真实凭据 |
| scripts/update.sh | deep / PARTIAL | 9 个隔离 Git fixture 场景：相同提交、快进、dirty、无关 untracked、ahead、diverged、detached、无上游、安装器失败；fixture 使用记录调用并返回指定退出码的替身安装器，只验证更新控制流和退出码传递。另补 1 个真实安装器集成：隔离 clone 从 bfbafeb 快进到本次 SHA，安装 Skill 字节与当前源一致；尚未验证 fetch 失败、阻挡快进的 untracked、staged dirty 场景 |
| 两条 Worker、路由、Personalization | deep / COMPLETE | 2/2 profile 与 Skill/双语模板核对：主代理决策、明确所有权、禁止继续委派和独立外部授权边界一致；不以提示词替代宿主权限 |
| README 中英文与 CHANGELOG | deep / COMPLETE | 当前安装范围、外部插件单独分发、Contributor 数据条件与历史证据限定均有明确说明 |
| benchmark 源码与汇总 | sampled / PARTIAL | Python AST 解析；TraceLab CSV 21 行与 JSON 零差异，输入 token 分解相等；本地 gzip fixture 验证聚合、分位数、抽样、空输入及校验不匹配标记；未重新下载全量轨迹或重跑退役模型 |
| 历史设计文档与 PNG 资产 | sampled / PARTIAL | 逐文件覆盖清单见 file-coverage.csv；旧设计文档未逐段重新审计，PNG 未独立视觉核验，不将历史存档视为当前规范 |
| 独立 OpenCode 插件的当前运行 | none / NOT_COVERED | 本仓库不包含完整插件源码，仅有方案、补丁与历史证据；本次授权不是外部模型执行测试，不能给插件当前运行背书 |
| 当前 Luna 模型路由 | none / NOT_COVERED | 本次是源码审计，未改变真实 lane 状态或创建路由探针；磁盘配置不代表当前账号 entitlement |

## 问题概览

P0：0；P1：0；P2：2；P3：0。

| ID | 优先级 | 置信度 | 状态 | 类型 | 问题 |
|---|---|---|---|---|---|
| FSR-001 | P2 | High | OPEN | Defect | 状态切换在删除旧状态前验证其不存在，Bash 5.2 下失败并回滚 |
| FSR-002 | P2 | High | OPEN | Reliability | SIGKILL 留下的中间状态被重跑预检拒绝，未兑现重跑恢复约定 |

## FSR-001：现代 Bash 下无法实际切换 lane

Evidence：`scripts/install.sh:1193`、`:1205`、`:1208`；`bash5-results.json`、`bash5-matrix.json`。暴露范围为用户主动运行安装器的状态操作；机制由隔离实验直接确认，现场发生频率未知。

从完整启用的标准安装执行 `--disable-lane luna_worker`：安装器先写入 `.toml.disabled`，随后第 1205 行要求原 `.toml` 不存在，但删除原文件的循环在第 1208 行之后才执行。GNU Bash 5.2.37 在这条失败判断处依照 `set -e` 退出，触发回滚；最终 lane 仍启用。反方向 enable 及 `all` 同样失败。

12 个矩阵场景中，六个真正改变状态的调用均退出 1；六个不改变状态的调用退出 0。macOS Bash 3.2.57 的同一流程可完成，说明仅测试默认 macOS shell 会掩盖问题。未将 GNU Bash 5.2 的结果外推成 Windows 原生环境实测。

建议先完成事务内的旧状态移除，再验证“一条 lane 恰好一种状态”；继续保留旧状态备份和失败回滚。修复应验证两个 Bash 版本下的双向转换、all、同状态重复调用，以及删除失败后的回滚。不要为此替换整套安装器。

## FSR-002：强制中断后无法通过重跑恢复

Evidence：`scripts/install.sh:935`、`:1181`、`:1208`，`installer_detect_lane_state` 对双状态的拒绝；AGENTS.md 的 power loss/SIGKILL 重跑合同；`probe-results.json` 中 `interruption-*-KILL`。

本次用临时 PATH 包装器在真实 `/bin/mv` 已完成首次 rename 后向安装器父进程发送 SIGKILL，没有修改被审计脚本。首次安装留下部分 profile、尚无 Skill；重跑返回 2，报“managed profiles exist but the current Skill is missing”。禁用转换留下 `.toml` 和 `.toml.disabled`，重跑同一命令返回 2，报 `conflict-dual`。隐藏备份存在，但后续运行不读取能证明本次事务意图的恢复状态。

结果没有证明用户内容遭覆盖或丢失；当前拒绝未知中间态本身是安全行为。缺陷是脚本会产生合同所称可恢复的状态，却没有足够持久证据区分它与人为冲突，因此用户必须手动处理。普通命令失败和 TERM 均恢复原文件快照，不能代替 SIGKILL 的证明。

建议明确选择：实现能识别“本安装器已知中断”的最小恢复证据，或收窄文档为“保留完整文件并停止，需人工恢复”。若仍承诺自动重跑，必须保留未知/双状态拒绝原则，不可简单放宽预检。该方向涉及现有安装合同，后续修复前需明确目标。

## 其他观察与保留设计

- 状态子命令只检查所选 lane；另一条 lane、Skill 或退役 profile 有未知内容时，仍能修改所选 lane，未知文件字节保留不动。`state-conflicts.json` 已复现。AGENTS.md 的字面表述比这一行为更宽。由于选择性操作不覆盖未知文件，暂不把它夸大为数据损坏缺陷；后续应明确“全包拒绝”还是“所选路径拒绝”，使合同与实现一致。
- 保留按内容摘要识别历史版本、未知内容拒绝、两条 lane 独立状态、暂存与普通失败回滚。这些分别服务于明确的升级和数据完整性要求，不能仅因脚本较长而删除。
- 源码显示升级器调用既有安装器；9 个替身实验验证控制流和退出码透传，追加的隔离 clone 实验验证了一次真实快进与安装集成（updater-integration.json），两类证据分开计数。不需要增加第二套迁移流程。快进源码完成后安装失败可能留下“源码更新、安装未完成”，当前退出码正确，未发现其声称跨 Git 与配置事务。
- README 明确外部插件不在本仓库分发，历史验证也没有宣称已验证数小时连续执行或精确等待计费。保持这些限制。
- 当前官方 [OpenCode Go 文档](https://opencode.ai/docs/go/) 支持 README 的 $10/月与 Muse Spark 1.3 Contributor 可用性说明；[Meta 模型介绍](https://research.meta.ai/blog/introducing-muse-spark-1-3) 已打开核验。价格、模型列表和数据条款会变化，本审计不是长期可用性承诺。
- benchmark 汇总一致不等于原始轨迹独立复算，也不是当前 Worker 质量或真实账单的证明。

## 处理顺序

1. 先修 FSR-001 的事务校验顺序，恢复正常开关功能。
2. 再决定 FSR-002 的恢复合同与最小机制；不要以“接受所有双状态”作为修复。
3. 澄清状态子命令的冲突范围，并用实际约定验证。

审计辅助脚本、JSON 及命令输出是证据材料，不是提交到产品的测试框架。当前报告不授予修复、安装、发布或 GitHub 写入权限。

## 复核记录

ChatGPT 在同一已绑定对话中独立读取源码、执行记录和证据，确认 FSR-001/002 成立且 P2 合理。第一轮复核要求补充 Bash 版本证据边界、说明替身安装器覆盖范围、限定“无提交”的仓库范围；上述表述已修正。真实安装器的一次追加集成另见 updater-integration.json，不与九项替身测试混算。最终复核返回 DONE，确认三项交付修正满足、两项 P2/High/OPEN 保留；无需进一步修正。复核对话：https://chatgpt.com/g/g-p-6aa0d9eb30c08191b2a6e5a5b1a71211-codex-workflow/c/6aa0da8a-0348-83ec-a06d-2f769f316eb6 。收尾再次通过 git ls-remote 确认 GitHub HEAD/main 与本次完整 SHA 一致；git diff 为空，仅 fsr-reports/ 未跟踪。
