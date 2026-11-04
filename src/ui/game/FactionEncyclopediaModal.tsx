/**
 * FactionEncyclopediaModal — in-game encyclopedia overlay.
 * Shows the current faction's towers with descriptions, stats, and traits.
 * Opened from the tower bar (?) button or the pause menu.
 * Mobile-friendly: large touch targets, scrollable.
 *
 * Rendered via portal to document.body to escape any stacking contexts.
 */
import { useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { FACTIONS, FactionId } from '../../data/Factions';
import { TOWER_TYPES, getTowerType } from '../../data/TowerTypes';
import { getTowerIconUrl } from './TowerIconRenderer';
import { TILE_SIZE } from '../../config';

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function traitLabel(trait: { id: string; [k: string]: unknown }): string | null {
  switch (trait.id) {
    case 'direct_damage': return null;
    case 'splash_damage': return `Splash ${((trait.radius as number ?? 0) / TILE_SIZE).toFixed(1)} tiles`;
    case 'slow_on_hit': return `Slow ${Math.round((1 - (trait.factor as number ?? 1)) * 100)}%`;
    case 'stun_on_hit': return `Stun ${((trait.duration as number ?? 1000) / 1000).toFixed(1)}s`;
    case 'damage_amp_on_hit': return `Vulnerable +${Math.round((trait.ampAmount as number ?? 0.15) * 100)}%`;
    case 'root_on_hit': return `Root ${Math.round((trait.chance as number ?? 0.2) * 100)}%`;
    case 'crit_chance': return `${Math.round((trait.chance as number ?? 0.25) * 100)}% Crit`;
    case 'burn_dot': return `Burn ${trait.dps}dps`;
    case 'poison_dot': return 'Poison';
    case 'chain_damage': return `Chain x${(trait.chainCount as number ?? 1) + 1}`;
    case 'pierce_delivery': return 'Pierce';
    case 'teleport_delivery': return 'Teleport';
    case 'armor_shred_on_hit': return 'Armor Shred';
    case 'gold_on_hit': return `+${trait.amount}g/hit`;
    case 'gold_per_kill_range': return `+${trait.goldPerKill ?? 2}g/kill in range`;
    case 'mobile_unit': return 'Mobile';
    case 'true_damage': return 'True Damage (ignores armor)';
    case 'armor_scaling_damage': return 'Damage scales with target armor';
    case 'ramp_up': return `Ramp x${trait.maxStacks ?? 5}`;
    case 'adjacency_buff': return 'Adjacency Buff';
    case 'tower_aura_damage': return 'Aura Damage';
    case 'faction_speed_aura': return `+${Math.round((trait.ratePercent as number ?? 0.2) * 100)}% AS Aura`;
    case 'firewall_link': return 'Link Beam';
    case 'barbed_wire': return 'Barbed Wire';
    case 'commander_aura': return 'Commander Aura';
    case 'life_on_kill': return `${Math.round((trait.chance as number ?? 0.05) * 100)}% Life on Kill`;
    case 'life_execute': {
      const minProc = Math.round(((trait.baseChance as number) ?? 0.05) * 100);
      const maxProc = Math.round(((trait.maxChance as number) ?? 0.20) * 100);
      const cost = trait.cost ?? 10;
      const threshold = trait.threshold ?? 50;
      return `Execute ${minProc}-${maxProc}% (spends ${cost} lives, needs ${threshold}+)`;
    }
    case 'life_scaling': {
      const dpl = trait.damagePerLife as number ?? 0.5;
      const frpl = trait.fireRatePerLife as number ?? 5;
      return `+${dpl} DMG/life, -${frpl}ms/life`;
    }
    case 'acolyte_blessing_aura': return `Bless: ${Math.round(((trait.blessingChance as number) ?? 0.075) * 100)}% life for acolytes in range`;
    case 'mute_mage_aura': return 'Silences mages in range';
    case 'bonus_vs_boss': return `+${Math.round((trait.bonus as number ?? 0.5) * 100)}% vs Boss`;
    case 'leak_absorb': return `Absorbs ${trait.maxCharges ?? 1} leak(s)`;
    default: return (trait.id as string).replace(/_/g, ' ');
  }
}

export function FactionEncyclopediaModal({
  factionId,
  towerIds,
  onClose
}: {
  factionId?: FactionId;
  towerIds?: string[];
  onClose: () => void
}) {
  const faction = factionId ? FACTIONS[factionId] : null;
  const towers = useMemo(() => {
    // Custom tower list (chaos mode) takes precedence
    if (towerIds && towerIds.length > 0) {
      return towerIds
        .map(tId => getTowerType(tId))
        .filter(Boolean);
    }
    if (!faction) return [];
    return faction.towerIds
      .map(tId => getTowerType(tId))
      .filter(Boolean);
  }, [faction, towerIds]);

  // For chaos mode (custom list), use generic styling
  const isChaosMode = !factionId && towerIds && towerIds.length > 0;
  const primaryColor = faction ? hexColor(faction.primaryColor) : '#aa66ff';
  const title = faction ? faction.name : 'Chaos Towers';
  const description = faction
    ? faction.description
    : 'Rotating towers from all factions — this is what\'s available right now.';

  if (!faction && !isChaosMode) return null;

  const modal = (
    <div
      class="encyclopedia-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', pointerEvents: 'auto',
      }}
    >
      <div
        class="encyclopedia-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e', borderRadius: '12px',
          border: `2px solid ${primaryColor}`,
          maxWidth: '600px', width: '100%',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px', borderBottom: '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: primaryColor + '22',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: primaryColor }}>
              {title}
            </div>
            <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>
              {description}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#333', color: '#fff', border: 'none',
              borderRadius: '8px', width: '44px', height: '44px',
              fontSize: '20px', cursor: 'pointer', flexShrink: 0,
            }}
            aria-label="Close encyclopedia"
          >
            ✕
          </button>
        </div>

        {/* Tower list - scrollable */}
        <div style={{ overflowY: 'auto', padding: '12px', flex: 1 }}>
          {towers.map(t => {
            const url = getTowerIconUrl(t.id);
            const traits = t.traits
              .map(traitLabel)
              .filter(Boolean) as string[];
            return (
              <div key={t.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid #333', borderRadius: '8px',
                padding: '12px', marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {url && (
                    <img
                      src={url} width={48} height={48}
                      style={{ imageRendering: 'pixelated' as any, flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                      {t.name}
                      <span style={{ color: '#ffdd44', marginLeft: '8px', fontSize: '14px' }}>
                        {t.cost}g
                      </span>
                      {t.ultimate && (
                        <span style={{
                          background: '#ffaa00', color: '#000',
                          fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                          marginLeft: '8px', fontWeight: 'bold',
                        }}>
                          ULTIMATE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#ccc', marginTop: '4px' }}>
                      {t.description}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', gap: '12px', fontSize: '12px', color: '#999',
                  marginBottom: traits.length > 0 ? '8px' : 0,
                }}>
                  <span>DMG <b style={{ color: '#fff' }}>{t.damage}</b></span>
                  <span>RNG <b style={{ color: '#fff' }}>{t.range}</b></span>
                  <span>SPD <b style={{ color: '#fff' }}>{t.fireRate}ms</b></span>
                  <span style={{ textTransform: 'capitalize' }}>{t.damageType}</span>
                </div>

                {traits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {traits.map((label, i) => (
                      <span key={i} style={{
                        background: primaryColor + '33',
                        border: `1px solid ${primaryColor}66`,
                        color: '#fff', fontSize: '12px',
                        padding: '4px 8px', borderRadius: '12px',
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {t.upgrades.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    <div style={{ marginBottom: '4px', color: '#aaa' }}>Upgrades:</div>
                    {t.upgrades.map((u: any, ui: number) => (
                      <div key={ui} style={{ marginLeft: '8px', marginBottom: '2px' }}>
                        <span style={{ color: '#ffdd44' }}>Lv{u.level} ({u.cost}g):</span>
                        {' '}DMG <b style={{ color: '#fff' }}>{u.damage}</b>
                        {' '}RNG <b style={{ color: '#fff' }}>{u.range}</b>
                        {' '}SPD <b style={{ color: '#fff' }}>{u.fireRate}ms</b>
                        {u.transformsTo && (
                          <span style={{ color: '#ff88ff' }}> → {u.transformsTo}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Portal to document.body to escape stacking contexts
  return createPortal(modal, document.body);
}
