/**
 * EssenceContent — Battle mode dual economy (Gold + Essence).
 * Shows essence counter, generator purchases, essence sends, owned generators.
 * Uses shared .econ-* CSS classes for consistent sizing with Frontier/Sends panels.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function EssenceContentDOM() {
  const essence = useGameUISelector(s => s.essence);
  const gold = useGameUISelector(s => s.gold);

  if (!essence) return <div class="econ-item-desc">Essence not available</div>;

  return (
    <>
      {/* Essence counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '4px 6px', background: 'rgba(74,184,184,0.08)', borderRadius: '4px' }}>
        <span class="econ-item-cost" style={{ fontSize: '16px', color: 'var(--faction-cypherpunk)' }}>Essence: {Math.floor(essence.essence)}</span>
        <span class="econ-item-cost" style={{ color: 'var(--faction-cypherpunk)' }}>{essence.rate.toFixed(1)}/s</span>
      </div>

      {/* Generators (buy with Gold) */}
      <div class="econ-section-label" style={{ color: 'var(--gold)' }}>GENERATORS (Gold)</div>
      {essence.generators.map(gen => {
        const canAfford = gold >= gen.cost;
        return (
          <div key={gen.id}
            class="econ-item-row"
            onClick={() => canAfford && GameUIStore.requestBuyEssenceGenerator(gen.id)}
            style={{
              cursor: canAfford ? 'pointer' : 'default',
              background: canAfford ? 'rgba(74,184,184,0.06)' : 'transparent', opacity: canAfford ? 1 : 0.5,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span class="econ-item-name">{gen.name}</span>
              <span>
                <span class="econ-item-cost" style={{ color: canAfford ? 'var(--gold)' : 'var(--text-dim)' }}>{gen.cost}g</span>
                <span class="econ-item-cost" style={{ color: 'var(--faction-cypherpunk)', marginLeft: '6px' }}>+{gen.essencePerSec}/s</span>
              </span>
            </div>
            <div class="econ-item-desc">{gen.description}</div>
          </div>
        );
      })}

      {/* Sends (cost Essence) */}
      <div class="econ-section-label" style={{ color: 'var(--faction-harmonic)', marginTop: '8px' }}>SENDS (Essence)</div>
      {essence.sends.map(send => {
        const canAfford = essence.essence >= send.essenceCost;
        return (
          <div key={send.id}
            class="econ-item-row"
            onClick={() => canAfford && GameUIStore.requestEssenceSend(send.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: canAfford ? 'pointer' : 'default',
              opacity: canAfford ? 1 : 0.5,
            }}>
            {send.hotkey && (
              <span style={{ fontSize: '12px', color: 'var(--faction-harmonic)', background: 'rgba(212,123,84,0.12)', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>{send.hotkey}</span>
            )}
            <span class="econ-item-name" style={{ flex: 1 }}>{send.name}</span>
            <span class="econ-item-cost" style={{ color: 'var(--faction-cypherpunk)' }}>{send.essenceCost}e</span>
            <span class="econ-item-cost" style={{ color: 'var(--jewel-teal)' }}>+{send.incomeReward}g/w</span>
          </div>
        );
      })}

      {/* Owned generators */}
      {essence.owned.length > 0 && (
        <>
          <div class="econ-section-label" style={{ color: 'var(--jewel-teal)', marginTop: '8px' }}>Owned</div>
          {essence.owned.map((g, i) => (
            <div key={i} class="econ-item-cost" style={{ fontSize: '14px', color: 'var(--faction-nature)', padding: '2px 6px' }}>
              {g.name} x{g.count} (+{g.rate.toFixed(1)}/s)
            </div>
          ))}
        </>
      )}
    </>
  );
}
