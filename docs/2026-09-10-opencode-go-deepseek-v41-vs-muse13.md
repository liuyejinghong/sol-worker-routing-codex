# OpenCode Go：DeepSeek V4.1 Flash 与 Muse Spark 1.3 的 Worker 选择

2026-09-10 · 面向当前 Codex Worker Routing 工作流的决策备忘录

## 建议

**值得把 DeepSeek V4.1 Flash 列为一条可选外部执行通道的试用候选，暂不替换 Muse，也不为 Peak / Off-Peak 建两条 Worker。** 最有根据的试用方向是前端原型，以及不适合 Contributor 训练条款的任务。若目的只是增加额度或降低现有 Go 工作成本，当前证据不支持为了这个理由扩展 Worker。

价格差异已能确定；通用编码能力的胜负仍不能确定。V4.1 Flash 的早期原型成绩值得关注，但缺少可核验的同环境复杂仓库对照。本轮没有调用这些模型进行付费对照，也没有新增 Worker。

## 1. Peak 与 Off-Peak 是时间价格，不是模型能力档位

OpenCode Go 为 V4.1 Flash 列出一个模型 ID：`deepseek-flash`，配置名为 `opencode-go/deepseek-flash`。公开模型列表也只列出这个 ID，没有独立的 Peak 或 Off-Peak 模型。[Go 模型列表](https://opencode.ai/zen/go/v1/models)

北京时间周一至周五 **09:00–12:00、14:00–18:00 为 Peak**；午间 12:00–14:00、其余夜间时段及周末均为 Off-Peak。两个时段使用同一模型，Peak 的三项 token 费率均为两倍。没有“Peak 更聪明”或“Off-Peak 降级模型”的已核实依据。OpenCode 的公开实现会检查服务器当前时间并选取相应价表，不能通过给 Worker 起名或选择另一个标签锁定低价。[分时判断源码](https://github.com/anomalyco/opencode/blob/859106eb17d5b840475f5e4b78e64c9622f8750e/packages/console/app/src/routes/zen/util/pricing.ts) · [计价调用](https://github.com/anomalyco/opencode/blob/859106eb17d5b840475f5e4b78e64c9622f8750e/packages/console/app/src/routes/zen/util/handler.ts#L1018)

V4.1 的临时测试名称与 Go 正式目录中的别名应分开看。不要把旧 `deepseek-v4-flash`、旧 Pro 或临时 `expires-on-0910` 的资料、评测和额度自动套到新条目。本次获取的 DeepSeek 定价页仍展示旧 0731/0813 型号及旧价，而 Go 文档已经更新；下面采用你实际询问的 Go 价表。[DeepSeek 定价页](https://api-docs.deepseek.com/quick_start/pricing/)

## 2. 在 Go 中，Muse Contributor 的经济性更有优势

美元／每百万 tokens；“月额度”是仅使用该模型时的等效计量额度，不是另外赠送的独立余额。

| Go 条目 | 非缓存输入 | 缓存读取 | 输出 | 等效月额度 |
|---|---:|---:|---:|---:|
| DeepSeek V4.1 Flash · Off-Peak | $0.15 | $0.003 | $0.60 | $15 |
| DeepSeek V4.1 Flash · Peak | $0.30 | $0.006 | $1.20 | $15 |
| Muse Spark 1.3 Contributor | $0.10 | $0.002 | $0.20 | $60 |

Go 订阅为 $10/月。5 小时与周窗口分别为等效月额度的 20% 和 50%，所以只使用 V4.1 Flash 时对应 $3／$7.5／$15，Muse 对应 $12／$30／$60。表格是额度计量口径；是否启用超额余额结算另由账户设置决定。[OpenCode Go 官方说明](https://opencode.ai/docs/go/#usage-limits)

**不能把 $15 和 $60 理解成可相加的两个钱包。** 公开源码将各请求的成本乘模型系数，再累加至相同用户订阅的三种用量计数；界面按基础额度除以模型系数计算单模型等效额度。增加执行者数量不会复制额度。这是公开实现的核验结果，不是读取了你的账户剩余额度。[订阅用量更新](https://github.com/anomalyco/opencode/blob/859106eb17d5b840475f5e4b78e64c9622f8750e/packages/console/app/src/routes/zen/util/handler.ts#L1184) · [单模型等效额度计算](https://github.com/anomalyco/opencode/blob/859106eb17d5b840475f5e4b78e64c9622f8750e/packages/console/app/src/lib/lite-usage.ts)

### 用同一个工作量比较

下面是自行计算的示例，不是性能测试：一次已完成任务共用 10 万非缓存输入、90 万缓存读取和 2 万输出 tokens，假设三者使用量完全相同。

| 模型/时段 | 按价表计量的成本 | 等效月额度消耗 | 相对 Muse 的额度消耗 |
|---|---:|---:|---:|
| Muse Contributor | $0.0158 | 0.0263% | 1× |
| V4.1 Flash Off-Peak | $0.0297 | 0.198% | 7.52× |
| V4.1 Flash Peak | $0.0594 | 0.396% | 15.04× |

计算方法是分别对三类 tokens 乘单价，再除以该模型的等效月额度。实际任务会有不同输出长度、缓存命中和返工次数，因此这些倍数不是实际完成任务的固定差价。真正值得优化的是“每个验收通过任务的额度消耗与主代理返工时间”，不是某一项输入单价。

## 3. 能力差异：前端已有方向性信号，通用代码仍需对照

### 前端原型：V4.1 Flash 值得试，但不是所有页面都领先

OpenDesign Arena 是本轮取得的直接包含两款模型的评测。它评价网页原型，综合分由需求完成度 30 分、设计质量 70 分构成。

| 原型任务 | V4.1 Flash | Muse Spark 1.3 |
|---|---:|---:|
| 综合平均分 /100 | 81.2 | 66.6 |
| Web app | 82.4 | 62.0 |
| Mobile app 原型 | 82.5 | 63.3 |
| Desktop app 原型 | 84.4 | 76.4 |
| Dashboard | 76.1 | 76.8 |
| Landing page | 79.3 | 53.4 |
| 平均完成时间 | 5.3 分钟 | 3.3 分钟 |

这给出一个可操作的假设：V4.1 Flash 可能更适合视觉设计与页面要求较多的初稿；Muse 在该测试中完成更快，Dashboard 分数也略高。它不证明 DeepSeek 在后台逻辑、并发恢复、真实移动应用开发或大型重构中更强。评测没有充分披露每款模型的精确 checkpoint、完整推理配置和不确定性区间，且新模型处于发布切换期，应把它视为候选筛选信号。[OpenDesign 原始评测与方法](https://open-design.ai/llm-arena-for-design/)

该站的“每个产物美元成本”不等于 Go 的 Contributor 额度计价。本报告不把榜单上的成本差直接用于你的订阅决策。

### 长任务、复杂指令与仓库编码：Muse 证据更成熟，不等于已经胜过 V4.1

Meta 对 1.3 的定位是改善长任务、工具使用、复杂要求保持和多任务交互。其内部工程比较报告相对 **Muse 1.2** 减少约 20% 工具调用、25% tokens；比较对象不是 DeepSeek。[Meta 发布说明](https://research.meta.ai/blog/introducing-muse-spark-1-3)

Meta 的方法文件说明，DeepSWE 使用 mini-swe-agent，Terminal-Bench 使用各模型的原生编码环境；因此即使名称相同的 benchmark，也不能忽略工具环境差异。[Meta 评估方法](https://research.meta.ai/static/muse-spark-1-3-multimodal-evaluation-methodology)

独立评测方 Artificial Analysis 的 Muse 1.3 max 页面列出 1M 上下文、文本/图像/视频输入，并报告 Meta API 输出速度约 219.7 tokens/s。这个速度不是 Go 线路承诺，也不等于整个编码任务完成速度。本轮未获得可核验的 V4.1 同条件对照，不能据此排列两者通用能力高低。[Artificial Analysis 模型测量](https://artificialanalysis.ai/models/muse-spark-1-3)

本次打开并直接获取的 DeepSWE 官方榜单仍是标注 September 3 的数据，没有检索到 V4.1 Flash 或 Muse 1.3 条目。因此，网络流传的 V4.1 “75.1%”没有进入本报告的证据表，也没有用旧 V4 Flash 成绩替代新模型成绩。[DeepSWE 官方榜单](https://deepswe.datacurve.ai/)

现有项目保留了 Muse 的文件操作、修改、测试与返工历史验证，这支持继续把它作为已知基线；它不是本轮的新测量，也不是和 V4.1 的对比结果。[项目历史验证](2026-09-08-opencode-worker-final-run-plan.md)

## 4. 数据条件是实际的差异化理由

Go 将 Muse 1.3 **Contributor** 标为允许模型训练、非零保留；V4.1 Flash 标为不用于训练、零保留，但 DeepSeek 的协议按月续期，当前声明只到 **2026-09-30**。不要把这个 Go 通道的协议扩大成对 DeepSeek 所有访问方式的保证。[Go 隐私表](https://opencode.ai/docs/go/#privacy)

如果项目不适合允许训练，Contributor 的低价并不能解决这个条件冲突；在确认业务允许相应服务商处理数据后，DeepSeek Go 通道有独立的采用理由。若主要处理公开代码、且接受既有 Contributor 条件，Muse 的额度优势更直接。

## 5. 对当前 Worker 工作流意味着什么

当前本机独立插件的 `src/core.ts` 将模型固定为 `muse-spark-1.3-contributor`，runtime 和 runner 同时校验这个身份。Go 支持新模型不等于当前插件已经能派发它。未来扩展应把所选模型、任务记录和实际回读身份一起贯通，继续沿用现有会话、请求去重、权限与结果验收；不要只改显示名称或把两个模型共用一个身份常量。

按本仓库现行约定，新候选应走 OpenCode 外部通道，不恢复已经退役的原生 DeepSeek profiles。此处是未来实现方向，本轮未改变插件或新增执行者。

| 你的主要目标 | 当前建议 |
|---|---|
| 提升前端原型、页面设计初稿 | 值得做 DeepSeek V4.1 小范围对照 |
| 处理不接受 Contributor 训练条件的任务 | 核实当前 Go 数据协议后，考虑 DeepSeek 通道 |
| 在 Go 中完成更多常规代码任务 | 继续以 Muse 为默认；新增 Worker 不增加订阅额度 |
| 复杂根因、架构、关键业务语义 | 继续由主代理决策，尚无证据支持直接转交新 Flash |
| 避免高峰价格 | 同一模型择时使用即可，不增加第二个 Worker |

### 最小的下一步验证

若决定试用，先用同一 OpenCode 环境做少量、有明确验收的对照：一个前端原型、一个跨文件修复、一个长上下文约束任务，再加一个过去 Muse 需要返工的案例。为两者分别记录模型/推理配置、一次通过情况、总完成时间、额度消耗和主代理补救时间；失败也保留。先观察结果是否改变选择，再决定是否固化一条独立 Worker，而不是先建路由再为它找工作。

本轮结论的主要不确定性是 V4.1 正式服务的同环境编码质量与实际 Go 稳定性。未来若它在你的任务上明显减少返工，或数据条件成为硬约束，增加通道就有理由；若只是吞吐更快但需要更多审阅，现有 Muse 仍可能更划算。

## 取证说明

资料读取于 2026-09-10。OpenCode 公开实现固定为 `859106eb17d5b840475f5e4b78e64c9622f8750e`，文档显示当天更新。没有读取你的 Go 账户用量、密钥或调用计费模型。正式模型文档与第三方评测仍处于快速更新期；本备忘录提供当前决策依据，不把未核验的发布传闻当事实。
