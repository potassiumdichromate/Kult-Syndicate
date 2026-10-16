# KULT Syndicates — 0.3.2-beta.1

An independent isometric game inside KULT World. Bring the same Agent, direct its decisions, challenge a real player, hire proven work, and keep a signed record of successes and misses.

## This build includes

- Playable Godot 4.5.1 Web export **and** editable Godot source.
- Responsive HTML/Canvas shell and complete phone list fallback.
- Four NPC mission types: scout, negotiate, defend and heist.
- **Live PvP:** three simultaneous-choice tactical rounds against another real player. Hidden choices, round deadlines, forfeits, draws and signed results. This is turn-based live tactical play, not real-time action combat.
- **A2A hiring:** owner-directed assignments between in-game Agents. Domain qualification, a new bound mission, locked Supplies, success-only payment and automatic refunds. External autonomous agent marketplaces and cash payments are not connected.
- Permission cards, emergency stop, same-Agent signed World launch, crew treasury, site leases, durable receipt delivery and independent signature verification.
- Exchange UI with mobile layouts, explicit confirmations, live status, empty states, mission resume and escrow history.

No token, entry stake, paid rank, fabricated players or real-money reward. PvP and hiring records never increase Arena wins or trading credentials.

## Run immediately

Python 3.11+ is required. The compiled Web game is included; a Godot installation is not needed to play.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash scripts/run_demo.sh
```

Open **http://localhost:8787**, enter the labelled sandbox, then select **Godot game** or play in the browser shell. Use two separate browser profiles/private contexts to test real PvP and hiring. Two tabs in one profile share an Agent.

1. Finish Scout in one profile to earn that Agent's domain qualification.
2. Open **Play & hire**, enable PvP and hiring in both profiles.
3. Open a challenge in one and accept it in the other. Lock one tactic per round.
4. Post a Scout assignment. The qualified Agent accepts and completes its assigned mission.
5. Inspect the payment and both Passports. Replay and export the signed receipt.

The local sandbox creates separate demo Agents. It does not import or merge Arena history.

## Connect the real World

Follow `docs/IMPLEMENTATION.md` and `docs/OPERATIONS.md`. Use the supplied server-only adapter to issue a short-lived launch ticket for the authenticated existing Agent, pin the service's signing public key, and ingest signed callbacks idempotently. Configure TLS, mounted secret files and a persistent volume using `.env.example` and `compose.yaml`.

**Release status: tested local beta, ready for your staging integration.** Production World credentials, a public deployment, physical phone testing and production load/backup checks must be completed by your team before public launch. See the exact executed checks in `docs/VALIDATION.md`.

## Rebuild / test

```bash
python3 -m unittest discover -s tests -v
# Godot 4.5.1 + matching templates, only when changing the game:
bash scripts/export_web.sh
# Browser QA against the running sandbox:
npm install
npx playwright install chromium
TEST_GODOT=yes npm run test:browser
npm run test:social
```

For a fresh source checkout, use `bash scripts/build_container.sh` after configuring `.env`. It exports Godot first, validates the generated HTML, scripts, WASM and PCK paths, then builds the Docker Compose images. `docker compose up -d` starts them. A direct Docker build fails with a clear error if the generated export is missing. The full downloadable ZIP already contains the compiled export; `web/godot` is intentionally ignored by Git, so the export step is essential after cloning source.

The `.py`, `.gd`, `.js`, `.html` and `.md` files in this archive are plain UTF-8 text. The `.wasm` and `.pck` files are compiled game data and will look garbled in a text preview. A separate source-only ZIP omits those binaries for easier review.

`CHROMIUM_PATH` can select an installed Chrome/Chromium executable. `scripts/secure_web_export.py` externalizes the generated bootstrap so the exported game works with the strict script security policy. The export is single-threaded; this preset does not require SharedArrayBuffer/COOP/COEP.

## Key files

- `server/app.py`, `server/social.py`: authoritative game rules, identity, transactions and social loops.
- `game/`: Godot project. `web/godot/`: compiled playable export.
- `web/`: responsive shell, map, live exchange, receipts and permissions.
- `integration/world-adapter.cjs`, `server/deliver.py`: World integration and durable delivery.
- `docs/IMPLEMENTATION.md`: deployment contract and release gates.
- `docs/SOCIAL_RULES.md`: exact PvP and hiring rules.
- `test-results/`: actual browser captures from this release's validation.
