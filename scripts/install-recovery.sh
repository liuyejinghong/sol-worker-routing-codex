#!/usr/bin/env bash
# A completed intent record permits finishing a known interrupted operation.
# It is data, never sourced shell code; unknown targets still fail preflight.
installer_recovery_path="${installer_skill_dir}/.install-recovery"
installer_recovery_loaded=0
installer_recovery_digest=""
installer_recovery_temp=""
installer_recovery_states=()
installer_recovery_files=()
installer_recovery_hashes=()

installer_recovery_header() {
  printf '%s\0' "sol-worker-routing-recovery-1" \
    "${installer_home_dir}" "${installer_codex_dir}" \
    "${installer_mode}" "${installer_requested_lane}" \
    "$(installer_sha256 "${installer_luna_agent_source}")" \
    "$(installer_sha256 "${installer_luna_medium_agent_source}")" \
    "$(installer_sha256 "${installer_skill_source}")"
}

installer_recovery_file_safe() {
  local installer_file="$1" installer_hash="$2" installer_base installer_suffix
  local installer_allowed=0
  for installer_base in \
    "${installer_luna_agent_target}" "${installer_luna_agent_target}.disabled" \
    "${installer_luna_medium_agent_target}" "${installer_luna_medium_agent_target}.disabled" \
    "${installer_retired_profile_targets[@]}" "${installer_skill_target}" \
    "${installer_removed_runner_target}" \
    "${installer_legacy_user_skill_dir}/SKILL.md" "${installer_legacy_codex_skill_dir}/SKILL.md"
  do
    installer_base="$(dirname -- "${installer_base}")/.$(basename -- "${installer_base}")"
    case "${installer_file}" in
      "${installer_base}.install."*) installer_suffix="${installer_file#"${installer_base}.install."}" ;;
      "${installer_base}.install-backup."*) installer_suffix="${installer_file#"${installer_base}.install-backup."}" ;;
      *) continue ;;
    esac
    [[ "${installer_suffix}" =~ ^[a-zA-Z0-9]{6}$ ]] && installer_allowed=1
  done
  [[ "${installer_allowed}" -eq 1 && "${installer_hash}" =~ ^[a-f0-9]{64}$ ]] || return 1
  [[ ! -L "${installer_file}" ]] || return 1
  if [[ -e "${installer_file}" ]]; then
    [[ -f "${installer_file}" ]] || return 1
    [[ "$(installer_sha256 "${installer_file}")" == "${installer_hash}" ]] || return 1
  fi
}

installer_load_recovery() {
  local installer_field installer_expected installer_index installer_file installer_hash installer_state installer_pid
  [[ -e "${installer_recovery_path}" || -L "${installer_recovery_path}" ]] || return 0
  installer_assert_guarded_paths_safe || return 1
  if [[ -L "${installer_recovery_path}" || ! -f "${installer_recovery_path}" ]]; then
    echo "Error: recovery record is not a regular file: ${installer_recovery_path}" >&2
    return 1
  fi
  exec 3< "${installer_recovery_path}"
  while IFS= read -r -d '' installer_expected; do
    if ! IFS= read -r -d '' installer_field <&3 || [[ "${installer_field}" != "${installer_expected}" ]]; then
      exec 3<&-
      echo "Error: recovery record does not match this source, home, or operation; rerun the original command with its original checkout. No files changed." >&2
      return 1
    fi
  done < <(installer_recovery_header)
  if ! IFS= read -r -d '' installer_pid <&3 || [[ ! "${installer_pid}" =~ ^[0-9]+$ ]]; then
    exec 3<&-; return 1
  fi
  if kill -0 "${installer_pid}" 2>/dev/null; then
    exec 3<&-
    echo "Error: the recorded installer process is still running (${installer_pid}); no files changed." >&2
    return 1
  fi
  for installer_index in 0 1; do
    if ! IFS= read -r -d '' installer_state <&3; then
      exec 3<&-; return 1
    fi
    if [[ "${installer_mode}" == "install" ]]; then
      [[ "${installer_state}" == enabled || "${installer_state}" == disabled ]] || { exec 3<&-; return 1; }
    else
      installer_expected="-"
      if [[ "${installer_requested_lane}" == all || "${installer_requested_lane}" == "${installer_lanes[installer_index]}" ]]; then
        case "${installer_mode}" in
          enable) installer_expected=enabled ;;
          disable) installer_expected=disabled ;;
          *) exec 3<&-; return 1 ;;
        esac
      fi
      [[ "${installer_state}" == "${installer_expected}" ]] || { exec 3<&-; return 1; }
    fi
    installer_recovery_states+=("${installer_state}")
  done
  installer_file=""
  while IFS= read -r -d '' installer_file <&3; do
    [[ "${installer_file}" != complete ]] || break
    if ! IFS= read -r -d '' installer_hash <&3 || ! installer_recovery_file_safe "${installer_file}" "${installer_hash}"; then
      exec 3<&-
      echo "Error: recovery artifact is unknown or changed; no files changed." >&2
      return 1
    fi
    installer_recovery_files+=("${installer_file}")
    installer_recovery_hashes+=("${installer_hash}")
    installer_file=""
  done
  if [[ "${installer_file}" != complete ]] || IFS= read -r -n 1 installer_field <&3; then
    exec 3<&-; return 1
  fi
  exec 3<&-
  installer_recovery_digest="$(installer_sha256 "${installer_recovery_path}")" || return 1
  installer_recovery_loaded=1
}

installer_prepare_recovery_pairs() {
  local installer_index installer_lane installer_state installer_source installer_target
  for installer_index in 0 1; do
    installer_state="${installer_recovery_states[installer_index]}"
    [[ "${installer_state}" != "-" ]] || continue
    installer_lane="${installer_lanes[installer_index]}"
    installer_source="$(installer_lane_source "${installer_lane}")"
    for installer_target in "$(installer_lane_target "${installer_lane}")" "$(installer_lane_disabled_target "${installer_lane}")"; do
      installer_assert_target_still_accepted "${installer_source}" "${installer_target}" || return 1
    done
    installer_plan_lane_state "${installer_lane}" "${installer_state}"
  done
  if [[ "${installer_mode}" == install ]]; then
    installer_install_pairs+=("${installer_skill_source}|${installer_skill_target}")
  fi
  echo "Resuming the recorded interrupted operation."
}

installer_recovery_unchanged() {
  installer_assert_guarded_paths_safe || return 1
  [[ ! -L "${installer_recovery_path}" ]] || return 1
  if [[ -n "${installer_recovery_digest}" ]]; then
    [[ -f "${installer_recovery_path}" ]] || return 1
    [[ "$(installer_sha256 "${installer_recovery_path}")" == "${installer_recovery_digest}" ]] || return 1
  else
    [[ ! -e "${installer_recovery_path}" ]] || return 1
  fi
}

installer_save_recovery() {
  local installer_index installer_lane installer_state installer_file
  local installer_states=("-" "-")
  if [[ "${#installer_staged_targets[@]}" -eq 0 && "${#installer_migration_targets[@]}" -eq 0 && "${installer_recovery_loaded}" -eq 0 ]]; then
    return 0
  fi
  installer_recovery_unchanged || return 1
  for installer_index in "${!installer_planned_lanes[@]}"; do
    installer_lane="${installer_planned_lanes[installer_index]}"
    installer_state="${installer_planned_states[installer_index]}"
    case "${installer_lane}" in
      luna_medium_worker) installer_states[0]="${installer_state}" ;;
      luna_worker) installer_states[1]="${installer_state}" ;;
    esac
  done
  for installer_file in "${installer_staged_files[@]-}" "${installer_target_backup_files[@]-}" "${installer_migration_backup_files[@]-}"; do
    [[ -n "${installer_file}" ]] || continue
    installer_recovery_files+=("${installer_file}")
    installer_recovery_hashes+=("$(installer_sha256 "${installer_file}")")
  done
  installer_recovery_temp="$(mktemp "${installer_skill_dir}/.install-recovery.XXXXXX")"
  {
    installer_recovery_header
    printf '%s\0' "$$"
    printf '%s\0' "${installer_states[@]}"
    for installer_index in "${!installer_recovery_files[@]}"; do
      printf '%s\0' "${installer_recovery_files[installer_index]}" "${installer_recovery_hashes[installer_index]}"
    done
    printf '%s\0' complete
  } > "${installer_recovery_temp}"
  installer_recovery_unchanged || return 1
  mv -f -- "${installer_recovery_temp}" "${installer_recovery_path}"
  installer_recovery_temp=""
  installer_recovery_digest="$(installer_sha256 "${installer_recovery_path}")"
}

installer_finish_recovery() {
  local installer_index installer_file
  [[ -n "${installer_recovery_digest}" ]] || return 0
  installer_recovery_unchanged || return 1
  for installer_index in "${!installer_recovery_files[@]}"; do
    installer_file="${installer_recovery_files[installer_index]}"
    installer_recovery_file_safe "${installer_file}" "${installer_recovery_hashes[installer_index]}" || return 1
  done
  for installer_file in "${installer_recovery_files[@]-}"; do
    [[ ! -e "${installer_file}" ]] || rm -- "${installer_file}" || return 1
  done
  installer_recovery_unchanged || return 1
  rm -- "${installer_recovery_path}"
  installer_recovery_digest=""
}
