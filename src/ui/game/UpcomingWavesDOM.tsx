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
    <div class="game-panel" style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#ffaa44', letterSpacing: '1px' }}>UPCOMING WAVES</span>
        <button
          style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer',
            fontFamily: 'inherit', border: '1px solid',
            background: autoPlay ? 'rgba(68,255,68,0.15)' : 'rgba(40,40,60,0.5)',
            color: autoPlay ? '#44ff44' : '#888',
            borderColor: autoPlay ? 'rgba(68,255,68,0.3)' : '#333',
          }}
          onClick={() => GameUIStore.requestToggleAutoPlay()}
        >
          {autoPlay ? 'AUTO ON' : 'AUTO OFF'}
        </button>
      </div>

      {waves.length === 0 ? (
        <div style={{ fontSize: '10px', color: '#666' }}>No more waves</div>
      ) : (
        waves.map((w, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 6px', marginBottom: '3px', borderRadius: '4px',
            background: i === 0 ? 'rgba(255,170,68,0.08)' : 'transparent',
            borderLeft: i === 0 ? '2px solid #ffaa44' : '2px solid transparent',
          }}>
            <span style={{ fontSize: '10px', color: i === 0 ? '#ffaa44' : '#666', minWidth: '42px' }}>
              {w.label}
            </span>
            <span style={{ fontSize: '10px', color: '#ccc', flex: 1 }}>
              {w.creepTypes}
            </span>
            <span style={{ fontSize: '9px', color: '#888' }}>×{w.count}</span>
            {w.isBoss && (
              <span style={{ fontSize: '8px', color: '#ff4444', background: 'rgba(255,68,68,0.15)', padding: '1px 4px', borderRadius: '2px' }}>
                BOSS
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
