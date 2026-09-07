# Repository instructions

For repository work, follow the user's authorized scope. Apply HERO to the main Agent and Workers: report reachable defects, avoid speculative complexity, and verify the actual change without ritual checks. Required safety and data-integrity controls still apply. Worker routing and development packets belong in `skills/sol-worker-routing/SKILL.md`; general collaboration preferences belong in `personalization.md`.

## Installation contract scope

The sections below govern authorized installation, upgrade, and lane-state operations only. A source review or repository edit does not itself authorize installing the workflow. The installer must not edit global/project AGENTS.md or App settings; a separate explicit user request to maintain those instructions is outside the installation operation.

## Objective

Install the checked-in `luna_medium_worker` and `luna_worker` custom Agent profiles plus the `sol-worker-routing` Skill, preserve each Luna lane's enabled/disabled state, and preserve every unrelated Codex setting.

`spark_scout`, `deepseek_worker`, and `deepseek_pro_worker` are retired. Codex rust-v0.149.0 merged [#39299](https://github.com/openai/codex/pull/39299), which intentionally limits Agent-role overrides and preserves the parent's complete model provider. Under an OpenAI parent, a DeepSeek role therefore keeps the external model ID but routes through OpenAI and fails entitlement; the independent stable reproduction is recorded in [#17598](https://github.com/openai/codex/issues/17598#issuecomment-5376031711). Do not revive the old full-request workaround, run `spawn_agent -> followup_task -> web_search` acceptance, or add a provider-protocol bridge as a native-role workaround. Wait for an official supported cross-provider provider-selection and plaintext task-handoff path for native roles. The separately maintained, user-authorized `opencode-worker` plugin may use OpenCode's native session API as an external execution channel; it does not restore these roles or expand this installer's managed paths.

Installation, implementation, and verification authorization do not authorize commit, push, merge, tag, release, deployment, or another external mutation. Obtain separate explicit user authorization for each.

## Authorized changes

The installation may manage only one state in each active profile pair plus the checked-in Skill:

```text
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml | luna-worker.toml.disabled
${CODEX_HOME:-$HOME/.codex}/agents/luna-medium-worker.toml | luna-medium-worker.toml.disabled
$HOME/.agents/skills/sol-worker-routing/SKILL.md
```

`<profile>.toml` is enabled and `<profile>.toml.disabled` is disabled for new tasks. `--lane-status`, `--enable-lane <luna_medium_worker|luna_worker|all>`, and `--disable-lane <luna_medium_worker|luna_worker|all>` are the only state operations. `all` means the two Luna Workers and never Sol.

During a recognized upgrade, the installer may remove exactly matching known copies, enabled or disabled, of these retired profiles:

```text
${CODEX_HOME:-$HOME/.codex}/agents/spark-scout.toml[.disabled]
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml[.disabled]
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-pro-worker.toml[.disabled]
```

This retirement does not authorize editing or deleting `[model_providers.deepseek]`, credentials, model catalogs, scheduled work, or any other provider state. Those are deliberately preserved.

The installer may also remove the documented old `sol-luna-workflow` Skill or pre-release `run-deepseek-worker.sh` only when each file exactly matches a recorded digest and no file or parent directory is a symbolic link. Unknown content must stop before any write.

Use `$CODEX_HOME` for Agent profiles when set, otherwise `$HOME/.codex`. The user-authored `sol-worker-routing` Skill uses `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository; do not reproduce the migration with broader commands.

The three final files live in two directory trees, so the installer must not claim a cross-directory power-loss transaction. It stages before replacement, backs up accepted targets, rolls back a normal failure or `INT`/`TERM`/`HUP`, and re-runs safely after power loss or `SIGKILL`. Hidden staging and backup files are transient recovery state, not installed outputs.

For a fresh installation, both Luna lanes start enabled. A recognized upgrade preserves their individual states. A missing expected Luna profile is an ambiguous partial installation and must fail closed. Unknown content, dual state files, symbolic links, and non-regular files stop before writes. Recognized prior topologies are legacy v0.4 (Luna only), v0.5-v0.7 (Flash + Luna), v0.8 (Flash + Pro + Luna), v0.9 (Flash + Pro + Luna Medium + Luna), and v0.10-v0.11 (Spark + Flash + Pro + Luna Medium + Luna). The current topology is Luna Medium + Luna Max.

Recheck managed paths and accepted content immediately before staging, replacement, rollback, or retirement. A portable Bash script must not claim an adversarial no-follow guarantee against concurrent parent-directory replacement.

## Prohibited changes

Do not edit or delete any `config.toml` section, Provider, credential, model catalog, other Agent, other Skill outside the exact targets above, global or project `AGENTS.md`, Codex App Personalization, or unrelated content. Never ask the user to paste a key into chat, print it, store it in the repository, or place it directly in `config.toml`.

If a managed or retired target has unknown content, both state files exist, or a target is not a regular file, stop before changing anything. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

Before writing, parse the two repository TOML profiles when a standard parser is available. After installation, confirm that the two installed profile-state files and `sol-worker-routing` Skill exactly match repository sources and that all six retired Spark/DeepSeek enabled/disabled paths are absent. Confirm separately that DeepSeek Provider, credential reference, and model catalog were not changed or removed.

Tell the user that `personalization.md` does not activate itself. They must manually replace the previous workflow block in Codex App Settings → Personalization → Custom Instructions with one complete language block, preserving unrelated preferences. Do not append duplicate instructions or claim the App setting changed until confirmed.

After installation or a state change, use a new task to reload Agent discovery. Probe only each newly enabled Luna lane with one bounded task whose answer and acceptance are obvious; inspect the named child lifecycle and result. A profile on disk is not route proof. Do not probe retired Spark or DeepSeek routes.

Report installed paths, preserved Luna states, removed retired profile paths, confirmation that Provider and credential state was untouched, conflicts if any, route-probe status, and the remaining manual Personalization step.
