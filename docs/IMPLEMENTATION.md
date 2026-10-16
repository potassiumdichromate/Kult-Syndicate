# Developer handoff

## Product contract

Syndicates is an independent KULT World door, not a KULT Create genre. The initial district is Switchyard. The player directs their persistent Agent through scout, negotiation, defense and heist jobs. Navigation is presentation; server-validated decisions determine outcomes. This is a decision-driven vertical slice, not a continuous real-time combat game. In the browser flow, selecting a job opens a preflight review; only the explicit commit request can charge its entry cost.

Every mission has three stages. The server commits a seed at launch, charges costs transactionally, enforces the selected policy, and produces one immutable signed result. Receipts record context, policy, choices, content version, seed/reveal, outcome and rewards. Misses and withdrawals remain visible. A signature proves the issuer and integrity, not independent truth or zero-knowledge fairness.

Rule-based advisers use mission context and recent recorded behavior. NPC patrol variation and past broken agreements affect selected situations. No LLM training, autonomous economic Agent, or cross-domain skill promotion is implemented. Do not market these rules as learned AI. Scout, negotiation and heist history stay in the Syndicates domain.

## Implemented vs future

| Capability | This beta |
|---|---|
| Four mission types | Server-authoritative, three choices per run |
| Persistent state | SQLite WAL, sessions, receipts, crew economy |
| Existing Agent | Signed KULT gateway launch; cookie-only identity rejected |
| Agent permissions | Allowed jobs, cap, risky choices, emergency stop |
| Agent Passport | Signed receipts, choice replay, misses preserved |
| Crews | Up to five, shared treasury, leader territory leases |
| Opponents | Labelled NPC missions and opt-in live PLAYER tactical duels |
| Art | Original procedural geometry; replacement sprite assets still needed |
| World delivery | Durable signed outbox + server adapter; locally tested |
| Live PvP / A2A hiring | Implemented: live tactical duels and owner-directed assignments with earned-Supplies escrow |
| Chain / wallets / payments | Not implemented or required |

## Connect KULT World

1. Back up the actual World server and use a staging checkout. Run `python3 scripts/patch_world.py /absolute/path/to/world`. This patcher only accepts the inspected v6.6 markers and creates a backup/diff. Review before deployment; adapt manually if the server differs.
2. Set a random 32+ character `KULT_SYNDICATES_LAUNCH_SECRET` on both servers. Use a different `KULT_SYNDICATES_CALLBACK_SECRET` for receipt delivery. Never send either to the browser.
3. On World set `KULT_SYNDICATES_URL=https://syndicates.example.com/world/syndicates/`. On Syndicates set `PUBLIC_ORIGIN=https://syndicates.example.com` and `KULT_WORLD_RECEIPT_URL=https://world.example.com/api/syndicates/receipt`.
4. Start Syndicates with a persistent data volume. Read `/api/public-key` and pin its `publicKey` value as World's `KULT_SYNDICATES_PUBLIC_KEY`. Back up the private signing key securely; rotating it requires an explicit issuer-key migration.
5. The real World building calls authenticated `POST /api/syndicates/launch`, using the existing gateway-authenticated request path, then navigates to the returned launch URL. Do not expose gateway signing credentials in client JavaScript. Fragment tickets are short-lived and single-use; the shell removes them after consumption.
6. Run `python3 server/deliver.py` as a supervised worker alongside the service. It retries pending delivery and only acknowledges a matching receipt ID. World verifies delivery HMAC and the pinned Ed25519 signature before append-only ingestion.
7. World stores receipts under the same existing Agent and shows the Syndicates summary. It does not grant Arena wins, alter global XP, or merge histories. A duplicate callback must be acknowledged without awarding again.

The sample `web/home.html` is a demonstration door. It is not a replacement for the user's existing KULT World UI. The patch adds routes/Passport data; your actual building click and Passport renderer must consume them.

## API boundaries

`POST /api/session` accepts a signed launch ticket (or an explicit local demo). `GET /api/state` restores state. Mutations require session, CSRF token, and an `X-Request-ID` idempotency key. The clients implement these headers. `/api/policy`, `/api/resupply`, `/api/missions`, mission choice/withdraw/resolve routes, and `/api/crew/*` are server-authoritative. Owners cannot submit an outcome. Public verification checks the cryptographic envelope; private receipt reads remain owner-scoped.

A mission is ACTIVE → PENDING → resolved, or ACTIVE → WITHDRAWN. The seed stays hidden until settlement. Mutation retries replay the prior response; conflicting reuse of the same idempotency key is rejected. The server persists active missions and policy state across restart.

## Deploy to staging

Copy `.env.example` to `.env`, set paths to three pre-existing secret files outside the checkout, and replace every placeholder. From a source checkout, run `bash scripts/build_container.sh` to export Godot, validate asset references, and build the images. Then `docker compose up -d` starts service + delivery worker. The Dockerfile copies `web/godot` into `/app/web/godot` and fails the build if it is missing. The Python service maps `/godot/*` to that directory and `/godot-bridge.js` to `/app/web/godot-bridge.js`; Compose does not mount over the web root. Put a TLS reverse proxy in front of the loopback port. Preserve the named data volume. Never ship the local demo database/key or enable `SYNDICATES_DEMO=yes` on a public production service. See `OPERATIONS.md` for key custody, migration and retry behavior.

This is a single-node SQLite beta. Do not scale writable replicas over an ordinary shared filesystem. The Python standard-library HTTP server is a development/beta implementation: assess production HTTP serving, edge abuse controls, monitoring, backup restoration and load limits before public launch. Cross-origin embedding is not required; use top-level navigation to the service and its same-origin Godot iframe.

## Release gates still required

- Godot import/export and Web boot were run for this release. Verify on your target devices and re-export after source changes.
- Browser mission/social flows and mobile viewport checks were run. Manually test physical phones, touch, reconnect and WebGL failure on your target devices.
- Connect a real staging KULT identity. Confirm exact Agent ID and that sandbox history cannot enter it.
- Complete a miss, interrupt/restart the service, redeliver the receipt twice, and verify one Passport entry with no Arena XP change.
- Deploy the worker with the pinned key and rotate/test secrets; verify backup restore before exposing the beta.
- Replace procedural stand-in art as desired; review the refreshed browser shell and native Godot source at real device sizes.
- Keep hiring payments in fictional Supplies. PvP is three-round tactical play; do not market it as real-time action combat.

## Social integration

`server/social.py` adds `/api/social/policy`, `/api/pvp/create|join|choice|leave`, and `/api/hiring/create|accept|cancel`. The normal authenticated `/api/state` includes the social snapshot. Only commands, never results, enter these endpoints. Polling is every two seconds while the Exchange is visible. See `SOCIAL_RULES.md` for exact transitions, deadlines and refunds.

World ingestion now accepts three explicitly versioned evidence scopes: NPC gameplay, PLAYER tactical duels, and AGENT service settlement. The adapter checks matching version, opponent type, domain and outcome allowlists. Existing World consumers must display these separately; do not add generic XP for every receipt. Reinstall the updated adapter before enabling social callback delivery.

The service signs both players' or contracting Agents' receipts and queues them in the same durable outbox. The real KULT deployment and callback target were not available in this workspace; use staging identities to verify the final server-to-server handoff.

## Operational scope

Single-process authoritative game service plus independent delivery worker; SQLite on a persistent local volume with versioned transactional migrations. The Python threaded HTTP server is suitable for the included local demo and a controlled staging beta behind a TLS reverse proxy. It is not a demonstrated high-concurrency production deployment. Social state currently uses JSON rows and scans; migrate active-state queries/indexes and measure contention before increasing capacity. Configure edge authentication/rate limiting, monitor settlement errors and outbox lag, and test backup restoration before public release.

Daily resupply and NPC rewards are faucets capped at 60 Supplies. Transfers can take a balance above 60; later faucets must not destroy that transferred balance. A2A is an in-app, owner-directed marketplace, with deterministic server settlement. External Agent marketplace discovery, wallet custody, payment rails and autonomous workers are outside this release.
