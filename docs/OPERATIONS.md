> **0.6 deployment note:** Follow [DEPLOY.md](../DEPLOY.md) for current setup, mount paths, packaged export builds and release gates. API paths below are logical service routes beneath `BASE_PATH`.

# Syndicates staging operations — 0.3.2 beta

This release runs one SQLite writer service and one independent receipt delivery worker. The named `syndicates-data` volume stores game state, signed receipts, commands and the durable delivery outbox. No browser request waits for the World callback. The service does not post to social networks or hold wallets.

## Schema and storage

Numbered SQL files in `server/migrations/` apply transactionally under a SQLite write lock. The database uses `PRAGMA user_version`; startup rejects a schema from a newer build. Existing unversioned v0.3 databases migrate in place, retaining identities and histories. Back up the data volume before replacing an image, and restore it in staging once. Do not run writable replicas on a shared SQLite volume.

For multi-node deployment or sustained high write contention, plan a PostgreSQL migration and a coordinated worker claim/lease mechanism. Adding Redis alone would not solve state consistency or receipt deduplication.

## Receipt delivery

`receipt-worker` reads the committed outbox and sends up to ten due receipts per cycle. A callback succeeds only on a matching receipt ID acknowledgment. Failures use exponential backoff (15 seconds to one hour); HTTP 429 also honors a bounded numeric `Retry-After`. Delivery may repeat after a crash, so the World receiver must deduplicate receipt IDs, as the supplied adapter does. Monitor pending rows, attempts and callback failures. Do not run multiple workers against this outbox without a claim/lease migration.

## Production secrets and signing identity

Create three files outside the checkout and keep their paths in `.env`:

- Launch secret: at least 32 random characters, shared with the authenticated World launch issuer.
- Callback secret: a different 32+ character value, shared with the World receipt receiver.
- Receipt signing key: an Ed25519 private key in PEM format. Generate it with `openssl genpkey -algorithm Ed25519 -out receipt-signing-key.pem`.

Compose mounts the files read only at `/run/secrets/`. The values do not enter Compose environment variables or the Docker image. Restrict the host files and backups to trusted operators. Pin the corresponding public key from `/api/public-key` in World. Restore the same key with the database; replacing it will break verification of old receipts until a multi-issuer verifier is implemented. Test recovery before public use.

This is file-backed key custody, **not HSM signing**. An HSM/KMS integration would require a signer interface, key identity/version support, a migration for historical verification and an operator-selected provider. No wallet key, third-party social credential or real-money payment rail belongs in this game service.

## Deployment sequence

1. Supply the three secret files and real HTTPS origins in `.env`.
2. Back up the existing SQLite volume and signing key.
3. Run `bash scripts/build_container.sh` to validate the included Godot export and build the checked image. Set `REBUILD_GODOT=yes` only when changing that client.
4. Run `docker compose up -d`; inspect `/api/health` for `schema: 3`.
5. Verify one production-mode launch ticket binds the existing Arena Agent, resolve a mission, observe one signed callback and its idempotent World ingestion.
6. Check pending outbox depth, failure backoff, physical-phone behavior and backup restore before opening the public door.
