# Campaigns expose behavior as Aspects, not as schema fields on a shared mission def

## Context

The original `CampaignDef` / `MissionDef` design grew a flat `MissionOverrides` interface with 30+ fields, of which roughly half were campaign-specific (`finaleRules`, `sabotageRules`, `greenwardRules`, `suppressionPylons`, attacker-mode knobs, etc.). `MissionRunner` threaded ~25 of these into `UIBridge.startScene` field-by-field, and `GameScene.init` branched on each one (`if (this._missionXxxRules)`) to construct per-campaign controllers. A runtime `throw` was needed to enforce that two finale-rules couldn't coexist, because the type system couldn't express the mutual exclusion. Adding a new campaign feature required edits across `CampaignDef.ts`, `MissionRunner.ts`, and `GameScene.ts` in lockstep — and the count of `*Rules` fields was on track to keep growing with every new campaign.

## Decision

Campaigns are now expressed as **Campaign Extensions** — one module per campaign, generic over `TState` (cross-mission persistent state) and `TCfg` (per-mission campaign payload). The extension owns its missions list (`missions: MissionEntry<TCfg>[]`), its initial state, optional `MissionState` and `UI Surface` aspects, and a `buildRuntime(ctx, mission)` factory that returns a per-mission bundle of optional **Aspects**: `Setup`, `Lifecycle`, `Gameplay`, `Intercept`. Each aspect is a narrow role interface consumed by exactly one engine subsystem.

The shared `MissionEntry` schema is reduced to identity, objectives, a discriminated-by-base-mode `CoreMissionConfig`, and an opaque-at-the-registry-but-typed-inside-the-campaign `campaign: TCfg` payload. The four `final_*` mission archetypes (`final_arcane`, `final_sabotage`, `final_greenward`, `final_void`) collapse — M10 missions become regular missions whose campaign-specific behavior is in their typed payload and the campaign's `buildRuntime`. The remaining "archetypes" (boss_rush, frugal, speedrun, restriction, ...) become helper builder functions on `CoreMissionConfig`, not a constrained enum.

## Considered alternatives

- **Discriminated union on `MissionDef`** (config-driven dispatch, no campaign module). Rejected: keeps per-campaign code scattered across `data/campaigns/<faction>.ts`, `systems/<faction>/`, and `GameScene.ts`; doesn't consolidate per-campaign logic in one place.
- **Fat `CampaignRuntime` interface with `onWaveStart`, `onCreepSpawned`, etc.** Rejected: every new campaign need bloats the interface; ~10 hooks today would become ~20 by campaign #6. Replaced by narrow aspects each owned by a different subsystem.
- **Thin runtime + everything via EventBus.** Rejected: action intercepts (e.g. pylon-cell click consuming the click) don't fit the event model; map mutations (pre-placed towers, grid cell changes, workshop placement) need explicit helpers. Hybrid was right.
- **Keep `heist` and `base_defense` as base modes.** Rejected: they're map topologies, not engine modes — they reuse the standard engine with different `mapDef.entries`/`exits`.

## Consequences

- Adding a new campaign feature touches only the campaign's own module (its missions list, its `TCfg` type, its aspect implementations) and a one-line registration. Shared files (`MissionRunner`, `GameScene`, `CampaignDef`) stay closed to modification.
- Mutual exclusion between campaign-specific runtimes (M10 finale variants) is structural — a `buildRuntime` returns one `Lifecycle`; the runtime `throw` for "both finaleRules and sabotageRules" disappears.
- Migration cost is real: the four shipped campaigns (Arcane, Mechanical, Greenward, Snake Eyes) each need porting. `MissionState.applyDynamicOverrides` rewrites a `MissionEntry` wholesale, which is more powerful than the old `Partial<MissionOverrides>` merge — authors must use this carefully.
- The registry boundary is the one place where `CampaignExtension<unknown, unknown>` is unavoidable. Inside any single campaign module, `TState` and `TCfg` are fully typed end-to-end.
