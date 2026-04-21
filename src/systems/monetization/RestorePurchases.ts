/**
 * Restore Purchases flow.
 *
 * Asks the active platform store to re-emit every non-consumable the
 * user owns (iOS: SKPaymentQueue.restoreCompletedTransactions; Android:
 * BillingClient.queryPurchasesAsync) and re-applies each entitlement
 * locally.
 *
 * Why we need this:
 *   - Entitlement state lives in localStorage (StorePersistence) — it
 *     evaporates on reinstall / new device / cleared browser storage.
 *   - Apple App Store Guideline 3.1.1 *requires* a user-visible restore
 *     affordance for any app that sells non-consumables.
 *
 * Consumables (shard packs) are excluded on purpose — the store won't
 * re-emit them, and even if it did, granting them again would let
 * users double-dip by reinstalling.
 */

import { platformBridge } from '../platform';
import { SKU_ADS_OFF, parseSkinPackSku, skinIdToSku } from '../platform/Skus';
import { PlayerInventory } from './PlayerInventory';
import { SKIN_DEFS } from './StoreDefinitions';

export interface RestoreResult {
  /** Count of SKUs the store returned. 0 = signed-in-but-nothing-to-restore. */
  skuCount: number;
  /** Count of entitlements we actually applied (ad-free flag + skin grants). */
  appliedCount: number;
  /** SKUs the store returned that we didn't recognise — surfaced for logs, not UI. */
  unknownSkus: string[];
  /** True if the bridge threw. The UI should show a generic retry toast. */
  error: boolean;
}

/** Reverse lookup: store SKU → tower-faction pack skin id. Built once.
 *  Hero skins aren't directly purchasable as their own SKU — they ride
 *  along in a tower-faction pack's `bundles`, so the pack grant handles
 *  them automatically. */
const SKU_TO_PACK_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const def of SKIN_DEFS) {
    if (def.target !== 'tower_faction' || !def.faction) continue;
    map[skinIdToSku(def.id, def.faction)] = def.id;
  }
  return map;
})();

export async function restorePurchases(): Promise<RestoreResult> {
  const result: RestoreResult = { skuCount: 0, appliedCount: 0, unknownSkus: [], error: false };
  let ownedSkus: string[];
  try {
    ownedSkus = await platformBridge().iap.restorePurchases();
  } catch {
    result.error = true;
    return result;
  }
  result.skuCount = ownedSkus.length;

  for (const sku of ownedSkus) {
    if (sku === SKU_ADS_OFF) {
      if (!PlayerInventory.isAdFree()) {
        PlayerInventory.setAdFree();
        result.appliedCount++;
      }
      continue;
    }

    if (sku.startsWith('skin_pack_')) {
      const packId = SKU_TO_PACK_ID[sku];
      if (!packId) {
        // Valid-format SKU but no matching pack — catalog drift.
        result.unknownSkus.push(sku);
        continue;
      }
      const def = SKIN_DEFS.find(s => s.id === packId);
      if (!def) { result.unknownSkus.push(sku); continue; }

      const granted = !PlayerInventory.ownsSkin(packId);
      if (granted) {
        PlayerInventory.grantSkin(packId);
        result.appliedCount++;
      }
      for (const bundled of def.bundles ?? []) {
        if (!PlayerInventory.ownsSkin(bundled)) {
          PlayerInventory.grantSkin(bundled);
          result.appliedCount++;
        }
      }
      // parseSkinPackSku is the structural validator — if it fails the SKU
      // was malformed, not just unmapped.
      if (!parseSkinPackSku(sku)) result.unknownSkus.push(sku);
      continue;
    }

    result.unknownSkus.push(sku);
  }
  return result;
}
