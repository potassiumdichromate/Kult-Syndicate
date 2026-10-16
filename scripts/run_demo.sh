#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export SYNDICATES_DEMO=yes
export HOST="${HOST:-127.0.0.1}"
exec python3 server/app.py
