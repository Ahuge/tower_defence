/**
 * Real-money IAP purchase flows.
 *
 * Thin wrappers around `platformBridge().iap.purchase(sku)` that map
 * each platform SKU to the corresponding in-game grant:
 *
 *   ads_off          → PlayerInventory.setAdFree()
 *   shards_{size}    → ShardWallet.earn(pack.shards)
 *   skin_pack_…      → PlayerInventory.grantSkin() + bundled hero skin
 *   bp_s{N}          → BattlePass.grantPremium()
 *
 * Callers (the Store UI) don't branch on SKU shape — they call
 * `purchase(sku)` here and receive a normalised `{ ok, message }`
 * result they can turn into a toast/banner.
 *
 * This sits alongside `RestorePurchases.ts` (which covers the
 * re-emit path on reinstall / cross-device). On a successful live
 * purchase the store also writes the owned-SKU cache so a
 * subsequent restore doesn't re-trigger the grant.
 */

import { platformBridge } from '../platform';
import {
  SKU_ADS_OFF,
  SKU_BATTLE_PASS_S1,
  parseSkinPackSku,
} from '../platform/Skus';
import { PlayerInventory } from './PlayerInventory';
import { ShardWallet } from './ShardWallet';
import { BattlePass } from './BattlePass';
import { SHARD_PACKS, SKIN_DEFS } from './StoreDefinitions';

export interface PurchaseOutcome {
  ok: boolean;
  /** Short message for a toast. Not user-facing raw — callers may
   *  further format, but this is already translation-ready copy. */
  message: string;
  /** Underlying purchase status from the bridge — handy for telemetry. */
  status: 'success' | 'cancelled' | 'pending' | 'failed' | 'unavailable';
}

/** Apply the in-game grant for a given platform SKU. Shared by both
 *  the live-purchase flow (below) and the restore flow in
 *  `RestorePurchases.ts` so ownership delivery is defined once. */
function applyGrant(sku: string): string {
  if (sku === SKU_ADS_OFF) {
    if (!PlayerInventory.isAdFree()) PlayerInventory.setAdFree();
    return 'Ads removed — thanks for supporting Factions.';
  }

  if (sku === SKU_BATTLE_PASS_S1) {
    if (!BattlePass.isPremium()) BattlePass.grantPremium();
    return 'Battle Pass unlocked.';
  }

  // Shard pack — look up the matching in-game pack so we know how
  // many shards to grant.
  const pack = SHARD_PACKS.find(p => p.sku === sku);
  if (pack) {
    ShardWallet.earn(pack.shards, `IAP: ${pack.label}`);
    return `+${pack.shards.toLocaleString()} Shards credited.`;
  }

  // Skin-pack SKU — parse + grant the pack plus its bundled hero skin.
  if (sku.startsWith('skin_pack_')) {
    const parsed = parseSkinPackSku(sku);
    if (parsed) {
      const def = SKIN_DEFS.find(s =>
        s.target === 'tower_faction' && s.faction === parsed.faction && s.assetSuffix === `_${parsed.name}`,
      );
      if (def) {
        if (!PlayerInventory.ownsSkin(def.id)) PlayerInventory.grantSkin(def.id);
        for (const bundled of def.bundles ?? []) {
          if (!PlayerInventory.ownsSkin(bundled)) PlayerInventory.grantSkin(bundled);
        }
        return `${def.name} unlocked.`;
      }
    }
  }

  return 'Purchase applied.';
}

/** Kick off a real-money purchase for the given SKU. Handles both
 *  the bridge round-trip (which pops the native buy sheet) and the
 *  subsequent grant of in-game content. Cancellations are a clean
 *  `{ ok: false }` — never thrown — so callers can close their
 *  loading spinner without a try/catch. */
export async function purchase(sku: string): Promise<PurchaseOutcome> {
  let result;
  try {
    result = await platformBridge().iap.purchase(sku);
  } catch (err) {
    console.warn('[iap] purchase threw', err);
    return { ok: false, message: 'Purchase failed. Try again in a moment.', status: 'failed' };
  }

  switch (result.status) {
    case 'success': {
      const message = applyGrant(sku);
      return { ok: true, message, status: 'success' };
    }
    case 'cancelled':
      return { ok: false, message: 'Purchase cancelled.', status: 'cancelled' };
    case 'pending':
      return { ok: false, message: 'Purchase pending — check back in a minute.', status: 'pending' };
    case 'unavailable':
      return { ok: false, message: 'In-app purchases are unavailable on this build.', status: 'unavailable' };
    case 'failed':
    default:
      return {
        ok: false,
        message: result.error ?? 'Purchase failed.',
        status: 'failed',
      };
  }
}

/** Fetch localised display prices for a set of SKUs. Returns a map
 *  of `sku → displayPrice`. Missing entries fall back to `null` and
 *  the caller shows its hard-coded priceCents fallback. */
export async function getDisplayPrices(skus: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  if (skus.length === 0) return out;
  try {
    const products = await platformBridge().iap.listProducts(skus);
    for (const sku of skus) {
      out[sku] = products[sku]?.displayPrice ?? null;
    }
  } catch {
    for (const sku of skus) out[sku] = null;
  }
  return out;
}
