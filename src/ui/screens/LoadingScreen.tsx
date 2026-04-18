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
}

export function LoadingScreen({ faction, map, difficulty, mode, waveCount }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
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

  // Fade out after BOTH: scene signals ready AND minimum time has elapsed
  useEffect(() => {
    const MIN_MS = 5000;
    const SAFETY_MS = 10000;
    const startTime = performance.now();
    let sceneReady = false;
    let minElapsed = false;
    let dismissed = false;

    const debug = new URLSearchParams(window.location.search).has('debug');
    const log = (msg: string) => { if (debug) console.log(msg); };
    const elapsed = () => ((performance.now() - startTime) / 1000).toFixed(2) + 's';

    log(`[LOADING] mounted, MIN=${MIN_MS}ms SAFETY=${SAFETY_MS}ms`);

    const tryDismiss = (source: string) => {
      log(`[LOADING] tryDismiss(${source}) sceneReady=${sceneReady} minElapsed=${minElapsed} dismissed=${dismissed} elapsed=${elapsed()}`);
      if (dismissed || !sceneReady || !minElapsed) return;
      dismissed = true;
      log(`[LOADING] DISMISSING at ${elapsed()}`);
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        UIBridge.clearLoading();
        // Signal for subsystems that need to wait until the match-load
        // screen is fully gone before showing their own overlays
        // (e.g. TutorialManager's income/hero/battle primers).
        window.dispatchEvent(new Event('match-loading-dismissed'));
      }, 200);
    };

    const onReady = () => {
      log(`[LOADING] game-scene-ready event received at ${elapsed()}`);
      sceneReady = true;
      tryDismiss('scene-ready');
    };

    // Min time timer
    const minTimer = setTimeout(() => {
      log(`[LOADING] min timer fired at ${elapsed()}`);
      minElapsed = true;
      tryDismiss('min-timer');
    }, MIN_MS);

    // Scene ready event
    window.addEventListener('game-scene-ready', onReady);

    // Safety: force dismiss after SAFETY_MS regardless
    const safety = setTimeout(() => {
      log(`[LOADING] SAFETY timeout fired at ${elapsed()}`);
      sceneReady = true;
      minElapsed = true;
      tryDismiss('safety');
    }, SAFETY_MS);

    return () => {
      log(`[LOADING] cleanup at ${elapsed()}`);
      window.removeEventListener('game-scene-ready', onReady);
      clearTimeout(minTimer);
      clearTimeout(safety);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#15101a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 200ms ease',
      padding: '24px',
    }}>
      {/* Background glow — faction colored radial */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, ${fColor}15 0%, ${fColor}08 40%, transparent 70%)`,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        {/* Faction name */}
        <div style={{
          fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
          fontSize: 'clamp(28px, 6vw, 48px)',
          color: fColor,
          letterSpacing: '4px',
          fontWeight: 700,
          marginBottom: '16px',
          textShadow: `0 0 30px ${fColor}44`,
        }}>
          {fName.toUpperCase()}
        </div>

        {/* Divider */}
        <div style={{
          width: '80px', height: '2px', margin: '0 auto 16px',
          background: `linear-gradient(90deg, transparent, ${fColor}, transparent)`,
        }} />

        {/* Identity tagline — pulled from FACTIONS[id].description. Sets the
            faction's play-style expectation in the few seconds a player
            sits on this screen. */}
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

        {/* Flavour text */}
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

        {/* Map / Difficulty / Waves info pills */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px',
          marginBottom: '40px',
        }}>
          {mapName && (
            <InfoPill label="Map" value={mapName} />
          )}
          <InfoPill label="Difficulty" value={difficulty} color={diffColor} />
          <InfoPill label="Mode" value={modeLabel} />
          {wavesLabel && <InfoPill label="Waves" value={wavesLabel} />}
        </div>

        {/* Animated progress bar */}
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
      </div>

      {/* CSS animation for progress bar */}
      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
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
