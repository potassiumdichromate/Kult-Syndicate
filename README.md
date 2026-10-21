# KULT Syndicates — 0.5.1 World operation beta

The Switchyard has a connected Scout → Heist → crew territory journey. A verified Scout report carries patrol intelligence into the next depot Heist for 24 hours. A paid, completed assignment from a qualified player Agent can provide the same lead to its buyer. The Copper workshop reduces Heist entry by one Supply; the Rooftop garden adds one Intel to a successful Scout. The server records the source Scout, hired contract if any, and territory effect in signed receipts. The district shows active intel, patrol, crew claims and progress. The 0.5.1 map update adds a next-stop directive, distinct building landmarks, camera focus and route feedback. See [0.5.1 release notes](docs/RELEASE_0.5.1.md).

The default view uses bundled Three.js. The optional Godot export remains from the previous release and does **not** show the new operation UI; use the default browser view for this experience. See [UX handoff](docs/UX_HANDOFF.md) for same-origin World embedding.

An independent isometric game inside KULT World. Bring the same Agent, direct its decisions, challenge a real player, hire proven work, and keep a signed record of successes and misses.

## This build includes

- Bundled Three.js browser district, optional earlier Godot 4.5.1 Web export and editable Godot source.
- Responsive HTML/Canvas shell and complete phone list fallback.
- Four NPC mission types: scout, negotiate, defend and heist.
- One linked district operation. Scout intel changes the next Heist; paid Scout work can be used by the buyer; crew territory grants bounded mission effects. Rule-based field notes show tradeoffs without marking a guaranteed winning option.
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

Open **http://localhost:8787**, enter the labelled sandbox, and use the default district view for the connected operation. Use two separate browser profiles/private contexts to test real PvP and hiring. Two tabs in one profile share an Agent.

1. Scout the canal. Verify both beacons and report uncertainty; the signed result reveals a patrol for 24 hours.
2. Enter the depot Heist using that report. Its receipt names the Scout receipt that informed the route.
3. Found a crew and contribute earned Supplies. When the crew has 4 seasonal Influence and 5 treasury Supplies, claim a place for 24 hours. Workshop lowers future Heist entry; garden adds Intel on successful Scout results.
4. For the hired route, enable hiring in two profiles. The qualified provider completes a paid Scout assignment. The buyer can then use that paid Scout report at the depot. Failed, cancelled and expired contracts do not create a lead.
5. Inspect both Passports, replay and export the signed receipts. PvP remains available under Play & hire.

The local sandbox creates separate demo Agents. It does not import or merge Arena history.

## Connect the real World

Follow `docs/IMPLEMENTATION.md` and `docs/OPERATIONS.md`. Use the supplied server-only adapter to issue a short-lived launch ticket for the authenticated existing Agent, pin the service's signing public key, and ingest signed callbacks idempotently. Configure TLS, mounted secret files and a persistent volume using `.env.example` and `compose.yaml`.

**Release status: local beta for staging.** The 65 backend and adapter tests pass, and the live HTTP sandbox completed Scout → Heist → crew workshop with independently verified receipts. The updated Three.js district still needs a real browser visual pass, mobile GPU checks, and World launch/delivery testing before public release. Production World credentials, a public deployment and backup/load checks remain with the deployment team. `docs/VALIDATION.md` records earlier release checks; see `docs/RELEASE_0.5.1.md` for this build's validation.

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
