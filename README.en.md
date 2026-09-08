<div align="center">
  <h1>Codex Worker Routing</h1>
  <p><strong>Let Codex make the decisions. Let the right worker do the work.</strong></p>
  <p>Connect native Codex subagents with OpenCode to make your models, tools and subscriptions work together.</p>
  <p><a href="README.md">简体中文</a> · <strong>English</strong> · <a href="CHANGELOG.md">Changelog</a></p>
</div>

## Why use it

One model does not need to do everything. This workflow keeps requirements, task breakdown and final acceptance with Codex, while native subagents or external workers handle suitable implementation work.

- **Divide work by task**: the main Agent owns critical decisions; workers handle defined development tasks.
- **Connect your tools**: the OpenCode Worker plugin lets Codex delegate directly to OpenCode.
- **Use an existing subscription**: external tasks use OpenCode Go credits while the main Agent stays on your chosen Codex model.
- **Avoid empty checks**: one `run` call handles dispatch and program-side waiting; Codex reviews the result when it returns.

| Executor | Main responsibility |
|---|---|
| Codex main Agent | Understand requirements, choose an approach, integrate and verify |
| Luna Medium / Max | Native subagents for bounded tasks |
| OpenCode + Muse | External development work through the plugin |

## Codex × OpenCode

The **OpenCode Worker plugin** connects Codex and OpenCode. Codex dispatches a task; OpenCode calls the model, works with files and runs tools, then returns the results to Codex.

```text
You → Codex → OpenCode Worker plugin → OpenCode / OMO → Muse
        ↑                 Results and artifacts          │
        └────────────────────────────────────────────────┘
```

You stay in Codex instead of copying prompts and results between terminals.

### Why OpenCode

[OpenCode](https://github.com/anomalyco/opencode) is a complete coding agent with file operations, command execution and model integrations. We reuse its execution environment and configured OMO setup, keeping coordination and acceptance in Codex while external models work within OpenCode's tool environment.

### Why a Go subscription

[OpenCode Go](https://opencode.ai/go) provides multiple coding models and included usage allowances for **$10/month**. It suits frequent agent-assisted implementation, debugging and testing. The plugin lets tasks dispatched by Codex use that subscription too.

### Why Muse Spark 1.3 Contributor

We chose **Muse Spark 1.3 Contributor** as the current external worker model for its coding and tool-use capabilities and the Contributor tier's low cost. Muse 1.3 improves multi-step coding and agentic work; we have also verified file operations, code changes, tests and same-session corrections through this integration.

The model ID is `opencode-go/muse-spark-1.3-contributor`. Contributor offers discounted pricing in exchange for allowing Meta to train on submitted inputs and outputs, so check that this data condition fits your project. [Model introduction](https://research.meta.ai/blog/introducing-muse-spark-1-3) · [Go models and usage](https://opencode.ai/docs/go/)

**Subscribing to Go?** Use the [project referral link](https://opencode.ai/go?ref=FSRSTY14PP). You and the referrer each receive **$5 in usage credits**.

## Quick start

Install this repository's routing Skill and two native Luna profiles:

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

Have Codex read [AGENTS.md](AGENTS.md) first and follow the installation contract for existing configuration. OpenCode integration also requires the separately installed OpenCode Worker plugin and a configured OpenCode, OMO and Go setup. The plugin is not currently distributed in this repository.

Start a new Codex task with:

```text
Use the sol-worker-routing workflow for this request.
You own judgment and acceptance; delegate suitable independent tasks to available workers.
This task may use my Go Muse Contributor subscription through OpenCode Worker.
```

Native Luna subagents remain usable without the external plugin. You can select an executor or disable delegation for a task. Update an existing standard installation with `bash scripts/update.sh`.

## Documentation

- [Routing and handoff rules](skills/sol-worker-routing/SKILL.md)
- [Installation, upgrades and lane switches](AGENTS.md)
- [OpenCode plugin plan and validation](docs/2026-09-08-opencode-worker-final-run-plan.md)
- [Changelog](CHANGELOG.md)

The display name is now **Codex Worker Routing**; the old repository address and `sol-worker-routing` Skill ID remain for compatibility. The project is not tied to a specific main model and is not an official OpenAI or OpenCode product.
