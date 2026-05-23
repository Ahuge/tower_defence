# PRD — Snake Eyes M10 polish

**Branch:** TBD (post-#85 merge)
**Parent PR:** [#85 — Campaign aspect refactor](https://github.com/Ahuge/td-game/pull/85)
**Status:** Open

---

## 1. Background

PR #85 shipped Snake Eyes M10 (`counterfactual_mirror`) end-to-end as a v1 — the three-setpiece state machine drives correctly, the Counterfactual boss spawns, defeat triggers the EpilogueComposer + SnakeEyesEndingPanel. Pre-merge code review surfaced four polish items that are deliberate v1 deferrals, documented in CHANGELOG, and tracked here for follow-up.

Each item is small (10-200 LOC) and independently shippable. Bundled in one PRD because they share the M10 polish theme — they could ship as one PR or four; the PRD doesn't prescribe.

## 2. Items

### Item A — Mirror Lane HUD strip (player-facing)

**Current state.** Mirror Lane (setpiece 2) runs as a single-grid simulation. The `MirrorLaneController` race resolves correctly (player wave-clears vs. simulated CF clears on a 10s × Divergence-biased timer), the controller flips stage to `table` on player win or `lost_mirror_lane` on CF win, and star-3 reads `mirrorLaneWonOutright()`. None of this is visible to the player — they see their own wave progress and a CF "advancing" they can't observe. Player who hasn't read CHANGELOG won't understand why "Mirror Lane won outright" is a star-3 condition; from their POV they just played five normal waves.

**Acceptance criteria.**
- A HUD overlay strip appears during the `mirror_lane` stage only. Hidden before (Approach) and after (Table, complete, lost).
- Strip shows: "Mirror Lane" label + player lane progress (waves cleared / lane length) + Counterfactual lane progress + lane gap.
- Visual hierarchy: player progress prominent; CF progress secondary; lane gap rendered as a numeric chip (+2 = player ahead by 2).
- Tier-color palette matches `SnakeEyesPalette` (violet / gold).
- Responsive: works on phone + tablet + desktop without overflowing the HUD layer.

**Out of scope.** Full paired-grid render (two playable grids side-by-side, towers mirrored). That's a multi-week UI lift; the HUD strip is the comprehension-gap fix.

**Cost estimate.** 50-100 LOC Preact in `src/ui/campaign/MirrorLaneHud.tsx`. App.tsx renders conditionally on `campaignFactionId === 'void' && stage === 'mirror_lane'`. Pulls state via `getActiveSnakeEyesController()?.getM10Controller()?.getMirrorLaneController().getSnapshot()` — typed accessor chain per ADR-0003.

### Item B — Boss HP scales from `counterfactualBossHp(tally)` at spawn

**Current state.** Boss creep on M10 wave 11 spawns with `hpScale: 200` from the wave script. `counterfactualBossHp(tally)` computes 2000-12000 based on the player's lifetime Pactbook acceptance/decline. The pure-logic scaling is tested and working but the actual creep on-screen ignores it. Net effect: the central narrative beat from `snake-eyes-campaign-plan.md` — "Acceptance-heavy runs leave a bigger boss; decline-heavy runs leave a smaller boss" — is gameplay-invisible in v1.

**Acceptance criteria.**
- On M10 boss spawn, the creep's `hp` and `maxHp` fields are overridden from `controller.getM10Controller().getSnapshot().bossHpMax`.
- The HP bar renders the actual scaled value (not the wave-script baseline).
- Existing v1 win condition still works (HP→0 → death → `m10MarkBossDefeated`).
- Reset/replay behavior: re-launching M10 reads the live tally (which has updated if the player's accepted any new wagers since last M10 attempt).

**Cost estimate.** ~10 LOC. GameScene already has the instanceof-narrowed Snake Eyes block in `update`. Add a `creepSpawned` event listener that intercepts `void_counterfactual` and writes `creep.hp = creep.maxHp = m10.getSnapshot().bossHpMax`. Test: 1 unit test that constructs a controller with a known tally, spawns a fake creep, asserts the HP override fires.

### Item C — M10 launch e2e

**Current state.** No Playwright spec exercises M10 launch end-to-end. The pre-merge `snake-eyes-smoke.spec.ts` covers M1 PactbookPanel render + accept + decline + non-void-mission negative case. M10's three-setpiece state machine, boss spawn, win-trigger emit, and SnakeEyesEndingPanel render are unit-tested at the controller level but never integration-verified through a real Phaser mount.

**Acceptance criteria.**
- New file `e2e/snake-eyes-m10.spec.ts`.
- Test 1: `launchCampaignMission('void', 9)` succeeds (no `final_unimplemented` throw); GameScene becomes active; M10 controller exists in `approach` stage.
- Test 2: testHook helper advances the approach setpiece (`__td_test.m10AdvanceApproach()` × 5); controller stage flips to `mirror_lane`.
- Test 3: testHook helper resolves Mirror Lane in player's favor (`__td_test.m10ForcePlayerWinLane()`); stage flips to `table`.
- Test 4: testHook helper kills the boss (`__td_test.m10ForceBossKill()`); `gameWon` event fires; `SnakeEyesEndingPanel` renders.
- New testHook methods documented inline (one-liners like the existing M8 ones).

**Cost estimate.** ~150 LOC. Three new testHook methods + the spec file. No production code changes — just thin test-only seams on `SnakeEyesMissionController` (e.g. `_forceCompleteLane`, `_forceKillBoss`) following the existing `_resetMissionLeakCounter` / `_clearMissionPactbook` convention.

### Item D — M10 star-3 predicate reads from controller, not `MissionResult.custom`

**Current state.** M10's star-3 reads `r.custom.mirrorLaneWonOutright` via:

```ts
predicate: (r) => r.won && (r.custom.mirrorLaneWonOutright as boolean | undefined) === true,
```

The `mirrorLaneWonOutright` field is populated by a GameScene IIFE at finalize time. The string contract between the predicate (read) and the GameScene IIFE (write) is fragile — typo on either side is a silent miss.

M8's star-3 has the cleaner pattern: read through `getActiveSnakeEyesController()` directly. Aligning M10 with the M8 pattern removes the GameScene IIFE entirely (single source of truth: the controller).

**Acceptance criteria.**
- M10 star-3 predicate refactored to read `getActiveSnakeEyesController()?.getM10Controller()?.mirrorLaneWonOutright() ?? false`.
- GameScene IIFE for `mirrorLaneWonOutright` deleted (no other reader; was only populating the field for this predicate).
- The pattern is symmetric with M8's star-3 — future maintainers see one shape, not two.

**Cost estimate.** ~10 LOC delta (rewrite predicate + delete IIFE). 1 unit test verifying the predicate reads through the controller correctly.

## 3. Acceptance criteria (PR-level)

The polish PR is mergeable when:
- All four items above land (any commit ordering acceptable; one commit per item recommended for review-ability).
- `npx tsc --noEmit` clean.
- All existing tests pass; new tests for items B + C + D added.
- `e2e/snake-eyes-m10.spec.ts` passes in CI.
- CHANGELOG entry covering all four items.

## 4. Non-goals

- Full paired-grid Mirror Lane render. Multi-week UI lift; out of scope for the polish PR. A separate PRD would be appropriate if/when it becomes priority.
- Bespoke Counterfactual sprite. PR #85 added `void_counterfactual` aliased to the boss column (col 5) — the sprite is the boss silhouette. Bespoke art would be procedural in `void_sprites.tsx` (~50 LOC) but isn't strictly required for the campaign to feel complete.
- New Wager cards. The Pactbook deck (12 cards) is feature-complete.

## 5. Risks

- **Item A's HUD strip risks rendering during stage transitions.** The controller's stage flips synchronously inside `update` and `onWaveCleared` callbacks; the Preact render reads via `getActiveSnakeEyesController()` and re-renders on the next frame. There's a 1-frame window where the strip might render with `stage === 'table'` but the player hasn't yet seen the boss spawn. Mitigation: animate the strip's hide on stage exit (fade-out ~200ms) so the transition reads as intentional.
- **Item B's HP override timing.** The `creepSpawned` event fires after the creep is constructed. If anything reads `creep.maxHp` between construction and the override write, it sees the wave-script baseline. Mitigation: write in the same tick the event fires (synchronous handler), not via a setTimeout. Existing creep spawn code is synchronous.
- **Item C's e2e timing.** Snake Eyes M10 has a 999-wave count; the spec needs explicit win-trigger via testHook rather than waiting for natural wave completion. Mitigation: testHook seams (`_forceKillBoss`, etc.) are the standard pattern — Greenward M10 already does this.
- **Item D's refactor is reversible.** Star-3 predicate refactor is small and the deleted IIFE has only one consumer. Worst case (regression) is the predicate returns false → star 3 unobtainable → player files a bug. Low blast radius.

## 6. Recommended sequencing

Independent items; any order. Recommended:
1. **D first** (smallest, removes a fragile contract before any new code touches it)
2. **B** (next smallest, unlocks the central M10 narrative beat)
3. **C** (medium, gives confidence the M10 flow works end-to-end before adding visual polish)
4. **A** (largest, finishes the player-facing comprehension gap)

## 7. Out-of-scope follow-ups (do not include in this PR)

- Paired-grid Mirror Lane render (separate PRD)
- Bespoke Counterfactual sprite (separate PRD if/when prioritized)
- Difficulty pass on the Counterfactual fight (separate balance PR after first manual playtests)
- Snake Eyes Wager card art (12 illustrated card faces — long-flagged in the snake-eyes-campaign-plan)
