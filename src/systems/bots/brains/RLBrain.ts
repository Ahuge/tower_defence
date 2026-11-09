/**
 * RLBrain — policy-network brain for the RL prototype.
 *
 * Two-stage design: the policy (an MLP trained in Python) picks WHAT
 * to do — build one of the faction's towers, save, or upgrade — and
 * WHERE to place a build, at zone granularity. The imitation
 * LearnedScorer then picks the exact cell inside the chosen zone. This
 * brain is the TypeScript half of the shared contract with the Python
 * trainer (see ml/desktop/rl/): the 17-dim state, action space, action
 * masking, reward shaping, and trajectory JSONL format must match
 * exactly.
 *
 * Placement action space (v2): the board is split into 12 zones
 * (6 columns x 2 rows). Build actions are `towerIdx * 12 + zone`, so
 * the policy chooses both the tower and a coarse location. Save and
 * upgrade remain single actions. That is 7*12 + 2 = 86 actions.
 *
 * Faction-parameterized (RL_FACTION_TOWERS): every faction shares one
 * 86-action / 17-dim policy shape. Actions build the faction's towers
 * in cost order; factions with fewer than 7 towers leave the trailing
 * build slots empty (permanently masked, counts always 0).
 * Pass `faction` in RLBrainOptions (default 'arcane').
 *
 * Backward compatibility: v1 policies (action_dim 9) are still
 * loadable. They keep the old 9-action mask/execute path and the old
 * state feature 15 (betweenWaves). New v2 policies use zone actions
 * and state feature 15 = occupied zones / 12.
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

/** Psionic tower ids in action order (actions 0-4; actions 5-6 are
 *  permanently masked — the faction has no 6th/7th tower). Costs:
 *  probe 20, mesmer 45, terror 80, mind_spike 150, overmind 750. */
export const PSIONIC_TOWER_IDS = [
  'psi_probe',
  'psi_mesmer',
  'psi_terror',
  'psi_mind_spike',
  'psi_overmind',
] as const;

/** Build-action tower ids per faction, in action order. MUST match
 *  the Python side (ml/desktop/rl/env.py FACTION_TOWERS) exactly —
 *  action i builds RL_FACTION_TOWERS[faction][i]. */
export const RL_FACTION_TOWERS: Record<string, readonly string[]> = {
  arcane: ARCANE_TOWER_IDS,
  psionic: PSIONIC_TOWER_IDS,
};

/** Action ids for the v2 (zone) action space.
 *
 *  Build actions occupy [0, RL_MAX_BUILD_ACTIONS * RL_ZONE_DIM):
 *  `towerIdx * RL_ZONE_DIM + zone`, where zone is
 *  `rowBucket * RL_ZONE_COLS + colBucket` on a 6x2 grid over the
 *  board. Save and upgrade are the final two actions.
 *
 *  v1 policies (action_dim 9) use the legacy ids RL_ACTION_SAVE_V1 /
 *  RL_ACTION_UPGRADE_V1 instead. */
export const RL_GRID_COLS = 36;
export const RL_GRID_ROWS = 26;
export const RL_ZONE_COLS = 6;
export const RL_ZONE_ROWS = 2;
export const RL_ZONE_DIM = RL_ZONE_COLS * RL_ZONE_ROWS; // 12
export const RL_MAX_BUILD_ACTIONS = 7;
export const RL_ACTION_SAVE = RL_MAX_BUILD_ACTIONS * RL_ZONE_DIM; // 84
export const RL_ACTION_UPGRADE = RL_ACTION_SAVE + 1; // 85
export const RL_ACTION_DIM = RL_ACTION_UPGRADE + 1; // 86
export const RL_STATE_DIM = 17;
/** Legacy 9-action space: actions 0-6 build, 7 save, 8 upgrade. */
export const RL_ACTION_DIM_V1 = 9;
export const RL_ACTION_SAVE_V1 = 7;
export const RL_ACTION_UPGRADE_V1 = 8;

/** Zone index of a board cell: rowBucket * ZONE_COLS + colBucket. */
export function zoneOfCell(col: number, row: number): number {
  const zoneColWidth = RL_GRID_COLS / RL_ZONE_COLS;
  const zoneRowHeight = RL_GRID_ROWS / RL_ZONE_ROWS;
  const colBucket = Math.min(
    RL_ZONE_COLS - 1,
    Math.max(0, Math.floor(col / zoneColWidth)),
  );
  const rowBucket = Math.min(
    RL_ZONE_ROWS - 1,
    Math.max(0, Math.floor(row / zoneRowHeight)),
  );
  return rowBucket * RL_ZONE_COLS + colBucket;
}

/** One recorded decision step. Serialized by the runner as a JSONL
 *  line with `episode` added (the brain doesn't know its episode). */
export interface TrajectoryStep {
  /** Index within the episode, 0-based. */
  step: number;
  /** 17-dim state, canonical order (see extractState). */
  state: number[];
  /** Action taken. v2: 0-85 (build = tower*12+zone, 84 save,
   *  85 upgrade). v1: 0-8. */
  action: number;
  /** log P(action) under the masked softmax. */
  logprob: number;
  /** Value-head estimate for the state. 0 under the random policy. */
  value: number;
  /** Shaped reward, patched in lazily at the next decide() call.
   *  0 until settled; the runner adds the terminal bonus. */
  reward: number;
  /** Action mask at decision time (1 = valid); same length as the
   *  policy's action_dim (86 for v2, 9 for v1). */
  mask: number[];
  /** True only on the last step of the episode (set by finalize). */
  done: boolean;
}

export interface RLBrainOptions {
  /** Faction to play (default 'arcane'). Must have an entry in
   *  RL_FACTION_TOWERS. */
  faction?: string;
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
  /** Immediate reward per gold spent on a build/upgrade. Gives the
   *  agent a positive signal for investing in its board so a leak
   *  penalty cannot teach it to hoard. Default 0.002 (a 20-gold
   *  probe = +0.04, a 200-gold meteor = +0.4). */
  rewardBuildCoef?: number;
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

/** Process-wide caches. The episode runner constructs a fresh RLBrain
 *  per episode; without these it would re-read + JSON.parse the 240 KB
 *  policy file and the 210 KB scorer model every episode (a large
 *  fraction of per-episode wall time on a slow filesystem). Both are
 *  immutable after load, so sharing is safe. */
const policyCache = new Map<string, PolicyWeights>();
const scorerCache = new Map<string, LearnedScorer>();

function loadPolicyCached(path: string): PolicyWeights {
  const hit = policyCache.get(path);
  if (hit) return hit;
  const loaded = loadPolicy(path);
  policyCache.set(path, loaded);
  return loaded;
}

function getScorer(faction: string): LearnedScorer {
  const hit = scorerCache.get(faction);
  if (hit) return hit;
  const scorer = new LearnedScorer([faction]);
  scorerCache.set(faction, scorer);
  return scorer;
}

/** One decision in the current between-wave window. `spent` is the
 *  gold this decision committed (0 for save/skip); it weights how much
 *  of the wave outcome this step is credited with.
 *
 *  Why a window and not a single pending step: a between-wave period is
 *  usually several decisions (build, build, upgrade, ... save starts the
 *  wave). The wave outcome only becomes known at the NEXT wave boundary.
 *  The old code credited the last decision only — which is almost always
 *  a *forced* save (mask `000000010`). A forced action has zero policy
 *  gradient, so the wave reward taught the policy nothing, while every
 *  build got exactly 0. Crediting the whole window (weighted by gold
 *  spent) gives the build decisions the signal they need to learn WHICH
 *  tower to build. */
interface PendingStep {
  step: TrajectoryStep;
  spent: number;
}

export class RLBrain implements BotBrain {
  readonly name: string;

  private faction: string;
  private towerIds: readonly string[];
  private policy: PolicyWeights | null = null;
  /** 1 = legacy 9-action policy, 2 = zone placement (86 actions). */
  private policyVersion: 1 | 2 = 2;
  /** Action-space size for this brain (86 for v2, 9 for v1). */
  private actionDim: number = RL_ACTION_DIM;
  private deterministic: boolean;
  private recordTrajectory: boolean;
  private scorer: LearnedScorer;
  private warnedNoScorer = false;
  private rewardWave: number;
  private rewardGoldCoef: number;
  private rewardGoldCap: number;
  private rewardLifePenalty: number;
  private rewardBuildCoef: number;

  private trajectory: TrajectoryStep[] = [];
  /** Decisions since the last observed wave boundary (see PendingStep). */
  private window: PendingStep[] = [];
  private windowStartWave = 0;
  private windowStartGold = 0;
  private windowStartLives = 0;

  constructor(options: RLBrainOptions = {}) {
    this.faction = options.faction ?? 'arcane';
    const towerIds = RL_FACTION_TOWERS[this.faction];
    if (!towerIds) {
      throw new Error(
        `RLBrain: no tower table for faction ${this.faction} ` +
        `(known: ${Object.keys(RL_FACTION_TOWERS).join(', ')})`,
      );
    }
    this.towerIds = towerIds;
    this.name = `RL-${this.faction}`;
    this.deterministic = options.deterministic ?? false;
    this.recordTrajectory = options.recordTrajectory ?? true;
    this.rewardWave = options.rewardWave ?? 0.1;
    this.rewardGoldCoef = options.rewardGoldCoef ?? 0.002;
    this.rewardGoldCap = options.rewardGoldCap ?? 0.2;
    this.rewardLifePenalty = options.rewardLifePenalty ?? 0.5;
    this.rewardBuildCoef = options.rewardBuildCoef ?? 0.002;
    if (options.policyPath) {
      this.policy = loadPolicyCached(options.policyPath);
      this.policyVersion =
        this.policy.action_dim === RL_ACTION_DIM_V1 ? 1 : 2;
      this.actionDim = this.policy.action_dim;
    }
    this.scorer = getScorer(this.faction);
    if (!this.scorer.hasModel(this.faction) && !this.warnedNoScorer) {
      this.warnedNoScorer = true;
      console.warn(
        `RLBrain: no LearnedScorer model for ${this.faction} — using closest-to-path fallback cells.`,
      );
    }
  }

  decide(ctx: BotContext): BotDecision {
    // Only between-waves decisions. Mid-wave calls return skip
    // without recording — and without settling the window reward,
    // which is only knowable once the wave resolves.
    if (!ctx.betweenWaves) return { kind: 'skip' };

    // If a wave resolved since the last decision, credit the decisions
    // that produced it (wave cleared? gold gained? lives lost?).
    this.settleWindow(ctx);
    if (this.window.length === 0) {
      this.windowStartWave = ctx.wave ?? 0;
      this.windowStartGold = ctx.budget ?? 0;
      this.windowStartLives = ctx.lives ?? 0;
    }

    const state = extractState(ctx, this.towerIds, this.policyVersion);
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
        ? this.upgradeAction
        : this.saveAction;
    const executedLogprob = executedAction === action
      ? logprob
      : Math.log(Math.max(probs[executedAction], 1e-12));

    // Gold this decision will commit — used to weight wave credit.
    let spent = 0;
    if (decision.kind === 'place') {
      spent = decision.type.cost;
    } else if (decision.kind === 'upgrade') {
      const target = ctx.placedTowers.find(
        t => t.col === decision.col && t.row === decision.row,
      );
      spent = target ? target.upgradeCost : 0;
    }

    if (this.recordTrajectory) {
      const step: TrajectoryStep = {
        step: this.trajectory.length,
        state,
        action: executedAction,
        logprob: executedLogprob,
        value,
        // Intrinsic reward for investing in the board. Without this a
        // leak penalty can dominate and teach the agent to hoard gold
        // (observed on psionic: 66% saves, wipe at wave 3).
        reward: this.rewardBuildCoef * spent,
        mask,
        done: false,
      };
      this.trajectory.push(step);
      this.window.push({ step, spent });
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
    this.window = [];
    this.windowStartWave = 0;
    this.windowStartGold = 0;
    this.windowStartLives = 0;
  }

  /**
   * End-of-episode finalization, called by the runner after
   * runMatch returns. Credits the terminal +1 (win) / -1 (loss) to
   * the decisions that led to the final wave (same weighting as the
   * shaped reward), then marks the last step done. The final wave's
   * shaped reward is intentionally left unsettled — the terminal
   * bonus stands in for it.
   */
  finalize(won: boolean): void {
    const last = this.trajectory[this.trajectory.length - 1];
    if (!last) return;
    this.creditWindow(won ? 1.0 : -1.0);
    this.window = [];
    last.done = true;
  }

  // ===== State / mask / policy =====

  /** Save/upgrade action id for the active policy version. */
  private get saveAction(): number {
    return this.policyVersion === 1 ? RL_ACTION_SAVE_V1 : RL_ACTION_SAVE;
  }

  private get upgradeAction(): number {
    return this.policyVersion === 1 ? RL_ACTION_UPGRADE_V1 : RL_ACTION_UPGRADE;
  }

  /**
   * 17-dim state, canonical order (shared with the Python trainer):
   *   0  wave / 20
   *   1  gold / 1000
   *   2  lives / 100
   *   3  tower_count / 100
   *   4-10  per-tower counts / 20, in the faction's tower order
   *         (trailing slots pad with 0 for factions with < 7 towers)
   *   11 next wave total creep count / 50 (0 if unknown)
   *   12 next wave has armored 0/1
   *   13 next wave has flying 0/1 (creepType contains 'fly')
   *   14 next wave has shielded 0/1
   *   15 v2: occupied zones / 12; v1: betweenWaves 0/1
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
      const probs = new Array<number>(this.actionDim).fill(0);
      probs[this.saveAction] = 1;
      return { action: this.saveAction, logprob: 0, value: 0, probs };
    }

    if (!this.policy) {
      const action = valid[Math.floor(rng() * valid.length)];
      const probs = new Array<number>(this.actionDim).fill(0);
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

  /**
   * v2: a build action `tower*ZONE_DIM+zone` is valid iff the tower
   * is affordable AND that zone contains at least one candidate cell.
   * v1: build i is valid iff affordable. Save is always valid;
   * upgrade is valid iff an upgradable affordable tower exists.
   * Trailing build slots beyond the faction's roster are always
   * invalid.
   */
  private computeMask(ctx: BotContext): number[] {
    const mask = new Array<number>(this.actionDim).fill(0);

    if (this.policyVersion === 1) {
      for (let i = 0; i < RL_MAX_BUILD_ACTIONS; i++) {
        const towerId = this.towerIds[i];
        const tower = towerId ? TOWER_TYPES[towerId] : undefined;
        mask[i] = tower && ctx.budget >= tower.cost ? 1 : 0;
      }
      mask[RL_ACTION_SAVE_V1] = 1;
      mask[RL_ACTION_UPGRADE_V1] = this.cheapestUpgradable(ctx) ? 1 : 0;
      return mask;
    }

    // Zones that currently have at least one legal candidate cell.
    const populatedZones = new Set<number>();
    for (const c of ctx.candidateCells) {
      populatedZones.add(zoneOfCell(c.col, c.row));
    }
    for (let i = 0; i < RL_MAX_BUILD_ACTIONS; i++) {
      const towerId = this.towerIds[i];
      const tower = towerId ? TOWER_TYPES[towerId] : undefined;
      if (!tower || ctx.budget < tower.cost) continue;
      for (const zone of populatedZones) {
        mask[i * RL_ZONE_DIM + zone] = 1;
      }
    }
    mask[RL_ACTION_SAVE] = 1;
    mask[RL_ACTION_UPGRADE] = this.cheapestUpgradable(ctx) ? 1 : 0;
    return mask;
  }

  // ===== Action execution =====

  private executeAction(ctx: BotContext, action: number): BotDecision {
    if (action === this.saveAction) return { kind: 'skip' };
    if (action === this.upgradeAction) {
      const target = this.cheapestUpgradable(ctx);
      if (!target) return { kind: 'skip' };
      return { kind: 'upgrade', col: target.col, row: target.row };
    }
    // Build action. v2 packs tower and zone; v1 is tower-only.
    const towerIdx = this.policyVersion === 1
      ? action
      : Math.floor(action / RL_ZONE_DIM);
    const zone = this.policyVersion === 1 ? null : action % RL_ZONE_DIM;
    const towerId = this.towerIds[towerIdx];
    const tower = towerId ? TOWER_TYPES[towerId] : undefined;
    if (!tower) return { kind: 'skip' };
    if (ctx.budget < tower.cost) return { kind: 'skip' };
    const cell = zone === null
      ? this.pickCell(ctx, tower)
      : this.pickCellInZone(ctx, tower, zone);
    if (!cell) return { kind: 'skip' };
    return { kind: 'place', col: cell.col, row: cell.row, type: tower };
  }

  /** Learned scorer first (threshold 0.0 — any positive score
   *  wins); fall back to the candidate cell closest to the path. */
  private pickCell(
    ctx: BotContext,
    tower: TowerType,
  ): { col: number; row: number } | null {
    if (this.scorer.hasModel(this.faction)) {
      const learned = this.scorer.scorerFn(ctx, tower, 0.0);
      if (learned) return learned;
    }
    return closestCellToPath(ctx);
  }

  /** Same as pickCell, but only cells inside `zone`. The RL policy
   *  chose the zone; the scorer picks the exact cell within it. */
  private pickCellInZone(
    ctx: BotContext,
    tower: TowerType,
    zone: number,
  ): { col: number; row: number } | null {
    if (this.scorer.hasModel(this.faction)) {
      const learned = this.scorer.scorerFn(
        ctx, tower, 0.0, c => zoneOfCell(c.col, c.row) === zone,
      );
      if (learned) return learned;
    }
    return closestCellToPath(ctx, zone);
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
   * If a wave boundary has been crossed, compute the outcome of the
   * wave(s) just resolved and credit it to the decisions in the
   * window that produced it:
   *   +rewardWave per wave cleared
   *   +rewardGoldCoef per gold EARNED (income = budget delta + gold
   *     spent, floored at 0 — spending must not be punished, otherwise
   *     the agent learns to never build; capped at rewardGoldCap per
   *     wave so hoarding cannot farm it)
   *   -rewardLifePenalty per life lost
   *
   * Credit is weighted by (1 + gold spent), so build/upgrade decisions
   * receive most of the outcome and the save that starts the wave gets
   * a small share. Without this the outcome lands on the (usually
   * forced) save and every build gets 0 — see PendingStep.
   */
  private settleWindow(ctx: BotContext): void {
    if (this.window.length === 0) return;
    const wavesCleared = Math.max(0, (ctx.wave ?? 0) - this.windowStartWave);
    if (wavesCleared === 0) return;
    const livesLost = Math.max(0, this.windowStartLives - (ctx.lives ?? 0));
    const totalSpent = this.window.reduce((sum, p) => sum + p.spent, 0);
    const goldIncome = Math.max(
      0,
      (ctx.budget ?? 0) - this.windowStartGold + totalSpent,
    );
    const goldReward = Math.min(
      this.rewardGoldCoef * goldIncome,
      this.rewardGoldCap * Math.max(1, wavesCleared),
    );
    const total =
      this.rewardWave * wavesCleared -
      this.rewardLifePenalty * livesLost +
      goldReward;
    this.creditWindow(total);
    this.window = [];
  }

  /** Distribute `total` across the window's decisions, weighted by
   *  (1 + gold spent). Falls back to the last step when the window is
   *  empty (e.g. a terminal bonus after no recorded decision). */
  private creditWindow(total: number): void {
    if (this.window.length === 0) {
      const last = this.trajectory[this.trajectory.length - 1];
      if (last) last.reward += total;
      return;
    }
    const weights = this.window.map(p => 1 + p.spent);
    const wsum = weights.reduce((a, b) => a + b, 0);
    this.window.forEach((p, i) => {
      p.step.reward += total * (weights[i] / wsum);
    });
  }
}

/** Load + validate a policy weights JSON. Throws on unreadable or
 *  wrong-shaped files — a silently-random policy would corrupt
 *  training data, so fail fast instead. Accepts both the v1
 *  9-action space and the v2 86-action zone space. */
export function loadPolicy(path: string): PolicyWeights {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PolicyWeights;
  if (raw.state_dim !== RL_STATE_DIM) {
    throw new Error(
      `RLBrain: policy ${path} has state_dim ${raw.state_dim}, expected ${RL_STATE_DIM}`,
    );
  }
  if (raw.action_dim !== RL_ACTION_DIM && raw.action_dim !== RL_ACTION_DIM_V1) {
    throw new Error(
      `RLBrain: policy ${path} has action_dim ${raw.action_dim}, expected ` +
      `${RL_ACTION_DIM} (v2 zone) or ${RL_ACTION_DIM_V1} (v1)`,
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
    L.policy_w.length !== raw.action_dim || L.policy_b.length !== raw.action_dim ||
    L.value_w.length !== 1 || L.value_b.length !== 1
  ) {
    throw new Error(`RLBrain: policy ${path} has wrong layer shapes`);
  }
  return raw;
}

/**
 * Extract the 17-dim state from a BotContext. Exported for tests
 * and for the runner's sanity checks. towerIds defaults to the
 * arcane roster; pass the faction's tower list for other factions.
 *
 * `version` selects feature 15: v2 (default) is occupied zones / 12;
 * v1 is the legacy betweenWaves 0/1, so old 9-action policies see the
 * same state they were trained on.
 */
export function extractState(
  ctx: BotContext,
  towerIds: readonly string[] = ARCANE_TOWER_IDS,
  version: 1 | 2 = 2,
): number[] {
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  const counts = new Array<number>(RL_MAX_BUILD_ACTIONS).fill(0);
  const occupiedZones = new Set<number>();
  for (const t of ctx.placedTowers) {
    const idx = towerIds.indexOf(t.towerId);
    if (idx >= 0) counts[idx]++;
    occupiedZones.add(zoneOfCell(t.col, t.row));
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
    version === 1
      ? (ctx.betweenWaves ? 1 : 0)
      : clamp01(occupiedZones.size / RL_ZONE_DIM),
    clamp01(ctx.candidateCells.length / 936),
  ];
}

/** Candidate cell closest to any path point (squared distance).
 *  When `zone` is given, only cells in that zone are considered.
 *  Null when there are no candidates or no known path. */
export function closestCellToPath(
  ctx: BotContext,
  zone?: number,
): { col: number; row: number } | null {
  const cells = zone === undefined
    ? ctx.candidateCells
    : ctx.candidateCells.filter(c => zoneOfCell(c.col, c.row) === zone);
  if (cells.length === 0) return null;
  const paths = (ctx.allPaths ?? []).filter(
    (p): p is { col: number; row: number }[] => !!p && p.length > 0,
  );
  if (paths.length === 0) return cells[0];
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (const c of cells) {
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
