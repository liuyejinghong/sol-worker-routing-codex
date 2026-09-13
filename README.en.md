<div align="center">
  <h1>Codex Worker Routing</h1>
  <p><strong>Let Codex coordinate agents while preserving their native capabilities.</strong></p>
  <p><a href="README.md">简体中文</a> · <strong>English</strong> · <a href="CHANGELOG.md">Changelog</a></p>
</div>

## Current responsibilities

- **Codex and native Luna** retain their existing native routing and installer.
- **Agent-Bridge** connects local agents such as OpenCode and ZCode without importing the former OpenCode Worker's permission or role restrictions.
- **Agent Bench** collects actual model identities, usage and task relationships, then combines functional grading with reports.

```text
User → Codex → Agent-Bridge → selected local agent
          ↓                         ↓
          └──── Agent Bench records ┘
                       ↓
             Apple Container grading
```

Verification is proportional to the task; the coordinator does not reimplement the worker's work. Select available models and tools for the job rather than forcing a fixed provider or OMO profile.

The former plugin's source, tests and dist are archived. Active source, installed cache and marketplace registration have been removed; historical execution data remains. [Archive](archives/README.md) · [Agent Bench project](BENCHMARK_PROJECT.md).

## Quick start

Install this repository's routing Skill and the native Luna Max profile:

```bash
git clone https://github.com/liuyejinghong/sol-worker-routing-codex.git
cd sol-worker-routing-codex
bash scripts/install.sh
```

Have Codex read [AGENTS.md](AGENTS.md) first and follow the installation contract. Connect external agents through Agent-Bridge while preserving their native tools, permissions and workflows; see the [switch and acceptance record](docs/2026-09-12-agent-bridge-switch.md). See the [independent project entry](BENCHMARK_PROJECT.md) for Agent Bench's evaluation design and execution entry. The Luna installer manages only the native Worker and routing Skill; it does not install external agents or modify their configuration.

Start a new Codex task with:

```text
Use the sol-worker-routing workflow for this request.
You own judgment and acceptance; delegate suitable independent tasks to available workers.
This task may use my specified external agents and models through Agent-Bridge.
```

Native Luna subagents remain usable without Agent-Bridge. You can select an executor or disable delegation for a task. Update an existing standard installation with `bash scripts/update.sh`.

After an installation or lane switch is forcibly interrupted, rerun the original command with the same checkout, HOME / CODEX_HOME and arguments. The installer uses a temporary recovery record to finish the known operation, then removes its record and backups. Unknown source or file changes stop recovery. Partial installations left by older versions without a recovery record still need manual inspection. This is not a cross-directory power-loss atomicity guarantee.

Luna Medium is retired. Upgrades remove its known enabled or disabled profile and preserve the Luna Max state. Small tasks stay with the main agent.

OpenCode Worker has been retired into a historical archive and is no longer an installation or execution entry. The [retirement status](docs/2026-09-12-opencode-worker-retirement.md) preserves its source, tests and evidence. `scripts/update.sh` still updates only the native Worker and routing Skill.

## Documentation

- [Routing and handoff rules](skills/sol-worker-routing/SKILL.md)
- [Installation, upgrades and lane switches](AGENTS.md)
- [Agent-Bridge switch and acceptance](docs/2026-09-12-agent-bridge-switch.md)
- [Agent Bench project entry](BENCHMARK_PROJECT.md)
- [OpenCode Worker historical archive](archives/README.md)
- [OMO development acceptance](docs/2026-09-10-omo-development-acceptance.md)
- [0.3 installation acceptance](docs/2026-09-10-omo-installation-acceptance.md)
- [Changelog](CHANGELOG.md)

The display name is now **Codex Worker Routing**; the old repository address and `sol-worker-routing` Skill ID remain for compatibility. The project is not tied to a specific main model and is not an official OpenAI or OpenCode product.
