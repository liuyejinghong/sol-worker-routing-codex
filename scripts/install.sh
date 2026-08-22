#!/usr/bin/env bash
set -euo pipefail

installer_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
installer_repo_root="$(cd -- "${installer_script_dir}/.." && pwd)"
installer_host_os="$(uname -s 2>/dev/null || true)"

installer_normalize_path() {
  local installer_path="$1"

  case "${installer_host_os}" in
    MINGW*|MSYS*|CYGWIN*)
      if [[ "${installer_path}" =~ ^[A-Za-z]:[\\/].* ]]; then
        if ! command -v cygpath >/dev/null 2>&1; then
          echo "Error: Windows drive paths require cygpath in Git Bash/MSYS; use a POSIX path such as /c/Users/you." >&2
          return 1
        fi
        cygpath -u "${installer_path}"
        return
      fi
      ;;
  esac

  printf '%s\n' "${installer_path}"
}

if [[ -n "${SOL_WORKER_ROUTING_TEST_HOME:-}" ]]; then
  installer_home_input="${SOL_WORKER_ROUTING_TEST_HOME}"
else
  installer_home_input="${HOME:?HOME is not set}"
fi
installer_home_dir="$(installer_normalize_path "${installer_home_input}")" || exit 1
installer_mode="install"
installer_requested_lane=""

installer_set_mode() {
  local installer_next_mode="$1"

  if [[ "${installer_mode}" != "install" && "${installer_mode}" != "${installer_next_mode}" ]]; then
    echo "Error: choose only one of --lane-status, --enable-lane, or --disable-lane." >&2
    exit 64
  fi
  installer_mode="${installer_next_mode}"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --lane-status)
      installer_set_mode "status"
      shift
      ;;
    --enable-lane)
      [[ "$#" -ge 2 ]] || { echo "Error: --enable-lane requires a lane name." >&2; exit 64; }
      installer_set_mode "enable"
      [[ -z "${installer_requested_lane}" ]] || { echo "Error: specify one lane selection." >&2; exit 64; }
      installer_requested_lane="$2"
      shift 2
      ;;
    --enable-lane=*)
      installer_set_mode "enable"
      [[ -z "${installer_requested_lane}" ]] || { echo "Error: specify one lane selection." >&2; exit 64; }
      installer_requested_lane="${1#*=}"
      shift
      ;;
    --disable-lane)
      [[ "$#" -ge 2 ]] || { echo "Error: --disable-lane requires a lane name." >&2; exit 64; }
      installer_set_mode "disable"
      [[ -z "${installer_requested_lane}" ]] || { echo "Error: specify one lane selection." >&2; exit 64; }
      installer_requested_lane="$2"
      shift 2
      ;;
    --disable-lane=*)
      installer_set_mode "disable"
      [[ -z "${installer_requested_lane}" ]] || { echo "Error: specify one lane selection." >&2; exit 64; }
      installer_requested_lane="${1#*=}"
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  bash scripts/install.sh
  bash scripts/install.sh --lane-status
  bash scripts/install.sh --enable-lane <lane|all>
  bash scripts/install.sh --disable-lane <lane|all>

Lanes: luna_medium_worker, luna_worker.
EOF
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      exit 64
      ;;
  esac
done

if [[ "${installer_home_dir}" != /* ]]; then
  echo "Error: HOME must be an absolute path: ${installer_home_dir}" >&2
  exit 1
fi

if [[ -n "${CODEX_HOME:-}" ]]; then
  installer_codex_dir="$(installer_normalize_path "${CODEX_HOME}")" || exit 1
else
  installer_codex_dir="${installer_home_dir}/.codex"
fi

if [[ "${installer_codex_dir}" != /* ]]; then
  echo "Error: Codex home must be an absolute path: ${installer_codex_dir}" >&2
  exit 1
fi

installer_luna_agent_source="${installer_repo_root}/agents/luna-worker.toml"
installer_luna_medium_agent_source="${installer_repo_root}/agents/luna-medium-worker.toml"
installer_skill_source="${installer_repo_root}/skills/sol-worker-routing/SKILL.md"
installer_agent_dir="${installer_codex_dir}/agents"
installer_user_agents_dir="${installer_home_dir}/.agents"
installer_user_skills_dir="${installer_user_agents_dir}/skills"
installer_skill_dir="${installer_user_skills_dir}/sol-worker-routing"
installer_skill_scripts_dir="${installer_skill_dir}/scripts"
installer_legacy_user_skill_dir="${installer_user_skills_dir}/sol-luna-workflow"
installer_legacy_codex_skills_dir="${installer_codex_dir}/skills"
installer_legacy_codex_skill_dir="${installer_legacy_codex_skills_dir}/sol-luna-workflow"
installer_luna_agent_target="${installer_agent_dir}/luna-worker.toml"
installer_luna_medium_agent_target="${installer_agent_dir}/luna-medium-worker.toml"
installer_deepseek_agent_target="${installer_agent_dir}/deepseek-worker.toml"
installer_deepseek_pro_agent_target="${installer_agent_dir}/deepseek-pro-worker.toml"
installer_spark_scout_agent_target="${installer_agent_dir}/spark-scout.toml"
installer_skill_target="${installer_skill_dir}/SKILL.md"
installer_removed_runner_target="${installer_skill_scripts_dir}/run-deepseek-worker.sh"
installer_legacy_skill_dirs=(
  "${installer_legacy_user_skill_dir}"
  "${installer_legacy_codex_skill_dir}"
)
installer_install_pairs=(
  "${installer_luna_agent_source}|${installer_luna_agent_target}"
  "${installer_luna_medium_agent_source}|${installer_luna_medium_agent_target}"
  "${installer_skill_source}|${installer_skill_target}"
)
installer_lanes=(
  "luna_medium_worker"
  "luna_worker"
)
installer_retired_profile_targets=(
  "${installer_spark_scout_agent_target}"
  "${installer_spark_scout_agent_target}.disabled"
  "${installer_deepseek_agent_target}"
  "${installer_deepseek_agent_target}.disabled"
  "${installer_deepseek_pro_agent_target}"
  "${installer_deepseek_pro_agent_target}.disabled"
)
installer_retired_profile_bases=(
  "${installer_spark_scout_agent_target}"
  "${installer_deepseek_agent_target}"
  "${installer_deepseek_pro_agent_target}"
)
installer_state_removal_targets=()
installer_state_removal_descriptions=()
installer_guarded_dirs=(
  "${installer_codex_dir}"
  "${installer_agent_dir}"
  "${installer_user_agents_dir}"
  "${installer_user_skills_dir}"
  "${installer_skill_dir}"
  "${installer_skill_scripts_dir}"
  "${installer_legacy_user_skill_dir}"
  "${installer_legacy_codex_skills_dir}"
  "${installer_legacy_codex_skill_dir}"
)

# Exact Skill contents from v0.4.1 and the pre-release v0.5.0 source. These
# digests are only deletion proofs for the renamed legacy path.
installer_known_legacy_skill_digests=(
  "537eadf761d05384773dad3e4729fa84f0e560f1f6abe4e38fb1a15b9e7528b5"
  "81bfe080ae24ed0e9d365479dbe2b099b904363fc36def9c9154a318e72124fb"
)
# Exact installed Skill content from the previous repository release. This is
# the only in-place upgrade source accepted for the current Skill path.
installer_known_current_skill_digests=(
  "f0f5b4ccc60365268f1c63ddfc0d967069a647293be97b3eb954355d786aa498"
  "b1eb8288545514c4fcaeb74b37f9a69ea129e5f3bb2fb91eaadee97ac85baec5"
  "468a66d39f195d736e087bd5a93b3dc596bc9196a7b847cc0681a8dcf9c8b864"
  "1565fc570b2f211f78fb76fe2b17bd2f8bb6a6ad9ac71827479681c3208e41f2"
  "87394123a55ec8d592b6626529f7fc38ca9065fdd8d7a10b2a02451e91f17cda"
  "4697d4c44a11ca3efcd731f607d16b353bf8efb1e87112732bc3b4794996d055"
  "014de56a672fa868cc24318e6124ce2706f750979d038a7f4a9ac986e19fb18a"
  "375a39d9c168d689ee5ab32dc9622a2493eef3db1f4dc1247ebe35cf93a9e1c2"
  "e255886bddead4c5b7911d43c7853fe5175ceeea3bd235e00f6a2b3540fd1322"
  "f5a5a26baf0827f1f92cde79745b87b327535948de3ce56d1c38e09f924e852c"
  "2bd841aebe5b767a7d5a3ce9c3fac1366e09901a15060be873a155b8a7639ca7"
  "dcb0bc77f53ae8d88df0de6960633e7b4cf9a84dc6fd2728baba300a270a8eba"
  "ad8925fad92814ad0b6735af094117c2560c9c1033a4334ad47c22cbad7d1586"
  "69e4a78c924e92fde3432311f186d3303af39aa7ad156ac48e8ab2ad5d381184"
)
installer_known_deepseek_agent_digests=(
  "2e2fac3012c1df89fb6c16762a83a10272d75dfe763e8330c47062f957b39622"
  "e295a298df1fa9b1e3edfea0fd85f64d41ec72c0c7239b518aee93a72ced9dbb"
  "d6425cc47e1b68ea3074b8b9c3e22066a53b9bc300dcc6c80e0acdf940af0cc9"
  "5ca4b64d7fb37bdf10844bc24d434871d2f3fa38c0f12a4f2e4a51b2860e1bb8"
  "e98e09dd60ecec0ceb57064b35b9f3f196178db3e2cf19c4617347db2d983790"
  "6abaca2b89805cfcfeef02f8d8029cab529fc5d728993e5beebf9e768d9bd5cc"
  "623764be77c410dd4029c44d77390fd355f535dd8bb49198c1629e028e49481a"
  "fb5a0ef67350a5fe3bae254b20f84aaf663f6ae93c05c273cf79591193979ccb"
)
# Exact accepted profile contents from supported prior releases. A target only
# accepts its own listed content; append the prior digest before changing that
# profile in a future release.
installer_known_luna_agent_digests=(
  "86021a3589f2676e8512d71a7aa16c9942d7109b6cc61b13dd37960abbeb2296"
  "260d2b6a9542c56960a8ab62fd2e6f2279c3c859bec04570234a3aba89ff6cfe"
)
installer_known_luna_medium_agent_digests=(
  "c579d8e0512711cd9c057fc606a54af4dab58bfcb0c70accf5f3667eed9659a5"
)
installer_known_deepseek_pro_agent_digests=(
  "caa264733598b9ee88df85d374adf86cc2dfdd6df35ed086b7b68d37cf282617"
  "e1a31fe73bce8c399b37f01db37c74f7756703c93dd5490786d2e3aec78dc215"
)
installer_known_spark_scout_agent_digests=(
  # Known pre-release profile installed before the 128K context declaration.
  "78f918e9e2b63dc11bbff5e389b493a624d7d92ecba3f5d43e935b87754b1c99"
  "90521174a00a29ca51a754c584abfe7f0866118cb8c1544a2bbf96f277de2970"
  "73d85fa77925da1d847afa104f85bcb7e64c1507f22f67aad8df5bf96570252c"
)
installer_known_removed_runner_digests=(
  "45114d158faf6016950b70c21087d33587ab7098daf835ce62e9eb69667abf77"
)
installer_conflict=0
installer_staged_sources=()
installer_staged_targets=()
installer_staged_files=()
installer_target_backup_files=()
installer_target_existed=()
installer_migration_targets=()
installer_migration_backup_files=()
installer_removed_migration_indexes=()
installer_committed_target_indexes=()
installer_transaction_started=0
installer_transaction_complete=0

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

installer_is_known_luna_agent() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_luna_agent_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_luna_medium_agent() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_luna_medium_agent_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_deepseek_pro_agent() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_deepseek_pro_agent_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_spark_scout_agent() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_spark_scout_agent_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_is_known_removed_runner() {
  local installer_digest
  local installer_known_digest
  installer_digest="$(installer_sha256 "$1")" || return 1
  for installer_known_digest in "${installer_known_removed_runner_digests[@]}"; do
    [[ "${installer_digest}" == "${installer_known_digest}" ]] && return 0
  done
  return 1
}

installer_lane_source() {
  case "$1" in
    luna_medium_worker) printf '%s\n' "${installer_luna_medium_agent_source}" ;;
    luna_worker) printf '%s\n' "${installer_luna_agent_source}" ;;
    *) return 64 ;;
  esac
}

installer_lane_target() {
  case "$1" in
    luna_medium_worker) printf '%s\n' "${installer_luna_medium_agent_target}" ;;
    luna_worker) printf '%s\n' "${installer_luna_agent_target}" ;;
    *) return 64 ;;
  esac
}

installer_lane_disabled_target() {
  printf '%s.disabled\n' "$(installer_lane_target "$1")"
}

installer_target_base_path() {
  case "$1" in
    *.toml.disabled) printf '%s\n' "${1%.disabled}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

installer_target_is_accepted() {
  local installer_source="$1"
  local installer_target="$2"
  local installer_target_base

  # Never let cmp or a digest read a FIFO, device, directory, or symlink.
  # The caller may be checking a target before it has been staged, so a
  # missing target remains simply unaccepted rather than an installer error.
  if [[ -L "${installer_target}" || ! -f "${installer_target}" ]]; then
    return 1
  fi

  cmp -s "${installer_source}" "${installer_target}" && return 0
  installer_target_base="$(installer_target_base_path "${installer_target}")"
  if [[ "${installer_target_base}" == "${installer_luna_agent_target}" ]] && installer_is_known_luna_agent "${installer_target}"; then
    return 0
  fi
  if [[ "${installer_target_base}" == "${installer_luna_medium_agent_target}" ]] && installer_is_known_luna_medium_agent "${installer_target}"; then
    return 0
  fi
  if [[ "${installer_target}" == "${installer_skill_target}" ]] && installer_is_known_current_skill "${installer_target}"; then
    return 0
  fi
  return 1
}

installer_detect_lane_state() {
  local installer_lane="$1"
  local installer_source
  local installer_target
  local installer_disabled_target

  installer_source="$(installer_lane_source "${installer_lane}")" || return 1
  installer_target="$(installer_lane_target "${installer_lane}")" || return 1
  installer_disabled_target="$(installer_lane_disabled_target "${installer_lane}")" || return 1
  if [[ -L "${installer_target}" || -L "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-nonregular"
  elif [[ -e "${installer_target}" && ! -f "${installer_target}" ]] || [[ -e "${installer_disabled_target}" && ! -f "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-nonregular"
  elif [[ -e "${installer_target}" && -e "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-dual"
  elif [[ -e "${installer_target}" ]]; then
    if installer_target_is_accepted "${installer_source}" "${installer_target}"; then
      printf '%s\n' "enabled"
    else
      printf '%s\n' "conflict-unknown"
    fi
  elif [[ -e "${installer_disabled_target}" ]]; then
    if installer_target_is_accepted "${installer_source}" "${installer_disabled_target}"; then
      printf '%s\n' "disabled"
    else
      printf '%s\n' "conflict-unknown"
    fi
  else
    printf '%s\n' "missing"
  fi
}

installer_current_skill_generation() {
  local installer_digest

  [[ -f "${installer_skill_target}" && ! -L "${installer_skill_target}" ]] || return 1
  installer_digest="$(installer_sha256 "${installer_skill_target}")" || return 1
  case "${installer_digest}" in
    69e4a78c924e92fde3432311f186d3303af39aa7ad156ac48e8ab2ad5d381184)
      printf '%s\n' "v0.12"
      ;;
    ad8925fad92814ad0b6735af094117c2560c9c1033a4334ad47c22cbad7d1586)
      printf '%s\n' "v0.11"
      ;;
    dcb0bc77f53ae8d88df0de6960633e7b4cf9a84dc6fd2728baba300a270a8eba)
      printf '%s\n' "v0.10"
      ;;
    f5a5a26baf0827f1f92cde79745b87b327535948de3ce56d1c38e09f924e852c)
      printf '%s\n' "v0.9"
      ;;
    2bd841aebe5b767a7d5a3ce9c3fac1366e09901a15060be873a155b8a7639ca7)
      printf '%s\n' "v0.8"
      ;;
    *)
      if cmp -s "${installer_skill_source}" "${installer_skill_target}"; then
        printf '%s\n' "current"
      elif installer_is_known_current_skill "${installer_skill_target}"; then
        printf '%s\n' "v0.5-v0.7"
      else
        return 1
      fi
      ;;
  esac
}

installer_generation_requires_lane() {
  case "$1:$2" in
    legacy-v0.4:luna_worker|v0.5-v0.7:luna_worker|v0.8:luna_worker|v0.9:luna_medium_worker|v0.9:luna_worker|v0.10:luna_medium_worker|v0.10:luna_worker|v0.11:luna_medium_worker|v0.11:luna_worker|v0.12:luna_medium_worker|v0.12:luna_worker|current:luna_medium_worker|current:luna_worker)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

installer_is_known_managed_lane_file() {
  local installer_target="$1"
  local installer_target_base
  local installer_lane

  installer_target_base="$(installer_target_base_path "${installer_target}")"
  for installer_lane in "${installer_lanes[@]}"; do
    if [[ "${installer_target_base}" == "$(installer_lane_target "${installer_lane}")" ]]; then
      installer_target_is_accepted "$(installer_lane_source "${installer_lane}")" "${installer_target}"
      return
    fi
  done
  return 1
}

installer_is_known_retired_profile() {
  local installer_target="$1"
  local installer_target_base

  installer_target_base="$(installer_target_base_path "${installer_target}")"
  case "${installer_target_base}" in
    "${installer_spark_scout_agent_target}") installer_is_known_spark_scout_agent "${installer_target}" ;;
    "${installer_deepseek_agent_target}") installer_is_known_deepseek_agent "${installer_target}" ;;
    "${installer_deepseek_pro_agent_target}") installer_is_known_deepseek_pro_agent "${installer_target}" ;;
    *) return 1 ;;
  esac
}

installer_detect_retired_profile_state() {
  local installer_target="$1"
  local installer_disabled_target="${installer_target}.disabled"

  if [[ -L "${installer_target}" || -L "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-nonregular"
  elif [[ -e "${installer_target}" && ! -f "${installer_target}" ]] || [[ -e "${installer_disabled_target}" && ! -f "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-nonregular"
  elif [[ -e "${installer_target}" && -e "${installer_disabled_target}" ]]; then
    printf '%s\n' "conflict-dual"
  elif [[ -e "${installer_target}" ]]; then
    installer_is_known_retired_profile "${installer_target}" && printf '%s\n' "known-enabled" || printf '%s\n' "conflict-unknown"
  elif [[ -e "${installer_disabled_target}" ]]; then
    installer_is_known_retired_profile "${installer_disabled_target}" && printf '%s\n' "known-disabled" || printf '%s\n' "conflict-unknown"
  else
    printf '%s\n' "absent"
  fi
}

installer_assert_target_is_regular_if_present() {
  local installer_target="$1"

  if [[ -e "${installer_target}" ]] && [[ ! -f "${installer_target}" ]]; then
    echo "Error: installer target is not a regular file; refusing to read or overwrite: ${installer_target}" >&2
    return 1
  fi

  return 0
}

installer_assert_guarded_paths_safe() {
  local installer_dir

  for installer_dir in "${installer_guarded_dirs[@]}"; do
    if [[ -L "${installer_dir}" ]]; then
      echo "Error: installer path changed to a symbolic link during installation; refusing to write: ${installer_dir}" >&2
      return 1
    fi
  done

  return 0
}

installer_assert_target_still_accepted() {
  local installer_source="$1"
  local installer_target="$2"

  installer_assert_guarded_paths_safe || return 1
  if [[ -L "${installer_target}" ]]; then
    echo "Error: installer target changed to a symbolic link during installation; refusing to write: ${installer_target}" >&2
    return 1
  fi
  installer_assert_target_is_regular_if_present "${installer_target}" || return 1
  if [[ -e "${installer_target}" ]] && ! installer_target_is_accepted "${installer_source}" "${installer_target}"; then
    echo "Error: installer target changed to unknown content during installation; refusing to overwrite: ${installer_target}" >&2
    return 1
  fi

  return 0
}

installer_cleanup_staged_files() {
  local installer_staged_file
  local installer_cleanup_failed=0

  for installer_staged_file in "${installer_staged_files[@]-}"; do
    if [[ -e "${installer_staged_file}" || -L "${installer_staged_file}" ]]; then
      if ! rm -f -- "${installer_staged_file}"; then
        echo "Error: failed to remove installer staging file: ${installer_staged_file}" >&2
        installer_cleanup_failed=1
      fi
    fi
  done

  [[ "${installer_cleanup_failed}" -eq 0 ]]
}

installer_cleanup_backup_files() {
  local installer_backup_file
  local installer_cleanup_failed=0

  for installer_backup_file in "${installer_target_backup_files[@]-}" "${installer_migration_backup_files[@]-}"; do
    if [[ -e "${installer_backup_file}" || -L "${installer_backup_file}" ]]; then
      if ! rm -f -- "${installer_backup_file}"; then
        echo "Error: failed to remove installer backup file: ${installer_backup_file}" >&2
        installer_cleanup_failed=1
      fi
    fi
  done

  [[ "${installer_cleanup_failed}" -eq 0 ]]
}

installer_report_recovery_backups() {
  local installer_backup_file

  for installer_backup_file in "${installer_target_backup_files[@]-}" "${installer_migration_backup_files[@]-}"; do
    if [[ -e "${installer_backup_file}" || -L "${installer_backup_file}" ]]; then
      echo "Recovery backup preserved: ${installer_backup_file}" >&2
    fi
  done
}

installer_stage_target() {
  local installer_source="$1"
  local installer_target="$2"
  local installer_target_dir
  local installer_target_name
  local installer_staged_file

  installer_assert_target_still_accepted "${installer_source}" "${installer_target}" || return 1
  installer_target_dir="$(dirname -- "${installer_target}")"
  installer_target_name="$(basename -- "${installer_target}")"
  installer_staged_file="$(mktemp "${installer_target_dir}/.${installer_target_name}.install.XXXXXX")" || return 1
  installer_staged_files+=("${installer_staged_file}")
  install -m 0644 "${installer_source}" "${installer_staged_file}"
  cmp -s "${installer_source}" "${installer_staged_file}"
  installer_staged_sources+=("${installer_source}")
  installer_staged_targets+=("${installer_target}")
}

installer_backup_staged_target() {
  local installer_index="$1"
  local installer_target="${installer_staged_targets[installer_index]}"
  local installer_target_dir
  local installer_target_name
  local installer_backup_file

  installer_target_backup_files[installer_index]=""
  installer_target_existed[installer_index]=0
  installer_assert_target_still_accepted "${installer_staged_sources[installer_index]}" "${installer_target}" || return 1
  if [[ ! -e "${installer_target}" ]]; then
    return 0
  fi

  installer_target_dir="$(dirname -- "${installer_target}")"
  installer_target_name="$(basename -- "${installer_target}")"
  installer_backup_file="$(mktemp "${installer_target_dir}/.${installer_target_name}.install-backup.XXXXXX")" || return 1
  installer_target_backup_files[installer_index]="${installer_backup_file}"
  installer_target_existed[installer_index]=1
  cp -p "${installer_target}" "${installer_backup_file}"
  cmp -s "${installer_target}" "${installer_backup_file}"
}

installer_assert_staged_target_unchanged() {
  local installer_index="$1"
  local installer_source="${installer_staged_sources[installer_index]}"
  local installer_target="${installer_staged_targets[installer_index]}"
  local installer_backup_file="${installer_target_backup_files[installer_index]}"

  installer_assert_target_still_accepted "${installer_source}" "${installer_target}" || return 1
  if [[ "${installer_target_existed[installer_index]}" -eq 1 ]]; then
    if ! cmp -s "${installer_target}" "${installer_backup_file}"; then
      echo "Error: installer target changed during installation; refusing to overwrite: ${installer_target}" >&2
      return 1
    fi
  elif [[ -e "${installer_target}" || -L "${installer_target}" ]]; then
    echo "Error: installer target appeared during installation; refusing to overwrite: ${installer_target}" >&2
    return 1
  fi

  return 0
}

installer_stage_migration_removal() {
  local installer_target="$1"
  local installer_validator="$2"
  local installer_description="$3"
  local installer_target_dir
  local installer_target_name
  local installer_backup_file

  if [[ ! -e "${installer_target}" ]]; then
    return 0
  fi
  installer_assert_guarded_paths_safe || return 1
  if [[ -L "${installer_target}" || ! -f "${installer_target}" ]] || ! "${installer_validator}" "${installer_target}"; then
    echo "Error: ${installer_description} changed during installation; refusing to remove: ${installer_target}" >&2
    return 1
  fi

  installer_target_dir="$(dirname -- "${installer_target}")"
  installer_target_name="$(basename -- "${installer_target}")"
  installer_backup_file="$(mktemp "${installer_target_dir}/.${installer_target_name}.install-backup.XXXXXX")" || return 1
  installer_migration_targets+=("${installer_target}")
  installer_migration_backup_files+=("${installer_backup_file}")
  cp -p "${installer_target}" "${installer_backup_file}"
  cmp -s "${installer_target}" "${installer_backup_file}"
}

installer_assert_staged_migration_unchanged() {
  local installer_index="$1"
  local installer_target="${installer_migration_targets[installer_index]}"
  local installer_backup_file="${installer_migration_backup_files[installer_index]}"

  installer_assert_guarded_paths_safe || return 1
  if [[ -L "${installer_target}" || ! -f "${installer_target}" ]] || ! cmp -s "${installer_target}" "${installer_backup_file}"; then
    echo "Error: migration source changed during installation; refusing to remove: ${installer_target}" >&2
    return 1
  fi

  return 0
}

installer_rollback_transaction() {
  local installer_index
  local installer_reverse_position
  local installer_target
  local installer_backup_file
  local installer_source
  local installer_rollback_failed=0

  for ((installer_reverse_position=${#installer_removed_migration_indexes[@]} - 1; installer_reverse_position >= 0; installer_reverse_position--)); do
    installer_index="${installer_removed_migration_indexes[installer_reverse_position]}"
    installer_target="${installer_migration_targets[installer_index]}"
    installer_backup_file="${installer_migration_backup_files[installer_index]}"
    if ! installer_assert_guarded_paths_safe || [[ -L "${installer_target}" ]]; then
      echo "Error: cannot safely restore removed migration file: ${installer_target}" >&2
      installer_rollback_failed=1
      continue
    fi
    if [[ -e "${installer_target}" ]]; then
      if cmp -s "${installer_target}" "${installer_backup_file}"; then
        continue
      fi
      echo "Error: cannot safely restore removed migration file: ${installer_target}" >&2
      installer_rollback_failed=1
      continue
    fi
    if mv -f -- "${installer_backup_file}" "${installer_target}"; then
      installer_migration_backup_files[installer_index]=""
    else
      echo "Error: failed to restore removed migration file: ${installer_target}" >&2
      installer_rollback_failed=1
    fi
  done

  for ((installer_reverse_position=${#installer_committed_target_indexes[@]} - 1; installer_reverse_position >= 0; installer_reverse_position--)); do
    installer_index="${installer_committed_target_indexes[installer_reverse_position]}"
    installer_target="${installer_staged_targets[installer_index]}"
    installer_source="${installer_staged_sources[installer_index]}"
    installer_backup_file="${installer_target_backup_files[installer_index]}"
    if ! installer_assert_guarded_paths_safe || [[ -L "${installer_target}" ]]; then
      echo "Error: cannot safely roll back installer target: ${installer_target}" >&2
      installer_rollback_failed=1
      continue
    fi
    if ! cmp -s "${installer_source}" "${installer_target}"; then
      if [[ "${installer_target_existed[installer_index]}" -eq 1 ]] && cmp -s "${installer_target}" "${installer_backup_file}"; then
        continue
      fi
      if [[ "${installer_target_existed[installer_index]}" -eq 0 ]] && [[ ! -e "${installer_target}" ]]; then
        continue
      fi
      echo "Error: cannot safely roll back installer target: ${installer_target}" >&2
      installer_rollback_failed=1
      continue
    fi
    if [[ "${installer_target_existed[installer_index]}" -eq 1 ]]; then
      if mv -f -- "${installer_backup_file}" "${installer_target}"; then
        installer_target_backup_files[installer_index]=""
      else
        echo "Error: failed to restore installer target: ${installer_target}" >&2
        installer_rollback_failed=1
      fi
    elif rm -- "${installer_target}"; then
      :
    else
      echo "Error: failed to remove newly installed target during rollback: ${installer_target}" >&2
      installer_rollback_failed=1
    fi
  done

  [[ "${installer_rollback_failed}" -eq 0 ]]
}

installer_on_exit() {
  local installer_status="$?"
  local installer_rollback_complete=1
  local installer_cleanup_failed=0

  trap - EXIT
  trap '' HUP INT TERM
  if [[ "${installer_status}" -ne 0 && "${installer_transaction_started}" -eq 1 && "${installer_transaction_complete}" -eq 0 ]]; then
    if ! installer_rollback_transaction; then
      echo "Error: installation failed and rollback was incomplete; inspect the reported paths before retrying." >&2
      installer_rollback_complete=0
    fi
  fi
  if ! installer_cleanup_staged_files; then
    echo "Error: installation recovery left staging files behind; inspect the reported paths before retrying." >&2
    installer_cleanup_failed=1
  fi
  if [[ "${installer_rollback_complete}" -eq 1 ]]; then
    if ! installer_cleanup_backup_files; then
      echo "Error: installation recovery left backup files behind; inspect the reported paths before retrying." >&2
      installer_report_recovery_backups
      installer_cleanup_failed=1
    fi
  else
    echo "Recovery backups were preserved because rollback did not complete." >&2
    installer_report_recovery_backups
  fi
  if [[ "${installer_cleanup_failed}" -ne 0 ]]; then
    echo "The original installation error is unchanged; recovery artifacts require manual inspection." >&2
  fi
  exit "${installer_status}"
}

installer_expand_lane_request() {
  installer_selected_lanes=()
  case "$1" in
    luna_medium_worker|luna_worker)
      installer_selected_lanes+=("$1")
      ;;
    all)
      installer_selected_lanes=("${installer_lanes[@]}")
      ;;
    *)
      echo "Error: unknown lane selection: $1" >&2
      return 64
      ;;
  esac
}

installer_plan_lane_state() {
  local installer_lane="$1"
  local installer_state="$2"
  local installer_source
  local installer_target
  local installer_opposite_target

  installer_source="$(installer_lane_source "${installer_lane}")" || return 1
  if [[ "${installer_state}" == "enabled" ]]; then
    installer_target="$(installer_lane_target "${installer_lane}")"
    installer_opposite_target="$(installer_lane_disabled_target "${installer_lane}")"
  else
    installer_target="$(installer_lane_disabled_target "${installer_lane}")"
    installer_opposite_target="$(installer_lane_target "${installer_lane}")"
  fi
  installer_install_pairs+=("${installer_source}|${installer_target}")
  installer_planned_lanes+=("${installer_lane}")
  installer_planned_states+=("${installer_state}")
  if [[ -e "${installer_opposite_target}" || -L "${installer_opposite_target}" ]]; then
    installer_state_removal_targets+=("${installer_opposite_target}")
    installer_state_removal_descriptions+=("opposite ${installer_lane} state")
  fi
}

installer_detect_legacy_generation() {
  local installer_legacy_skill_dir
  local installer_legacy_skill_target
  local installer_found=0

  for installer_legacy_skill_dir in "${installer_legacy_skill_dirs[@]}"; do
    installer_legacy_skill_target="${installer_legacy_skill_dir}/SKILL.md"
    if [[ -L "${installer_legacy_skill_target}" ]] || [[ -e "${installer_legacy_skill_target}" && ! -f "${installer_legacy_skill_target}" ]]; then
      echo "Error: legacy Skill is not a regular file: ${installer_legacy_skill_target}" >&2
      return 1
    fi
    if [[ -e "${installer_legacy_skill_target}" ]]; then
      if ! installer_is_known_legacy_skill "${installer_legacy_skill_target}"; then
        echo "Error: legacy Skill has unknown content: ${installer_legacy_skill_target}" >&2
        return 1
      fi
      installer_found=$((installer_found + 1))
    fi
  done
  if [[ "${installer_found}" -gt 1 ]]; then
    echo "Error: multiple legacy Skill copies require manual migration." >&2
    return 1
  fi
  if [[ "${installer_found}" -eq 1 ]]; then
    printf '%s\n' "legacy-v0.4"
  fi
}

installer_prepare_install_pairs() {
  local installer_generation
  local installer_legacy_generation
  local installer_lane
  local installer_state
  local installer_any_lane=0
  local installer_retired_base
  local installer_desired_state

  installer_install_pairs=()
  installer_state_removal_targets=()
  installer_state_removal_descriptions=()
  installer_planned_lanes=()
  installer_planned_states=()

  case "${installer_mode}" in
    enable|disable)
      installer_expand_lane_request "${installer_requested_lane}" || return 1
      if [[ "${installer_mode}" == "enable" ]]; then
        installer_desired_state="enabled"
      else
        installer_desired_state="disabled"
      fi
      for installer_lane in "${installer_selected_lanes[@]}"; do
        installer_state="$(installer_detect_lane_state "${installer_lane}")"
        case "${installer_state}" in
          enabled|disabled|missing) installer_plan_lane_state "${installer_lane}" "${installer_desired_state}" ;;
          *)
            echo "Error: ${installer_lane} state is ${installer_state}; resolve it before changing the lane." >&2
            return 1
            ;;
        esac
      done
      return 0
      ;;
    install)
      ;;
    *)
      return 0
      ;;
  esac

  if [[ -L "${installer_skill_target}" ]] || [[ -e "${installer_skill_target}" && ! -f "${installer_skill_target}" ]]; then
    echo "Error: current Skill is not a regular file: ${installer_skill_target}" >&2
    return 1
  elif [[ -e "${installer_skill_target}" ]]; then
    if ! installer_is_known_current_skill "${installer_skill_target}" && ! cmp -s "${installer_skill_source}" "${installer_skill_target}"; then
      echo "Error: current Skill has unknown content: ${installer_skill_target}" >&2
      return 1
    fi
    installer_generation="$(installer_current_skill_generation)" || { echo "Error: current Skill cannot be mapped to a supported topology." >&2; return 1; }
  else
    installer_legacy_generation="$(installer_detect_legacy_generation)" || return 1
    if [[ -n "${installer_legacy_generation}" ]]; then
      installer_generation="${installer_legacy_generation}"
    else
      for installer_lane in "${installer_lanes[@]}"; do
        installer_state="$(installer_detect_lane_state "${installer_lane}")"
        [[ "${installer_state}" == "missing" ]] || installer_any_lane=1
      done
      for installer_retired_base in "${installer_retired_profile_bases[@]}"; do
        installer_state="$(installer_detect_retired_profile_state "${installer_retired_base}")"
        [[ "${installer_state}" == "absent" ]] || installer_any_lane=1
      done
      if [[ "${installer_any_lane}" -ne 0 ]]; then
        echo "Error: managed profiles exist but the current Skill is missing; refusing to guess whether this is a partial installation." >&2
        return 1
      fi
      installer_generation="fresh"
    fi
  fi

  for installer_lane in "${installer_lanes[@]}"; do
    installer_state="$(installer_detect_lane_state "${installer_lane}")"
    case "${installer_state}" in
      enabled|disabled)
        installer_plan_lane_state "${installer_lane}" "${installer_state}"
        ;;
      missing)
        if [[ "${installer_generation}" == "fresh" ]]; then
          installer_plan_lane_state "${installer_lane}" "enabled"
        elif installer_generation_requires_lane "${installer_generation}" "${installer_lane}"; then
          echo "Error: ${installer_lane} is missing from the recognized ${installer_generation} installation; choose --enable-lane or --disable-lane explicitly." >&2
          return 1
        else
          installer_plan_lane_state "${installer_lane}" "disabled"
        fi
        ;;
      *)
        echo "Error: ${installer_lane} state is ${installer_state}; resolve it before upgrading." >&2
        return 1
        ;;
    esac
  done
  installer_install_pairs+=("${installer_skill_source}|${installer_skill_target}")
}

installer_report_lane_status() {
  local installer_lane
  local installer_state
  local installer_status_conflict=0
  local installer_retired_base
  local installer_retired_name

  for installer_lane in "${installer_lanes[@]}"; do
    installer_state="$(installer_detect_lane_state "${installer_lane}")"
    printf '%s\t%s\n' "${installer_lane}" "${installer_state}"
    [[ "${installer_state}" == conflict-* ]] && installer_status_conflict=1
  done
  for installer_retired_base in "${installer_retired_profile_bases[@]}"; do
    installer_state="$(installer_detect_retired_profile_state "${installer_retired_base}")"
    installer_retired_name="$(basename "${installer_retired_base}" .toml)"
    printf '%s\t%s\n' "retired_${installer_retired_name}" "${installer_state}"
    [[ "${installer_state}" == conflict-* ]] && installer_status_conflict=1
  done
  if [[ -L "${installer_skill_target}" ]] || [[ -e "${installer_skill_target}" && ! -f "${installer_skill_target}" ]]; then
    printf '%s\t%s\n' "skill" "conflict-nonregular"
    installer_status_conflict=1
  elif [[ -e "${installer_skill_target}" ]]; then
    if installer_is_known_current_skill "${installer_skill_target}" || cmp -s "${installer_skill_source}" "${installer_skill_target}"; then
      printf '%s\t%s\n' "skill" "accepted"
    else
      printf '%s\t%s\n' "skill" "conflict-unknown"
      installer_status_conflict=1
    fi
  else
    printf '%s\t%s\n' "skill" "missing"
  fi
  [[ "${installer_status_conflict}" -eq 0 ]]
}

trap installer_on_exit EXIT
trap 'exit 1' HUP INT TERM

if [[ "${installer_mode}" == "status" ]]; then
  installer_report_lane_status
  exit 0
fi

installer_prepare_install_pairs || exit 2

for installer_dir in "${installer_guarded_dirs[@]}"; do
  if [[ -L "${installer_dir}" ]]; then
    echo "Conflict: installer path uses a symbolic link and requires manual migration: ${installer_dir}" >&2
    installer_conflict=1
  fi
done

if [[ "${installer_mode}" == "install" ]]; then
  if [[ -L "${installer_removed_runner_target}" ]]; then
    echo "Conflict: removed DeepSeek runner uses a symbolic link and requires manual cleanup: ${installer_removed_runner_target}" >&2
    installer_conflict=1
  elif [[ -e "${installer_removed_runner_target}" ]]; then
    if [[ ! -f "${installer_removed_runner_target}" ]] || ! installer_is_known_removed_runner "${installer_removed_runner_target}"; then
      echo "Conflict: removed DeepSeek runner has unknown content and requires manual cleanup: ${installer_removed_runner_target}" >&2
      installer_conflict=1
    fi
  fi
fi

if [[ "${installer_mode}" == "install" ]]; then
  for installer_retired_base in "${installer_retired_profile_bases[@]}"; do
    installer_state="$(installer_detect_retired_profile_state "${installer_retired_base}")"
    case "${installer_state}" in
      absent|known-enabled|known-disabled) ;;
      *)
        echo "Conflict: retired profile state is ${installer_state} and requires manual migration: ${installer_retired_base}" >&2
        installer_conflict=1
        ;;
    esac
  done
fi

if [[ "${installer_mode}" == "install" ]]; then
  for installer_target in \
    "${installer_luna_agent_target}" \
    "${installer_luna_agent_target}.disabled" \
    "${installer_luna_medium_agent_target}" \
    "${installer_luna_medium_agent_target}.disabled" \
    "${installer_deepseek_agent_target}" \
    "${installer_deepseek_agent_target}.disabled" \
    "${installer_deepseek_pro_agent_target}" \
    "${installer_deepseek_pro_agent_target}.disabled" \
    "${installer_spark_scout_agent_target}" \
    "${installer_spark_scout_agent_target}.disabled" \
    "${installer_skill_target}"
  do
    if [[ -L "${installer_target}" ]]; then
      echo "Conflict: installer target uses a symbolic link and requires manual migration: ${installer_target}" >&2
      installer_conflict=1
    elif [[ -e "${installer_target}" ]] && [[ ! -f "${installer_target}" ]]; then
      echo "Conflict: installer target is not a regular file and requires manual migration: ${installer_target}" >&2
      installer_conflict=1
    fi
  done
fi

for installer_pair in "${installer_install_pairs[@]}"; do
  installer_source="${installer_pair%%|*}"
  installer_target="${installer_pair#*|}"
  if [[ -L "${installer_target}" ]]; then
    continue
  fi
  if [[ -e "${installer_target}" ]] && [[ ! -f "${installer_target}" ]]; then
    continue
  fi
  if [[ -e "${installer_target}" ]] && ! installer_target_is_accepted "${installer_source}" "${installer_target}"; then
    echo "Conflict: ${installer_target} already exists with different content." >&2
    installer_conflict=1
  fi
done

if [[ "${installer_mode}" == "install" ]]; then
  for installer_legacy_skill_dir in "${installer_legacy_skill_dirs[@]}"; do
    installer_legacy_skill_target="${installer_legacy_skill_dir}/SKILL.md"
    if [[ -L "${installer_legacy_skill_target}" ]]; then
      echo "Conflict: legacy Skill uses a symbolic link and requires manual migration: ${installer_legacy_skill_target}" >&2
      installer_conflict=1
    elif [[ -e "${installer_legacy_skill_target}" ]]; then
      if [[ ! -f "${installer_legacy_skill_target}" ]]; then
        echo "Conflict: legacy Skill is not a regular file: ${installer_legacy_skill_target}" >&2
        installer_conflict=1
      elif ! installer_is_known_legacy_skill "${installer_legacy_skill_target}"; then
        echo "Conflict: legacy Skill has unknown content and requires manual migration: ${installer_legacy_skill_target}" >&2
        installer_conflict=1
      fi
    fi
  done
fi

if [[ "${installer_conflict}" -ne 0 ]]; then
  echo "No files were changed. Resolve the conflict explicitly, then run the installer again." >&2
  exit 2
fi

if command -v python3 >/dev/null 2>&1 && python3 -c 'import tomllib' >/dev/null 2>&1; then
  python3 -c 'import sys, tomllib; [tomllib.load(open(path, "rb")) for path in sys.argv[1:]]' \
    "${installer_luna_agent_source}" "${installer_luna_medium_agent_source}"
  echo "Verified: repository agent TOML files parse with tomllib."
fi

if ! command -v mktemp >/dev/null 2>&1; then
  echo "Error: mktemp is required for staged installation and rollback." >&2
  exit 1
fi

installer_assert_guarded_paths_safe || exit 3
mkdir -p -- "${installer_agent_dir}" "${installer_skill_dir}"
installer_assert_guarded_paths_safe || exit 3

for installer_pair in "${installer_install_pairs[@]}"; do
  installer_source="${installer_pair%%|*}"
  installer_target="${installer_pair#*|}"
  installer_assert_target_still_accepted "${installer_source}" "${installer_target}" || exit 3
  if cmp -s "${installer_source}" "${installer_target}"; then
    echo "Unchanged: ${installer_target}"
  else
    installer_stage_target "${installer_source}" "${installer_target}"
  fi
done

# Save every changed target before replacing anything. A normal command failure
# or termination signal restores the pre-install state; a power loss can still
# leave complete old/new files, which a rerun will reconcile.
for installer_index in "${!installer_staged_targets[@]}"; do
  installer_backup_staged_target "${installer_index}"
done

for installer_index in "${!installer_state_removal_targets[@]}"; do
  installer_stage_migration_removal \
    "${installer_state_removal_targets[installer_index]}" \
    installer_is_known_managed_lane_file \
    "${installer_state_removal_descriptions[installer_index]}"
done

if [[ "${installer_mode}" == "install" ]]; then
  for installer_target in "${installer_retired_profile_targets[@]}"; do
    installer_stage_migration_removal \
      "${installer_target}" \
      installer_is_known_retired_profile \
      "retired Worker profile"
  done

  installer_stage_migration_removal \
    "${installer_removed_runner_target}" \
    installer_is_known_removed_runner \
    "removed DeepSeek runner"

  for installer_legacy_skill_dir in "${installer_legacy_skill_dirs[@]}"; do
    installer_stage_migration_removal \
      "${installer_legacy_skill_dir}/SKILL.md" \
      installer_is_known_legacy_skill \
      "legacy Skill"
  done
fi

for installer_index in "${!installer_migration_targets[@]}"; do
  installer_assert_staged_migration_unchanged "${installer_index}"
done

installer_transaction_started=1

for installer_index in "${!installer_staged_targets[@]}"; do
  installer_source="${installer_staged_sources[installer_index]}"
  installer_target="${installer_staged_targets[installer_index]}"
  installer_staged_file="${installer_staged_files[installer_index]}"
  installer_assert_staged_target_unchanged "${installer_index}"
  installer_committed_target_indexes+=("${installer_index}")
  mv -f -- "${installer_staged_file}" "${installer_target}"
  installer_staged_files[installer_index]=""
  cmp -s "${installer_source}" "${installer_target}"
  echo "Installed or updated: ${installer_target}"
done

for installer_pair in "${installer_install_pairs[@]}"; do
  installer_source="${installer_pair%%|*}"
  installer_target="${installer_pair#*|}"
  cmp -s "${installer_source}" "${installer_target}"
done

for installer_index in "${!installer_planned_lanes[@]}"; do
  installer_lane="${installer_planned_lanes[installer_index]}"
  installer_state="${installer_planned_states[installer_index]}"
  installer_source="$(installer_lane_source "${installer_lane}")"
  if [[ "${installer_state}" == "enabled" ]]; then
    installer_target="$(installer_lane_target "${installer_lane}")"
    installer_opposite_target="$(installer_lane_disabled_target "${installer_lane}")"
  else
    installer_target="$(installer_lane_disabled_target "${installer_lane}")"
    installer_opposite_target="$(installer_lane_target "${installer_lane}")"
  fi
  cmp -s "${installer_source}" "${installer_target}"
  [[ ! -e "${installer_opposite_target}" && ! -L "${installer_opposite_target}" ]]
done

for installer_index in "${!installer_migration_targets[@]}"; do
  installer_assert_staged_migration_unchanged "${installer_index}"
  installer_target="${installer_migration_targets[installer_index]}"
  installer_removed_migration_indexes+=("${installer_index}")
  rm -- "${installer_target}"
  echo "Migrated: removed known legacy file at ${installer_target}"
done

installer_transaction_complete=1
installer_cleanup_failed=0
if ! installer_cleanup_staged_files; then
  installer_cleanup_failed=1
fi
if ! installer_cleanup_backup_files; then
  installer_cleanup_failed=1
fi
if [[ "${installer_cleanup_failed}" -ne 0 ]]; then
  echo "Error: installed targets are verified, but recovery-file cleanup failed; inspect the reported paths before retrying." >&2
  exit 4
fi

if [[ "${installer_mode}" == "install" ]]; then
  echo "Verified: installed files match the repository sources and planned lane states."
  echo "Installed Worker source profiles: Luna Medium and Luna Max."
  echo "Retired known Spark Scout and DeepSeek Worker profile files are absent. DeepSeek provider, credential, and model-catalog settings were not changed."
  echo "Not validated by this script: model-provider routing or child lifecycle."
  echo "Required for account-wide HERO: paste one block from ${installer_repo_root}/personalization.md into Codex App Settings > Personalization > Custom Instructions; until confirmed, HERO is active only for this repository and the installed Worker profiles."
elif [[ "${installer_mode}" == "enable" ]]; then
  echo "Verified: requested lane state is enabled. Start a new Codex task before relying on Agent discovery."
else
  echo "Verified: requested lane state is disabled. Provider, credential, and model-catalog settings were not changed. Start a new Codex task before relying on Agent discovery."
fi
