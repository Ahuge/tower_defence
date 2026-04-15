/**
 * StoreDefinitions — static catalog of all purchasable items.
 * Pure data, no state. Used by ShardWallet, PlayerInventory, and UI.
 */
import { FactionId, FACTIONS } from '../../data/Factions';
import { HeroId } from '../../data/HeroTypes';
import { TOWER_TYPES } from '../../data/TowerTypes';

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

/** Visual overrides for how a tower appears in the selection dock bar */
export interface DockStyle {
  /** Border color (hex string, e.g. '#44ff44') — replaces default gray border */
  borderColor?: string;
  /** Glow color (hex string) — adds a box-shadow glow around the card */
  glowColor?: string;
  /** Background tint (hex string) — subtle color wash on card background */
  bgTint?: string;
  /** Name label color (hex string) — overrides default white tower name */
  nameColor?: string;
}

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
  /** Dock card visual overrides — applied to the tower selection bar */
  dockStyle?: DockStyle;
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

// Per-tower roll themes — only include factions that have real skin assets.
// Add new themes here as skins are created in the skin editor.
const TOWER_SKIN_THEMES: Record<FactionId, SkinTheme[]> = {
  arcane:     [{ suffix: 'corrupted', label: 'Corrupted', description: 'Green corruption theme', rarity: 'epic' }, { suffix: 'sandstone', label: 'Sandstone', description: 'Desert ruins', rarity: 'common' }, { suffix: 'moonstone', label: 'Moonstone', description: 'Silver-blue lunar', rarity: 'rare' }, { suffix: 'blood_magic', label: 'Blood Magic', description: 'Dark crimson', rarity: 'epic' }],
  mechanical: [{ suffix: 'gilded', label: 'Gilded', description: 'Bright gold', rarity: 'epic' }, { suffix: 'factory_fresh', label: 'Factory Fresh', description: 'Clean silver', rarity: 'common' }],
  nature:     [{ suffix: 'autumn', label: 'Autumn', description: 'Fall fire colors', rarity: 'common' }],
  void:       [{ suffix: 'whiteout', label: 'Whiteout', description: 'Bleached white', rarity: 'common' }],
  military:   [{ suffix: 'desert_storm', label: 'Desert Storm', description: 'Desert camo', rarity: 'rare' }, { suffix: 'arctic', label: 'Arctic', description: 'Ice blue camo', rarity: 'common' }],
  celestial:  [{ suffix: 'fallen', label: 'Fallen', description: 'Tarnished dark', rarity: 'common' }],
  infernal:   [{ suffix: 'frostfire', label: 'Frostfire', description: 'Blue flames', rarity: 'common' }],
  psionic:    [{ suffix: 'emerald', label: 'Emerald', description: 'Green glow', rarity: 'common' }],
  aliens:     [{ suffix: 'albino', label: 'Albino', description: 'Pale pink/white', rarity: 'common' }],
  cypherpunk: [{ suffix: 'cyber_sakura', label: 'Cyber Sakura', description: 'Pink sakura theme', rarity: 'epic' }, { suffix: 'redline', label: 'Redline', description: 'Overheated red', rarity: 'common' }, { suffix: 'offline', label: 'Offline', description: 'Powered down gray', rarity: 'common' }],
  harmonic:   [{ suffix: 'heavy_metal', label: 'Heavy Metal', description: 'Chrome/gunmetal', rarity: 'common' }, { suffix: 'neon_rave', label: 'Neon Rave', description: 'Neon rainbow chaos', rarity: 'rare' }, { suffix: 'synthwave', label: 'Synthwave', description: '80s sunset pink/purple', rarity: 'epic' }],
  random:     [],
};

const RARITY_UP: Record<Rarity, Rarity> = {
  common: 'rare', rare: 'epic', epic: 'legendary', legendary: 'legendary',
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
        const towerName = towerId.split('_').slice(1).map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ') || towerId;
        const isUlt = TOWER_TYPES[towerId]?.ultimate === true;
        skins.push({
          id: `${towerId}_${theme.suffix}`,
          name: `${theme.label} ${towerName}`,
          description: theme.description,
          rarity: isUlt ? RARITY_UP[theme.rarity] : theme.rarity,
          target: 'tower',
          faction: factionId as FactionId,
          towerId,
          shardCost: 0,
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
  // ── Faction-wide skins (direct purchase) — only include skins with actual assets ──
  { id: 'arcane_pack_corrupted',   name: 'Corrupted Arcane Pack', description: 'All Arcane towers — green corruption', rarity: 'epic', target: 'tower_faction', faction: 'arcane',   shardCost: 1200, assetSuffix: '_corrupted',
    dockStyle: { borderColor: '#22aa44', glowColor: '#22aa4466', bgTint: '#0a1a0a' } },
  { id: 'arcane_pack_sandstone',   name: 'Sandstone Arcane Pack',  description: 'All Arcane towers — desert ruins',     rarity: 'common', target: 'tower_faction', faction: 'arcane', shardCost: 400, assetSuffix: '_sandstone',
    dockStyle: { borderColor: '#bb8855', glowColor: '#bb885544', bgTint: '#140e08' } },
  { id: 'arcane_pack_moonstone',   name: 'Moonstone Arcane Pack',  description: 'All Arcane towers — silver-blue lunar', rarity: 'rare', target: 'tower_faction', faction: 'arcane', shardCost: 800, assetSuffix: '_moonstone',
    dockStyle: { borderColor: '#99aacc', glowColor: '#99aacc55', bgTint: '#0a0e14' } },
  { id: 'arcane_pack_blood',       name: 'Blood Magic Pack',       description: 'All Arcane towers — dark crimson',     rarity: 'epic', target: 'tower_faction', faction: 'arcane', shardCost: 1200, assetSuffix: '_blood_magic',
    dockStyle: { borderColor: '#cc3344', glowColor: '#cc334466', bgTint: '#1a0808' } },
  { id: 'mil_pack_desert_storm',   name: 'Desert Storm Pack',    description: 'All Military towers — desert camo',    rarity: 'rare', target: 'tower_faction', faction: 'military', shardCost: 800,  assetSuffix: '_desert_storm',
    dockStyle: { borderColor: '#ccaa66', glowColor: '#ccaa6644', bgTint: '#1a1508' } },
  { id: 'cyber_pack_sakura',       name: 'Cyber Sakura Pack',    description: 'All Cypherpunk towers — pink sakura',  rarity: 'epic', target: 'tower_faction', faction: 'cypherpunk', shardCost: 1200, assetSuffix: '_cyber_sakura',
    dockStyle: { borderColor: '#ff0088', glowColor: '#ff008866', bgTint: '#1a0a1a' } },
  { id: 'cyber_pack_redline',      name: 'Redline Pack',          description: 'All Cypherpunk towers — overheated red', rarity: 'common', target: 'tower_faction', faction: 'cypherpunk', shardCost: 400, assetSuffix: '_redline',
    dockStyle: { borderColor: '#ff4422', glowColor: '#ff442266', bgTint: '#1a0804' } },
  { id: 'cyber_pack_offline',      name: 'Offline Pack',          description: 'All Cypherpunk towers — powered down',  rarity: 'common', target: 'tower_faction', faction: 'cypherpunk', shardCost: 400, assetSuffix: '_offline',
    dockStyle: { borderColor: '#556677', glowColor: '#55667733', bgTint: '#0a0e14' } },
  { id: 'mech_pack_gilded',        name: 'Gilded Mechanical Pack', description: 'All Mechanical towers — bright gold', rarity: 'epic', target: 'tower_faction', faction: 'mechanical', shardCost: 1200, assetSuffix: '_gilded',
    dockStyle: { borderColor: '#ffdd22', glowColor: '#ffdd2288', bgTint: '#1a1200' } },
  { id: 'mech_pack_factory',       name: 'Factory Fresh Pack',     description: 'All Mechanical towers — clean silver', rarity: 'common', target: 'tower_faction', faction: 'mechanical', shardCost: 400, assetSuffix: '_factory_fresh',
    dockStyle: { borderColor: '#ccccee', glowColor: '#ccccee44', bgTint: '#0e0e14' } },
  { id: 'nature_pack_autumn',      name: 'Autumn Nature Pack',     description: 'All Nature towers — fall fire colors', rarity: 'common', target: 'tower_faction', faction: 'nature', shardCost: 400, assetSuffix: '_autumn',
    dockStyle: { borderColor: '#dd4411', glowColor: '#dd441166', bgTint: '#1a0a02' } },
  { id: 'mil_pack_arctic',         name: 'Arctic Military Pack',   description: 'All Military towers — ice blue camo',  rarity: 'common', target: 'tower_faction', faction: 'military', shardCost: 400, assetSuffix: '_arctic',
    dockStyle: { borderColor: '#aabbdd', glowColor: '#aabbdd44', bgTint: '#0a0e1a' } },
  { id: 'infernal_pack_frostfire', name: 'Frostfire Infernal Pack', description: 'All Infernal towers — blue flames', rarity: 'common', target: 'tower_faction', faction: 'infernal', shardCost: 400, assetSuffix: '_frostfire',
    dockStyle: { borderColor: '#4488ff', glowColor: '#4488ff66', bgTint: '#0a0a1a' } },
  { id: 'aliens_pack_albino',      name: 'Albino Aliens Pack',     description: 'All Alien towers — pale pink/white',  rarity: 'common', target: 'tower_faction', faction: 'aliens', shardCost: 400, assetSuffix: '_albino',
    dockStyle: { borderColor: '#ffcccc', glowColor: '#ffcccc44', bgTint: '#1a1215' } },
  { id: 'void_pack_whiteout',      name: 'Whiteout Void Pack',     description: 'All Void towers — bleached white',    rarity: 'common', target: 'tower_faction', faction: 'void', shardCost: 400, assetSuffix: '_whiteout',
    dockStyle: { borderColor: '#ccccdd', glowColor: '#ccccdd55', bgTint: '#141418' } },
  { id: 'celestial_pack_fallen',   name: 'Fallen Celestial Pack',  description: 'All Celestial towers — tarnished dark', rarity: 'common', target: 'tower_faction', faction: 'celestial', shardCost: 400, assetSuffix: '_fallen',
    dockStyle: { borderColor: '#886655', glowColor: '#88665544', bgTint: '#141010' } },
  { id: 'psionic_pack_emerald',    name: 'Emerald Mind Pack',      description: 'All Psionic towers — green glow',     rarity: 'common', target: 'tower_faction', faction: 'psionic', shardCost: 400, assetSuffix: '_emerald',
    dockStyle: { borderColor: '#44cc66', glowColor: '#44cc6666', bgTint: '#0a1a0e' } },
  { id: 'harmonic_pack_heavy_metal', name: 'Heavy Metal Pack',     description: 'All Harmonic towers — chrome/gunmetal', rarity: 'common', target: 'tower_faction', faction: 'harmonic', shardCost: 400, assetSuffix: '_heavy_metal',
    dockStyle: { borderColor: '#888899', glowColor: '#88889944', bgTint: '#0e0e12' } },
  { id: 'harmonic_pack_neon_rave',   name: 'Neon Rave Pack',       description: 'All Harmonic towers — neon rainbow',    rarity: 'rare',   target: 'tower_faction', faction: 'harmonic', shardCost: 800, assetSuffix: '_neon_rave',
    dockStyle: { borderColor: '#ff00ff', glowColor: '#ff00ff88', bgTint: '#0a050a' } },
  { id: 'harmonic_pack_synthwave',   name: 'Synthwave Pack',       description: 'All Harmonic towers — 80s sunset',      rarity: 'epic',   target: 'tower_faction', faction: 'harmonic', shardCost: 1200, assetSuffix: '_synthwave',
    dockStyle: { borderColor: '#ff6688', glowColor: '#ff668888', bgTint: '#1a0a11' } },

  // ── Hero skins (palette-swap generated at runtime — see HeroSkinPalettes.ts) ──
  // Arcane — Arcanist
  { id: 'arcanist_skin_corrupted',    name: 'Corrupted Arcanist',    description: 'Green corruption seeps through the robes',  rarity: 'epic',   target: 'hero', heroId: 'arcanist',    shardCost: 600, assetSuffix: '_corrupted',    dockStyle: { borderColor: '#22aa44', glowColor: '#22aa4466', bgTint: '#0a1a0a' } },
  { id: 'arcanist_skin_sandstone',    name: 'Sandstone Arcanist',    description: 'Desert-weathered wanderer',                 rarity: 'common', target: 'hero', heroId: 'arcanist',    shardCost: 200, assetSuffix: '_sandstone',    dockStyle: { borderColor: '#bb8855', glowColor: '#bb885544', bgTint: '#140e08' } },
  { id: 'arcanist_skin_moonstone',    name: 'Moonstone Arcanist',    description: 'Silver-blue lunar mage',                    rarity: 'rare',   target: 'hero', heroId: 'arcanist',    shardCost: 400, assetSuffix: '_moonstone',    dockStyle: { borderColor: '#99aacc', glowColor: '#99aacc55', bgTint: '#0a0e14' } },
  { id: 'arcanist_skin_blood_magic',  name: 'Blood Magic Arcanist',  description: 'Crimson dark magic adept',                  rarity: 'epic',   target: 'hero', heroId: 'arcanist',    shardCost: 600, assetSuffix: '_blood_magic',  dockStyle: { borderColor: '#cc3344', glowColor: '#cc334466', bgTint: '#1a0808' } },
  // Mechanical — Engineer
  { id: 'engineer_skin_gilded',       name: 'Gilded Engineer',       description: 'Bright gold industrialist',                 rarity: 'epic',   target: 'hero', heroId: 'engineer',    shardCost: 600, assetSuffix: '_gilded',       dockStyle: { borderColor: '#ffdd22', glowColor: '#ffdd2288', bgTint: '#1a1200' } },
  { id: 'engineer_skin_factory_fresh', name: 'Factory Fresh Engineer', description: 'Clean silver tinker',                    rarity: 'common', target: 'hero', heroId: 'engineer',    shardCost: 200, assetSuffix: '_factory_fresh', dockStyle: { borderColor: '#ccccee', glowColor: '#ccccee44', bgTint: '#0e0e14' } },
  // Nature — Druid
  { id: 'druid_skin_autumn',          name: 'Autumn Druid',          description: 'Fall fire colors',                          rarity: 'common', target: 'hero', heroId: 'druid',       shardCost: 200, assetSuffix: '_autumn',       dockStyle: { borderColor: '#dd4411', glowColor: '#dd441166', bgTint: '#1a0a02' } },
  // Void — Shadow
  { id: 'shadow_skin_whiteout',       name: 'Whiteout Shadow',       description: 'Bleached to nothing',                       rarity: 'common', target: 'hero', heroId: 'shadow',      shardCost: 200, assetSuffix: '_whiteout',     dockStyle: { borderColor: '#ccccdd', glowColor: '#ccccdd55', bgTint: '#141418' } },
  // Military — Warden
  { id: 'warden_skin_desert_storm',   name: 'Desert Storm Warden',   description: 'Desert camo commander',                     rarity: 'rare',   target: 'hero', heroId: 'warden',      shardCost: 400, assetSuffix: '_desert_storm', dockStyle: { borderColor: '#ccaa66', glowColor: '#ccaa6644', bgTint: '#1a1508' } },
  { id: 'warden_skin_arctic',         name: 'Arctic Warden',         description: 'Ice blue cold-weather loadout',             rarity: 'common', target: 'hero', heroId: 'warden',      shardCost: 200, assetSuffix: '_arctic',       dockStyle: { borderColor: '#aabbdd', glowColor: '#aabbdd44', bgTint: '#0a0e1a' } },
  // Aliens — Necromancer
  { id: 'necromancer_skin_albino',    name: 'Albino Necromancer',    description: 'Pale pink/white variant',                   rarity: 'common', target: 'hero', heroId: 'necromancer', shardCost: 200, assetSuffix: '_albino',       dockStyle: { borderColor: '#ffcccc', glowColor: '#ffcccc44', bgTint: '#1a1215' } },
  // Cypherpunk — Duelist
  { id: 'duelist_skin_cyber_sakura',  name: 'Cyber Sakura Duelist',  description: 'Pink sakura netrunner',                     rarity: 'epic',   target: 'hero', heroId: 'duelist',     shardCost: 600, assetSuffix: '_cyber_sakura', dockStyle: { borderColor: '#ff0088', glowColor: '#ff008866', bgTint: '#1a0a1a' } },
  { id: 'duelist_skin_redline',       name: 'Redline Duelist',       description: 'Overheated red',                            rarity: 'common', target: 'hero', heroId: 'duelist',     shardCost: 200, assetSuffix: '_redline',      dockStyle: { borderColor: '#ff4422', glowColor: '#ff442266', bgTint: '#1a0804' } },
  { id: 'duelist_skin_offline',       name: 'Offline Duelist',       description: 'Powered down gray',                         rarity: 'common', target: 'hero', heroId: 'duelist',     shardCost: 200, assetSuffix: '_offline',      dockStyle: { borderColor: '#556677', glowColor: '#55667733', bgTint: '#0a0e14' } },
  // Infernal — Berserker
  { id: 'berserker_skin_frostfire',   name: 'Frostfire Berserker',   description: 'Blue flames',                               rarity: 'common', target: 'hero', heroId: 'berserker',   shardCost: 200, assetSuffix: '_frostfire',    dockStyle: { borderColor: '#4488ff', glowColor: '#4488ff66', bgTint: '#0a0a1a' } },
  // Celestial — Paladin
  { id: 'paladin_skin_fallen',        name: 'Fallen Paladin',        description: 'Tarnished dark armor',                      rarity: 'common', target: 'hero', heroId: 'paladin',     shardCost: 200, assetSuffix: '_fallen',       dockStyle: { borderColor: '#886655', glowColor: '#88665544', bgTint: '#141010' } },
  // Psionic — Monk
  { id: 'monk_skin_emerald',          name: 'Emerald Monk',          description: 'Green glow psychic',                        rarity: 'common', target: 'hero', heroId: 'monk',        shardCost: 200, assetSuffix: '_emerald',      dockStyle: { borderColor: '#44cc66', glowColor: '#44cc6666', bgTint: '#0a1a0e' } },
  // Harmonic — Ranger
  { id: 'ranger_skin_heavy_metal',    name: 'Heavy Metal Ranger',    description: 'Chrome/gunmetal',                           rarity: 'common', target: 'hero', heroId: 'ranger',      shardCost: 200, assetSuffix: '_heavy_metal',  dockStyle: { borderColor: '#888899', glowColor: '#88889944', bgTint: '#0e0e12' } },
  { id: 'ranger_skin_neon_rave',      name: 'Neon Rave Ranger',      description: 'Neon rainbow chaos',                        rarity: 'rare',   target: 'hero', heroId: 'ranger',      shardCost: 400, assetSuffix: '_neon_rave',    dockStyle: { borderColor: '#ff00ff', glowColor: '#ff00ff88', bgTint: '#0a050a' } },
  { id: 'ranger_skin_synthwave',      name: 'Synthwave Ranger',      description: '80s sunset pink/purple',                    rarity: 'epic',   target: 'hero', heroId: 'ranger',      shardCost: 600, assetSuffix: '_synthwave',    dockStyle: { borderColor: '#ff6688', glowColor: '#ff668888', bgTint: '#1a0a11' } },

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
