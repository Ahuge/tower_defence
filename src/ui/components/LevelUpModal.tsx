/**
 * LevelUpModal — full-screen take-over shown after a level-up. Subscribes
 * to PlayerProfile.onLevelUp and queues per-game level-ups so multiple
 * crossings show one-by-one rather than collapsing into one toast.
 *
 * Also handles the one-shot "Welcome back: starting at level X" banner
 * for legacy-save migrations (PlayerProfileStore.flags.migration_banner_pending).
 *
 * Visual identity: confetti + level chevron. Reused later by Plan 5
 * (faction unlock) and Plan 6 (achievement complete) — the styling
 * here should be considered a shared "celebratory moment" component.
 *
 * Plan-2 scope: greybox-quality polish (typography + animation, no
 * bespoke art). Plan 3 + later iterate on the look.
 */
import { useState, useEffect } from 'preact/hooks';
import { PlayerProfile } from '../../systems/profile/PlayerProfile';
import { unlocksAtLevel, UnlockReveal } from '../../systems/profile/UnlockGates';

interface QueueEntry {
  kind: 'level_up' | 'migration';
  level?: number;
  fromLevel?: number;
  reveals?: UnlockReveal[];
  inferredLevel?: number;
}

export function LevelUpModal() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  useEffect(() => {
    // Drain any pending migration banner on mount.
    const snap = PlayerProfile.__snapshot();
    if (snap.flags.migration_banner_pending && snap.migratedFromInferredLevel) {
      setQueue(q => [...q, {
        kind: 'migration',
        inferredLevel: snap.migratedFromInferredLevel,
      }]);
      PlayerProfile.setFlag('migration_banner_pending', false);
    }

    const unsub = PlayerProfile.onLevelUp((from, to, reveals) => {
      // Enqueue ONE entry per level transition, not per intermediate
      // level — we show "you reached L5" with the final reveal set.
      setQueue(q => [...q, {
        kind: 'level_up',
        level: to,
        fromLevel: from,
        reveals: reveals.length > 0 ? reveals : unlocksAtLevel(to),
      }]);
    });
    return () => { unsub(); };
  }, []);

  if (queue.length === 0) return null;
  const head = queue[0];
  const dismiss = () => setQueue(q => q.slice(1));

  if (head.kind === 'migration') {
    return (
      <Modal onClose={dismiss}>
        <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.1em' }}>
          WELCOME BACK
        </div>
        <div style={{ fontFamily: "'Silkscreen', monospace", fontSize: '34px', color: 'var(--gold)', marginBottom: '12px' }}>
          Player Level {head.inferredLevel}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
          We added a permanent player level for everyone. Based on your time playing, you're starting at <b>L{head.inferredLevel}</b>. New levels unlock modes, maps, and features — keep playing.
        </div>
        <button class="btn btn-gold" onClick={dismiss}>Got it</button>
      </Modal>
    );
  }

  return (
    <Modal onClose={dismiss}>
      <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '6px', letterSpacing: '0.1em' }}>
        LEVEL UP
      </div>
      <div style={{ fontFamily: "'Silkscreen', monospace", fontSize: '52px', color: 'var(--gold)', marginBottom: '6px' }}>
        L{head.level}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
        from L{head.fromLevel}
      </div>
      {head.reveals && head.reveals.length > 0 && (
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>You unlocked</div>
          {head.reveals.map(r => (
            <div key={r.id} style={{ padding: '6px 10px', background: 'rgba(255,170,68,0.08)', borderLeft: '2px solid var(--gold)', marginBottom: '4px', fontSize: '13px' }}>
              {r.label}
            </div>
          ))}
        </div>
      )}
      {(!head.reveals || head.reveals.length === 0) && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px', fontStyle: 'italic' }}>
          More unlocks coming at higher levels — keep playing.
        </div>
      )}
      <button class="btn btn-gold" onClick={dismiss}>Continue</button>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: preact.ComponentChildren; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(8, 6, 14, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9000,
      animation: 'fadein 200ms ease-out',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--gold)',
        borderRadius: '12px',
        padding: '32px 40px',
        textAlign: 'center',
        maxWidth: 'min(90vw, 460px)',
        boxShadow: '0 12px 48px rgba(255,170,68,0.15)',
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
