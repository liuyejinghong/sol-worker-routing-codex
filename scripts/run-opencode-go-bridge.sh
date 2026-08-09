#!/usr/bin/env bash
set -euo pipefail

bridge_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bridge_repo_root="$(cd -- "${bridge_script_dir}/.." && pwd)"
bridge_config="${bridge_repo_root}/providers/opencode-go-litellm.yaml"
bridge_port="${OPENCODE_GO_BRIDGE_PORT:-4141}"

if [[ ! "${bridge_port}" =~ ^[0-9]+$ ]] || (( bridge_port < 1 || bridge_port > 65535 )); then
  echo "Error: OPENCODE_GO_BRIDGE_PORT must be an integer from 1 to 65535." >&2
  exit 2
fi

if [[ -z "${OPENCODE_API_KEY:-}" ]]; then
  if [[ ! -r /dev/tty ]]; then
    echo "Error: OPENCODE_API_KEY is absent and no interactive terminal is available." >&2
    exit 3
  fi
  read -r -s -p "OpenCode Go API key: " bridge_api_key </dev/tty
  printf '\n' >/dev/tty
  if [[ -z "${bridge_api_key}" ]]; then
    echo "Error: no API key was entered." >&2
    exit 3
  fi
  export OPENCODE_API_KEY="${bridge_api_key}"
  unset bridge_api_key
fi

echo "Starting the OpenCode Go bridge on http://127.0.0.1:${bridge_port}/v1"
echo "Only the deepseek-v4-flash model is configured. Stop with Ctrl-C."

if command -v litellm >/dev/null 2>&1; then
  exec litellm --config "${bridge_config}" --host 127.0.0.1 --port "${bridge_port}"
fi

if command -v uvx >/dev/null 2>&1; then
  exec uvx --from 'litellm[proxy]==1.80.10' --with socksio \
    litellm --config "${bridge_config}" --host 127.0.0.1 --port "${bridge_port}"
fi

echo "Error: LiteLLM is unavailable. Install the LiteLLM proxy or uv, then retry." >&2
exit 4
