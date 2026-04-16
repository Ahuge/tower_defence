/**
 * SendPanel — DOM panel for sending creeps (economy decisions).
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function SendPanelDOM() {
  const options = useGameUISelector(s => s.sendOptions);
  const gold = useGameUISelector(s => s.gold);

  if (options.length === 0) return null;

  return (
    <>
      {options.map(opt => {
        const canAfford = !opt.locked && gold >= opt.cost;
        return (
          <div
            key={opt.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 6px', marginBottom: '2px', borderRadius: '4px',
              cursor: opt.locked ? 'default' : 'pointer',
              opacity: opt.locked ? 0.4 : canAfford ? 1 : 0.6,
              background: canAfford ? 'rgba(212,123,84,0.06)' : 'transparent',
            }}
            onClick={() => !opt.locked && canAfford && GameUIStore.requestSend(opt.id)}
          >
            {opt.hotkey && (
              <span style={{
                fontSize: '9px', color: opt.locked ? 'var(--text-dim)' : 'var(--faction-harmonic)',
                background: 'rgba(212,123,84,0.12)', padding: '1px 4px',
                borderRadius: '2px', fontWeight: 'bold', minWidth: '16px', textAlign: 'center',
              }}>
                {opt.hotkey}
              </span>
            )}
            <span style={{ fontSize: '10px', color: opt.locked ? 'var(--text-dim)' : 'var(--text-primary)', flex: 1 }}>
              {opt.locked ? `${opt.name} — wave ${opt.unlockWave}` : opt.name}
            </span>
            {!opt.locked && (
              <>
                <span style={{ fontSize: '9px', color: canAfford ? 'var(--gold)' : 'var(--text-dim)' }}>{opt.cost}g</span>
                <span style={{ fontSize: '9px', color: 'var(--jewel-teal)' }}>+{opt.income}/w</span>
                {opt.tier >= 2 && (
                  <span style={{ fontSize: '8px', color: 'var(--jewel-violet)', background: 'rgba(139,107,199,0.15)', padding: '0 3px', borderRadius: '2px' }}>T{opt.tier}</span>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
