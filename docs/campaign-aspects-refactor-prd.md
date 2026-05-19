# PRD — Campaign system refactor to Aspect-based extensions

**Branch:** `ah/refactor/campaign-aspects`
**ADR:** [`docs/adr/0001-campaigns-as-aspect-modules.md`](./adr/0001-campaigns-as-aspect-modules.md)
**Glossary:** [`CONTEXT.md`](../CONTEXT.md)
**Migration strategy:** big-bang — all four campaigns ported in one PR; legacy schema deleted same PR.

---

## 1. Background

The current campaign system grew incrementally over four campaigns (Arcane, Mechanical, Greenward, Snake Eyes). The shared `MissionOverrides` interface is now 30+ fields — roughly half campaign-specific (`finaleRules`, `sabotageRules`, `greenwardRules`, `suppressionPylons`, attacker-mode knobs, etc.). `MissionRunner.start` threads ~25 fields field-by-field into `UIBridge.startScene`. `GameScene.init` branches on each campaign's `*Rules` field to instantiate per-campaign controllers, holding them as `_missionXxxController` private fields. A runtime `throw` enforces that `finaleRules` and `sabotageRules` can't both be set, because the type system can't express the mutual exclusion.

Adding a fifth campaign — or any new campaign-specific mechanic — requires lockstep edits across `CampaignDef.ts`, `MissionRunner.ts`, `GameScene.ts`, and at least one per-campaign source file. This refactor cuts the coupling.

## 2. Decision (recap from ADR-0001)

Campaigns become **Campaign Extensions** — one module per campaign, generic over `TState` (cross-mission persistent state) and `TCfg` (per-mission campaign payload). Each extension exposes optional **Aspects**, each consumed by exactly one engine subsystem. The shared mission schema reduces to identity + objectives + a discriminated-by-base-mode `CoreMissionConfig` + an opaque-at-the-registry, typed-inside-the-campaign `campaign: TCfg` payload. The seventeen mission archetypes collapse to four base modes (`standard | hero_defense | circle_coop | attacker`); per-archetype defaults become helper builder functions.

## 3. Goals

1. **Eliminate the `MissionOverrides` god-object.** Replace with discriminated `CoreMissionConfig` per base mode + a typed `TCfg` campaign payload.
2. **Eliminate `MissionArchetype` enum.** Collapse to four base modes; the `final_*` archetypes disappear entirely.
3. **Replace per-campaign branches in `GameScene`** with a single aspect-dispatch loop.
4. **Port all four shipped campaigns** to the new shape with no regression in gameplay or persistence.
5. **Delete legacy code** in the same PR: `MissionOverrides`, `MissionArchetypes`, `STUB_ARCHETYPES`, the `_missionXxxRules` private fields, the 25-field threading in `MissionRunner.start`.
6. **Adding a fifth campaign becomes a one-module change** plus a one-line registry entry.

## 4. Non-goals

- New gameplay features or balance changes.
- New campaigns or new missions.
- Performance optimization.
- Refactoring of map/wave/tower/creep subsystems — only the campaign-system seams.
- Save-data migration UX (existing player profiles continue to work; campaign-state slot keys are unchanged).

## 5. Acceptance criteria

The PR is mergeable when all of the following hold:

**Compile / static**
- [ ] `npx tsc --noEmit` clean.
- [ ] No occurrences of `MissionOverrides`, `MissionArchetype`, `MissionArchetypeId`, `STUB_ARCHETYPES`, `isArchetypeStub` outside the deletion commit.
- [ ] No `_mission*Rules` or `_missionFinaleRules`/`_missionSabotageRules`/`_missionGreenwardRules`/`_missionSuppressionPylons` private fields on `GameScene`.
- [ ] `git grep -nE '(finaleRules|sabotageRules|greenwardRules):' src/` returns zero matches (the new typed payloads live under `campaign:`).

**Test suite**
- [ ] All existing tests in `src/data/campaigns/*.test.ts`, `src/systems/campaign/*.test.ts`, `src/systems/greenward/**.test.ts`, `src/systems/voidc/**.test.ts`, `src/systems/profile/CampaignProgress.test.ts` pass.
- [ ] New tests for: `CampaignExtension` registry shape; aspect bundle lifecycle (Setup→Lifecycle→Gameplay→Intercept→shutdown ordering); `MissionState.applyDynamicOverrides` wholesale-rewrite; `MissionState.tickBetweenMissions` ordering relative to mission start.

**Gameplay (manual + e2e)**
- [ ] All four campaigns playable end-to-end M1→M10 with the player's expected mechanics intact. Spot-check matrix:
  - Arcane M1, M2 — pre-placed Frost towers appear at correct cells.
  - Arcane M10 — summoning circle charge meter + hero summon + destructible CPU towers + win.
  - Mech M2, M5, M6, M8 — Suppression Pylons mute towers in radius; channelling re-enables them.
  - Mech M10 — Workshop trains Raiders; generators + throne destructible; win on throne kill.
  - Greenward every mission — Consecration tracker advances; `WildwoodReserves` regen `+10` between missions visible.
  - Greenward M10 — Nave choice gated by mode-lean (Courtyard / Nave / Throne setpieces).
  - Snake Eyes every mission — Pactbook debt persists across missions; wagers offered and resolved.
  - Snake Eyes M10 — Mirror Lane paired grid renders; `EpilogueComposer` produces the stitched ending.
- [ ] Existing e2e tests in `e2e/` pass without modification (no campaign-system e2e changes are in scope; the existing M10 e2e per `docs/m10-e2e-prd.md` continues to pass).

**Architecture invariants**
- [ ] One `_campaignRuntime` field on `GameScene` (singular). No per-campaign typed private fields.
- [ ] `MissionRunner.start` body fits in ~50 lines (down from ~120); no campaign-specific branches.
- [ ] `CampaignExtension` registry boundary is the only place `unknown`/`any` appears in campaign code.

## 6. Plan

Phases run sequentially in one branch; intermediate commits land working code. No phase ships behind a feature flag — big-bang means the new code replaces the old in the same PR, with each phase a green-test commit.

### Phase A — Type foundation (no behavior change)

**Deliverable:** new type definitions compile alongside legacy schema. Legacy schema still in use.

Files:
- New: `src/systems/campaign/types.ts` — `BaseMode`, `CoreMissionConfig` (discriminated), `MissionEntry<TCfg>`, `CampaignExtension<TState, TCfg>`, the six aspect interfaces, `CampaignCtx`, `WorldMutator`, `RuntimeAspects`.
- New: `src/systems/campaign/CampaignRegistry.ts` — replaces `src/data/campaigns/index.ts`; holds `CampaignExtension<any, any>` map; `getCampaign(factionId)` returns the extension; legacy `getCampaign` keeps working until Phase F deletes it.

**Validate:** `npx tsc --noEmit` clean. No runtime change.

### Phase B — Engine plumbing (no behavior change yet)

**Deliverable:** `MissionRunner` and `GameScene` know how to drive an aspect-based campaign, but the registry still serves legacy campaigns. A feature-detect (`'buildRuntime' in ext`) routes to the new path; missing fall through to legacy.

Files:
- `src/systems/missions/MissionRunner.ts` — add `startV2(ext, missionIdx)` path; keep legacy `start` working.
- `src/scenes/GameScene.ts` — add `_campaignRuntime: RuntimeAspects | null` and the per-frame dispatch (`update`, `shutdown`); keep legacy `_missionXxxController` fields alive.
- New: `src/systems/campaign/WorldMutator.ts` — helpers: `installPrePlacedTowers`, `installSuppressionPylons`, `installSummoningCircles`, `installDestructibleTowers`, `installWorkshop`, `applyRuinCells`, `registerActionIntercept`, `setSendPathOverride`. Each helper records its mutation in a `mutations[]` list so `shutdown` can undo cleanly.
- New: `src/systems/campaign/EventBusBridge.ts` — wires a `Gameplay` aspect's handler methods to `EventBus` events; auto-subscribes on attach, auto-unsubscribes on detach.

**Validate:** `npx tsc --noEmit` clean. Run all tests. No campaigns use the new path yet — legacy still active.

### Phase C — Reference port: Mechanical campaign

**Deliverable:** `MECHANICAL_CAMPAIGN` is a `CampaignExtension` exercising Setup + Lifecycle + Gameplay + Intercept + UISurface.

Files:
- Rewrite `src/data/campaigns/mechanical.ts` to export `CampaignExtension<MechState, MechMissionCfg>`.
- New: `src/systems/mechanical/aspects/` — `MechSetup.ts`, `MechSabotageRuntime.ts` (Lifecycle for M10), `MechSuppressionRuntime.ts` (Setup + Intercept for pylon missions), `MechUISurface.ts`.
- Move suppression-pylon click-intercept out of `GameScene` into `MechSuppressionRuntime`.
- Move sabotage controller construction + DOM event listeners out of `GameScene` into `MechSabotageRuntime`.
- Update `mechanical.test.ts` to assert against the new shape; keep existing behavioural assertions (wave script ids, pylon placements, sabotage rules).

**Validate:** play Mech M1, M2, M5, M6, M8, M10 manually. All `mechanical.test.ts` tests pass. `npx tsc --noEmit` clean.

**Risk:** this phase exercises the most aspects of any campaign; bugs found here drive type-shape adjustments before porting the other three. Budget extra time.

### Phase D — Remaining campaign ports

Each campaign is a separate commit in this phase.

**D1 — Arcane:** Pre-placed towers (Setup), parametric stories (UISurface), M10 FinaleController (Setup + Lifecycle + Gameplay).
- Rewrite `src/data/campaigns/arcane.ts`.
- New: `src/systems/arcane/aspects/` — `ArcaneSetup.ts`, `ArcaneFinaleRuntime.ts`, `ArcaneUISurface.ts`.
- Update `arcane.test.ts`.

**D2 — Greenward:** Cross-mission `WildwoodReserves` (MissionState + `tickBetweenMissions`), Consecration (Setup + Lifecycle), mode-lean (MissionState), Named characters (Gameplay), M10 three-setpiece (Lifecycle), state panel + epilogue (UISurface).
- Rewrite `src/data/campaigns/greenward.ts`.
- New: `src/systems/greenward/aspects/` — `GreenwardSetup.ts`, `GreenwardRuntime.ts`, `GreenwardFinaleRuntime.ts`, `GreenwardMissionState.ts`, `GreenwardUISurface.ts`.
- Update `greenward.test.ts`, existing `GreenwardMissionController.test.ts`, `GreenwardFinaleController.test.ts`.

**D3 — Snake Eyes:** Pactbook (MissionState across missions), wagers (Gameplay + UISurface), Mirror Lane (Setup + Lifecycle), Counterfactual M10 (Lifecycle + Gameplay), Epilogue (UISurface).
- Rewrite `src/data/campaigns/snake-eyes.ts`.
- New: `src/systems/voidc/aspects/` — `VoidSetup.ts`, `VoidMirrorRuntime.ts`, `VoidPactbookState.ts`, `VoidUISurface.ts`.
- Update `snake-eyes.test.ts` and existing voidc tests.

**Validate after each:** play that campaign end-to-end; run that campaign's test files; `npx tsc --noEmit` clean.

### Phase E — Cutover

**Deliverable:** legacy code path removed. `getCampaign` always returns a `CampaignExtension`. `MissionRunner.start` is the only path.

Files:
- Delete `MissionRunner.start` legacy path; rename `startV2` to `start`.
- Delete `_missionFinaleRules`, `_missionSabotageRules`, `_missionGreenwardRules`, `_missionSuppressionPylons`, `_finaleController`, `_sabotageController`, `_greenwardController`, `_greenwardFinaleController`, `_suppressionMgr`, `_suppressionRender` from `GameScene` (now `_campaignRuntime`).
- Delete the `if (this._missionFinaleRules)`, `if (this._missionSabotageRules)`, `if (this._missionSuppressionPylons)`, `if (this._missionGreenwardRules)` branches.
- Delete the runtime `throw new Error('Mission has both finaleRules and sabotageRules')` — structurally impossible now.
- Delete the 25-field passthrough in `UIBridge.startScene` (`missionGoldStart`, `missionWaveScript`, etc.); replace with a single `missionEntry` + `campaignRuntime` payload.

**Validate:** `git grep` for all legacy identifiers returns empty. Full test suite green. Full manual playthrough one mission per campaign.

### Phase F — Schema deletion

**Deliverable:** the legacy schema files disappear.

Files:
- Delete `src/data/campaigns/CampaignDef.ts`.
- Delete `src/data/campaigns/MissionArchetypes.ts`.
- Delete `src/systems/campaign/CampaignStatePanelRegistry.ts` (replaced by `UISurface.panels`).
- Delete `src/data/campaigns/index.ts` (replaced by `CampaignRegistry.ts`).
- Update `CHANGELOG.md`, `README.md` (architecture section) per the project's documentation rules.

**Validate:** final `npx tsc --noEmit`. Final full test suite. Final manual smoke per campaign. PR ready.

### Phase G — PR review prep

- CHANGELOG entry describing the refactor at a high level (no per-phase detail).
- README architecture section updated to describe Campaign Extensions + Aspects (replacing the trait-system-style description that currently exists).
- Confirm `CONTEXT.md` and `docs/adr/0001-campaigns-as-aspect-modules.md` are accurate to the landed code — update any vocabulary drift.

## 7. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Aspect interface evolves during port — early campaigns block on type churn | High | Mech (Phase C) goes first specifically to drive interface churn; budget extra time there; freeze types before Phase D starts. |
| `MissionState.applyDynamicOverrides` wholesale rewrite is misused, producing surprise overrides | Medium | Test asserts that the original `MissionEntry` is referentially distinct from the returned one (forces authors to be explicit); add lint rule if possible. |
| Save-data compatibility — existing player profiles have `campaignState[factionId]` slots | Medium | `MissionState.readState` reads the slot wholesale and merges over defaults (same pattern as today's `CampaignState.get`); no schema migration needed if `TState` shape stays the same. Per-campaign: keep field names identical during the port. |
| `EventBusBridge` auto-subscribe / unsubscribe ordering bugs (event fires during shutdown, etc.) | Medium | Test the bridge in isolation with a fake event bus before any campaign uses it. |
| Greenward `tickBetweenMissions` regen ordering — must run after `applyMissionResult`, before next `applyDynamicOverrides` | Low | Pin the order in `MissionRunner` test and `MissionState` aspect docs. |
| Mech narrative branch already merged (#80) — refactor lands on top of recent campaign work | Low | Pull `develop` before each phase; resolve conflicts in `mechanical.ts` as they appear (the refactor rewrites this file wholesale, so conflicts in waves/restrictions are easy to translate). |

## 8. Open questions (defer until they bite)

- Should `WorldMutator` helpers be per-aspect (Setup-only) or available to Lifecycle too? Currently scoped to Setup; revisit if a runtime needs mid-mission grid mutation.
- Should `Gameplay` aspect handlers receive a typed `EventPayload<T>` or a typed handler signature per event? Lean: typed signatures per event, no generic payload wrapper.
- Future: should there be a `DraftAspect` for campaign-specific Draft screen overrides? Out of scope for this refactor; add when first needed.

## 9. Out-of-scope follow-ups (do not include in this PR)

- New campaign #5 (e.g. Infernal / Celestial).
- Removing the four stub archetypes' content from `MissionArchetypes` — this PR deletes the whole file, so stubs go with it; the stub-archetype *concept* may need to come back as a "missions can be marked unimplemented" flag on `MissionEntry` if there's a use case. Defer until requested.
- Multiplayer campaign sync — campaigns are currently single-player only.
- Renaming `factionId` → `campaignId` (they're 1:1 today but the indirection might pay off later).

---

## Pass to `/goal`

To execute:

```
/goal docs/campaign-aspects-refactor-prd.md
```

Or in a fresh session pointed at this branch:

```
We're on branch ah/refactor/campaign-aspects. Read docs/campaign-aspects-refactor-prd.md
and execute Phase A through Phase G in order. Read CONTEXT.md for vocabulary and
docs/adr/0001-campaigns-as-aspect-modules.md for the decision context. Stop after
each phase and report green-test status before moving on. Do not skip phases or
combine commits across phase boundaries.
```
