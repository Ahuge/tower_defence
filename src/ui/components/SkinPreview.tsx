import * as Phaser from 'phaser';
/**
 * SkinPreview — renders a sprite preview for a SkinDef card.
 *
 *  - target: 'tower_faction' → row of all faction towers (and projectiles row)
 *  - target: 'tower'         → single tower icon
 *  - target: 'hero'          → hero portrait (first frame)
 *  - target: 'creep_faction' → falls back to nothing for now
 *
 * Falls back to a faction-tinted placeholder square while the data URL
 * isn't ready yet (e.g. Store opened before the preheat finished, or
 * hero skin palette-swap still generating). Re-renders as icons become
 * available via the loader-complete tick.
 */
import { useEffect, useState } from 'preact/hooks';
import { SkinDef } from '../../systems/monetization';
import { FACTIONS, FactionId } from '../../data/Factions';
import { getTowerIconUrl, getHeroIconUrl, getCachedAspectRatio } from '../game/TowerIconRenderer';
import { UIBridge } from '../UIBridge';

interface Props {
  skin: SkinDef;
  /** Pixel size of each individual sprite (default 32). */
  size?: number;
  /** Override the gap between sprites in a faction row (default 2). */
  gap?: number;
}

/** Bumps a counter when the Phaser loader signals that more textures are
 *  available, or when the preheat scheduler finishes warming an icon,
 *  so SkinPreview instances re-render and pick them up. */
function useTextureReadyTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    window.addEventListener('app-preload-progress', bump);
    window.addEventListener('app-preload-complete', bump);
    const game = UIBridge.getGame();
    const handlers: { scene: Phaser.Scene; fn: () => void }[] = [];
    if (game) {
      for (const s of game.scene.scenes) {
        s.load.on('complete', bump);
        handlers.push({ scene: s, fn: bump });
      }
    }
    return () => {
      window.removeEventListener('app-preload-progress', bump);
      window.removeEventListener('app-preload-complete', bump);
      for (const h of handlers) h.scene.load.off('complete', h.fn);
    };
  }, []);
  return tick;
}

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

interface PlaceholderProps {
  width: number;
  height: number;
  color: string;
}
function Placeholder({ width, height, color }: PlaceholderProps) {
  return (
    <div
      style={{
        width: `${width}px`, height: `${height}px`,
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        border: `1px solid ${color}66`,
        borderRadius: '3px',
        display: 'block',
      }}
    />
  );
}

function factionColor(fid?: string | null): string {
  if (!fid) return '#3a2a45';
  const fac = FACTIONS[fid as FactionId];
  return fac ? hexColor(fac.primaryColor) : '#3a2a45';
}

export function SkinPreview({ skin, size = 32, gap = 2 }: Props) {
  useTextureReadyTick();

  if (skin.target === 'tower_faction' && skin.faction) {
    const faction = FACTIONS[skin.faction as FactionId];
    if (!faction) return null;
    const color = hexColor(faction.primaryColor);
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: `${gap}px`, padding: '4px 0',
      }}>
        {faction.towerIds.map(towerId => {
          const url = getTowerIconUrl(towerId, skin.assetSuffix);
          if (!url) return <Placeholder key={towerId} width={size} height={size} color={color} />;
          return (
            <img key={towerId} src={url} width={size} height={size}
              style={{ imageRendering: 'pixelated' as any, display: 'block' }} />
          );
        })}
      </div>
    );
  }

  if (skin.target === 'tower' && skin.towerId) {
    const url = getTowerIconUrl(skin.towerId, skin.assetSuffix);
    const w = size * 1.5;
    if (!url) {
      return (
        <div style={{ margin: '4px auto', width: `${w}px` }}>
          <Placeholder width={w} height={w} color={factionColor(skin.faction)} />
        </div>
      );
    }
    return (
      <img src={url} width={w} height={w}
        style={{ imageRendering: 'pixelated' as any, display: 'block', margin: '4px auto' }} />
    );
  }

  if (skin.target === 'hero' && skin.heroId) {
    const url = getHeroIconUrl(skin.heroId, skin.assetSuffix);
    const heroW = size * 1.5;
    const cacheKey = `hero|${skin.heroId}|${skin.assetSuffix ?? ''}`;
    const aspect = getCachedAspectRatio(cacheKey) ?? 0.5;
    const heroH = Math.round(heroW / aspect);
    if (!url) {
      return (
        <div style={{ margin: '4px auto', width: `${heroW}px` }}>
          <Placeholder width={heroW} height={heroH} color={factionColor(skin.faction)} />
        </div>
      );
    }
    return (
      <img src={url} width={heroW} height={heroH}
        style={{ imageRendering: 'pixelated' as any, display: 'block', margin: '4px auto' }} />
    );
  }

  return null;
}
