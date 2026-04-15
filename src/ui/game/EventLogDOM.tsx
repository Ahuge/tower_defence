/**
 * EventLog — DOM panel showing recent game events.
 */
import { useGameUISelector } from '../hooks/useGameUI';

export function EventLogDOM() {
  const entries = useGameUISelector(s => s.eventLog);

  if (entries.length === 0) return null;

  return (
    <div class="game-panel" style={{ marginBottom: '6px', maxHeight: '120px', overflow: 'hidden' }}>
      <div style={{ fontSize: '9px', color: '#666', letterSpacing: '1px', marginBottom: '4px' }}>LOG</div>
      {entries.slice(0, 8).map(entry => (
        <div key={entry.id} style={{
          fontSize: '9px', color: entry.color, padding: '1px 0',
          opacity: Math.max(0.3, 1 - (Date.now() - entry.time) / 30000),
        }}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
