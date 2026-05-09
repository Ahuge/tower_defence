/**
 * FactionUnlockFlow — Plan 5 purchase flow.
 *
 * Two-step unlock model:
 *   1. Pay Shards from this module → marks the faction's campaign
 *      as purchased (writes to `td_store.unlockedFactions`)
 *   2. Beat the campaign in-game → faction becomes playable
 *      (computed in UnlockGates.isFactionPlayable, reads campaign
 *      progress from PlayerProfile)
 *
 * This module covers step 1 only. Step 2 is a side effect of
 * MissionRunner persisting stars + the lobby refreshing.
 *
 * No rerolls, no refunds. A successful spend is irreversible.
 */

import type { FactionId } from '../../data/Factions';
import { getTreeNode } from '../../data/FactionTree';
import { getFactionNodeState, isFactionCampaignPurchased } from './UnlockGates';
import { ShardWallet } from '../monetization/ShardWallet';
import { StorePersistence } from '../monetization/StorePersistence';
import { Analytics } from '../AnalyticsClient';

export interface UnlockResult {
  ok: boolean;
  reason?: 'not_in_tree' | 'not_unlockable' | 'insufficient_shards' | 'already_purchased';
}

/** Attempt to spend Shards on a faction's campaign unlock. Returns
 *  ok=true when the unlock succeeded (Shards spent + campaign now
 *  marked purchased). Emits the analytics events expected by the
 *  Plan 5 dashboards. */
export function attemptFactionUnlock(factionId: FactionId): UnlockResult {
  const node = getTreeNode(factionId);
  if (!node) {
    return { ok: false, reason: 'not_in_tree' };
  }

  Analytics.track('faction_unlock_attempted', { factionId, route: 'shards' });

  // Plan 5-aware "already purchased" check — bypasses the legacy
  // PlayerInventory.ownsFaction which still considers a handful of
  // factions free per the pre-Plan-5 monetization era.
  if (isFactionCampaignPurchased(factionId)) {
    Analytics.track('faction_unlock_failed', { factionId, reason: 'already_purchased' });
    return { ok: false, reason: 'already_purchased' };
  }

  const state = getFactionNodeState(factionId);
  if (state !== 'unlockable') {
    Analytics.track('faction_unlock_failed', { factionId, reason: state });
    return { ok: false, reason: 'not_unlockable' };
  }

  if (!ShardWallet.canAfford(node.shardCost)) {
    Analytics.track('faction_unlock_failed', { factionId, reason: 'insufficient_shards' });
    return { ok: false, reason: 'insufficient_shards' };
  }

  const spent = ShardWallet.spend(node.shardCost, `Faction campaign unlock: ${factionId}`);
  if (!spent) {
    // Race-shouldn't-happen branch — canAfford said yes, spend said no.
    Analytics.track('faction_unlock_failed', { factionId, reason: 'spend_failed' });
    return { ok: false, reason: 'insufficient_shards' };
  }

  // Mark the campaign as purchased. We write directly to
  // StorePersistence rather than going through PlayerInventory because
  // PlayerInventory's `ownsFaction` still bakes in the legacy
  // FREE_FACTIONS list — Plan 5's semantics are "campaign purchased",
  // which is the StorePersistence.unlockedFactions list interpreted
  // through Plan-5-aware helpers.
  StorePersistence.update(s => {
    if (!s.unlockedFactions.includes(factionId)) s.unlockedFactions.push(factionId);
  });

  Analytics.track('faction_unlocked', { factionId, route: 'shards', shardsSpent: node.shardCost });
  // Plan 5 polish: dispatch a window event that the FactionUnlockSplash
  // component listens for. Decoupled from the tree UI so any future
  // unlock surface (campaign-completion route, achievement route)
  // gets the splash for free.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('td-faction-unlocked', { detail: { factionId } }));
  }
  return { ok: true };
}
