# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## Objective

Install the checked-in `deepseek_worker`, `deepseek_pro_worker`, and `luna_worker` custom agents plus the `sol-worker-routing` skill, configure the official DeepSeek API and credential, and preserve every unrelated Codex setting. The supported DeepSeek models are `deepseek-v4-flash` and the separate candidate lane `deepseek-v4-pro` (V4-Pro-0813), both with the official 1,048,576-token model catalog entry and native Codex web search. Pro is an additive candidate; never replace the Flash profile with it.

Installation, implementation, and verification authorization do not authorize commit, push, merge, tag, release, deployment, or another external mutation. Obtain separate explicit user authorization for each publishing or deployment step.

## Authorized changes

The installation may create only these targets:

```text
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-pro-worker.toml
$HOME/.agents/skills/sol-worker-routing/SKILL.md
```

During one installer run, hidden same-directory staging and backup files may be created beside those targets or a known removable legacy file. They are transient recovery state, must be removed on successful completion and completed rollback; if rollback cannot complete, preserve and report the backup paths for recovery. They are not installed outputs. Do not create any other durable target.

Provider setup is owned by the installing Agent, not by `scripts/install.sh`. First inspect the existing `deepseek_worker` and run a real bounded route probe. If it succeeds, preserve the provider and credential configuration exactly as it is; do not infer failure from the absence of one environment variable, keychain item, command, or platform-specific backend. Installing the Pro profile does not itself authorize changing a working provider or Flash route; it needs its own bounded read-only route probe.

Only when the provider is absent or the real invocation fails may the Agent add or repair it. Use a provider and credential mechanism supported by the current Codex client and host environment. Install the official DeepSeek model catalog at `$HOME/.codex/model-catalogs/deepseek-official.json`, the exact path referenced by the checked-in Agent profiles even when `CODEX_HOME` is customized, and verify one direct tool result plus one native web-search result for each claimed DeepSeek lane. OpenCode Go is intentionally unsupported until it exposes the Codex Responses and tool contract directly; do not install LiteLLM or another Responses-to-Chat bridge. Limit provider changes to the DeepSeek section and its credential reference, preserve all unrelated settings, back up `config.toml`, and never hard-code an operating-system credential store in this repository.

The installer may remove an old `sol-luna-workflow` Skill from either `$HOME/.agents/skills/sol-luna-workflow/SKILL.md` or `$CODEX_HOME/skills/sol-luna-workflow/SKILL.md` (or `$HOME/.codex/skills/...` when `CODEX_HOME` is unset) only when it exactly matches a documented prior release and neither the file nor its directories are symbolic links. This is a path migration, not authorization to delete other legacy Skills.

The installer may also remove `$HOME/.agents/skills/sol-worker-routing/scripts/run-deepseek-worker.sh` only when it exactly matches the documented pre-release runner that this release removes, and neither it nor its parent directory is a symbolic link. Unknown content must stop installation before any write.

Use `$CODEX_HOME` for the Agent when it is set; otherwise use `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository. Do not reproduce the copy or migration logic with broader commands.

The four final files live in two directory trees, so the installer must not claim a cross-directory power-loss transaction. It must stage before replacement, back up pre-existing accepted files, and roll back a normal command failure or `INT`/`TERM`/`HUP`; after power loss or `SIGKILL`, final targets may be complete old/new files and hidden recovery artifacts may remain. A verified re-run converges the final targets.

Recheck managed paths and accepted content immediately before each staged write, replacement, rollback, or legacy removal. These checks stop changes the installer observes; a portable Bash script must not claim an adversarial no-follow guarantee against a concurrent parent-directory replacement.

## Prohibited changes

Do not edit or delete any other `config.toml` section, other agents, other skills, global or project `AGENTS.md` files, Codex App personalization, or unrelated content. Never ask the user to paste a DeepSeek key into chat, print it, store it in the repository, or place it directly in `config.toml`. Do not prescribe macOS Keychain, a shell environment variable, or any other credential backend as a universal requirement.

If an Agent target or the legacy Skill exists with unknown different content, stop before changing anything. The installer may update the current Skill only when its digest matches the documented previous release. A different `[model_providers.deepseek]` is not a file-install conflict: test the real route and preserve it if it works. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

After installation, confirm that all four installed files exactly match the repository sources. When a standard TOML parser is available, parse the three repository TOML profiles before any write; the exact-match check then proves the installed copies are valid too. Do not create a larger validation toolchain for this four-file copy.

Tell the user that `personalization.md` does not activate itself. They must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions when they want App-level personalization. Provider setup is still the installing Agent's responsibility: inspect the effective route, preserve a working setup, and repair only a proven failure using the current environment's supported mechanism. Do not send the user away to discover the TOML format or installation procedure.

After installation, run one bounded task with an obvious answer through the newly claimed DeepSeek lane and inspect the client-exposed subagent result plus task acceptance. Confirm that each Worker profile declares the official 1,048,576-token model context and model catalog. After a new provider setup or major Codex client change, use one proportionate long-context probe to confirm the effective route rather than treating TOML as proof. If the provider succeeds directly but a spawned custom-provider child loses its dynamic task payload, report the native Codex handoff failure and test native full-request mode: prefer `fork_turns="1"` when the client can combine it with the custom role. If the client rejects that combination, the only permitted fallback is a native named-child initial message that reproduces the complete current user request verbatim as its sole task; it must not add, narrow, reinterpret, or privately supplement the request. Treat either form as usable only when the current user request itself is the complete DeepSeek assignment; neither can carry a private Sol packet or reliable follow-up messages. Never replace the native worker with a direct API or `codex exec` runner. If the current task cannot discover a newly added custom agent, ask the user only to start a new task; the `sol-worker-routing` Skill must then perform the route probe before treating the native lane as available. A full App restart is a fallback only when a new task still cannot discover the agent.

Report installed paths, provider and credential status without secret material, the route-probe result, conflicts if any, and the remaining manual personalization step.
