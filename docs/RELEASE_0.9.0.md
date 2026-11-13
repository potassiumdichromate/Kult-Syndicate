# KULT Syndicates 0.9.0 RC: rival crews

Ported onto the KULT World build of the Switchyard (the 3D world, glass HUD
and dock), so this release keeps the KULT World integration, the Render
deployment and the 3D assets.

## Gameplay

- **Rival crews.** Vance (escalation: targets the workshop), Iris
  (intelligence: targets the garden) and the Oathkeepers (stewardship: occupy
  an empty block only). The rotation makes one NPC move per observed UTC day
  (`server/rivals.py`); days nobody visited are not back-filled.
- **Territory competition.** Leasing a block a rival holds clears the hold,
  with the existing requirements: 5 crew treasury Supplies and 4 seasonal
  Influence. The Crew page shows each rival's doctrine, captures and holds.
- **Adaptive missions** (`switchyard-2.2.0`). Earlier Scout reports, Heists
  and negotiation choices shape later difficulty, patrol intelligence and
  cost. A Scout report goes stale after two report-led entries change the
  patrol. Pending `switchyard-2.0.0` and `2.1.0` missions keep their rules.
- **Return briefs.** Shown only when recorded state changed since the last
  visit on that browser: a crew action, territory, a rival move or a receipt.
- **First-visit tour.** The six chapters of the KULT Syndicates First Visit
  manual, told on the real interface (`web/tour.js`): each step opens the
  page it describes and spotlights one element. A checkpoint after chapter 02
  starts the Scout; chapter pills jump to any chapter. Opens once per browser
  on the first visit; Guide (key G) reopens it. The printable
  `web/player-guide.html` follows the same six chapters.

## Data and integration

- Migration `004_rivals.sql` adds `rival_moves` and `rival_holds`; schema 4.
  Migrations 001 to 003 are unchanged. Existing Agents, missions, signed
  receipts and the signing key are untouched. Back up before upgrading.
- `integration/world-adapter.cjs` accepts `switchyard-2.1.0` and
  `switchyard-2.2.0`. KULT World's copy must be updated before this service
  is deployed, or new receipts are rejected and the World Passport and 0G
  memory stop updating.

## Known behaviour

- Rival holds are shown on the Crew page and cleared by a crew lease, but do
  not otherwise change missions or rewards, and they persist across seasons
  (player territory is per season). Revisit if rival control should cost the
  player something.

## Evidence

- 79 backend tests (`python -m unittest discover -s tests`); on Windows one
  test's temporary-directory cleanup can fail on a SQLite file lock, which
  predates this release.
- `scripts/simulate_release.py` and `scripts/test_world_gateway.py` re-run on
  this build (`docs/SIMULATION_RESULTS.json`, `docs/GATEWAY_TEST_RESULTS.json`).
- Release gates still open: staging integration with KULT World, physical
  phone testing, and updating the Playwright journeys in `tests/browser-*.cjs`
  for the 3D shell (they target the 0.7 page layout).
