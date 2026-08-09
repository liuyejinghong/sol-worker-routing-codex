#!/usr/bin/env bash
set -euo pipefail

runner_workdir="${PWD}"
runner_sandbox="read-only"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --cd)
      [[ "$#" -ge 2 ]] || { echo "Error: --cd requires an absolute directory." >&2; exit 64; }
      runner_workdir="$2"
      shift 2
      ;;
    --sandbox)
      [[ "$#" -ge 2 ]] || { echo "Error: --sandbox requires read-only or workspace-write." >&2; exit 64; }
      runner_sandbox="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: run-deepseek-worker.sh [--cd ABSOLUTE_DIR] [--sandbox read-only|workspace-write] < task-packet.txt"
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      exit 64
      ;;
  esac
done

[[ "${runner_workdir}" == /* ]] || { echo "Error: --cd must be an absolute directory." >&2; exit 64; }
[[ -d "${runner_workdir}" ]] || { echo "Error: work directory does not exist: ${runner_workdir}" >&2; exit 66; }
case "${runner_sandbox}" in
  read-only|workspace-write) ;;
  *) echo "Error: --sandbox must be read-only or workspace-write." >&2; exit 64 ;;
esac

runner_codex_bin="${CODEX_BIN:-}"
if [[ -z "${runner_codex_bin}" && -x "/Applications/ChatGPT.app/Contents/Resources/codex" ]]; then
  runner_codex_bin="/Applications/ChatGPT.app/Contents/Resources/codex"
fi
if [[ -z "${runner_codex_bin}" ]]; then
  runner_codex_bin="$(command -v codex || true)"
fi
[[ -n "${runner_codex_bin}" && -x "${runner_codex_bin}" ]] || {
  echo "Error: Codex executable not found; set CODEX_BIN to the current Codex binary." >&2
  exit 69
}

runner_home_dir="${HOME:?HOME is not set}"
runner_codex_home="${CODEX_HOME:-${runner_home_dir}/.codex}"
runner_model_catalog="${runner_codex_home}/model-catalogs/deepseek-official.json"
[[ -f "${runner_model_catalog}" ]] || {
  echo "Error: official DeepSeek model catalog not found: ${runner_model_catalog}" >&2
  exit 66
}

runner_tmp_dir="${TMPDIR:-/tmp}"
runner_last_message="$(mktemp "${runner_tmp_dir%/}/deepseek-worker-last.XXXXXX")"
runner_log="$(mktemp "${runner_tmp_dir%/}/deepseek-worker-log.XXXXXX")"
runner_cleanup() {
  rm -f -- "${runner_last_message}" "${runner_log}"
}
trap runner_cleanup EXIT

if "${runner_codex_bin}" exec \
  --ephemeral \
  --skip-git-repo-check \
  --approve-for-me \
  -C "${runner_workdir}" \
  -s "${runner_sandbox}" \
  -m deepseek-v4-flash \
  -c 'model_provider="deepseek"' \
  -c 'model_reasoning_effort="max"' \
  -c 'model_context_window=1048576' \
  -c "model_catalog_json=\"${runner_model_catalog}\"" \
  -o "${runner_last_message}" \
  - >"${runner_log}" 2>&1
then
  if [[ -s "${runner_last_message}" ]]; then
    sed -n '1,$p' "${runner_last_message}"
  else
    echo "Error: DeepSeek completed without a final message." >&2
    sed -n '1,200p' "${runner_log}" >&2
    exit 70
  fi
else
  runner_status="$?"
  echo "Error: direct DeepSeek worker exited with status ${runner_status}." >&2
  sed -n '1,200p' "${runner_log}" >&2
  exit "${runner_status}"
fi
