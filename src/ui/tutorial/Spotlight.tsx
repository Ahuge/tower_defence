/**
 * Spotlight — dims the screen and cuts a hole around the target rect.
 *
 * Implemented as two fixed-position divs: a full-screen scrim with a
 * transparent hole (via an outer box with massive spread-shadow), plus
 * an accent border around the hole itself. Falls back to a plain
 * full-screen scrim when there's no target (e.g. intro `screen` step).
 */
import { ResolvedRect } from '../../systems/Tutorial/TutorialTargets';

interface Props {
  rect: ResolvedRect | null;
  /** Extra pixels of breathing room around the highlight rect. */
  padding?: number;
  onClickScrim?: () => void;
}

const SCRIM = 'rgba(10, 8, 15, 0.72)';
const RING = '#e8b76d';

export function Spotlight({ rect, padding = 6, onClickScrim }: Props) {
  if (!rect) {
    // No target — plain scrim, no cutout.
    return (
      <div
        class="tutorial-scrim"
        onClick={onClickScrim}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: SCRIM,
          pointerEvents: 'auto',
        }}
      />
    );
  }

  const x = rect.x - padding;
  const y = rect.y - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  return (
    <>
      <style>{`
        @keyframes tutorialSpotlightPulse {
          0%, 100% { box-shadow: 0 0 0 9999px ${SCRIM}, 0 0 0 3px ${RING} inset, 0 0 32px ${RING}66; }
          50%      { box-shadow: 0 0 0 9999px ${SCRIM}, 0 0 0 3px ${RING} inset, 0 0 48px ${RING}aa; }
        }
      `}</style>
      {/* Cutout: a box sized to the rect, with an enormous spread shadow acting
          as the surrounding scrim. Non-interactive so taps on its area pass
          through to whatever's under it (the highlighted DOM element, or the
          game canvas for action-gated steps). */}
      <div
        class="tutorial-spotlight"
        style={{
          position: 'fixed', zIndex: 400,
          left: `${x}px`, top: `${y}px`,
          width: `${w}px`, height: `${h}px`,
          borderRadius: '10px',
          pointerEvents: 'none',
          transition: 'left 180ms ease, top 180ms ease, width 180ms ease, height 180ms ease',
          animation: 'tutorialSpotlightPulse 1.4s ease-in-out infinite',
        }}
      />
      {/* Scrim click-catchers only render when the step accepts a scrim-
          click advance (onClickScrim defined). For action-gated steps
          (towerPlaced / waveStarted / sendPurchased / frontierPurchased),
          we intentionally let taps fall through to the canvas — otherwise
          the scrim would swallow every tap outside the tiny highlight
          and the player could never actually perform the action. */}
      {onClickScrim && (
        <ScrimClickCatcher rect={{ x, y, width: w, height: h }} onClick={onClickScrim} />
      )}
    </>
  );
}

/** Four rectangles forming the area OUTSIDE the spotlight. Clicking any of
 *  them fires onClick without blocking the target. */
function ScrimClickCatcher({ rect, onClick }: { rect: ResolvedRect; onClick?: () => void }) {
  const base: any = {
    position: 'fixed', zIndex: 399, background: 'transparent', pointerEvents: 'auto', cursor: onClick ? 'pointer' : 'default',
  };
  return (
    <>
      <div style={{ ...base, left: 0, top: 0, right: 0, height: `${Math.max(0, rect.y)}px` }} onClick={onClick} />
      <div style={{ ...base, left: 0, top: `${rect.y + rect.height}px`, right: 0, bottom: 0 }} onClick={onClick} />
      <div style={{ ...base, left: 0, top: `${rect.y}px`, width: `${Math.max(0, rect.x)}px`, height: `${rect.height}px` }} onClick={onClick} />
      <div style={{ ...base, left: `${rect.x + rect.width}px`, top: `${rect.y}px`, right: 0, height: `${rect.height}px` }} onClick={onClick} />
    </>
  );
}
