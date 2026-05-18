/**
 * MirrorLaneController — Snake Eyes' paired-grid mechanic.
 *
 * Used in two places:
 *
 *   1. **M10 Setpiece 2 — Mirror Lane.** Two grids run side-by-side
 *      for the duration of the setpiece. Towers the player places
 *      on their grid are mirrored onto the Counterfactual's (at
 *      half stats but auto-placed). Each wave runs on BOTH grids
 *      simultaneously; both leak counts + both kill counts are
 *      tracked. The side with the cleaner clear gains ground.
 *
 *   2. **Wager card 12 — The Mirror Wager.** If the player accepts
 *      this Wager on a regular mission (excluding M10 — see plan
 *      doc), a mini Mirror Lane runs FOR THAT MISSION. Beat the
 *      Counterfactual's grid faster → triple Debt paydown
 *      (`mirrorWagerWon: true` written to `MissionResult.custom`).
 *      Lose to his grid → instant mission loss.
 *
 * Both call sites share the same state-machine + scoring logic.
 * GameScene constructs one controller per relevant
 * mission/setpiece, ticks it each frame, and reads:
 *
 *   - `recordPlayerClear(waveIdx, leaks)`
 *   - `recordCounterfactualClear(waveIdx, leaks)`
 *   - `getSnapshot()` — current player/CF wave + score gap
 *   - `isResolved()` — true once a winner is decided
 *   - `getWinner()` — 'player' / 'counterfactual' / null (in-progress)
 *
 * Divergence bias (M10 only): when the controller is constructed
 * with `divergenceBias` > 0, the Counterfactual's wave pressure
 * scales DOWN proportionally (the Counterfactual coasts when the
 * player has been reckless), and the player's UP. Default 0
 * (Mirror Wager card on regular mission has no bias).
 *
 * Pure logic; no Phaser. GameScene wires the actual creep-spawn
 * pressure mapping from `getPressureCoefficients()`.
 */

// ─── Types ───────────────────────────────────────────────────────

export type MirrorLaneWinner = 'player' | 'counterfactual' | null;

export interface MirrorLaneSnapshot {
  playerWave: number;
  counterfactualWave: number;
  playerLeaks: number;
  counterfactualLeaks: number;
  /** Positive = player ahead, negative = counterfactual ahead. */
  laneGap: number;
  winner: MirrorLaneWinner;
}

export interface MirrorLaneOptions {
  /** Number of waves each lane must complete to "win the lane."
   *  M10 setpiece 2 uses 5; a mid-campaign Mirror Wager runs the
   *  full mission's wave count (caller supplies). */
  laneLength?: number;
  /** Bias applied to the Counterfactual's pressure. Range 0..1;
   *  0 = no bias (equal), higher = the Counterfactual's lane has
   *  LESS pressure (player handicapped). M10 sets this from the
   *  player's lifetime Divergence — higher Divergence → harsher
   *  player grid, lighter Counterfactual grid (the recklessness
   *  costs you here). */
  divergenceBias?: number;
}

/** Pressure coefficients GameScene applies to wave spawn counts. */
export interface PressureCoefficients {
  playerPressure: number;       // 1.0 default; higher = harder wave
  counterfactualPressure: number;
}

const DEFAULTS: Required<MirrorLaneOptions> = {
  laneLength: 5,
  divergenceBias: 0,
};

// ─── Controller ──────────────────────────────────────────────────

export class MirrorLaneController {
  private readonly laneLength: number;
  private readonly divergenceBias: number;
  private _playerWave: number = 0;
  private _counterfactualWave: number = 0;
  private _playerLeaks: number = 0;
  private _counterfactualLeaks: number = 0;
  private _winner: MirrorLaneWinner = null;

  constructor(opts: MirrorLaneOptions = {}) {
    this.laneLength = opts.laneLength ?? DEFAULTS.laneLength;
    // Clamp divergenceBias 0..1 — defensive against caller misuse.
    const bias = opts.divergenceBias ?? DEFAULTS.divergenceBias;
    this.divergenceBias = Math.max(0, Math.min(1, Number.isFinite(bias) ? bias : 0));
  }

  /** Pressure-coefficient pair the caller applies to per-lane wave
   *  spawn counts. `playerPressure` grows with bias (the player's
   *  lane gets harder); `counterfactualPressure` shrinks with bias. */
  getPressureCoefficients(): PressureCoefficients {
    // bias=0   → (1.0, 1.0)
    // bias=0.5 → (1.25, 0.75)
    // bias=1.0 → (1.5, 0.5)  — extreme; M10 with maxed Divergence
    return {
      playerPressure: 1 + this.divergenceBias * 0.5,
      counterfactualPressure: 1 - this.divergenceBias * 0.5,
    };
  }

  /** Record that the player cleared one wave. `leaks` is the count
   *  of creeps that escaped during that wave (0 for clean). */
  recordPlayerClear(leaks: number): void {
    if (this._winner !== null) return;
    this._playerWave += 1;
    this._playerLeaks += Math.max(0, leaks);
    this._checkResolution();
  }

  /** Record that the Counterfactual cleared one wave on his lane. */
  recordCounterfactualClear(leaks: number): void {
    if (this._winner !== null) return;
    this._counterfactualWave += 1;
    this._counterfactualLeaks += Math.max(0, leaks);
    this._checkResolution();
  }

  /** Snapshot for HUD + tests. */
  getSnapshot(): MirrorLaneSnapshot {
    return {
      playerWave: this._playerWave,
      counterfactualWave: this._counterfactualWave,
      playerLeaks: this._playerLeaks,
      counterfactualLeaks: this._counterfactualLeaks,
      laneGap: this._playerWave - this._counterfactualWave,
      winner: this._winner,
    };
  }

  isResolved(): boolean { return this._winner !== null; }
  getWinner(): MirrorLaneWinner { return this._winner; }

  /** Test/edge-case hook: force a winner (used by GameScene when
   *  the mission ends prematurely — e.g. Mirror Wager card mission
   *  ends with the regular win condition, the controller doesn't
   *  always reach `laneLength`). */
  forceResolve(winner: MirrorLaneWinner): void {
    if (this._winner !== null) return;
    this._winner = winner;
  }

  // ─── Internals ───────────────────────────────────────────────

  private _checkResolution(): void {
    // First to laneLength wins. If both crossed on the same call,
    // tie-break by leak count (fewer leaks wins). On both equal,
    // fall back to player-wins (favours forward motion).
    const pDone = this._playerWave >= this.laneLength;
    const cDone = this._counterfactualWave >= this.laneLength;
    if (!pDone && !cDone) return;
    if (pDone && !cDone) { this._winner = 'player'; return; }
    if (cDone && !pDone) { this._winner = 'counterfactual'; return; }
    // Both done on the same tick — extremely rare but handled.
    if (this._playerLeaks < this._counterfactualLeaks) {
      this._winner = 'player';
    } else if (this._counterfactualLeaks < this._playerLeaks) {
      this._winner = 'counterfactual';
    } else {
      this._winner = 'player';
    }
  }
}
