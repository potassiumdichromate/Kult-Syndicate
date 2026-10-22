# KULT Syndicates 0.6.1-rc.1 — release evidence

Tested on 21 October 2026. This is a staging deployment candidate for the existing KULT World identity and receipt contract.

## Experience

Seven procedural landmarks now have distinct silhouettes: a lantern safehouse, observation tower, civic rotunda, depot and crane, twin gate, industrial workshop, and rooftop greenhouse. Camera focus is smoothed, route crossings are visible, map labels avoid overlap, and owners can switch label density and graphics quality. Pinch, pointer and keyboard controls are supported. The mobile native dialog keeps a mission, its costs and its choices in one console, with a direct return to the world. Compact embedding retains experience navigation.

## Actual test results

| Check | Result | What it establishes |
| --- | --- | --- |
| Python regression suite | 69 passed | Rules, identity boundaries, economy, social flows, migrations, adapter validation, nested mounting and per-Agent request limits. |
| Scripted population | 30 Agents, 120 missions | 50 successes and 70 misses; all 120 signatures verified, all 120 duplicate resolutions had no additional payout, 120 altered receipts rejected. |
| Persistence | 30 Agents reopened | Identity and all four receipts per Agent survived reopening the persisted service data. |
| Local HTTPS World contract | Passed | Signed launch, replay rejection, Secure scoped cookie, linked Scout/Heist, server restart, two verified callbacks and duplicate ingestion. |
| Desktop and mobile browser | Passed in Chromium 153 | Actual Three.js/WebGL, map selection, linked operation, crew Workshop, identity after reload, controls, mobile mission drawer and responsive/list navigation. |
| Native touch input | Passed in emulated mobile Chromium | Two-finger touch events change the projected district camera. |
| Two browser contexts | Passed | Real local player versus player rounds, private choice locks, qualified hiring, exact assigned mission, paid in-game escrow and mobile exchange. |
| Browser permissions and fallback | Passed | Emergency stop, crew controls, receipt verification, compact host mode, WebGL context loss and playable Canvas/list fallback. |
| Packaged Godot assets | Passed | Loader, WASM, PCK and local references are complete. This is the older optional client. |
| Deployment preparation | Passed locally | New secret/config creation, intended file permissions and refusal to overwrite. |

The population numbers are scripted regression outcomes, not user metrics, retention data, autonomous model performance or a concurrency benchmark. Chromium used software WebGL; mobile sizes and touch capability were emulated. The actual tests use the local service and do not fabricate player receipts in the frontend.

## Deployment changes

The browser, server and Godot bridge support `BASE_PATH`; cookies are scoped to the district. Nginx can preserve `/world/syndicates/` without routing KULT's root APIs to this game. Authenticated Agents have separate rate-limit budgets even behind one proxy. The container build accepts the complete bundled export, and the background worker no longer inherits an inappropriate HTTP health check.

## Remaining external checks

No live KULT credentials or production host were available. Docker image execution, physical-device GPU behavior, production load and backup restoration on the deployment host were not verified here. Use `DEPLOY.md` to configure and test those before public release. No new external AI, OKX payment, 0G anchoring or financial integration is claimed by this package.
