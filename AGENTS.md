# Installation contract

This repository is designed to be handed directly to a Codex Agent for installation.

## Objective

Install the checked-in `deepseek_worker` and `luna_worker` custom agents plus the `sol-worker-routing` skill for the current user while preserving every unrelated Codex setting.

## Authorized changes

The installation may create only these targets:

```text
${CODEX_HOME:-$HOME/.codex}/agents/luna-worker.toml
${CODEX_HOME:-$HOME/.codex}/agents/deepseek-worker.toml
$HOME/.agents/skills/sol-worker-routing/SKILL.md
```

The installer may remove an old `sol-luna-workflow` Skill from either `$HOME/.agents/skills/sol-luna-workflow/SKILL.md` or `$CODEX_HOME/skills/sol-luna-workflow/SKILL.md` (or `$HOME/.codex/skills/...` when `CODEX_HOME` is unset) only when it exactly matches a documented prior release and neither the file nor its directories are symbolic links. This is a path migration, not authorization to delete other legacy Skills.

Use `$CODEX_HOME` for the Agent when it is set; otherwise use `$HOME/.codex`. User-authored Skills use `$HOME/.agents/skills`. Run `bash scripts/install.sh` from this repository. Do not reproduce the copy or migration logic with broader commands.

## Prohibited changes

Do not edit or delete `config.toml`, other agents, other skills, global or project `AGENTS.md` files, Codex App personalization, or any unrelated content.

If either target or the legacy Skill exists with different content, stop before changing anything. Show the exact conflicting path and ask the user how to proceed. Never overwrite or remove a conflict automatically.

## Verification and handoff

After installation, confirm that all three installed files exactly match the repository sources. When a standard TOML parser is available, parse the two repository TOML sources before any write; the exact-match check then proves the installed copies are valid too. Do not create a larger validation toolchain for this three-file copy.

Tell the user that `personalization.md` does not activate itself. They must manually copy one complete language block into Codex App Settings → Personalization → Custom Instructions when they want App-level personalization. `deepseek_worker` also requires an already configured DeepSeek provider and credentials; this installer must never add them to `config.toml`. Suggest starting a new task. A full restart is normally unnecessary; reopen Codex only if the newly added custom agent is not discovered.

Report installed paths, unchanged paths, verification results, conflicts if any, and the remaining manual personalization step.
