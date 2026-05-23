/**
 * SnakeEyesMissionController — the Snake Eyes campaign's per-mission
 * runtime owner. Implements the `LifecycleAspect` interface and is
 * constructed by `SNAKE_EYES_EXTENSION.buildRuntime`. Holds the
 * mission-scoped state that doesn't belong in persistent
 * `CampaignState`:
 *
 *   - The active `Pactbook` instance (3 drawn Wagers + selection)
 *   - The per-mission leak counter (consumed by the missionState
 *     aspect's `applyMissionResult` to compute the Debt surcharge)
 *
 * Architectural rationale (see ADR-0001 + the Pass 2.5 review): the
 * earlier pass shipped these as module globals (`ActiveMissionPactbook.ts`
 * + a `_missionLeakCount` in the missionState aspect). That worked but
 * broke pattern symmetry with `GreenwardMissionController` — Greenward
 * already owns its per-mission runtime state inside a class that is the
 * Lifecycle aspect. This file restores that symmetry: every Snake Eyes
 * mission now has exactly one controller instance whose lifecycle is
 * bound to the scene tear-down via `LifecycleAspect.shutdown`.
 *
 * Cross-DOM access path: DOM-land consumers (LoadingScreen rendering
 * the PactbookPanel) read the controller via `getActiveSnakeEyesController()`
 * which calls `MissionRunner.getCurrentRuntime()` and narrows the
 * `lifecycle` aspect with `instanceof`. No module globals; no untyped
 * casts at consumption sites.
 */
import { Pactbook, type Wager } from './Pactbook';
import { applyLeaks, applyWinPaydown } from './DebtTracker';
import type { LifecycleAspect, MissionResult } from '../campaign/types';
import { MissionRunner } from '../missions/MissionRunner';

export class SnakeEyesMissionController implements LifecycleAspect {
  /** The mission's Pactbook. Constructed eagerly in the ctor so the
   *  pre-mission `PactbookPanel` always has something to render the
   *  moment it mounts. */
  private readonly _pactbook: Pactbook;

  /** Per-mission leak counter — incremented by `recordLeak()`
   *  (called from the gameplay aspect's `onCreepReached`) and
   *  consumed-and-reset by `consumeLeakCount()` (called from the
   *  missionState aspect's `applyMissionResult`). */
  private _leakCount: number = 0;

  constructor(rng?: () => number) {
    this._pactbook = new Pactbook(rng ? { rng } : {});
    this._pactbook.draw();
  }

  // ─── Pactbook accessors ──────────────────────────────────────────

  /** The drawn Pactbook for this mission. `PactbookPanel` passes this
   *  to its `pactbook` prop. */
  getPactbook(): Pactbook {
    return this._pactbook;
  }

  /** The Wager the player accepted, or null if they declined / haven't
   *  picked yet. Consumed by `WagerEffectHandler` hooks at gameplay
   *  time. */
  getActiveWager(): Wager | null {
    return this._pactbook.getSelected();
  }

  /** True iff the player resolved the panel (accepted or declined).
   *  `LoadingScreen` reads this to gate the Begin button. */
  isPactbookResolved(): boolean {
    return this._pactbook.isResolved();
  }

  // ─── Leak counter ────────────────────────────────────────────────

  /** Called from the per-mission gameplay aspect on each leak event. */
  recordLeak(): void {
    this._leakCount += 1;
  }

  /** Consumes the leak count and resets it. Called by the missionState
   *  aspect's `applyMissionResult`. */
  consumeLeakCount(): number {
    const c = this._leakCount;
    this._leakCount = 0;
    return c;
  }

  // ─── Mission-end resolution ─────────────────────────────────────

  /** Resolve the active wager at mission end. Updates the cross-
   *  mission Pactbook tally (succeeded / failed) and applies base
   *  win-paydown for accepted wagers on victory. Returns the
   *  accepted Wager (for analytics) or null if there was none.
   *
   *  Caller: `snakeEyesMissionStateAspect.applyMissionResult`. */
  resolveWagerAtMissionEnd(result: MissionResult): Wager | null {
    const accepted = this._pactbook.getSelected();
    if (!accepted) return null;
    // Tally + success/fail counter update lives on Pactbook.
    this._pactbook.resolveOutcome(result);
    if (result.won) {
      // Divergence = accepted-tier risk (T1=1, T2=2, T3=3). Matches
      // the "Debt × Divergence" shorthand in the Snake Eyes campaign
      // plan. Future Wager-effect handlers may scale this further via
      // their `getPaydownMultiplier` hook (Pass 3 work).
      applyWinPaydown(accepted.tier);
    }
    return accepted;
  }

  /** Apply the leak surcharge based on the counter. Pure delegation
   *  to `DebtTracker.applyLeaks`; lives on the controller so the
   *  missionState aspect doesn't have to know about `applyLeaks`
   *  directly — it just talks to the controller. */
  applyLeakSurcharge(): void {
    const count = this.consumeLeakCount();
    if (count > 0) applyLeaks(count);
  }

  // ─── LifecycleAspect ────────────────────────────────────────────

  /** No per-frame work today. Reserved for future mid-mission wager
   *  effects that need a tick (e.g. streak timers). */
  update(_deltaMs: number): void {}

  /** Scene tear-down. The controller doesn't own any GameScene-owned
   *  resources (no graphics objects, no event subscriptions — those
   *  are handled by the gameplay aspect via EventBusBridge). Pactbook
   *  state is discarded with the controller instance. */
  shutdown(): void {
    // No-op for now; placeholder so the contract is explicit.
  }
}

/** Typed accessor for DOM-land consumers (LoadingScreen). Reads the
 *  active campaign runtime from `MissionRunner` and narrows the
 *  `lifecycle` aspect with `instanceof`. Returns null if:
 *    - No mission is in flight, OR
 *    - The active mission's runtime isn't a Snake Eyes one (e.g. the
 *      player is in a different campaign).
 *
 *  This replaces the prior `getMissionPactbook()` module-global
 *  accessor and gives the type checker something to verify at every
 *  consumption site. */
export function getActiveSnakeEyesController(): SnakeEyesMissionController | null {
  const runtime = MissionRunner.getCurrentRuntime();
  if (runtime?.lifecycle instanceof SnakeEyesMissionController) {
    return runtime.lifecycle;
  }
  return null;
}
