# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## Objective

Install the checked-in `deepseek_worker` and `luna_worker` custom agents plus the `sol-worker-routing` skill, configure the selected DeepSeek upstream and credential, and preserve every unrelated Codex setting. The supported DeepSeek upstreams are the official API and OpenCode Go; OpenCode Go is limited to `deepseek-v4-flash`.

## Authorized changes

The installation may create only these targets:

```text
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml
$HOME/.agents/skills/sol-worker-routing/SKILL.md
```

Provider setup is owned by the installing Agent, not by `scripts/install.sh`. First inspect the existing `deepseek_worker` and run a real bounded route probe. If it succeeds, preserve the provider and credential configuration exactly as it is; do not infer failure from the absence of one environment variable, keychain item, command, or platform-specific backend.

Only when the provider is absent or the real invocation fails may the Agent add or repair the selected provider. Use a provider and credential mechanism supported by the current Codex client and host environment. For OpenCode Go, do not configure the OpenCode application: select the alternate Worker profile, use the repository's local LiteLLM bridge, and add only the `opencode-go` Codex provider represented by `providers/opencode-go.codex.toml`. Limit changes to that provider section and its required bridge process, preserve all unrelated settings, back up `config.toml`, and never hard-code an operating-system credential store in this repository.

The installer may remove an old `sol-luna-workflow` Skill from either `$HOME/.agents/skills/sol-luna-workflow/SKILL.md` or `$CODEX_HOME/skills/sol-luna-workflow/SKILL.md` (or `$HOME/.codex/skills/...` when `CODEX_HOME` is unset) only when it exactly matches a documented prior release and neither the file nor its directories are symbolic links. This is a path migration, not authorization to delete other legacy Skills.

Use `$CODEX_HOME` for the Agent when it is set; otherwise use `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository. Do not reproduce the copy or migration logic with broader commands.

## Prohibited changes

Do not edit or delete any other `config.toml` section, other agents, other skills, global or project `AGENTS.md` files, Codex App personalization, or unrelated content. Never ask the user to paste a DeepSeek key into chat, print it, store it in the repository, or place it directly in `config.toml`. Do not prescribe macOS Keychain, a shell environment variable, or any other credential backend as a universal requirement.

If an Agent target or the legacy Skill exists with unknown different content, stop before changing anything. The installer may update the current Skill only when its digest matches the documented previous release. A different `[model_providers.deepseek]` is not a file-install conflict: test the real route and preserve it if it works. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

After installation, confirm that all three installed files exactly match the selected repository sources. When a standard TOML parser is available, parse the three repository TOML profiles before any write; the exact-match check then proves the installed copies are valid too. Do not create a larger validation toolchain for this three-file copy.

Tell the user that `personalization.md` does not activate itself. They must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions when they want App-level personalization. Provider setup is still the installing Agent's responsibility: inspect the effective route, preserve a working setup, and repair only a proven failure using the current environment's supported mechanism. Do not send the user away to discover the TOML format or installation procedure.

After installation, run one bounded, read-only DeepSeek task with an obvious answer and inspect the client-exposed subagent result plus task acceptance. If the current task cannot discover a newly added custom agent, ask the user only to start a new task; the `sol-worker-routing` Skill must then perform the route probe before treating the lane as available. A full App restart is a fallback only when a new task still cannot discover the agent.

Report installed paths, provider and credential status without secret material, the route-probe result, conflicts if any, and the remaining manual personalization step.
