# 0.6.1 repair and UX update

The previous saved ZIP was 8,064,885 bytes and lacked its ZIP central directory. Both the local copy and a fresh download failed to open with Python zipfile. This release is rebuilt from the intact source, rather than attempting to recover partial archived binaries.

## Changes

- Focus district mode keeps the isometric map and mission console prominent. Escape exits it; changing experience tabs also restores the normal layout.
- Mobile map markers, zoom/reset and mission close controls have 44-pixel touch targets. Labels and supporting text are larger; keyboard focus is visible.
- The desktop mission console stays in reach while navigating the district. The renderer pauses when offscreen or behind the mission drawer.
- START_LOCAL.py provides the same local sandbox on Windows, macOS and Linux. This is separate from the production launch configuration.
- VERIFY_BUILD.py checks all extracted files against BUILD_MANIFEST.json. The manifest detects incomplete extraction and accidental changes, not publisher authenticity.

## Validation

69 backend regression tests pass. A fresh 30-Agent scripted run completed 120 missions: 50 successes and 70 misses, 120 verified receipts, 120 rejected altered receipts, and no duplicate resolution payouts. The local HTTPS launch/callback/restart test passes. These are test data, not player metrics.

The default game is the Three.js district; the complete older Godot export remains included. No live OKX or 0G integration is added. Production Docker execution, real host credentials, physical mobile GPUs and production load still require staging verification.

Desktop and mobile gameplay, two-player duels/hiring, permissions, fallback, and native pinch tests passed. Focus mode, Escape, the mobile drawer, 320/390px overflow and 44px camera targets passed in a dedicated browser test. Desktop and mobile screenshots were visually reviewed. The new local launcher returned a healthy sandbox response. Chromium uses software rendering here; screenshot capture required a longer timeout.
