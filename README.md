<div align="center">
  <h1>Codex Worker Routing</h1>
  <p><strong>由 Codex 协调合适的 Agent，保留各自的原生能力。</strong></p>
  <p><strong>简体中文</strong> · <a href="README.en.md">English</a> · <a href="CHANGELOG.md">更新日志</a></p>
</div>

## 当前分工

- **Codex 与原生 Luna**：保留已有原生路由和安装方式。
- **Agent-Bridge**：连接 OpenCode、ZCode 等本地 Agent，保留原生工具、权限和工作流；不再使用旧 OpenCode Worker 插件。
- **Agent Bench**：统一记录实际模型、用量、任务关系、功能验收与报告，比较不同 Agent 组合。

```text
用户 → Codex → Agent-Bridge → 所选本地 Agent
          ↓                       ↓
          └──── Agent Bench 采集 ──┘
                    ↓
          Apple Container 验收与报告
```

正常交付只做与任务相称的检查，不让主控重新实现子代理的任务。模型与工具按实际可用资源选择，不限于 OpenCode 或固定 OMO 组合。

旧插件源码、测试和 dist 已归档，活动源码、安装缓存和市场入口已移除；历史运行数据保留。[归档入口](archives/README.md) · [Agent Bench 项目](BENCHMARK_PROJECT.md)。

## 快速开始

安装本仓库提供的路由 Skill 和 Luna Max 原生子代理配置：

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

安装前由 Codex 阅读 [AGENTS.md](AGENTS.md)，按安装合同处理现有配置。外部 Agent 通过 Agent-Bridge 连接，保留其原生工具、权限和工作流；参见[切换与实测记录](docs/2026-09-12-agent-bridge-switch.md)。Agent Bench 的评测方案与运行入口见[独立项目入口](BENCHMARK_PROJECT.md)。Luna 安装脚本只管理原生 Worker 与路由 Skill，不安装外部 Agent 或修改其配置。

在新 Codex 任务中使用：

```text
按 sol-worker-routing 工作流处理这个需求。
你负责判断和验收，把适合的独立任务交给可用 Worker。
允许本任务通过 Agent-Bridge 使用我指定的外部 Agent 和模型。
```

没有配置 Agent-Bridge 时，仍可使用 Luna 原生子代理。你可以指定执行者，也可以要求本次不委派。更新已有标准安装使用 `bash scripts/update.sh`。

安装或开关操作被强制中断后，使用相同 checkout、HOME / CODEX_HOME 和参数重跑原命令。安装器会依据临时恢复记录完成已知操作，并在成功后清除记录与备份；源码或文件出现未知变化时会停止。旧版留下的、没有恢复记录的部分安装仍需人工检查。此机制不承诺跨目录的断电原子性。

Luna Medium 已退役：升级会删除已知的启用或停用配置，保留 Luna Max 的开关状态。小任务由主代理直接处理。

OpenCode Worker 已进入退役归档，不再作为安装或执行入口；[归档与收尾状态](docs/2026-09-12-opencode-worker-retirement.md)保留源码、测试和历史证据。`scripts/update.sh` 仍只更新原生 Worker 和路由 Skill。

## 更多文档

- [路由与任务交接规则](skills/sol-worker-routing/SKILL.md)
- [安装、升级和开关管理](AGENTS.md)
- [Agent-Bridge 切换与实测](docs/2026-09-12-agent-bridge-switch.md)
- [Agent Bench 项目入口](BENCHMARK_PROJECT.md)
- [OpenCode Worker 历史归档](archives/README.md)
- [OMO 开发验收](docs/2026-09-10-omo-development-acceptance.md)
- [0.3 安装验收](docs/2026-09-10-omo-installation-acceptance.md)
- [更新日志](CHANGELOG.md)

项目展示名已改为 **Codex Worker Routing**；旧仓库地址和 `sol-worker-routing` Skill ID 暂保留兼容。项目不绑定某个主模型，也不是 OpenAI 或 OpenCode 官方产品。
