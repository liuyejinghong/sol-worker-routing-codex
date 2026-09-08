<div align="center">
  <h1>Codex Worker Routing</h1>
  <p><strong>让 Codex 负责判断，让合适的 Worker 完成工作。</strong></p>
  <p>连接 Codex 原生子代理与 OpenCode，让模型、工具和订阅额度协同工作。</p>
  <p><strong>简体中文</strong> · <a href="README.en.md">English</a> · <a href="CHANGELOG.md">更新日志</a></p>
</div>

## 为什么用它

一个模型不必包办所有事情。这套工作流让 Codex 保留需求理解、任务拆分和最终验收，把适合交接的实现工作分配给原生子代理或外部 Worker。

- **按任务分工**：主代理处理关键判断，Worker 承接明确的开发任务。
- **连接不同工具**：通过 OpenCode Worker 插件，让 Codex 直接调用 OpenCode 干活。
- **利用已有订阅**：外部任务使用 OpenCode Go 额度，主代理继续使用你选择的 Codex 模型。
- **减少空检查**：默认一次 `run` 完成派发与程序内等待，结果返回后再由 Codex 验收。

| 执行者 | 主要职责 |
|---|---|
| Codex 主代理 | 理解需求、确定方案、整合与验收 |
| Luna Medium / Max | 原生子代理，处理有明确范围的任务 |
| OpenCode + Muse | 通过插件承接外部开发任务 |

## Codex × OpenCode

我们通过 **OpenCode Worker 插件**实现了 Codex 与 OpenCode 的互联：Codex 派发任务，OpenCode 调用模型、操作文件和执行工具，完成后把结果交回 Codex。

```text
你 → Codex → OpenCode Worker 插件 → OpenCode / OMO → Muse
       ↑                  执行结果与产物                 │
       └───────────────────────────────────────────────┘
```

你只需要和 Codex 沟通，不必在两个终端之间复制提示词和结果。

### 为什么选择 OpenCode

[OpenCode](https://github.com/anomalyco/opencode) 本身就是完整的编程 Agent，拥有文件操作、命令执行和模型接入能力。我们复用它的执行环境和已配置的 OMO，让 Codex 专注于协调与验收，也让第三方模型在适合自己的工具环境中工作。

### 为什么选择 Go 订阅

[OpenCode Go](https://opencode.ai/go) 以 **$10/月**提供多种编程模型和包含在订阅内的使用额度，适合经常让 Agent 写代码、修复问题和运行测试的场景。通过插件，这份额度也可以用于 Codex 派发的任务。

### 为什么是 Muse Spark 1.3 Contributor

我们选择 **Muse Spark 1.3 Contributor** 作为当前外部 Worker 的模型，看重它的编程、工具使用能力，以及 Contributor 版本的低成本。Muse 1.3 面向多步骤编程和 Agent 任务进行了改进；我们也已验证它在这条链路中的文件读写、代码修改、测试和返工能力。

使用的模型 ID 是 `opencode-go/muse-spark-1.3-contributor`。Contributor 通过允许 Meta 使用输入和输出训练模型来换取折扣价格，使用前应确认这一数据条件适合你的项目。[模型介绍](https://research.meta.ai/blog/introducing-muse-spark-1-3) · [Go 模型与额度说明](https://opencode.ai/docs/go/)

**准备订阅 Go？** 使用[项目推荐链接](https://opencode.ai/go?ref=FSRSTY14PP)订阅，你和推荐人双方各获得 **$5 使用额度奖励**。

## 快速开始

安装本仓库提供的路由 Skill 和两条 Luna 原生子代理配置：

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

安装前由 Codex 阅读 [AGENTS.md](AGENTS.md)，按安装合同处理现有配置。OpenCode 互联还需要单独安装 OpenCode Worker 插件，并配置 OpenCode、OMO 和 Go；插件目前未在本仓库分发。

在新 Codex 任务中使用：

```text
按 sol-worker-routing 工作流处理这个需求。
你负责判断和验收，把适合的独立任务交给可用 Worker。
允许本任务通过 OpenCode Worker 使用我的 Go Muse Contributor。
```

没有安装外部插件时，仍可使用 Luna 原生子代理。你可以指定执行者，也可以要求本次不委派。更新已有标准安装使用 `bash scripts/update.sh`。

## 更多文档

- [路由与任务交接规则](skills/sol-worker-routing/SKILL.md)
- [安装、升级和开关管理](AGENTS.md)
- [OpenCode 插件方案与验证](docs/2026-09-08-opencode-worker-final-run-plan.md)
- [更新日志](CHANGELOG.md)

项目展示名已改为 **Codex Worker Routing**；旧仓库地址和 `sol-worker-routing` Skill ID 暂保留兼容。项目不绑定某个主模型，也不是 OpenAI 或 OpenCode 官方产品。
