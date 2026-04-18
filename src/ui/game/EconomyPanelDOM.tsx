/**
 * EconomyPanel — combined Sends + Frontier + Log with internal tabs.
 */
import { useState, useEffect } from 'preact/hooks';
import { useGameUI, useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { SendPanelDOM } from './SendPanelDOM';
import { EventLogDOM } from './EventLogDOM';
import { EssenceContentDOM } from './EssenceContentDOM';
import { HeroItemsDOM } from './HeroItemsDOM';

type EconTab = 'sends' | 'frontier' | 'essence' | 'items' | 'log';

export function EconomyPanelDOM() {
  const { sendOptions, eventLog } = useGameUI();
  const [tab, setTab] = useState<EconTab>('sends');

  const frontier = useGameUISelector(s => s.frontier);
  const essence = useGameUISelector(s => s.essence);
  const heroShop = useGameUISelector(s => s.heroShop);
  const hasFrontier = frontier.available.length > 0 || frontier.owned.length > 0;

  const tabs: { id: EconTab; label: string; badge?: string; show: boolean }[] = [
    { id: 'sends', label: 'Sends', badge: sendOptions.filter(o => !o.locked).length + ' avail', show: sendOptions.length > 0 },
    { id: 'frontier', label: 'Frontier', badge: frontier.owned.length > 0 ? `${frontier.owned.length} owned` : undefined, show: hasFrontier },
    { id: 'essence', label: 'Essence', badge: essence ? `${Math.floor(essence.essence)}e` : undefined, show: !!essence },
    { id: 'items', label: 'Items', show: !!heroShop },
    { id: 'log', label: 'Log', badge: String(eventLog.length), show: eventLog.length > 0 },
  ];

  const visibleTabs = tabs.filter(t => t.show);
  // Auto-select first visible tab if current is hidden
  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : (visibleTabs[0]?.id ?? 'log');

  // Tutorial can switch tabs so the right content is visible while its
  // spotlight lands on the content area (e.g. buy_frontier opens the
  // Frontier tab before highlighting the Leyline Nexus entry).
  // Registered once on mount — listener calls setTab directly, and the
  // component's existing fallback logic picks a visible tab if the
  // requested one happens to be hidden.
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: EconTab }>).detail;
      if (!detail) return;
      setTab(detail.tab);
    };
    window.addEventListener('tutorial-switch-econ-tab', onSwitch);
    return () => window.removeEventListener('tutorial-switch-econ-tab', onSwitch);
  }, []);

  return (
    <>
      {/* Internal tab bar */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
        {visibleTabs.map(t => (
          <button key={t.id}
            class="econ-tab"
            data-tutorial-target={`econ-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: activeTab === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--gold)' : 'var(--text-dim)',
            }}>
            {t.label} {t.badge && <span style={{ color: 'var(--text-dim)', marginLeft: '2px' }}>({t.badge})</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sends' && <div data-tutorial-target="econ-content-sends"><SendPanelDOM /></div>}
      {activeTab === 'frontier' && <div data-tutorial-target="econ-content-frontier"><FrontierContent /></div>}
      {activeTab === 'essence' && <EssenceContentDOM />}
      {activeTab === 'items' && <HeroItemsDOM />}
      {activeTab === 'log' && <EventLogDOM />}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span class="econ-item-name">{b.name}</span>
                  <span class="econ-item-cost" style={{ color: canAfford ? 'var(--gold)' : 'var(--text-dim)' }}>{b.cost}g</span>
                </div>
                <div class="econ-item-desc">{b.description}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Owned buildings */}
      {frontier.owned.length > 0 ? (
        <>
          <div style={{ fontSize: '9px', color: 'var(--jewel-teal)', marginBottom: '4px' }}>Owned</div>
          {frontier.owned.map((b, i) => (
            <div key={`${b.defId}-${i}`} style={{
              padding: '4px 6px', marginBottom: '2px', borderRadius: '4px',
              background: 'rgba(68,255,68,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                <span style={{ color: 'var(--text-primary)' }}>
                  {b.name} {b.count && b.count > 1 ? `×${b.count}` : ''}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{b.status}</span>
              </div>
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
            </div>
          ))}
        </>
      ) : (
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '4px 0' }}>No buildings yet — buy one above</div>
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
