/**
 * SkinPreview — renders a sprite preview for a SkinDef card.
 *
 *  - target: 'tower_faction' → row of all faction towers (and projectiles row)
 *  - target: 'tower'         → single tower icon
 *  - target: 'hero'          → hero portrait (first frame)
 *  - target: 'creep_faction' → falls back to nothing for now
 */
import { useEffect, useState } from 'preact/hooks';
import { SkinDef } from '../../systems/monetization';
import { FACTIONS, FactionId } from '../../data/Factions';
import { getTowerIconUrl, getHeroIconUrl } from '../game/TowerIconRenderer';
import { UIBridge } from '../UIBridge';

interface Props {
  skin: SkinDef;
  /** Pixel size of each individual sprite (default 32). */
  size?: number;
  /** Override the gap between sprites in a faction row (default 2). */
  gap?: number;
}

/** Bumps a counter when the Phaser loader signals that more textures are
 *  available, so SkinPreview instances re-render and pick them up. */
function useTextureReadyTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const game = UIBridge.getGame();
    if (!game) return;
    // The Boot scene finishes loading shortly after page load — listen on
    // its loader so we re-render the moment sprites are available.
    const onComplete = () => setTick(t => t + 1);
    const scenes = game.scene.scenes;
    const handlers: { scene: Phaser.Scene; fn: () => void }[] = [];
    for (const s of scenes) {
      s.load.on('complete', onComplete);
      handlers.push({ scene: s, fn: onComplete });
    }
    return () => { for (const h of handlers) h.scene.load.off('complete', h.fn); };
  }, []);
  return tick;
}

export function SkinPreview({ skin, size = 32, gap = 2 }: Props) {
  // Force a re-render when Phaser loads finish, so the first paint after
  // page load picks up textures the moment they're ready.
  useTextureReadyTick();
  if (skin.target === 'tower_faction' && skin.faction) {
    const faction = FACTIONS[skin.faction as FactionId];
    if (!faction) return null;
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: `${gap}px`, padding: '4px 0',
      }}>
        {faction.towerIds.map(towerId => {
          const url = getTowerIconUrl(towerId, skin.assetSuffix);
          if (!url) return null;
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
    if (!url) return null;
    return (
      <img src={url} width={size * 1.5} height={size * 1.5}
        style={{ imageRendering: 'pixelated' as any, display: 'block', margin: '4px auto' }} />
    );
  }

  if (skin.target === 'hero' && skin.heroId) {
    const url = getHeroIconUrl(skin.heroId, skin.assetSuffix);
    if (!url) return null;
    return (
      <img src={url} width={size * 1.5} height={size * 1.5}
        style={{ imageRendering: 'pixelated' as any, display: 'block', margin: '4px auto' }} />
    );
  }

  return null;
}
