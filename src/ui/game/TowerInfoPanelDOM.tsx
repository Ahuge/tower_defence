/**
 * TowerInfoPanel — DOM/Preact version of the tower info sidebar panel.
 * Reads from GameUIStore, calls back via store callbacks.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore, TowerStats } from '../GameUIStore';

export function TowerInfoPanelDOM() {
  const tower = useGameUISelector(s => s.selectedTower);
  const gold = useGameUISelector(s => s.gold);
  if (!tower) return null;

  return (
    <>

      {/* HP bar — only rendered for destructible targets (M10 CPU defenders +
          PRD 06 boss structures). Player towers leave hp/maxHp undefined and
          this row hides. */}
      {tower.hp !== undefined && tower.maxHp !== undefined && (
        <div class="hp-row" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: '#aaa' }}>HP</span>
            <span style={{ color: tower.hp / tower.maxHp > 0.5 ? '#88ff88' : tower.hp / tower.maxHp > 0.2 ? '#ffaa44' : '#ff4422' }}>
              {tower.hp} / {tower.maxHp}
            </span>
          </div>
          <div style={{ height: 6, background: '#110022', border: '1px solid #444', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (tower.hp / tower.maxHp) * 100))}%`,
                height: '100%',
                background: tower.hp / tower.maxHp > 0.5 ? '#88ff88' : tower.hp / tower.maxHp > 0.2 ? '#ffaa44' : '#ff4422',
                transition: 'width 120ms linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats — shows effective (post-aura) values; base shown underneath
          as a strikethrough hint when a buff has shifted the number. */}
      <div class="stat-grid">
        <StatCell
          label="DMG"
          value={String(tower.effectiveDamage)}
          base={tower.effectiveDamage !== tower.damage ? String(tower.damage) : undefined}
          buffed={tower.effectiveDamage > tower.damage}
        />
        <StatCell
          label="RNG"
          value={tower.effectiveRange.toFixed(1)}
          base={tower.effectiveRange !== tower.range ? tower.range.toFixed(1) : undefined}
          buffed={tower.effectiveRange > tower.range}
        />
        <StatCell
          label="SPD"
          value={`${tower.effectiveFireRate}ms`}
          base={tower.effectiveFireRate !== tower.fireRate ? `${tower.fireRate}ms` : undefined}
          buffed={tower.effectiveFireRate < tower.fireRate}
        />
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

      {/* Upgrade preview — shown per option when branching, or as a
          single preview for linear towers. The branch label makes
          the fork visually obvious when there are ≥2 options. */}
      {tower.upgradeOptions.length > 0 && (
        <div class="upgrade-preview">
          {tower.upgradeOptions.map((opt) => (
            <div key={opt.branchId ?? 'default'} class={`upgrade-row ${opt.branchId ? 'upgrade-branch' : ''}`}>
              <div class="upgrade-label">{opt.label}{opt.resolvedName !== tower.name ? ` → ${opt.resolvedName}` : ''}</div>
              <div class="upgrade-deltas">
                {opt.dmg && <span class="delta-positive">{opt.dmg}</span>}
                {opt.rng && <span class="delta-positive">{opt.rng}</span>}
                {opt.spd && <span class="delta-neutral">{opt.spd}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions — hidden for towers owned by another player in Circle Co-op */}
      {tower.owned && (
        <div class="panel-actions">
          {tower.upgradeOptions.map((opt) => {
            const canAfford = gold >= opt.cost;
            return (
              <button
                key={opt.branchId ?? 'default'}
                class={`action-btn action-upgrade${opt.branchId ? ' action-upgrade-branch' : ''}${canAfford ? '' : ' action-disabled'}`}
                disabled={!canAfford}
                onClick={() => { if (canAfford) GameUIStore.requestUpgrade(tower._tower, opt.branchId); }}
              >
                {opt.label} ({opt.cost}g)
              </button>
            );
          })}
          <button
            class="action-btn action-sell"
            onClick={() => GameUIStore.requestSell(tower._tower)}
          >
            Sell ({tower.sellValue}g)
          </button>
        </div>
      )}
    </>
  );
}

function StatCell({ label, value, color, base, buffed }: { label: string; value: string; color?: string; base?: string; buffed?: boolean }) {
  const valueColor = color ?? (buffed ? '#88ff88' : undefined);
  return (
    <div class="stat-cell">
      <div class="stat-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {base && <div class="stat-base">was {base}</div>}
      <div class="stat-label">{label}</div>
    </div>
  );
}
