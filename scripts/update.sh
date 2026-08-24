#!/usr/bin/env bash
set -euo pipefail

updater_usage() {
  cat <<'EOF'
Usage:
  bash scripts/update.sh

Fetch the current branch's configured upstream, fast-forward this checkout,
then run scripts/install.sh.
EOF
}

updater_die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

if [[ "$#" -gt 1 ]]; then
  updater_usage >&2
  exit 64
fi

case "${1:-}" in
  "")
    ;;
  -h|--help)
    updater_usage
    exit 0
    ;;
  *)
    updater_usage >&2
    exit 64
    ;;
esac

updater_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
updater_repo_root="$(cd -- "${updater_script_dir}/.." && pwd)"
updater_installer="${updater_repo_root}/scripts/install.sh"

command -v git >/dev/null 2>&1 || updater_die "git is required."
git -C "${updater_repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || updater_die "this script must run from a Git checkout."
[[ -f "${updater_installer}" ]] || updater_die "missing scripts/install.sh."

updater_branch="$(git -C "${updater_repo_root}" symbolic-ref --quiet --short HEAD)" || updater_die "detached HEAD is not supported; switch to a tracked branch first."
updater_upstream="$(git -C "${updater_repo_root}" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}')" || updater_die "${updater_branch} has no configured upstream."
updater_remote="$(git -C "${updater_repo_root}" config --get "branch.${updater_branch}.remote")" || updater_die "${updater_branch} has no configured remote."

if ! git -C "${updater_repo_root}" diff --quiet || ! git -C "${updater_repo_root}" diff --cached --quiet; then
  updater_die "tracked changes are present; commit, stash, or discard them before updating."
fi

printf 'Fetching %s...\n' "${updater_upstream}"
git -C "${updater_repo_root}" fetch --quiet "${updater_remote}"
git -C "${updater_repo_root}" rev-parse --verify --quiet "${updater_upstream}^{commit}" >/dev/null || updater_die "cannot resolve upstream ${updater_upstream}."

if ! git -C "${updater_repo_root}" merge-base --is-ancestor HEAD "${updater_upstream}"; then
  updater_die "local ${updater_branch} is ahead of or diverged from ${updater_upstream}; resolve that branch before updating."
fi

git -C "${updater_repo_root}" merge --ff-only "${updater_upstream}"

printf 'Applying the updated workflow...\n'
bash "${updater_installer}"

updater_commit="$(git -C "${updater_repo_root}" rev-parse --short HEAD)"
if updater_tag="$(git -C "${updater_repo_root}" describe --tags --exact-match HEAD 2>/dev/null)"; then
  printf 'Updated to %s (%s).\n' "${updater_tag}" "${updater_commit}"
else
  printf 'Updated to %s.\n' "${updater_commit}"
fi
