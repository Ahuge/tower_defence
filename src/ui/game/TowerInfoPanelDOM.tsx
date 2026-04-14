/**
 * TowerInfoPanel — DOM/Preact version of the tower info sidebar panel.
 * Reads from GameUIStore, calls back via store callbacks.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore, TowerStats } from '../GameUIStore';

export function TowerInfoPanelDOM() {
  const tower = useGameUISelector(s => s.selectedTower);
  if (!tower) return null;

  return (
    <div class="game-panel tower-info-panel" style={{ border: '2px solid #ff00ff' }}>
      <div style={{ fontSize: '8px', color: '#ff00ff', letterSpacing: '2px', marginBottom: '4px' }}>DOM PANEL (debug)</div>
      <div class="panel-header">
        <span class="tower-name">{tower.name}</span>
        <span class="tower-level">Lv{tower.level}</span>
        {tower.isUltimate && <span class="tower-ult-badge">ULT</span>}
        <button class="panel-close" onClick={() => GameUIStore.deselectTower()}>✕</button>
      </div>

      {/* Stats */}
      <div class="stat-grid">
        <StatCell label="DMG" value={String(tower.damage)} />
        <StatCell label="RNG" value={tower.range.toFixed(1)} />
        <StatCell label="SPD" value={`${tower.fireRate}ms`} />
        <StatCell label="TYPE" value={tower.damageType} color="#888" />
      </div>

      {/* Aura buffs */}
      {tower.auraBuffs.length > 0 && (
        <div class="buff-row">
          {tower.auraBuffs.map((buff, i) => (
            <span key={i} class="buff-tag">{buff}</span>
          ))}
        </div>
      )}

      {/* Traits */}
      {tower.traits.length > 0 && (
        <div class="trait-row">
          {tower.traits.map((trait, i) => (
            <span key={i} class="trait-tag">{trait}</span>
          ))}
        </div>
      )}

      {/* Upgrade preview */}
      {tower.upgradePreview && (
        <div class="upgrade-preview">
          <div class="upgrade-label">Lv{tower.level + 1} Preview</div>
          <div class="upgrade-deltas">
            {tower.upgradePreview.dmg && <span class="delta-positive">{tower.upgradePreview.dmg}</span>}
            {tower.upgradePreview.rng && <span class="delta-positive">{tower.upgradePreview.rng}</span>}
            {tower.upgradePreview.spd && <span class="delta-neutral">{tower.upgradePreview.spd}</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div class="panel-actions">
        {tower.canUpgrade && (
          <button
            class="action-btn action-upgrade"
            onClick={() => GameUIStore.requestUpgrade(tower._tower)}
          >
            Upgrade ({tower.upgradeCost}g)
          </button>
        )}
        <button
          class="action-btn action-sell"
          onClick={() => GameUIStore.requestSell(tower._tower)}
        >
          Sell ({tower.sellValue}g)
        </button>
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div class="stat-cell">
      <div class="stat-value" style={color ? { color } : undefined}>{value}</div>
      <div class="stat-label">{label}</div>
    </div>
  );
}
