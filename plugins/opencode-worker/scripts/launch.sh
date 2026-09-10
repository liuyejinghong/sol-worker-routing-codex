#!/bin/sh
set -eu
plugin_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -n "${OPENCODE_WORKER_NODE:-}" ]; then
  exec "$OPENCODE_WORKER_NODE" "$plugin_root/dist/mcp.mjs"
fi
for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
  if [ -x "$candidate" ]; then exec "$candidate" "$plugin_root/dist/mcp.mjs"; fi
done
exec node "$plugin_root/dist/mcp.mjs"
