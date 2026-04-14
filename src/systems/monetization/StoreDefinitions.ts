/**
 * StoreDefinitions — static catalog of all purchasable items.
 * Pure data, no state. Used by ShardWallet, PlayerInventory, and UI.
 */
import { FactionId, FACTIONS } from '../../data/Factions';
import { HeroId } from '../../data/HeroTypes';

// ─── Rarity ────────────────────────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, number> = {
  common:    0xaaaaaa,
  rare:      0x4488ff,
  epic:      0xaa44ff,
  legendary: 0xffaa00,
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
};

/** Drop weights for skin rolls (must sum to 100) */
export const ROLL_WEIGHTS: Record<Rarity, number> = {
  common:    60,
  rare:      25,
  epic:      12,
  legendary:  3,
};

// ─── Skin definitions ──────────────────────────────────────

export type SkinTarget =
  | 'tower_faction'   // reskins all towers + projectiles for a faction
  | 'tower'           // reskins a single tower (used in rolls)
  | 'hero'            // reskins a specific hero
  | 'creep_faction'   // reskins all creeps for a faction
  | 'terrain';        // terrain tileset theme

export interface SkinDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  target: SkinTarget;
  /** Faction id (for tower_faction / creep_faction / tower skins) */
  faction?: FactionId;
  /** Tower id (for individual tower skins) */
  towerId?: string;
  /** Hero id (for hero skins) */
  heroId?: HeroId;
  /** Terrain theme id (for terrain skins) */
  themeId?: string;
  /** Shard cost to purchase directly (0 = not directly purchasable, roll-only) */
  shardCost: number;
  /** Asset key suffix appended to the base texture key */
  assetSuffix: string;
  /** Whether this skin is only available through battle pass / seasonal events */
  exclusive?: boolean;
}

/** Skin theme definitions — used to generate per-tower rollable skins */
interface SkinTheme {
  suffix: string;
  label: string;
  description: string;
  rarity: Rarity;
}

const TOWER_SKIN_THEMES: Record<FactionId, SkinTheme[]> = {
  arcane:     [{ suffix: 'neon', label: 'Neon', description: 'Cyberpunk neon', rarity: 'rare' }, { suffix: 'corrupted', label: 'Corrupted', description: 'Dark blighted magic', rarity: 'epic' }],
  mechanical: [{ suffix: 'gilded', label: 'Gilded', description: 'Gold brass steampunk', rarity: 'rare' }, { suffix: 'rusted', label: 'Rusted', description: 'Abandoned factory', rarity: 'common' }],
  nature:     [{ suffix: 'autumn', label: 'Autumn', description: 'Fall amber leaves', rarity: 'common' }, { suffix: 'corrupted', label: 'Blighted', description: 'Undead overgrowth', rarity: 'epic' }],
  void:       [{ suffix: 'crimson', label: 'Crimson', description: 'Blood-red rift', rarity: 'rare' }],
  military:   [{ suffix: 'desert', label: 'Desert', description: 'Sand-tone camo', rarity: 'common' }],
  celestial:  [{ suffix: 'eclipse', label: 'Eclipse', description: 'Dark solar eclipse', rarity: 'epic' }],
  infernal:   [{ suffix: 'frozen', label: 'Frozen', description: 'Ice-bound hellfire', rarity: 'rare' }],
  psionic:    [{ suffix: 'glitch', label: 'Glitch', description: 'Digital artifact', rarity: 'rare' }],
  aliens:     [{ suffix: 'toxic', label: 'Toxic', description: 'Radioactive glow', rarity: 'common' }],
  cypherpunk: [{ suffix: 'retro', label: 'Retro', description: 'CRT green phosphor', rarity: 'common' }],
  harmonic:   [{ suffix: 'jazz', label: 'Jazz', description: 'Smoky lounge style', rarity: 'rare' }],
  random:     [],
};

/** Generate per-tower skins from themes + faction tower lists */
function generateTowerSkins(): SkinDef[] {
  const skins: SkinDef[] = [];
  for (const [factionId, themes] of Object.entries(TOWER_SKIN_THEMES)) {
    if (factionId === 'random' || !themes.length) continue;
    const faction = FACTIONS[factionId as FactionId];
    if (!faction) continue;
    for (const theme of themes) {
      for (const towerId of faction.towerIds) {
        // Derive a display name from towerId: 'arcane_bolt' → 'Bolt'
        const towerName = towerId.split('_').slice(1).map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ') || towerId;
        skins.push({
          id: `${towerId}_${theme.suffix}`,
          name: `${theme.label} ${towerName}`,
          description: theme.description,
          rarity: theme.rarity,
          target: 'tower',
          faction: factionId as FactionId,
          towerId,
          shardCost: 0, // roll-only — not directly purchasable
          assetSuffix: `_${theme.suffix}`,
        });
      }
    }
  }
  return skins;
}

/** All per-tower skins (generated from themes) */
export const TOWER_SKINS: SkinDef[] = generateTowerSkins();

export const SKIN_DEFS: SkinDef[] = [
  // ── Faction-wide skins (direct purchase) ──
  { id: 'arcane_pack_neon',        name: 'Neon Arcane Pack',     description: 'All Arcane towers — neon palette',  rarity: 'rare',   target: 'tower_faction', faction: 'arcane',     shardCost: 800, assetSuffix: '_neon' },
  { id: 'arcane_pack_corrupted',   name: 'Corrupted Arcane Pack', description: 'All Arcane towers — blighted',    rarity: 'epic',   target: 'tower_faction', faction: 'arcane',     shardCost: 1200, assetSuffix: '_corrupted' },
  { id: 'mech_pack_gilded',        name: 'Gilded Mech Pack',     description: 'All Mechanical towers — brass',    rarity: 'rare',   target: 'tower_faction', faction: 'mechanical', shardCost: 800, assetSuffix: '_gilded' },
  { id: 'nature_pack_autumn',      name: 'Autumn Nature Pack',   description: 'All Nature towers — fall colors',  rarity: 'rare',   target: 'tower_faction', faction: 'nature',     shardCost: 800, assetSuffix: '_autumn' },
  { id: 'mil_pack_desert_storm',   name: 'Desert Storm Pack',    description: 'All Military towers — desert camo', rarity: 'rare',   target: 'tower_faction', faction: 'military',   shardCost: 800, assetSuffix: '_desert_storm' },
  // ── Hero skins (direct purchase) ──
  { id: 'hero_arcanist_void',      name: 'Void Arcanist',        description: 'Arcanist corrupted by the Void', rarity: 'epic',      target: 'hero', heroId: 'arcanist',  shardCost: 500, assetSuffix: '_void' },
  { id: 'hero_warden_golden',      name: 'Golden Warden',        description: 'Gilded armor commander',         rarity: 'rare',      target: 'hero', heroId: 'warden',    shardCost: 400, assetSuffix: '_golden' },
  { id: 'hero_shadow_blood',       name: 'Blood Shadow',         description: 'Crimson assassin variant',       rarity: 'rare',      target: 'hero', heroId: 'shadow',    shardCost: 400, assetSuffix: '_blood' },
  // ── Legendary / seasonal (exclusive) ──
  { id: 'arcane_tower_legendary',  name: 'Prismatic Arcane',     description: 'Rainbow-shifting crystal towers', rarity: 'legendary', target: 'tower_faction', faction: 'arcane', shardCost: 0, assetSuffix: '_prismatic', exclusive: true },
  // ── Per-tower skins (roll-only) ──
  ...TOWER_SKINS,
];

/** Lookup a skin definition by id */
export function getSkinDef(skinId: string): SkinDef | undefined {
  return SKIN_DEFS.find(s => s.id === skinId);
}

/** Get all skins that can appear in rolls (per-tower skins for owned factions only) */
export function getRollableSkins(ownedFactions?: FactionId[]): SkinDef[] {
  if (!ownedFactions) return TOWER_SKINS;
  return TOWER_SKINS.filter(s => s.faction && (ownedFactions as string[]).includes(s.faction));
}

/** Get all skins available for direct purchase */
export function getPurchasableSkins(): SkinDef[] {
  return SKIN_DEFS.filter(s => !s.exclusive && s.shardCost > 0);
}

/** Get all skins for a specific target + entity */
export function getSkinsFor(target: SkinTarget, entityId: string): SkinDef[] {
  return SKIN_DEFS.filter(s => {
    if (s.target !== target) return false;
    if (target === 'tower_faction' || target === 'creep_faction') return s.faction === entityId;
    if (target === 'hero') return s.heroId === entityId;
    if (target === 'terrain') return s.themeId === entityId;
    return false;
  });
}

// ─── Faction gating ────────────────────────────────────────

/** Factions available to all players for free */
export const FREE_FACTIONS: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military', 'celestial',
];

/** Factions that require purchase (shards or $) */
export const PREMIUM_FACTIONS: FactionId[] = [
  'infernal', 'psionic', 'aliens', 'cypherpunk', 'harmonic',
];

/** Shard cost to unlock a premium faction */
export const FACTION_UNLOCK_COST = 5000;

// ─── Terrain themes ────────────────────────────────────────

export interface TerrainThemeDef {
  id: string;
  name: string;
  description: string;
  /** Source faction whose tileset is used */
  sourceFaction: FactionId;
  shardCost: number;
}

export const TERRAIN_THEMES: TerrainThemeDef[] = [
  { id: 'theme_arcane',     name: 'Crystal Caverns',   description: 'Arcane crystal terrain',     sourceFaction: 'arcane',     shardCost: 400 },
  { id: 'theme_mechanical', name: 'Factory Floor',     description: 'Industrial metal plating',   sourceFaction: 'mechanical', shardCost: 400 },
  { id: 'theme_nature',     name: 'Ancient Grove',     description: 'Lush forest and streams',    sourceFaction: 'nature',     shardCost: 400 },
  { id: 'theme_void',       name: 'Rift Wastes',       description: 'Shattered void landscape',   sourceFaction: 'void',       shardCost: 400 },
  { id: 'theme_military',   name: 'War Zone',          description: 'Urban military compound',    sourceFaction: 'military',   shardCost: 400 },
  { id: 'theme_celestial',  name: 'Marble Halls',      description: 'Divine marble architecture', sourceFaction: 'celestial',  shardCost: 400 },
  { id: 'theme_infernal',   name: 'Hellscape',         description: 'Lava and brimstone',         sourceFaction: 'infernal',   shardCost: 400 },
  { id: 'theme_psionic',    name: 'Neural Network',    description: 'Organic brain-tech hybrid',  sourceFaction: 'psionic',    shardCost: 400 },
  { id: 'theme_aliens',     name: 'Hive Colony',       description: 'Alien hive structures',      sourceFaction: 'aliens',     shardCost: 400 },
  { id: 'theme_cypherpunk', name: 'Circuit Board',     description: 'Digital neon circuits',      sourceFaction: 'cypherpunk', shardCost: 400 },
  { id: 'theme_harmonic',   name: 'Concert Grounds',   description: 'Musical festival vibes',     sourceFaction: 'harmonic',   shardCost: 400 },
];

export function getTerrainTheme(themeId: string): TerrainThemeDef | undefined {
  return TERRAIN_THEMES.find(t => t.id === themeId);
}

// ─── Skin roll cost ────────────────────────────────────────

export const SKIN_ROLL_COST = 150;
/** Shards refunded when rolling a duplicate */
export const DUPLICATE_REFUND = 30;

// ─── Shard pack definitions (real-money purchase tiers) ────

export interface ShardPack {
  id: string;
  shards: number;
  /** Price in cents (USD) */
  priceCents: number;
  /** Display label */
  label: string;
  /** Bonus percentage over base rate */
  bonusPercent: number;
}

export const SHARD_PACKS: ShardPack[] = [
  { id: 'pack_500',  shards: 500,   priceCents: 500,  label: '500 Shards',         bonusPercent: 0 },
  { id: 'pack_1200', shards: 1200,  priceCents: 1000, label: '1,200 Shards (+20%)', bonusPercent: 20 },
  { id: 'pack_3000', shards: 3000,  priceCents: 2000, label: '3,000 Shards (+50%)', bonusPercent: 50 },
  { id: 'pack_7000', shards: 7000,  priceCents: 4000, label: '7,000 Shards (+75%)', bonusPercent: 75 },
];

// ─── Battle pass pricing ───────────────────────────────────

export const BATTLE_PASS_SHARD_COST = 2500;
/** XP required per battle pass level */
export const BP_XP_PER_LEVEL = 1000;
/** Total battle pass levels */
export const BP_MAX_LEVEL = 30;

// ─── Ad reward values ──────────────────────────────────────

/** Lives granted by last-life continue ad */
export const AD_CONTINUE_LIVES = 5;
/** Gold granted by between-wave ad, multiplied by (waveNumber / 10) */
export const AD_GOLD_BASE = 150;
/** Minimum waves between gold ads */
export const AD_GOLD_COOLDOWN_WAVES = 5;

// ─── Remove Ads pricing ───────────────────────────────────

export const REMOVE_ADS_SHARD_COST = 2500;
export const REMOVE_ADS_PRICE_CENTS = 500;
