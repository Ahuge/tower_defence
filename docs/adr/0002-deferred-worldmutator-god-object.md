# Accept `WorldMutator` campaign-specific install methods as the canonical pattern

**Status:** SUPERSEDES the prior "hard constraint + two-deferral hard stop" version of this ADR. Updated 2026-05-23 after an audit revealed the regression is more entrenched than originally captured.

## Context

ADR-0001's `MissionOverrides` god-object retirement was clean for *mission data*: each campaign's per-mission payload is a discriminated `TCfg` union opaque at the registry boundary and fully typed inside the campaign module. That refactor is solid.

`WorldMutator` is a different surface. It's the helper passed to `SetupAspect.install(world: WorldMutator)` so per-mission setup code can stamp pre-placed towers, install pylons, place ruins, etc. The original Phase B intent was that `WorldMutator` would expose only **narrow, faction-agnostic primitives** — `installPrePlacedTower(spec)`, `installSummoningCircle(spec)`, `installRuins(specs)`, `installPylons(specs)` — and each campaign's Setup aspect would compose those primitives into the layout it needed.

That intent didn't survive contact with the four campaigns' finale controllers:

- **Arcane M10** — `ArcaneFinaleController` ctor takes a single `ArcaneFinaleRules` object (charge meter rules, CPU tower specs, hero summon config). Decomposing into narrow installs would require splitting the rules into ~4 separate calls + adding a "register the finale controller object" step.
- **Mech M10** — `SabotageController` ctor takes a `MechSabotageRules` object plus needs hooks for generator-killed callbacks. Same shape as Arcane's.
- **Greenward** — `GreenwardMissionController` ctor takes a payload that includes the per-mission `ruins[]` plus the M10 setpiece flag. The ruins themselves decompose to `installRuins(...)`, but the controller's lifecycle hooks (mid-mission `deduct()`, `finalize()`) need an owning install path.

Phase B shipped three campaign-specific install methods to unblock the four campaigns:

```ts
installMechSabotage(rules: MechSabotageRules): void;
installArcaneFinale(rules: ArcaneFinaleRules): void;
installGreenwardRules(rules: GreenwardRules): void;
```

Plus the originally-narrow `installPrePlacedTowers` (which Arcane M1/M2 uses) and `installSuppressionPylons` (which Mech pylons use). The remaining "narrow primitives" (`installSummoningCircles`, `installDestructibleTowers`, `installWorkshop`, `applyRuinCells`, `registerActionIntercept`, `setSendPathOverride`) were declared but **never called by any aspect** — they remain in the interface as latent infrastructure with zero clients.

## Original decision (prior version of this ADR) and why it didn't hold

The 2026-05-22 version of this ADR framed the three god-object methods as "exceptions to be refactored before campaign #5 lands" via Path A (generic dispatcher) or Path B (narrow primitive composition). The 2026-05-23 audit found:

1. **5 of 5 `world.install*` calls in production go through a campaign-specific method.** The narrow primitives in the WorldMutator interface have zero callers. They are dead surface area.
2. **No campaign was ever ported to the narrow-primitive path.** The reference implementation for "Path B" was never built; we can't claim the path works without a worked example.
3. **The "two-deferral hard stop" gate** was based on a pretense that decomposition is the right answer. The decomposition has been theoretically-possible-but-never-attempted for three campaigns; demanding it as a gate for campaign #5 imposes a load-bearing assumption that nobody has validated.

## Revised decision

**Campaign-specific install methods on `WorldMutator` are the canonical pattern** for per-campaign atomic setup (controller + render layer + send-path overrides + DOM listeners + state init). The decomposition into narrow primitives is rejected as the canonical path — it imposes adapter weight on every campaign with no observed benefit. Each campaign's finale controller is its own bespoke construction; trying to compose them through generic primitives is a shape mismatch.

Campaign #5 adds `install<Campaign5>Rules(rules)` if it has a similar shape. No ADR-0004 deferral required; no hard-stop gate. The methods accumulate at the rate of ~1 per campaign with a complex finale (so ~5-7 by the time all 12 factions have campaigns), which is acceptable for a known-bounded set.

The narrow primitives stay in the WorldMutator interface as **latent infrastructure**, available if a future campaign happens to be decomposable. None of the existing 4 found them useful; that's data.

## Why this revision is honest about a known regression

The original ADR framed the situation as "three exceptions waiting to be cleaned up." The audit found "this IS the cleanup; the narrow-primitive alternative was never adopted because it doesn't fit the shape." Two-deferral hard stops on theoretical refactors that nobody has done is theater. Better to:

1. Acknowledge the pattern that actually works (`install<Campaign>Rules`).
2. Remove the artificial gate.
3. Document the bounded growth rate (~1 method per campaign).
4. Set a real expectation: when 7+ such methods exist (~all factions have campaigns), the cost-benefit may shift back toward decomposition. At that point a future ADR can revisit.

## Considered alternatives (this revision)

- **Keep the original two-deferral hard stop.** Rejected: nobody has built the decomposed alternative; the gate is theater without a worked example.
- **Delete the unused narrow primitives.** Rejected: small maintenance cost (~6 dead methods in an interface) vs. preserving optionality for a future campaign that *is* decomposable. The mocks in test files would also need updating across 5 files. Defer the deletion until either (a) a future campaign confirms the narrow path works OR (b) the dead surface starts genuinely impeding refactors.
- **Migrate one existing campaign to narrow primitives as a worked example.** Rejected for this PR's scope: ~200 LOC of controller-constructor refactor per campaign to extract narrow installs. Higher priority work (item 4 of the architecture review — freezing the data passthrough) provides more value at lower cost.

## Constraints on future work (revised, lighter than the original)

- **Campaign #5 may add `install<Campaign5>Rules`** without an ADR-0004. Document in the campaign-#5 PR description that the method is per the precedent.
- **Watch for shape changes.** If campaign #5's needs decompose cleanly into 2-3 narrow primitives, prefer that path — the narrow infrastructure is still there. Only fall back to `install<Campaign5>Rules` when the controller's deps don't split cleanly.
- **Audit at campaign #7.** When the count of `install<Campaign>Rules` methods reaches 7+, file a new ADR weighing decomposition cost vs. accumulated god-object weight. That review has actual data (the campaigns' constructor shapes) to inform it, instead of speculation.

## Consequences

- `WorldMutator`'s god-object install methods are documented as canonical rather than transitional. Future maintainers see one pattern, not "exception, not example."
- The narrow primitives stay in the interface as latent — clearly labelled in the code as "available but unused; campaigns prefer atomic install methods."
- ADR-0004 is freed up for the next genuinely-deferred decision (rather than being held by an artificial "second deferral" gate).
- The cost ceiling is real: ~1 install method per campaign. At 7+ methods, revisit.

## Status

**ACCEPTED** as of 2026-05-23. No campaign #5 design exists yet; this ADR pre-emptively unblocks one.

Last status review: 2026-05-23.
