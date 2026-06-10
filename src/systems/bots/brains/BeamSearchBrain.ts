/**
 * BeamSearchBrain — rung 2 of the search-based pivot.
 *
 * v2 design (after v1's NoopBrain lookahead proved too myopic):
 *
 * Reframed from "beam over sequences" to "K candidates, evaluated
 * by N-wave smart rollout". The structure is closer to MCTS-light
 * than classical beam search:
 *
 * For each between-wave decision:
 *   1. Generate K candidate FIRST moves (path-adjacent cells +
 *      affordable tower types). Includes "let rung1 decide" as
 *      one of the candidates so the brain can choose to skip
 *      committing to a specific placement.
 *   2. For each candidate, snapshot + restore, apply the placement,
 *      then run rung1 brain forward for `lookaheadWaves` waves.
 *   3. Score each candidate by (wave_reached, lives_remaining,
 *      path_length, win/loss).
 *   4. Commit the best-scoring candidate.
 *
 * Why this works where v1's NoopBrain didn't:
 *   - The lookahead reflects "what if I commit to this candidate
 *     AND THEN PLAY NORMALLY". NoopBrain meant "what if I commit
 *     to this then do nothing" which is artificially defensive.
 *   - Multi-wave evaluation catches "this maze breaks at wave 15"
 *     type failures that single-wave lookahead misses.
 *   - Including "rung1 default" as a candidate gives the brain
 *     the option to defer when rung1 already has a great choice.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { OnlineMazeOptimizerBrain } from './OnlineMazeOptimizerBrain';
import { BalancedBrain } from './BalancedBrain';
import { Match, MatchSnapshot } from '../../../headless/Match';
import { TowerType } from '../../../data/TowerTypes';

export interface BeamCandidate {
  /** null = "defer to rung1 — don't commit to a specific placement" */
  placement: { col: number; row: number; type: TowerType } | null;
  label: string;
}

export interface ScoredCandidate extends BeamCandidate {
  score: number;
  waveReached: number;
  livesRemaining: number;
  outcome: 'win' | 'loss' | 'timeout' | 'error';
  pathLen: number;
}

export interface BeamSearchBrainOptions {
  /** Number of candidate first-moves to evaluate per decision.
   *  Includes "rung1 default" as one of these.
   *  Default 10. */
  beamWidth?: number;
  /** How many waves to simulate forward when scoring each
   *  candidate. More = better signal but slower. Default 3. */
  lookaheadWaves?: number;
  /** Required for snapshot — the live Match being driven. */
  matchConfig: any;
  matchRef: { current: Match | null };
  /** Brain used for in-wave fallback (upgrade / sell). Default
   *  BalancedBrain. */
  inWaveBrain?: BotBrain;
  readonly name?: string;
}

export class BeamSearchBrain implements BotBrain {
  readonly name: string;
  private beamWidth: number;
  private lookaheadWaves: number;
  private matchConfig: any;
  private matchRef: { current: Match | null };
  private inWave: BotBrain;
  /** Exposed for data-recording: the full scored candidate list from
   *  the most recent between-wave decide(). Stale when the last call
   *  was in-wave (nulled every decide() to prevent reading old data). */
  public lastScored: ScoredCandidate[] | null = null;
  public stats = {
    decisions: 0,
    placesViaBeam: 0,
    delegatesInWave: 0,
    skipsLowBudget: 0,
    deferredToRung1: 0,
    beamFails: 0,
  };

  constructor(opts: BeamSearchBrainOptions) {
    this.name = opts.name ?? 'beam-search-v2';
    this.beamWidth = opts.beamWidth ?? 10;
    this.lookaheadWaves = opts.lookaheadWaves ?? 3;
    this.matchConfig = opts.matchConfig;
    this.matchRef = opts.matchRef;
    this.inWave = opts.inWaveBrain ?? new BalancedBrain();
  }

  init(ctx: BotContext): void {
    this.inWave.init?.(ctx);
  }

  decide(ctx: BotContext): BotDecision {
    this.stats.decisions++;
    this.lastScored = null; // clear stale data from prior call

    if (!ctx.betweenWaves) {
      this.stats.delegatesInWave++;
      return this.inWave.decide(ctx);
    }

    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) {
      this.stats.skipsLowBudget++;
      return this.inWave.decide(ctx);
    }

    const match = this.matchRef.current;
    if (!match) {
      this.stats.beamFails++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }

    let snap: MatchSnapshot;
    try {
      snap = match.snapshot();
    } catch (e) {
      this.stats.beamFails++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }

    // Build candidate list: K-1 explicit placements + 1 "defer-to-rung1".
    const candidates = this.generateCandidates(ctx);
    if (candidates.length === 0) {
      this.stats.beamFails++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }

    // Score each candidate by N-wave smart lookahead.
    const scored: ScoredCandidate[] = candidates.map(c => this.scoreCandidate(snap, c));

    // Store for data-recording (BeamDataRecorder reads this after decide()).
    this.lastScored = scored;

    // Sort descending by score.
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // If best is "defer to rung1", let rung1 decide here in real life.
    if (best.placement === null) {
      this.stats.deferredToRung1++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }

    this.stats.placesViaBeam++;
    return {
      kind: 'place',
      col: best.placement.col,
      row: best.placement.row,
      type: best.placement.type,
    };
  }

  /** Public access to beam's scored candidate list — used by
   *  QRankerBeamBrain to blend Q-net values with beam's rollout
   *  scores. Returns null if preconditions fail (mid-wave, no
   *  affordable tower, can't snapshot, no candidates). The caller
   *  is responsible for falling back when this returns null. */
  public scoreCandidates(ctx: BotContext): ScoredCandidate[] | null {
    if (!ctx.betweenWaves) { this.lastScored = null; return null; }
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) { this.lastScored = null; return null; }
    const match = this.matchRef.current;
    if (!match) { this.lastScored = null; return null; }
    let snap: MatchSnapshot;
    try { snap = match.snapshot(); } catch { this.lastScored = null; return null; }
    const candidates = this.generateCandidates(ctx);
    if (candidates.length === 0) { this.lastScored = null; return null; }
    this.lastScored = candidates.map(c => this.scoreCandidate(snap, c));
    return this.lastScored;
  }

  /** Build candidate set: top-(K-1) path-adjacent placements with
   *  cheapest affordable tower + 1 "defer-to-rung1" sentinel. */
  private generateCandidates(ctx: BotContext): BeamCandidate[] {
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) return [];
    const cheapest = affordable[0];

    // Path-adjacent cells (path cells + 4-neighbours — same as rung 1).
    const cellSet = new Map<string, Cell>();
    const addCell = (col: number, row: number) => {
      if (col < 0 || col >= ctx.grid.cols || row < 0 || row >= ctx.grid.rows) return;
      if (!ctx.grid.canPlaceTower(col, row)) return;
      cellSet.set(`${col},${row}`, { col, row });
    };
    for (const p of ctx.allPaths) {
      if (!p) continue;
      for (const cell of p) {
        addCell(cell.col, cell.row);
        addCell(cell.col + 1, cell.row);
        addCell(cell.col - 1, cell.row);
        addCell(cell.col, cell.row + 1);
        addCell(cell.col, cell.row - 1);
      }
    }
    const cells = Array.from(cellSet.values());

    const out: BeamCandidate[] = [];
    // Always include "defer to rung1" — gives the brain the option
    // to skip explicit placement when rung1's choice is already best.
    out.push({ placement: null, label: 'defer-rung1' });

    // Type variety: include the K most expensive affordable types
    // (more DPS-per-cell at the cost of more gold). For each type,
    // try the top-N cells. K * N + 1 candidates total.
    //
    // Why: previously every candidate used arcane_bolt (cheapest).
    // Beam never compared "should this be a bolt vs a frost vs a
    // storm at this cell?" Including type variety lets the lookahead
    // score discover that more expensive DPS towers preserve more
    // lives, even at the cost of slower wall coverage.
    const typesToConsider: TowerType[] = [];
    // Always include cheapest (often the right call for pure walls).
    typesToConsider.push(affordable[0]);
    // Include the most-expensive affordable + the middle one.
    // Total ≤3 types so 3 cells × 3 types ≤9 candidates.
    if (affordable.length >= 3) typesToConsider.push(affordable[Math.floor(affordable.length / 2)]);
    if (affordable.length >= 2) typesToConsider.push(affordable[affordable.length - 1]);
    // De-duplicate by id (in case affordable.length=1, etc.).
    const uniqTypes = [...new Map(typesToConsider.map(t => [t.id, t])).values()];

    const remainingSlots = Math.max(1, this.beamWidth - 1);
    const cellsPerType = Math.max(1, Math.floor(remainingSlots / uniqTypes.length));
    const topCells = cells.slice(0, cellsPerType);
    for (const c of topCells) {
      for (const t of uniqTypes) {
        if (out.length >= this.beamWidth) break;
        out.push({
          placement: { col: c.col, row: c.row, type: t },
          label: `${c.col},${c.row}/${t.id}`,
        });
      }
      if (out.length >= this.beamWidth) break;
    }
    return out;
  }

  /** Score one candidate by simulating it forward `lookaheadWaves`
   *  waves with a smart brain (OnlineMazeOptimizerBrain) playing.
   *  Returns higher score = more desirable. */
  private scoreCandidate(snap: MatchSnapshot, cand: BeamCandidate): ScoredCandidate {
    // Use a fresh OnlineMazeOptimizerBrain for lookahead — it
    // continues the maze-building strategy after our committed
    // first move.
    const lookaheadBrain = new OnlineMazeOptimizerBrain();
    const m = Match.restoreFromSnapshot(this.matchConfig, snap, lookaheadBrain);

    // Apply the first move (if any).
    if (cand.placement) {
      const grid = m.getGrid();
      const towerMgr = (m as any).towerMgr;
      if (grid.canPlaceTower(cand.placement.col, cand.placement.row)) {
        // Use free=true since we'll adjust gold separately.
        towerMgr.placeTower(cand.placement.col, cand.placement.row, cand.placement.type, m.getAllPaths(), () => (m as any).recalcPaths(), true);
        (m as any).recalcPaths();
        const economy = (m as any).economy;
        economy.gold = Math.max(0, economy.gold - cand.placement.type.cost);
      }
    }

    // Now simulate forward for lookaheadWaves more waves OR until
    // match ends.
    const startWave = m.result().waveReached;
    const targetWave = Math.min(startWave + this.lookaheadWaves, this.matchConfig.waveCount ?? 25);
    let safety = 0;
    const SAFETY_CAP = 50000;
    while (!m.isDone() && safety++ < SAFETY_CAP) {
      m.step();
      if (m.result().waveReached >= targetWave) {
        // Stop at the NEXT between-wave after reaching target wave.
        const ctx = m.observe();
        if (ctx.betweenWaves) break;
      }
    }
    const r = m.result();
    const pathLen = m.getAllPaths().reduce((a, p) => a + (p?.length ?? 0), 0);

    // Score function: heavily prioritize survival, then progress.
    // - Lives remaining (per match) = primary
    // - Wave reached = secondary
    // - Outcome bonus: win >> survive >> loss
    let score = r.livesRemaining * 100 + r.waveReached * 10 + pathLen;
    if (r.outcome === 'win') score += 10000;
    else if (r.outcome === 'loss') score -= 1000;

    return {
      ...cand,
      score,
      waveReached: r.waveReached,
      livesRemaining: r.livesRemaining,
      outcome: r.outcome,
      pathLen,
    };
  }
}

registerBrain('beam-search', () => {
  throw new Error('beam-search brain requires matchConfig + matchRef; construct directly');
});
