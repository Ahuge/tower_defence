/**
 * EconomyPanel — combined Sends + Frontier + Log with internal tabs.
 */
import { useState } from 'preact/hooks';
import { useGameUI, useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { SendPanelDOM } from './SendPanelDOM';
import { EventLogDOM } from './EventLogDOM';

type EconTab = 'sends' | 'frontier' | 'log';

export function EconomyPanelDOM() {
  const { sendOptions, eventLog } = useGameUI();
  const [tab, setTab] = useState<EconTab>('sends');

  const tabs: { id: EconTab; label: string; badge?: string; show: boolean }[] = [
    { id: 'sends', label: 'Sends', badge: sendOptions.filter(o => !o.locked).length + ' avail', show: sendOptions.length > 0 },
    { id: 'frontier', label: 'Frontier', show: true },
    { id: 'log', label: 'Log', badge: String(eventLog.length), show: eventLog.length > 0 },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <>
      {/* Internal tab bar */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
        {visibleTabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, fontFamily: 'inherit', fontSize: '9px', padding: '4px 0',
              background: tab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', borderBottom: tab === t.id ? '2px solid #ffaa44' : '2px solid transparent',
              color: tab === t.id ? '#ffaa44' : '#666', cursor: 'pointer',
              borderRadius: '2px 2px 0 0',
            }}>
            {t.label} {t.badge && <span style={{ color: '#555', marginLeft: '2px' }}>({t.badge})</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'sends' && <SendPanelDOM />}
      {tab === 'frontier' && <FrontierContent />}
      {tab === 'log' && <EventLogDOM />}
    </>
  );
}

function FrontierContent() {
  const frontier = useGameUISelector(s => s.frontier);
  const gold = useGameUISelector(s => s.gold);

  return (
    <>
      {/* Available to buy */}
      {frontier.available.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {frontier.available.map(b => {
            const canAfford = gold >= b.cost;
            return (
              <div key={b.id}
                onClick={() => canAfford && GameUIStore.requestFrontierPurchase(b.id)}
                style={{
                  padding: '4px 6px', marginBottom: '3px', borderRadius: '4px', cursor: canAfford ? 'pointer' : 'default',
                  background: canAfford ? 'rgba(255,170,68,0.06)' : 'transparent',
                  opacity: canAfford ? 1 : 0.5,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span style={{ color: '#ccc' }}>{b.name}</span>
                  <span style={{ color: canAfford ? '#ffaa44' : '#664422' }}>{b.cost}g</span>
                </div>
                <div style={{ fontSize: '9px', color: '#666', marginTop: '1px' }}>{b.description}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Owned buildings */}
      {frontier.owned.length > 0 ? (
        <>
          <div style={{ fontSize: '9px', color: '#88ff88', marginBottom: '4px' }}>Owned</div>
          {frontier.owned.map((b, i) => (
            <div key={`${b.defId}-${i}`} style={{
              padding: '4px 6px', marginBottom: '2px', borderRadius: '4px',
              background: b.destroyed ? 'rgba(255,68,68,0.08)' : 'rgba(68,255,68,0.04)',
              opacity: b.destroyed ? 0.4 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                <span style={{ color: b.destroyed ? '#ff4444' : '#ccc' }}>
                  {b.name} {b.count && b.count > 1 ? `×${b.count}` : ''}
                </span>
                <span style={{ fontSize: '9px', color: b.destroyed ? '#ff4444' : '#888' }}>{b.status}</span>
              </div>
              {/* Action buttons based on mechanic */}
              {!b.destroyed && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '3px' }}>
                  {b.mechanic === 'overcharge' && b.status === 'Ready' && (
                    <ActionBtn label="Overcharge" color="#ffaa44" onClick={() => GameUIStore.requestFrontierBatchAction('overcharge', b.defId)} />
                  )}
                  {b.mechanic === 'dig' && (
                    <ActionBtn label="Dig Deeper" color="#88aacc" onClick={() => GameUIStore.requestFrontierBatchAction('dig', b.defId)} />
                  )}
                  {b.mechanic === 'grow' && (
                    <ActionBtn label="Harvest" color="#88ff88" onClick={() => GameUIStore.requestFrontierBatchAction('harvest', b.defId)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div style={{ fontSize: '10px', color: '#555', padding: '4px 0' }}>No buildings yet — buy one above</div>
      )}
    </>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'inherit', fontSize: '8px', padding: '2px 6px', borderRadius: '3px',
      background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44`,
      color, cursor: 'pointer',
    }}>
      {label}
    </button>
  );
}
