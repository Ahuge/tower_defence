/**
 * Boss-wave banner. Surfaces a 2.5s "Final Stand" banner whenever the
 * `td-boss-wave-started` window event fires (dispatched from
 * GameScene.onWaveStart when the wave is `isBoss: true`). Title / sub
 * are taken from the event detail so the dispatcher gets to flavor it
 * — for M3 the wave 6 banner reads "FINAL STAND — Meteora,
 * Stormcaller, Necromaster". Generic boss waves get "BOSS WAVE — N",
 * which is still a clearer cue than the silent default.
 *
 * Pattern mirrors `AchievementToast.tsx` — window-event-driven so the
 * scene can dispatch without owning the React state.
 */
import { useEffect, useState } from 'preact/hooks';

interface BannerState {
  id: number;
  title: string;
  subtitle: string;
}

let nextId = 0;
const DURATION_MS = 2500;

export function BossWaveBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null);

  useEffect(() => {
    const onBoss = (e: Event) => {
      const detail = (e as CustomEvent<{ title: string; subtitle?: string }>).detail;
      if (!detail) return;
      const next: BannerState = {
        id: nextId++,
        title: detail.title,
        subtitle: detail.subtitle ?? '',
      };
      setBanner(next);
      window.setTimeout(() => {
        // Only clear if this is still the active banner — avoids
        // clobbering a follow-up boss wave that fired during the fade.
        setBanner(prev => (prev?.id === next.id ? null : prev));
      }, DURATION_MS);
    };
    window.addEventListener('td-boss-wave-started', onBoss);
    return () => window.removeEventListener('td-boss-wave-started', onBoss);
  }, []);

  if (!banner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      key={banner.id}
      className="boss-wave-banner"
      style={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 600,
        pointerEvents: 'none',
        textAlign: 'center',
        // Animate in: fast scale-up + glow, then linger ~1.5s, then fade
        animation: 'boss-banner-in 2500ms ease-out forwards',
      }}
    >
      <div
        style={{
          fontFamily: "'VT323', ui-monospace, monospace",
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#ff6644',
          letterSpacing: '6px',
          textShadow: '0 0 12px rgba(255,68,68,0.8), 0 0 24px rgba(255,68,68,0.4), 2px 2px 4px rgba(0,0,0,0.9)',
          marginBottom: '4px',
        }}
      >
        {banner.title}
      </div>
      {banner.subtitle && (
        <div
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '18px',
            color: '#ffcc88',
            letterSpacing: '2px',
            textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {banner.subtitle}
        </div>
      )}
      <style>{`
        @keyframes boss-banner-in {
           0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          10% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
          18% { transform: translate(-50%, -50%) scale(1.0); }
          75% { opacity: 1; }
         100% { opacity: 0; transform: translate(-50%, -50%) scale(1.0); }
        }
      `}</style>
    </div>
  );
}
