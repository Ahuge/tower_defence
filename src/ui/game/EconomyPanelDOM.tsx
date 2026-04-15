/**
 * EconomyPanel — combined Sends + Frontier + Log with internal tabs.
 */
import { useState } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
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

/** Placeholder frontier content — will be wired to GameUIStore */
function FrontierContent() {
  return (
    <div style={{ fontSize: '10px', color: '#888', padding: '8px 0' }}>
      <div style={{ color: '#ffaa44', fontSize: '9px', letterSpacing: '1px', marginBottom: '6px' }}>FRONTIER</div>
      <div style={{ color: '#666' }}>Frontier buildings and actions will appear here when available.</div>
    </div>
  );
}
