/**
 * TowerIconRenderer — extracts tower sprite frames from Phaser textures
 * and renders them to data URLs for use in DOM <img> elements.
 *
 * Call init() once after Phaser preloads sprites, then getIcon() per tower.
 */
import { getTowerSpriteConfig, isMobileTowerSprite, getMobileSpriteConfig, getTowerFaction } from '../../systems/SpriteManager';
import { SkinManager } from '../../systems/monetization/SkinManager';
import { UIBridge } from '../UIBridge';

const iconCache = new Map<string, string>();

/** Extract a tower's idle frame as a data URL. Returns null if no sprite available. */
export function getTowerIconUrl(towerId: string): string | null {
  // Check cache first
  const cacheKey = towerId + '_' + (getTowerFaction(towerId) ?? '');
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;

  const game = UIBridge.getGame();
  if (!game) return null;

  const textures = game.textures;

  // Resolve skinned sheet key
  const fid = getTowerFaction(towerId);

  // Static tower
  const cfg = getTowerSpriteConfig(towerId);
  if (cfg) {
    let sheetKey = cfg.sheetKey;
    if (fid) {
      const skinned = SkinManager.getTowerSheetKey(fid, towerId);
      if (skinned && textures.exists(skinned)) sheetKey = skinned;
    }
    if (!textures.exists(sheetKey)) return null;

    const frameIndex = cfg.rows.idle * cfg.totalCols + cfg.column;
    return extractFrame(textures, sheetKey, frameIndex, 64, cacheKey);
  }

  // Mobile unit
  if (isMobileTowerSprite(towerId)) {
    const mobileCfg = getMobileSpriteConfig(towerId);
    if (!mobileCfg) return null;

    let mobileKey = mobileCfg.sheetKey;
    if (fid) {
      const suffix = SkinManager.getSkinSuffix(fid, towerId);
      if (suffix) {
        const skinnedKey = mobileCfg.sheetKey + suffix;
        if (textures.exists(skinnedKey)) mobileKey = skinnedKey;
      }
    }
    if (!textures.exists(mobileKey)) return null;
    return extractFrame(textures, mobileKey, 0, 32, cacheKey);
  }

  return null;
}

function extractFrame(textures: Phaser.Textures.TextureManager, key: string, frameIndex: number, cellSize: number, cacheKey: string): string | null {
  const texture = textures.get(key);
  if (!texture) return null;

  const frame = texture.get(frameIndex);
  if (!frame) return null;

  const canvas = document.createElement('canvas');
  canvas.width = cellSize;
  canvas.height = cellSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Draw from the source image
  const src = frame.source.image as HTMLImageElement | HTMLCanvasElement;
  ctx.drawImage(
    src,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    0, 0, cellSize, cellSize,
  );

  const url = canvas.toDataURL('image/png');
  iconCache.set(cacheKey, url);
  return url;
}

/** Clear the icon cache (call when skins change) */
export function clearTowerIconCache(): void {
  iconCache.clear();
}
