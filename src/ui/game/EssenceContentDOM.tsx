/**
 * EssenceContent — Battle mode dual economy (Gold + Essence).
 * Shows essence counter, generator purchases, essence sends, owned generators.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function EssenceContentDOM() {
  const essence = useGameUISelector(s => s.essence);
  const gold = useGameUISelector(s => s.gold);

  if (!essence) return <div style={{ fontSize: '10px', color: '#555' }}>Essence not available</div>;

  return (
    <>
      {/* Essence counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '4px 6px', background: 'rgba(68,221,255,0.08)', borderRadius: '4px' }}>
        <span style={{ fontSize: '13px', color: '#44ddff', fontWeight: 'bold' }}>Essence: {Math.floor(essence.essence)}</span>
        <span style={{ fontSize: '10px', color: '#44aacc' }}>{essence.rate.toFixed(1)}/s</span>
      </div>

      {/* Generators (buy with Gold) */}
      <div style={{ fontSize: '9px', color: '#ffaa44', letterSpacing: '1px', marginBottom: '4px' }}>GENERATORS (Gold)</div>
      {essence.generators.map(gen => {
        const canAfford = gold >= gen.cost;
        return (
          <div key={gen.id}
            onClick={() => canAfford && GameUIStore.requestBuyEssenceGenerator(gen.id)}
            style={{
              padding: '3px 6px', marginBottom: '2px', borderRadius: '4px', cursor: canAfford ? 'pointer' : 'default',
              background: canAfford ? 'rgba(68,221,255,0.06)' : 'transparent', opacity: canAfford ? 1 : 0.5,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: '#ccc' }}>{gen.name}</span>
              <span>
                <span style={{ color: canAfford ? '#ffaa44' : '#664422' }}>{gen.cost}g</span>
                <span style={{ color: '#44ddff', marginLeft: '6px' }}>+{gen.essencePerSec}/s</span>
              </span>
            </div>
            <div style={{ fontSize: '8px', color: '#666' }}>{gen.description}</div>
          </div>
        );
      })}

      {/* Sends (cost Essence) */}
      <div style={{ fontSize: '9px', color: '#ff8844', letterSpacing: '1px', marginTop: '8px', marginBottom: '4px' }}>SENDS (Essence)</div>
      {essence.sends.map(send => {
        const canAfford = essence.essence >= send.essenceCost;
        return (
          <div key={send.id}
            onClick={() => canAfford && GameUIStore.requestEssenceSend(send.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '3px 6px', marginBottom: '2px', borderRadius: '4px', cursor: canAfford ? 'pointer' : 'default',
              opacity: canAfford ? 1 : 0.5,
            }}>
            {send.hotkey && (
              <span style={{ fontSize: '9px', color: '#ff8844', background: 'rgba(255,136,68,0.12)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>{send.hotkey}</span>
            )}
            <span style={{ fontSize: '10px', color: '#ccc', flex: 1 }}>{send.name}</span>
            <span style={{ fontSize: '9px', color: '#44ddff' }}>{send.essenceCost}e</span>
            <span style={{ fontSize: '9px', color: '#88ff88' }}>+{send.incomeReward}g/w</span>
          </div>
        );
      })}

      {/* Owned generators */}
      {essence.owned.length > 0 && (
        <>
          <div style={{ fontSize: '9px', color: '#88ff88', marginTop: '8px', marginBottom: '4px' }}>Owned</div>
          {essence.owned.map((g, i) => (
            <div key={i} style={{ fontSize: '10px', color: '#aaffaa', padding: '2px 6px' }}>
              {g.name} ×{g.count} (+{g.rate.toFixed(1)}/s)
            </div>
          ))}
        </>
      )}
    </>
  );
}
