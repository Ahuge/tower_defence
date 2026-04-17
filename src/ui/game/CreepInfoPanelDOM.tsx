/**
 * CreepInfoPanelDOM — DOM/Preact creep inspector.
 *
 * Subscribes to `selectedCreep` in GameUIStore. GameScene writes a
 * fresh snapshot per frame via updateSelectedCreep; the store skips
 * notify() when the snapshot is unchanged, so we only re-render when
 * HP/armor/effects actually move.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { CreepEffect } from '../GameUIStore';

/** Tag color by effect kind — reuses the DoT/CC palette. */
const EFFECT_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  slow:        { fg: '#88ccff', bg: 'rgba(40, 80, 120, 0.35)', border: 'rgba(100, 180, 255, 0.25)' },
  burn:        { fg: '#ff9966', bg: 'rgba(100, 50, 20, 0.35)', border: 'rgba(255, 140, 80, 0.25)' },
  poison:      { fg: '#88ff88', bg: 'rgba(40, 80, 40, 0.35)', border: 'rgba(120, 220, 120, 0.25)' },
  root:        { fg: '#ccaa88', bg: 'rgba(80, 60, 40, 0.4)',  border: 'rgba(180, 140, 80, 0.25)' },
  armor_shred: { fg: '#ff8888', bg: 'rgba(90, 30, 30, 0.35)', border: 'rgba(255, 100, 100, 0.25)' },
  damage_amp:  { fg: '#ffaa44', bg: 'rgba(90, 60, 20, 0.35)', border: 'rgba(255, 180, 80, 0.3)' },
};

function effectStyle(kind: string): { color: string; background: string; border: string } {
  const c = EFFECT_COLORS[kind] ?? { fg: '#bbb', bg: 'rgba(50, 50, 60, 0.4)', border: 'rgba(120, 120, 140, 0.25)' };
  return { color: c.fg, background: c.bg, border: `1px solid ${c.border}` };
}

export function CreepInfoPanelDOM() {
  const creep = useGameUISelector(s => s.selectedCreep);
  if (!creep) return null;

  const hpPct = Math.max(0, Math.min(100, (creep.hp / Math.max(1, creep.maxHp)) * 100));
  const armorShredded = creep.armor !== creep.baseArmor;
  const armorText = armorShredded ? `${creep.armor} (base ${creep.baseArmor})` : creep.armor;
  const speedText = Math.round(creep.speed) !== Math.round(creep.baseSpeed)
    ? `${Math.round(creep.speed)} / ${Math.round(creep.baseSpeed)}`
    : String(Math.round(creep.speed));

  return (
    <>
      {/* HP bar on top — most glanceable stat */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          height: '6px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${hpPct}%`,
            background: hpPct > 50 ? 'linear-gradient(90deg, #cc3344, #e85555)'
              : hpPct > 25 ? 'linear-gradient(90deg, #cc7744, #e89955)'
              : 'linear-gradient(90deg, #883344, #aa4455)',
            transition: 'width 120ms ease-out',
          }} />
        </div>
        <div style={{
          marginTop: '4px',
          fontFamily: "'VT323', ui-monospace, monospace",
          fontSize: '13px',
          color: 'var(--text-secondary, #ccc)',
          letterSpacing: '0.5px',
          textAlign: 'center',
        }}>
          {creep.hp} / {creep.maxHp} ({Math.round(hpPct)}%)
        </div>
      </div>

      <div class="stat-grid">
        <StatCell label="ARMOR" value={armorText} color={armorShredded ? '#ff8888' : undefined} />
        <StatCell label="SPD" value={`${speedText} px/s`} color={creep.speed < creep.baseSpeed ? '#88ccff' : undefined} />
      </div>

      {creep.effects.length > 0 && (
        <div class="buff-row">
          {creep.effects.map((e, i) => <EffectTag key={i} effect={e} />)}
        </div>
      )}

      {creep.traits.length > 0 && (
        <div class="trait-row">
          {creep.traits.map((t, i) => <span key={i} class="trait-tag">{t}</span>)}
        </div>
      )}
    </>
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

function EffectTag({ effect }: { effect: CreepEffect }) {
  const style = effectStyle(effect.kind);
  return (
    <span class="buff-tag" style={style}>
      {effect.label} <span style={{ opacity: 0.7 }}>({effect.durationS.toFixed(1)}s)</span>
    </span>
  );
}
