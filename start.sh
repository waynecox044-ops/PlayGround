#!/usr/bin/env bash
set -euo pipefail

# This project is a static HTML app. The runtime launcher handles Vite/npm
# projects too, so this remains safe to use as the foreground app command.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PROJECT_DIR RUNTIME_DIR PORT OPENCODE_WEB_DIR

/usr/bin/time -p test -f "$PROJECT_DIR/index.html"
/usr/bin/time -p test -f "$RUNTIME_DIR/scripts/default-start.mjs"
/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"

# default-start performs dependency installation/builds when a package project
# is supplied, writes deployment-output.json, and serves the built output.
cd "$PROJECT_DIR"
exec /usr/bin/time -p node "$RUNTIME_DIR/scripts/default-start.mjs"
