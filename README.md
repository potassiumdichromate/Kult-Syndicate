# KULT Syndicates 0.9.0 RC

A playable Switchyard district for KULT World: Scout the canal, use verified intel at the depot, pool earned Supplies with a crew, and hold territory against three rival crews. The same Agent keeps a signed record of successes, misses and withdrawals.

**Start with [DEPLOY.md](DEPLOY.md).** It covers Docker, Render, secrets, the `/world/syndicates/` mount, migration 004 and the KULT World adapter. Back up the database before upgrading.

## What changed in 0.9.0 RC

- **Rival crews.** Vance (escalation: targets the workshop), Iris (intelligence: targets the garden) and the Oathkeepers (stewardship: occupy an empty block). One NPC move per observed UTC day, recorded server-side; idle days are never back-filled.
- **Territory competition.** A crew reclaims a rival-held block with the existing lease rules (5 treasury Supplies, 4 seasonal Influence). The Crew page shows each rival's doctrine, captures and current holds.
- **Adaptive missions.** Earlier Scout reports, Heists and negotiation choices shape later difficulty, patrol intelligence and cost. A report goes stale after two report-led entries change the patrol. New NPC missions use `switchyard-2.2.0`.
- **Return briefs.** On return, a brief appears only when recorded state changed: a crew action, territory, a rival move or a new receipt.
- **First-visit tour and player handbook.** On the first visit an interactive tour (`web/tour.js`) walks the six chapters of the KULT Syndicates First Visit manual on the real interface: start here, the first two missions, the mission board, Play & Hire, crew and territory, Passport and return. It spotlights each part, opens the pages it describes, and pauses after chapter 02 so a new player can start the Scout. Guide (key G) reopens it, and the printable [player handbook](web/player-guide.html) follows the same six chapters.
- **Backend.** Migration `004_rivals.sql` adds `rival_moves` and `rival_holds` (schema 4); existing Agents, receipts and signing keys are untouched. Pending `switchyard-2.0.0` and `2.1.0` missions keep their original rules.
- **KULT World adapter.** Accepts `switchyard-2.1.0` and `switchyard-2.2.0` receipts (`integration/world-adapter.cjs`; apply the same change in KULT World before deploying).

## The Switchyard in KULT World's style

- A full-screen 3D floating island (`web/world.js`) built like KULT World's city: Meshy-made tiles, sky-rock, rail-yard props and seven landmarks, with KULT World's sky, lighting and bloom. Walk by clicking or WASD; E at a door opens its job.
- A glass HUD, quest tracker, mission console, minimap and dock open Jobs, Play & Hire, Passport, Crew, Permissions, the Console and the Guide as glass pages (`web/shell.js`, `web/switchyard.css`).
- Opened from KULT World, the player's own Agent appears on the HUD card and walks the district as its 3D model (`web/kult-agent.js`). Its identity is still the signed launch ticket.
- All assets, API calls, cookies and the optional Godot bridge support the isolated `/world/syndicates/` mount. If WebGL is unavailable the 2D map and the Jobs page keep every mission playable.

## Earlier releases

### 0.8.0 RC: field guide and decision update

- A four-panel **How to play** guide explains the first operation, resource costs, signed receipts, and crew contributions.
- An unscouted Heist can spend 2 fictional Intel to survey the entry for a safer but lower-scoring approach. The patrol is not disclosed until this choice is committed. A signed Scout report still gives the stronger route.
- Crew view shows members' seasonal Influence and their recent recorded contributions. The client displays a return brief only when receipts, member actions, or territory actually changed since that browser last saw the state.
- New missions use `switchyard-2.1.0`. Pending `switchyard-2.0.0` missions keep their original choices; both receipt versions are supported by the bundled World adapter.
- [Developer concept and walkthrough](docs/SYNDICATES_WALKTHROUGH_AND_NEXT_BUILD.md) defines the explainer, truth claims, and the next deeper gameplay pass. This build is a first improvement to incomplete-intel decisions, not a proven retention result.

### 0.7.1: desktop layout (superseded by the 3D Switchyard shell)

- A compact desktop command deck brings the 3D district and mission action above the fold on 1024×768 and 1366×768 screens.
- Briefs show entry cost and the commit action before secondary explanation. Active missions automatically enter the focused map and decision view on PC; Exit focus remains available.
- Compact map labels adapt to shorter desktop viewports, with a control to reveal all labels. Normal mouse-wheel motion scrolls the page; Ctrl/⌘ + wheel or touchpad pinch zooms the map.
- A new browser check covers these desktop viewports plus 1920×1080, while the existing mobile and gameplay journeys still pass.

### 0.7.0: dynamics (still in force)

- Situational clues alter the right move across Scout, Negotiation, Defense, and Heist. The field note offers rule-based context without revealing future events.
- A hidden patrol remains server-side until a verified Scout report or resolved receipt reveals it. Active mission state exposes no secret seed, score, or future twist.
- District alert persists between missions. Greed during a Heist raises it; a clean Defense, a daily resupply, or a once-daily 3-Supply lay-low action lowers it. Alert 2+ increases opposition resistance.
- Same-day repeated missions have reduced Supply payout and grant no new Influence. First-run rewards are lower to slow resource inflation.
- Two contributing crew members improve the Workshop discount or Garden Intel bonus. Signed replays show score, resistance, and alert transition.

The first guided operation remains Scout → linked Heist → crew, followed by repeat decisions. These mechanics are a local game release, not a live Mind, 0G, or OKX integration.

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

See [the 0.9.0 release notes](docs/RELEASE_0.9.0.md), [the developer walkthrough](docs/SYNDICATES_WALKTHROUGH_AND_NEXT_BUILD.md), [desktop release notes](docs/RELEASE_0.7.1.md), [dynamics and release evidence](docs/RELEASE_0.7.0.md), [simulation results](docs/SIMULATION_RESULTS.json), and [local HTTPS gateway results](docs/GATEWAY_TEST_RESULTS.json). The older browser and simulation results apply to the earlier release; rerun them for 0.8.0 RC in the target environment.

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
