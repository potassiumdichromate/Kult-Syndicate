# Syndicates 0.5.1-beta.1 — Switchyard map UX

## Player experience

- The map shows the next stop based on server-owned operation state: Canal Watch for Scout, Depot for Heist, then Workshop for the crew territory objective. A running mission stays in focus.
- The Locate on map control focuses the next building. Selecting a location also focuses it and sends the player character along a marked path; the existing side panel handles the actual action.
- The seven building silhouettes and colors now carry recognizable local clues, including a scout antenna, depot crates, workshop machinery and garden roof. Canal crossings and tracks read more clearly as routes.
- Mobile collapses secondary labels into location markers while retaining accessible full names. The next destination keeps its label. Responsive resolution and lower shadow settings reduce GPU work on narrower screens.
- WebGL context loss retains the existing Canvas/list fallback. Godot remains an optional previous-release export and does not contain the new operation interface.

## Local validation on 21 October 2026

- `python3 -m unittest discover -s tests -q`: 65 passed.
- `node --check web/app.js` and `node --check web/district3d.js`: passed.
- `python3 scripts/check_web_export.py`: passed; the packaged Godot loader, WASM and assets are complete.
- A fresh sandbox server answered the HTML, CSS, Three.js module, bundled Three.js and Godot loader/WASM over HTTP. Via that server, one demo Agent completed a successful Scout, used its signed patrol report in a successful Heist, founded a crew, completed two Defend jobs, claimed Workshop, and received the reduced Heist entry cost. The receipts passed `/api/verify` and the Heist receipt linked the Scout receipt.

The browser image and interaction pass could not be run here: Chromium was unavailable and its installer could not retrieve the binary in this environment. Before a public release, test a desktop browser and a physical mobile WebGL device for pin overlap, route visibility, pan/zoom, touch selection, Canvas fallback and World embedding. Validate production launch and callback delivery using real World credentials. The HTTP test exercises the live backend and static asset delivery; it does not establish that Three.js rendered correctly on a GPU.
