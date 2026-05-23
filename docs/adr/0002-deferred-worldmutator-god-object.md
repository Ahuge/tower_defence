# Accept a temporary `WorldMutator` god-object regression for the four shipped campaigns

## Context

ADR-0001 cited the legacy `MissionOverrides` god-object — a flat interface that grew per-campaign fields (`finaleRules`, `sabotageRules`, `greenwardRules`, ...) — as the central problem to retire. The Campaign Extension refactor solved this for *mission data*: each campaign's per-mission payload is a discriminated `TCfg` union opaque at the registry boundary and fully typed inside the campaign module.

`WorldMutator` is a separate interface. It's the helper passed to `SetupAspect.install(world: WorldMutator)` so per-mission setup code can stamp pre-placed towers, install pylons, place ruins, etc. The intent in Phase B was that `WorldMutator` would expose only **narrow, faction-agnostic primitives** — `installPrePlacedTower(spec)`, `installSummoningCircle(spec)`, `installRuins(specs)`, `installPylons(specs)` — and each campaign's Setup aspect would compose those primitives into the layout it needed.

Three campaigns' finale controllers don't decompose cleanly into those primitives without changing the controller constructors themselves:

- **Arcane M10** — `ArcaneFinaleController` ctor takes a single `ArcaneFinaleRules` object (charge meter rules, CPU tower specs, hero summon config). Decomposing into narrow installs would require splitting the rules into ~4 separate calls + adding a "register the finale controller object" step.
- **Mech M10** — `SabotageController` ctor takes a `MechSabotageRules` object (CPU tower HP defaults, owner index, workshop train cost/cooldown) + needs hooks for generator-killed callbacks. Same shape as Arcane's.
- **Greenward** — `GreenwardMissionController` ctor takes a `GreenwardRules` payload that includes the per-mission `ruins[]` plus the M10 setpiece flag. The ruins themselves *do* decompose to `installRuins(...)`, but the controller's lifecycle hooks (mid-mission `deduct()`, `finalize()`) need an owning install path.

To keep Phase B unblocked and ship the four campaigns on the new architecture, `WorldMutator` grew three campaign-specific install methods:

```ts
installMechSabotage(rules: MechSabotageRules): void;
installArcaneFinale(rules: ArcaneFinaleRules): void;
installGreenwardRules(rules: GreenwardRules): void;
```

These methods reintroduce exactly the per-campaign-field-on-a-shared-interface pattern that ADR-0001 was supposed to retire — just shifted from the data schema to the world-install schema.

## Decision

**Accept the regression for now, with a hard constraint on future campaigns.** The campaign-specific install methods stay in `WorldMutator` until either of the following resolution paths lands:

**Path A — generic dispatcher.** Replace the three methods with a single:

```ts
installCampaignController(kind: string, payload: unknown): void;
```

Implementations dispatch on `kind` to construct the right controller. Untyped at the boundary; campaign module owns the typing of its `payload` shape; `WorldMutator` interface stays closed to new campaigns. This is the same shape as `MissionEntry.campaign: TCfg` already uses successfully for per-mission data.

**Path B — narrow primitive composition.** Refactor each finale controller's constructor to take 2-4 narrow install primitives (`installDestructibleTowers`, `installChargeMeter`, `installControllerLifecycle`) and have each Setup aspect compose those instead. More work; preserves end-to-end typing.

Either is acceptable; Path A is cheaper and matches the existing TCfg pattern.

## Hard constraint until resolved

**Campaign #5 must NOT add a fourth `install<CampaignName><Verb>` method to `WorldMutator`.** A fourth method tips the regression from "three exceptions for the four shipped campaigns" to "the established pattern for new campaigns." Before campaign #5 lands, one of the two resolution paths above must ship.

This constraint is encoded in:

- A code comment at `src/systems/campaign/types.ts:399-412` pointing at this ADR
- This ADR itself
- The PR description for any future campaign #5

## Considered alternatives

- **Block PR #85 on a full fix.** Rejected: each finale controller refactor is ~200 lines across multiple files; doing three of them in PR #85 would double the diff size and delay every other phase's review. The regression is bounded (three methods, no path for growth), the workaround is clearly documented, and the four campaigns ship working today.
- **Accept the regression silently with no ADR.** Rejected: the TODO comment at types.ts:399 was honest but trivially erodes — a future PR could remove the TODO without anyone noticing the architectural drift. An ADR forces a deliberate decision at the next campaign.
- **Discriminated union `kind: 'mech_sabotage' | 'arcane_finale' | 'greenward_rules'`.** Rejected: still a god-object in disguise, with the additional cost of every install site having to read the kind. Path A above is the discriminated-union approach but punts the dispatch to a single method, which is materially simpler.

## Consequences

- `WorldMutator` carries three campaign-specific install methods until campaign #5 (or a focused refactor PR) forces resolution.
- Future maintainers reading `WorldMutator` see the three exceptions and the comment pointing at this ADR. The pattern is "exception, not example."
- Campaign #5 review must check this ADR before merge; the constraint section above is the check-gate.
- If the resolution lands as Path A, every existing `installMech...` / `installArcane...` / `installGreenward...` call site gets rewritten to `installCampaignController(kind, payload)` — mechanical change, ~10 call sites total across the four campaigns.
