# PRD — Greenward Named Watchers + Named Bosses

**Status:** Active. Branch: `ah/feature/greenward-named-characters` (off `ah/feature/greenward-campaign`; rebases to develop once PR #74 merges).
**Owner:** Alex
**Trigger:** PR #74 shipped the Consecration system with generic Inheritor creep types. Six named characters from the writer-locked plan are referenced in mission stories but don't exist as actual creep entities yet: **Old Woman of Eadwin** (M3), **Cethric the Crow-Priest** (M4), **Stone Bride** (M7), **The Child** (M8), **Knight** (M8), **Herald** (M8). Each is required for its mission's mechanics — without them, Mercy ruins have no Watcher to attach to and M8's boss-rush has no bosses.

---

## Goal

Each named character becomes a real creep type with a procedural sprite variant and per-mission spawn-and-bind wiring. After this PR, each Mercy mission has its Watcher creep actually spawning at the right cell and binding to the right ruin via `MercyWatcherTracker.attach()`. M8's boss-rush cycles Knight → Herald → Child as named boss creeps. The mission's `MissionResult.custom` fields (e.g. `knightKilled`, `heraldKilled`, `childUnharmed`) are written by per-creep death/damage hooks.

## Non-goals

- Bespoke per-Watcher art beyond procedural palette-swaps. v1-procedural-OK stance applies — recognisable variants over hand-pixeled masterpieces.
- Story prose changes — the writer-locked text in `greenward.texts.ts` stays verbatim.
- Boss UX polish (giant boss-HP-bars, special death animations) — defer to a balance/polish pass.
- Cethric's M8 corpse reference — pure narrative beat in `greenward.texts.ts`, no spawn needed in M8.

## Architecture

Each named character is built on the same three-layer pattern:

1. **Creep type entry** in `src/data/CreepTypes.ts` (under the existing Inheritor section). HP / speed / armor tuned per character.
2. **Sprite** in `greenward_campaign_sprites.tsx`. Palette-swap + small detail differences from the base Inheritor draw (or a fresh draw for the bosses). Render script bakes to `public/assets/arena/`.
3. **Per-mission spawn-and-bind** in the mission's wave-script or scene-init hook. The spawn creates the creep at the right cell, and (for Watchers) immediately calls `MercyWatcherTracker.attach({ creepId, col, row, ruinId })` against the live `_greenwardController.mercyWatcher`. (For bosses, attaches death listeners that flip `knightKilled` / `heraldKilled` on the controller's custom bag.)

**Where the spawn-and-bind code lives.** The cleanest place is a new file `src/systems/greenward/GreenwardSpawns.ts` that exports per-mission spawn functions:

```ts
spawnM3Watchers(scene, controller): void;
spawnM4Watchers(scene, controller): void;
spawnM7Watchers(scene, controller): void;
spawnM8Bosses(scene, controller): void;
```

`GameScene.create()` calls the matching function once after the `GreenwardMissionController` is constructed, keying off `this.missionContext?.missionIdx`. Single dispatch point; clean separation from the controller (which stays campaign-agnostic).

## Commits

### Commit 1 — `Named characters: M3 Old Woman of Eadwin`

- New creep type `inheritor_old_woman` in `CreepTypes.ts`:
  - HP 80 (low — she shouldn't take stray damage), speed 0 (sits at the hearth), armor `light`, gold 0 (Watcher).
  - Custom `applyDifficulty` that pins values regardless of difficulty (matches `inheritor_civilian` pattern).
- Sprite draw function `drawOldWoman` in `greenward_campaign_sprites.tsx`. Variant of base Inheritor with paler robes, no hood pulled up, single static frame, seated pose (legs tucked).
- `GreenwardSpawns.spawnM3Watchers(scene, controller)` — spawns at the `inn_hearth` ruin's cell (col 18, row 10) + binds via `mercyWatcher.attach`. Marks the spawn as immobile.
- Render script update to bake `old_woman.png`.
- Test: per-creep type assertions (HP / armor / gold-zero) + spawn test (asserts the binding fires).

**Acceptance:** `tsc` clean; full unit suite green; sprite bakes.

### Commit 2 — `Named characters: M4 Cethric the Crow-Priest`

- New creep type `inheritor_cethric` in `CreepTypes.ts`:
  - HP 100, speed 0, armor `light`, gold 0. Custom difficulty pin.
- Sprite draw `drawCethric` — crow-priest in a dark hood with a folded posture (cross-legged at the crossroads), feather motif at shoulders.
- `GreenwardSpawns.spawnM4Watchers` — spawns at the `crossroads` ruin cell + binds.
- Render script update to bake `cethric.png`.
- Tests.

**Note:** Cethric's M8 corpse reference is pure narrative — already in `greenward.texts.ts` M8 intro. No M8 spawn needed.

**Acceptance:** as above.

### Commit 3 — `Named characters: M7 Stone Bride`

- New creep type `inheritor_stone_bride` in `CreepTypes.ts`:
  - HP 120, speed 0.55 (SLOWER than the wedding-stone livery's 0.65 — the slow-walk visual cue the writer specified for "the bride is among them"), armor `heavy`, gold 0.
  - Walks the same path as the wedding-stone livery (no special path), differs only in identifier cue.
- Sprite draw `drawStoneBride` — wedding-stone variant with a moss-veil + single white flower in stone-hands. Otherwise matches the base Wedding-Stone walker so visual distinction is subtle (per the writer: Marra cannot tell from above which is the bride; it's slow-walk + flower).
- `GreenwardSpawns.spawnM7Watchers` — spawns the bride mingled into the wedding-stone wave script + binds. The mingling logic spawns N wedding-stone livery creeps with the bride at index ⌊N/2⌋ or randomised.
- Render script update.
- Tests including the visual-cue distinctness check (speed asserts).

**Acceptance:** as above.

### Commit 4 — `Named characters: M8 The Child (Watcher)`

- New creep type `inheritor_child` in `CreepTypes.ts`:
  - HP 200 (higher than other Watchers — she walks the court a long time without being directly engaged, and AoE positioning is the puzzle; need enough HP to survive incidental graze without instantly failing the star).
  - Speed 0.5 (slow; follows the host without ever fighting), armor `medium`, gold 0.
  - Custom `applyDifficulty` pins speed/HP regardless of difficulty (the AoE-positioning puzzle is the same on every difficulty).
- Sprite draw `drawChild` — small Inheritor (3/4 scale of base), banner of withered flowers held forward.
- `GreenwardSpawns.spawnM8Bosses` (named for the larger commit 5 use case but begins with the Child) — spawns the Child once at the `the_child` ruin cell + binds to MercyWatcher. The Child walks a circular path around the court without engaging.
- Render script update.
- Tests including: `notifyHpChanged(child, child.hp - 1)` flips watcher-touched + sets `controller.setCustom('childUnharmed', false)`.

**Acceptance:** as above.

### Commit 5 — `Named characters: M8 Knight + Herald (bosses)`

- Two new creep types in `CreepTypes.ts`:
  - `inheritor_knight`: HP 800, speed 0.8, armor `heavy`, gold 50. Damage type bonus against the Knight's heavy armor matters for build choices.
  - `inheritor_herald`: HP 500, speed 1.0, armor `medium`, gold 40. Slightly faster than the Knight.
  - Both `spawnBehavior: 'normal'`. Wave script defines the cycle.
- Sprite draws — Knight in armor with a broken sword, Herald with a tattered banner. Distinct silhouettes.
- M8 wave script — three-cycle Knight → Herald → Child (Child already spawning per commit 4). Knight + Herald are the spawn target for the boss-rush archetype.
- Per-creep-death listener in `GreenwardSpawns.spawnM8Bosses` — on Knight death, `controller.setCustom('knightKilled', true)`; on Herald death, `controller.setCustom('heraldKilled', true)`. M8's star 2 predicate already reads these fields.
- Render script update.
- Tests including: spawn the Knight, kill it, verify the controller's custom payload reflects.

**Acceptance:** as above + manual M8 smoke verifying the boss cycle.

### Commit 6 — `Named characters: GameScene spawn dispatch + cleanup`

- New file `src/systems/greenward/GreenwardSpawns.ts` exports the per-mission spawn functions assembled across commits 1-5 in their final form (refactor any duplicated cell-resolution logic into one helper).
- `GameScene.create()` calls the matching function based on `this.missionContext?.missionIdx` after `_greenwardController` is constructed. Single switch statement; no per-mission `if`s scattered.
- Integration test that constructs a headless scene + missionContext + asserts the spawn dispatch hits the right function per mission idx.

**Acceptance:** `tsc` clean; full unit suite green; existing greenward-smoke e2e regression green.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Sprite work eats time | Medium | v1-procedural OK stance; each variant is a palette-swap of base Inheritor. Spec each sprite as ~30 min of work. |
| Boss-rush wave-script integration unclear | Medium | The existing `boss_rush` archetype already runs Arcane M5 Crystal Warlords; use that as the implementation reference. |
| M8 Child AoE-positioning is a real puzzle that needs balance | Medium | Per-mission HP / Child path-shape can be tuned in commit 4. If it's impossible, drop the Child HP cap to make her tankier. |
| Difficulty scaling for Watchers shouldn't apply | Low | Each Watcher's custom `applyDifficulty` pins hp/speed (matches the established `inheritor_civilian` pattern from PR #74). |

## Safety nets

- `MercyWatcherTracker.test.ts` already covers the binding contract.
- Each commit's per-creep test verifies its specific behaviour.
- The full unit suite + greenward-smoke e2e + m10-overthrow regression gate every commit.

## Effort estimate

6 commits, ~6 hrs end-to-end. Most weight in sprite drawing (5 procedural variants) + M8 boss-rush wave-script integration.
