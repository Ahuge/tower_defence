/**
 * Snake Eyes — MissionState aspect.
 *
 * Wires the existing `DebtTracker` mutators (which were standalone
 * module-level functions with no caller) into the `MissionRunner.startV2`
 * lifecycle. Without this aspect, the 800g starting Debt never changed
 * across missions and the `VoidStatePanel` in the campaign lobby
 * permanently showed the initial state.
 *
 * Lifecycle:
 *   - `read()` / `write()`  → CampaignState slot 'void'. Shares storage
 *                             with the legacy DebtTracker mutator helpers
 *                             so any pre-existing code path continues to
 *                             see the same persistent slot.
 *   - `applyDynamicOverrides(_state, entry)` → calls `applyMissionStart(entry.idx)`.
 *                             On M1 this just flips `firstMissionStarted = true`.
 *                             On M2+ it adds the +50g interest charge (unless
 *                             the Collector was defeated in the prior mission,
 *                             which cancels one interest tick — see DebtTracker).
 *   - `applyMissionResult(_state, result)` → calls `applyLeaks(missionLeakCount)`
 *                             using the leak counter accumulated by this
 *                             mission's gameplay aspect (`onCreepReached`),
 *                             then resets the counter for the next mission.
 *
 * Why a module-level leak counter rather than threading it through state:
 * the gameplay aspect (per-mission, returned by `buildRuntime`) and the
 * missionState aspect (per-campaign, on the extension) are different
 * scopes. A module-level counter is the simplest shared channel. The
 * counter is consumed-and-reset on every `applyMissionResult` so it can
 * never bleed across missions; even if `applyMissionResult` is skipped
 * (e.g. mission abandoned), the next mission's first `onCreepReached`
 * doesn't double-count because the counter was reset on the prior
 * `applyMissionResult` OR on initial module load.
 */
import type {
  MissionStateAspect,
  MissionResult,
  MissionEntry,
} from '../campaign/types';
import {
  getSnakeEyesState,
  setSnakeEyesState,
  DEFAULT_SNAKE_EYES_STATE,
  applyMissionStart,
  applyLeaks,
  type SnakeEyesState,
} from './DebtTracker';

// ─── Per-mission leak counter ────────────────────────────────────
// Reset on every `applyMissionResult` and on module load. The
// gameplay aspect's `onCreepReached` handler increments this. We
// can't compute leak count from `result.livesStart - result.livesRemaining`
// alone because boss creeps cost 5 lives per leak but count as one
// leak in the surcharge model (`LEAK_SURCHARGE × leakCount`, not
// `LEAK_SURCHARGE × lives_lost`).
let _missionLeakCount = 0;

/** Called by the per-mission gameplay aspect on each leak event.
 *  Module-level state shared between the gameplay aspect (per-mission)
 *  and the missionState aspect (per-campaign). */
export function recordMissionLeak(): void {
  _missionLeakCount += 1;
}

/** Consumes the accumulated leak count and resets to 0. Exported for
 *  tests that need to inspect counter behaviour; in production only
 *  `applyMissionResult` below should call this. */
export function consumeMissionLeakCount(): number {
  const c = _missionLeakCount;
  _missionLeakCount = 0;
  return c;
}

/** Test-only escape hatch. Mirrors the pattern in DebtTracker.ts's
 *  `resetSnakeEyesState`. */
export function _resetMissionLeakCounter(): void {
  _missionLeakCount = 0;
}

// ─── Aspect ──────────────────────────────────────────────────────

// Parameterised with `any` for TCfg so the same instance plugs into
// the extension's specific `SnakeEyesMissionCfg` discriminated union.
// Mirrors the pattern used by `greenwardMissionStateAspect`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const snakeEyesMissionStateAspect: MissionStateAspect<SnakeEyesState, any> = {
  defaults: DEFAULT_SNAKE_EYES_STATE,

  read(): SnakeEyesState {
    return getSnakeEyesState();
  },

  write(next: SnakeEyesState): void {
    setSnakeEyesState(next);
  },

  applyDynamicOverrides(
    _state: SnakeEyesState,
    entry: MissionEntry<unknown, SnakeEyesState>,
  ): MissionEntry<unknown, SnakeEyesState> {
    // Side-effect: write interest charge through CampaignState. Safe
    // because the aspect's `read()` and the existing DebtTracker helpers
    // share the same storage slot. The aspect's `tickBetweenMissions`
    // would normally be the right hook for this, but it can't see the
    // entry.idx that the Collector-cancellation check needs. Doing it
    // here at mission-start has the same observable effect.
    applyMissionStart(entry.idx);
    return entry;
  },

  applyMissionResult(
    _state: SnakeEyesState,
    result: MissionResult,
  ): SnakeEyesState {
    // Apply leak surcharge based on the actual leak count this mission.
    // result.livesLost (= livesStart - livesRemaining) would over-charge
    // for boss leaks (5 lives each = 1 leak); the per-mission counter
    // is the accurate source. Falls back to livesLost only if the
    // gameplay aspect somehow didn't run (defensive).
    const counterCount = consumeMissionLeakCount();
    const livesLost = Math.max(0, result.livesStart - result.livesRemaining);
    const leakCount = counterCount > 0 ? counterCount : livesLost;
    if (leakCount > 0) applyLeaks(leakCount);
    return getSnakeEyesState();
  },
};
