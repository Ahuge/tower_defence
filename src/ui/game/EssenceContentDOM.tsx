/**
 * EssenceContent — Battle mode dual economy (Gold + Essence).
 * Shows essence counter, generator purchases, essence sends, owned generators.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function EssenceContentDOM() {
  const essence = useGameUISelector(s => s.essence);
  const gold = useGameUISelector(s => s.gold);

  if (!essence) return <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Essence not available</div>;

  return (
    <>
      {/* Essence counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '4px 6px', background: 'rgba(74,184,184,0.08)', borderRadius: '4px' }}>
        <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '15px', color: 'var(--faction-cypherpunk)', fontWeight: 'bold' }}>Essence: {Math.floor(essence.essence)}</span>
        <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '12px', color: 'var(--faction-cypherpunk)' }}>{essence.rate.toFixed(1)}/s</span>
      </div>

      {/* Generators (buy with Gold) */}
      <div style={{ fontSize: '9px', color: 'var(--gold)', letterSpacing: '1px', marginBottom: '4px' }}>GENERATORS (Gold)</div>
      {essence.generators.map(gen => {
        const canAfford = gold >= gen.cost;
        return (
          <div key={gen.id}
            onClick={() => canAfford && GameUIStore.requestBuyEssenceGenerator(gen.id)}
            style={{
              padding: '3px 6px', marginBottom: '2px', borderRadius: '4px', cursor: canAfford ? 'pointer' : 'default',
              background: canAfford ? 'rgba(74,184,184,0.06)' : 'transparent', opacity: canAfford ? 1 : 0.5,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: 'var(--text-primary)' }}>{gen.name}</span>
              <span>
                <span style={{ color: canAfford ? 'var(--gold)' : 'var(--text-dim)' }}>{gen.cost}g</span>
                <span style={{ color: 'var(--faction-cypherpunk)', marginLeft: '6px' }}>+{gen.essencePerSec}/s</span>
              </span>
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{gen.description}</div>
          </div>
        );
      })}

      {/* Sends (cost Essence) */}
      <div style={{ fontSize: '9px', color: 'var(--faction-harmonic)', letterSpacing: '1px', marginTop: '8px', marginBottom: '4px' }}>SENDS (Essence)</div>
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
              <span style={{ fontSize: '9px', color: 'var(--faction-harmonic)', background: 'rgba(212,123,84,0.12)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>{send.hotkey}</span>
            )}
            <span style={{ fontSize: '10px', color: 'var(--text-primary)', flex: 1 }}>{send.name}</span>
            <span style={{ fontSize: '9px', color: 'var(--faction-cypherpunk)' }}>{send.essenceCost}e</span>
            <span style={{ fontSize: '9px', color: 'var(--jewel-teal)' }}>+{send.incomeReward}g/w</span>
          </div>
        );
      })}

      {/* Owned generators */}
      {essence.owned.length > 0 && (
        <>
          <div style={{ fontSize: '9px', color: 'var(--jewel-teal)', marginTop: '8px', marginBottom: '4px' }}>Owned</div>
          {essence.owned.map((g, i) => (
            <div key={i} style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '12px', color: 'var(--faction-nature)', padding: '2px 6px' }}>
              {g.name} x{g.count} (+{g.rate.toFixed(1)}/s)
            </div>
          ))}
        </>
      )}
    </>
  );
}
