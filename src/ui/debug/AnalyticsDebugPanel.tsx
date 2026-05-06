/**
 * AnalyticsDebugPanel — fixed bottom-left drawer that shows the live
 * ring buffer of analytics events.
 *
 * Gated on the global DEBUG flag (`?debug` URL param). Renders nothing
 * in production builds where DEBUG is false.
 *
 * Useful for verifying telemetry without a backend dashboard. The panel
 * works even when the user has analytics opted-out — the ring buffer is
 * always populated locally; only network sends respect the flag.
 */
import { useState, useEffect, useMemo } from 'preact/hooks';
import { Analytics } from '../../systems/AnalyticsClient';
import { DEBUG } from '../../systems/DebugFlags';

export function AnalyticsDebugPanel() {
  if (!DEBUG) return null;

  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const unsub = Analytics.subscribe(() => setTick(t => t + 1));
    return () => { unsub(); };
  }, []);

  const events = Analytics.getRecentEvents();
  const filtered = useMemo(() => {
    if (!filter) return events;
    const f = filter.toLowerCase();
    return events.filter(e => e.type.toLowerCase().includes(f));
  }, [events, filter]);

  const copyAll = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(filtered, null, 2));
    } catch { /* no-op */ }
  };

  const wrapStyle: Record<string, string | number> = {
    position: 'fixed',
    bottom: '8px',
    left: '8px',
    zIndex: 99999,
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#ccc',
    background: 'rgba(10, 10, 16, 0.92)',
    border: '1px solid #333',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
    width: open ? '460px' : '120px',
    maxHeight: open ? '60vh' : '28px',
    overflow: 'hidden',
    transition: 'all 120ms ease-out',
  };

  const headerStyle: Record<string, string | number> = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    background: '#1a1a22',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const bodyStyle: Record<string, string | number> = {
    padding: '6px 8px',
    overflow: 'auto',
    maxHeight: 'calc(60vh - 60px)',
  };

  const rowStyle: Record<string, string | number> = {
    padding: '2px 0',
    borderBottom: '1px solid #1f1f28',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div style={wrapStyle}>
      <div style={headerStyle} onClick={() => setOpen(!open)}>
        <span style={{ color: '#ffaa44' }}>▸ Analytics</span>
        <span style={{ color: '#666' }}>({events.length})</span>
        {open && (
          <>
            <span style={{ flex: 1 }} />
            <input
              type="text"
              value={filter}
              placeholder="filter…"
              onClick={e => e.stopPropagation()}
              onInput={e => setFilter((e.target as HTMLInputElement).value)}
              style={{ background: '#0a0a0f', color: '#ccc', border: '1px solid #333', borderRadius: '3px', padding: '1px 4px', width: '110px', fontSize: '10px' }}
            />
            <button
              onClick={e => { e.stopPropagation(); copyAll(); }}
              style={{ background: '#1a1a22', color: '#ccc', border: '1px solid #333', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer' }}
            >copy</button>
          </>
        )}
      </div>
      {open && (
        <div style={bodyStyle}>
          {filtered.length === 0 && <div style={{ color: '#666' }}>no events</div>}
          {filtered.slice().reverse().map((e, i) => {
            const ts = typeof e.ts === 'number' ? new Date(e.ts).toISOString().slice(11, 19) : '';
            const summary = Object.entries(e)
              .filter(([k]) => k !== 'type' && k !== 'ts' && k !== 'sessionId' && k !== 'platform')
              .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
              .join(' ');
            return (
              <div key={i} style={rowStyle} title={JSON.stringify(e, null, 2)}>
                <span style={{ color: '#666' }}>{ts}</span>
                {' '}<span style={{ color: '#ffaa44' }}>{e.type}</span>
                {' '}<span style={{ color: '#888' }}>{summary}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
