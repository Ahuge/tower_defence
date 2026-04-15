/**
 * TowerDockDOM — tower selection bar rendered as DOM.
 * Shows tower icons with costs, hotkeys, tooltips, and skin dock styles.
 */
import { useState, useMemo } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { getTowerType } from '../../data/TowerTypes';
import { getTowerIconUrl } from './TowerIconRenderer';
import { TILE_SIZE } from '../../config';
import { getSkinDef, DockStyle } from '../../systems/monetization';
import { PlayerInventory } from '../../systems/monetization/PlayerInventory';
import { getTowerFaction } from '../../systems/SpriteManager';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

/** Get the DockStyle for a tower if it has an equipped skin */
function getDockStyle(towerId: string): DockStyle | null {
  const fid = getTowerFaction(towerId);
  if (!fid) return null;
  // Check per-tower skin first
  const perTower = PlayerInventory.getEquippedSkin(`tower:${towerId}`);
  if (perTower) { const def = getSkinDef(perTower); if (def?.dockStyle) return def.dockStyle; }
  // Faction-wide
  const faction = PlayerInventory.getEquippedSkin(`towerfaction:${fid}`);
  if (faction) { const def = getSkinDef(faction); if (def?.dockStyle) return def.dockStyle; }
  return null;
}

export function TowerDockDOM() {
  const { towerBar, gold } = useGameUI();
  const [tooltip, setTooltip] = useState<number | null>(null);

  if (towerBar.towers.length === 0) return null;

  return (
    <div class="tower-dock">
      {towerBar.towers.map((tower, i) => {
        const selected = towerBar.selectedIndex === i;
        const canAfford = gold >= tower.cost;
        const dock = getDockStyle(tower.id);
        const t = getTowerType(tower.id);

        return (
          <div key={tower.id} class="dock-slot-wrapper"
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
          >
            <div
              class={`dock-slot ${selected ? 'dock-selected' : ''} ${!canAfford ? 'dock-unaffordable' : ''}`}
              style={{
                borderColor: selected ? (dock?.borderColor ?? '#fff') : (dock?.borderColor ?? hexColor(tower.color) + '66'),
                background: dock?.bgTint ?? (selected ? hexColor(tower.color) + '33' : hexColor(tower.color) + '15'),
                boxShadow: dock?.glowColor ? `0 0 8px ${dock.glowColor}` : undefined,
              }}
              onClick={() => GameUIStore.requestSelectDockTower(selected ? -1 : i)}
            >
              {/* Hotkey badge */}
              <span class="dock-hotkey">{tower.hotkey}</span>

              {/* Tower icon or name fallback */}
              <TowerIcon towerId={tower.id} size={36} />

              {/* Cost */}
              <div class="dock-cost" style={{ color: canAfford ? '#ffdd44' : '#664422' }}>{tower.cost}g</div>
            </div>

            {/* Tooltip */}
            {tooltip === i && t && (
              <div class="dock-tooltip">
                <div class="dock-tooltip-name">{t.name} ({t.cost}g)</div>
                <div class="dock-tooltip-desc">{t.description}</div>
                <div class="dock-tooltip-stats">
                  DMG: {t.damage} | RNG: {t.range} | SPD: {t.fireRate}ms | {t.damageType}
                </div>
                {t.traits.filter(tr => tr.id !== 'direct_damage').length > 0 && (
                  <div class="dock-tooltip-traits">
                    {t.traits.filter(tr => tr.id !== 'direct_damage').map(tr => {
                      switch (tr.id) {
                        case 'splash_damage': return `Splash (${((tr.radius ?? 0) / TILE_SIZE).toFixed(1)} tiles)`;
                        case 'chain_damage': return `Chain (${(tr.chainCount ?? 2) + 1} targets)`;
                        case 'slow_on_hit': return `Slow ${Math.round((1 - (tr.factor ?? 1)) * 100)}%`;
                        case 'gold_on_hit': return `+${tr.amount}g/hit`;
                        case 'crit_chance': return `${Math.round((tr.chance ?? 0.25) * 100)}% crit`;
                        case 'burn_dot': return `Burn ${tr.dps}dps`;
                        case 'poison_dot': return `Poison`;
                        case 'pierce_delivery': return 'Pierce';
                        case 'armor_shred_on_hit': return 'Armor shred';
                        case 'adjacency_buff': return 'Adj. aura';
                        case 'teleport_delivery': return 'Teleport';
                        default: return tr.id.replace(/_/g, ' ');
                      }
                    }).join(' · ')}
                  </div>
                )}
                {t.upgrades.length > 0 && (
                  <div class="dock-tooltip-upgrades">{t.upgrades.length} upgrade{t.upgrades.length > 1 ? 's' : ''}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Renders a tower sprite as an <img> from Phaser texture, or a text fallback */
function TowerIcon({ towerId, size }: { towerId: string; size: number }) {
  const url = useMemo(() => getTowerIconUrl(towerId), [towerId]);
  if (url) {
    return <img src={url} width={size} height={size} style={{ imageRendering: 'pixelated' as any }} />;
  }
  // Text fallback
  const name = getTowerType(towerId)?.name ?? towerId;
  return <div class="dock-name">{name.length > 6 ? name.slice(0, 5) + '..' : name}</div>;
}
