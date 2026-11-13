#!/usr/bin/env python3
"""Verify every delivered file after extraction, using only the Python standard library.

Text files are hashed with CRLF normalised to LF, so the same manifest passes
on a Windows checkout (CRLF) and on Linux or Docker (LF). Regenerate the
manifest with scripts/build_manifest.py."""
import hashlib
import json
from pathlib import Path
import sys


def content_hash(path):
    data = path.read_bytes()
    if b'\0' not in data[:8000]:
        data = data.replace(b'\r\n', b'\n')
    return hashlib.sha256(data).hexdigest()


if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'BUILD_MANIFEST.json').read_text())
    failed = []
    for name, expected in manifest['sha256'].items():
        path = root / name
        if not path.is_file() or content_hash(path) != expected:
            failed.append(name)
    if failed:
        print('Missing or modified files:\n' + '\n'.join(failed))
        sys.exit(1)
    print(f"PASS: {len(manifest['sha256'])} delivered files match the build manifest ({manifest['version']}).")
