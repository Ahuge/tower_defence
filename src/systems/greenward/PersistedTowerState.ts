/**
 * PersistedTowerState — the Caer Wenna persistence beat.
 *
 * Marra's first Elder Treant in the Greenward campaign becomes a
 * named character ("Caer Wenna") once she has lived through at least
 * one mission. By M7 she has "grown old" — the Wildwood's Reserves
 * cannot spare her, and the player is refused her re-placement for
 * that mission and the next.
 *
 *   - M1-M6:  player can place Elder Treant freely. The FIRST Elder
 *             placed (at idx ≤ 5) is bound to the Caer Wenna slot.
 *             Subsequent placements in those missions read as the
 *             SAME Wenna across mission boundaries.
 *   - M7-M8:  Caer Wenna refuses re-placement. `canPlaceElder` →
 *             false. Player narrative cue: "the grove cannot spare
 *             her again." The slot stays bound through this beat.
 *   - M9-M10: Caer Wenna is gone (narratively dead, mechanically the
 *             refusal lifts). A new Elder placed here is a regular
 *             Elder, not Wenna. The slot remains in state for outro /
 *             retrospective UI but no longer gates placement.
 *
 * This module is the typed API. The actual tower-placement
 * integration (refusing the placeTower call when canPlaceElder
 * returns false) lands when GreenwardController plumbs into
 * TowerManager — a later commit. For now: state + tests, ready for
 * the integration to plug in.
 *
 * State lives in the shared GreenwardState slot
 * (`PlayerProfile.campaignState['nature']`) alongside Wildwood
 * Reserves. See WildwoodReserves.ts for the slot's shape.
 */

import { CampaignState } from '../campaign/CampaignState';
import {
  type GreenwardState,
  type CaerWennaState,
  DEFAULT_GREENWARD_STATE,
} from './WildwoodReserves';

const FACTION_ID = 'nature';

/** Last mission idx at which a first-time Elder placement still
 *  binds to the Caer Wenna slot. M6 = idx 5. M7+ Elders are just
 *  Elders. */
export const CAER_WENNA_BINDING_MAX_IDX = 5;

/** Mission idxs at which an existing Caer Wenna refuses re-placement.
 *  M7 = idx 6, M8 = idx 7. */
const REFUSAL_MISSION_IDXS = new Set([6, 7]);

/** Current Caer Wenna state, or null when she has not been bound
 *  yet (no Elder placed in M1-M6 of the active campaign run). */
export function getCaerWenna(): CaerWennaState | null {
  return CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE).caerWenna;
}

/** True if the slot is bound (the player has placed an Elder in
 *  M1-M6 at least once during this campaign run). */
export function isCaerWennaBound(): boolean {
  return getCaerWenna() !== null;
}

/** Record the first Elder Treant placement. Idempotent — only the
 *  first call within the binding window (M1-M6) takes effect.
 *  Returns true if THIS call bound the slot, false if it was already
 *  bound or the mission is past the binding window. */
export function markCaerWennaSpawn(missionIdx: number): boolean {
  if (missionIdx > CAER_WENNA_BINDING_MAX_IDX) return false;
  const state = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
  if (state.caerWenna !== null) return false;
  CampaignState.set<GreenwardState>(FACTION_ID, {
    ...state,
    caerWenna: { spawnedInMissionIdx: missionIdx },
  });
  return true;
}

/** Is the player allowed to place an Elder Treant in this mission?
 *
 *   - No Caer Wenna bound yet → yes (this might BE her first placement).
 *   - Caer Wenna is bound + mission is M7 or M8 → no. "The grove
 *     cannot spare her again." The narrative refusal beat.
 *   - Otherwise → yes. M9 / M10 placements are ordinary Elders.
 *
 * Consumers call this BEFORE attempting placeTower to surface a
 * meaningful refusal message instead of a generic "can't place." */
export function canPlaceElder(missionIdx: number): boolean {
  if (!isCaerWennaBound()) return true;
  return !REFUSAL_MISSION_IDXS.has(missionIdx);
}

/** Wipe the Caer Wenna binding. Used by campaign-replay flows
 *  (rare) and as a test helper. Does NOT touch Reserves. */
export function clearCaerWenna(): void {
  const state = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
  CampaignState.set<GreenwardState>(FACTION_ID, {
    ...state,
    caerWenna: null,
  });
}
