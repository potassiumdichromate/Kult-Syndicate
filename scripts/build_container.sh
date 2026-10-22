#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${REBUILD_GODOT:-no}" == "yes" ]]; then
  bash scripts/export_web.sh
fi
python3 scripts/check_web_export.py
docker compose build
printf '%s\n' 'Image built. Run docker compose up -d. The supplied Godot export needs no editor installation.'
