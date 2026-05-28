/**
 * PPORecorderBrain — wraps a PPOBrain and captures rollouts for
 * the PPO trainer.
 *
 * Per-decision row: obs, actionIdx, logProb, value, plus per-step
 * reward (filled in as match progresses) and `done` (set true on
 * the final row). Post-episode, the trainer computes returns +
 * GAE advantages from these.
 *
 * Reward shape (bc-plan D1=b confirmed for G3):
 *   per tick:        -0.0001  (mild time penalty, accumulated
 *                              between brain decisions)
 *   per wave clear:  +0.1
 *   on win:          +1.0
 *   on loss:         -1.0
 *
 * The recorder doesn't know the per-tick count between successive
 * decide() calls (the Match's between-waves loop fires multiple
 * decides between sim ticks). For the smoke loop we approximate
 * per-decision step penalty as -0.0001, and reconcile at episode
 * end with the match's final simTimeMs if needed.
 */
import { BotBrain, BotContext, BotDecision } from '../BotBrain';
import { Match } from '../../../headless/Match';
import { PPOBrain } from '../brains/PPOBrain';
import { fromMatch as obsFromMatch, Obs } from './ObsTensor';
import { getTowerType } from '../../../data/TowerTypes';

export interface PPORecordRow {
  matchId: string;
  tick: number;
  faction: string;
  obs: Obs;
  action: number;
  logProb: number;
  value: number;
  reward: number;
  done: boolean;
}

export interface RewardConfig {
  perDecisionTickPenalty: number;
  perWaveBonus: number;
  winBonus: number;
  lossPenalty: number;
  /** Per-cell reward for changes in total creep-path length. Positive
   *  for placements that lengthen the maze; negative for sells that
   *  shorten it. Attributed (one step late) to the action that
   *  caused the change. Default `0.005`: a 50-cell maze extension
   *  contributes ~0.25 reward, roughly one wave-clear's worth.
   *  Set to 0 to disable maze shaping. */
  mazePerCell: number;

  /** Per-pair reward for changes in total `(tower, path-cell-in-range)`
   *  coverage. Captures whether the agent's tower placements are
   *  actually positioned along the path the creeps will walk.
   *  Penalizes placements that REDIRECT the path away from
   *  existing towers (the self-sabotage failure mode the 50-iter
   *  smoke exhibited at 238s in the render). Positive for
   *  placements that extend the maze THROUGH existing towers'
   *  attack zones.
   *
   *  Default `0.01`: a typical good placement adds 5-10 coverage
   *  pairs (≈ +0.05-0.10, one wave-clear's worth). A catastrophic
   *  redirect that moves 30-50 path cells out of 5+ towers'
   *  ranges costs -0.5 to -1.0.
   *
   *  Set to 0 to disable coverage shaping. */
  coveragePerUnit: number;

  /** Reward coefficient on the MULTIPLICATIVE product
   *  `path_length × coverage_pairs`. Added 2026-05-27 after
   *  gaming out reward numbers for {straight, zigzag, snake}
   *  layouts showed that additive `mazePerCell + coveragePerUnit`
   *  is structurally biased toward straight-path + many-parallel-
   *  towers — coverage scales linearly with path length so adding
   *  parallel towers always beats a small detour.
   *
   *  Multiplying length × coverage makes the term `L²`-shaped in
   *  path length: the marginal reward of adding 1 detour cell
   *  grows with the path length already accumulated, so the
   *  agent gets a stronger gradient toward extending mazes.
   *
   *  Default `0.0005`: at typical match end (~25 cells path × 150
   *  coverage = 3750 product), this contributes ~1.9 total
   *  reward — comparable scale to the per-wave shaping (15 waves
   *  × 0.1 = 1.5). Per-decision delta of ~+200 (path +2, cov +5)
   *  → +0.10 reward, beats per-decision parallel-row delta of
   *  +0.05 in the math.
   *
   *  Set to 0 to disable. */
  lengthCoverageProductK: number;

  /** Reward per direction change in the creep path. Added 2026-05-27
   *  after diagnostic showed BalancedBrain builds a BLOB at the
   *  entry and PPO builds parallel LINES — neither algorithm
   *  builds the user-aesthetic ZIGZAG because total-coverage and
   *  total-length rewards don't distinguish shape (blob, lines,
   *  and zigzag can all have similar coverage and similar length).
   *
   *  Turns directly measure zigzag-iness: count cells in path
   *  where direction (dx, dy) differs from the previous cell's
   *  direction. Straight path has 0 turns; tight blob has ~4;
   *  fig2-style zigzag has 10-20.
   *
   *  Default `0.05`: a blocker that forces 2 new turns adds
   *  +0.10 reward — comparable to a wave clear, strong but not
   *  dominant over outcome.
   *
   *  Set to 0 to disable. */
  turnsRewardK: number;
}

export const DEFAULT_REWARD: RewardConfig = {
  perDecisionTickPenalty: -0.0001,
  perWaveBonus: 0.1,
  winBonus: 1.0,
  lossPenalty: -1.0,
  // Linear maze/coverage rewards retired 2026-05-27 in favor of
  // the multiplicative L×C term. The linear pair was structurally
  // biased toward dense parallel rows because coverage scales
  // linearly with path length (each new parallel tower adds 9
  // coverage; each new detour cell adds only its own coverage
  // contribution + the linear maze bonus). See the layout
  // gaming-out exercise: even at maze 5× / coverage ½×, the
  // straight-path layout had higher total reward than the
  // zigzag with fewer towers. Multiplicative L×C reverses that.
  mazePerCell: 0,
  coveragePerUnit: 0,
  // Multiplicative reward: K × (path_length × coverage_pairs).
  // K=0.0005: scale comparable to existing per-wave shaping
  // (~1.9 total at typical match end vs ~1.5 for 15 wave clears).
  lengthCoverageProductK: 0.0005,
  // Turn-count reward: K × (direction-changes in path).
  // K=0.05: blocker adding 2 turns gives +0.10 reward, comparable
  // to a wave clear. Directly measures zigzag vs blob vs lines
  // (all three of which can have similar coverage and length).
  turnsRewardK: 0.05,
};

export class PPORecorderBrain implements BotBrain {
  readonly name: string;
  private inner: PPOBrain;
  match: Match | null = null;
  readonly matchId: string;
  readonly reward: RewardConfig;

  readonly rows: PPORecordRow[] = [];
  readonly dropped = { fallback: 0, send: 0, frontier: 0, frontierManage: 0, illegalUnderMask: 0 };
  private lastWaveSeen = 0;
  private lastPathLen = -1;  // -1 = uninitialized; set on first decide.
  private lastCoverage = -1; // -1 = uninitialized; set on first decide.
  private lastLengthCoverageProduct = -1; // same convention
  private lastTurns = -1; // same convention
  /** Sum of `mazePerCell * delta` rewards attributed across all
   *  rows of this match. Surfaced for tuning + diagnostics. */
  totalMazeReward = 0;
  /** Sum of `coveragePerUnit * delta` rewards attributed across all
   *  rows of this match. Surfaced for tuning + diagnostics. */
  totalCoverageReward = 0;
  /** Sum of `lengthCoverageProductK * delta` rewards across all
   *  rows. Surfaced for manifest stats so we can tell whether the
   *  multiplicative term is firing. */
  totalProductReward = 0;
  /** Sum of `turnsRewardK * delta` rewards across all rows.
   *  Surfaced for manifest stats so we can verify the
   *  zigzag-specific term is contributing. */
  totalTurnsReward = 0;
  private tick = 0;

  constructor(inner: PPOBrain, matchId: string, reward: RewardConfig = DEFAULT_REWARD) {
    this.inner = inner;
    this.matchId = matchId;
    this.reward = reward;
    this.name = `PPORecorder(${inner.name})`;
  }

  attachMatch(match: Match): void {
    this.match = match;
    this.inner.attachMatch(match);
  }

  init(ctx: BotContext): void {
    this.inner.init?.(ctx);
  }

  /** Total length (in cells) summed across all active creep paths.
   *  Used to drive the maze-shaping term in the reward — placements
   *  that force creeps to detour increase this number, which then
   *  flows into the previous decision's reward via attribution. */
  private computePathLength(): number {
    if (!this.match) return 0;
    const paths = this.match.getAllPaths();
    let total = 0;
    for (const p of paths) if (p) total += p.length;
    return total;
  }

  /** Total `(tower, path-cell-in-range)` pair count across all owned
   *  towers and all active paths. Higher = the policy's towers are
   *  better positioned along the path creeps will walk; placement
   *  changes that REDIRECT the path away from existing towers (the
   *  self-sabotage failure mode) cause this to drop sharply, which
   *  then flows into the reward via attribution.
   *
   *  Range check uses Euclidean distance² <= range² to match how
   *  the game's tower-targeting actually evaluates LoS. Range
   *  comes from the tower type definition. */
  private computePathCoverage(): number {
    if (!this.match) return 0;
    const ctx = this.match.observe();
    const paths = this.match.getAllPaths();
    if (ctx.placedTowers.length === 0) return 0;

    // Precompute (tower, range²) for the inner loop.
    const towers: Array<{ col: number; row: number; r2: number }> = [];
    for (const t of ctx.placedTowers) {
      const def = getTowerType(t.towerId);
      if (!def) continue;
      towers.push({ col: t.col, row: t.row, r2: def.range * def.range });
    }
    if (towers.length === 0) return 0;

    let count = 0;
    for (const path of paths) {
      if (!path) continue;
      for (const cell of path) {
        for (const t of towers) {
          const dx = t.col - cell.col;
          const dy = t.row - cell.row;
          if (dx * dx + dy * dy <= t.r2) count++;
        }
      }
    }
    return count;
  }

  /** Count direction changes in the creep path. Each cell where
   *  the direction (dx, dy) differs from the previous step counts
   *  as 1 turn. Straight path = 0; tight blob = ~4; fig2 zigzag
   *  = 10-20. Direct measure of "zigzag-iness" — neither
   *  coverage nor length can distinguish lines from blobs from
   *  zigzags but this can. */
  private computePathTurns(): number {
    if (!this.match) return 0;
    const paths = this.match.getAllPaths();
    let turns = 0;
    for (const path of paths) {
      if (!path || path.length < 3) continue;
      let prevDx = path[1].col - path[0].col;
      let prevDy = path[1].row - path[0].row;
      for (let i = 2; i < path.length; i++) {
        const dx = path[i].col - path[i - 1].col;
        const dy = path[i].row - path[i - 1].row;
        if (dx !== prevDx || dy !== prevDy) turns++;
        prevDx = dx;
        prevDy = dy;
      }
    }
    return turns;
  }

  /** Async path used by `Match.stepAsync` when our caller drove the
   *  match via `runToEndAsync`. This is the real production path
   *  for PPO rollout gen. */
  async decideAsync(ctx: BotContext): Promise<BotDecision> {
    // Maze-reward attribution: the path-length delta caused by the
    // PREVIOUS decision becomes observable here, after Match has
    // applied that decision and recomputed paths. Attribute it to
    // the row we recorded last turn. First decide() has nothing to
    // attribute (lastPathLen=-1), so skip then.
    if (this.match && this.reward.mazePerCell !== 0) {
      const newLen = this.computePathLength();
      if (this.lastPathLen >= 0 && this.rows.length > 0) {
        const delta = newLen - this.lastPathLen;
        if (delta !== 0) {
          const r = this.reward.mazePerCell * delta;
          this.rows[this.rows.length - 1].reward += r;
          this.totalMazeReward += r;
        }
      }
      this.lastPathLen = newLen;
    }

    // Coverage-reward attribution: same one-step-late pattern.
    // Captures placements that route the path through tower kill
    // zones (positive delta) vs placements that redirect the path
    // away from existing towers (large negative delta).
    if (this.match && this.reward.coveragePerUnit !== 0) {
      const newCov = this.computePathCoverage();
      if (this.lastCoverage >= 0 && this.rows.length > 0) {
        const delta = newCov - this.lastCoverage;
        if (delta !== 0) {
          const r = this.reward.coveragePerUnit * delta;
          this.rows[this.rows.length - 1].reward += r;
          this.totalCoverageReward += r;
        }
      }
      this.lastCoverage = newCov;
    }

    // Multiplicative L×C attribution. Same one-step-late pattern.
    // The math from the layout-gaming exercise: this term makes
    // the reward super-linear in path length so longer mazes get
    // strictly better marginal returns than denser parallel rows.
    if (this.match && this.reward.lengthCoverageProductK !== 0) {
      const newLen = this.computePathLength();
      const newCov = this.computePathCoverage();
      const newProduct = newLen * newCov;
      if (this.lastLengthCoverageProduct >= 0 && this.rows.length > 0) {
        const delta = newProduct - this.lastLengthCoverageProduct;
        if (delta !== 0) {
          const r = this.reward.lengthCoverageProductK * delta;
          this.rows[this.rows.length - 1].reward += r;
          this.totalProductReward += r;
        }
      }
      this.lastLengthCoverageProduct = newProduct;
    }

    // Turn-count attribution. Same one-step-late pattern.
    // Directly measures zigzag-iness — BalancedBrain's blob and
    // PPO's lines both have ~0-4 turns; fig2 zigzag has 10-20.
    if (this.match && this.reward.turnsRewardK !== 0) {
      const newTurns = this.computePathTurns();
      if (this.lastTurns >= 0 && this.rows.length > 0) {
        const delta = newTurns - this.lastTurns;
        if (delta !== 0) {
          const r = this.reward.turnsRewardK * delta;
          this.rows[this.rows.length - 1].reward += r;
          this.totalTurnsReward += r;
        }
      }
      this.lastTurns = newTurns;
    }

    this.tick++;
    const obs = this.match ? obsFromMatch(this.match) : null;
    const stats = await this.inner.decideAsyncWithStats(ctx);

    // Fallback rows are useless to PPO (no on-policy log_prob), so
    // we skip recording them. Match still gets the fallback action.
    if (stats.fellBack) {
      this.dropped.fallback++;
      return stats.decision;
    }

    // Out-of-scope action kinds (`send`, `frontier`, `frontierManage`)
    // can't be encoded into our flat action space — but PPOBrain
    // already only emits Phase-1-2 decisions, so this branch is
    // unreachable in normal flow. Defensively count and drop.
    if (stats.decision.kind === 'send') { this.dropped.send++; return stats.decision; }
    if (stats.decision.kind === 'frontier') { this.dropped.frontier++; return stats.decision; }
    if (stats.decision.kind === 'frontierManage') { this.dropped.frontierManage++; return stats.decision; }

    // Mask consistency — the obs.mask was captured at the same
    // state PPOBrain just decided on. If the sampled action ended
    // up outside the mask somehow (shouldn't happen via
    // sampleAction), drop the row.
    if (!obs || obs.mask[stats.actionIdx] === 0) {
      this.dropped.illegalUnderMask++;
      return stats.decision;
    }

    // Per-decision tick penalty. Wave bonus added below if a wave
    // ticked over since the last decision.
    let stepReward = this.reward.perDecisionTickPenalty;
    if (this.match) {
      const ctxNow = this.match.observe();
      if (ctxNow.wave > this.lastWaveSeen) {
        stepReward += this.reward.perWaveBonus * (ctxNow.wave - this.lastWaveSeen);
        this.lastWaveSeen = ctxNow.wave;
      }
    }

    this.rows.push({
      matchId: this.matchId,
      tick: this.tick,
      faction: ctx.faction,
      obs,
      action: stats.actionIdx,
      logProb: stats.logProb,
      value: stats.value,
      reward: stepReward,
      done: false,
    });
    return stats.decision;
  }

  /** Sync path — Match.step() calls this. PPOBrain's sync path
   *  falls back to BalancedBrain (no ONNX inference); we don't
   *  record anything because there are no logProb/value to record.
   *  Caller should use Match.runToEndAsync for actual rollouts. */
  decide(ctx: BotContext): BotDecision {
    this.dropped.fallback++;
    return this.inner.decide(ctx);
  }

  /** Finalize the episode: set `done=true` on the last row, add
   *  the terminal win/loss bonus to its reward. Also capture any
   *  remaining maze-reward delta (the final action's path-length
   *  effect that no subsequent decide() would have observed).
   *  Returns the same rows for the writer to serialize. */
  finalize(outcome: 'win' | 'loss' | 'timeout' | 'error'): PPORecordRow[] {
    if (this.rows.length === 0) return this.rows;

    // Final maze-reward attribution: the last action's path-length
    // impact never got observed by a subsequent decide() call.
    // Capture it now so the action gets credit for any maze it
    // built at the very end. Same scaling as in-match attribution.
    if (this.match && this.reward.mazePerCell !== 0 && this.lastPathLen >= 0) {
      const finalLen = this.computePathLength();
      const delta = finalLen - this.lastPathLen;
      if (delta !== 0) {
        const r = this.reward.mazePerCell * delta;
        this.rows[this.rows.length - 1].reward += r;
        this.totalMazeReward += r;
      }
    }

    // Same trailing-delta capture for coverage.
    if (this.match && this.reward.coveragePerUnit !== 0 && this.lastCoverage >= 0) {
      const finalCov = this.computePathCoverage();
      const delta = finalCov - this.lastCoverage;
      if (delta !== 0) {
        const r = this.reward.coveragePerUnit * delta;
        this.rows[this.rows.length - 1].reward += r;
        this.totalCoverageReward += r;
      }
    }

    // Trailing-delta capture for multiplicative product.
    if (this.match && this.reward.lengthCoverageProductK !== 0 && this.lastLengthCoverageProduct >= 0) {
      const finalLen = this.computePathLength();
      const finalCov = this.computePathCoverage();
      const finalProduct = finalLen * finalCov;
      const delta = finalProduct - this.lastLengthCoverageProduct;
      if (delta !== 0) {
        const r = this.reward.lengthCoverageProductK * delta;
        this.rows[this.rows.length - 1].reward += r;
        this.totalProductReward += r;
      }
    }

    // Trailing-delta capture for turns.
    if (this.match && this.reward.turnsRewardK !== 0 && this.lastTurns >= 0) {
      const finalTurns = this.computePathTurns();
      const delta = finalTurns - this.lastTurns;
      if (delta !== 0) {
        const r = this.reward.turnsRewardK * delta;
        this.rows[this.rows.length - 1].reward += r;
        this.totalTurnsReward += r;
      }
    }

    const last = this.rows[this.rows.length - 1];
    last.done = true;
    if (outcome === 'win') last.reward += this.reward.winBonus;
    else if (outcome === 'loss') last.reward += this.reward.lossPenalty;
    // timeout/error: no terminal bonus
    return this.rows;
  }
}
