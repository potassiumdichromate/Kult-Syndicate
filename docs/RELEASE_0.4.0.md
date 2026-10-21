# Syndicates 0.4.0-beta.1

Updated default frontend for the KULT World experience. Added locally bundled Three.js district, seven interactable landmarks, path-following agent, camera controls, dark world shell, mobile map, accessible location buttons and compact embed mode. Original Canvas/list and repaired Godot export are retained.

Run locally:

```bash
python -m pip install -r requirements.txt
SYNDICATES_DEMO=yes python server/app.py
```

Open http://localhost:8787 and choose Enter local sandbox. Use `?embed=1` to review the compact host layout. Demo progress is isolated from a production KULT Agent.

Deployment: configure the existing `.env.example` settings, then `docker compose build` and `docker compose up -d`. The ZIP contains the complete Godot export, including both audio worklets and matching engine loader. A Godot re-export is not needed for this frontend update.

See UX_HANDOFF.md for mounting, controls and release boundaries. New check: `npm run test:world` (requires Playwright browser and a running demo server).
