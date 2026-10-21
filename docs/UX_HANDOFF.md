# KULT Syndicates 0.4.0 — World district UX handoff

## What changed

The default browser experience is now a locally bundled Three.js isometric district. Seven original procedural landmarks sit around a canal with bridges, lights, foliage and a rail depot. Clicking a building or its keyboard-accessible label opens the existing mission or crew flow. The Agent follows a walkable route to the selected mission. Mission choice and outcome remain server-authoritative; movement is visual presentation.

The shell now uses charcoal, violet and lime, compact resource counters, a clear three-step journey, a contextual mission panel, and responsive job cards. The same theme covers Passport, permissions, hiring, duels and crew. Buttons explain entry cost before committing. Sandbox identity remains explicit.

## Navigation and accessibility

- Click a landmark or its labelled button to inspect it; keyboard Tab reaches every location.
- Drag to pan; wheel or +/− buttons zoom; reset restores the starting camera.
- Focus the map and use arrows to pan; +/− zoom, 0 resets.
- Mobile starts on the 3D district; tap locations or use List view for direct navigation.
- Device pixel ratio is capped at 1.6. Rendering pauses when the document or district is hidden. Reduced-motion preferences stop decorative water/marker motion.
- WebGL creation/context failure falls back to the original Canvas renderer; List view remains available.
- Three.js r170 and its MIT license are bundled. No remote scripts, fonts, textures or API keys are required by this visual upgrade.

## Embed in KULT World

Use the existing signed launch adapter in `integration/world-adapter.cjs`. Set the launch base URL to `https://YOUR-SAME-ORIGIN-HOST/world/syndicates/?embed=1`. This compacts duplicate branding and hides the sample World Home button/footer while keeping the experience navigation and sandbox/connected indicator. The launch fragment is consumed as before; the embed query is retained.

The current server intentionally allows same-origin frames only. Mount through a same-origin gateway and route the existing `/api`, `/vendor`, scripts, styles and `/godot` URLs to this service. The app still uses root-relative assets/API URLs: changing only the iframe path is not enough. No cross-origin iframe trust or identity shortcut was introduced. Do not expose shared launch/delivery secrets to the client.

This package includes the repaired Godot 4.5.1 export as an optional desktop view. Its game artwork has not been re-exported; the new default frontend is Three.js. Backend, receipt scopes, mission economy and identity protocol are unchanged.

## Validation and release boundary

Automated tests cover the 3D scene, building selection, mission completion, signed receipt verification, responsive layout, list navigation, existing permissions, crews, social duels and bounded hiring. The release remains a developer beta: test physical mobile GPU performance and the actual KULT World gateway/identity/receipt delivery before public launch. Docker is not available in the editing environment; validate the container on deployment.
