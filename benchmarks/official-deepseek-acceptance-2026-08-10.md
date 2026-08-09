# DeepSeek 官方直连验收

日期：2026-08-10（Asia/Shanghai）

## 目标

判断 `deepseek-v4-flash` 通过 DeepSeek 官方 Responses API 接入 Codex 时，是否可以移除本机 LiteLLM/OpenCode Go 转换层，并明确不能由直连成功推导出的能力。

## 环境

- Codex：ChatGPT App 内置 `codex-cli 0.147.0-alpha.6.5`
- Provider：`https://api.deepseek.com/`，`wire_api = "responses"`
- 模型目录：DeepSeek 官方 Codex 配置器生成
- 上下文声明：1,048,576 token
- 凭据：通过 Codex `auth.command` 按需读取；未写入仓库、命令行或 TOML

## 结果

| 合同 | 真实结果 | 判定 |
|---|---|---|
| 文本直连 | 返回指定标记 `OFFICIAL_TEXT_OK` | PASS |
| Codex 内置工具 | `exec_command` 执行一次只读 `pwd`，随后返回指定标记 | PASS |
| 原生联网 | `web_search` 找到 DeepSeek 官方 Codex 集成页并返回正确 URL | PASS |
| 第三方 MCP namespace | DeepSeek 会话未获得 `node_repl` namespace；同条件 OpenAI 控制组成功返回 `2` | FAIL |
| 命名 `deepseek_worker` 任务交接 | 子代理启动，但未收到 `spawn_agent.message`；一次 `followup_task` 也未送达任务包 | BLOCKED |
| 官方直连前台 fallback | `codex exec` 收到相同类型的固定标记任务，确认 `reasoning effort: max` 并精确返回 `DEEPSEEK_DIRECT_MAX_OK` | PASS |

原生联网成功返回：

```text
https://api-docs.deepseek.com/quick_start/agent_integrations/codex/
```

## 结论边界

官方 DeepSeek API 已证明文本、Codex 内置工具和原生网页搜索无需任何本机协议桥接，因此当前安装移除 LiteLLM/OpenCode Go 路线。

第三方 MCP namespace 仍需逐项验收；它的失败不影响原生 `web_search`，也不构成为无关工具重新增加桥接层的理由。

当前 Codex custom-provider 子代理存在动态任务包丢失问题，且与公开问题 [openai/codex#35932](https://github.com/openai/codex/issues/35932) 的症状一致。原生子代理卡片与任务交接仍为 blocked；Skill 使用前台 `codex exec` fallback 把任务包作为 DeepSeek 顶层输入，从而恢复实际执行能力。这个 fallback 直接使用官方 provider、`deepseek-v4-flash` 与 max 推理，不需要后台桥接，但不能被描述为 Codex 原生子代理交接已经修复。
