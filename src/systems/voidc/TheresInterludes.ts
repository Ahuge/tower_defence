/**
 * TheresInterludes — Snake Eyes' M6 "vanishing beat" for Theris.
 *
 * Theris is Ardax's partner gambler. She rides with him through
 * M1-M5 as a soft narrative presence (referenced in mission intros)
 * and is the AI partner in M6's coop_with_bot mission. M6 is also
 * her exit: a mid-mission text overlay marks the moment she "draws
 * the King of Coins," and an after-mission interlude carries her
 * note to Ardax. From M7 onward she is `cashed_out`.
 *
 * Both prose lines are writer-locked in the plan doc + the campaign
 * intro itself ("I cashed out, Ardax. You should too.") — no
 * 3-versions blind compare needed at this commit (the lines are
 * verbatim quotes from canonical material).
 *
 * Lifecycle, triggered by GameScene:
 *
 *   - **Mission start (M6 only)** — if `theresStatus === 'with_ardax'`,
 *     `shouldShowMidMissionOverlay()` returns true. Scene shows the
 *     overlay text at a configured wave (default wave 3 of 12).
 *
 *   - **Mission end (M6 only)** — on win, `triggerFarewellInterlude()`
 *     returns the note text + flips `theresStatus` → `'cashed_out'`.
 *     One-shot: subsequent calls return null. Replaying M6 after the
 *     state has flipped does NOT re-trigger.
 *
 *   - **M10** — `shouldRenderAtCounterfactualTable()` returns true
 *     iff `theresStatus === 'cashed_out'` (which by then it always
 *     will be, since M6 must be completed to unlock M10). Used by
 *     the M10 setpiece controller to add Theris to the table on the
 *     Counterfactual's side.
 *
 * Persistence: theresStatus lives in SnakeEyesState (see
 * DebtTracker.ts where the campaign-wide state shape is declared).
 */

import { getSnakeEyesState, setSnakeEyesState, type TherisStatus } from './DebtTracker';

/** Mission idx of M6 (Theris's Goodbye). Used for the lifecycle
 *  gates here + by mission-runner integration. */
export const THERIS_GOODBYE_MISSION_IDX = 5;

/** Wave number on which the mid-mission overlay fires. Around the
 *  midpoint so the player has time to register Theris is doing
 *  something before the goodbye lands. */
export const THERIS_OVERLAY_WAVE = 3;

/** Plan-doc-canon text: the mid-mission overlay. */
export const THERIS_OVERLAY_TEXT = 'Theris drew the King of Coins. She won.';

/** Plan-doc-canon text: the post-mission interlude (Theris's note
 *  to Ardax). Verbatim quote from the campaign intro. */
export const THERIS_FAREWELL_NOTE = 'I cashed out, Ardax. You should too.';

// ─── Lifecycle queries ───────────────────────────────────────────

/** True iff the mid-mission overlay should fire when the player
 *  enters wave `THERIS_OVERLAY_WAVE` of M6. Anchored on:
 *    - the mission idx (M6 only)
 *    - Theris still being with Ardax (replays after cashout
 *      DON'T show the overlay) */
export function shouldShowMidMissionOverlay(missionIdx: number): boolean {
  if (missionIdx !== THERIS_GOODBYE_MISSION_IDX) return false;
  return getStatus() === 'with_ardax';
}

/** Trigger the post-mission farewell interlude. Returns the note
 *  text + flips Theris's status to `cashed_out`. Returns null if:
 *    - the mission is not M6
 *    - Theris has already cashed out (idempotent on replay)
 *
 *  Caller (MissionRunner finalize hook) invokes after the mission
 *  is marked WON. On loss, do not call — Theris stays. */
export function triggerFarewellInterlude(missionIdx: number): string | null {
  if (missionIdx !== THERIS_GOODBYE_MISSION_IDX) return null;
  if (getStatus() !== 'with_ardax') return null;
  flipStatus('cashed_out');
  return THERIS_FAREWELL_NOTE;
}

/** True iff Theris should appear at the Counterfactual's table in
 *  M10. By construction, this is always true at M10 (M6 must be
 *  cleared to unlock M10), but the explicit gate makes the M10
 *  setpiece controller's contract readable. */
export function shouldRenderAtCounterfactualTable(missionIdx: number): boolean {
  if (missionIdx !== 9) return false; // M10 = idx 9
  return getStatus() === 'cashed_out';
}

// ─── State accessors ─────────────────────────────────────────────

export function getStatus(): TherisStatus {
  return getSnakeEyesState().theresStatus;
}

/** Test-only: force-set Theris's status. Production code never
 *  needs this — the lifecycle hooks handle the flip. */
export function _setStatusForTest(status: TherisStatus): void {
  flipStatus(status);
}

function flipStatus(next: TherisStatus): void {
  const state = getSnakeEyesState();
  if (state.theresStatus === next) return;
  setSnakeEyesState({ ...state, theresStatus: next });
}
