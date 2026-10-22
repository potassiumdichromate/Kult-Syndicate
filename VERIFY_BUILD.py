#!/usr/bin/env python3
"""Verify every delivered file after extraction, using only the Python standard library."""
import hashlib
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'BUILD_MANIFEST.json').read_text())
failed = []
for name, expected in manifest['sha256'].items():
    path = root / name
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        failed.append(name)
if failed:
    print('Missing or modified files:\n' + '\n'.join(failed))
    sys.exit(1)
print(f"PASS: {len(manifest['sha256'])} delivered files match the build manifest.")
