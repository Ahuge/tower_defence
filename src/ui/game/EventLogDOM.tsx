/**
 * EventLog — DOM panel showing recent game events.
 */
import { useGameUISelector } from '../hooks/useGameUI';

export function EventLogDOM() {
  const entries = useGameUISelector(s => s.eventLog);

  if (entries.length === 0) return null;

  return (
    <>
      {entries.slice(0, 8).map(entry => (
        <div key={entry.id} style={{
          fontSize: '9px', color: entry.color, padding: '1px 0',
          opacity: Math.max(0.3, 1 - (Date.now() - entry.time) / 30000),
        }}>
          {entry.text}
        </div>
      ))}
    </>
  );
}
