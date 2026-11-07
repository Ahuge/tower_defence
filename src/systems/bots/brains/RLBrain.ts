/**
 * RLBrain — policy-network brain for the arcane RL prototype.
 *
 * Two-stage design: the policy (an MLP trained in Python) picks WHAT
 * to do — build one of the 7 arcane towers, save, or upgrade — and
 * the imitation LearnedScorer picks WHERE to place it. This brain is
 * the TypeScript half of the shared contract with the Python trainer
 * (see ml/desktop/rl/): the 17-dim state, 9 actions, action masking,
 * reward shaping, and trajectory JSONL format must match exactly.
 *
 * Decision cadence: only between-waves decide() calls act. Mid-wave
 * calls return `skip` without recording — the in-wave decide() the
 * headless runner fires every ~30 ticks is ignored.
 *
 * Reward is computed LAZILY. The reward for a step is only knowable
 * once the next wave resolves (did we clear it? did we leak lives?
 * how much kill gold came in?), so each step is recorded with
 * reward 0 and patched in at the next between-waves decide() call,
 * from the deltas (wave, gold, lives) since that step was recorded.
 * The terminal +1/-1 win/loss bonus is applied by the RUNNER to the
 * last step (see finalize()), not here — the brain never knows when
 * the episode ends.
 *
 * With no policy file the brain acts uniformly at random over valid
 * actions (value 0), for smoke tests.
 */
import { readFileSync } from 'node:fs';
import { BotBrain, BotContext, BotDecision, PlacedTower } from '../BotBrain';
import { TowerType, TOWER_TYPES } from '../../../data/TowerTypes';
import { LearnedScorer } from '../../../../playtest/LearnedScorer';
import { rng } from '../../Rng';

/** Arcane tower ids in action order (actions 0-6). Costs from
 *  TowerTypes: bolt 25, frost 35, storm 55, focus 90, drain 120,
 *  meteor 200, nova 700. */
export const ARCANE_TOWER_IDS = [
  'arcane_bolt',
  'arcane_frost',
  'arcane_storm',
  'arcane_focus',
  'arcane_drain',
  'arcane_meteor',
  'arcane_nova',
] as const;

/** Action ids. 0-6 build ARCANE_TOWER_IDS[i], 7 save, 8 upgrade. */
export const RL_ACTION_SAVE = 7;
export const RL_ACTION_UPGRADE = 8;
export const RL_STATE_DIM = 17;
export const RL_ACTION_DIM = 9;

/** One recorded decision step. Serialized by the runner as a JSONL
 *  line with `episode` added (the brain doesn't know its episode). */
export interface TrajectoryStep {
  /** Index within the episode, 0-based. */
  step: number;
  /** 17-dim state, canonical order (see extractState). */
  state: number[];
  /** Action taken, 0-8. */
  action: number;
  /** log P(action) under the masked softmax. */
  logprob: number;
  /** Value-head estimate for the state. 0 under the random policy. */
  value: number;
  /** Shaped reward, patched in lazily at the next decide() call.
   *  0 until settled; the runner adds the terminal bonus. */
  reward: number;
  /** 9-dim action mask at decision time (1 = valid). */
  mask: number[];
  /** True only on the last step of the episode (set by finalize). */
  done: boolean;
}

export interface RLBrainOptions {
  /** Path to a policy weights JSON (see PolicyWeights below). Omit
   *  for uniform-random actions. */
  policyPath?: string;
  /** Argmax over valid actions instead of sampling. */
  deterministic?: boolean;
  /** Record trajectory steps. Default true. */
  recordTrajectory?: boolean;
  /** Reward shaping coefficients. Defaults match the originals.
   *  Override via env vars in run_episode.mts for sweeps. */
  rewardWave?: number;
  rewardGoldCoef?: number;
  rewardGoldCap?: number;
  rewardLifePenalty?: number;
}

/** Policy weights JSON, produced by the Python trainer.
 *  All weight matrices are [out][in] row-major. */
interface PolicyWeights {
  state_dim: number;
  hidden: number[];
  action_dim: number;
  layers: {
    trunk1_w: number[][];
    trunk1_b: number[];
    trunk2_w: number[][];
    trunk2_b: number[];
    policy_w: number[][];
    policy_b: number[];
    value_w: number[][];
    value_b: number[];
  };
}

/** Raw (unclamped) snapshot kept alongside a pending step so the
 *  lazy reward can be computed from exact deltas. Not serialized. */
interface PendingStep {
  step: TrajectoryStep;
  wave: number;
  gold: number;
  lives: number;
}

export class RLBrain implements BotBrain {
  readonly name = 'RL-arcane';

  private policy: PolicyWeights | null = null;
  private deterministic: boolean;
  private recordTrajectory: boolean;
  private scorer: LearnedScorer;
  private warnedNoScorer = false;
  private rewardWave: number;
  private rewardGoldCoef: number;
  private rewardGoldCap: number;
  private rewardLifePenalty: number;

  private trajectory: TrajectoryStep[] = [];
  private pending: PendingStep | null = null;

  constructor(options: RLBrainOptions = {}) {
    this.deterministic = options.deterministic ?? false;
    this.recordTrajectory = options.recordTrajectory ?? true;
    this.rewardWave = options.rewardWave ?? 0.1;
    this.rewardGoldCoef = options.rewardGoldCoef ?? 0.002;
    this.rewardGoldCap = options.rewardGoldCap ?? 0.2;
    this.rewardLifePenalty = options.rewardLifePenalty ?? 0.5;
    if (options.policyPath) {
      this.policy = loadPolicy(options.policyPath);
    }
    this.scorer = new LearnedScorer(['arcane']);
    if (!this.scorer.hasModel('arcane') && !this.warnedNoScorer) {
      this.warnedNoScorer = true;
      console.warn(
        'RLBrain: no LearnedScorer model for arcane — using closest-to-path fallback cells.',
      );
    }
  }

  decide(ctx: BotContext): BotDecision {
    // Only between-waves decisions. Mid-wave calls return skip
    // without recording — and without settling the pending reward,
    // which is only knowable once the wave resolves.
    if (!ctx.betweenWaves) return { kind: 'skip' };

    // Settle the previous step's reward from state deltas since it
    // was recorded (wave cleared? gold gained? lives lost?).
    this.settlePendingReward(ctx);

    const state = extractState(ctx);
    const mask = this.computeMask(ctx);
    const { action, logprob, value, probs } = this.chooseAction(state, mask);

    const decision = this.executeAction(ctx, action);
    // executeAction may downgrade a build/upgrade to a save when it
    // can't be carried out (no cell, no upgradable tower); record
    // the action actually executed so the trajectory stays truthful,
    // with the logprob of THAT action under the decision-time policy.
    const executedAction = decision.kind === 'place'
      ? action
      : decision.kind === 'upgrade'
        ? RL_ACTION_UPGRADE
        : RL_ACTION_SAVE;
    const executedLogprob = executedAction === action
      ? logprob
      : Math.log(Math.max(probs[executedAction], 1e-12));

    if (this.recordTrajectory) {
      const step: TrajectoryStep = {
        step: this.trajectory.length,
        state,
        action: executedAction,
        logprob: executedLogprob,
        value,
        reward: 0,
        mask,
        done: false,
      };
      this.trajectory.push(step);
      this.pending = {
        step,
        wave: ctx.wave,
        gold: ctx.budget,
        lives: ctx.lives,
      };
    }

    return decision;
  }

  /** All steps recorded this episode (live references — the runner
   *  patches the terminal reward / done flag onto the last one). */
  getTrajectory(): TrajectoryStep[] {
    return this.trajectory;
  }

  resetTrajectory(): void {
    this.trajectory = [];
    this.pending = null;
  }

  /**
   * End-of-episode finalization, called by the runner after
   * runMatch returns. Applies the terminal +1 (win) / -1 (loss)
   * bonus to the last recorded step and marks it done. The last
   * step's shaped reward stays unsettled (0) — its wave outcome
   * is exactly what the terminal bonus stands in for.
   */
  finalize(won: boolean): void {
    const last = this.trajectory[this.trajectory.length - 1];
    if (!last) return;
    last.reward += won ? 1.0 : -1.0;
    last.done = true;
    this.pending = null;
  }

  // ===== State / mask / policy =====

  /**
   * 17-dim state, canonical order (shared with the Python trainer):
   *   0  wave / 20
   *   1  gold / 1000
   *   2  lives / 100
   *   3  tower_count / 100
   *   4-10  per-tower counts / 20, in ARCANE_TOWER_IDS order
   *   11 next wave total creep count / 50 (0 if unknown)
   *   12 next wave has armored 0/1
   *   13 next wave has flying 0/1 (creepType contains 'fly')
   *   14 next wave has shielded 0/1
   *   15 betweenWaves 0/1
   *   16 candidate cells / 936 (36x26 grid)
   * Every dim is clamped to [0, 1] — late-game gold / creep counts
   * can exceed their denominators, and the trainer consumes these
   * values as-is.
   */
  private chooseAction(
    state: number[],
    mask: number[],
  ): { action: number; logprob: number; value: number; probs: number[] } {
    const valid = mask.map((m, i) => (m === 1 ? i : -1)).filter(i => i >= 0);
    if (valid.length === 0) {
      // Unreachable in practice (save is always valid), but never
      // crash the match over it.
      const probs = new Array<number>(RL_ACTION_DIM).fill(0);
      probs[RL_ACTION_SAVE] = 1;
      return { action: RL_ACTION_SAVE, logprob: 0, value: 0, probs };
    }

    if (!this.policy) {
      const action = valid[Math.floor(rng() * valid.length)];
      const probs = new Array<number>(RL_ACTION_DIM).fill(0);
      for (const i of valid) probs[i] = 1 / valid.length;
      return { action, logprob: Math.log(1 / valid.length), value: 0, probs };
    }

    const { logits, value } = this.forward(state);
    const masked = logits.map((l, i) => (mask[i] === 1 ? l : -1e9));
    const probs = softmax(masked);
    if (this.deterministic) {
      let best = valid[0];
      for (const i of valid) {
        if (probs[i] > probs[best]) best = i;
      }
      return { action: best, logprob: Math.log(Math.max(probs[best], 1e-12)), value, probs };
    }
    let r = rng();
    let action = valid[valid.length - 1];
    for (const i of valid) {
      r -= probs[i];
      if (r <= 0) { action = i; break; }
    }
    return { action, logprob: Math.log(Math.max(probs[action], 1e-12)), value, probs };
  }

  private forward(state: number[]): { logits: number[]; value: number } {
    const p = this.policy as PolicyWeights;
    const h1 = matvecRelu(p.layers.trunk1_w, p.layers.trunk1_b, state);
    const h2 = matvecRelu(p.layers.trunk2_w, p.layers.trunk2_b, h1);
    const logits = matvec(p.layers.policy_w, p.layers.policy_b, h2);
    const value = matvec(p.layers.value_w, p.layers.value_b, h2)[0];
    return { logits, value };
  }

  /** Build valid iff affordable; upgrade valid iff an upgradable
   *  affordable tower exists; save always valid. */
  private computeMask(ctx: BotContext): number[] {
    const mask = new Array<number>(RL_ACTION_DIM).fill(0);
    for (let i = 0; i < ARCANE_TOWER_IDS.length; i++) {
      const tower = TOWER_TYPES[ARCANE_TOWER_IDS[i]];
      mask[i] = tower && ctx.budget >= tower.cost ? 1 : 0;
    }
    mask[RL_ACTION_SAVE] = 1;
    mask[RL_ACTION_UPGRADE] = this.cheapestUpgradable(ctx) ? 1 : 0;
    return mask;
  }

  // ===== Action execution =====

  private executeAction(ctx: BotContext, action: number): BotDecision {
    if (action === RL_ACTION_SAVE) return { kind: 'skip' };
    if (action === RL_ACTION_UPGRADE) {
      const target = this.cheapestUpgradable(ctx);
      if (!target) return { kind: 'skip' };
      return { kind: 'upgrade', col: target.col, row: target.row };
    }
    // Build action 0-6.
    const towerId = ARCANE_TOWER_IDS[action];
    const tower = towerId ? TOWER_TYPES[towerId] : undefined;
    if (!tower) return { kind: 'skip' };
    if (ctx.budget < tower.cost) return { kind: 'skip' };
    const cell = this.pickCell(ctx, tower);
    if (!cell) return { kind: 'skip' };
    return { kind: 'place', col: cell.col, row: cell.row, type: tower };
  }

  /** Learned scorer first (threshold 0.0 — any positive score
   *  wins); fall back to the candidate cell closest to the path. */
  private pickCell(
    ctx: BotContext,
    tower: TowerType,
  ): { col: number; row: number } | null {
    if (this.scorer.hasModel('arcane')) {
      const learned = this.scorer.scorerFn(ctx, tower, 0.0);
      if (learned) return learned;
    }
    return closestCellToPath(ctx);
  }

  /** Cheapest upgradable tower: lowest upgradeCost, tie-break
   *  lowest level. upgradeCost 0 means max level — not upgradable. */
  private cheapestUpgradable(ctx: BotContext): PlacedTower | null {
    let best: PlacedTower | null = null;
    for (const t of ctx.placedTowers) {
      if (t.upgradeCost <= 0 || t.upgradeCost > ctx.budget) continue;
      if (
        !best ||
        t.upgradeCost < best.upgradeCost ||
        (t.upgradeCost === best.upgradeCost && t.level < best.level)
      ) {
        best = t;
      }
    }
    return best;
  }

  // ===== Lazy reward =====

  /**
   * Patch the pending step's reward from deltas since it was
   * recorded:
   *   +rewardWave per wave cleared
   *   +rewardGoldCoef per gold gained (capped at rewardGoldCap,
   *     floored at 0 — spending gold must NOT be punished, otherwise
   *     the agent learns to never build anything)
   *   -rewardLifePenalty per life lost
   */
  private settlePendingReward(ctx: BotContext): void {
    if (!this.pending) return;
    const { step, wave, gold, lives } = this.pending;
    const wavesCleared = Math.max(0, ctx.wave - wave);
    const goldDelta = ctx.budget - gold;
    const livesLost = Math.max(0, lives - ctx.lives);
    step.reward =
      this.rewardWave * wavesCleared +
      Math.min(this.rewardGoldCoef * Math.max(0, goldDelta), this.rewardGoldCap) -
      this.rewardLifePenalty * livesLost;
    this.pending = null;
  }
}

/** Load + validate a policy weights JSON. Throws on unreadable or
 *  wrong-shaped files — a silently-random policy would corrupt
 *  training data, so fail fast instead. */
export function loadPolicy(path: string): PolicyWeights {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PolicyWeights;
  if (raw.state_dim !== RL_STATE_DIM) {
    throw new Error(
      `RLBrain: policy ${path} has state_dim ${raw.state_dim}, expected ${RL_STATE_DIM}`,
    );
  }
  if (raw.action_dim !== RL_ACTION_DIM) {
    throw new Error(
      `RLBrain: policy ${path} has action_dim ${raw.action_dim}, expected ${RL_ACTION_DIM}`,
    );
  }
  if (!raw.hidden || raw.hidden[0] !== 128 || raw.hidden[1] !== 64) {
    throw new Error(
      `RLBrain: policy ${path} has hidden ${JSON.stringify(raw.hidden)}, expected [128, 64]`,
    );
  }
  const L = raw.layers;
  if (
    !L ||
    L.trunk1_w.length !== 128 || L.trunk1_b.length !== 128 ||
    L.trunk2_w.length !== 64 || L.trunk2_b.length !== 64 ||
    L.policy_w.length !== 9 || L.policy_b.length !== 9 ||
    L.value_w.length !== 1 || L.value_b.length !== 1
  ) {
    throw new Error(`RLBrain: policy ${path} has wrong layer shapes`);
  }
  return raw;
}

/** Extract the 17-dim state from a BotContext. Exported for tests
 *  and for the runner's sanity checks. */
export function extractState(ctx: BotContext): number[] {
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  const counts = new Array<number>(ARCANE_TOWER_IDS.length).fill(0);
  for (const t of ctx.placedTowers) {
    const idx = ARCANE_TOWER_IDS.indexOf(t.towerId as (typeof ARCANE_TOWER_IDS)[number]);
    if (idx >= 0) counts[idx]++;
  }

  const next = ctx.upcomingWaves?.[0];
  let nextCount = 0;
  let hasArmored = 0;
  let hasFlying = 0;
  let hasShielded = 0;
  if (next) {
    for (const g of next.groups) {
      nextCount += g.count;
      if (g.creepType === 'armored') hasArmored = 1;
      if (g.creepType.includes('fly')) hasFlying = 1;
      if (g.creepType === 'shielded') hasShielded = 1;
    }
  }

  return [
    clamp01((ctx.wave ?? 0) / 20),
    clamp01((ctx.budget ?? 0) / 1000),
    clamp01((ctx.lives ?? 0) / 100),
    clamp01(ctx.placedTowers.length / 100),
    ...counts.map(c => clamp01(c / 20)),
    clamp01(nextCount / 50),
    hasArmored,
    hasFlying,
    hasShielded,
    ctx.betweenWaves ? 1 : 0,
    clamp01(ctx.candidateCells.length / 936),
  ];
}

/** Candidate cell closest to any path point (squared distance).
 *  Null when there are no candidates or no known path. */
export function closestCellToPath(
  ctx: BotContext,
): { col: number; row: number } | null {
  if (ctx.candidateCells.length === 0) return null;
  const paths = (ctx.allPaths ?? []).filter(
    (p): p is { col: number; row: number }[] => !!p && p.length > 0,
  );
  if (paths.length === 0) return ctx.candidateCells[0];
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (const c of ctx.candidateCells) {
    for (const path of paths) {
      for (const p of path) {
        const dx = p.col - c.col;
        const dy = p.row - c.row;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
    }
  }
  return best;
}

function matvec(w: number[][], b: number[], x: number[]): number[] {
  const out: number[] = new Array(w.length);
  for (let j = 0; j < w.length; j++) {
    let sum = b[j];
    const row = w[j];
    for (let k = 0; k < x.length; k++) sum += row[k] * x[k];
    out[j] = sum;
  }
  return out;
}

function matvecRelu(w: number[][], b: number[], x: number[]): number[] {
  return matvec(w, b, x).map(v => Math.max(0, v));
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}
