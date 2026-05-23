/**
 * MirrorLaneHud — Snake Eyes M10 Setpiece 2 player-facing HUD strip.
 *
 * Rendered conditionally during the `mirror_lane` stage of the M10
 * three-setpiece state machine. Without this strip the player has no
 * way to see the simulated Counterfactual lane race against them —
 * v1 ships M10 without a paired-grid render so the lane is otherwise
 * gameplay-invisible (the controller still drives the race + win
 * condition, but it would all happen behind a black-box without
 * this overlay).
 *
 * State source:
 *   getActiveSnakeEyesController()?.getM10Controller()?.getMirrorLaneController().getSnapshot()
 *
 * Pulled per-frame via a tiny polling loop (~10Hz — the controller
 * advances at most once per 10s + per real wave clear, so frequent
 * polling is overkill but cheap and avoids wiring an event channel).
 * Mounts/unmounts based on stage transitions: hidden before Approach,
 * fades during stage-flip frames, hidden after Table starts.
 *
 * Layout:
 *   YOU  [▓▓▓░░ 3/5]          [+1]          [░▓▓░░ 2/5] COUNTERFACTUAL
 *   ─────────────────────────── lane gap ─────────────────────────────
 *
 * Tier colors from SNAKE_EYES_PALETTE (violet for player, gold for
 * the Counterfactual, matching the lobby tier visual language).
 */
import { useEffect, useState } from 'preact/hooks';
import { getActiveSnakeEyesController } from '../../systems/voidc/SnakeEyesMissionController';
import { SNAKE_EYES_PALETTE } from '../../systems/voidc/SnakeEyesPalette';

interface LaneSnapshot {
  playerWave: number;
  counterfactualWave: number;
  laneGap: number;
  laneLength: number;
  visible: boolean;
}

/** Poll the controller for the current Mirror Lane state. Returns
 *  `visible: false` whenever the controller doesn't exist OR the
 *  M10 stage isn't `mirror_lane`. The strip auto-hides outside the
 *  setpiece — no caller-side conditional needed. */
function readLaneSnapshot(): LaneSnapshot {
  const empty: LaneSnapshot = {
    playerWave: 0, counterfactualWave: 0, laneGap: 0, laneLength: 5, visible: false,
  };
  const ctrl = getActiveSnakeEyesController();
  const m10 = ctrl?.getM10Controller();
  if (!m10) return empty;
  if (m10.getStage() !== 'mirror_lane') return empty;
  const snap = m10.getMirrorLaneController().getSnapshot();
  // laneLength is private to MirrorLaneController; M10 default is 5
  // and the controller doesn't expose a getter. The hud reads it as
  // a const here — if a future M10 ships with a different length,
  // expose a getter on the controller and read from there.
  return {
    playerWave: snap.playerWave,
    counterfactualWave: snap.counterfactualWave,
    laneGap: snap.laneGap,
    laneLength: 5,
    visible: true,
  };
}

export function MirrorLaneHud() {
  const [snap, setSnap] = useState<LaneSnapshot>(readLaneSnapshot);

  useEffect(() => {
    // 10Hz polling. The CF lane ticks at most once per 10s (longer
    // with Divergence bias); player clears tick on wave-cleared
    // events. Polling rather than event subscription keeps the
    // component independent of the EventBus topology and gives us
    // a single refresh path for both sources.
    const id = window.setInterval(() => setSnap(readLaneSnapshot()), 100);
    return () => window.clearInterval(id);
  }, []);

  if (!snap.visible) return null;

  const playerPct = Math.min(100, (snap.playerWave / snap.laneLength) * 100);
  const cfPct = Math.min(100, (snap.counterfactualWave / snap.laneLength) * 100);

  // Lane gap chip — green when player is ahead, red when behind,
  // neutral on zero. Reads as a "scoreboard" rather than a meter.
  let gapColor: string = 'var(--text-dim)';
  let gapPrefix: string = '';
  if (snap.laneGap > 0) {
    gapColor = SNAKE_EYES_PALETTE.settledGreen;
    gapPrefix = '+';
  } else if (snap.laneGap < 0) {
    gapColor = SNAKE_EYES_PALETTE.lossRed;
  }

  return (
    <div
      data-testid="mirror-lane-hud"
      style={{
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: SNAKE_EYES_PALETTE.surface.statePanel,
        border: `1px solid ${SNAKE_EYES_PALETTE.border.statePanel}`,
        borderRadius: '6px',
        padding: '6px 14px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: '12px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '380px',
        pointerEvents: 'none', // HUD overlay; never blocks game-canvas clicks
      }}
    >
      <span style={{ color: SNAKE_EYES_PALETTE.violet, fontWeight: 600, letterSpacing: '1px' }}>
        YOU
      </span>
      <LaneBar pct={playerPct} color={SNAKE_EYES_PALETTE.violet} />
      <span style={{ color: SNAKE_EYES_PALETTE.violet, minWidth: '32px', textAlign: 'right' }}>
        {snap.playerWave}/{snap.laneLength}
      </span>

      <span
        style={{
          color: gapColor,
          fontWeight: 700,
          padding: '1px 6px',
          border: `1px solid ${gapColor}`,
          borderRadius: '3px',
          minWidth: '32px',
          textAlign: 'center',
        }}
      >
        {gapPrefix}{snap.laneGap}
      </span>

      <span style={{ color: SNAKE_EYES_PALETTE.gold, minWidth: '32px' }}>
        {snap.counterfactualWave}/{snap.laneLength}
      </span>
      <LaneBar pct={cfPct} color={SNAKE_EYES_PALETTE.gold} />
      <span style={{ color: SNAKE_EYES_PALETTE.gold, fontWeight: 600, letterSpacing: '1px' }}>
        CF
      </span>
    </div>
  );
}

function LaneBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        height: '6px',
        background: SNAKE_EYES_PALETTE.meterTrack,
        borderRadius: '3px',
        overflow: 'hidden',
        minWidth: '80px',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}
