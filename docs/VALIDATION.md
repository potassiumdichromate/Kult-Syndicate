# Release validation — 0.4.0-beta.1

Executed October 17, 2026 against the updated browser frontend.

- Three.js renderer boot, seven location buttons, selection highlight, camera controls: PASS.
- Location → mission → three choices → resolution → signed receipt verification: PASS.
- Desktop and 390px mobile layouts, list navigation to Crew: PASS.
- Existing gameplay, permissions/emergency stop, Passport, crew and exchange browser suite: PASS.
- Two-browser PvP and qualified hiring through exact mission to paid Supplies escrow: PASS.
- Compact embed mode and simulated WebGL context loss to playable Canvas/list fallback: PASS.
- Python backend/HTTP/adapter suite: 60 tests PASS.
- Complete Godot web export validator: PASS. Existing compiled game preserved, not re-exported in this release.

Browser: headless Chrome 151 using software WebGL in this environment. These tests do not establish a frame-rate target on physical mobile devices. Docker build and real KULT World identity handoff are not tested here.

## Previous release validation (historical)

# Release validation — 0.3.2-beta.1

Executed October 3, 2026 against this release.

| Check | Result |
|---|---|
| Python backend, HTTP and Node adapter tests | **60 passed**; full output in `test-output.txt` |
| Godot 4.5.1 import and Web release export | **Passed**; compiled `.wasm` and `.pck` included |
| Browser mission flow | **Passed**: review → commit → three choices → resolve → verify receipt |
| Browser policy / crew | **Passed**: emergency stop, crew creation, same session restoration |
| Godot Web boot | **Passed**: authenticated Agent loaded, canvas visible |
| Two-session PvP | **Passed**: real independent browser contexts, private locked choices, three rounds, signed outcome |
| Two-session hiring | **Passed**: prior domain success → post → accept → bound mission → paid escrow → buyer balance and Passport |
| Mobile viewport | **Passed** at 390×844: list gameplay, Exchange, no horizontal page overflow |
| Browser JavaScript runtime | No uncaught page errors in tested shell/social flows |

The default Playwright browser CDN returned unavailable content. Browser tests used official Google Chrome via `CHROMIUM_PATH` and the installed Playwright package. Headless Godot boot uses software WebGL. Screenshots in `test-results/` are real browser captures; `docs/district-preview.png` is an older procedural Canvas preview, not this release's browser evidence.

## Security and settlement checks

Tests include server-side budget/permission enforcement, forged outcome rejection, CSRF/origin checks, owner boundaries, same-Agent binding, no history merges, restart persistence, concurrent joining, double-choice rejection, round privacy, forfeit/timeouts, draw/VOID results, domain qualification, cancellation/miss/withdrawal/expiry refunds, exact mission linkage, idempotent payout, mode isolation and cross-language verification of social receipts.

Godot's generated inline bootstrap initially failed the strict content security policy. The export now externalizes it with `scripts/secure_web_export.py`; the successful boot test ran after that fix. The Web preset is single-threaded and does not depend on SharedArrayBuffer.

## Not validated / remaining release gates

- Real production KULT identity gateway, live World callback endpoint and production secrets were not available. Local signed-launch/adapter tests are not a production connection.
- Public TLS deployment, sustained concurrency, abuse resistance, failover and backup restoration need staging verification. The server is a single-node SQLite beta using Python's threaded HTTP server.
- Physical iOS/Android devices, native Godot packaging and a complete manual Godot control pass have not been tested. Desktop Godot source compiled and booted in Web; most end-to-end interaction tests target the responsive browser shell.
- External A2A services, on-chain escrow, wallet payments, AI training and real-time action combat are outside this build.

**Release decision:** runnable, tested beta for staging integration. Do not represent local validation as a completed production launch.

## Packaging clarification

The full ZIP contains plain UTF-8 source and a compiled binary Godot Web export. A text preview of `index.wasm` or `index.pck` is expected to be unreadable. The source-only package omits generated binaries. `scripts/check_web_export.py` now validates referenced assets before Docker packaging, and CI attempts a Docker image build after exporting. Docker itself was unavailable in the local runner, so the image build is a required CI/staging gate rather than a locally executed result.

## 0.3.2 operational checks

- Versioned migration tests cover a fresh database, upgrade from unversioned schemas while preserving an Agent, and refusal to open a newer schema.
- Delivery tests cover timed retry, HTTP 429 delay and acknowledgment of the exact receipt ID.
- Managed signing-key file loading and secret-file resolution are covered.
- Compose syntax and secret mounts were parsed locally; Docker Engine was unavailable here, so the image build remains a CI/staging gate. No HSM/KMS integration is claimed.
