# Per-campaign Mission Controllers own per-mission runtime state, and DOM-land reads them via `MissionRunner.getCurrentRuntime()` + `instanceof`

## Context

ADR-0001 established the six-aspect Campaign Extension architecture. The aspect *interfaces* are typed and narrow, but the architecture left two operational questions implicit:

1. **Where does per-mission runtime state live?** Concrete mid-mission state — a `Pactbook` instance with three drawn cards, a leak counter, a charge meter, a wave-cleared streak — has to be owned by *something*. ADR-0001 didn't specify whether to use module globals, closure scopes inside `buildRuntime`, a controller class, or stash it in `CampaignState` (the persistent slot).

2. **How does DOM-land reach the live aspect bundle?** The campaign-aspects refactor solved scene-side dispatch (`GameScene._campaignRuntime` reads from the data passthrough; per-frame `lifecycle.update`, per-event `gameplay.*`, etc.). But the `LoadingScreen` (Preact), the lobby panels (Preact), and any future mid-mission HUD overlay live outside the Phaser scene tree and have no path to that bundle.

Both questions surfaced during the Snake Eyes Pass 1/2/2.5 work. Pass 1 originally used module globals (`ActiveMissionPactbook.ts` + a `_missionLeakCount` in the missionState aspect). Pass 2.5 refactored them out after architectural review (see commit `4a40e93c`) into a single per-campaign Mission Controller class. The pattern works, mirrors Greenward's `GreenwardMissionController`, and is now used by every campaign with non-trivial per-mission runtime state. But it lives only in the code — no document explains the convention to a maintainer adding campaign #5.

## Decision

Two paired conventions for all campaigns:

### 1. Per-campaign Mission Controller pattern

Every campaign with non-trivial per-mission runtime state owns a class named `<Campaign>MissionController` (Greenward, Snake Eyes) or `<Campaign>FinaleController` (Arcane M10, Mech M10 Sabotage) that:

- **Implements `LifecycleAspect`** (`update(deltaMs): void`, `shutdown(): void`).
- **Is constructed inside `ext.buildRuntime(ctx, mission)`** and returned as the bundle's `lifecycle` aspect. Construction may be conditional on the mission's `campaign.kind`.
- **Owns all per-mission runtime state** (active Pactbook, leak counters, charge meters, streak timers, controller-internal subscriptions). These fields are private.
- **Exposes public methods that other aspects call** (`controller.recordLeak()` from the gameplay aspect's `onCreepReached`; `controller.resolveWagerAtMissionEnd(result)` from the missionState aspect's `applyMissionResult`). Cross-aspect communication happens through controller method calls, not module-level mutable state.
- **Does not persist anything** — persistent cross-mission state still lives in `CampaignState` via the `MissionStateAspect`. The controller's state is discarded with the instance on scene teardown.

### 2. Cross-DOM access via typed accessor over `MissionRunner.getCurrentRuntime()`

Every campaign that needs DOM-side access to its mission controller exposes a typed accessor:

```ts
export function getActive<Campaign>Controller(): <Campaign>MissionController | null {
  const runtime = MissionRunner.getCurrentRuntime();
  if (runtime?.lifecycle instanceof <Campaign>MissionController) {
    return runtime.lifecycle;
  }
  return null;
}
```

The accessor is the **only** way DOM consumers (LoadingScreen, lobby panels, mid-mission overlay components) reach the controller. Three properties this guarantees:

- **Typed at the consumption site** — return type is `<Campaign>MissionController | null`, not `unknown`.
- **Narrows with `instanceof`, not `as`** — runtime-checked. Returns `null` when the current mission belongs to a different campaign, when no mission is active, or when the lifecycle aspect happens to be a different class. No silent type lies.
- **One source of truth** — `MissionRunner.active.runtime.lifecycle` is set by `startV2` and cleared by `finalize` / `abort`. Cross-DOM consumers never need to worry about orphan state because the lifecycle is bound to `MissionRunner.active`.

### Module globals are forbidden

A module-level mutable variable holding the per-mission controller (or any field thereof) is explicitly disallowed by this ADR. Reasons:

- **Order dependency without enforcement.** `LoadingScreen` mounting before `buildRuntime` runs would silently read a stale or null global.
- **Single-process assumption baked in.** Replay-mode or multiplayer Snake Eyes (low priority but possible) would break.
- **Test isolation hazard.** Every test using the global must remember to reset it in `beforeEach`. Missed cleanup pollutes other tests silently.
- **Orphan-on-error.** Scene teardown that doesn't fire (e.g. an exception inside `GameScene.init`) leaves the global pointing at a dead instance.

The pattern above eliminates all four — the controller lives on `MissionRunner.active.runtime`, which is cleared automatically by the existing lifecycle.

## Considered alternatives

- **Closure scope inside `buildRuntime`.** The gameplay aspect's `onCreepReached` would close over a `let leakCount = 0` in the same `buildRuntime` call. Rejected: the missionState aspect (which lives on the *extension*, not the per-mission bundle) is in a different scope and can't reach the closure. Greenward and Snake Eyes both need cross-aspect access, ruling this out.
- **Stash per-mission state in `CampaignState`.** Adds a transient field to the persistent state shape (`SnakeEyesState.currentMissionPactbookId` or similar). Rejected: blurs the persistent/transient boundary, complicates `CampaignState` schema versioning, and makes test isolation harder (every test must clear the slot).
- **Add a typed `ephemeralRuntimeState` map on `CampaignCtx`.** Aspects read/write via string keys. Rejected: untyped string-keyed map at consumption sites — same surface area as module globals but with extra ceremony. The controller-class pattern is materially stronger.
- **Expose `MissionRunner.getCurrentLifecycle<T>(): T | null`.** Generic typed accessor, but the type parameter `T` is unverified at runtime — same `as` cast problem. The `instanceof` check is what makes the campaign-specific accessor honest.

## Consequences

### Architectural

- Per-mission runtime state has a single canonical home: the Mission Controller class. New campaigns immediately know where to put it.
- Aspects communicate through typed controller methods, not through module globals. Refactors are local — change a controller's method signature, the compiler reports every caller.
- `MissionRunner.getCurrentRuntime()` becomes a load-bearing public API. Any change to its return type cascades to every campaign's accessor; the public-API contract is real.
- The `instanceof` narrowing means a controller class can never be silently swapped without breaking all of its DOM consumers — a desirable strict-type property.

### Naming convention

- `<Campaign>MissionController` for the runtime-state owner (Greenward, Snake Eyes pattern).
- `<Campaign>FinaleController` is permitted for M10-only controllers when the lifecycle ends with the mission (Arcane, Mech precedent), but new campaigns should prefer the unsuffixed `<Campaign>MissionController` even if it spans only one mission — easier to grow.
- `getActive<Campaign>Controller()` for the DOM accessor.

### Testing

- Mission Controller classes are unit-testable in isolation (construct with seeded RNG, call methods, assert state — see `SnakeEyesMissionController.test.ts`).
- Cross-DOM access can be tested by stubbing `MissionRunner.active.runtime` in tests via a typed helper (the Snake Eyes tests do this with a `(MissionRunner as any).active = ...` cast; a follow-up could add a `MissionRunner._setActiveForTesting()` seam).

### Migration cost for existing campaigns

Existing campaigns already follow this pattern to varying degrees:

- **Greenward** — `GreenwardMissionController` predates the pattern but matches it exactly. No work.
- **Snake Eyes** — `SnakeEyesMissionController` was the trigger for this ADR. Matches exactly.
- **Mech** — `SabotageController` (M10) implements LifecycleAspect via the `mechSabotageRuntime` adapter. Close to the pattern but the controller class itself isn't directly returned as the aspect — the wrapper is. Not worth refactoring unless a DOM consumer needs the M10 sabotage state.
- **Arcane** — `ArcaneFinaleController` (M10) is the same shape as Mech's. Same call: leave alone until a consumer needs it.

The pattern is mandatory for new campaigns, not retroactive on existing ones.

### Constraints on future work

- **Campaign #5** must follow this pattern from the start. PR review for any new campaign checks the controller class, the typed accessor, and the absence of module-level mutable state in the campaign's directory.
- **Future ADRs that add new aspect types** (e.g. a `PreMissionUIAspect` discussed in the Inscription design) should specify whether the new aspect type is allowed to host runtime state or whether all state belongs in the Mission Controller. Default answer: Mission Controller. The new aspect type is a behaviour interface, not a state container.

### Open question deferred

How does `MissionRunner.getCurrentRuntime()` behave during the brief window between `startV2` returning and `LoadingScreen` mounting? Today it works because both fire synchronously inside the same Phaser tick, but a future async campaign initialiser (e.g. a network call during `buildRuntime`) would surface a race. Defer until concretely needed; this ADR documents the current synchronous contract.
