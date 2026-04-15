/**
 * TowerIconRenderer — extracts tower sprite frames from Phaser textures
 * and renders them to data URLs for use in DOM <img> elements.
 *
 * Also renders hero icons. Hero skin variants are generated lazily via
 * PaletteSwap so the store can preview unowned skins.
 */
import { getTowerSpriteConfig, isMobileTowerSprite, getMobileSpriteConfig, getTowerFaction } from '../../systems/SpriteManager';
import { SkinManager } from '../../systems/monetization/SkinManager';
import { UIBridge } from '../UIBridge';
import { ensureHeroSkinTextureBySuffix, getHeroBaseKey } from '../../systems/PaletteSwap';
import { HeroId } from '../../data/HeroTypes';

const iconCache = new Map<string, string>();

/**
 * Extract a tower's idle frame as a data URL.
 * @param towerId Tower id (e.g. 'mech_flame', 'mil_rifleman')
 * @param overrideSuffix If provided (incl. leading '_'), render that specific
 *   skin instead of the equipped one. Pass '' to force the base/unskinned look.
 */
export function getTowerIconUrl(towerId: string, overrideSuffix?: string | null): string | null {
  // Cache key includes the explicit suffix so previews of different skins
  // don't collide with the equipped-skin icon.
  const fid = getTowerFaction(towerId);
  const suffixForCache = overrideSuffix !== undefined
    ? overrideSuffix ?? ''
    : (fid ? SkinManager.getSkinSuffix(fid, towerId) ?? '' : '');
  const cacheKey = `${towerId}|${fid ?? ''}|${suffixForCache}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;

  const game = UIBridge.getGame();
  if (!game) return null;

  const textures = game.textures;

  // Static tower
  const cfg = getTowerSpriteConfig(towerId);
  if (cfg) {
    let sheetKey = cfg.sheetKey;
    if (overrideSuffix !== undefined) {
      // Explicit override — try the requested suffix; fall back to base if not loaded.
      if (overrideSuffix && textures.exists(cfg.sheetKey + overrideSuffix)) {
        sheetKey = cfg.sheetKey + overrideSuffix;
      }
    } else if (fid) {
      const skinned = SkinManager.getTowerSheetKey(fid, towerId);
      if (skinned && textures.exists(skinned)) sheetKey = skinned;
    }
    if (!textures.exists(sheetKey)) return null;

    const frameIndex = cfg.rows.idle * cfg.totalCols + cfg.column;
    return extractFrame(textures, sheetKey, frameIndex, 64, 64, cacheKey);
  }

  // Mobile unit
  if (isMobileTowerSprite(towerId)) {
    const mobileCfg = getMobileSpriteConfig(towerId);
    if (!mobileCfg) return null;

    let mobileKey = mobileCfg.sheetKey;
    if (overrideSuffix !== undefined) {
      if (overrideSuffix && textures.exists(mobileCfg.sheetKey + overrideSuffix)) {
        mobileKey = mobileCfg.sheetKey + overrideSuffix;
      }
    } else if (fid) {
      const suffix = SkinManager.getSkinSuffix(fid, towerId);
      if (suffix) {
        const skinnedKey = mobileCfg.sheetKey + suffix;
        if (textures.exists(skinnedKey)) mobileKey = skinnedKey;
      }
    }
    if (!textures.exists(mobileKey)) return null;
    return extractFrame(textures, mobileKey, 0, 32, 32, cacheKey);
  }

  return null;
}

/**
 * Extract a hero's first-frame portrait as a data URL.
 * @param heroId Hero id (e.g. 'arcanist', 'warden')
 * @param overrideSuffix If provided, generate + render that specific skin.
 *   Pass '' to force the base unskinned look.
 */
export function getHeroIconUrl(heroId: HeroId | string, overrideSuffix?: string | null): string | null {
  const cacheKey = `hero|${heroId}|${overrideSuffix ?? ''}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;

  const game = UIBridge.getGame();
  if (!game) return null;

  let key = getHeroBaseKey(heroId);
  if (!key) return null;
  if (overrideSuffix && game.scene.scenes[0]) {
    // Use an active scene to host the generated texture (textures are global).
    const scene = game.scene.scenes.find(s => s.textures) ?? game.scene.scenes[0];
    key = ensureHeroSkinTextureBySuffix(scene as any, heroId, overrideSuffix);
  }
  if (!game.textures.exists(key)) return null;
  // Hero frames are 64×128. Frame 0 = idle facing down. Render at 64×64 so
  // it sits inside a square card cell (the bottom half is feet — fine).
  return extractFrame(game.textures, key, 0, 64, 128, cacheKey, 64, 64);
}

function extractFrame(
  textures: Phaser.Textures.TextureManager,
  key: string, frameIndex: number,
  srcCellW: number, srcCellH: number,
  cacheKey: string,
  outW: number = srcCellW, outH: number = srcCellH,
): string | null {
  const texture = textures.get(key);
  if (!texture) return null;

  const frame = texture.get(frameIndex);
  if (!frame) return null;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Draw from the source image
  const src = frame.source.image as HTMLImageElement | HTMLCanvasElement;
  ctx.drawImage(
    src,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    0, 0, outW, outH,
  );

  const url = canvas.toDataURL('image/png');
  iconCache.set(cacheKey, url);
  return url;
}

/** Clear the icon cache (call when skins change) */
export function clearTowerIconCache(): void {
  iconCache.clear();
}
