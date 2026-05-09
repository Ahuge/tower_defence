/**
 * CampaignState — generic per-faction persistent state container.
 *
 * v2 campaigns (Arcane Counterspell, Mech Cascade) need data that
 * crosses mission boundaries: the campaign-long channel timer, the
 * supply-chain state, the foreman's rage. v1 had no such need —
 * mission stars were enough. v2's hook is `MissionDef.stateUpdater`
 * (see CampaignDef.ts), which mutates the per-faction state slot
 * after each mission ends.
 *
 * Storage lives in `PlayerProfileState.campaignState[factionId]` as
 * `unknown` so different campaigns can carry different shapes without
 * coupling. Each consumer narrows via a typed accessor here.
 *
 * Narrowing pattern (consumer-side):
 *
 *     const state = CampaignState.get<MechSupplyState>(
 *       'mechanical', defaultMechSupplyState,
 *     );
 *     CampaignState.set('mechanical', { ...state, oreTokens: 50 });
 *
 * The default is required — first read after install hits the empty
 * `{}` slot and we want a typed value back, not undefined.
 */

import { PlayerProfileStore } from '../profile/PlayerProfileStore';
import { Analytics } from '../AnalyticsClient';

export const CampaignState = {
  /** Read the current state for a faction. If no state exists yet,
   *  returns (and does NOT persist) the provided default. Persistence
   *  happens on the next `set`. */
  get<T>(factionId: string, defaults: T): T {
    const slot = PlayerProfileStore.load().campaignState[factionId];
    if (slot === undefined || slot === null) return defaults;
    // Defaults merge: any new fields the consumer added since last
    // save show up with their default values rather than `undefined`.
    return { ...defaults, ...(slot as object) } as T;
  },

  /** Write a new state for a faction. Replaces the prior slot wholesale
   *  — pass the full object, not a delta. Emits analytics with the
   *  changed keys (delta calculation is shallow). */
  set<T extends object>(factionId: string, next: T): void {
    let prevKeys: string[] = [];
    let changedKeys: string[] = [];
    PlayerProfileStore.update(s => {
      const prev = s.campaignState[factionId];
      if (prev && typeof prev === 'object') {
        prevKeys = Object.keys(prev);
        changedKeys = Object.keys(next).filter(k => {
          return (prev as Record<string, unknown>)[k] !== (next as Record<string, unknown>)[k];
        });
      } else {
        changedKeys = Object.keys(next);
      }
      s.campaignState[factionId] = next;
    });
    Analytics.track('campaign_state_updated', {
      factionId,
      changedKeys,
      hadPriorState: prevKeys.length > 0,
    });
  },

  /** Wipe state for a faction. Used when a player re-runs a campaign
   *  from scratch (rare; default is to keep state across replays). */
  reset(factionId: string): void {
    PlayerProfileStore.update(s => {
      delete s.campaignState[factionId];
    });
    Analytics.track('campaign_state_updated', {
      factionId,
      changedKeys: ['__reset'],
      hadPriorState: true,
    });
  },

  /** True if a campaign-state slot exists for this faction. */
  has(factionId: string): boolean {
    return PlayerProfileStore.load().campaignState[factionId] !== undefined;
  },
};
