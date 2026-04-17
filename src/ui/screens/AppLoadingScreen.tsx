/**
 * AppLoadingScreen — first-load splash shown over the app until all
 * spritesheets have been fetched and the per-icon DOM cache has been
 * pre-warmed. Replaces the silent ~1-2s pause where the menu rendered
 * but Store/Inventory would stutter on first open.
 *
 * The progress bar is chunked — each stage is displayed for at least
 * MIN_CHUNK_MS even if its actual work finishes instantly, so the user
 * always sees the progress advance rather than a sudden jump to full.
 *
 * Dismissal requires BOTH:
 *   1. a window 'app-preload-complete' event (fired by main.ts once
 *      BootScene's loader is done AND icon preheat has finished), and
 *   2. a MIN_DISPLAY_MS minimum display (so the title card always
 *      feels intentional, not a flicker).
 */
import { useEffect, useRef, useState } from 'preact/hooks';

// Swap this path to a PNG in /public when art is ready. Falls back to a
// gradient + noise composite via CSS background-image stacking.
const BACKGROUND_IMAGE_URL: string | null = null;

const BASE_PATH = (import.meta as any).env?.BASE_URL ?? '/';
const LOGO_URL = `${BASE_PATH.replace(/\/$/, '')}/icons/icon-512x512.png`;
const NOISE_URL = `${BASE_PATH.replace(/\/$/, '')}/assets/ui/noise.png`;
const MIN_DISPLAY_MS = 2500;
const SAFETY_MS = 15000;
const FADE_MS = 350;

/** Each chunk is guaranteed at least this much visible time — the
 *  displayed bar's maximum advance velocity is capped to one chunk
 *  width per MIN_CHUNK_MS, regardless of how fast the real load is. */
const MIN_CHUNK_MS = 300;

/** Progress checkpoints. Each chunk defines (end, label); the bar
 *  shows the corresponding label while its displayed progress is
 *  below `end`. With 5 chunks × 300ms, the bar takes ≥1500ms to
 *  traverse 0 → 1 even on a zero-latency load. */
const CHUNKS: { end: number; label: string }[] = [
  { end: 0.20, label: 'LOADING FONTS' },
  { end: 0.45, label: 'LOADING SPRITESHEETS' },
  { end: 0.70, label: 'LOADING CREEP ART' },
  { end: 0.90, label: 'WARMING SPRITE CACHE' },
  { end: 1.00, label: 'READY' },
];

/** Max advancement rate of the displayed bar (progress units per ms). */
const MAX_VELOCITY_PER_MS = (1 / CHUNKS.length) / MIN_CHUNK_MS;

function labelForProgress(p: number): string {
  for (const chunk of CHUNKS) {
    if (p < chunk.end) return chunk.label;
  }
  return CHUNKS[CHUNKS.length - 1].label;
}

export function AppLoadingScreen() {
  const [displayed, setDisplayed] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Event-driven target, updated by useEffect listeners. Kept in a ref so
  // the rAF loop can read the latest value without re-subscribing.
  const targetRef = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let preloadComplete = false;
    let minElapsed = false;
    let dismissed = false;
    let displayedLocal = 0;
    let rAFid = 0;

    const tryDismiss = () => {
      if (dismissed || !preloadComplete || !minElapsed || displayedLocal < 1) return;
      dismissed = true;
      setFadeOut(true);
      setTimeout(() => setVisible(false), FADE_MS);
    };

    const tick = (now: number) => {
      const dt = now - lastFrameTime;
      lastFrameTime = now;
      const cap = targetRef.current;
      const step = MAX_VELOCITY_PER_MS * dt;
      const next = Math.min(cap, displayedLocal + step);
      if (next !== displayedLocal) {
        displayedLocal = next;
        setDisplayed(displayedLocal);
      }
      // Dismissal checks every frame — allows the safety timer to fire
      // even when no other events arrive, and ensures we only dismiss
      // once the bar has visibly reached 100%.
      tryDismiss();
      if (!dismissed) rAFid = requestAnimationFrame(tick);
    };
    rAFid = requestAnimationFrame(tick);

    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ value: number }>).detail;
      if (typeof detail?.value === 'number') {
        targetRef.current = Math.max(targetRef.current, detail.value);
      }
    };
    const onComplete = () => {
      targetRef.current = 1;
      preloadComplete = true;
    };
    window.addEventListener('app-preload-progress', onProgress);
    window.addEventListener('app-preload-complete', onComplete);

    const minTimer = setTimeout(() => { minElapsed = true; }, MIN_DISPLAY_MS);
    const safetyTimer = setTimeout(() => {
      if (!preloadComplete) console.warn('[AppLoadingScreen] safety timeout — forcing dismiss');
      targetRef.current = 1;
      preloadComplete = true;
      minElapsed = true;
      // Force bar to jump so tryDismiss clears.
      displayedLocal = 1;
      setDisplayed(1);
    }, SAFETY_MS);

    return () => {
      cancelAnimationFrame(rAFid);
      window.removeEventListener('app-preload-progress', onProgress);
      window.removeEventListener('app-preload-complete', onComplete);
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  const progressPct = Math.max(0, Math.min(100, displayed * 100));
  const statusText = labelForProgress(displayed);

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
