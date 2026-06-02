# Dwarfest Execution Plan

## Current Status
- Phase 0 complete.
- Phase 1 and 2 substantially complete (economy automation, card-mode foundation, bilingual UI baseline, charts).
- Opening rejection penalty aligned to tabletop rule (-1 fame, +1 brawl).
- Next active work: Phase 3 hardening + remaining tabletop flow completion.

## Rules Reference (Agent Use)
- Primary source: https://geek.pizza/2018/02/21/il-gioco-sul-como-dwarfest/
- Rule policy: if behavior is ambiguous, align with source before introducing custom logic.

## Canonical Flow (Tabletop)
1. 5 rounds total.
2. Per round phases: Supplies -> Opening -> Service -> Brawl -> Collection.
3. Opening rejection: for each rejected client card, -1 fame and +1 brawl.
4. Service constraints: each table seats max 4 dwarves, each barrel = 5 beers, opened barrels consumed entirely.
5. Brawl trigger: >=6 (>=5 epic variant), destruction order tables -> barrels -> dancers.
6. Collection: payout = effectively served dwarves, brawl reset to 1, fame persists.

## App Adaptation Boundaries
1. Beer service can be physical or in-app minigame.
2. Client/service cards can be generated in-app for digital-only play.
3. Destruction may be resolved atomically in app (with clear feedback) instead of manual step-by-step.
4. Economy math (pepite/asset costs) is app-automated and host-authoritative in multiplayer.

## Phase Plan (Operational)

### Phase 0 - Repository Preparation (Completed)
1. Audit, cleanup, test/build, commit/push completed.

### Phase 1 - Gameplay Correctness Foundation (Substantially Completed)
1. Transaction-safe economy and limits.
2. Mode-aware scoring and wallet normalization.
3. Card-mode-ready types/state + migration-safe load.
4. Unit tests for core utility rules.

### Phase 2 - UI/UX Integration (Substantially Completed)
1. Readonly nugget fields and transactional controls.
2. IT/EN setup selector and localized core UI.
3. Fame/brawl bars in player sheet, scoreboard, final screen.

### Phase 3 - Multiplayer Hardening And Tabletop Flow Integration (Current Focus)
1. Validate host-authoritative enforcement for all payout-affecting actions.
2. Validate participant read-only enforcement for gameplay mutations.
3. Reconnect and realtime payload hardening for new service/card state.
4. Complete tabletop flow logic gaps:
   - verify Opening rejection penalty behavior in multiplayer/reconnect flows.
   - complete Service capacity/beer accounting edge handling.
   - complete Brawl destruction sequence and Collection reset/payout consistency.

### Phase 4 - Final Fixes And Polish
1. Complete remaining i18n strings (sync/status/edge prompts).
2. UX polish for service/brawl/collection transitions.
3. Regression validation and release readiness.

## Locked Rules For Implementation
1. Costs: table=4, barrel=1, dancer=3 nuggets.
2. Wallet never below 0; gameplay nugget fields readonly.
3. Limits: tables 0-10, barrels 0-10, dancers 0-3.
4. Opening rejection penalty must be -1 fame and +1 brawl.
5. Brawl destruction order remains tables -> barrels -> dancers.
6. Collection remains payout by served dwarves + brawl reset to 1 + fame persistence.

## Risks
1. Remaining multiplayer edge cases emerge only under two-device realtime conditions.
2. Rule-accurate service/collection automation may conflict with older local saves unless migrated carefully.
3. Advanced card effects still require formal DSL and balancing pass in R2.

## Verification Checkpoints
1. `npm run test` passes after each major increment.
2. `npm run build` passes after each major increment.
3. Multiplayer smoke: participant cannot mutate protected state.
4. Gameplay smoke: opening rejection applies fame+rissa penalty correctly.
5. PWA smoke: install and offline fallback intact.

## Next Milestone
1. Finish Phase 3 by validating multiplayer/reconnect behavior on service-card actions and completing service/brawl/collection rule hardening.
