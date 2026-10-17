#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT_BIN="${GODOT_BIN:-godot}"
if ! command -v "$GODOT_BIN" >/dev/null 2>&1; then
  echo 'Install Godot 4.5.1 with matching export templates, or set GODOT_BIN.' >&2
  exit 1
fi
GODOT_VERSION="$("$GODOT_BIN" --version)"
if [[ "$GODOT_VERSION" != 4.5.1.stable* ]]; then
  echo "Expected Godot 4.5.1 stable, found: $GODOT_VERSION. Install matching export templates." >&2
  exit 1
fi
mkdir -p web/godot
"$GODOT_BIN" --headless --path game --editor --import --quit
"$GODOT_BIN" --headless --path game --export-release Web ../web/godot/index.html
python3 scripts/secure_web_export.py
python3 scripts/check_web_export.py
printf '%s\n' 'Godot web export ready. Start the backend and enter via the Godot game button.'
