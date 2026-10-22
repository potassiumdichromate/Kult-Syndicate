# KULT Syndicates 0.7.1 — desktop experience update

A playable Switchyard district for KULT World: Scout the canal, use verified intel at the depot, pool earned Supplies with a crew, and claim territory. The same Agent keeps a signed record of successes and misses. Live duels and bounded Agent hiring are included.

**Start with [DEPLOY.md](DEPLOY.md).** It covers the included Docker configuration, new secret setup, the `/world/syndicates/` mount, and the KULT World adapter. This package is ready for staging deployment. The live KULT host and credentials must be configured and checked before public release.

## What changed in 0.7.1

- A compact desktop command deck brings the 3D district and mission action above the fold on 1024×768 and 1366×768 screens.
- Briefs show entry cost and the commit action before secondary explanation. Active missions automatically enter the focused map and decision view on PC; Exit focus remains available.
- Compact map labels adapt to shorter desktop viewports, with a control to reveal all labels. Normal mouse-wheel motion scrolls the page; Ctrl/⌘ + wheel or touchpad pinch zooms the map.
- A new browser check covers these desktop viewports plus 1920×1080, while the existing mobile and gameplay journeys still pass.

### The underlying 0.7.0 dynamics remain

- Situational clues alter the right move across Scout, Negotiation, Defense, and Heist. The field note offers rule-based context without revealing future events.
- A hidden patrol remains server-side until a verified Scout report or resolved receipt reveals it. Active mission state exposes no secret seed, score, or future twist.
- District alert persists between missions. Greed during a Heist raises it; a clean Defense, a daily resupply, or a once-daily 3-Supply lay-low action lowers it. Alert 2+ increases opposition resistance.
- Same-day repeated missions have reduced Supply payout and grant no new Influence. First-run rewards are lower to slow resource inflation.
- Two contributing crew members improve the Workshop discount or Garden Intel bonus. Signed replays show score, resistance, and alert transition.

The first guided operation remains Scout → linked Heist → crew, followed by repeat decisions. These mechanics are a local game release, not a live Mind, 0G, or OKX integration.

## Presentation and platform

- Seven distinct isometric landmarks, clear next-stop guidance, visible route movement, smooth camera focus, pinch zoom, keyboard controls, adjustable labels and a low graphics mode.
- Labels avoid other labels and the map's interface. The board fits narrow screens more cleanly.
- A native mobile mission drawer keeps decisions in view and returns the player to the district. Embedded mode retains the experience's navigation.
- All browser assets, API calls, session cookies and the optional Godot bridge support an isolated `/world/syndicates/` mount. KULT's root API routes remain available to its host.
- Authenticated Agents have separate request budgets behind a shared World proxy. Invalid tokens do not create independent budgets.
- The deployment build uses the included Godot export; installing Godot is only necessary if changing that legacy client. The default experience is Three.js. The legacy client is hidden unless `?legacy=1` is supplied.

## Packaging

The previous distributed ZIP was truncated. This replacement is rebuilt from source and checked after saving. Extract the entire ZIP before starting. Run `python VERIFY_BUILD.py` to check all delivered files. Opening `web/index.html` directly does not run the backend.

The UX now includes Focus district mode, larger mobile touch targets, more legible labels, keyboard focus indicators, and a sticky desktop mission console.

## Quick start (Windows, macOS or Linux)

Install Python 3.11 or newer. Open a terminal in the extracted folder, then:

```bash
python -m pip install -r requirements.txt
python START_LOCAL.py
```

On systems where Python is named `python3`, use that instead. Open the printed localhost URL. For deployment, use DEPLOY.md; the launcher is intentionally a local sandbox.

## Run locally

Python 3.11+:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash scripts/run_demo.sh
```

Open `http://localhost:8787/`. For the mounted experience:

```bash
BASE_PATH=/world/syndicates bash scripts/run_demo.sh
```

Open `http://localhost:8787/world/syndicates/`. Use separate browser profiles for distinct demo Agents; tabs in one profile share a session.

With Docker, the labelled sandbox requires no production secrets:

```bash
docker compose -f compose.sandbox.yaml up -d --build
```

Open `http://localhost:8787/world/syndicates/`. The port binds to localhost; use an HTTPS gateway for remote access.

## Play the connected operation

1. Enter Canal Watch and complete a Scout. A verified report carries patrol intelligence into the next Heist for 24 hours.
2. Review the depot mission. The Heist uses and records its source Scout receipt.
3. Create a crew, contribute 5 earned Supplies, and claim Workshop once the crew has 4 seasonal Influence. It reduces the next Heist entry cost by one Supply, or two when two members have earned Influence.
4. In Play & hire, a qualified Agent can complete a paid Scout assignment for another owner. The buyer can use that successful, paid report. Payment is fictional Supplies.
5. Inspect Passport to replay, export and verify the record, including misses and withdrawals.

No token, monetary deposit, real-money reward or live financial settlement is introduced. Agent field notes are rule-based guidance. External autonomous models, OKX and 0G are not added by this release. The signed World adapter is the integration boundary. This version binds one Agent per owner and does not merge or transfer histories.

## Verification

See [desktop release notes](docs/RELEASE_0.7.1.md), [dynamics and release evidence](docs/RELEASE_0.7.0.md), [simulation results](docs/SIMULATION_RESULTS.json), and [local HTTPS gateway results](docs/GATEWAY_TEST_RESULTS.json).

```bash
python3 -m unittest discover -s tests -q
python3 scripts/check_web_export.py
python3 scripts/simulate_release.py
python3 scripts/test_world_gateway.py
npm ci
npx playwright install chromium
npm run test:release
```

`test:release` starts isolated local servers and databases for browser journeys, using the actual API and Three.js. `CHROMIUM_PATH` can point to another installed Chromium. `TEST_BASE_PATH` selects the mount; it defaults to `/world/syndicates`. The optional `TEST_GODOT=yes` browser check boots the older Godot client.

## Deployment boundaries

The game rules, persistence, local HTTPS identity/callback contract, desktop WebGL, mobile viewport flow, hiring, duels and fallback navigation have been exercised locally. Docker image execution, the actual KULT host, physical mobile GPU performance and production concurrency/load were not verified in this environment. Keep a persistent data volume and the same signing key on upgrades. Run one game service and one receipt worker; the SQLite deployment is not designed for writable replicas.
