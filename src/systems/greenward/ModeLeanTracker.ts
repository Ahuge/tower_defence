/**
 * ModeLeanTracker — campaign-wide Consecration mode tally.
 *
 * Each mission's ConsecrationManager snapshot reports how many ruins
 * the player claimed in each mode. ModeLeanTracker accumulates that
 * across the campaign and exposes the running tally + the dominant
 * mode ("lean") that gates the M10 Nave choice:
 *
 *   - Ceremony lean (≥3 Ceremony claims across the campaign) → the
 *     player can take the Ceremony path through the Nave.
 *   - Mercy lean (≥3 Mercy claims across the campaign) → Mercy path
 *     unlocks.
 *   - Both unlock when both thresholds are met (rare but possible)
 *     — the player picks one at the Nave.
 *   - Neither lean → only the Siege fallback is available.
 *
 * Surfaced in the campaign-lobby state panel (GreenwardStatePanel)
 * so the player knows their lean BEFORE M10 — per the writer-flagged
 * "no hidden-state gotchas at the finale."
 *
 * Storage lives in the shared GreenwardState slot via CampaignState.
 */

import { CampaignState } from '../campaign/CampaignState';
import {
  type GreenwardState,
  DEFAULT_GREENWARD_STATE,
} from './WildwoodReserves';

const FACTION_ID = 'nature';

/** Threshold for either Ceremony-lean or Mercy-lean. Same threshold
 *  on each axis — three claims of a given mode unlocks that path. */
export const LEAN_THRESHOLD = 3;

export type ModeLean = 'ceremony' | 'mercy' | 'siege' | 'both';

/** Mode-lean tally — the persisted Consecration counts plus a derived
 *  `lean` field that the M10 Nave gate reads. */
export interface ModeLeanReadout {
  ceremony: number;
  siege: number;
  mercy: number;
  /** Which Nave paths are unlocked.
   *    'ceremony' = Ceremony only,
   *    'mercy'    = Mercy only,
   *    'both'     = both Ceremony and Mercy unlocked,
   *    'siege'    = neither (fallback). */
  lean: ModeLean;
}

/** Read the current tally + computed lean. Safe on a fresh state. */
export function getModeLean(): ModeLeanReadout {
  const tally = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE).modeLean;
  return { ...tally, lean: computeLean(tally) };
}

/** Compute lean from a tally — exported so the Nave-choice resolver
 *  can call it on a snapshot (avoids re-reading state in tight loops). */
export function computeLean(tally: { ceremony: number; siege: number; mercy: number }): ModeLean {
  const c = tally.ceremony >= LEAN_THRESHOLD;
  const m = tally.mercy >= LEAN_THRESHOLD;
  if (c && m) return 'both';
  if (c) return 'ceremony';
  if (m) return 'mercy';
  return 'siege';
}

/** Increment the tally with a mission's per-mode contribution.
 *  `contribution` is typically `ConsecrationManager.getSnapshot().claimedByMode`.
 *  Idempotent only if called at most once per mission completion —
 *  the caller (MissionRunner.finalize for Greenward missions) is
 *  responsible for that. */
export function recordMission(contribution: { ceremony: number; siege: number; mercy: number }): void {
  const state = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
  CampaignState.set<GreenwardState>(FACTION_ID, {
    ...state,
    modeLean: {
      ceremony: state.modeLean.ceremony + contribution.ceremony,
      siege: state.modeLean.siege + contribution.siege,
      mercy: state.modeLean.mercy + contribution.mercy,
    },
  });
}

/** Wipe the tally — used by campaign-replay flows and as a test
 *  helper. Does not touch Reserves or Caer Wenna. */
export function resetModeLean(): void {
  const state = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
  CampaignState.set<GreenwardState>(FACTION_ID, {
    ...state,
    modeLean: { ceremony: 0, siege: 0, mercy: 0 },
  });
}

/** True iff any mode has been recorded yet. Used by the lobby panel
 *  to hide the lean readout before the player has claimed anything. */
export function hasAnyLean(): boolean {
  const t = CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE).modeLean;
  return t.ceremony > 0 || t.siege > 0 || t.mercy > 0;
}
