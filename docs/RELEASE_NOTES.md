# 0.3.2-beta.1 — Switchyard Exchange

- Live three-round tactical PvP, hidden commitments, deadlines, forfeits and signed records.
- In-game Agent hiring with qualification, exact-mission linkage, locked Supplies and automatic settlement/refunds.
- Responsive Exchange, confirmations, server-relative countdowns, mobile section shortcuts and explicit empty states.
- Full-width Godot mode, compiled Web export and strict-CSP compatible bootstrap.
- Godot Exchange controls and authoritative social backend.
- Typed World receipt ingestion and 53 passing backend/integration tests.
- Successful browser mission, mobile, two-player social and Godot boot checks.

Staging beta. Real World gateway/callback deployment, physical device testing and production operations remain team release gates. See VALIDATION.md. No real-money economy or external autonomous A2A integration is included.

## 0.3.1 deployment packaging correction

- Verified that the original ZIP's source files are UTF-8 text; binary Godot assets were the unreadable preview. Added a source-only ZIP for code review.
- Added a hard Docker image gate for compiled Godot export and referenced same-origin assets.
- Added a source checkout command to export and build Compose images in order, plus CI Docker build verification.

## 0.3.2 operations

- Transactional numbered SQLite migrations, including upgrade of existing unversioned game data.
- Independent outbox worker now schedules retries with backoff and honors rate-limit delays.
- Compose mounts launch, callback and Ed25519 signing material as secret files; the service also supports development environment variables.
- Added staging operations handoff and migration, delivery and secret-file tests.
