# DeepSeek V4 Pro 0813：原生子代理 route probe

日期：2026-08-13（Asia/Shanghai）
Codex task：`019ffb96-9a7c-7dc0-8386-5d917da83bca`（`验证 DeepSeek Pro Worker`）
范围：只读；不写文件、不改配置、不使用桥接或直接 API。

## 目的与判定规则

验证新安装的 `deepseek_pro_worker` 是否能在 Codex 内被发现、启动，并接收一条**完整且自包含**的初始任务。它不是模型能力排行榜，也不验证私有 Sol 任务包、追问消息、生产写入或 provider 的 wire-level telemetry。

测试任务原文：

```text
验证新安装的 deepseek_pro_worker。这是只读任务：先回答 2+2=4；运行 `pwd`；再用原生网页搜索打开 DeepSeek 官方价格页，返回精确 URL、model ID、context 信息和工具结果。不要写文件、不要改配置、不要使用桥接或直接 API。说明是否收到完整任务，并返回任何 blocker。
```

## 客户端可见结果

| 检查 | 结果 | 客户端可见证据 | 结论边界 |
|---|---|---|---|
| 命名 Worker 发现与 lifecycle | 通过 | 新 Codex task 成功启动 `deepseek_pro_worker`，并在 205.47 秒后返回完成结果 | 证明新 task 的 Agent registry 已发现该 profile；不等于所有 client 版本都已刷新 registry |
| 完整、自包含初始任务 | 通过 | Worker 明确报告“已收到完整任务”并逐项返回结果 | 当前接口不能同时传递完整历史和自定义角色；测试器只将**完全相同的当前用户请求**作为唯一初始任务。因此不证明私有 Sol packet 或后续消息可交接 |
| 明确文本 | 通过 | 返回 `2+2=4` | 这是最小响应链路证据，不是性能/质量基准 |
| 只读工具 | 通过 | 返回 `pwd`：`/Users/ethan/codex-workflow` | 证明一次只读 shell 工具结果被完成任务返回 |
| 原生网页搜索 | 通过 | 返回官方价格页 `https://api-docs.deepseek.com/quick_start/pricing/` 和中文页 `https://api-docs.deepseek.com/zh-cn/quick_start/pricing/` | 满足安装合同要求的一次原生搜索结果；不以搜索片段替代 catalog 精确值 |
| 官方页面正文打开 | 部分通过 | 原生 `open_page` 返回 `SSRF_BLOCKED` | 这是客户端安全拦截，不是模型、provider 或原生搜索失败；正文复核未完成 |
| 版本 / context 报告 | 部分通过 | Worker 返回 `deepseek-v4-pro`、`DeepSeek-V4-Pro-0813`、`1M`、最大输出 `384K` | 本次 thread reader 不暴露动态工具原始 payload；精确 `1,048,576` context 仍以已验证的官方 catalog/profile 文件为准 |

## 可接受的运行边界

本机 `deepseek_pro_worker` 现在可接收**用户当前请求本身已经完整、无需 Sol 私有补充材料或后续追问**的中高复杂度只读/受控任务。适合的首批工作仍是：多文件语义分析、固定范围的复杂诊断、隔离 PR 的第一轮深审，以及冲突证据综合。

以下能力仍不得假定可用：

- Sol 私有动态任务包、不同于当前用户请求的窄任务说明，或可靠的后续 follow-up；
- 基于本次自报/搜索片段断言 provider 的原始请求体、精确账单或 wire-level model telemetry；
- 因一次最小 probe 而直接下放架构、授权、生产/资金操作或共享状态写入；
- 把 `open_page` 的 SSRF 拦截归因于 Pro 模型质量。

## 路由决定

最小 native route gate 已通过，因此 Pro 不再只是“文件已安装的候选 profile”。但它的可用性是**受限的完整任务 lane**，不是动态 handoff lane：Flash 继续承接清晰、吞吐优先的工作；Luna 继续承接隐藏耦合和深度语义；Sol 保留目标、授权、私有任务拆包和最终验收。

下一项值得增加的证据不是重复 smoke test，而是一个“多文件语义、合同明确”的固定案例，在 Flash / Pro / Luna 间做相同输入、相同验收、相同停止条件的对照；只有它改变路由决策时，才继续扩样本。
