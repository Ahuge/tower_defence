/**
 * Achievement-unlock toast.
 *
 * Play Games Services / Game Center themselves are supposed to pop
 * a native toast on `unlockAchievement`, but the native toast only
 * fires if (a) the user is signed in and (b) the platform overlay is
 * enabled — which makes it a lousy signal for developers verifying
 * "did my unlock actually run?". The in-app toast below is always
 * shown on every successful unlock so the diagnostic answer is
 * unambiguous, and also gives the player a slightly nicer local
 * confirmation than the sometimes-missing native popup.
 *
 * Driven by the `td-achievement-unlocked` window event, which
 * `src/data/Achievements.ts` dispatches after the bridge call.
 * Event detail: `{ key, nativeOk }` — `key` is the internal
 * AchievementKey for the label lookup, `nativeOk` is whether the
 * bridge call resolved without throwing (vs failing silently
 * because the user isn't signed in / isn't on the tester list /
 * the plugin bailed on web).
 */
import { useEffect, useState } from 'preact/hooks';

interface ToastState {
  id: number;
  label: string;
  sublabel: string;
  nativeOk: boolean;
}

// Display-strings for the AchievementKey values. Keep in sync with
// `src/data/Achievements.ts`.
const LABELS: Record<string, string> = {
  FIRST_WIN: 'First Win',
};

let nextId = 0;

export function AchievementToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; nativeOk: boolean }>).detail;
      if (!detail) return;
      const t: ToastState = {
        id: nextId++,
        label: LABELS[detail.key] ?? detail.key,
        sublabel: detail.nativeOk
          ? 'Achievement Unlocked'
          : 'Achievement Unlocked (local — not synced to Play Games)',
        nativeOk: detail.nativeOk,
      };
      setToasts(prev => [...prev, t]);
      // Auto-dismiss after 4 seconds.
      window.setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 4000);
    };
    window.addEventListener('td-achievement-unlocked', onUnlock);
    return () => window.removeEventListener('td-achievement-unlocked', onUnlock);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 700,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: 'rgba(26, 21, 32, 0.96)',
            border: `2px solid ${t.nativeOk ? 'var(--gold, #e8b76d)' : '#ccaa44'}`,
            borderRadius: '8px',
            padding: '10px 18px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
            color: 'var(--text-primary, #eee)',
            fontFamily: 'sans-serif',
            animation: 'achievement-slide 240ms ease-out',
            minWidth: '220px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--gold, #e8b76d)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {t.sublabel}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>
            🏆 {t.label}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes achievement-slide {
          from { opacity: 0; transform: translateX(-50%) translateY(-14px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
