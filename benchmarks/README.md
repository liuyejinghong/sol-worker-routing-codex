# 路由基准套件

这不是通用模型排行榜，也不是为了让更多子代理默认参与。它只检验一个窄问题：在固定、常见的软件工程工作单元中，哪个 lane 能以可接受质量完成任务。

所有案例来自公开 GitHub 的固定提交、PR 或讨论；运行副本必须位于一次性临时目录，禁止使用用户项目、线上服务或付费外部接口。

## 设计原则

1. 每个案例有固定来源和最小验收。
2. 每个 Worker 只拿到同一份完整任务合同；当前 DeepSeek 原生继承模式把这份合同作为用户当前请求提供，不依赖动态 `spawn_agent.message`。
3. 先比较验收结果，再比较耗时和生成 token。
4. 不把 CLI 的输入 token 当作账单：插件、缓存和全局 Skill 会使它不可比。
5. 不为凑样本重复运行；只有新路由决策需要的对照才运行。

## 案例目录

| ID | 类型 | 固定来源 | 首选 lane | 最小验收 |
|---|---|---|---|---|
| B1 | 代码/文档事实查找 | [`sindresorhus/p-map@66b039b`](https://github.com/sindresorhus/p-map/tree/66b039b20d362c3d508f15b11dd867638b02f75b) | DeepSeek | 行号证据 + Node 断言 |
| B2 | 失败诊断 | [`encode/httpx@0.19.0`](https://github.com/encode/httpx/tree/0d7c4caada43324cb3b6ebe4101745c0f7f575db) / [Discussion #1856](https://github.com/encode/httpx/discussions/1856) | Luna | MockTransport 复现和最小修复说明 |
| B3 | 窄机械补丁 | [`pallets/click` PR #3238](https://github.com/pallets/click/pull/3238) 的父提交 [`04ef3a6`](https://github.com/pallets/click/commit/04ef3a6f473deb2499721a8d11f92a7d2c0912f2) | DeepSeek | 仅改 `tests/test_utils.py` + 目标测试 |
| B4 | 有界代码审查 | [`encode/httpx` PR #2156](https://github.com/encode/httpx/pull/2156) 合并提交 [`3350d7e`](https://github.com/encode/httpx/commit/3350d7e6831e2d942f68653b2f58cfa5ecb0bacd) | Luna | 最多三条可定位的审查结论 |

B1 和 B3 有意使用 DeepSeek 与 Luna 的同合同对照；B2 和 B4 用来防止把“所有任务都塞给 DeepSeek”误解为工作流目标。

## 重跑协议

1. 记录 Codex 版本、时间、模型、推理强度和工作树 SHA。
2. 每个模型使用相同的目标、路径、非目标、验收、验证和停止条件；当前 DeepSeek 通过独立的完整用户请求继承同一合同，不能把私有动态任务包可用性计入模型成绩。
3. 测量从发出任务包到收到终态的墙钟时间；保存原生 `output_tokens` 与 `reasoning_output_tokens`（若客户端提供）。
4. 由 Sol 独立检查 diff、目标命令和范围，不把 Worker 自述当作验收。
5. 对照只在路由决策会改变时运行。出现共享状态、歧义、或写入重叠时，不并行。

当前首轮结果见 [`report-2026-08-09.md`](report-2026-08-09.md)，原始汇总行见 [`pilot-2026-08-09.csv`](pilot-2026-08-09.csv)。

当前 DeepSeek 官方 API 的文本、工具、原生联网、第三方 MCP 与命名子代理交接边界见 [`official-deepseek-acceptance-2026-08-10.md`](official-deepseek-acceptance-2026-08-10.md)。

历史 OpenCode Go 桥接路线的超过 256K 验证见 [`long-context-acceptance-2026-08-10.md`](long-context-acceptance-2026-08-10.md)；该记录保留作证据，不代表当前官方 API 安装路径。
