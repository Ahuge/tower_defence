# PRD — M10 "The Overthrow" E2E Coverage

**Status:** Draft, 2026-05-16
**Owner:** Alex
**Trigger:** Mech campaign on `ah/feature/mechanical-campaign` shipped without an e2e spec because balance + art were still moving. Now stable enough to lock in regression coverage before campaign #3 (Cypherpunk) begins.

---

## Goal

Add Playwright e2e coverage for M10 ("The Overthrow") that catches the high-severity regressions a future refactor could introduce, **without** coupling the test to balance numbers or placeholder art.

## Non-goals

- Full gameplay coverage (raider AI, workshop UI flows, pylon-channel UX, suppression interaction). Unit tests already cover these in isolation; e2e duplication is high-cost / high-flake.
- Loss-path coverage. Out of scope per scope call (sm0ke + happy-path only). Easy to add later as a third spec.
- Balance regression detection. We're not asserting on creep counts, gold totals, or damage values — those will churn every balance pass and break the spec.
- Visual diff. Procedural sprites + bespoke art landing in stages would generate noise; defer until art settles.

## Specs to add

Two specs, single file: `e2e/m10-overthrow.spec.ts`.

### Spec 1 — "M10 boots and HUD renders" (smoke)

**Asserts:** mission starts without crash, the game scene is alive, HUD reflects an M10 sabotage mission (generator count > 0, throne present).

**Flow:**
1. `gotoFresh` (announcement already pre-seeded).
2. Programmatic launch via `MissionRunner.start(MECHANICAL_CAMPAIGN, 9)`.
3. Wait for `gameScene` to be active (`window.__td_test?.isGameSceneActive()` — new hook).
4. Query sabotage state via new hook `getSabotageStatus(): { generatorsAlive, generatorsTotal, throneAlive } | null`.
5. Assert `generatorsTotal > 0`, `throneAlive === true`, `generatorsAlive === generatorsTotal`.

**Lines:** ~40. Runtime: ~10s.

### Spec 2 — "M10 happy path: kill all generators, throne falls, mission wins"

**Asserts:** the win-condition chain — throne is invulnerable while generators live; killing them flips throne to vulnerable; killing throne fires `gameWon`; mission marked complete in profile.

**Flow:**
1. `gotoFresh` → `MissionRunner.start(MECHANICAL_CAMPAIGN, 9)`.
2. Query initial state — assert throne invulnerable, N generators alive.
3. For each generator (driven by index from `getSabotageStatus()`): call new test hook `forceKillSabotageTarget('generator', i)` which routes through the real `Damageable.takeDamage()` path with enough damage to one-shot.
4. After each kill, re-query state; final assertion: `generatorsAlive === 0 && throneAlive && !throneInvulnerable`.
5. Call `forceKillSabotageTarget('throne')`.
6. Wait for `gameWon` event via `__td_test.onceEvent('gameWon')` (new test-hook helper).
7. Wait for GameOver scene to mount (UIBridge.screen === 'gameOver').
8. Assert `PlayerProfile.getMissionStars('mechanical', 9) >= 1`.

**Lines:** ~80. Runtime: ~20s.

---

## Required infrastructure changes

These land **before** the spec is written; each is a small, separate commit.

### 1. New `GameEvents` entries

Add to `src/systems/EventBus.ts`:

```ts
mech_generator_killed: (generatorIdx: number) => void;
mech_throne_killed: () => void;
mech_workshop_used: () => void;       // Reserved — used by analytics + future raider spec.
mech_raider_spawned: (raiderId: number) => void;  // Reserved.
```

Why all four when only two are needed for the spec? They earn their keep: Analytics already wants `mech_workshop_used` for funnel metrics, and the future raider spec wants `mech_raider_spawned`. Adding them now avoids a second event-shape PR.

`SabotageController` emits the first two on the real triggers (in the cascade handler + in the throne-killed branch). Workshop emits on click in the workshop UI. RaiderManager emits on spawn. Wiring is ~6 lines total.

### 2. New `__td_test` hooks (in `src/testHook.ts`)

```ts
isGameSceneActive(): boolean;
getSabotageStatus(): {
  generators: { idx: number; alive: boolean }[];
  throne: { alive: boolean; invulnerable: boolean };
} | null;
forceKillSabotageTarget(kind: 'generator', idx: number): boolean;
forceKillSabotageTarget(kind: 'throne'): boolean;
onceEvent<K extends keyof GameEvents>(event: K, timeoutMs?: number): Promise<unknown[]>;
```

Implementation notes:

- `forceKillSabotageTarget` routes through the real `Damageable.takeDamage(maxHp)` path — it does NOT bypass the controller's invulnerability gate. The spec relies on this: a `forceKillSabotageTarget('throne')` call before all generators are dead must be a no-op. This is *also* a behavioural assertion the spec can include for cheap.
- `getSabotageStatus()` reads SabotageController internal state. Add `getSnapshot()` to the controller returning a plain object — no `as any` casts from the test hook.
- `onceEvent` is a thin promise wrapper around the scene's EventBus. Useful beyond M10; tutorial-match.spec could simplify with it.

### 3. `MissionRunner.start` exposure

`MissionRunner` is already exported and importable, so the spec can call it via:

```ts
await page.evaluate(() => {
  const { MissionRunner } = window.__td_modules ?? {};
  const { MECHANICAL_CAMPAIGN } = window.__td_modules ?? {};
  if (!MissionRunner || !MECHANICAL_CAMPAIGN) return false;
  MissionRunner.start(MECHANICAL_CAMPAIGN, 9);
  return true;
});
```

But that requires `__td_modules`. Cleaner: extend `__td_test` with one campaign-launcher hook:

```ts
launchCampaignMission(campaignFactionId: string, missionIdx: number): boolean;
```

Internally, looks up the campaign def by faction id and calls `MissionRunner.start`. One line in the hook, one line of spec call — no need to expose modules via window.

---

## Test-hook surface growth

After this PRD: `__td_test` gains 5 entries (`isGameSceneActive`, `getSabotageStatus`, `forceKillSabotageTarget`, `onceEvent`, `launchCampaignMission`). The hook is currently 11 entries; this brings it to 16. Worth doing — every entry is a durable contract.

Three of the five (`onceEvent`, `isGameSceneActive`, `launchCampaignMission`) are generic and earn their keep beyond M10. Two (`getSabotageStatus`, `forceKillSabotageTarget`) are M10-specific and will likely need parallels for campaign #3+. We accept that — it's better than a single god-method that knows about every campaign.

---

## Acceptance

- `npm run test:e2e -- m10-overthrow` passes locally and in CI.
- Both specs complete in under 60s combined.
- `npx tsc --noEmit` clean.
- Existing tutorial-match spec still passes (event additions are additive).
- One unit test added to `SabotageController.test.ts`: emits `mech_generator_killed` / `mech_throne_killed` on the right transitions.

## Risks

1. **`forceKillSabotageTarget` bypasses gameplay realism.** It still goes through `Damageable.takeDamage`, but the test never exercises actual raider→tower combat. If a refactor breaks raider damage delivery, this spec passes; only the unit suite catches it. Acceptable tradeoff for happy-path coverage.
2. **`MissionRunner.start` from `?test=1` boot.** The test hook only installs after splash dismisses; launching a mission before splash dismisses would race. `gotoFresh` already waits for `isBootComplete` — this is fine, but worth a comment in the spec.
3. **Mission completion side-effects.** Mission win writes to `PlayerProfile` + may trigger announcements / unlock splashes. The spec asserts on profile state but should not assert on UI splashes that may change. The `flags` pre-seed in `gotoFresh` covers announcement modals.
4. **Procedural sprite assertions.** Don't assert on sprite textures — they'll change when bespoke art lands. Assert on state via the test hook, not visuals.
5. **Sabotage events used by Analytics.** Once `mech_workshop_used` / `mech_raider_spawned` exist, AnalyticsClient may want to subscribe. Out of scope for this PRD; flagged as follow-up.

## Effort breakdown

| Task | Est | Notes |
|---|---|---|
| Add 4 GameEvents + emit sites | 30 min | EventBus types + SabotageController hooks |
| Add 5 test-hook entries | 45 min | `testHook.ts` + `SabotageController.getSnapshot()` |
| Write `m10-overthrow.spec.ts` (2 specs) | 60 min | Pattern matches tutorial-match.spec |
| Update `SabotageController.test.ts` for new events | 15 min | Two emit-assertion sites |
| Update `fixtures.ts` `__td_test` type augmentation | 10 min | Mirror new entries |
| Run + debug | 30 min | Phaser timing quirks always need iteration |
| CHANGELOG / README updates | 10 min | Per project convention |
| **Total** | **~3.5 hrs** | One sitting |

## Sequencing

Land **after** PR #72 (Mech campaign) merges to develop, on a branch off develop:
1. Commit: GameEvents + SabotageController emits + unit-test update.
2. Commit: SabotageController.getSnapshot() + new test hooks + fixtures type.
3. Commit: e2e spec file.
4. Commit: CHANGELOG.

Sequencing this AFTER the bag-of-flags refactor would be cleaner (the test hooks wouldn't need to know `isGenerator: true` flag-shape vs trait-shape) — but the refactor itself benefits from this spec catching regressions. **Recommendation:** ship this PRD first; refactor second; expect to touch `getSabotageStatus()` and `forceKillSabotageTarget()` internals during the refactor, but spec assertions stay stable.

## Open questions

1. **Should `mech_throne_killed` fire before or after `gameWon`?** They'll fire in the same frame from `SabotageController.onThroneDeath()`. Document the order; spec waits on `gameWon` (the higher-level signal) to avoid coupling to internal sequencing.
2. **Workshop / raider events — wire them now or stub?** Lean: wire now. The emit sites are trivial; deferring means we'll re-open the same files later.
3. **Should `forceKillSabotageTarget('generator', idx)` validate that the index exists?** Yes — return false on bad index. Spec asserts the return value to catch off-by-one bugs in `getSabotageStatus()`.

---

## Future spec ideas (not in this PRD)

- **Loss path:** launch M10 → wait 60s of inaction → expect `gameOver`. Catches "mission never resolves."
- **Workshop UI smoke:** click workshop → panel opens → train queue increments. Asserts UI wiring without testing raider AI.
- **Pylon-channel smoke:** force a tower into suppression → assert tower stalled. Already covered by `SuppressionManager.test.ts`, so questionable value at e2e level.
