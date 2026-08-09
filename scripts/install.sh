#!/usr/bin/env bash
set -euo pipefail

installer_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
installer_repo_root="$(cd -- "${installer_script_dir}/.." && pwd)"
installer_home_dir="${HOME:?HOME is not set}"
installer_requested_deepseek_provider="auto"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --deepseek-provider)
      [[ "$#" -ge 2 ]] || { echo "Error: --deepseek-provider requires deepseek-api or opencode-go." >&2; exit 64; }
      installer_requested_deepseek_provider="$2"
      shift 2
      ;;
    --deepseek-provider=*)
      installer_requested_deepseek_provider="${1#*=}"
      shift
      ;;
    -h|--help)
      echo "Usage: bash scripts/install.sh [--deepseek-provider deepseek-api|opencode-go]"
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      exit 64
      ;;
  esac
done

case "${installer_requested_deepseek_provider}" in
  auto|deepseek-api|opencode-go) ;;
  *)
    echo "Error: --deepseek-provider must be deepseek-api or opencode-go." >&2
    exit 64
    ;;
esac

if [[ "${installer_home_dir}" != /* ]]; then
  echo "Error: HOME must be an absolute path: ${installer_home_dir}" >&2
  exit 1
fi

if [[ -n "${CODEX_HOME:-}" ]]; then
  installer_codex_dir="${CODEX_HOME}"
else
  installer_codex_dir="${installer_home_dir}/.codex"
fi

if [[ "${installer_codex_dir}" != /* ]]; then
  echo "Error: Codex home must be an absolute path: ${installer_codex_dir}" >&2
  exit 1
fi

installer_luna_agent_source="${installer_repo_root}/agents/luna-worker.toml"
installer_deepseek_api_agent_source="${installer_repo_root}/agents/deepseek-worker.toml"
installer_opencode_go_agent_source="${installer_repo_root}/agents/deepseek-worker.opencode-go.toml"
installer_skill_source="${installer_repo_root}/skills/sol-worker-routing/SKILL.md"
installer_agent_dir="${installer_codex_dir}/agents"
installer_user_agents_dir="${installer_home_dir}/.agents"
installer_user_skills_dir="${installer_user_agents_dir}/skills"
installer_skill_dir="${installer_user_skills_dir}/sol-worker-routing"
installer_legacy_user_skill_dir="${installer_user_skills_dir}/sol-luna-workflow"
installer_legacy_codex_skills_dir="${installer_codex_dir}/skills"
installer_legacy_codex_skill_dir="${installer_legacy_codex_skills_dir}/sol-luna-workflow"
installer_luna_agent_target="${installer_agent_dir}/luna-worker.toml"
installer_deepseek_agent_target="${installer_agent_dir}/deepseek-worker.toml"
installer_skill_target="${installer_skill_dir}/SKILL.md"
installer_legacy_skill_dirs=(
  "${installer_legacy_user_skill_dir}"
  "${installer_legacy_codex_skill_dir}"
)

if [[ "${installer_requested_deepseek_provider}" == "opencode-go" ]] || \
   { [[ "${installer_requested_deepseek_provider}" == "auto" ]] && \
     [[ -f "${installer_deepseek_agent_target}" ]] && \
     { cmp -s "${installer_opencode_go_agent_source}" "${installer_deepseek_agent_target}" || \
       grep -Fqx 'model_provider = "opencode-go"' "${installer_deepseek_agent_target}"; }; }; then
  installer_deepseek_agent_source="${installer_opencode_go_agent_source}"
  installer_effective_deepseek_provider="opencode-go"
else
  installer_deepseek_agent_source="${installer_deepseek_api_agent_source}"
  installer_effective_deepseek_provider="deepseek-api"
fi
# Exact Skill contents from v0.4.1 and the pre-release v0.5.0 source. These
# digests are only deletion proofs for the renamed legacy path.
installer_known_legacy_skill_digests=(
  "537eadf761d05384773dad3e4729fa84f0e560f1f6abe4e38fb1a15b9e7528b5"
  "81bfe080ae24ed0e9d365479dbe2b099b904363fc36def9c9154a318e72124fb"
)
# Exact installed Skill content from the previous repository release. This is
# the only in-place upgrade source accepted for the current Skill path.
installer_known_current_skill_digests=(
  "b1eb8288545514c4fcaeb74b37f9a69ea129e5f3bb2fb91eaadee97ac85baec5"
  "468a66d39f195d736e087bd5a93b3dc596bc9196a7b847cc0681a8dcf9c8b864"
  "1565fc570b2f211f78fb76fe2b17bd2f8bb6a6ad9ac71827479681c3208e41f2"
  "87394123a55ec8d592b6626529f7fc38ca9065fdd8d7a10b2a02451e91f17cda"
  "4697d4c44a11ca3efcd731f607d16b353bf8efb1e87112732bc3b4794996d055"
)
installer_known_deepseek_agent_digests=(
  "2e2fac3012c1df89fb6c16762a83a10272d75dfe763e8330c47062f957b39622"
  "e295a298df1fa9b1e3edfea0fd85f64d41ec72c0c7239b518aee93a72ced9dbb"
  "d6425cc47e1b68ea3074b8b9c3e22066a53b9bc300dcc6c80e0acdf940af0cc9"
)
installer_conflict=0

installer_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -- "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum -- "$1" | awk '{print $1}'
  else
    return 1
  fi
}

installer_is_known_legacy_skill() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_legacy_skill_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_current_skill() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_current_skill_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_deepseek_agent() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_deepseek_agent_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_target_is_accepted() {
  local installer_source="$1"
  local installer_target="$2"
  cmp -s "${installer_source}" "${installer_target}" && return 0
  if [[ "${installer_target}" == "${installer_deepseek_agent_target}" ]] && \
     { cmp -s "${installer_deepseek_api_agent_source}" "${installer_target}" || cmp -s "${installer_opencode_go_agent_source}" "${installer_target}"; }; then
    return 0
  fi
  if [[ "${installer_target}" == "${installer_deepseek_agent_target}" ]] && installer_is_known_deepseek_agent "${installer_target}"; then
    return 0
  fi
  if [[ "${installer_target}" == "${installer_skill_target}" ]] && installer_is_known_current_skill "${installer_target}"; then
    return 0
  fi
  return 1
}

for installer_dir in \
  "${installer_codex_dir}" \
  "${installer_agent_dir}" \
  "${installer_user_agents_dir}" \
  "${installer_user_skills_dir}" \
  "${installer_skill_dir}" \
  "${installer_legacy_user_skill_dir}" \
  "${installer_legacy_codex_skills_dir}" \
  "${installer_legacy_codex_skill_dir}"
do
  if [[ -L "${installer_dir}" ]]; then
    echo "Conflict: installer path uses a symbolic link and requires manual migration: ${installer_dir}" >&2
    installer_conflict=1
  fi
done

for installer_target in \
  "${installer_luna_agent_target}" \
  "${installer_deepseek_agent_target}" \
  "${installer_skill_target}"
do
  if [[ -L "${installer_target}" ]]; then
    echo "Conflict: installer target uses a symbolic link and requires manual migration: ${installer_target}" >&2
    installer_conflict=1
  fi
done

for installer_pair in \
  "${installer_luna_agent_source}|${installer_luna_agent_target}" \
  "${installer_deepseek_agent_source}|${installer_deepseek_agent_target}" \
  "${installer_skill_source}|${installer_skill_target}"
do
  installer_source="${installer_pair%%|*}"
  installer_target="${installer_pair#*|}"
  if [[ ( -e "${installer_target}" || -L "${installer_target}" ) ]] && ! installer_target_is_accepted "${installer_source}" "${installer_target}"; then
    echo "Conflict: ${installer_target} already exists with different content." >&2
    installer_conflict=1
  fi
done

for installer_legacy_skill_dir in "${installer_legacy_skill_dirs[@]}"; do
  installer_legacy_skill_target="${installer_legacy_skill_dir}/SKILL.md"
  if [[ -e "${installer_legacy_skill_target}" ]]; then
    if [[ ! -f "${installer_legacy_skill_target}" ]]; then
      echo "Conflict: legacy Skill is not a regular file: ${installer_legacy_skill_target}" >&2
      installer_conflict=1
    elif ! installer_is_known_legacy_skill "${installer_legacy_skill_target}"; then
      echo "Conflict: legacy Skill has unknown content and requires manual migration: ${installer_legacy_skill_target}" >&2
      installer_conflict=1
    fi
  fi
done

if [[ "${installer_conflict}" -ne 0 ]]; then
  echo "No files were changed. Resolve the conflict explicitly, then run the installer again." >&2
  exit 2
fi

if command -v python3 >/dev/null 2>&1 && python3 -c 'import tomllib' >/dev/null 2>&1; then
  python3 -c 'import sys, tomllib; [tomllib.load(open(path, "rb")) for path in sys.argv[1:]]' \
    "${installer_luna_agent_source}" "${installer_deepseek_api_agent_source}" "${installer_opencode_go_agent_source}"
  echo "Verified: repository agent TOML files parse with tomllib."
fi

mkdir -p -- "${installer_agent_dir}" "${installer_skill_dir}"

for installer_pair in \
  "${installer_luna_agent_source}|${installer_luna_agent_target}" \
  "${installer_deepseek_agent_source}|${installer_deepseek_agent_target}" \
  "${installer_skill_source}|${installer_skill_target}"
do
  installer_source="${installer_pair%%|*}"
  installer_target="${installer_pair#*|}"
  if [[ ! -e "${installer_target}" && ! -L "${installer_target}" ]]; then
    install -m 0644 "${installer_source}" "${installer_target}"
    echo "Installed: ${installer_target}"
  elif ! cmp -s "${installer_source}" "${installer_target}"; then
    install -m 0644 "${installer_source}" "${installer_target}"
    echo "Updated known prior release: ${installer_target}"
  else
    echo "Unchanged: ${installer_target}"
  fi
  cmp -s "${installer_source}" "${installer_target}"
done

for installer_legacy_skill_dir in "${installer_legacy_skill_dirs[@]}"; do
  installer_legacy_skill_target="${installer_legacy_skill_dir}/SKILL.md"
  installer_legacy_parent_dir="$(dirname -- "${installer_legacy_skill_dir}")"
  if [[ -e "${installer_legacy_skill_target}" ]]; then
    if [[ -L "${installer_legacy_parent_dir}" || -L "${installer_legacy_skill_dir}" || -L "${installer_legacy_skill_target}" || ! -f "${installer_legacy_skill_target}" ]] || ! installer_is_known_legacy_skill "${installer_legacy_skill_target}"; then
      echo "Error: legacy Skill changed during installation; refusing to remove: ${installer_legacy_skill_target}" >&2
      exit 3
    fi
    rm -- "${installer_legacy_skill_target}"
    rmdir -- "${installer_legacy_skill_dir}" 2>/dev/null || true
    echo "Migrated: removed known legacy Skill at ${installer_legacy_skill_target}"
  fi
done

echo "Verified: installed files match the repository sources."
echo "DeepSeek provider profile: ${installer_effective_deepseek_provider}"
echo "Manual step: paste one block from ${installer_repo_root}/personalization.md into Codex App Settings > Personalization > Custom Instructions."
