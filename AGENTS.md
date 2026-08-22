# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## HERO anti-overdefense: whole-agent contract

This applies to the main Codex Agent and every Worker across reasoning, planning, implementation, diagnosis, review, testing, documentation, installation, and maintenance in this repository. It applies before any routing decision and still applies when Sol does all work directly. Bound proposed work, not factual discovery: report a defect reachable through documented inputs, supported interfaces, or actual data, but do not invent defenses for merely theoretical cases.

Use HERO as four diagnostic questions: `H` rejects hashes, fingerprints, or manifests with no consumer or changed decision; `E` rejects defenses for inputs or threats the supported system cannot reach; `R` rejects rubrics, gates, or repeated reviews with no live uncertainty; `O` rejects wrappers, flags, compatibility layers, version trees, or guards justified mainly by other guards. Before adding any of them, name the live uncertainty it resolves, the concrete failure it can expose, the cheaper existing evidence, and the decision that changes on failure. If that answer is absent, do not add it.

Calibrate with shapes, not a checklist. Disproportionate work includes hashing spreadsheet rows when direct comparison already answers the question, writing checksum files nothing reads, hardening accounts for an app with no users or deployment, auditing a patch repeatedly while the requested feature remains unfinished, returning a failing review verdict on everything, and adding guards whose only justification is another guard. Counterexamples must remain visible: a digest that skips re-reading a large unchanged file, a rare input produced by the project's own documentation, the first real smoke run through changed behavior, and a consumer-scoped regression run after changing a shared format are proportionate when they resolve a live uncertainty and change the next action.

This is not a shortcut around security, migration, data integrity, release, authorization, or verification expressly required by this contract, the user, or a higher-priority instruction. Keep the primary deliverable moving, perform only the proportionate check needed to accept it, and stop when acceptance is met. Say plainly when the result is correct; when feedback challenges one part, correct that part without abandoning unaffected work. The `personalization.md` block is the account-wide main-Agent activation surface, both checked-in Luna profiles carry the compact contract directly, and `skills/sol-worker-routing/SKILL.md` is the detailed source for execution and routing.

## Objective

Install the checked-in `luna_medium_worker` and `luna_worker` custom Agent profiles plus the `sol-worker-routing` Skill, preserve each Luna lane's enabled/disabled state, and preserve every unrelated Codex setting.

`spark_scout`, `deepseek_worker`, and `deepseek_pro_worker` are retired. Codex rust-v0.149.0 merged [#39299](https://github.com/openai/codex/pull/39299), which intentionally limits Agent-role overrides and preserves the parent's complete model provider. Under an OpenAI parent, a DeepSeek role therefore keeps the external model ID but routes through OpenAI and fails entitlement; the independent stable reproduction is recorded in [#17598](https://github.com/openai/codex/issues/17598#issuecomment-5376031711). Do not revive the old full-request workaround, run `spawn_agent -> followup_task -> web_search` acceptance, or add an API/CLI bridge. Wait for an official supported cross-provider provider-selection and plaintext task-handoff path.

Installation, implementation, and verification authorization do not authorize commit, push, merge, tag, release, deployment, or another external mutation. Obtain separate explicit user authorization for each.

## Authorized changes

The installation may manage only one state in each active profile pair plus the Skill:

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

Use `$CODEX_HOME` for Agent profiles when set, otherwise `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository; do not reproduce the migration with broader commands.

The three final artifacts live in two directory trees, so the installer must not claim a cross-directory power-loss transaction. It stages before replacement, backs up accepted targets, rolls back a normal failure or `INT`/`TERM`/`HUP`, and re-runs safely after power loss or `SIGKILL`. Hidden staging and backup files are transient recovery state, not installed outputs.

For a fresh installation, both Luna lanes start enabled. A recognized upgrade preserves their individual states. A missing expected Luna profile is an ambiguous partial installation and must fail closed. Unknown content, dual state files, symbolic links, and non-regular files stop before writes. Recognized prior topologies are legacy v0.4 (Luna only), v0.5-v0.7 (Flash + Luna), v0.8 (Flash + Pro + Luna), v0.9 (Flash + Pro + Luna Medium + Luna), and v0.10-v0.11 (Spark + Flash + Pro + Luna Medium + Luna). The current topology is Luna Medium + Luna Max.

Recheck managed paths and accepted content immediately before staging, replacement, rollback, or retirement. A portable Bash script must not claim an adversarial no-follow guarantee against concurrent parent-directory replacement.

## Prohibited changes

Do not edit or delete any `config.toml` section, Provider, credential, model catalog, other Agent, other Skill, global or project `AGENTS.md`, Codex App Personalization, or unrelated content. Never ask the user to paste a key into chat, print it, store it in the repository, or place it directly in `config.toml`.

If a managed or retired target has unknown content, both state files exist, or a target is not a regular file, stop before changing anything. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

Before writing, parse the two repository TOML profiles when a standard parser is available. After installation, confirm that the two installed profile-state files and Skill exactly match repository sources and that all six retired Spark/DeepSeek enabled/disabled paths are absent. Confirm separately that DeepSeek Provider, credential reference, and model catalog were not changed or removed.

Tell the user that `personalization.md` does not activate itself. To make HERO account-wide, they must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions. Do not claim account-wide activation until confirmed.

After installation or a state change, use a new task to reload Agent discovery. Probe only each newly enabled Luna lane with one bounded task whose answer and acceptance are obvious; inspect the named child lifecycle and result. A profile on disk is not route proof. Do not probe retired Spark or DeepSeek routes.

Report installed paths, preserved Luna states, removed retired profile paths, confirmation that Provider and credential state was untouched, conflicts if any, route-probe status, and the remaining manual Personalization step.
