# DeepSeek V4.1 Flash 独立连通性验证

2026-09-10，OpenCode 1.18.29。结论：**已通过 OpenCode + OMO 跑通 Go 的 DeepSeek V4.1 Flash 通道，未出现 Muse 请求。** 本次是最小连通性与工具读取验证，不是编码能力对比，也没有改造现有固定使用 Muse 的 Worker 插件。

## 版本与实际身份

| 核验层 | 观察结果 |
|---|---|
| Go 官方模型映射 | `deepseek-flash` 对应 DeepSeek V4.1 Flash |
| OpenCode 运行时模型目录 | `id=deepseek-flash`，`name=DeepSeek V4.1 Flash` |
| OMO 主角色 | `Sisyphus - ultraworker` |
| 主角色实际绑定 | `providerID=opencode-go`，`modelID=deepseek-flash` |
| 主模型与辅助模型 | 均为 `opencode-go/deepseek-flash` |
| 两次真实请求的 model | 均为 `deepseek-flash` |
| 两次 Go 响应的 model | 均为 `deepseek-flash`，HTTP 200 |
| 本地 assistant 消息身份 | 全部为 `opencode-go / deepseek-flash` |

[Go 官方目录与 ID 说明](https://opencode.ai/docs/go/#endpoints)将此 ID 指向 V4.1 Flash，区别于旧 `deepseek-v4-flash`。Go 响应只暴露别名，没有更细 checkpoint 或权重证明；本次证明的是正确的 V4.1 服务通道和没有本地 OMO/Muse 替换，不声称验证了服务商内部权重。

## 如何处理已有的 Muse 覆盖

确认日常 `opencode.json`、旧 `oh-my-openagent.json` 以及现用 `~/.omo/omo.jsonc` 都存在 Muse 绑定。没有直接调用当前硬编码 Muse 的 Worker 插件。

测试在独立临时 Git 目录中，用项目级 `.omo/omo.json` 覆盖 OMO 角色和分类模型；仅该测试进程将 OpenCode 主/辅助模型指定为 DeepSeek。发送前读取 `/agent`、`/provider` 和 `/config`，确认真实加载的角色与模型身份。所有带明确模型的运行时角色均无非目标模型。

临时请求观察器只允许 Go 的 `deepseek-flash` 请求，其他模型请求会被拒绝；向固定 Go 地址转发，同时保留 OpenCode 的会话标识。观察器只记录模型字段、HTTP 状态和用量，不记录密钥或请求头。未用模型的自我介绍作为身份证明。

## 最小任务与独立验收

任务要求使用 read 工具读取 `input.txt`，对 `[17,29,41,13]` 求和，并原样返回文件中的随机 nonce。会话拒绝写入、shell、委派和目录外访问。

实际结果：

```json
{"nonce":"dsv41-4432b7f20b38","sum":100}
```

read 工具执行完成；主代理重新读取测试文件，独立计算总和并比较 nonce，与结果一致。两次模型调用共报告输入 21,537 tokens、输出 179 tokens；输入中缓存命中 10,624、未命中 10,913。输出包含 reasoning，不重复相加。

## 状态与限制

- 三个日常配置文件前后字节相同。
- 测试专属 OpenCode 服务和请求观察器已停止。
- 没有修改原生 Luna/DeepSeek profiles、真实 OMO 默认模型或现有 Muse 插件。
- 初次探针在处理本地空响应时失败，已终止专属服务；未观察到 Go 请求。修正探针的空响应解析后，新的独立测试完成。该探针实现错误不作为模型失败。
- 后续若要日常派发 DeepSeek，仍需单独把插件的模型选择与身份验收贯通；本次不把“独立验证通过”当成“现有插件已经支持”。

[脱敏运行证据](2026-09-10-deepseek-v41-flash-probe-evidence.json)
