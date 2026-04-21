/**
 * Unified entry point for "watch an ad, get a reward" flows.
 *
 * Every rewarded placement (daily shards, continue, draft modifier
 * unlocks, speed boost, tower-roll reroll) calls this instead of
 * going directly through `platformBridge().ads.showRewarded()`.
 *
 * Two reasons:
 *
 * 1. **Ad-free IAP grants rewards directly.** Strategy-doc principle
 *    4: buying ads_off removes interstitials but NOT rewarded — a
 *    paying user still wants to claim the free shards. We go further
 *    here and skip the ad entirely on ads_off; there's no value in
 *    making a paying user sit through a video to get something they
 *    already paid to avoid. `claimRewarded(placement)` returns true
 *    immediately for ads_off owners, caller grants the reward as
 *    though the ad played.
 *
 * 2. **Contract consistency.** The bridge's `AdResult` union has four
 *    shapes (`'shown' | 'skipped' | 'unavailable' | 'disabled'`) but
 *    every caller wants the same boolean: "should I grant the
 *    reward?" Collapsing to boolean here prevents the "did I handle
 *    all four cases?" copy-paste footgun at each call site.
 */

import { platformBridge } from '../platform';
import { PlayerInventory } from './PlayerInventory';

/**
 * Attempt to claim a rewarded placement.
 *
 * Returns true when the caller should grant the reward — either the
 * user watched the ad to completion, or they own the ad-free IAP and
 * get the reward directly.
 *
 * Returns false on ad skip, ad unavailable, or ad disabled (via
 * bridge), meaning no reward.
 */
export async function claimRewarded(placementId: string): Promise<boolean> {
  if (PlayerInventory.isAdFree()) return true;
  const result = await platformBridge().ads.showRewarded(placementId);
  return result === 'shown';
}

/**
 * UI helper: does this user see a "Watch Ad" affordance or a
 * reward-claim affordance? Use to adapt button labels ("Watch Ad →
 * +100 Shards" vs "Claim +100 Shards").
 */
export function isRewardInstant(): boolean {
  return PlayerInventory.isAdFree();
}
