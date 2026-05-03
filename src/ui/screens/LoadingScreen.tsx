/**
 * LoadingScreen — faction-themed splash shown while GameScene loads.
 * Displays faction name, random flavour text, map/difficulty info,
 * and an animated progress bar. Minimum display time of 500ms.
 */
import { useState, useEffect, useRef } from 'preact/hooks';
import { FACTIONS, FactionId } from '../../data/Factions';
import { MAPS, MapId } from '../../data/Maps';
import { pickFlavour } from '../../data/FactionFlavour';
import { UIBridge } from '../UIBridge';

function hexColor(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

const BASE_URL: string = (import.meta as any).env?.BASE_URL ?? '/';

/** Path to the player's faction splash key art. Returns '' for meta
 *  entries (chaos / random) and unknown ids — caller falls back to
 *  the radial-gradient mood lighting only.
 *
 *  Mobile variant (`{faction}_splash_mobile.png`) is a 9:16 portrait
 *  crop of the landscape source; the engine selects between them via
 *  a viewport-width media check below. */
function factionSplashSrc(faction: string | null, mobile = false): string {
  if (!faction || faction === 'random' || faction === 'chaos') return '';
  const suffix = mobile ? '_splash_mobile' : '_splash';
  // WebP — ~95% smaller payload than the PNG source.
  return `${BASE_URL}assets/${faction}/${faction}${suffix}.webp`;
}

/** Reactive viewport portrait detection. Re-evaluates on resize so a
 *  rotated tablet swaps between landscape/portrait splashes cleanly. */
function useIsPortraitViewport(): boolean {
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-aspect-ratio: 1/1)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-aspect-ratio: 1/1)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return portrait;
}

// ─── Difficulty display ────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'var(--jewel-teal)',
  normal: 'var(--gold)',
  hard: 'var(--jewel-red)',
  insane: 'var(--faction-psionic)',
};

const MODE_DISPLAY: Record<string, string> = {
  standard: 'Standard',
  battle: 'Essence',
  hero_defense: 'Hero Defense',
  gauntlet: 'Gauntlet',
  endless: 'Endless',
};

// ─── Component ─────────────────────────────────────────────

interface LoadingScreenProps {
  faction: FactionId | string | null;
  map: MapId | string | null;
  difficulty: string;
  mode: string;
  waveCount?: number;
  /** Campaign mission title — replaces faction name as headline. */
  missionTitle?: string;
  /** Campaign mission briefing — replaces flavour quote. */
  missionStory?: string;
  /** When true, screen waits for player to click "Begin" before
   *  dismissing instead of auto-dismissing on scene-ready. */
  requiresContinue?: boolean;
}

export function LoadingScreen({ faction, map, difficulty, mode, waveCount, missionTitle, missionStory, requiresContinue }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const flavourRef = useRef(pickFlavour(faction));

  const fDef = faction && faction !== 'random' ? FACTIONS[faction as FactionId] : null;
  const fColor = fDef ? hexColor(fDef.primaryColor) : '#888888';
  const fName = fDef?.name ?? (faction === 'random' ? 'Random' : 'Unknown');
  const fDescription = fDef?.description
    ?? (faction === 'random' ? 'Six towers rotate every wave — play what the draw gives you.' : null);
  const mapName = map ? (MAPS[map as MapId]?.name ?? (map === 'random' ? 'Random' : map)) : '';
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? 'var(--text-secondary)';
  const modeLabel = MODE_DISPLAY[mode] ?? mode;
  const wavesLabel = waveCount ? `${waveCount} waves` : null;

  // Dismiss flow:
  //  - Default: scene-ready + min-time elapsed → auto-dismiss
  //  - requiresContinue: scene-ready + player clicks Begin → dismiss
  //    Min-time still applies before the button enables (so the loading
  //    screen never feels skippable in <1s).
  useEffect(() => {
    const MIN_MS = requiresContinue ? 800 : 5000;
    const SAFETY_MS = 10000;
    const startTime = performance.now();
    let isReady = false;
    let minElapsed = false;
    let dismissed = false;

    const debug = new URLSearchParams(window.location.search).has('debug');
    const log = (msg: string) => { if (debug) console.log(msg); };
    const elapsed = () => ((performance.now() - startTime) / 1000).toFixed(2) + 's';

    log(`[LOADING] mounted, MIN=${MIN_MS}ms SAFETY=${SAFETY_MS}ms requiresContinue=${requiresContinue}`);

    const tryDismiss = (source: string) => {
      log(`[LOADING] tryDismiss(${source}) sceneReady=${isReady} minElapsed=${minElapsed} dismissed=${dismissed} elapsed=${elapsed()}`);
      if (dismissed || !isReady || !minElapsed) return;
      // requiresContinue waits for explicit player click.
      if (requiresContinue && source !== 'continue-click' && source !== 'safety') return;
      dismissed = true;
      log(`[LOADING] DISMISSING at ${elapsed()}`);
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        UIBridge.clearLoading();
        window.dispatchEvent(new Event('match-loading-dismissed'));
      }, 200);
    };

    const onReady = () => {
      log(`[LOADING] game-scene-ready event received at ${elapsed()}`);
      isReady = true;
      setSceneReady(true);
      tryDismiss('scene-ready');
    };

    const onContinue = () => {
      log(`[LOADING] continue-click at ${elapsed()}`);
      tryDismiss('continue-click');
    };

    const minTimer = setTimeout(() => {
      log(`[LOADING] min timer fired at ${elapsed()}`);
      minElapsed = true;
      tryDismiss('min-timer');
    }, MIN_MS);

    window.addEventListener('game-scene-ready', onReady);
    window.addEventListener('loading-screen-continue', onContinue);

    const safety = setTimeout(() => {
      log(`[LOADING] SAFETY timeout fired at ${elapsed()}`);
      isReady = true;
      setSceneReady(true);
      minElapsed = true;
      tryDismiss('safety');
    }, SAFETY_MS);

    return () => {
      log(`[LOADING] cleanup at ${elapsed()}`);
      window.removeEventListener('game-scene-ready', onReady);
      window.removeEventListener('loading-screen-continue', onContinue);
      clearTimeout(minTimer);
      clearTimeout(safety);
    };
  }, [requiresContinue]);

  if (!visible) return null;

  const isPortrait = useIsPortraitViewport();
  const splashImg = factionSplashSrc(
    typeof faction === 'string' ? faction : null,
    isPortrait,
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#15101a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 200ms ease',
      padding: '24px',
      overflow: 'hidden',
    }}>
      {/* Bespoke faction splash — landscape art behind the foreground
          UI text. Self-hides via onError when the asset is missing
          (meta factions, broken installs) so the radial gradient
          fallback is the only thing rendered. */}
      {splashImg && (
        <img
          src={splashImg}
          alt=""
          aria-hidden="true"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'saturate(1.05)',
          }}
        />
      )}
      {/* Vignette over the splash so foreground text + progress
          bar stay readable. Strongest in the centre column where
          the title sits, weaker at the edges so the splash art
          shows through. */}
      {splashImg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(21, 16, 26, 0.85) 0%, rgba(21, 16, 26, 0.55) 50%, rgba(21, 16, 26, 0.75) 100%)',
        }} />
      )}
      {/* Background glow — faction colored radial. Sits above the splash
          for the colored mood-lighting boost. */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, ${fColor}15 0%, ${fColor}08 40%, transparent 70%)`,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        {/* Headline — mission title (when set) or faction name */}
        <div style={{
          fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
          fontSize: 'clamp(28px, 6vw, 48px)',
          color: fColor,
          letterSpacing: '4px',
          fontWeight: 700,
          marginBottom: '8px',
          textShadow: `0 0 30px ${fColor}44`,
        }}>
          {(missionTitle ?? fName).toUpperCase()}
        </div>
        {/* Subtitle — when on a campaign mission, show the faction
            name in a smaller line under the mission title so the
            player still gets the visual context. */}
        {missionTitle && fName && fName !== 'Unknown' && (
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 'clamp(11px, 2vw, 13px)',
            color: 'var(--text-muted)',
            letterSpacing: '2px',
            marginBottom: '12px',
            textTransform: 'uppercase',
          }}>
            {fName}
          </div>
        )}

        {/* Divider */}
        <div style={{
          width: '80px', height: '2px', margin: '0 auto 16px',
          background: `linear-gradient(90deg, transparent, ${fColor}, transparent)`,
        }} />

        {/* Mission story (when on a campaign) OR faction tagline.
            Mission briefs supersede the faction description so the
            player reads the in-world brief, not generic flavour. */}
        {missionStory ? (
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 'clamp(13px, 2.4vw, 15px)',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            marginBottom: '24px',
            padding: '0 12px',
            maxWidth: '560px',
            margin: '0 auto 24px',
            whiteSpace: 'pre-line',
            textAlign: 'left',
          }}>
            {missionStory}
          </div>
        ) : (
          <>
            {fDescription && (
              <div style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 'clamp(13px, 2.4vw, 15px)',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                marginBottom: '16px',
                padding: '0 12px',
                maxWidth: '520px',
                margin: '0 auto 16px',
              }}>
                {fDescription}
              </div>
            )}
            {/* Flavour quote — only when there's no mission story */}
            <div style={{
              fontStyle: 'italic',
              fontSize: 'clamp(12px, 2.2vw, 14px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '32px',
              minHeight: '42px',
              padding: '0 12px',
            }}>
              "{flavourRef.current}"
            </div>
          </>
        )}

        {/* Map / Difficulty / Waves info pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px',
          marginBottom: '32px',
        }}>
          {mapName && (
            <InfoPill label="Map" value={mapName} />
          )}
          <InfoPill label="Difficulty" value={difficulty} color={diffColor} />
          <InfoPill label="Mode" value={modeLabel} />
          {wavesLabel && <InfoPill label="Waves" value={wavesLabel} />}
        </div>

        {/* Progress bar transforms into a Begin button when the scene
            is ready (campaign mode only). For non-campaign loads, the
            bar just keeps animating until auto-dismiss fires. */}
        {requiresContinue && sceneReady ? (
          <button
            onClick={() => window.dispatchEvent(new Event('loading-screen-continue'))}
            style={{
              fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
              fontSize: 'clamp(16px, 3vw, 20px)',
              color: '#15101a',
              letterSpacing: '3px',
              padding: '14px 36px',
              background: `linear-gradient(180deg, ${fColor}, ${fColor}cc)`,
              border: `2px solid ${fColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'transform 120ms, box-shadow 120ms',
              boxShadow: `0 0 20px ${fColor}66`,
              fontWeight: 700,
              animation: 'beginPulse 1.6s ease-in-out infinite',
            }}
          >
            BEGIN
          </button>
        ) : (
          <div style={{
            width: '100%', maxWidth: '300px', margin: '0 auto',
          }}>
            <div style={{
              height: '3px', borderRadius: '2px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: `linear-gradient(90deg, ${fColor}, ${fColor}aa)`,
                animation: 'loadingBar 2s ease-in-out infinite',
              }} />
            </div>
            <div style={{
              marginTop: '10px',
              fontFamily: "'VT323', ui-monospace, monospace",
              fontSize: '14px',
              color: 'var(--text-muted)',
              letterSpacing: '2px',
            }}>
              PREPARING DEFENSES...
            </div>
          </div>
        )}
      </div>

      {/* CSS animations for the progress bar + Begin-button pulse */}
      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes beginPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

function InfoPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(31, 24, 35, 0.9)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '6px',
      padding: '6px 14px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'VT323', ui-monospace, monospace",
        fontSize: '15px',
        color: color ?? 'var(--text-primary)',
        textTransform: 'capitalize',
      }}>{value}</div>
      <div style={{
        fontSize: '9px', color: 'var(--text-dim)',
        letterSpacing: '1px', textTransform: 'uppercase',
        marginTop: '1px',
      }}>{label}</div>
    </div>
  );
}
