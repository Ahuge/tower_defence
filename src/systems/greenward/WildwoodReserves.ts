/**
 * WildwoodReserves — Greenward campaign's persistent secondary resource.
 *
 * Marra leaves the Wildwood with 100 Reserves. Every tower placed in
 * a mission costs gold AND a fraction of Reserves; Reserves regen ~10
 * per mission completion but never fully recover (hard cap at 95
 * once spending has started). Late missions naturally feel strained
 * as the Wildwood thins behind her.
 *
 * Stored under `PlayerProfile.campaignState['nature']` via the
 * existing CampaignState plumbing. This module is the typed API.
 *
 * Design rationale: see docs/greenward-campaign-plan.md ("Wildwood
 * Reserves" subsection).
 *
 * Per-tower cost is determined by tower data (cheap towers ~2-3,
 * expensive ~8-12); the cost-per-tower table lives in
 * src/data/InheritorCreeps.ts adjacent to the Inheritor type data,
 * NOT here. This module knows the resource arithmetic only.
 */

import { CampaignState } from '../campaign/CampaignState';

/** Persisted Greenward campaign state slot. Add fields here as the
 *  campaign grows (ModeLeanTracker tally lands as a sibling in
 *  Phase 2 commit 7). Stored verbatim in PlayerProfile.campaignState. */
export interface GreenwardState {
  /** 0-100 (inclusive). Drains per-tower-placement; regen between
   *  missions. Hard cap at MAX_AFTER_SPEND once any spending has
   *  occurred, so the player can never return to full. */
  reserves: number;
  /** Becomes true on the first deduction. Once true, the regen cap
   *  is MAX_AFTER_SPEND rather than INITIAL. Persisted so the cap
   *  survives mission boundaries. */
  hasSpent: boolean;
}

const FACTION_ID = 'nature';

export const INITIAL_RESERVES = 100;
/** Per-mission regen amount. Applied at the start of each mission
 *  after the first (M1 starts at INITIAL_RESERVES; M2+ apply regen). */
export const REGEN_PER_MISSION = 10;
/** Cap after any spending has occurred — the Wildwood never fully
 *  recovers. Asymmetric cap is the campaign's mechanical thesis. */
export const MAX_AFTER_SPEND = 95;

export const DEFAULT_GREENWARD_STATE: GreenwardState = {
  reserves: INITIAL_RESERVES,
  hasSpent: false,
};

/** Read the current Greenward state, returning the default when no
 *  slot exists yet (fresh-install / first campaign open). Does NOT
 *  persist the default — persistence happens on the next mutation. */
export function getGreenwardState(): GreenwardState {
  return CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
}

/** Current reserve count. Convenience over `getGreenwardState().reserves`. */
export function getReserves(): number {
  return getGreenwardState().reserves;
}

/** True iff `amount` can be spent right now (i.e. reserves wouldn't
 *  go below zero). UI code calls this before showing a tower-place
 *  affordance. */
export function canAfford(amount: number): boolean {
  return getReserves() >= amount;
}

/** Deduct `amount` from reserves. Clamps at 0 — over-deducting is
 *  not allowed; the caller is responsible for checking `canAfford`
 *  first. Returns true on success, false if the call would have gone
 *  negative (no deduction performed). Sets `hasSpent` to true on
 *  the first successful deduction, capping all future regen at
 *  MAX_AFTER_SPEND. */
export function deduct(amount: number): boolean {
  if (amount < 0) return false;
  const state = getGreenwardState();
  if (state.reserves < amount) return false;
  CampaignState.set<GreenwardState>(FACTION_ID, {
    reserves: state.reserves - amount,
    hasSpent: true,
  });
  return true;
}

/** Add `amount` back to reserves. Clamped at INITIAL_RESERVES if
 *  spending has never occurred (impossible in practice — refund-only
 *  paths) and at MAX_AFTER_SPEND once `hasSpent` is true. Used by
 *  the per-mission regen tick and by any future refund mechanic. */
export function refund(amount: number): number {
  if (amount < 0) return getReserves();
  const state = getGreenwardState();
  const cap = state.hasSpent ? MAX_AFTER_SPEND : INITIAL_RESERVES;
  const next = Math.min(state.reserves + amount, cap);
  CampaignState.set<GreenwardState>(FACTION_ID, {
    reserves: next,
    hasSpent: state.hasSpent,
  });
  return next;
}

/** Apply the per-mission regen tick. Called once at the start of each
 *  Greenward mission AFTER the first. Returns the new reserve total.
 *  Convenience wrapper around `refund(REGEN_PER_MISSION)`. */
export function applyMissionRegen(): number {
  return refund(REGEN_PER_MISSION);
}

/** Wipe the Greenward state — fresh-campaign-replay convenience.
 *  Test helper too. */
export function resetGreenwardState(): void {
  CampaignState.set<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
}
