/**
 * SkinManager — resolves equipped skins to texture keys.
 * Sits between entity code and SpriteManager/CreepSpriteManager.
 */
import { FactionId } from '../../data/Factions';
import { HeroId } from '../../data/HeroTypes';
import { StorePersistence } from './StorePersistence';
import { getSkinDef } from './StoreDefinitions';
import * as Phaser from 'phaser';

const FACTION_TOWER_SHEET: Record<string, string> = {
  void: 'void_towers', arcane: 'arcane_towers', mechanical: 'mech_towers',
  nature: 'nature_towers', military: 'mil_towers', aliens: 'alien_towers',
  cypherpunk: 'cyber_towers', infernal: 'infernal_towers', celestial: 'celestial_towers',
  psionic: 'psionic_towers', harmonic: 'harmonic_towers',
};

const FACTION_PROJ_SHEET: Record<string, string> = {
  void: 'void_proj', arcane: 'arcane_proj', mechanical: 'mech_proj',
  nature: 'nature_proj', military: 'mil_proj', aliens: 'alien_proj',
  cypherpunk: 'cyber_proj', infernal: 'infernal_proj', celestial: 'celestial_proj',
  psionic: 'psionic_proj', harmonic: 'harmonic_proj',
};

const FACTION_HERO_SHEET: Record<string, string> = {
  void: 'void_hero', arcane: 'arcane_hero', mechanical: 'mech_hero',
  nature: 'nature_hero', military: 'mil_hero', aliens: 'alien_hero',
  cypherpunk: 'cyber_hero', infernal: 'infernal_hero', celestial: 'celestial_hero',
  psionic: 'psionic_hero', harmonic: 'harmonic_hero',
};

const FACTION_CREEP_SHEET: Record<string, string> = {
  void: 'creeps_void', arcane: 'creeps_arcane', mechanical: 'creeps_mechanical',
  nature: 'creeps_nature', military: 'creeps_military', aliens: 'creeps_aliens',
  cypherpunk: 'creeps_cypherpunk', infernal: 'creeps_infernal', celestial: 'creeps_celestial',
  psionic: 'creeps_psionic', harmonic: 'creeps_harmonic',
};

const HERO_FACTION: Record<string, FactionId> = {
  shadow: 'void', arcanist: 'arcane', engineer: 'mechanical', druid: 'nature',
  warden: 'military', necromancer: 'aliens', duelist: 'cypherpunk',
  berserker: 'infernal', paladin: 'celestial', monk: 'psionic', ranger: 'harmonic',
};

/** Map FactionId → render-side themeId. The render-side ids match the
 *  keys in `THEMES` (TerrainTheme.ts) and the entries in
 *  `FACTION_TERRAINS` (TerrainManager.ts). Used by the terrain
 *  override resolver: store-equipped 'theme_arcane' → faction 'arcane'
 *  → render themeId 'arcane_crystal'. */
const FACTION_TO_THEME_ID: Record<FactionId, string> = {
  arcane: 'arcane_crystal', mechanical: 'factory', nature: 'ancient_grove',
  void: 'void_rift', military: 'urban', aliens: 'hive',
  cypherpunk: 'circuit', infernal: 'hellscape', celestial: 'marble',
  psionic: 'neural', harmonic: 'concert',
  // Both meta-factions fall back to 'generic' — chaos rotates per
  // wave and has no fixed theme; random is resolved before any
  // theme lookup happens but is kept here for type completeness.
  chaos: 'generic', random: 'generic',
};

/** Modes that should ALWAYS render the map's authored theme — the
 *  store override is suppressed. Faction Gauntlet would defeat the
 *  unlock-the-look loop; custom maps were authored with a specific
 *  visual intent the player chose. */
const OVERRIDE_SUPPRESSED_MODES = new Set(['gauntlet']);

export interface ActiveTerrainContext {
  /** The match mode this scene is running. */
  matchMode: string;
  /** The map definition's authored theme. Resolver falls back here
   *  when no override applies. */
  mapTheme: string | undefined;
  /** True if the current map is a player-authored custom map.
   *  Custom maps stay locked to the editor-saved theme. */
  isCustomMap?: boolean;
  /** In coop, the host's broadcast theme — guests render the host's
   *  choice. Set by the multiplayer layer once `game_start` lands.
   *  Ignored outside coop. */
  hostOverrideTheme?: string | null;
  /** True if this client is the coop host. Hosts render their own
   *  local equipped override; guests render `hostOverrideTheme`. */
  isCoopHost?: boolean;
}

class SkinManagerClass {
  private getSuffix(slotKey: string): string | null {
    const state = StorePersistence.load();
    const skinId = state.equippedSkins[slotKey];
    if (!skinId) return null;
    const def = getSkinDef(skinId);
    return def?.assetSuffix ?? null;
  }

  /**
   * Resolve the tower spritesheet key. Checks per-tower skin first,
   * then faction-wide skin, then returns the default.
   */
  getTowerSheetKey(faction: FactionId, towerId?: string): string {
    const base = FACTION_TOWER_SHEET[faction];
    if (!base) return '';
    // Per-tower skin takes priority
    if (towerId) {
      const towerSuffix = this.getSuffix(`tower:${towerId}`);
      if (towerSuffix) return base + towerSuffix;
    }
    // Faction-wide skin
    const factionSuffix = this.getSuffix(`towerfaction:${faction}`);
    return factionSuffix ? base + factionSuffix : base;
  }

  /**
   * Resolve the projectile spritesheet key. Same priority as towers.
   */
  getProjectileSheetKey(faction: FactionId, towerId?: string): string {
    const base = FACTION_PROJ_SHEET[faction];
    if (!base) return '';
    if (towerId) {
      const towerSuffix = this.getSuffix(`tower:${towerId}`);
      if (towerSuffix) return base + towerSuffix;
    }
    const factionSuffix = this.getSuffix(`towerfaction:${faction}`);
    return factionSuffix ? base + factionSuffix : base;
  }

  /**
   * Get the skin asset suffix for a tower (per-tower first, then faction-wide).
   * Returns the suffix string (e.g. '_desert_storm') or null if no skin equipped.
   * Used by mobile unit skin resolution.
   */
  getSkinSuffix(faction: FactionId, towerId?: string): string | null {
    if (towerId) {
      const towerSuffix = this.getSuffix(`tower:${towerId}`);
      if (towerSuffix) return towerSuffix;
    }
    return this.getSuffix(`towerfaction:${faction}`);
  }

  getHeroSheetKey(heroId: HeroId | string): string {
    const base = FACTION_HERO_SHEET[HERO_FACTION[heroId] ?? ''];
    if (!base) return '';
    const heroSuffix = this.getSuffix(`hero:${heroId}`);
    if (heroSuffix) return base + heroSuffix;
    return base;
  }

  getCreepSheetKey(faction: FactionId): string {
    const base = FACTION_CREEP_SHEET[faction];
    if (!base) return '';
    const suffix = this.getSuffix(`creep:${faction}`);
    return suffix ? base + suffix : base;
  }

  getTerrainOverrideFaction(): FactionId | null {
    const state = StorePersistence.load();
    if (!state.equippedTerrain) return null;
    const THEME_TO_FACTION: Record<string, FactionId> = {
      theme_arcane: 'arcane', theme_mechanical: 'mechanical', theme_nature: 'nature',
      theme_void: 'void', theme_military: 'military', theme_celestial: 'celestial',
      theme_infernal: 'infernal', theme_psionic: 'psionic', theme_aliens: 'aliens',
      theme_cypherpunk: 'cypherpunk', theme_harmonic: 'harmonic',
    };
    return THEME_TO_FACTION[state.equippedTerrain] ?? null;
  }

  /** Map a FactionId to its render-side themeId — the key used by
   *  THEMES (TerrainTheme.ts) and FACTION_TERRAINS (TerrainManager.ts).
   *  Used by the terrain override resolver and by the random map
   *  generator's theme picker. */
  factionToThemeId(faction: FactionId): string {
    return FACTION_TO_THEME_ID[faction] ?? 'generic';
  }

  /** Resolve the active themeId for a scene about to render. Single
   *  source of truth: GameScene.drawGrid asks here, gets back the
   *  themeId to feed into TerrainManager.compute().
   *
   *  Resolution order:
   *    1. Faction Gauntlet  → ignore override; map default
   *    2. Custom maps       → ignore override; map default
   *    3. Coop guest        → host's broadcast theme; falls back to map default
   *    4. Coop host / 1v1 / single-player → local equipped override; falls back to map default
   *
   *  Multiplayer note: 1v1 Versus runs each player on their own
   *  grid, so each peer applies their own override independently —
   *  no host concept. Coop shares a grid, so only one theme can
   *  render; the host's choice wins (see #3 / #4).
   */
  getActiveTerrainTheme(ctx: ActiveTerrainContext): string {
    const fallback = ctx.mapTheme ?? 'generic';

    if (OVERRIDE_SUPPRESSED_MODES.has(ctx.matchMode)) return fallback;
    if (ctx.isCustomMap) return fallback;

    // Coop guest: render whatever the host broadcast. Falls back to
    // map default when the host hasn't broadcast yet (early frames
    // before `game_start` is processed) or has no override equipped.
    if (ctx.matchMode === 'circle_coop' && ctx.isCoopHost === false) {
      return ctx.hostOverrideTheme ?? fallback;
    }

    // Local override applies for everyone else.
    const faction = this.getTerrainOverrideFaction();
    if (!faction) return fallback;
    return this.factionToThemeId(faction);
  }

  isTextureLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key);
  }

  resolveWithFallback(scene: Phaser.Scene, skinnedKey: string, baseKey: string): string {
    return scene.textures.exists(skinnedKey) ? skinnedKey : baseKey;
  }
}

export const SkinManager = new SkinManagerClass();
