# Web export repair — 17 October 2026

The supplied v0.3.2 ZIP omitted web/godot/index.js and index.audio.position.worklet.js.
The Docker failure was the export validator correctly rejecting an incomplete package.
The pip root warning was unrelated; dependency installation completed successfully.

Restored both files from the official Godot 4.5.1 stable export templates,
using templates/web_nothreads_release.zip (matching the project export preset).
Source: https://godot-releases.nbg1.your-objectstorage.com/4.5.1-stable/Godot_v4.5.1-stable_export_templates.tpz

The included index.wasm matches godot.wasm from that official template byte-for-byte.
The existing audio worklet also matches its official counterpart byte-for-byte.
The existing PCK, scenes, game logic and configuration were preserved.
Export validation now requires both audio worklets. Re-export requires Godot 4.5.1 stable.

## Deploy this ZIP

Extract the whole archive into a new directory. From KULT_Syndicates, configure
.env as described in README.md, then run:

```sh
python3 scripts/check_web_export.py
docker compose build
docker compose up -d
```

The complete web export is included. No Godot installation or re-export is needed
for this ZIP. For a source-only checkout, follow scripts/export_web.sh; web/godot
is gitignored, so a git archive is not a complete playable distribution.
Do not use index.js from another version or a threaded/custom template.

## Engine file SHA-256

```text
8a7c7d57f7da69bb71da9de302480b87e4c7ecb467ce643665b4a288683cd18f  index.js
6498359ba889796a0d95a2f71113ac184badc0f2d84cf28f4103c7e399d2d547  index.wasm
5b476a9c9ce642c0ee4256436d1bc31d9c38f868aca0f9a8e2a57c18d2dec2a3  index.audio.worklet.js
be33985bc7160d6bf9646f259cd86b259cd67b02ccb297ee5c44f8ac84327bc8  index.audio.position.worklet.js
```

## Validation performed

- 60 existing Python tests passed.
- Export validation passed, including both restored files.
- Official template WASM and existing audio worklet matched byte-for-byte.
- Browser smoke reached Godot 4.5.1 startup after HTML gameplay checks.
  The browser exited before the game-ready signal; full rendering remains
  unverified here. Run TEST_GODOT=yes npm run test:browser locally.
- Docker is unavailable here. Its failing Python validation step was checked;
  a full container build was not performed.
