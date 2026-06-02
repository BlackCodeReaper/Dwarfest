# Dwarfest Execution Plan

## Current Status
- Project preparation completed.
- Goal order locked: gameplay correctness first, UI/UX polish second, multiplayer hardening and final fixes third.
- This file is now the canonical execution tracker.
- Gameplay core economy wiring completed.
- Phase 1 foundations extended with card-mode-ready scoring and session-safe defaults.
- Phase 2 core UI/UX wiring completed (language selector, IT/EN localization baseline, fame/rissa bars in key views).

## Completed So Far
- Realtime channel filter mitigation in sync layer.
- Supabase env validation and missing-config safeguards.
- Participant retry sync with backoff.
- Finished game flow and winner/ranking UI.
- Exit game and leave room actions.
- PWA setup (manifest, service worker, install prompt).
- Vercel SPA rewrites and headers.
- Schema hardening including room code constraint.

## Phase Plan (Operational)

### Phase 0 - Repository Preparation (completed)
1. Audit repository files and references.
2. Remove only strongly proven unused files.
3. Run test/build after cleanup.
4. Commit and push preparation changes.

### Phase 1 - Gameplay Correctness Foundation
1. Extend domain model in [src/types.ts](src/types.ts):
	- transaction-safe economy,
	- card mode and card lifecycle hooks,
	- chart scale config (default 1-20).
2. Implement pure rules in [src/services/gameUtils.ts](src/services/gameUtils.ts):
	- table/barrel/dancer costs,
	- affordability checks,
	- wallet floor at 0,
	- coin normalization,
	- mode-aware final score.
3. Add regression tests in [src/services/gameUtils.test.ts](src/services/gameUtils.test.ts).
4. Integrate state and authority guards in [src/useGameState.ts](src/useGameState.ts).
5. Status update (2026-06-02):
	- Implemented purchase/sale transaction APIs in state.
	- Wired PlayerSheet +/- controls for table, barrel, dancer.
	- Set nugget currency fields to readonly in gameplay.
	- Added wallet normalization by total nuggets in utilities.
	- Added card-ready config/types (card mode, player card payout, player cards container).
	- Added mode-aware final score calculation (physical vs in-app-generated).
	- Added migration-safe normalization for loaded session/template config and player fields.
	- Expanded unit tests for affordability, normalization, purchase/sale behavior and score composition.
	- Phase 1 now substantially completed for R1 foundation.

### Phase 2 - UI/UX Integration
1. Setup controls in [src/components/SetupScreen.vue](src/components/SetupScreen.vue):
	- language selector,
	- gameplay config fields needed before start.
2. Player interaction in [src/components/PlayerSheet.vue](src/components/PlayerSheet.vue):
	- nugget inputs readonly,
	- plus/minus actions for table, barrel, dancer,
	- card controls aligned with phase constraints.
3. Visual upgrades:
	- fame/riot bars in player sheet,
	- fame/riot bars in scoreboard,
	- fame/riot bars in endgame summary.
4. IT/EN localization across app UI and user-facing texts.
5. Status update (2026-06-02):
	- Added setup-only language selector with browser-language default and persisted locale.
	- Localized core UI panels and runtime interactions (setup/play/checkpoints/history/finished).
	- Added fame/rissa bar charts in player sheet, scoreboard, and final standings.
	- Added score and card bonus rendering for in-app-generated card mode.
	- Remaining in Phase 2: complete localization pass for every remaining status/sync string.

### Phase 3 - Multiplayer Hardening And Final Fixes
1. Validate host-authoritative behavior for all payout-impacting actions.
2. Validate participant read-only behavior for gameplay mutations.
3. Validate reconnect and realtime payload compatibility.
4. Final bug fixes and UX consistency pass.

## Locked Rules For Implementation
- Costs: table 4 nuggets, barrel 1 nugget, dancer 3 nuggets.
- Wallet must never go below 0.
- Gameplay nugget fields are readonly; mutations only through actions.
- Limits: tables 0-10, barrels 0-10, dancers 0-3.
- Card scope now: extensible R1 foundation; advanced effect system in R2.

## Risks
1. Advanced card effects need a formal DSL/rule schema in R2.
2. External production checks still depend on hosted Supabase and Vercel access.
3. Realtime edge cases may appear only in two-device network tests.

## Verification Checkpoints
1. `npm run test` passes after each major phase.
2. `npm run build` passes after each major phase.
3. Manual gameplay check: economy updates correctly and never underflows.
4. Manual UI check: nugget fields cannot be edited directly in gameplay.
5. Multiplayer check: participant cannot mutate protected state.
6. PWA check: install prompt and offline fallback still work.

## Next Milestone
- Start Phase 3 hardening: multiplayer host/participant smoke checks, reconnect payload validation, and final i18n/card UX polish.
