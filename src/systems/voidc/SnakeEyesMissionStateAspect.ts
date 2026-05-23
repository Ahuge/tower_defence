/**
 * Snake Eyes — MissionState aspect.
 *
 * Wires `DebtTracker` mutators into `MissionRunner.startV2`'s
 * lifecycle. After this aspect runs, the 800g starting Debt actually
 * moves across missions and the lobby's `VoidStatePanel` shows live
 * state.
 *
 * Lifecycle (mirrors `greenwardMissionStateAspect` shape):
 *
 *   read() / write()       — through `CampaignState` (via DebtTracker
 *                            helpers; shared persistent slot).
 *   tickBetweenMissions    — calls `applyMissionStart(entry.idx)`.
 *                            On M1 just flips `firstMissionStarted`;
 *                            on M2+ adds the +50g interest charge
 *                            (Collector-cancellation honored).
 *   applyDynamicOverrides  — pure pass-through.
 *   applyMissionResult     — delegates to the active
 *                            `SnakeEyesMissionController` for both
 *                            leak-surcharge application and Wager
 *                            resolution.
 *
 * Why the controller delegation: per the Pass 2.5 architectural
 * review, the prior shape had this file owning a module-level
 * `_missionLeakCount` plus an `ActiveMissionPactbook` module-global
 * Pactbook holder. Both have been folded into
 * `SnakeEyesMissionController` (a `LifecycleAspect`), which is now
 * the single owner of per-mission runtime state. This file just
 * reaches the controller via `getActiveSnakeEyesController()` and
 * calls its public methods — pattern symmetric with how Greenward's
 * controller is touched from outside.
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
import { getActiveSnakeEyesController } from './SnakeEyesMissionController';

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

  /** Pure pass-through. Snake Eyes has no per-mission entry rewriting
   *  today; future per-Debt-band mission tuning (e.g. boss-wave HP
   *  scaling above a debt threshold) would land here. */
  applyDynamicOverrides(
    _state: SnakeEyesState,
    entry: MissionEntry<unknown, SnakeEyesState>,
  ): MissionEntry<unknown, SnakeEyesState> {
    return entry;
  },

  /** Mission-start interest tick. Receives the upcoming entry so
   *  `applyMissionStart` knows which mission idx to apply against —
   *  the Collector-cancellation check inside DebtTracker compares
   *  `state.collectorDefeatedAt` to `entry.idx - 1`. Returns the
   *  post-interest state via DebtTracker's persistent slot (we read
   *  it back rather than re-deriving the delta locally). */
  tickBetweenMissions(
    state: SnakeEyesState,
    entry: MissionEntry<unknown, SnakeEyesState>,
  ): SnakeEyesState {
    applyMissionStart(entry.idx);
    return getSnakeEyesState();
  },

  /** Mission-end. Applies leak surcharge and resolves the active
   *  wager. Both delegate to the SnakeEyesMissionController so this
   *  aspect doesn't carry per-mission runtime state. */
  applyMissionResult(
    _state: SnakeEyesState,
    result: MissionResult,
  ): SnakeEyesState {
    const controller = getActiveSnakeEyesController();
    if (controller) {
      controller.applyLeakSurcharge();
      controller.resolveWagerAtMissionEnd(result);
    } else {
      // Defensive fallback for runs where the controller wasn't
      // available (shouldn't happen — buildRuntime always returns one
      // — but guards against future regression where buildRuntime is
      // skipped, e.g. an integration test). Use livesLost as the
      // leak-count approximation; over-charges for boss leaks but
      // better than silently dropping the surcharge.
      const livesLost = Math.max(0, result.livesStart - result.livesRemaining);
      if (livesLost > 0) applyLeaks(livesLost);
    }
    return getSnakeEyesState();
  },
};
