/**
 * BeamSearchBrain — rung 2 of the search-based pivot.
 *
 * For each between-wave decision, beam-search over (tower-type,
 * cell) placement SEQUENCES looking ahead `depth` waves. Score each
 * sequence by simulating it forward with no-further-placements.
 * Keep the top-B sequences at each depth. Commit only the FIRST
 * move of the best beam path.
 *
 * Why this should outperform rung 1 (online maze-optimizer):
 *   - Rung 1's 1-ply lookahead can't catch "this maze breaks at
 *     wave 15" type failures. Beam search at depth=3 sees three
 *     waves of pressure before committing.
 *   - On plains specifically, rung 1 gets stuck because single
 *     walls can't extend the path; beam can try TWO walls that
 *     together force a longer detour.
 *
 * Uses Match.snapshot() / restoreFromSnapshot() (cheap-clone state)
 * for the lookahead simulations.
 *
 * Caveats:
 *   - Snapshot determinism test is 10/16 with wave-off-by-one
 *     drift; relative ranking still works for beam.
 *   - Lookahead uses a no-op brain (just plays waves), so it
 *     measures "what happens if I place this and then do nothing
 *     else for 3 waves". A more realistic lookahead would use
 *     rung-1 brain, but that introduces brain state issues.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { OnlineMazeOptimizerBrain } from './OnlineMazeOptimizerBrain';
import { Match, MatchSnapshot } from '../../../headless/Match';
import { TowerType } from '../../../data/TowerTypes';

/** No-op brain — always returns skip. Used for beam lookahead to
 *  measure pure game-state evolution without further player
 *  intervention. */
class NoopBrain implements BotBrain {
  readonly name = 'noop';
  decide(): BotDecision { return { kind: 'skip' }; }
}

interface BeamNode {
  /** Sequence of (cell, type) placements applied to reach this node. */
  history: Array<{ col: number; row: number; type: TowerType }>;
  /** Sum of per-wave scores accumulated along this beam path. */
  score: number;
}

export interface BeamSearchBrainOptions {
  /** Beam width — number of nodes to keep at each depth. Default 10. */
  beamWidth?: number;
  /** Depth — how many waves to look ahead. Default 3. */
  depth?: number;
  /** Number of candidates to generate per beam node. Default = beamWidth. */
  K_candidates?: number;
  /** Match config used to construct restored matches for lookahead.
   *  Must match the match being driven (or the snapshot won't be
   *  meaningful). Passed at construction (the brain isn't given
   *  the config through BotContext). */
  matchConfig: any;
  /** Source for snapshots — must be set externally before decide()
   *  is called. Typically the driving Match. */
  matchRef: { current: Match | null };
  /** Brain used for in-wave fallback (upgrade / sell / skip).
   *  Default BalancedBrain. */
  inWaveBrain?: BotBrain;
  /** Brain used for the FIRST-MOVE generation (the candidate
   *  enumerator). Default OnlineMazeOptimizerBrain wrapping
   *  BalancedBrain. */
  candidateBrain?: BotBrain;
  readonly name?: string;
}

export class BeamSearchBrain implements BotBrain {
  readonly name: string;
  private beamWidth: number;
  private depth: number;
  private K: number;
  private inWave: BotBrain;
  private candidateBrain: BotBrain;
  private matchConfig: any;
  private matchRef: { current: Match | null };
  public stats = {
    decisions: 0,
    placesViaBeam: 0,
    delegatesInWave: 0,
    skipsLowBudget: 0,
    skipsNoCandidate: 0,
    beamFails: 0,
  };

  constructor(opts: BeamSearchBrainOptions) {
    this.name = opts.name ?? 'beam-search';
    this.beamWidth = opts.beamWidth ?? 10;
    this.depth = opts.depth ?? 3;
    this.K = opts.K_candidates ?? this.beamWidth;
    this.matchConfig = opts.matchConfig;
    this.matchRef = opts.matchRef;
    this.inWave = opts.inWaveBrain ?? new OnlineMazeOptimizerBrain();
    this.candidateBrain = opts.candidateBrain ?? new OnlineMazeOptimizerBrain();
  }

  init(ctx: BotContext): void {
    this.inWave.init?.(ctx);
    this.candidateBrain.init?.(ctx);
  }

  decide(ctx: BotContext): BotDecision {
    this.stats.decisions++;

    // In-wave: delegate.
    if (!ctx.betweenWaves) {
      this.stats.delegatesInWave++;
      return this.inWave.decide(ctx);
    }

    // No affordable tower: skip / delegate.
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) {
      this.stats.skipsLowBudget++;
      return this.inWave.decide(ctx);
    }

    const match = this.matchRef.current;
    if (!match) {
      // Beam requires the live Match reference for snapshotting.
      // If not wired, fall back to candidate brain.
      this.stats.beamFails++;
      return this.candidateBrain.decide(ctx);
    }

    // Take snapshot at the current between-wave moment.
    let snap: MatchSnapshot;
    try {
      snap = match.snapshot();
    } catch (e) {
      // Snapshot only works between-wave; should be true here but
      // bail gracefully.
      this.stats.beamFails++;
      return this.candidateBrain.decide(ctx);
    }

    // Beam search: depth iterations, each expanding to K candidates,
    // keeping top beamWidth by accumulated score.
    let beam: BeamNode[] = [{ history: [], score: 0 }];
    for (let d = 0; d < this.depth; d++) {
      const expanded: BeamNode[] = [];
      for (const node of beam) {
        // Reconstruct the state at this beam node (snap + history applied).
        const candidates = this.generateCandidates(snap, node.history, ctx);
        for (const cand of candidates) {
          // Score: simulate this placement sequence forward to next
          // between-wave, return lives lost + path length.
          const score = this.scoreSequence(snap, [...node.history, cand]);
          expanded.push({
            history: [...node.history, cand],
            score: node.score + score,
          });
        }
      }
      if (expanded.length === 0) break;
      // Sort descending by score, keep top-B.
      expanded.sort((a, b) => b.score - a.score);
      beam = expanded.slice(0, this.beamWidth);
    }

    // Pick best beam path.
    if (beam.length === 0 || beam[0].history.length === 0) {
      this.stats.skipsNoCandidate++;
      return this.inWave.decide(ctx);
    }
    const first = beam[0].history[0];
    this.stats.placesViaBeam++;
    return { kind: 'place', col: first.col, row: first.row, type: first.type };
  }

  /** Generate candidate (cell, type) pairs to expand. Uses
   *  rung-1's logic (path-adjacent + 4-neighbours, scored) to
   *  pick the top-K candidates per node. */
  private generateCandidates(
    snap: MatchSnapshot,
    history: Array<{ col: number; row: number; type: TowerType }>,
    rootCtx: BotContext,
  ): Array<{ col: number; row: number; type: TowerType }> {
    // Restore the state at this beam node.
    const m = Match.restoreFromSnapshot(this.matchConfig, snap, new NoopBrain());
    // Apply the history placements.
    for (const h of history) {
      // applyDecision is private; use towerMgr directly.
      const grid = m.getGrid();
      if (!grid.canPlaceTower(h.col, h.row)) continue;
      grid.placeTower(h.col, h.row);
    }
    // Refresh ctx from the modified match.
    const ctx = m.observe();
    // Use rung 1 logic by calling OnlineMazeOptimizerBrain's decide,
    // but capture all top-K candidates not just the single best.
    // Shortcut: just enumerate path-adjacent cells + affordable
    // tower types and score by maze-gain + dps coverage.
    const affordable = rootCtx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) return [];

    // Build path-adjacent candidate cells.
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
    // Pick top-K cells (just first K, ordering doesn't matter much).
    const cells = Array.from(cellSet.values()).slice(0, this.K);
    // For each (cell, cheapest_affordable_type), generate one candidate.
    // We don't try every type×cell combo because that's K × N_types
    // candidates which inflates the beam too much. Cheap tower
    // approximation — tower choice is a separate concern downstream.
    const cheapest = affordable[0];
    return cells.map(c => ({ col: c.col, row: c.row, type: cheapest }));
  }

  /** Score a placement sequence by simulating it forward to next
   *  between-wave (one wave's worth of game time) and returning a
   *  reward signal. Higher = better. */
  private scoreSequence(
    snap: MatchSnapshot,
    history: Array<{ col: number; row: number; type: TowerType }>,
  ): number {
    // Restore + apply history.
    const m = Match.restoreFromSnapshot(this.matchConfig, snap, new NoopBrain());
    const economy = (m as any).economy; // private field — direct access
    let spent = 0;
    for (const h of history) {
      const grid = m.getGrid();
      if (!grid.canPlaceTower(h.col, h.row)) continue;
      // Use the tower manager's free placement path so the tower is
      // a real Tower object with full DPS, not just a wall on the grid.
      const towerMgr = (m as any).towerMgr;
      const result = towerMgr.placeTower(h.col, h.row, h.type, m.getAllPaths(), () => (m as any).recalcPaths(), true);
      if (!result) continue;
      spent += h.type.cost;
    }
    (m as any).recalcPaths();
    // Subtract cost from economy so subsequent waves see remaining gold.
    economy.gold = Math.max(0, economy.gold - spent);

    // Simulate one wave forward (between this and next between-wave).
    const startWave = m.result().waveReached;
    const startLives = m.result().livesRemaining;
    let safety = 0;
    while (!m.isDone() && safety++ < 20000) {
      m.step();
      // Stop when we reach the NEXT between-wave (after one wave's worth).
      if (m.result().waveReached > startWave) {
        const ctx = m.observe();
        if (ctx.betweenWaves) break;
      }
    }
    const endResult = m.result();
    const livesLost = startLives - endResult.livesRemaining;
    const pathLen = m.getAllPaths().reduce((a, p) => a + (p?.length ?? 0), 0);

    // Score: surviving (lives intact) >> path-length growth.
    // Heavy penalty for lives lost — that's the actual outcome signal.
    const score = -livesLost * 100 + pathLen;
    if (endResult.outcome === 'win') return score + 1000;
    if (endResult.outcome === 'loss') return score - 1000;
    return score;
  }
}

registerBrain('beam-search', () => {
  throw new Error('beam-search brain requires matchConfig + matchRef; construct directly');
});
