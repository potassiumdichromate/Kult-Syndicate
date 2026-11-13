#!/usr/bin/env python3
"""Regenerate BUILD_MANIFEST.json from the files git would deliver.

Covers tracked and new, non-ignored files (so local data, virtualenvs and
node_modules are excluded), hashed the way VERIFY_BUILD.py checks them. The
version comes from package.json."""
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from VERIFY_BUILD import content_hash  # noqa: E402

files = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard'],
                       cwd=root, capture_output=True, text=True, check=True).stdout.splitlines()
files = sorted(f for f in files if f != 'BUILD_MANIFEST.json' and (root / f).is_file())
version = json.loads((root / 'package.json').read_text())['version']
manifest = {'version': version, 'sha256': {f: content_hash(root / f) for f in files}}
(root / 'BUILD_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'BUILD_MANIFEST.json: {len(files)} files, {version}')
