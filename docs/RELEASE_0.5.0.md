# Syndicates 0.5.0-beta.1 — connected World operation

## Player loop

1. Scout the canal. A successful, verified report (`verify` plus `qualified`) stores the server-observed patrol in a signed receipt for 24 hours.
2. Start the depot Heist. The server resolves its patrol from the most recent valid own or paid hired Scout report; otherwise patrol stays uncertain until the encounter. The new Heist receipt links the source Scout receipt and, for a hired lead, the buyer's paid contract receipt.
3. Use earned Influence and pooled in-game Supplies to lease a territory. A crew-held Copper workshop reduces Heist entry from 3 to 2 Supplies. A crew-held Rooftop garden gives one extra Intel on successful Scout resolution, subject to the Intel cap. Effects are captured when the mission begins and included in its receipt.

The first session now follows the operation, with a direct route to Scout, Heist, and crew; signed evidence and a read-only Syndicates memory counter follow the Agent. The Three.js map projects confirmed patrols, finished operations, and crew territory. Canvas and list navigation remain usable. The optional Godot export was not reauthored for this release.

## Rules and honesty

- Rules remain server authoritative. The browser never awards Supplies or creates a lead.
- The field note is explicitly rule based. It shows evidence and resource tradeoffs and no longer highlights the highest-scoring button. This is not a trained autonomous Agent or cross-game memory model.
- Hiring uses the existing bounded, owner-directed A2A escrow flow. Only a successful, paid Scout assignment with a provider receipt and qualified report can inform the buyer's Heist. A failed, unpaid, expired or cancelled assignment does not provide a lead.
- Existing earlier receipts remain verifiable. The World adapter accepts both `switchyard-1.0.0` and `switchyard-1.1.0`; in-flight older missions retain their old commitment version when resolved.
- Supplies and Intel are fictional game resources with no cash, yield, token, or stake.

## Local validation

`python3 -m unittest discover -s tests -q` — 65 tests passed, including Scout-to-Heist linkage, hired Scout-to-buyer linkage, territory costs and rewards, an older pending mission, identity/receipt invariants, and Node World adapter acceptance. `node --check web/app.js` and `node --check web/district3d.js` passed. An in-process HTTP smoke check returned 200 for `/api/health`, `/`, `/world.css` and `/district3d.js`. The Playwright Chromium executable was unavailable in this review environment, so updated visual and mobile browser QA remains a staging gate.

## Staging checks for the developer

1. Run the default browser district in desktop and physical mobile WebGL, then toggle Canvas/List fallback and keyboard navigation.
2. In two isolated profiles, verify a paid hired Scout report reaches only its buyer, and failed/expired offers do not create a lead.
3. Run a full World signed launch → Scout → Heist → crew claim → outbox delivery and verify both receipts after service restart. Test a 0.4 mission still pending during an upgrade.
4. Validate SQLite persistent volume, production signing key, callback secret, backups, health endpoint and rate limiting under staging load.

This is a functional beta, not a claim of public launch readiness.
