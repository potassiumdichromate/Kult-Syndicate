# KULT Syndicates 0.8.0 RC — verification notes

This update adds the field guide, unscouted Heist survey, crew activity visibility, and a client return brief. See [the concept and walkthrough](SYNDICATES_WALKTHROUGH_AND_NEXT_BUILD.md) for the product brief and next mechanics.

## Checked in this source package

- `python3 -m unittest discover -s tests -v`: **76 passed**. Includes the server-owned 2-Intel survey cost, no patrol disclosure before the survey choice, signed result, pending 2.0.0 mission compatibility, crew audit actions, World adapter receipt import, and existing authorization and settlement tests.
- `node --check web/app.js` and `node --check integration/world-adapter.cjs`: passed.
- `python3 scripts/check_web_export.py`: bundled Godot loader, WASM, PCK, worklets, image, and referenced assets complete.
- `python3 scripts/simulate_release.py`: 90 scripted agents, 450 signed receipts, all verified. Reader 150/150, opportunist 105/150, random 41/150. This is a deterministic rule-engine smoke test, **not** retention, learned intelligence, or a user forecast. See `SIMULATION_RESULTS.json` for the exact assumptions and run time.
- `python VERIFY_BUILD.py` and ZIP extraction verification: run again on the packaged release before handoff.

## Remaining release checks

The browser UI could not be visually exercised in this build workspace because the desktop browser cannot reach the isolated local server. Run the packaged build in the target staging environment on 1366×768, 1024×768, 390×844, and a keyboard-only path. Verify the guide modal, return brief, Crew activity, Heist survey choice, replay, and mobile drawer. The included Godot client is an optional legacy view; the new guide and decision presentation are in the default Three.js/HTML UI.

Before production, update the deployed KULT World receipt allowlist to admit `switchyard-2.1.0`, set the launch signing secret and receipt signing key, mount `/world/syndicates/`, and test the gateway with a real World identity. The service remains a fictional Supplies economy; OKX and 0G are not live integrations in this package.
