/**
 * CounterfactualMirrorController — Snake Eyes M10 final-mission
 * three-setpiece state machine.
 *
 * Drives the M10 mission across three sequential setpieces:
 *
 *   1. **Approach** — ≤5 standard waves. Player defends the cathedral-
 *      casino's outer hall. Auto-Siege; standard win condition for
 *      this segment (no leaks ⇒ progress, lives-zero ⇒ mission loss).
 *
 *   2. **Mirror Lane** — paired grid via MirrorLaneController. Player
 *      + Counterfactual each clear their own waves; whoever crosses
 *      laneLength first wins. Divergence-bias drawn from
 *      SnakeEyesState.lastMissionDivergence (so M9's risk posture
 *      bleeds into M10's Mirror Lane pressure mapping). Counter-
 *      factual wins this lane → mission loss; player wins → proceed.
 *
 *   3. **The Table** — single boss creep (The Counterfactual). HP +
 *      tactics scale on the lifetime Pactbook tally + final
 *      Divergence. Standard combat resolution; player kills him ⇒
 *      mission won + WinOutright if Mirror Lane was won decisively
 *      + epilogue composer reads SnakeEyesState fields for the
 *      personalised closing paragraph.
 *
 * State machine: 'approach' → 'mirror_lane' → 'table' → 'complete'.
 * Loss states: 'lost_approach' / 'lost_mirror_lane' / 'lost_table'.
 *
 * GameScene calls into:
 *   - advanceApproachWave / failApproach
 *   - mirror lane delegated through getMirrorLaneController()
 *   - completeMirrorLane (called when MirrorLane resolves)
 *   - killCounterfactualBoss / failTable
 *   - getStage / getSnapshot — for HUD readout + tests
 *
 * Pure logic. The Counterfactual's HP/tactics scaling formula is
 * locked here (sum of accepted-Wager-tier scores + final
 * Divergence) so future balance changes have a single edit point.
 */

import { MirrorLaneController } from './MirrorLaneController';
import {
  getSnakeEyesState,
  type PactbookTally,
} from './DebtTracker';

// ─── Types ───────────────────────────────────────────────────────

export type M10Stage =
  | 'approach'
  | 'mirror_lane'
  | 'table'
  | 'complete'
  | 'lost_approach'
  | 'lost_mirror_lane'
  | 'lost_table';

export interface M10Snapshot {
  stage: M10Stage;
  approachWavesCleared: number;
  approachWavesTotal: number;
  mirrorLane: ReturnType<MirrorLaneController['getSnapshot']>;
  bossHpRemaining: number;
  bossHpMax: number;
  /** True iff the Mirror Lane was won by ≥2 waves (Star-3 condition). */
  mirrorLaneWonOutright: boolean;
}

export interface M10Options {
  /** Wave count for the Approach setpiece. */
  approachWavesTotal?: number;
  /** Mirror Lane lane length. Plan: 5. */
  mirrorLaneLength?: number;
  /** Whether to apply Divergence-bias on the Mirror Lane (true on
   *  M10; false for the Mirror Wager card on regular missions). */
  applyDivergenceBias?: boolean;
}

const DEFAULTS: Required<M10Options> = {
  approachWavesTotal: 5,
  mirrorLaneLength: 5,
  applyDivergenceBias: true,
};

// ─── HP scaling ──────────────────────────────────────────────────

/** Compute the Counterfactual boss's max HP from the lifetime
 *  Pactbook tally. Acceptance-heavy runs leave a bigger boss
 *  (more "fuel" for him); decline-heavy runs leave a smaller boss
 *  (he's been starved). Hit-and-fold runs in the middle.
 *
 *  Base HP: 5000. Per accepted-T1: +100. Per accepted-T2: +200.
 *  Per accepted-T3: +400. Per declined: -150 (the decline starves
 *  him). Clamp to [2000, 12000] so M10 stays winnable in both
 *  extremes. */
export function counterfactualBossHp(tally: PactbookTally): number {
  const raw =
    5000 +
    tally.acceptedT1 * 100 +
    tally.acceptedT2 * 200 +
    tally.acceptedT3 * 400 -
    tally.declined * 150;
  return Math.max(2000, Math.min(12000, raw));
}

// ─── Controller ──────────────────────────────────────────────────

export class CounterfactualMirrorController {
  private readonly approachWavesTotal: number;
  private readonly mirrorLane: MirrorLaneController;
  private _stage: M10Stage = 'approach';
  private _approachCleared: number = 0;
  private _bossHpMax: number;
  private _bossHpRemaining: number;

  constructor(opts: M10Options = {}) {
    const approachWavesTotal = opts.approachWavesTotal ?? DEFAULTS.approachWavesTotal;
    const mirrorLaneLength = opts.mirrorLaneLength ?? DEFAULTS.mirrorLaneLength;
    const applyDivergenceBias = opts.applyDivergenceBias ?? DEFAULTS.applyDivergenceBias;

    this.approachWavesTotal = approachWavesTotal;
    const state = getSnakeEyesState();
    const divergenceBias = applyDivergenceBias
      ? Math.max(0, Math.min(1, state.lastMissionDivergence / 10))
      : 0;
    this.mirrorLane = new MirrorLaneController({
      laneLength: mirrorLaneLength,
      divergenceBias,
    });

    const hp = counterfactualBossHp(state.pactbookTally);
    this._bossHpMax = hp;
    this._bossHpRemaining = hp;
  }

  getStage(): M10Stage { return this._stage; }

  /** Read the wrapped Mirror Lane controller. GameScene drives
   *  record* calls directly on this during setpiece 2. */
  getMirrorLaneController(): MirrorLaneController { return this.mirrorLane; }

  // ─── Setpiece 1: Approach ────────────────────────────────────

  advanceApproachWave(): void {
    if (this._stage !== 'approach') return;
    this._approachCleared += 1;
    if (this._approachCleared >= this.approachWavesTotal) {
      this._stage = 'mirror_lane';
    }
  }

  failApproach(): void {
    if (this._stage !== 'approach') return;
    this._stage = 'lost_approach';
  }

  // ─── Setpiece 2: Mirror Lane ─────────────────────────────────

  /** Called when GameScene observes the MirrorLane resolving.
   *  Transitions to Table on player win; loss-state on cf win. */
  completeMirrorLane(): void {
    if (this._stage !== 'mirror_lane') return;
    const winner = this.mirrorLane.getWinner();
    if (winner === 'player') {
      this._stage = 'table';
    } else if (winner === 'counterfactual') {
      this._stage = 'lost_mirror_lane';
    }
    // null winner: still in progress — caller should keep ticking.
  }

  // ─── Setpiece 3: The Table ───────────────────────────────────

  damageBoss(damage: number): void {
    if (this._stage !== 'table') return;
    if (!Number.isFinite(damage) || damage <= 0) return;
    this._bossHpRemaining = Math.max(0, this._bossHpRemaining - damage);
    if (this._bossHpRemaining === 0) {
      this._stage = 'complete';
    }
  }

  failTable(): void {
    if (this._stage !== 'table') return;
    this._stage = 'lost_table';
  }

  // ─── Inspection ──────────────────────────────────────────────

  isWon(): boolean { return this._stage === 'complete'; }
  isLost(): boolean {
    return this._stage === 'lost_approach'
        || this._stage === 'lost_mirror_lane'
        || this._stage === 'lost_table';
  }

  /** Mirror Lane "won outright" predicate for Star 3. Player must
   *  have won + the wave gap at lane resolution must be ≥ 2. */
  mirrorLaneWonOutright(): boolean {
    const snap = this.mirrorLane.getSnapshot();
    return snap.winner === 'player' && snap.laneGap >= 2;
  }

  getSnapshot(): M10Snapshot {
    return {
      stage: this._stage,
      approachWavesCleared: this._approachCleared,
      approachWavesTotal: this.approachWavesTotal,
      mirrorLane: this.mirrorLane.getSnapshot(),
      bossHpRemaining: this._bossHpRemaining,
      bossHpMax: this._bossHpMax,
      mirrorLaneWonOutright: this.mirrorLaneWonOutright(),
    };
  }
}
