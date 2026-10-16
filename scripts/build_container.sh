#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/export_web.sh
docker compose build
printf '%s\n' 'Container built with the validated Godot Web export. Run docker compose up -d.'
