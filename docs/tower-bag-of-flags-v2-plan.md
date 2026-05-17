# Plan — Tower.ts Bag-of-Flags Refactor v2

**Status:** Active, branch `ah/cleanup/sprite-location-pylon-invariant` → PR #73.
**Owner:** Alex
**Trigger:** Two campaigns (Arcane, Mech) shipped; each added 5–10 mission-specific fields directly to `Tower.ts`. A third campaign before the refactor repeats the same debt pattern at higher migration cost.

---

## The disease

`Tower.ts` currently carries clusters of mission-specific state directly on the base class:

| Cluster | Fields | Source |
|---|---|---|
| Destructibility (M10/finale) | `destructible`, `hp`, `maxHp`, `_lastHitAt`, `_expired`, `alive` getter | Arcane/Mech M10 |
| Hero/send retaliation | `_lastHeroHitAt`, `_lastSendHitAt`, `_lastAttackedHeroAt` | Arcane finale |
| Mech finale tags | `_invulnerable`, `isGenerator`, `_generatorDrained`, `generatorLinkedCells`, `isThrone` | Mech M10 |
| Mech suppression | `_stress`, `_suppressionSeenLastFired` | Mech campaign |
| Arcane finale | `isUlt` | Arcane M10 |
| Stormcaller stun | `_disabledRemaining` | Stormcaller channel |
| Aura cosmetics (`as any` casts!) | `_linkedByConduit`, `_conduitX`, `_conduitY` | Conduit aura tower |

Every new campaign adds another 5–8 fields. Three `(this as any)` casts in `drawTower` are already embarrassing. After three campaigns the class is unmaintainable.

## Why this plan (v2) replaced v1

v1 (per-controller WeakMaps for mission tags) was reviewed and rejected for three forecast failures across "many future campaign one-offs":

1. **`_damageVeto: boolean` doesn't compose.** Future campaigns want shields, % resists, last-stand, mute windows. A single boolean re-becomes a bag of booleans by campaign #4.
2. **`drawTower` becomes the new bag-of-flags.** Moving state off `Tower` left rendering branches on `Tower`. Each new campaign visual lands another conditional in `drawTower` plus a controller import in the base class.
3. **WeakMap fragmentation.** N campaigns → N controllers → N WeakMaps. Discovering "what state does tower X have" means grepping across all controllers. Exactly the discoverability problem we're trying to fix.

v2 fixes all three: state co-located on the tower (as trait instances), declarative in data files, `drawTower` iterates a registry, zero `Tower.ts` edits per campaign.

## Architecture

Three pipelines on `Tower`, none of them hard-coded:

### 1. Damage pipeline

Replaces hard-coded forks in `Tower.takeDamage`:

```
takeDamage(amount, source?) →
  resolveDamageVeto(traits, amount, source)    // OR semantics: any veto wins
  resolveDamageModifiers(traits, amount, source) // chain: modifier (amount, ctx) → amount
  apply hp damage                              // hp -= final, log assailant, _lastHitAt
  resolveOnKill(traits, source)                // on hp ≤ 0
```

Future shields, % resists, last-stand, mute windows all become trait handlers. Composable, not boolean.

### 2. Render-hooks registry

`drawTower` calls base render + iterates `resolveOverlayDraw(traits, tower, graphics, scene)`. Sabotage / Suppression / Finale modules register their own overlays at module-init time; `drawTower` stops knowing about any campaign.

### 3. Trait lifecycle extension

`Trait.ts` gains `onSpawn`, `onDespawn`, `onTakeDamage`, `onKill`, `onOverlayDraw` registries paralleling the existing `onFire` / `towerUpdate` / etc. Purely additive — no existing handler changes.

## What lives where

**Destructibility stays on `Tower`** (as `Tower.destructible: DestructibleState | null` sub-object). Parity with `DestructibleStructure` via `Damageable` matters; ~25 reader sites is bounded migration cost.

**Mission tags become traits**: `mech_generator` (carries `linkedCells`), `mech_throne`, `mech_invulnerable_until_generators_dead`, `arcane_ult_target` — declarative in tower data, discoverable via `getTrait(tower.traits, 'id')`. **Zero new `Tower.ts` fields per campaign.**

**Controllers stay**, but for orchestration only (timelines, win-checks, cross-tower coordination). They *read* traits; they don't stamp WeakMaps.

**Stormcaller stun stays** as a single field — generic status, future `StatusEffects` system absorbs it.

## The 7-commit shape

Each commit is a self-contained migration with its own tests. Full unit suite + `e2e/m10-overthrow.spec.ts` must stay green after each.

1. **Lift `Damageable` out of `systems/finale/`** to `src/entities/Damageable.ts`. Add `assailants: AssailantLog` (last-hit timestamps by source type). Pure rename + extension.
2. **Extend Trait pipeline** with `onSpawn` / `onDespawn` / `onTakeDamage` / `registerDamageVeto` / `registerDamageModifier` / `registerOnKill` / `registerOverlayDraw` registries + resolvers. Pure addition.
3. **Damage pipeline + `Tower.destructible` sub-object.** Group `hp`, `maxHp`, `_lastHitAt` into one struct. Retaliation triplet moves onto `Damageable.assailants` (shared with `DestructibleStructure`). `Tower` formally `implements Damageable`. Migrate ~25 reader sites.
4. **Mech finale tags → traits.** `mech_generator` (with `linkedCells`), `mech_throne`, `mech_invulnerable_until_generators_dead` (registers a damage-veto handler that queries `SabotageController.allGeneratorsDead()`). Drop `_invulnerable`, `isGenerator`, `_generatorDrained`, `generatorLinkedCells`, `isThrone` from `Tower`.
5. **Suppression `_stress` → trait.** Per-tower stress lives on a `suppressible` trait. `SuppressionManager.test.ts` updated to read trait state.
6. **Arcane `isUlt` → trait + render hook.** `arcane_ult_target` trait registers the golden HP-bar overlay drawer. `drawTower` ends with one call to `resolveOverlayDraw`.
7. **Conduit cosmetics → trait state.** Aura-side `_linkedByConduit` becomes trait state populated each frame by the conduit handler. Removes the three `(this as any)` casts in `drawTower`.

## Out of scope

- `_disabledRemaining` (Stormcaller stun) — stays as-is. Generic status. Lift to a future `StatusEffects` system when a second consumer appears.
- `_expired` / `alive` getter — stays on `Tower` (lifecycle, used by non-destructible mobile towers too).
- Existing trait handlers (delivery, damage modifiers for hits, fire rate, etc.) — untouched. We're only *adding* registries.

## Risks documented

1. **Trait pipeline ordering for damage veto** — OR semantics (any-true vetoes) is the obvious choice; documents need to say so.
2. **Damage source enum** — typed `'hero' | 'send' | 'creep' | 'tower' | 'unknown'`, not string. Catches typos at compile time.
3. **Overlay draw order** between conduit link + ult border — probably irrelevant (Phaser graphics composites), but worth confirming with both registered.
4. **Test data ergonomics** — `traits: [{id: 'mech_generator', ...}]` inline in tests must read cleaner than the current `isGenerator: true` literal. If it doesn't, that's a signal to revisit.
5. **Controller invulnerability query** — `mech_invulnerable_until_generators_dead`'s damage-veto handler needs a cheap synchronous `SabotageController.allGeneratorsDead()` read. Probably already a counter, not iteration; verify.
6. **Backwards-compat during migration** — each commit must leave the game playable; we don't allow a half-state where mech M10 is broken because some readers haven't migrated yet.

## Safety nets

- Full unit suite (631 tests) plus the new `SabotageController` / `SuppressionManager` / `Tower.takeDamage` coverage exercises both Mech and Arcane finale paths.
- `e2e/m10-overthrow.spec.ts` is the integration safety net — asserts on `SabotageController.getSnapshot()` state, not on flag shapes, so it survives the rewrite and catches regressions through it.
- Each commit's acceptance gate: `npx tsc --noEmit` clean + full unit suite green + M10 e2e green.

## Effort estimate

7 commits, ~6–8 hrs over 2 sessions. Each commit is a tight diff with focused tests.
