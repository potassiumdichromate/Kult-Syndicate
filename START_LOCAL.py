#!/usr/bin/env python3
"""Cross-platform local sandbox launcher. Install requirements first."""
import importlib.util
import os
from pathlib import Path
import runpy
import sys

root = Path(__file__).resolve().parent
os.chdir(root)
if importlib.util.find_spec('cryptography') is None:
    raise SystemExit('Missing dependency. Run: python -m pip install -r requirements.txt')
os.environ['SYNDICATES_DEMO'] = 'yes'
os.environ.setdefault('HOST', '127.0.0.1')
os.environ.setdefault('PORT', '8787')
base = os.environ.get('BASE_PATH', '').rstrip('/')
print(f"Open http://localhost:{os.environ['PORT']}{base}/ in your browser.", flush=True)
print('Local sandbox only. Press Ctrl+C to stop.', flush=True)
sys.path.insert(0, str(root / 'server'))
runpy.run_path(str(root / 'server' / 'app.py'), run_name='__main__')
