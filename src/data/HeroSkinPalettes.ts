/**
 * HeroSkinPalettes — palette transforms used to generate hero skin textures
 * at runtime from the base hero spritesheet.
 *
 * Keyed by skin suffix (without the leading underscore). One entry per existing
 * tower-skin theme; the hero is inferred from the owning faction.
 *
 * EDITOR-FUTURE NOTE: When the skin editor gains hero support it should export
 * the same `PaletteTransform` shape (preferring `swaps` for precision). The
 * HSL-shift fields here are a stopgap so we can ship 20 thematic variants
 * without hand-picking every hex.
 */
import { HeroId } from './HeroTypes';
import { PaletteTransform } from '../systems/PaletteSwap';

export interface HeroSkinPaletteEntry {
  heroId: HeroId;
  transform: PaletteTransform;
}

export const HERO_SKIN_PALETTES: Record<string, HeroSkinPaletteEntry> = {
  // Arcane — Arcanist
  corrupted:    { heroId: 'arcanist', transform: { hueShift: 100, saturationMult: 1.2, lightnessMult: 0.85 } },
  sandstone:    { heroId: 'arcanist', transform: { hueShift: 30,  saturationMult: 0.5, lightnessMult: 1.1 } },
  moonstone:    { heroId: 'arcanist', transform: { hueShift: -40, saturationMult: 0.7, lightnessMult: 1.2 } },
  blood_magic:  { heroId: 'arcanist', transform: { hueShift: -10, saturationMult: 1.4, lightnessMult: 0.7 } },

  // Mechanical — Engineer
  gilded:        { heroId: 'engineer', transform: { hueShift: 40, saturationMult: 1.3, lightnessMult: 1.15 } },
  factory_fresh: { heroId: 'engineer', transform: { hueShift: 0,  saturationMult: 0.2, lightnessMult: 1.3 } },

  // Nature — Druid
  autumn: { heroId: 'druid', transform: { hueShift: 15, saturationMult: 1.2, lightnessMult: 0.9 } },

  // Void — Shadow
  whiteout: { heroId: 'shadow', transform: { hueShift: 0, saturationMult: 0.1, lightnessMult: 1.5 } },

  // Military — Warden
  desert_storm: { heroId: 'warden', transform: { hueShift: 25,  saturationMult: 0.6, lightnessMult: 1.0 } },
  arctic:       { heroId: 'warden', transform: { hueShift: -60, saturationMult: 0.4, lightnessMult: 1.3 } },

  // Aliens — Necromancer
  albino: { heroId: 'necromancer', transform: { hueShift: 160, saturationMult: 0.3, lightnessMult: 1.4 } },

  // Cypherpunk — Duelist
  cyber_sakura: { heroId: 'duelist', transform: { hueShift: 140, saturationMult: 1.3, lightnessMult: 1.0 } },
  redline:      { heroId: 'duelist', transform: { hueShift: 0,   saturationMult: 1.5, lightnessMult: 0.8 } },
  offline:      { heroId: 'duelist', transform: { hueShift: 0,   saturationMult: 0.15, lightnessMult: 0.7 } },

  // Infernal — Berserker
  frostfire: { heroId: 'berserker', transform: { hueShift: 180, saturationMult: 1.1, lightnessMult: 1.1 } },

  // Celestial — Paladin
  fallen: { heroId: 'paladin', transform: { hueShift: 20, saturationMult: 0.5, lightnessMult: 0.6 } },

  // Psionic — Monk
  emerald: { heroId: 'monk', transform: { hueShift: 90, saturationMult: 1.3, lightnessMult: 1.0 } },

  // Harmonic — Ranger
  heavy_metal: { heroId: 'ranger', transform: { hueShift: 0,   saturationMult: 0.2, lightnessMult: 0.8 } },
  neon_rave:   { heroId: 'ranger', transform: { hueShift: 60,  saturationMult: 1.8, lightnessMult: 1.1 } },
  synthwave:   { heroId: 'ranger', transform: { hueShift: 130, saturationMult: 1.4, lightnessMult: 0.9 } },
};
