# KULT Syndicates 0.7.0-rc.1 — dynamics update

The Switchyard now makes the visible district state matter in play. Four NPC mission types draw server-owned situations and public clues. Route scores change with those situations, while the seed is committed before the first decision and revealed only in a signed result. A verified Scout report supplies the patrol location to a later Heist. An unscouted Heist exposes neither that location nor the scenario's future twist in active state.

## Decisions and consequences

| Choice or condition | Consequence |
| --- | --- |
| Clean Scout with verified, qualified report | Provides a 24-hour depot lead; success lowers alert by 1 |
| Unscouted Heist entry | Patrol is uncertain until resolution |
| Heist extra cache | Raises alert by 2 even if the mission misses; if unguarded and secured, earns 2 extra fictional Supplies |
| District alert 2 or 4 | Raises mission resistance by 1 or 2 respectively, determined at mission entry |
| Clean Defense | Lowers alert by 2 |
| Daily resupply | Adds at most 6 Supplies and 2 Intel, lowers alert by 1, once per UTC day |
| Lay low | Costs 3 Supplies and lowers alert by 2, once per UTC day, between missions |
| Same-day repeat of a mission type | Approximately half the base Supply reward and no Influence |
| Two contributing crew members | Workshop reduces Heist entry by 2; Garden adds 2 Intel on a successful Scout |

These are fictional game resources and human-directed rule-based decisions. The Agent field note is not an LLM or independent Mind. There is no real-money settlement, live OKX or 0G dependency, autonomous agent learning, or real external player outcome in this package.

## Scripted comparison

`scripts/simulate_release.py` exercised 90 fresh Agents, 30 for each behavior, with five actual SQLite missions each. It reopened their persistent records and verified every signed receipt. The three policies used public clues differently; results are **illustrative scripted behavior**, not user engagement or predictive retention:

| Script | Successful jobs / 150 | Mean final Supplies | Mean final alert |
| --- | ---: | ---: | ---: |
| Clue reader, extracts safely | 150 | 20.63 | 0.00 |
| Opportunist, takes extra cache | 106 | 17.53 | 3.13 |
| Random legal choices | 46 | 11.03 | 3.10 |

These figures vary if scenario seeds, decision scripts, or reward rules change. A careful reader can still solve every situation in this finite rule set; the game has **not** proven long-term interest or autonomous capability. Real play sessions should measure second-job return, retries after a miss, crew invitations, replay views, and next-day return. Expand mission content only after those observations.

## Compatibility and validation

- SQLite migration 003 adds `agents.alert` with default 0. Existing databases and older active missions retain their earlier rule version; the World receipt adapter accepts old and new versions.
- The API keeps private scoring on the server, signs the assessment replay, and rejects duplicate mutation through request IDs.
- Local Python tests cover migration, legacy receipts, hidden information, reward bounds, alert/lay-low constraints, two-member crew benefit, and signed delivery.
- The browser suites exercise the actual desktop and mobile experience, including Three.js and the list-view fallback. Local HTTPS gateway tests simulate signed KULT identity and callbacks. The live World host, Docker execution, production scale, and physical device GPU are separate deployment checks.

Run `python3 VERIFY_BUILD.py` after extracting the delivered ZIP, then `python3 START_LOCAL.py` for a local sandbox. See `DEPLOY.md` for World mounting and production secret setup.
