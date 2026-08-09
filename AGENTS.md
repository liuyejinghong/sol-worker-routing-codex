# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## Objective

Install the checked-in `deepseek_worker` and `luna_worker` custom agents plus the `sol-worker-routing` skill, configure the DeepSeek provider and credential, and preserve every unrelated Codex setting.

## Authorized changes

The installation may create only these targets:

```text
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml
$HOME/.agents/skills/sol-worker-routing/SKILL.md
$HOME/.agents/skills/sol-worker-routing/scripts/configure_deepseek_provider.py
```

It may also add exactly the checked-in `[model_providers.deepseek]` block to `${CODEX_HOME:-$HOME/.codex}/config.toml` when that provider is absent, and add or update the `com.openai.codex.deepseek-api-key` credential in macOS Keychain after the user enters it through the hidden Keychain prompt. Use `skills/sol-worker-routing/scripts/configure_deepseek_provider.py`; do not reproduce or broaden its configuration logic.

The installer may remove an old `sol-luna-workflow` Skill from either `$HOME/.agents/skills/sol-luna-workflow/SKILL.md` or `$CODEX_HOME/skills/sol-luna-workflow/SKILL.md` (or `$HOME/.codex/skills/...` when `CODEX_HOME` is unset) only when it exactly matches a documented prior release and neither the file nor its directories are symbolic links. This is a path migration, not authorization to delete other legacy Skills.

Use `$CODEX_HOME` for the Agent when it is set; otherwise use `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository. Do not reproduce the copy or migration logic with broader commands.

## Prohibited changes

Do not edit or delete any other `config.toml` section, other agents, other skills, global or project `AGENTS.md` files, Codex App personalization, or unrelated content. Never ask the user to paste a DeepSeek key into chat, print it, store it in the repository, or place it directly in `config.toml`.

If either target, the legacy Skill, or `[model_providers.deepseek]` exists with unknown different content, stop before changing anything. The installer may update the current Skill only when its digest matches the documented previous release. Show the exact conflicting path or section and ask the user how to proceed. Never overwrite or remove an unknown conflict automatically.

## Verification and handoff

After installation, confirm that all four installed files exactly match the repository sources. When a standard TOML parser is available, parse the two repository TOML sources before any write; the exact-match check then proves the installed copies are valid too. Do not create a larger validation toolchain for this four-file copy.

Tell the user that `personalization.md` does not activate itself. They must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions when they want App-level personalization. Provider setup is the installer's responsibility: inspect it, configure it through the checked-in script when absent, and guide only the hidden credential prompt. Do not send the user away to discover the TOML format or installation procedure.

After installation, run one bounded, read-only DeepSeek task with an obvious answer and inspect the client-exposed subagent result plus task acceptance. If the current task cannot discover a newly added custom agent, ask the user only to start a new task; the `sol-worker-routing` Skill must then perform the route probe before treating the lane as available. A full App restart is a fallback only when a new task still cannot discover the agent.

Report installed paths, provider and credential status without secret material, the route-probe result, conflicts if any, and the remaining manual personalization step.
