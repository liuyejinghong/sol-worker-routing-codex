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
| Luna Max | 原生子代理，处理有明确范围的任务 |
| OpenCode / OMO | 一个外部 Worker，按职责调用 DeepSeek 与 Muse |

## Codex × OpenCode

OpenCode Worker 0.3 通过 OMO profile 分工：DeepSeek V4.1 Flash（`max`）负责主控和复杂职责，Muse Spark 1.3 Contributor（`xhigh`）负责批量实现、检索和写作。所有参与模型使用各自最高推理档。

我们通过 **OpenCode Worker 插件**实现了 Codex 与 OpenCode 的互联：Codex 派发任务，OpenCode 调用模型、操作文件和执行工具，完成后把结果交回 Codex。

```text
你 → Codex → OpenCode Worker → OMO profile
       ↑                         ├─ DeepSeek：主控、复杂任务
       └────── 执行结果与产物 ────└─ Muse：批量任务、只读检索
```

你只需要和 Codex 沟通，不必在两个终端之间复制提示词和结果。

### 为什么选择 OpenCode

[OpenCode](https://github.com/anomalyco/opencode) 本身就是完整的编程 Agent，拥有文件操作、命令执行和模型接入能力。我们复用它的执行环境和已配置的 OMO，让 Codex 专注于协调与验收，也让第三方模型在适合自己的工具环境中工作。

### 为什么选择 Go 订阅

[OpenCode Go](https://opencode.ai/go) 以 **$10/月**提供多种编程模型和包含在订阅内的使用额度，适合经常让 Agent 写代码、修复问题和运行测试的场景。通过插件，这份额度也可以用于 Codex 派发的任务。

### 为什么组合 DeepSeek 与 Muse

一个插件保留统一的任务、权限和结果入口，模型分工放在 OMO profile 中。主控与复杂分类使用 DeepSeek，常规分类和只读检索使用 Muse；更换模型时调整 profile，无需增加第二个 Worker。

最多运行两个直接子任务，同一时刻只有一个写执行者。子任务不能继续委派，文件与命令权限沿任务树生效；取消会停止整棵任务树。Codex 等待子任务和主控整理结束后，再检查实际产物与测试。需要单模型执行时可选择 `model_mode=single`。

使用的模型 ID 是 `opencode-go/muse-spark-1.3-contributor`。Contributor 通过允许 Meta 使用输入和输出训练模型来换取折扣价格，使用前应确认这一数据条件适合你的项目。[模型介绍](https://research.meta.ai/blog/introducing-muse-spark-1-3) · [Go 模型与额度说明](https://opencode.ai/docs/go/)

**准备订阅 Go？** 使用[项目推荐链接](https://opencode.ai/go?ref=FSRSTY14PP)订阅，你和推荐人双方各获得 **$5 使用额度奖励**。

## 快速开始

安装本仓库提供的路由 Skill 和 Luna Max 原生子代理配置：

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

安装前由 Codex 阅读 [AGENTS.md](AGENTS.md)，按安装合同处理现有配置。OpenCode 互联还需要单独安装 OpenCode Worker 插件，并配置 OpenCode、OMO 和 Go；源码与构建产物位于 [plugins/opencode-worker](plugins/opencode-worker/README.md)，配置合并样例见 [omo-profile.jsonc](plugins/opencode-worker/config/omo-profile.jsonc)。将该目录作为本地插件安装，并把样例 profile 合并到现有 `~/.omo/omo.jsonc`，不要覆盖整个配置。Luna 安装脚本不会安装外部插件或修改 OMO 配置。

在新 Codex 任务中使用：

```text
按 sol-worker-routing 工作流处理这个需求。
你负责判断和验收，把适合的独立任务交给可用 Worker。
允许本任务通过 OpenCode Worker 使用我的 Go DeepSeek 与 Muse Contributor。
```

没有安装外部插件时，仍可使用 Luna 原生子代理。你可以指定执行者，也可以要求本次不委派。更新已有标准安装使用 `bash scripts/update.sh`。

安装或开关操作被强制中断后，使用相同 checkout、HOME / CODEX_HOME 和参数重跑原命令。安装器会依据临时恢复记录完成已知操作，并在成功后清除记录与备份；源码或文件出现未知变化时会停止。旧版留下的、没有恢复记录的部分安装仍需人工检查。此机制不承诺跨目录的断电原子性。

Luna Medium 已退役：升级会删除已知的启用或停用配置，保留 Luna Max 的开关状态。小任务由主代理直接处理。

修复版使用 OpenCode Worker 0.3.1，默认 DeepSeek 精确 ID 为 `opencode-go/deepseek-v4.1-flash`（`max`）。已安装旧插件的用户还需重装插件并更新 OMO profile；`scripts/update.sh` 只更新原生 Worker 和路由 Skill。

## 更多文档

- [路由与任务交接规则](skills/sol-worker-routing/SKILL.md)
- [安装、升级和开关管理](AGENTS.md)
- [OpenCode Worker 源码与使用](plugins/opencode-worker/README.md)
- [OMO 开发验收](docs/2026-09-10-omo-development-acceptance.md)
- [0.3 安装验收](docs/2026-09-10-omo-installation-acceptance.md)
- [更新日志](CHANGELOG.md)

项目展示名已改为 **Codex Worker Routing**；旧仓库地址和 `sol-worker-routing` Skill ID 暂保留兼容。项目不绑定某个主模型，也不是 OpenAI 或 OpenCode 官方产品。
