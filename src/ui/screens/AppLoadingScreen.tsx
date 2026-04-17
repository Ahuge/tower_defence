/**
 * AppLoadingScreen — first-load splash shown over the app until all
 * spritesheets have been fetched and the per-icon DOM cache has been
 * pre-warmed. Replaces the silent ~1-2s pause where the menu rendered
 * but Store/Inventory would stutter on first open.
 *
 * Dismissal requires BOTH:
 *   1. a window 'app-preload-complete' event (fired by main.ts once
 *      BootScene's loader is done AND icon preheat has finished), and
 *   2. a 2500ms minimum display (so the title card always feels
 *      intentional, not a flicker).
 */
import { useEffect, useState } from 'preact/hooks';

// Swap this path to a PNG in /public when art is ready. Falls back to a
// gradient + noise composite via CSS background-image stacking.
const BACKGROUND_IMAGE_URL: string | null = null;

const BASE_PATH = (import.meta as any).env?.BASE_URL ?? '/';
const LOGO_URL = `${BASE_PATH.replace(/\/$/, '')}/icons/icon-512x512.png`;
const NOISE_URL = `${BASE_PATH.replace(/\/$/, '')}/assets/ui/noise.png`;
const MIN_DISPLAY_MS = 2500;
const SAFETY_MS = 15000;
const FADE_MS = 350;

export function AppLoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'assets' | 'warming' | 'ready'>('assets');
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    let preloadComplete = false;
    let minElapsed = false;
    let dismissed = false;

    const tryDismiss = () => {
      if (dismissed || !preloadComplete || !minElapsed) return;
      dismissed = true;
      setFadeOut(true);
      setTimeout(() => setVisible(false), FADE_MS);
    };

    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ value: number; phase?: 'assets' | 'warming' }>).detail;
      if (typeof detail?.value === 'number') setProgress(detail.value);
      if (detail?.phase) setPhase(detail.phase);
    };
    const onComplete = () => {
      setProgress(1);
      setPhase('ready');
      preloadComplete = true;
      tryDismiss();
    };
    window.addEventListener('app-preload-progress', onProgress);
    window.addEventListener('app-preload-complete', onComplete);

    const minTimer = setTimeout(() => { minElapsed = true; tryDismiss(); }, MIN_DISPLAY_MS);
    const safetyTimer = setTimeout(() => {
      if (!preloadComplete) console.warn('[AppLoadingScreen] safety timeout — forcing dismiss');
      preloadComplete = true;
      minElapsed = true;
      tryDismiss();
    }, SAFETY_MS);

    return () => {
      window.removeEventListener('app-preload-progress', onProgress);
      window.removeEventListener('app-preload-complete', onComplete);
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  const progressPct = Math.max(0, Math.min(100, progress * 100));
  const statusText = phase === 'ready' ? 'READY' : phase === 'warming' ? 'WARMING SPRITE CACHE' : 'LOADING ASSETS';

  const bgLayers: string[] = [];
  if (BACKGROUND_IMAGE_URL) bgLayers.push(`url('${BACKGROUND_IMAGE_URL}') center/cover no-repeat`);
  bgLayers.push(`url('${NOISE_URL}') repeat`);
  bgLayers.push('radial-gradient(ellipse at 50% 40%, rgba(198, 163, 88, 0.18) 0%, rgba(21, 16, 26, 0) 55%)');
  bgLayers.push('linear-gradient(180deg, #1a1322 0%, #15101a 45%, #0f0b15 100%)');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        background: bgLayers.join(', '),
        backgroundBlendMode: BACKGROUND_IMAGE_URL ? 'overlay, normal, normal, normal' : 'overlay, normal, normal',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '600px', width: '100%' }}>
        <img
          src={LOGO_URL}
          alt=""
          width={160}
          height={160}
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.6))' }}
        />

        <div style={{
          fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
          fontSize: 'clamp(36px, 8vw, 64px)',
          color: 'var(--gold, #e8b76d)',
          letterSpacing: '6px',
          fontWeight: 700,
          textShadow: '0 2px 24px rgba(232, 183, 109, 0.35)',
        }}>
          FACTIONS
        </div>

        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 'clamp(12px, 2vw, 14px)',
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginTop: '-8px',
        }}>
          by Running Man Games
        </div>

        <div style={{ width: '100%', maxWidth: '320px', marginTop: '28px' }}>
          <div style={{
            height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #e8b76d, #c6a358)',
              transition: 'width 160ms ease-out',
            }} />
          </div>
          <div style={{
            marginTop: '10px',
            fontFamily: "'VT323', ui-monospace, monospace",
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '2px',
            textAlign: 'center',
          }}>
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
}
