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
import { CellType } from '../../Grid';
import { findPath, PathPoint } from '../../Pathfinding';
import { scoreMazeCells, pathCellsWithinRange } from '../MazePlanner';
import {
  extractSpatialFeatures, SPATIAL_FEATURE_COUNT,
  extractZoneSpatialFeatures, ZONE_SPATIAL_FEATURE_COUNT,
  extractZoneMazeFeatures, ZONE_MAZE_FEATURE_COUNT,
  extractZoneExposureFeatures, ZONE_EXPOSURE_FEATURE_COUNT,
  computeArmyExposure,
} from '../../learning/BoardEncoder';

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
/** v3: v2's 17 features + the decision-relevant spatial aggregates
 *  from BoardEncoder (path coverage, maze potential, best-cell
 *  coverage, tower-to-lane distance, exit coverage). Policies pin
 *  their version via state_dim: 17 → v1/v2, RL_STATE_DIM_V3 → v3. */
export const RL_STATE_DIM_V3 = RL_STATE_DIM + SPATIAL_FEATURE_COUNT; // 22
/** v4: v3's 22 features + 24 per-zone spatial features (12 zone tower
 *  densities + 12 zone path-coverage potentials). Gives the policy explicit
 *  awareness of which zones are saturated or cover the lane. */
export const RL_STATE_DIM_V4 = RL_STATE_DIM_V3 + ZONE_SPATIAL_FEATURE_COUNT; // 46
/** v5: v4's 46 features + 12 per-zone mazing potential features (max ΔL
 *  path-length gain achievable in each zone). Lets the policy see which
 *  zones have open choke points that will lengthen the creep path. */
export const RL_STATE_DIM_V5 = RL_STATE_DIM_V4 + ZONE_MAZE_FEATURE_COUNT; // 58
/** v6: v5's 58 features + 12 per-zone post-placement Total Army Exposure
 *  gain features (max ΔE = existing towers' gained path coverage on the
 *  simulated new path P_new plus the new tower's coverage on P_new). */
export const RL_STATE_DIM_V6 = RL_STATE_DIM_V5 + ZONE_EXPOSURE_FEATURE_COUNT; // 70
/** Legacy 9-action space: actions 0-6 build, 7 save, 8 upgrade. */
export const RL_ACTION_DIM_V1 = 9;
export const RL_ACTION_SAVE_V1 = 7;
export const RL_ACTION_UPGRADE_V1 = 8;

/** Ordered per-zone serpentine switchback scaffold cells for standard 36x26
 *  horizontal maps (entry at (0, 13), exit at (35, 13)).
 *
 *  Why a scaffold prior is needed alongside single-step A* (ΔL, ΔE):
 *  On an open 26-row board, single-step A* pathfinding cannot discover
 *  a multi-tower U-turn until the entire boundary rail sealing one side
 *  to a map edge or obstacle is complete — the first 5 towers of a 6-tower
 *  U-turn have single-step ΔL = 0, and only the 6th tower unlocks ΔL = +14!
 *  Ordering each zone's 1-tile-separated switchback rails & alternating
 *  vertical baffles gives single-step evaluation a progressive gradient
 *  toward full multi-pass serpentine corridors without any 2x2 blobs. */
const ZONE_SERPENTINE_SCAFFOLD: Record<number, readonly (readonly [number, number])[]> = {
  // Column sector 0 (Zones 0 & 6, cols 0..5): Self-contained 3-pass spawn switchback!
  // Seals (0,14) + row 12 (1..5) + (1,13) so creeps from (0,13) MUST step up to (0,12)->(0,11),
  // walk right along row 11 to (4,11), turn up at (4,9) and walk left along row 9 to (1,9),
  // turn up to row 7 and walk right along row 7!
  0: [
    [0, 14],
    [1, 12], [2, 12], [3, 12], [4, 12], [5, 12],
    [1, 13],
    [5, 11], [5, 10],
    [0, 10], [1, 10], [2, 10], [3, 10],
    [5, 9],
    [0, 9], [0, 8], [0, 7],
    [2, 8], [3, 8], [4, 8], [5, 8],
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  ],
  6: [
    [0, 14], [1, 13],
    [1, 12], [2, 12], [3, 12], [4, 12], [5, 12],
    [2, 14], [3, 14], [4, 14], [5, 14],
    [5, 15], [5, 16],
    [0, 16], [1, 16], [2, 16], [3, 16],
    [0, 17], [0, 18],
    [2, 18], [3, 18], [4, 18], [5, 18],
  ],
  // Column sector 1 (Zones 1 & 7, cols 6..11): Ceiling row 8 (cols 6..9 connecting to top lake at (10,8)),
  // alternating vertical baffles at col 7 (rows 10..14), col 9 (rows 9..13), col 11 (rows 10..14), floor row 15
  1: [
    [6, 8], [7, 8], [8, 8], [9, 8],
    [7, 10], [7, 11], [7, 12], [7, 13], [7, 14],
    [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15],
    [9, 9], [9, 10], [9, 11], [9, 12], [9, 13],
    [11, 10], [11, 11], [11, 12], [11, 13], [11, 14],
  ],
  7: [
    [7, 13], [7, 14],
    [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15],
    [9, 13], [11, 13], [11, 14],
    [7, 12], [7, 11], [7, 10],
    [9, 12], [9, 11], [9, 10], [9, 9],
  ],
  // Column sector 2 (Zones 2 & 8, cols 12..17): Alternating vertical baffles at col 13, 15, 17 + rails
  2: [
    [13, 12], [13, 11], [13, 10], [13, 9], [13, 13],
    [15, 12], [15, 11], [15, 10], [15, 13], [15, 14],
    [17, 12], [17, 11], [17, 10], [17, 9], [17, 13],
    [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8],
  ],
  8: [
    [13, 13], [15, 13], [15, 14], [17, 13],
    [12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15],
    [13, 12], [13, 11], [15, 12], [15, 11], [17, 12], [17, 11],
  ],
  // Column sector 3 (Zones 3 & 9, cols 18..23): Alternating vertical baffles at col 19, 21, 23 + rails
  3: [
    [19, 12], [19, 11], [19, 10], [19, 13], [19, 14],
    [21, 12], [21, 11], [21, 10], [21, 9], [21, 13],
    [23, 12], [23, 11], [23, 10], [23, 13], [23, 14],
    [18, 8], [19, 8], [20, 8], [21, 8], [22, 8], [23, 8],
  ],
  9: [
    [19, 13], [19, 14], [21, 13], [23, 13], [23, 14],
    [18, 15], [19, 15], [20, 15], [21, 15], [22, 15], [23, 15],
    [19, 12], [19, 11], [21, 12], [21, 11], [23, 12], [23, 11],
  ],
  // Column sector 4 (Zones 4 & 10, cols 24..29): Alternating vertical baffles at col 25, 27, 29 + rails
  4: [
    [25, 12], [25, 11], [25, 10], [25, 9], [25, 13],
    [27, 12], [27, 11], [27, 10], [27, 13], [27, 14],
    [29, 12], [29, 11], [29, 10], [29, 9], [29, 13],
    [24, 8], [25, 8], [26, 8], [27, 8], [28, 8], [29, 8],
  ],
  10: [
    [25, 13], [27, 13], [27, 14], [29, 13],
    [24, 15], [25, 15], [26, 15], [27, 15], [28, 15], [29, 15],
    [25, 12], [25, 11], [27, 12], [27, 11], [29, 12], [29, 11],
  ],
  // Column sector 5 (Zones 5 & 11, cols 30..35): Self-contained 3-pass exit switchback!
  5: [
    [35, 12],
    [34, 13], [33, 13], [32, 13], [31, 13], [30, 13],
    [34, 12], [33, 12], [32, 12], [31, 12], [30, 12],
    [35, 11], [35, 10],
    [33, 10], [32, 10], [31, 10], [30, 10],
    [30, 9], [30, 8],
    [35, 8], [34, 8], [33, 8], [32, 8],
  ],
  11: [
    [35, 12],
    [34, 13], [33, 13], [32, 13], [31, 13], [30, 13],
    [30, 14], [30, 15], [30, 16],
    [35, 15], [34, 15], [33, 15], [32, 15],
    [35, 16], [35, 17], [35, 18],
    [33, 17], [32, 17], [31, 17], [30, 17],
    [34, 19], [33, 19], [32, 19], [31, 19], [30, 19],
  ],
};

/**Zone index of a board cell: rowBucket * ZONE_COLS + colBucket. */
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
  /** Immediate reward per tile of creep-path extension (ΔL > 0) caused
   *  by a placement. Directly reinforces multi-step zig-zag mazing.
   *  Default 0.04 (+2 tile detour = +0.08, +6 tile switchback = +0.24). */
  rewardMazeCoef?: number;
  /** Immediate reward per unit of post-placement Total Army Exposure gain
   *  (ΔE > 0: how many additional path tiles existing towers + the new tower
   *  can fire upon along the simulated post-placement path P_new).
   *  Default 0.005 (+10 tower-tile exposure = +0.05). */
  rewardExposureCoef?: number;
  /** State feature version: 2 (default, 17 dims), 3 (22 dims, adds
   *  the spatial aggregates), 4 (46 dims, adds per-zone spatial
   *  features), 5 (58 dims, adds per-zone mazing potential), or
   *  6 (70 dims, adds per-zone post-placement Total Army Exposure gain).
   *  A loaded policy's own state_dim wins over this — an
   *  old policy must keep seeing its old inputs. */
  stateVersion?: 2 | 3 | 4 | 5 | 6;
}

/** Policy weights JSON, produced by the Python trainer.
 *  All weight matrices are [out][in] row-major.
 *  Supports both legacy shared-trunk (`shared` or omitted) and
 *  decoupled actor-critic with residual blocks (`decoupled_res`). */
export interface PolicyWeights {
  arch?: 'shared' | 'decoupled_res';
  state_dim: number;
  hidden: number[];
  action_dim: number;
  layers: {
    // Legacy shared trunk
    trunk1_w?: number[][];
    trunk1_b?: number[];
    trunk2_w?: number[][];
    trunk2_b?: number[];
    // Decoupled actor-critic + residual blocks
    actor_in_w?: number[][];
    actor_in_b?: number[];
    actor_res1_w?: number[][];
    actor_res1_b?: number[];
    actor_res2_w?: number[][];
    actor_res2_b?: number[];
    critic_in_w?: number[][];
    critic_in_b?: number[];
    critic_res1_w?: number[][];
    critic_res1_b?: number[];
    critic_res2_w?: number[][];
    critic_res2_b?: number[];
    // Heads
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
  /** State feature version: 1/2 are the 17-dim state, 3 adds the
   *  spatial aggregates (22 dims), 4 adds per-zone spatial features
   *  (46 dims), 5 adds per-zone mazing potential (58 dims), 6 adds
   *  per-zone post-placement Total Army Exposure gain (70 dims). Derived
   *  from the policy's state_dim so an old policy keeps its old inputs. */
  private stateVersion: 1 | 2 | 3 | 4 | 5 | 6 = 2;
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
  private rewardMazeCoef: number;
  private rewardExposureCoef: number;

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
    this.rewardMazeCoef = options.rewardMazeCoef ?? 0.04;
    this.rewardExposureCoef = options.rewardExposureCoef ?? 0.005;
    this.stateVersion = options.stateVersion ?? 2;
    if (options.policyPath) {
      this.policy = loadPolicyCached(options.policyPath);
      this.policyVersion =
        this.policy.action_dim === RL_ACTION_DIM_V1 ? 1 : 2;
      // The file is authoritative: a v6/v5/v4/v3-shaped policy gets v6/v5/v4/v3 state
      // regardless of the option, and a 17-dim one keeps 17.
      this.stateVersion = this.policy.state_dim === RL_STATE_DIM_V6
        ? 6
        : this.policy.state_dim === RL_STATE_DIM_V5
          ? 5
          : this.policy.state_dim === RL_STATE_DIM_V4
            ? 4
            : this.policy.state_dim === RL_STATE_DIM_V3
              ? 3
              : this.policyVersion === 1 ? 1 : 2;
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

    const state = extractState(ctx, this.towerIds, this.stateVersion);
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
    let mazeDelta = 0;
    let exposureDelta = 0;
    if (decision.kind === 'place') {
      spent = decision.type.cost;
      const impact = computePlacementImpact(ctx, decision.col, decision.row, decision.type);
      mazeDelta = impact.mazeDelta;
      exposureDelta = impact.exposureDelta;
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
        // Intrinsic reward for investing in the board + immediate bonus
        // for placements that extend the active creep path (ΔL > 0) and
        // increase Total Army Exposure along the new path (ΔE > 0).
        reward:
          this.rewardBuildCoef * spent +
          this.rewardMazeCoef * mazeDelta +
          this.rewardExposureCoef * exposureDelta,
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
    return forwardPolicy(this.policy as PolicyWeights, state);
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
    // Note: because the initial creep path runs along row 13 (the boundary
    // between top zones 0..5 and bottom zones 6..11), a full serpentine
    // switchback in column sector c = zone % 6 spans both the top and bottom
    // halves of that column sector. We consider a zone available if its
    // column sector (c or c+6) has candidate cells.
    const populatedColSectors = new Set<number>();
    for (const c of ctx.candidateCells) {
      populatedColSectors.add(zoneOfCell(c.col, c.row) % RL_ZONE_COLS);
    }
    for (let i = 0; i < RL_MAX_BUILD_ACTIONS; i++) {
      const towerId = this.towerIds[i];
      const tower = towerId ? TOWER_TYPES[towerId] : undefined;
      if (!tower || ctx.budget < tower.cost) continue;
      for (let z = 0; z < RL_ZONE_DIM; z++) {
        if (populatedColSectors.has(z % RL_ZONE_COLS)) {
          mask[i * RL_ZONE_DIM + z] = 1;
        }
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
   *  chose the zone; our v6 post-placement path simulator & corridor
   *  mazing scorer evaluates every candidate cell in the zone by:
   *    1. Simulating the exact post-placement path P_new if the cell sits
   *       on an active creep path (filtering out illegal exit-blocking cells).
   *    2. ΔL: exact path-length extension (|P_new| - |P_old|).
   *    3. ΔArmyExposure: how many ADDITIONAL path tiles existing towers can
   *       fire upon along P_new vs P_old (rewards forcing creeps to loop
   *       around existing towers instead of pushing the path away from them).
   *    4. SelfCoverage(P_new): how many tiles of the NEW path P_new fall
   *       within this new tower's range.
   *    5. Anti-Blob & Corridor Geometry: penalizes 2x2 solid tower blocks
   *       and 3+ orthogonal neighbor clumping (which create dead interior
   *       towers and seal off corridors), while rewarding 1-tile corridor
   *       gaps (tower 2 tiles away with an open channel between) and
   *       perpendicular wall extensions.
   *    6. Aura synergy & LearnedScorer prior. */
  private pickCellInZone(
    ctx: BotContext,
    tower: TowerType,
    zone: number,
  ): { col: number; row: number } | null {
    const colSector = zone % RL_ZONE_COLS;
    const isTopChosen = zone < RL_ZONE_COLS;
    // Include the full vertical column sector (top + bottom halves of columns
    // [colSector*6 .. colSector*6+5]) so switchbacks can seal across row 13!
    const zoneCells = ctx.candidateCells.filter(
      c => zoneOfCell(c.col, c.row) % RL_ZONE_COLS === colSector,
    );
    if (zoneCells.length === 0) return null;

    const paths = (ctx.allPaths ?? []).filter(
      (p): p is PathPoint[] => !!p && p.length > 0,
    );
    if (!ctx.grid || paths.length === 0) {
      if (this.scorer.hasModel(this.faction)) {
        const learned = this.scorer.scorerFn(
          ctx, tower, 0.0, c => zoneOfCell(c.col, c.row) % RL_ZONE_COLS === colSector,
        );
        if (learned) return learned;
      }
      return closestCellToPath(ctx, zone);
    }

    const baseLen = paths.reduce((s, p) => s + p.length, 0);
    const baseArmyExp = computeArmyExposure(ctx, paths);

    const pathSet = new Set<string>();
    for (const p of paths) {
      for (const pt of p) pathSet.add(`${pt.col},${pt.row}`);
    }

    const towerSet = new Set<string>();
    for (const t of ctx.placedTowers) {
      towerSet.add(`${t.col},${t.row}`);
    }

    // 1. For every on-path candidate cell in this column sector, simulate blocking it
    //    to obtain the exact post-placement path P_new, its length gain ΔL,
    //    and the resulting change in existing towers' path coverage ΔArmyExp.
    const simResultMap = new Map<string, { gain: number; armyDelta: number; newPaths: PathPoint[][] }>();
    const illegalBlockSet = new Set<string>();
    for (const c of zoneCells) {
      const k = `${c.col},${c.row}`;
      if (!pathSet.has(k)) continue;
      const rowArr = ctx.grid.cells[c.row];
      if (!rowArr) continue;
      const orig = rowArr[c.col];
      rowArr[c.col] = CellType.Blocked;
      let newPaths: PathPoint[][] | null = [];
      let newLen = 0;
      try {
        for (const p of paths) {
          const np = findPath(ctx.grid, p[0], p[p.length - 1]);
          if (!np) {
            newPaths = null;
            break;
          }
          newPaths.push(np);
          newLen += np.length;
        }
      } finally {
        rowArr[c.col] = orig;
      }
      if (!newPaths) {
        illegalBlockSet.add(k);
        continue;
      }
      const newArmyExp = computeArmyExposure(ctx, newPaths);
      simResultMap.set(k, {
        gain: Math.max(0, newLen - baseLen),
        armyDelta: newArmyExp - baseArmyExp,
        newPaths,
      });
    }

    const isWallTier = tower.cost <= 45;
    const isMidTier = tower.cost <= 90;
    const mazeWeight = isWallTier ? 1.15 : isMidTier ? 0.90 : 0.45;
    const armyExpWeight = isWallTier ? 0.18 : isMidTier ? 0.15 : 0.12;
    const coverWeight = isWallTier ? 0.85 : 1.25;
    const hasLearned = this.scorer.hasModel(this.faction);
    const effRange = Math.max(2, tower.range || 3);

    const auraTowers = ctx.placedTowers.filter(
      t => t.towerId.includes('focus') || t.towerId.includes('aura') || t.towerId.includes('amp'),
    );
    const isThisAura = tower.id.includes('focus') || tower.id.includes('aura') || tower.id.includes('amp');

    // Ordered serpentine scaffold lookup for this column sector:
    const topZone = colSector;
    const botZone = colSector + RL_ZONE_COLS;
    const primaryList = ZONE_SERPENTINE_SCAFFOLD[isTopChosen ? topZone : botZone] ?? [];
    const secondaryList = ZONE_SERPENTINE_SCAFFOLD[isTopChosen ? botZone : topZone] ?? [];
    const combinedScaffold: (readonly [number, number])[] = [...primaryList, ...secondaryList];

    const scaffoldBonusMap = new Map<string, number>();
    let openRank = 0;
    for (const [sc, sr] of combinedScaffold) {
      const sk = `${sc},${sr}`;
      if (scaffoldBonusMap.has(sk) || towerSet.has(sk) || illegalBlockSet.has(sk)) continue;
      // Earlier unplaced scaffold cells get the highest priority so walls
      // complete in coherent U-turn order before starting outer rails.
      scaffoldBonusMap.set(sk, Math.max(0.60, 4.20 - openRank * 0.22));
      openRank++;
    }

    let bestCell: { col: number; row: number } | null = null;
    let bestScore = -Infinity;

    for (const c of zoneCells) {
      const key = `${c.col},${c.row}`;
      if (illegalBlockSet.has(key)) continue; // would block the exit!

      const sim = simResultMap.get(key);
      const gain = sim ? sim.gain : 0;
      const armyDelta = sim ? sim.armyDelta : 0;
      const evalPaths = sim ? sim.newPaths : paths;

      // Self path coverage evaluated on the POST-PLACEMENT path P_new
      let covered = 0;
      for (const p of evalPaths) {
        covered += pathCellsWithinRange(c, p, effRange);
      }
      const coverNorm = Math.min(1.6, covered / Math.max(4, effRange * 2.2));

      // Anti-Blob & Corridor Mazing Geometry:
      // 1) Count 2x2 solid squares created by placing at (c.col, c.row).
      //    Solid 2x2 blocks waste interior range and prevent switchback channels.
      let squares2x2 = 0;
      for (const dc of [-1, 1]) {
        for (const dr of [-1, 1]) {
          if (
            towerSet.has(`${c.col + dc},${c.row}`) &&
            towerSet.has(`${c.col},${c.row + dr}`) &&
            towerSet.has(`${c.col + dc},${c.row + dr}`)
          ) {
            squares2x2++;
          }
        }
      }

      // 2) Orthogonal neighbors: 1 orthogonal neighbor extends a 1-tile-thick
      //    wall segment; 2 in a line bridges a wall; 3 or 4 buries the tower in a blob.
      const nUp = towerSet.has(`${c.col},${c.row - 1}`);
      const nDown = towerSet.has(`${c.col},${c.row + 1}`);
      const nLeft = towerSet.has(`${c.col - 1},${c.row}`);
      const nRight = towerSet.has(`${c.col + 1},${c.row}`);
      const orthoCount = (nUp ? 1 : 0) + (nDown ? 1 : 0) + (nLeft ? 1 : 0) + (nRight ? 1 : 0);

      // 3) 1-tile corridor spacing bonus: a tower at distance 2 with an empty
      //    walkable path tile at distance 1 between them forms a 1-tile gauntlet
      //    channel where creeps get shot from both sides!
      let corridorBonus = 0;
      for (const [dc, dr] of [[0, -2], [0, 2], [-2, 0], [2, 0]] as const) {
        const midKey = `${c.col + dc / 2},${c.row + dr / 2}`;
        const farKey = `${c.col + dc},${c.row + dr}`;
        if (towerSet.has(farKey) && !towerSet.has(midKey)) {
          corridorBonus += pathSet.has(midKey) ? 0.45 : 0.22;
        }
      }

      // 4) Wall-extension bonus: extending a vertical 1-tile tooth/baffle
      //    perpendicular to the horizontal map flow (or stepping directly
      //    onto the path adjacent to an existing tooth to push the switchback
      //    one row deeper!).
      let finBonus = 0;
      if (squares2x2 === 0) {
        const extendsVertical = (nUp || nDown) && !nLeft && !nRight;
        if (extendsVertical && gain > 0) {
          // Stepping ON the path right at the tip of an existing vertical wall
          // tooth! This is the classic TD switchback extension move.
          finBonus = 0.85;
        } else if (extendsVertical) {
          finBonus = 0.35;
        }
      }

      const scaffoldBonus = scaffoldBonusMap.get(key) ?? 0;

      const blobPenalty =
        squares2x2 * 1.65 +
        (orthoCount >= 3 ? (orthoCount - 2) * 0.85 : 0);

      // Aura synergy: DPS towers want to sit near an aura tower; aura towers
      // want to sit near existing DPS towers.
      let synergy = 0;
      if (isThisAura) {
        let neighbours = 0;
        const r2 = effRange * effRange;
        for (const pt of ctx.placedTowers) {
          const dx = pt.col - c.col, dy = pt.row - c.row;
          if (dx * dx + dy * dy <= r2) neighbours++;
        }
        synergy = Math.min(0.6, neighbours * 0.15);
      } else if (auraTowers.length > 0) {
        for (const a of auraTowers) {
          const aDef = TOWER_TYPES[a.towerId];
          const ar = aDef?.range ?? 3;
          const dx = a.col - c.col, dy = a.row - c.row;
          if (dx * dx + dy * dy <= ar * ar) {
            synergy += 0.25;
            break;
          }
        }
      }

      const learnedScore = hasLearned ? this.scorer.score(ctx, c, tower) : 0.5;

      const totalScore =
        mazeWeight * gain +
        armyExpWeight * armyDelta +
        coverWeight * coverNorm +
        scaffoldBonus +
        corridorBonus +
        finBonus -
        blobPenalty +
        synergy +
        0.25 * learnedScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCell = c;
      }
    }

    return bestCell ?? closestCellToPath(ctx, zone);
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
 *  training data, so fail fast instead. Accepts the v1 9-action
 *  space, the v2 86-action zone space, the v3 22-dim state, and
 *  the v4 46-dim per-zone state, as well as both `shared` and
 *  `decoupled_res` network architectures. */
export function loadPolicy(path: string): PolicyWeights {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PolicyWeights;
  if (
    raw.state_dim !== RL_STATE_DIM &&
    raw.state_dim !== RL_STATE_DIM_V3 &&
    raw.state_dim !== RL_STATE_DIM_V4 &&
    raw.state_dim !== RL_STATE_DIM_V5 &&
    raw.state_dim !== RL_STATE_DIM_V6
  ) {
    throw new Error(
      `RLBrain: policy ${path} has state_dim ${raw.state_dim}, expected ` +
      `${RL_STATE_DIM} (v2), ${RL_STATE_DIM_V3} (v3), ${RL_STATE_DIM_V4} (v4), ${RL_STATE_DIM_V5} (v5), or ${RL_STATE_DIM_V6} (v6)`,
    );
  }
  if (raw.action_dim !== RL_ACTION_DIM && raw.action_dim !== RL_ACTION_DIM_V1) {
    throw new Error(
      `RLBrain: policy ${path} has action_dim ${raw.action_dim}, expected ` +
      `${RL_ACTION_DIM} (v2 zone) or ${RL_ACTION_DIM_V1} (v1)`,
    );
  }
  const arch = raw.arch ?? 'shared';
  const L = raw.layers;
  if (!L) {
    throw new Error(`RLBrain: policy ${path} missing layers`);
  }
  if (arch === 'decoupled_res') {
    const d = raw.hidden?.[0] ?? 128;
    if (
      !L.actor_in_w || L.actor_in_w.length !== d || L.actor_in_b?.length !== d ||
      !L.actor_res1_w || L.actor_res1_w.length !== d ||
      !L.actor_res2_w || L.actor_res2_w.length !== d ||
      !L.critic_in_w || L.critic_in_w.length !== d || L.critic_in_b?.length !== d ||
      !L.critic_res1_w || L.critic_res1_w.length !== d ||
      !L.critic_res2_w || L.critic_res2_w.length !== d ||
      L.policy_w.length !== raw.action_dim || L.policy_b.length !== raw.action_dim ||
      L.value_w.length !== 1 || L.value_b.length !== 1
    ) {
      throw new Error(`RLBrain: decoupled_res policy ${path} has wrong layer shapes`);
    }
    return raw;
  }
  if (!raw.hidden || raw.hidden[0] !== 128 || raw.hidden[1] !== 64) {
    throw new Error(
      `RLBrain: policy ${path} has hidden ${JSON.stringify(raw.hidden)}, expected [128, 64]`,
    );
  }
  if (
    !L.trunk1_w || !L.trunk1_b || !L.trunk2_w || !L.trunk2_b ||
    L.trunk1_w.length !== 128 || L.trunk1_b.length !== 128 ||
    L.trunk2_w.length !== 64 || L.trunk2_b.length !== 64 ||
    L.policy_w.length !== raw.action_dim || L.policy_b.length !== raw.action_dim ||
    L.value_w.length !== 1 || L.value_b.length !== 1
  ) {
    throw new Error(`RLBrain: policy ${path} has wrong layer shapes`);
  }
  return raw;
}

/** Run forward pass for either `shared` or `decoupled_res` policy.
 *  Exported so unit tests can verify exact numerical parity with Python. */
export function forwardPolicy(
  p: PolicyWeights,
  state: number[],
): { logits: number[]; value: number } {
  const L = p.layers;
  if (p.arch === 'decoupled_res') {
    const a0 = matvecTanh(L.actor_in_w!, L.actor_in_b!, state);
    const a1 = vecAdd(a0, matvecTanh(L.actor_res1_w!, L.actor_res1_b!, a0));
    const a2 = vecAdd(a1, matvecTanh(L.actor_res2_w!, L.actor_res2_b!, a1));
    const logits = matvec(L.policy_w, L.policy_b, a2);

    const c0 = matvecTanh(L.critic_in_w!, L.critic_in_b!, state);
    const c1 = vecAdd(c0, matvecTanh(L.critic_res1_w!, L.critic_res1_b!, c0));
    const c2 = vecAdd(c1, matvecTanh(L.critic_res2_w!, L.critic_res2_b!, c1));
    const value = matvec(L.value_w, L.value_b, c2)[0];
    return { logits, value };
  }
  const h1 = matvecRelu(L.trunk1_w!, L.trunk1_b!, state);
  const h2 = matvecRelu(L.trunk2_w!, L.trunk2_b!, h1);
  const logits = matvec(L.policy_w, L.policy_b, h2);
  const value = matvec(L.value_w, L.value_b, h2)[0];
  return { logits, value };
}

/**
 * Extract the state vector from a BotContext. Exported for tests
 * and for the runner's sanity checks. towerIds defaults to the
 * arcane roster; pass the faction's tower list for other factions.
 *
 * `version` selects the state layout:
 *   - 1: 17 dims (legacy feature 15 = betweenWaves 0/1)
 *   - 2: 17 dims (feature 15 = occupied zones / 12)
 *   - 3: 22 dims (v2 + 5 global spatial aggregates from BoardEncoder)
 *   - 4: 46 dims (v3 + 24 per-zone tower density & coverage features)
 *   - 5: 58 dims (v4 + 12 per-zone mazing potential features)
 *   - 6: 70 dims (v5 + 12 per-zone post-placement Total Army Exposure gain features)
 * Each version is strictly prefix-compatible with the previous version.
 */
export function extractState(
  ctx: BotContext,
  towerIds: readonly string[] = ARCANE_TOWER_IDS,
  version: 1 | 2 | 3 | 4 | 5 | 6 = 2,
): number[] {
  const base = extractStateBase(ctx, towerIds, version === 1 ? 1 : 2);
  if (version <= 2) return base;
  const v3 = [...base, ...extractSpatialFeatures(ctx)];
  if (version === 3) return v3;
  const v4 = [...v3, ...extractZoneSpatialFeatures(ctx)];
  if (version === 4) return v4;
  const v5 = [...v4, ...extractZoneMazeFeatures(ctx)];
  if (version === 5) return v5;
  return [...v5, ...extractZoneExposureFeatures(ctx)];
}

/** Measure exact path-length gain (ΔL >= 0) and Total Army Exposure gain
 *  (ΔE >= 0: existing towers' gained path coverage on the simulated post-placement
 *  path P_new plus the new tower's own coverage on P_new) produced by placing
 *  `tower` at `(col, row)`. */
export function computePlacementImpact(
  ctx: BotContext,
  col: number,
  row: number,
  tower?: TowerType,
): { mazeDelta: number; exposureDelta: number } {
  const paths = (ctx.allPaths ?? []).filter(
    (p): p is PathPoint[] => !!p && p.length > 0,
  );
  if (!ctx.grid || paths.length === 0) return { mazeDelta: 0, exposureDelta: 0 };

  const effRange = Math.max(2, tower?.range ?? 3);
  let onPath = false;
  for (const p of paths) {
    for (const pt of p) {
      if (pt.col === col && pt.row === row) {
        onPath = true;
        break;
      }
    }
    if (onPath) break;
  }

  if (!onPath) {
    let selfCov = 0;
    for (const p of paths) {
      selfCov += pathCellsWithinRange({ col, row }, p, effRange);
    }
    return { mazeDelta: 0, exposureDelta: selfCov };
  }

  const baseArmyExp = computeArmyExposure(ctx, paths);
  const rowArr = ctx.grid.cells[row];
  if (!rowArr) return { mazeDelta: 0, exposureDelta: 0 };
  const original = rowArr[col];
  rowArr[col] = CellType.Blocked;
  try {
    let oldTotal = 0;
    let newTotal = 0;
    const newPaths: PathPoint[][] = [];
    for (const p of paths) {
      oldTotal += p.length;
      const start = p[0];
      const end = p[p.length - 1];
      const newP = findPath(ctx.grid, start, end);
      if (!newP) return { mazeDelta: 0, exposureDelta: 0 };
      newTotal += newP.length;
      newPaths.push(newP);
    }
    const mazeDelta = Math.max(0, newTotal - oldTotal);
    const newArmyExp = computeArmyExposure(ctx, newPaths);
    let selfCov = 0;
    for (const np of newPaths) {
      selfCov += pathCellsWithinRange({ col, row }, np, effRange);
    }
    const exposureDelta = Math.max(0, (newArmyExp - baseArmyExp) + selfCov);
    return { mazeDelta, exposureDelta };
  } finally {
    rowArr[col] = original;
  }
}

/** Measure exact path-length gain (ΔL >= 0) produced by blocking `(col, row)`. */
export function computeMazeDelta(
  ctx: BotContext,
  col: number,
  row: number,
): number {
  return computePlacementImpact(ctx, col, row).mazeDelta;
}

function extractStateBase(
  ctx: BotContext,
  towerIds: readonly string[],
  version: 1 | 2,
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

function matvecTanh(w: number[][], b: number[], x: number[]): number[] {
  return matvec(w, b, x).map(v => Math.tanh(v));
}

function vecAdd(a: number[], b: number[]): number[] {
  const out: number[] = new Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
  return out;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}
