# KULT Syndicates 0.7.1-rc.1 — PC layout and interaction

The desktop view now opens with the operation, 3D map and Agent console together. At 1024×768 and 1366×768, the selected mission's Commit button fits without page scrolling. Active missions enter the Focus district view so every available decision fits in the viewport. Owners can exit focus at any time.

The map switches secondary landmarks to icon pins when its viewport is short or narrow. The Labels control can reveal all location names. Standard wheel input scrolls the page; Ctrl/Command-wheel zooms the map. Map zoom buttons, dragging, keyboard pan and the list fallback remain available.

The mission rules, signed receipt format, SQLite schema, Godot export and World callback contract are unchanged from 0.7.0. The scripted simulation and gateway results in this archive document that underlying rule engine. No live KULT World host or production device was tested here.

## Local checks

- 73 Python tests passed.
- The new PC browser journey passed at 1024×768, 1366×768 and 1920×1080, including initial layout, label toggle, wheel/page scroll, modified-wheel map control, focus entry and choice visibility.
- The Scout → linked Heist → crew Workshop browser journey and two-finger touch camera check passed after the desktop update.
- Verify the delivered archive with `python3 VERIFY_BUILD.py` after extraction, then launch with `python3 START_LOCAL.py`.
