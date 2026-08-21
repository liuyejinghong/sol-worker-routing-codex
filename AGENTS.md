# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## HERO anti-overdefense: whole-agent contract

This applies to the main Codex Agent and every Worker across reasoning, planning, implementation, diagnosis, review, testing, documentation, installation, and maintenance in this repository. It applies before any routing decision and still applies when Sol does all work directly. Bound proposed work, not factual discovery: report a defect reachable through documented inputs, supported interfaces, or actual data, but do not invent defenses for merely theoretical cases.

Use HERO as four diagnostic questions: `H` rejects hashes, fingerprints, or manifests with no consumer or changed decision; `E` rejects defenses for inputs or threats the supported system cannot reach; `R` rejects rubrics, gates, or repeated reviews with no live uncertainty; `O` rejects wrappers, flags, compatibility layers, version trees, or guards justified mainly by other guards. Before adding any of them, name the live uncertainty it resolves, the concrete failure it can expose, the cheaper existing evidence, and the decision that changes on failure. If that answer is absent, do not add it.

Calibrate with shapes, not a checklist. Disproportionate work includes hashing spreadsheet rows when direct comparison already answers the question, writing checksum files nothing reads, hardening accounts for an app with no users or deployment, auditing a patch repeatedly while the requested feature remains unfinished, returning a failing review verdict on everything, and adding guards whose only justification is another guard. Counterexamples must remain visible: a digest that skips re-reading a large unchanged file, a rare input produced by the project's own documentation, the first real smoke run through changed behavior, and a consumer-scoped regression run after changing a shared format are proportionate when they resolve a live uncertainty and change the next action. Reachability is enough to report a suspected defect; theoretical constructibility is not enough to build a defense.

This is not a shortcut around security, migration, data integrity, release, authorization, or verification expressly required by this contract, the user, or a higher-priority instruction. Keep the primary deliverable moving, perform only the proportionate check needed to accept it, and stop when acceptance is met. Say plainly when the result is correct; when feedback challenges one part, correct that part without abandoning unaffected work. The `personalization.md` block is the account-wide main-Agent activation surface, every checked-in Worker profile carries the compact contract directly, and `skills/sol-worker-routing/SKILL.md` is the detailed source for execution and routing behavior.

## Objective

Install the checked-in `spark_scout`, `deepseek_worker`, `deepseek_pro_worker`, `luna_medium_worker`, and `luna_worker` custom agents plus the `sol-worker-routing` skill, configure the official DeepSeek API and credential, and preserve every unrelated Codex setting. `spark_scout` is an additive `gpt-5.3-codex-spark` / `xhigh` / read-only evidence lane: it returns bounded evidence and blockers, never implementation or a final decision. `luna_medium_worker` is a separate native Luna lane for narrow private task packets; it never replaces the depth-first Luna Max `luna_worker`. The supported DeepSeek models are `deepseek-v4-flash` and the separate candidate lane `deepseek-v4-pro` (V4-Pro-0813), both with the official 1,048,576-token model catalog entry and native Codex web search. Pro is an additive candidate; never replace the Flash profile with it.

Installation, implementation, and verification authorization do not authorize commit, push, merge, tag, release, deployment, or another external mutation. Obtain separate explicit user authorization for each publishing or deployment step.

## Authorized changes

The installation may manage only one state in each profile pair, plus the Skill:

```text
${CODEX_HOME:-$HOME/.codex}/agents/spark-scout.toml | spark-scout.toml.disabled
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml | luna-worker.toml.disabled
${CODEX_HOME:-$HOME/.codex}/agents/luna-medium-worker.toml | luna-medium-worker.toml.disabled
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml | deepseek-worker.toml.disabled
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-pro-worker.toml | deepseek-pro-worker.toml.disabled
$HOME/.agents/skills/sol-worker-routing/SKILL.md
```

`<profile>.toml` is enabled and `<profile>.toml.disabled` is hard-disabled for new tasks. `--lane-status`, `--enable-lane <lane|deepseek|all>`, and `--disable-lane <lane|deepseek|all>` are the only lane-state operations. `deepseek` changes both DeepSeek profiles; `all` changes the five Workers and never Sol. A DeepSeek disable must not alter the provider, credential, or model catalog.

During one installer run, hidden same-directory staging and backup files may be created beside those targets or a known removable legacy file. They are transient recovery state, must be removed on successful completion and completed rollback; if rollback cannot complete, preserve and report the backup paths for recovery. They are not installed outputs. Do not create any other durable target.

Provider setup is owned by the installing Agent, not by `scripts/install.sh`. First inspect the existing `deepseek_worker` and run a real bounded route probe. If it succeeds, preserve the provider and credential configuration exactly as it is; do not infer failure from the absence of one environment variable, keychain item, command, or platform-specific backend. Installing the Pro profile does not itself authorize changing a working provider or Flash route; it needs its own bounded read-only route probe.

Only when the provider is absent or the real invocation fails may the Agent add or repair it. Use a provider and credential mechanism supported by the current Codex client and host environment. Install the official DeepSeek model catalog at `$HOME/.codex/model-catalogs/deepseek-official.json`, the exact path referenced by the checked-in Agent profiles even when `CODEX_HOME` is customized, and verify one direct tool result plus one native web-search result for each claimed DeepSeek lane. OpenCode Go is intentionally unsupported until it exposes the Codex Responses and tool contract directly; do not install LiteLLM or another Responses-to-Chat bridge. Limit provider changes to the DeepSeek section and its credential reference, preserve all unrelated settings, back up `config.toml`, and never hard-code an operating-system credential store in this repository.

The installer may remove an old `sol-luna-workflow` Skill from either `$HOME/.agents/skills/sol-luna-workflow/SKILL.md` or `$CODEX_HOME/skills/sol-luna-workflow/SKILL.md` (or `$HOME/.codex/skills/...` when `CODEX_HOME` is unset) only when it exactly matches a documented prior release and neither the file nor its directories are symbolic links. This is a path migration, not authorization to delete other legacy Skills.

The installer may also remove `$HOME/.agents/skills/sol-worker-routing/scripts/run-deepseek-worker.sh` only when it exactly matches the documented pre-release runner that this release removes, and neither it nor its parent directory is a symbolic link. Unknown content must stop installation before any write.

Use `$CODEX_HOME` for the Agent when it is set; otherwise use `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository. Do not reproduce the copy or migration logic with broader commands.

The six final artifacts (one state file for each of five lanes plus the Skill) live in two directory trees, so the installer must not claim a cross-directory power-loss transaction. It must stage before replacement, back up pre-existing accepted files, and roll back a normal command failure or `INT`/`TERM`/`HUP`; after power loss or `SIGKILL`, final targets may be complete old/new files and hidden recovery artifacts may remain. A verified re-run converges the final targets.

For a fresh installation, all five lanes start enabled. For a recognized upgrade, preserve each existing enabled/disabled state. A newly introduced lane must start disabled; a profile that should exist for the recognized prior topology but is missing is an ambiguous partial installation and must fail closed. Unknown content, both state files present, symbolic links, and non-regular files must stop before any write. The recognized topologies are legacy v0.4 (Luna only), v0.5-v0.7 (Flash + Luna), v0.8 (Flash + Pro + Luna), v0.9 (Flash + Pro + Luna Medium + Luna), v0.10 (the five current lanes), and the current five-lane topology (Spark + Flash + Pro + Luna Medium + Luna).

Recheck managed paths and accepted content immediately before each staged write, replacement, rollback, or legacy removal. These checks stop changes the installer observes; a portable Bash script must not claim an adversarial no-follow guarantee against a concurrent parent-directory replacement.

## Prohibited changes

Do not edit or delete any other `config.toml` section, other agents, other skills, global or project `AGENTS.md` files, Codex App personalization, or unrelated content. Never ask the user to paste a DeepSeek key into chat, print it, store it in the repository, or place it directly in `config.toml`. Do not prescribe macOS Keychain, a shell environment variable, or any other credential backend as a universal requirement.

If an Agent target or the legacy Skill exists with unknown different content, both enabled and disabled state files exist, or any managed target exists but is not a regular file, stop before reading or changing anything. The installer may update the current Skill only when its digest matches the documented previous release. A different `[model_providers.deepseek]` is not a file-install conflict: test the real route and preserve it if it works. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

After installation, confirm that the five installed profile-state files and the Skill exactly match the repository sources. When a standard TOML parser is available, parse the five repository TOML profiles before any write; the exact-match check then proves the installed copies are valid too. Do not create a larger validation toolchain for this six-artifact copy.

Tell the user that `personalization.md` does not activate itself. To make HERO constrain the main Agent account-wide rather than only this repository and the installed Workers, they must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions. Do not claim account-wide HERO activation until that step is confirmed; otherwise report it as pending. Provider setup is still the installing Agent's responsibility: inspect the effective route, preserve a working setup, and repair only a proven failure using the current environment's supported mechanism. Do not send the user away to discover the TOML format or installation procedure.

After installation, run one bounded task with an obvious answer through every newly enabled claimed lane and inspect the client-exposed subagent result plus task acceptance. Spark's probe must be read-only and confirm the required evidence return shape; it is not an implementation lane. Confirm that each DeepSeek profile declares the official 1,048,576-token model context and model catalog; separately confirm that each Luna profile declares its intended model and reasoning effort. After a new provider setup or major Codex client change, use one proportionate long-context probe to confirm the effective route rather than treating TOML as proof. If the provider succeeds directly but a spawned custom-provider child loses its dynamic task payload, report the native Codex handoff failure and test native full-request mode: prefer `fork_turns="1"` when the client can combine it with the custom role. If the client rejects that combination, the only permitted fallback is a native named-child initial message that reproduces the complete current user request verbatim as its sole task; it must not add, narrow, reinterpret, or privately supplement the request. Treat either form as usable only when the current user request itself is the complete DeepSeek assignment; neither can carry a private Sol packet or reliable follow-up messages. Never replace the native worker with a direct API or `codex exec` runner. If the current task cannot discover a newly enabled agent, ask the user only to start a new task; the `sol-worker-routing` Skill must then perform the route probe before treating the native lane as available. A full App restart is a fallback only when a new task still cannot discover the agent.

Report installed paths, provider and credential status without secret material, the route-probe result, conflicts if any, and the remaining manual personalization step.
