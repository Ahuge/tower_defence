/**
 * BeamVNetBrain — rung 3 of the search-based pivot.
 *
 * Same structure as BeamSearchBrain (v2) but replaces the
 * 3-wave forward-simulation scoring with a fast V network
 * forward pass. ~100× faster per scoring call, so we can
 * afford larger beam width / explore many more candidates.
 *
 * Flow per between-wave decision:
 *   1. Generate K candidates (path-adjacent + cheapest tower
 *      + "defer to rung 1" option).
 *   2. For each candidate, snapshot + restore + apply candidate's
 *      placement. NO forward simulation.
 *   3. Build obs tensor from the post-placement state. Forward V
 *      network. Use V(state) as the score.
 *   4. Commit candidate with highest V.
 *
 * The V network was trained on (state, match outcome) pairs from
 * self-play. V(state) → P(win) * 2 - 1 ∈ (-1, 1).
 *
 * Caveat: V is trained on states the data-gen brains REACHED.
 * If beam takes the agent to states V hasn't seen, predictions
 * are unreliable. Should be mostly OK because data was generated
 * by online-opt + beam-d2-w5 which produce similar state
 * distributions to what BeamVNet visits.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { OnlineMazeOptimizerBrain } from './OnlineMazeOptimizerBrain';
import { BalancedBrain } from './BalancedBrain';
import { Match, MatchSnapshot } from '../../../headless/Match';
import { TowerType } from '../../../data/TowerTypes';
import { fromMatch } from '../learning/ObsTensor';
import * as ort from 'onnxruntime-node';

interface Candidate {
  placement: { col: number; row: number; type: TowerType } | null;
  label: string;
}

interface ScoredCandidate extends Candidate {
  score: number;
}

export interface BeamVNetBrainOptions {
  /** Path to .onnx file. */
  vnetModelPath: string;
  /** Number of candidates to evaluate per decision. Default 20
   *  (V is fast, can afford more). */
  beamWidth?: number;
  matchConfig: any;
  matchRef: { current: Match | null };
  inWaveBrain?: BotBrain;
  readonly name?: string;
}

let cachedSession: ort.InferenceSession | null = null;
let cachedSessionPath: string | null = null;

export async function preloadVNet(modelPath: string): Promise<ort.InferenceSession> {
  if (cachedSession && cachedSessionPath === modelPath) return cachedSession;
  cachedSession = await ort.InferenceSession.create(modelPath);
  cachedSessionPath = modelPath;
  return cachedSession;
}

export class BeamVNetBrain implements BotBrain {
  readonly name: string;
  private beamWidth: number;
  private matchConfig: any;
  private matchRef: { current: Match | null };
  private inWave: BotBrain;
  private vnetSession: ort.InferenceSession | null = null;
  private vnetModelPath: string;
  public stats = {
    decisions: 0,
    placesViaBeam: 0,
    delegatesInWave: 0,
    skipsLowBudget: 0,
    deferredToRung1: 0,
    sessionLoads: 0,
    beamFails: 0,
  };

  constructor(opts: BeamVNetBrainOptions) {
    this.name = opts.name ?? 'beam-vnet';
    this.beamWidth = opts.beamWidth ?? 20;
    this.matchConfig = opts.matchConfig;
    this.matchRef = opts.matchRef;
    this.inWave = opts.inWaveBrain ?? new BalancedBrain();
    this.vnetModelPath = opts.vnetModelPath;
  }

  init(ctx: BotContext): void {
    this.inWave.init?.(ctx);
  }

  async ensureSession(): Promise<ort.InferenceSession> {
    if (this.vnetSession) return this.vnetSession;
    this.vnetSession = await preloadVNet(this.vnetModelPath);
    this.stats.sessionLoads++;
    return this.vnetSession;
  }

  // Sync decide is required by BotBrain. We can't await onnx here.
  // The eval harness must call decideAsync (registered via that path)
  // or this brain's sync decide returns a fallback.
  decide(ctx: BotContext): BotDecision {
    if (!ctx.betweenWaves) {
      this.stats.delegatesInWave++;
      return this.inWave.decide(ctx);
    }
    if (!this.vnetSession) {
      // Session not loaded — fall back to rung 1.
      this.stats.beamFails++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }
    // Synchronous decide path: can't await ONNX. Defer to rung 1.
    return new OnlineMazeOptimizerBrain().decide(ctx);
  }

  /** Async decide — this is the real one. Match calls this via
   *  decideAsync if the brain exposes it. */
  async decideAsync(ctx: BotContext): Promise<BotDecision> {
    this.stats.decisions++;

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

    await this.ensureSession();
    const session = this.vnetSession!;

    const candidates = this.generateCandidates(ctx);
    if (candidates.length === 0) {
      this.stats.beamFails++;
      return new OnlineMazeOptimizerBrain().decide(ctx);
    }

    // Score each candidate: restore + apply placement + V(state).
    const scored: ScoredCandidate[] = [];
    for (const cand of candidates) {
      const score = await this.scoreCandidate(snap, cand, session);
      scored.push({ ...cand, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

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

  private generateCandidates(ctx: BotContext): Candidate[] {
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) return [];
    const cheapest = affordable[0];

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

    const out: Candidate[] = [];
    out.push({ placement: null, label: 'defer-rung1' });
    const slots = Math.max(1, this.beamWidth - 1);
    for (const c of cells.slice(0, slots)) {
      out.push({
        placement: { col: c.col, row: c.row, type: cheapest },
        label: `${c.col},${c.row}/${cheapest.id}`,
      });
    }
    return out;
  }

  private async scoreCandidate(snap: MatchSnapshot, cand: Candidate, session: ort.InferenceSession): Promise<number> {
    const m = Match.restoreFromSnapshot(this.matchConfig, snap, this.inWave);

    if (cand.placement) {
      const grid = m.getGrid();
      const towerMgr = (m as any).towerMgr;
      if (grid.canPlaceTower(cand.placement.col, cand.placement.row)) {
        towerMgr.placeTower(cand.placement.col, cand.placement.row, cand.placement.type, m.getAllPaths(), () => (m as any).recalcPaths(), true);
        (m as any).recalcPaths();
        const economy = (m as any).economy;
        economy.gold = Math.max(0, economy.gold - cand.placement.type.cost);
      }
    }

    // Build obs tensor from the post-placement state.
    const obs = fromMatch(m);
    const gridTensor = new ort.Tensor('float32', obs.grid, [1, 14, 26, 36]);
    const globalsTensor = new ort.Tensor('float32', obs.globals, [1, 25]);
    const output = await session.run({
      grid: gridTensor,
      globals: globalsTensor,
    });
    const v = output.value.data[0] as number;
    return v;
  }
}

registerBrain('beam-vnet', () => {
  throw new Error('beam-vnet requires vnetModelPath + matchConfig + matchRef; construct directly');
});
