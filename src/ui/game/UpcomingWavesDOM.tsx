/**
 * UpcomingWaves — DOM panel showing next 3 waves.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function UpcomingWavesDOM() {
  const currentWave = useGameUISelector(s => s.currentWave);
  const waves = useGameUISelector(s => s.upcomingWaves);
  const autoPlay = useGameUISelector(s => s.autoPlay);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <button
          style={{
            fontSize: '12px', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer',
            fontFamily: 'inherit', border: '1px solid',
            background: autoPlay ? 'rgba(45,155,138,0.15)' : 'rgba(42,32,48,0.5)',
            color: autoPlay ? 'var(--jewel-teal)' : 'var(--text-muted)',
            borderColor: autoPlay ? 'rgba(45,155,138,0.3)' : 'var(--border-subtle)',
          }}
          onClick={() => GameUIStore.requestToggleAutoPlay()}
        >
          {autoPlay ? 'AUTO ON' : 'AUTO OFF'}
        </button>
      </div>

      {waves.length === 0 ? (
        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>No more waves</div>
      ) : (
        waves.map((w, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 6px', marginBottom: '3px', borderRadius: '4px',
            background: i === 0 ? 'rgba(232,183,109,0.08)' : 'transparent',
            borderLeft: i === 0 ? '2px solid var(--gold)' : '2px solid transparent',
          }}>
            <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '14px', color: i === 0 ? 'var(--gold)' : 'var(--text-dim)', minWidth: '42px' }}>
              {w.label}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
              {w.creepTypes}
            </span>
            <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '13px', color: 'var(--text-muted)' }}>x{w.count}</span>
            {w.isBoss && (
              <span style={{ fontSize: '8px', color: 'var(--jewel-red)', background: 'rgba(197,61,74,0.15)', padding: '1px 4px', borderRadius: '2px' }}>
                BOSS
              </span>
            )}
          </div>
        ))
      )}
    </>
  );
}
