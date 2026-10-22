#!/usr/bin/env python3
"""Run each browser journey against its own real sandbox and persistent database."""
import json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
suites=sys.argv[1:] or ['browser-world.cjs','browser-social.cjs','browser-dynamics.cjs','browser.cjs','browser-embed.cjs','browser-touch.cjs','browser-repair.cjs']
base=os.getenv('TEST_BASE_PATH','/world/syndicates').rstrip('/')
for suite in suites:
 with tempfile.TemporaryDirectory(prefix='syndicates-release-') as data:
  env={**os.environ,'SYNDICATES_DEMO':'yes','SYNDICATES_DATA':data,'BASE_PATH':base,'RESOLUTION_SECONDS':'0','HOST':'127.0.0.1','PORT':'8787','PUBLIC_ORIGIN':'http://localhost:8787','BASE_URL':'http://localhost:8787'+base+'/'}
  server=subprocess.Popen([sys.executable,'server/app.py'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL)
  try:
   for _ in range(60):
    if server.poll() is not None:raise RuntimeError('Server exited before readiness')
    try:
     with urllib.request.urlopen(env['BASE_URL']+'api/health',timeout=1) as r:
      if json.load(r)['ok']:break
    except Exception:time.sleep(.1)
   else:raise RuntimeError('Server did not become healthy')
   result=subprocess.run(['node','tests/'+suite],cwd=ROOT,env=env,timeout=180)
   if result.returncode:raise SystemExit(result.returncode)
  finally:
   server.terminate()
   try:server.wait(timeout=5)
   except subprocess.TimeoutExpired:server.kill();server.wait()
print('All requested browser journeys passed.')
