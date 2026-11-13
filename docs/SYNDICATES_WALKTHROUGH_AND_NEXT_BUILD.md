# KULT Syndicates: The Switchyard

## Product concept for the KULT World team

**An agent's decisions should matter after the mission ends.** Syndicates is a social strategy district inside KULT World. The owner directs the same KULT Agent through reconnaissance, a fictional depot operation, crew work, and optional human-versus-human duels. Decisions produce signed, replayable **Syndicates-domain** receipts, including misses and withdrawals. Information is a playable resource: a signed Scout report can change a later Heist decision. Crew members can pool earned, fictional Supplies and hold a workshop or garden for a 24-hour in-game lease.

This is a game of reading imperfect information, authorizing a bounded plan, and living with its consequence. It is **not** a live Minds agent, 0G Compute inference, real-money heist, market trade, or proof of general intelligence. In the local sandbox, the adviser is explicitly rule based. The World launch uses the player's existing Agent identity when the signed launch ticket is present. The receipt is signed by this service; World integration verifies and imports supported receipts.

### The one-minute promise

> “Scout the patrol, choose an entry, and see the result in your Agent Passport. Bring a crew when you want the district to change with other players.”

The first session should reach a meaningful choice quickly. Opening the map does not spend anything. The player sees the operation strip, reviews a job, then explicitly commits. On a return visit, show only actual receipts, member actions, and territory changes since that device last saw the state. No synthetic agent posts or implied live activity when the district is quiet.

## What the 0.8.0 RC build actually changes

| Change | Player effect | Implementation |
| --- | --- | --- |
| Heist entry survey | Without Scout intel, the player can gamble on an entry or spend **2 fictional Intel** for a safer entry worth **2 tactical score** rather than the **3** available from a correct, signed-Scout-informed route. Survey reveals the patrol only after the choice is committed. It does not guarantee mission success. | `server/content.py`, `server/dynamics.py`, `server/app.py` |
| Old mission compatibility | Missions already started under `switchyard-2.0.0` retain their original two entry choices and score rules. New missions use `switchyard-2.1.0`. Old receipts still verify. | `server/content_v2.py`, `server/dynamics_v2.py`, World adapter allowlist |
| Field guide | Four short, accessible panels explain resources, Scout → Heist, receipts, and crew. Open with **How to play**. | `web/index.html`, `web/app.js`, `web/style.css` |
| Return brief | A returning client compares a small last-seen snapshot against the server's receipts, crew audit actions, and current territory. The brief opens the relevant Passport or Crew view. It is suppressed when nothing changed. | `web/app.js` |
| Crew visibility | Members' seasonal Influence and the last 12 real member actions are visible to that crew. | `server/app.py`, `web/app.js` |

This update gives incomplete intel a real cost decision. It **does not yet establish long-term decision depth or retention**; the larger mechanics below are the next development brief. Do not present this release as a complete probabilistic simulation or autonomous agent society.

## Walkthrough to create in the product and in a 75–90 second explainer

Use a real sandbox session and real receipts. If a shot uses seeded development fixtures, label it `DEMO SCENARIO`. Never edit a result into a screenshot.

| Beat | Screen and interaction | Explanation / voiceover | Visible proof and state |
| --- | --- | --- | --- |
| 1. Arrive, 0–10s | KULT World opens the Switchyard under the existing Agent identity; in standalone demo show **LOCAL SANDBOX** clearly. The owner opens **How to play**. | “This district remembers what your Agent did. You direct every mission.” | Agent name, fictional Supplies and Intel, permission card. No wallet or real stakes. |
| 2. Read, 10–25s | Select Canal Watch and review the Scout entry cost; commit. At the beacon decision, cross-check, then submit a qualified report. | “The Scout does more than earn points. It creates information the next mission can use.” | Show the cost before commit, each choice, success receipt ID, patrol, and 24-hour expiry. Do not call an unsigned observation verified. |
| 3. Decide, 25–45s | Enter the depot while the Scout report is active. Show the named patrol and take the other route. In a second short inset, show the no-report alternative: unknown patrol versus 2 Intel entry survey. | “With a signed report, I can plan a stronger route. Without it, I can risk a guess or pay Intel to survey.” | The survey reveals the patrol **after** commitment. Report-informed route can score 3; survey scores 2; success still depends on the full mission and alert. |
| 4. Consequence, 45–60s | Finish the other two decisions, wait for the resolution, and open the Passport replay. Include a miss example after the success if a real miss receipt exists. | “The result is signed. We can replay the choice, costs, resistance, and outcome. Misses stay.” | Receipt signature check, seed commitment/reveal, spent resources, alert, outcome. Label game proof as Syndicates-domain evidence. |
| 5. Crew, 60–75s | Show another real member's contribution, member Influence, and a workshop claim if the crew has met the actual threshold. | “Your crew changes the next job only after members contribute and the lease is active.” | Owner/action/time in the crew activity; 4 seasonal Influence, 5 treasury Supplies, 24-hour lease; workshop benefit snapshots at mission start. |
| 6. Return, 75–90s | Leave, then return after another member action or a genuine territory change. Show the return brief and tap to inspect. | “When I come back, I see what actually changed while I was gone.” | No brief if there was no recorded change. Show source action; don't fabricate a rival's move. |

### Guidance for copy and interaction

- Call the owner **you** and the player's Agent **your Agent**. The current adviser is `RULE_BASED`; never suggest it independently researched or chose an option.
- Say **signed Scout report**, **signed game receipt**, or **service-verified game record**. Do not say “0G verified” or “proven intelligence” unless a specific external write and verifier are shown.
- Keep three things visibly separate: fictional Supplies/Intel, any future paid service transaction, and KULT World identity. The current hire flow escrows earned Supplies, not USDC.
- Keep the Scout useful: it accurately reports the observed patrol for the current contract window. If later builds add changing patrols, a newer observation must supersede the old one and both times must be visible. Never silently turn a signed report into a 70% guess.
- Let players inspect a job without paying. Clearly show entry cost, choice cost, alert, remaining permission cap, and why an option is disabled. Preserve keyboard, list-view, low-visuals, and mobile drawer paths.
- The return brief is a small browser last-seen convenience; the server remains the source of truth. A new device may have no prior snapshot. The screen must not imply global read-state sync.

## Next mechanics to build after this walkthrough

### 1. Depth through evidence, not hidden coin flips

Make each mission present an **exposure**, an **information gap**, and a **limited resource**. Offer distinct strategies: take a fast route; buy another observation; protect an exit; or accept a lower payout to reduce Alert. A clue can be incomplete, but its reliability and timestamp must be disclosed. Let a second signal narrow uncertainty, while no paid signal guarantees success. The outcome seed stays server owned, committed before play, and revealed in the receipt. Balance multiple clue combinations and costs so no single always-correct button survives after a few runs. Do not add arbitrary randomness merely to hide a lookup table.

First candidate: the Heist survey now exists. Add a mission state where a recent Scout report and a fresh on-site signal disagree. Show both timestamps and sources, allow a bounded recheck or conservative extraction, and record why the player trusted one. Old Scout reports must remain true observations of the time they were made. Version the content and keep old missions replayable.

### 2. An earned build that changes options

Introduce three horizontal capabilities earned from **different verified actions**, not purchasable power: Recon (opens a second observation route), Negotiator (reveals a bounded contract option), and Guardian (protects an exit or lowers an alert tradeoff). Each should open a choice in a specific mission, have a measurable cost, and appear as a Syndicates capability in the Agent Passport. Never grant guaranteed wins. Gate a capability on an explicit evidence rule, for example distinct qualified Scout successes rather than repeated same-day farming. Define when it resets, whether it transfers to KULT World, and how the owner can inspect the source receipts.

### 3. A social crew with actual stakes

Build on the current real contribution feed. Show **who did the Scout that enabled a crew Heist** and which signed receipt supports the link. For contested territory, use an explicit challenge window, equal opportunity, server-set resolution, consent, and an appeal/replay path. Do not replace an active 24-hour lease without the rule and deadline displayed in advance. A member's failed job should not silently drain another player's resources. Public Pulse cards require owner-approved visibility and a link to the relevant receipt; private crew details stay private.

### 4. A district that changes while people are away

Server-generated changes must have source events: a member completed a job, a lease expired, a challenge was resolved, or a report expired. Provide a monotonic event ID and per-owner cursor for cross-device recaps; the current local last-seen snapshot is a first slice. Summarize at most three consequential changes with **one next action**. Show nothing if there is no real event. Notifications must be opt-in with quiet hours and no fabricated urgency.

## Acceptance gates for the next development pass

1. A cold player understands the Scout → Heist link before spending and can explain what a receipt does after a short first session.
2. No hidden patrol, score, future twist, or raw seed leaks before the permitted reveal; an unscouted survey spends 2 Intel exactly once and is logged and signed.
3. Policy caps, emergency stop, stale choice rejection, seed commitment, settlement, and receipt verification remain server enforced. Old `2.0.0` missions and receipts remain valid after the new version ships.
4. Crew feed contains only real crew-member audit actions; return brief opens only for a difference from a last-seen snapshot. It never invents activity.
5. In a blinded replay cohort, compare first-session completion, second mission starts, D1/D7 return, **use of signed Scout versus survey**, receipt opens, crew invitations, and voluntary second-week missions. Also interview players about whether choices still feel meaningful after ten missions. A higher click count alone is not a win.
6. Run a 14-day forward cohort after replay tests. Treat any early retention or “8.5/10” estimate as a hypothesis, not a measured forecast.

## Implementation handoff

- Start with the supplied `0.8.0 RC` source and `VERIFY_BUILD.py`. The new game rule is `switchyard-2.1.0`; `content_v2.py` and `dynamics_v2.py` preserve `2.0.0` in-flight behavior.
- The World adapter in `integration/world-adapter.cjs` admits both versions. Keep the corresponding allowlist in the deployed KULT World gateway aligned before production traffic.
- The guide is in `web/index.html` and `web/app.js`. The client calls `/api/state`, which includes `crew.activity`; never drive outcomes from UI-only state.
- Automated Python suite currently covers 76 cases including survey timing, old mission compatibility, and crew activity. Browser/layout QA and live World mounting still need to be run in the deployment environment.
- Capture the walkthrough from real UI at desktop and mobile widths. Show a separate no-intel alternative as an inset, not as a fabricated second branch of the same mission.

**Product line:** *KULT Syndicates is where your Agent uses verified intel, accepts bounded risk, and builds a crew record the next decision can actually use.*
