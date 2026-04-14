/**
 * SkinManager — resolves equipped skins to texture keys.
 * Sits between entity code and SpriteManager/CreepSpriteManager.
 */
import { FactionId } from '../../data/Factions';
import { HeroId } from '../../data/HeroTypes';
import { StorePersistence } from './StorePersistence';
import { getSkinDef } from './StoreDefinitions';
import Phaser from 'phaser';

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

class SkinManagerClass {
  private getSuffix(slotKey: string): string | null {
    const state = StorePersistence.load();
    const skinId = state.equippedSkins[slotKey];
    if (!skinId) return null;
    const def = getSkinDef(skinId);
    return def?.assetSuffix ?? null;
  }

  getTowerSheetKey(faction: FactionId): string {
    const base = FACTION_TOWER_SHEET[faction];
    if (!base) return '';
    const suffix = this.getSuffix(`tower:${faction}`);
    return suffix ? base + suffix : base;
  }

  getProjectileSheetKey(faction: FactionId): string {
    const base = FACTION_PROJ_SHEET[faction];
    if (!base) return '';
    const suffix = this.getSuffix(`tower:${faction}`);
    return suffix ? base + suffix : base;
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

  isTextureLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key);
  }

  resolveWithFallback(scene: Phaser.Scene, skinnedKey: string, baseKey: string): string {
    return scene.textures.exists(skinnedKey) ? skinnedKey : baseKey;
  }
}

export const SkinManager = new SkinManagerClass();
