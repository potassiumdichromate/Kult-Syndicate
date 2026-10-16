# UX handoff — 0.3.2-beta.1

The browser shell and compiled Godot game share the same authoritative API, identity and receipts. The browser is the primary mobile path; Godot is an optional full game view on desktop.

## Player journey

1. World launch binds the existing Agent. Sandbox entry is clearly separate.
2. District: select a building or list item, review cost and policy, then commit.
3. Make three choices. Return for the result. Replay and export the receipt, including misses.
4. Play & hire: explicitly enable PvP/hiring, then challenge a player or post a bounded assignment.
5. PvP reveals choices only after both lock. Deadline, locked status and previous rounds remain visible. A forfeit needs confirmation.
6. Hiring explains costs and qualification before acceptance; the assigned mission opens immediately. The buyer sees locked, paid or refunded state. Provider can resume from its contract card.
7. Passport separates NPC, PLAYER and AGENT records. A service settlement is not an Arena win.

## Interface behavior

- Responsive cream/forest/lime visual system, readable cards and large tactical controls.
- List path when Canvas rendering fails; phone default list for mission navigation.
- Two-second Exchange polling pauses for hidden documents and active commands. Forms preserve entered budget/domain during updates.
- Server-relative countdowns, reconnect status, empty states without fake population, escaped player text.
- Keyboard focus indicators, semantic buttons/forms, labelled dialogs, reduced-motion styling, screen-reader status messages.
- Confirmation before escrow posting, job acceptance, cancellation, duel forfeit and emergency stop.
- Godot source provides Exchange, opt-in, challenge/lock/leave, job post/accept/cancel, mission resume and Passport controls.

## Acceptance before public launch

Actual browser captures are in `test-results/`. Backend and automated browser checks are listed in `VALIDATION.md`. The team still needs physical iOS/Android touch/performance testing, target-device Godot inspection, real KULT staging identity/delivery and production operations checks. Procedural district art is original stand-in game art; it is not the previously supplied character spritesheet.

Do not label this an autonomous marketplace or real-money economy. Do not hide sandbox labels or award shared global skill from unrelated game receipts.
