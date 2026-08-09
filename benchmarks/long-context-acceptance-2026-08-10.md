# OpenCode Go 长上下文验收

> 历史记录：当前版本已改用 DeepSeek 官方 Responses API，并移除 OpenCode Go/LiteLLM 桥接。本记录只保留当时路线的可复核证据，不代表当前安装方式。

日期：2026-08-10（Asia/Shanghai）

## 验收目标

确认 `deepseek-v4-flash` 的 OpenCode Go 路线不只是声明 `model_context_window = 1000000`，而是能够通过当前 Codex、LiteLLM bridge 和 Go 上游处理超过 256K token 的真实输入。

## 环境与输入

客户端使用 ChatGPT App 内置的 `codex-cli 0.147.0-alpha.6.5`，bridge 使用 LiteLLM `1.96.0`。探针在首尾各放置一个唯一标记，中间加入 260,000 个重复的单 token 文本单元，要求模型只返回两个标记。

## 结果

直接请求本机 `/v1/responses` 返回 HTTP 200，上游 usage 报告 `input_tokens = 260093`。随后使用相同输入通过 Codex、OpenCode Go provider 和 bridge 执行端到端探针，进程退出码为 0，模型返回：

```text
BEGIN_CONTEXT_7F31 END_CONTEXT_A94C
```

这证明当前链路能够保留并处理超过 256K 的输入首尾内容。

## 结果边界

本次验收没有把输入推到完整 1M，因此证明的是“真实越过 256K”，不是“1M 极限压力测试”。Codex 当前仍提示自定义 `deepseek-v4-flash` 缺少内置 model metadata，并在自身 usage 事件中把 input token 记为 0；260,093 的输入计量来自同一 bridge 和上游的直接请求。该 metadata fallback 可能影响客户端遥测或自动上下文管理，但没有阻止本次端到端结果。
