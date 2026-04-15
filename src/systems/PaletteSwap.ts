/**
 * PaletteSwap — runtime palette transformation for pixel-art textures.
 *
 * Supports two modes that combine:
 *  - exact hex→hex swaps (for editor-authored palettes, same format as tower skins)
 *  - HSL shift (hueShift / saturationMult / lightnessMult) for quick recolors
 *    without picking per-pixel values
 *
 * Used by hero skins today (generated from the base hero spritesheet at runtime)
 * and will eventually power an editor export path for heroes.
 */
import Phaser from 'phaser';
import { HeroId } from '../data/HeroTypes';
import { HERO_SKIN_PALETTES } from '../data/HeroSkinPalettes';
import { StorePersistence } from './monetization/StorePersistence';
import { getSkinDef } from './monetization/StoreDefinitions';

export interface PaletteTransform {
  /** Exact hex→hex swaps (takes priority over HSL). e.g. { '#aa3344': '#33aa44' } */
  swaps?: Record<string, string>;
  /** Hue shift in degrees (-180..180). 0 = no change. */
  hueShift?: number;
  /** Saturation multiplier. 1.0 = no change, 0 = grayscale. */
  saturationMult?: number;
  /** Lightness multiplier. 1.0 = no change. */
  lightnessMult?: number;
}

// ─── Color math ────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return [
    Math.round(f(h + 1/3) * 255),
    Math.round(f(h) * 255),
    Math.round(f(h - 1/3) * 255),
  ];
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

// ─── Texture generation ────────────────────────────────────

/**
 * Generate a palette-swapped spritesheet from an already-loaded base texture.
 * Registers the result under `newKey` so `scene.add.sprite(x, y, newKey, frameIdx)` works.
 * Returns true on success, false if the base texture isn't loaded or already exists.
 */
export function generatePaletteSwappedSpritesheet(
  scene: Phaser.Scene,
  baseKey: string,
  newKey: string,
  transform: PaletteTransform,
  frameWidth: number,
  frameHeight: number,
): boolean {
  if (scene.textures.exists(newKey)) return true;
  if (!scene.textures.exists(baseKey)) return false;

  const src = scene.textures.get(baseKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = (src as any).width, h = (src as any).height;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(src as any, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  // Build exact-swap lookup keyed by packed RGB int.
  const swapMap = new Map<number, [number, number, number]>();
  if (transform.swaps) {
    for (const [from, to] of Object.entries(transform.swaps)) {
      const f = hexToRgb(from), t = hexToRgb(to);
      if (f && t) swapMap.set((f[0] << 16) | (f[1] << 8) | f[2], t);
    }
  }
  const hueShift = transform.hueShift ?? 0;
  const satMult = transform.saturationMult ?? 1;
  const lightMult = transform.lightnessMult ?? 1;
  const hasHsl = hueShift !== 0 || satMult !== 1 || lightMult !== 1;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue; // transparent
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    const swap = swapMap.get(key);
    if (swap) {
      px[i] = swap[0]; px[i + 1] = swap[1]; px[i + 2] = swap[2];
      continue;
    }
    if (!hasHsl) continue;
    const [H, S, L] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    const [r, g, b] = hslToRgb(H + hueShift, clamp01(S * satMult), clamp01(L * lightMult));
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);

  // Register the canvas as a spritesheet. Phaser accepts HTMLCanvasElement here.
  scene.textures.addSpriteSheet(newKey, canvas as any, { frameWidth, frameHeight });

  // Preserve crisp pixel art scaling.
  const tex = scene.textures.get(newKey);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return true;
}

// ─── Hero skin resolution ──────────────────────────────────

const FACTION_HERO_BASE: Record<string, string> = {
  shadow: 'void_hero', arcanist: 'arcane_hero', engineer: 'mech_hero',
  druid: 'nature_hero', warden: 'mil_hero', necromancer: 'alien_hero',
  duelist: 'cyber_hero', berserker: 'infernal_hero', paladin: 'celestial_hero',
  monk: 'psionic_hero', ranger: 'harmonic_hero',
};

/** Get the base hero spritesheet key for a hero id, or '' if unknown. */
export function getHeroBaseKey(heroId: HeroId | string): string {
  return FACTION_HERO_BASE[heroId] ?? '';
}

/**
 * Ensure the texture for a specific hero skin exists, generating it from the
 * base hero PNG via palette-swap if needed. `assetSuffix` includes the leading
 * underscore (e.g. '_corrupted'). Returns the skinned key, or the base key on
 * any failure.
 */
export function ensureHeroSkinTextureBySuffix(
  scene: Phaser.Scene, heroId: HeroId | string, assetSuffix: string,
): string {
  const baseKey = FACTION_HERO_BASE[heroId];
  if (!baseKey) return '';
  if (!assetSuffix) return baseKey;

  const skinnedKey = baseKey + assetSuffix;
  if (scene.textures.exists(skinnedKey)) return skinnedKey;

  const paletteKey = assetSuffix.replace(/^_/, '');
  const palette = HERO_SKIN_PALETTES[paletteKey];
  if (!palette) return baseKey;

  const ok = generatePaletteSwappedSpritesheet(
    scene, baseKey, skinnedKey, palette.transform, 64, 128,
  );
  return ok ? skinnedKey : baseKey;
}

/**
 * Ensure the texture for the currently-equipped hero skin exists (lazily generate
 * it if needed). Returns the texture key to use — either the skinned key or the
 * base key as a fallback.
 */
export function ensureHeroSkinTexture(scene: Phaser.Scene, heroId: HeroId | string): string {
  const baseKey = FACTION_HERO_BASE[heroId];
  if (!baseKey) return '';

  const equipped = StorePersistence.load().equippedSkins[`hero:${heroId}`];
  if (!equipped) return baseKey;

  const def = getSkinDef(equipped);
  if (!def || def.target !== 'hero' || !def.assetSuffix) return baseKey;

  const skinnedKey = baseKey + def.assetSuffix;
  if (scene.textures.exists(skinnedKey)) return skinnedKey;

  // Generate it. Strip leading underscore from suffix to look up the palette.
  const paletteKey = def.assetSuffix.replace(/^_/, '');
  const palette = HERO_SKIN_PALETTES[paletteKey];
  if (!palette) return baseKey;

  const ok = generatePaletteSwappedSpritesheet(
    scene, baseKey, skinnedKey, palette.transform, 64, 128,
  );
  return ok ? skinnedKey : baseKey;
}
