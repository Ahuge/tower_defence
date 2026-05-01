/**
 * MissionPanelDOM — in-mission star objective tracker.
 *
 * Renders inside the sidebar (above the Waves panel) on campaign
 * mission runs. Shows the 2-3 star objectives with live met/unmet
 * state. Predicates evaluate against an "if I won this instant"
 * snapshot pushed by GameScene each frame, so the tracker ticks live
 * as the player's lives, sends-bought, leak count etc change.
 */
import { useGameUISelector } from '../hooks/useGameUI';

export function MissionPanelDOM() {
  const panel = useGameUISelector(s => s.missionPanel);
  if (!panel) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
      {panel.objectives.map((o, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '6px 10px',
          borderRadius: '4px',
          background: o.met ? 'rgba(255,170,68,0.10)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${o.met ? 'rgba(255,170,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
          fontSize: '12px',
          color: o.met ? 'var(--gold)' : 'var(--text-secondary)',
        }}>
          <span style={{
            fontFamily: "'Silkscreen', monospace",
            fontSize: '14px',
            width: '18px',
            textAlign: 'center',
          }}>{o.met ? '★' : '☆'}</span>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{o.label}</span>
        </div>
      ))}
      <div style={{
        marginTop: '6px',
        fontSize: '10px',
        color: 'var(--text-dim)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        Live tracker — predicates re-evaluate every frame as your run unfolds.
      </div>
    </div>
  );
}
