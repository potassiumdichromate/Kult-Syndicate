# Live PvP and A2A — release contract

## PvP

Each Agent opts in. The server reserves one seat per Agent; an active NPC mission or another duel blocks entry. An unfilled lobby expires after 180 seconds. Only an Agent in the same mode (sandbox or KULT) can join. No lobby is simulated.

Three rounds, 45 seconds each. Flank beats Feint, Feint beats Guard, Guard beats Flank. Choices cannot be changed after locking and are absent from all snapshots until both players lock. Equal tactics draw the round. Most round wins wins the duel; equal totals draw it. A player who locks before a deadline wins if the other misses it. If neither locks, the duel is VOID. Leaving an active duel is a recorded forfeit. Disconnecting does not pause the deadline; reconnect restores the same seat.

The server signs one receipt per participant. No resource payout, generic XP or domain work qualification follows a duel. These receipts attest to this game's tactical decisions, not AI autonomy or commercial skill. A seed commitment is recorded for provenance; tactics are resolved by the stated deterministic rule, not by that seed.

## Hiring

The buyer opts in and posts one domain and a fee of 1–10 earned Supplies, limited by their escrow policy (default 5). Maximum three active buyer contracts. The fee is deducted atomically when the offer opens. No cash value or blockchain escrow is involved.

A different Agent in the same mode may accept only with at least one server-issued successful NPC mission in that exact domain, available mission budget and no active mission/duel. Acceptance atomically starts a **new** mission and records its ID. An old success cannot settle a new contract. The provider pays normal mission costs and can hold one accepted job at a time.

Unfilled offers expire after 15 minutes or can be cancelled by the buyer. Accepted jobs have 15 minutes to finish. A SUCCESS receipt from the exact provider and mission releases the fee once. Miss, withdrawal or expiration refunds the buyer. An expired job may still finish its game mission, but cannot earn the expired fee. Accepted contracts cannot be unilaterally cancelled by buyers. Provider withdrawal is permitted and refunds the buyer.

Both parties receive a signed service-domain receipt; provider NPC gameplay evidence remains a separate domain record. Escrow transfer amounts are in receipt context, not fabricated generic gameplay rewards. Turning permissions off blocks new actions; existing obligations still settle. Emergency stop blocks new missions, choices, duels and hiring; safe withdrawal and refunds remain possible.

## Operations and boundaries

- Session, CSRF, unique command ID, strict fields and server-side policy checks on every mutation.
- SQLite `BEGIN IMMEDIATE` serializes acceptance, reservations and balances. Idempotency prevents repeated commands from paying twice.
- Server maintenance sweeps deadlines every approximately two seconds while serving, plus sweeps on snapshots and mutations. Restart retains commitments and resolves overdue deadlines.
- The supplied World adapter verifies pinned Ed25519 signatures, delivery HMAC, version/domain allowlists, replay hashes and seed commitments. Integration must append receipts idempotently to the matching Agent.
- No external A2A protocol, smart contract, wallet transfer, autonomous execution or subjective arbitration is claimed. In this release the service adjudicates a deterministic game mission.
- A genuine receipt is not proof against coordinated account farming. Do not use these game outcomes as token eligibility, cash payouts or a universal reputation score. Live ops must enforce account/abuse controls before any such expansion.
