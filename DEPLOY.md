# Deploy the Switchyard inside KULT World

This guide is authoritative for version 0.9.0. The service can run on its own origin or under `/world/syndicates/` on KULT World's origin. Same-origin embedding is supported; cross-origin iframes are intentionally rejected by the existing security policy.

## 1. Prepare config and signing material

Install Python 3.11+ and the requirements, then run:

```bash
python3 scripts/setup_deployment.py \
  --origin https://YOUR-KULT-WORLD-HOST \
  --callback https://YOUR-KULT-WORLD-HOST/api/syndicates/receipt \
  --secrets-dir /absolute/private/path/kult-syndicates-secrets
```

Replace the host and private directory with your deployment values. The script writes `.env`, separate launch and callback secrets, and an Ed25519 signing key. It refuses to overwrite existing configuration or keys. It prints the public key to pin in the World adapter. The private directory has mode 0700; files are read-only and readable by the non-root container user when bind-mounted. Keep the directory outside the checkout and backups private.

For an existing deployment, retain its signing key and data volume. Edit the existing `.env` rather than generating replacements. Compare its fields with `.env.example` and add `BASE_PATH=/world/syndicates` when mounting under World. Existing receipts require the same key.

## 2. Connect KULT World

Use `integration/world-adapter.cjs` on the World server:

- Call `issueLaunch` only after verifying the owner's existing World session and Agent ownership. Use the shared launch secret and a base URL such as `https://YOUR-KULT-WORLD-HOST/world/syndicates/?embed=1`.
- Redirect or open an iframe to its returned URL. The short-lived ticket is carried in the fragment and removed after consumption. Browser code never receives the shared secrets.
- Receive callbacks on the configured endpoint. Call `verifyDelivery` with the separate callback secret and the pinned Ed25519 public key, then ingest idempotently into that Agent's Syndicates record.
- A successful callback must respond with HTTP 200 and `{"ok":true,"receiptId":"the-received-id"}`. The worker retries failures and may repeat a delivery after interruption.
- **0.9.0:** the adapter must accept `switchyard-2.1.0` and `switchyard-2.2.0` NPC receipts. Update KULT World's copy of the adapter before (or together with) this service, or new receipts are rejected and the World Passport and 0G memory stop updating.

The local HTTPS contract test exercises this sequence with generated fixture identities and a real local receiver. It has not contacted your live World service. One bound Agent per owner is supported in this version.

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 syndicates receipt-worker
```

The full ZIP already includes the Godot 4.5.1 loader and WASM. Docker validates the export; it does not need a Godot editor installation. `scripts/build_container.sh` also uses the packaged export unless `REBUILD_GODOT=yes` is supplied.

The app runs as UID 10001 and uses the named `syndicates-data` volume. It binds host port 8787 to localhost. The worker uses the same image and volume; its inherited HTTP health check is disabled because it runs no HTTP server.

For a sandbox only, use `docker compose -f compose.sandbox.yaml up -d --build`. Do not use that configuration to bind real World identities.

## 4. Route the district

For an existing Nginx HTTPS host, include `deployment/nginx-location.conf` in its server block. The upstream path is preserved. The browser loads its own assets and `/world/syndicates/api/...`; no root `/api`, `/vendor` or `/godot` takeover is required.

Set `PUBLIC_ORIGIN` to the exact external HTTPS origin, without the path. Set `BASE_PATH` to `/world/syndicates`. For a dedicated origin served at `/`, set `BASE_PATH` to an empty string and route that whole origin to the service. Use normal edge connection/rate limits at your gateway; the application also limits unauthenticated API traffic by connection IP and authenticated traffic by verified Agent.

Check:

```bash
curl -fsS http://127.0.0.1:8787/world/syndicates/api/health
```

Expect `ok: true`, `version: "0.9.0-rc.1"`, `schema: 4`, `demo: false`, and `basePath: "/world/syndicates"` in the production configuration. Migration 004 runs on startup and only adds the `rival_moves` and `rival_holds` tables; existing Agents, missions, signed receipts and the signing key are untouched. Migration 003 (from 0.7.0) added the Agent alert column.

## 5. Verify on the live staging host

Launch an existing test Agent through World, finish Scout and Heist, inspect the linked receipts in both services, then restart the containers and confirm the same identity and history. Verify callback acknowledgment and duplicate handling, and that the new `switchyard-2.2.0` receipts reach the World Passport and the Agent's 0G memory. Open Crew to see the rival board, leave and return to check the return brief, and test a physical phone (dock, glass pages and the mission console).

The supplied evidence establishes local gameplay and contract behavior. This environment had no Docker daemon or live KULT credentials, so the built image, live gateway and production load still need the deployment team's checks. Keep the release in staging until those pass.

## Render: inside KULT World

`render.world.yaml` runs the Switchyard for KULT World on Render. KULT World
(`kult-world`, `syndicates/syndicates.mjs`) proxies `/world/syndicates/` to
this service, issues the launch tickets and receives the receipts. That keeps
the district same-origin with World.

- Render disks attach to one service, so `server/serve_world.py` runs the game
  and the receipt worker in one process on the same disk. `deliver.py` is
  unchanged; its loop runs on a background thread.
- Set the two secrets in the Render dashboard. The launch and callback values
  must match KULT World's `SYNDICATES_LAUNCH_SECRET` and
  `SYNDICATES_CALLBACK_SECRET`.
- After the first start, read the public key from
  `https://world.kult.games/world/syndicates/api/public-key` and set it as
  `SYNDICATES_PUBLIC_KEY` on KULT World.

## Upgrades and recovery

Back up the SQLite volume and signing key together before upgrading (0.9.0 adds migration 004). Test restoring them before opening to public traffic. Run a single game service and one worker. The worker delivers at most ten due receipts per cycle; inspect its logs and outbox backlog as traffic grows. Multiple writable replicas require a database/worker coordination change.

The default UI is Three.js. The optional previous Godot interface is accessible only with `?legacy=1`; its artwork and operation UI were not rebuilt. Do not present it as the new Switchyard interface.
