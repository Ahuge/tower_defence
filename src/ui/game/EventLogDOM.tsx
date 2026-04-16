/**
 * EventLog — DOM panel showing recent game events. Scrollable.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { useRef, useEffect } from 'preact/hooks';

export function EventLogDOM() {
  const entries = useGameUISelector(s => s.eventLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div ref={scrollRef} class="event-log">
      {entries.map(entry => (
        <div key={entry.id} class="event-log-entry" style={{ color: entry.color }}>
          {entry.text}
        </div>
      ))}
    </div>
  );
}
