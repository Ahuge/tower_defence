/**
 * Canonical SKU registry.
 *
 * All in-app purchase product IDs pass through here — never hard-coded
 * in feature code. When we add / rename a SKU, change it once here;
 * every platform-specific store config (Play Console, App Store
 * Connect, Steam) must use these exact strings.
 *
 * Naming rules:
 *   - lowercase, underscore-separated
 *   - skins: `skin_pack_<faction>_<name>` — one per visual theme, per
 *     faction. One purchase unlocks all towers in that faction +
 *     matching hero variant.
 *   - currency: `shards_<size>` — small / medium / large (+ maybe
 *     mega later).
 *   - entitlements: `ads_off` (one-time, non-consumable).
 *
 * Consumable vs non-consumable matters for store configuration:
 *   - Skins + ads_off = non-consumable (buy once, own forever).
 *   - Shard packs = consumable (repurchasable).
 */
import { FactionId } from '../../data/Factions';

export type SkuType = 'consumable' | 'non_consumable';

export interface SkuDef {
  id: string;
  type: SkuType;
  /** Human label shown in internal dashboards / logs. The store's
   *  *localised* display title comes from listProducts() at runtime. */
  devLabel: string;
}

// ─── Entitlements ────────────────────────────────────────────

export const SKU_ADS_OFF = 'ads_off';

// ─── Shard packs (consumable currency) ───────────────────────

export const SKU_SHARDS_SMALL  = 'shards_small';
export const SKU_SHARDS_MEDIUM = 'shards_medium';
export const SKU_SHARDS_LARGE  = 'shards_large';
export const SKU_SHARDS_MEGA   = 'shards_mega';

// ─── Battle Pass (non-consumable, per season) ────────────────

/** Real-money Battle Pass premium unlock for the current season.
 *  One SKU per season — if/when we run season 2 we'll add `bp_s2`
 *  alongside this. Non-consumable: a season unlock, once owned,
 *  persists for the duration of that season. */
export const SKU_BATTLE_PASS_S1 = 'bp_s1';

// ─── Skin packs (non-consumable) ────────────────────────────
//
// Format: `skin_pack_<faction>_<name>` where `<name>` is a short,
// kebab-collapsed identifier (underscores). Derived from the
// in-game skin definition's `assetSuffix` — e.g. `_corrupted` →
// `corrupted`.

export function skinPackSku(faction: FactionId, name: string): string {
  return `skin_pack_${faction}_${name}`;
}

/** Parse a skin-pack SKU back into its parts. Returns null when the
 *  id doesn't match the expected format — guards against accidentally
 *  treating an unrelated SKU as a skin pack. */
export function parseSkinPackSku(sku: string): { faction: FactionId; name: string } | null {
  const m = sku.match(/^skin_pack_([a-z]+)_(.+)$/);
  if (!m) return null;
  return { faction: m[1] as FactionId, name: m[2] };
}

/** Convert an internal skin definition's id (`arcane_pack_corrupted`,
 *  `warden_skin_desert_storm`, etc) + faction into the store SKU.
 *  Stable: the same input always produces the same SKU, and the
 *  SKU never collides across factions. */
export function skinIdToSku(skinId: string, faction: FactionId): string {
  // Strip the `<faction>_pack_` or `<hero>_skin_` prefix to get the
  // theme name, then rebuild under the canonical format.
  const lastPrefix = skinId.indexOf('_pack_') >= 0
    ? skinId.split('_pack_')[1]
    : skinId.split('_skin_')[1] ?? skinId;
  return skinPackSku(faction, lastPrefix);
}

// ─── Full catalogue ─────────────────────────────────────────
//
// Populated lazily at boot by scanning StoreDefinitions.SKINS so we
// don't duplicate the skin list. The platform bridge calls
// `listProducts(allSkus())` at startup to warm the pricing cache.

export const ENTITLEMENT_SKUS: SkuDef[] = [
  { id: SKU_ADS_OFF, type: 'non_consumable', devLabel: 'Remove Ads' },
];

export const CURRENCY_SKUS: SkuDef[] = [
  { id: SKU_SHARDS_SMALL,  type: 'consumable', devLabel: 'Shards — Small Pack'  },
  { id: SKU_SHARDS_MEDIUM, type: 'consumable', devLabel: 'Shards — Medium Pack' },
  { id: SKU_SHARDS_LARGE,  type: 'consumable', devLabel: 'Shards — Large Pack'  },
  { id: SKU_SHARDS_MEGA,   type: 'consumable', devLabel: 'Shards — Mega Pack'   },
];

/** Battle Pass SKUs — one per season. Kept in a separate list so
 *  the store bootstrap code can filter: only the *current* season
 *  SKU is queryable/purchaseable at any time, older ones stay
 *  registered in Play Console for restore-purchase support only. */
export const BATTLE_PASS_SKUS: SkuDef[] = [
  { id: SKU_BATTLE_PASS_S1, type: 'non_consumable', devLabel: 'Battle Pass — Season 1' },
];

/** Build the full SKU list to feed to the store at boot — called
 *  once from a higher-level module (`buildSkuCatalogue` in
 *  SkuCatalogue.ts) that can safely import StoreDefinitions. We
 *  don't do the scan here to keep this file free of circular-
 *  import risk with the monetization module. */
