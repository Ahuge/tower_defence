/**
 * SkinPreview — renders a sprite preview for a SkinDef card.
 *
 *  - target: 'tower_faction' → row of all faction towers (and projectiles row)
 *  - target: 'tower'         → single tower icon
 *  - target: 'hero'          → hero portrait (first frame)
 *  - target: 'creep_faction' → falls back to nothing for now
 */
import { SkinDef } from '../../systems/monetization';
import { FACTIONS, FactionId } from '../../data/Factions';
import { getTowerIconUrl, getHeroIconUrl } from '../game/TowerIconRenderer';

interface Props {
  skin: SkinDef;
  /** Pixel size of each individual sprite (default 32). */
  size?: number;
  /** Override the gap between sprites in a faction row (default 2). */
  gap?: number;
}

export function SkinPreview({ skin, size = 32, gap = 2 }: Props) {
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
