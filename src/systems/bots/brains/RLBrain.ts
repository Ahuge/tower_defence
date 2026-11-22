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
import { getTowerRole } from '../../../data/TowerRoles';
import { LearnedScorer } from '../../../../playtest/LearnedScorer';
import { getCachedScorerModel } from './scorerModelLoader';
import { rng } from '../../Rng';
import { CellType } from '../../Grid';
import { findPath, PathPoint } from '../../Pathfinding';
import { scoreMazeCells, pathCellsWithinRange } from '../MazePlanner';
import {
  extractSpatialFeatures, SPATIAL_FEATURE_COUNT,
  extractZoneSpatialFeatures, ZONE_SPATIAL_FEATURE_COUNT,
  extractZoneMazeFeatures, ZONE_MAZE_FEATURE_COUNT,
  extractZoneExposureFeatures, ZONE_EXPOSURE_FEATURE_COUNT,
  extractZoneTopologyFeatures, ZONE_TOPOLOGY_FEATURE_COUNT,
  extractAuraFeatures, AURA_FEATURE_COUNT,
  extractZoneSynergyFeatures, ZONE_SYNERGY_FEATURE_COUNT,
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

/** Build-action tower ids per faction, in action order (matching
 *  FACTIONS[id].towerIds in src/data/Factions.ts). MUST match
 *  the Python side (ml/desktop/rl/env.py FACTION_TOWERS) exactly —
 *  action i builds RL_FACTION_TOWERS[faction][i]. */
export const RL_FACTION_TOWERS: Record<string, readonly string[]> = {
  arcane: ARCANE_TOWER_IDS,
  psionic: PSIONIC_TOWER_IDS,
  mechanical: [
    'mech_wall', 'mech_turret', 'mech_flamethrower', 'mech_tesla',
    'mech_mortar', 'mech_shredder', 'mech_railgun', 'mech_titan',
  ],
  nature: [
    'nature_bramble', 'nature_root', 'nature_viper', 'nature_blossom',
    'nature_spore', 'nature_sunroot', 'nature_vine', 'nature_elder',
  ],
  void: [
    'void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion',
  ],
  military: [
    'mil_sandbag', 'mil_wire', 'mil_rifleman', 'mil_sniper',
    'mil_heavy', 'mil_artillery', 'mil_commander',
  ],
  aliens: [
    'alien_spitter', 'alien_stinger', 'alien_swarm_node', 'alien_acid',
    'alien_hive_spire', 'alien_brood_mother', 'alien_swarmling', 'alien_overmind',
  ],
  cypherpunk: [
    'cyber_ping', 'cyber_firewall', 'cyber_virus', 'cyber_backdoor',
    'cyber_ddos', 'cyber_rootkit', 'cyber_zeroday',
  ],
  infernal: [
    'infernal_imp', 'infernal_hellfire', 'infernal_soul_drain',
    'infernal_bomber', 'infernal_immolate', 'infernal_apocalypse',
  ],
  celestial: [
    'celestial_acolyte', 'celestial_ward', 'celestial_smite',
    'celestial_martyr', 'celestial_prophet', 'celestial_absolution',
  ],
  harmonic: [
    'harmonic_resonator', 'harmonic_amplifier', 'harmonic_quickener',
    'harmonic_reach', 'harmonic_critical_mass', 'harmonic_conduit',
    'harmonic_crescendo',
  ],
};

/** Build slots for a faction's tower roster: 7 for <=7-tower factions
 *  (action_dim 86, backwards-compatible with all existing policies),
 *  8 for 8-tower factions (mechanical, nature, aliens: action_dim 98). */
export function buildSlotsForTowers(towerIds: readonly string[]): number {
  return Math.max(RL_MAX_BUILD_ACTIONS, towerIds.length);
}

/** True when a tower spawns a non-blocking mobile unit (does not alter
 *  grid pathfinding or build maze walls). */
export function isMobileTower(tower?: TowerType): boolean {
  return !!tower?.traits?.some(tr => tr.id === 'mobile_unit');
}

const AURA_TOWER_TOKENS = [
  'focus', 'aura', 'amp', 'blossom', 'ward', 'quickener',
  'reach', 'critical_mass', 'conduit', 'swarm_node', 'backdoor', 'commander',
];
function isAuraTowerId(towerId: string): boolean {
  return AURA_TOWER_TOKENS.some(tok => towerId.includes(tok));
}

/** A tower that actually deals damage — walls and pure support excluded. */
function isDamageTowerId(towerId: string): boolean {
  const def = TOWER_TYPES[towerId];
  if (!def || def.damage <= 0) return false;
  const role = getTowerRole(def);
  return role !== 'aura' && role !== 'wall';
}

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
/** v7: v6's 70 features + 24 per-zone map topology features (12 zone exit
 *  proximity + 12 zone multi-lane path traffic fraction). Enables a single
 *  policy to read exit location & lane convergence across all maps. */
export const RL_STATE_DIM_V7 = RL_STATE_DIM_V6 + ZONE_TOPOLOGY_FEATURE_COUNT; // 94
/** v8: v7's 94 features + aura-synergy & short-range coverage features
 *  (4 global aura-network aggregates + 12 per-zone aura coverage + 12
 *  per-zone short-range coverage potentials). Lets the policy model
 *  aura-stacking factions (Harmonic) and corner flamethrower play. */
export const RL_STATE_DIM_V8 = RL_STATE_DIM_V7 + AURA_FEATURE_COUNT +
  ZONE_SYNERGY_FEATURE_COUNT; // 122
/** Legacy 9-action space: actions 0-6 build, 7 save, 8 upgrade. */
export const RL_ACTION_DIM_V1 = 9;
export const RL_ACTION_SAVE_V1 = 7;
export const RL_ACTION_UPGRADE_V1 = 8;

/** Geometry-derived per-zone serpentine scaffold computed once per match
 *  from the map's grid dimensions, entries, exits, obstacles, and initial
 *  creep paths. Works on ANY map topology (open horizontal, multi-lane,
 *  center-exit fortress/gauntlet, pre-walled serpentine/spiral, random).
 *
 *  Why a scaffold prior is needed alongside single-step A* (ΔL, ΔE):
 *  On open maps, single-step A* pathfinding cannot discover a multi-tower
 *  U-turn until the entire boundary rail sealing one side to a map edge or
 *  obstacle is complete — the first 5 towers of a 6-tower U-turn have
 *  single-step ΔL = 0, and only the 6th tower unlocks ΔL = +14. Generating
 *  1-tile-separated switchback rails & alternating perpendicular baffles
 *  along each zone's actual local creep-path flow gives single-step
 *  evaluation a progressive gradient toward multi-pass corridors without
 *  hardcoding coordinates to a single map. */
export interface DynamicZoneScaffold {
  /** Ordered preferred mazing cells per zone (0..RL_ZONE_DIM-1). */
  scaffolds: Map<number, (readonly [number, number])[]>;
  /** True when the local creep path through zone z flows predominantly
   *  horizontally (dx >= dy); false when predominantly vertical. */
  horizontalByZone: Map<number, boolean>;
  /** Column sectors (0..RL_ZONE_COLS-1) where an active path runs directly
   *  along the horizontal zone seam (rows midRow-1..midRow), so switchbacks
   *  may include the 2-row seam strip without bleeding into distant lanes. */
  seamCrossedByColSector: Set<number>;
}

export function buildDynamicSerpentineScaffold(
  grid: NonNullable<BotContext['grid']>,
  paths: readonly PathPoint[][],
): DynamicZoneScaffold {
  const cols = grid.cols ?? RL_GRID_COLS;
  const rows = grid.rows ?? RL_GRID_ROWS;
  const midRow = Math.floor(rows / 2);
  const zoneW = cols / RL_ZONE_COLS;
  const zoneH = rows / RL_ZONE_ROWS;

  const terminalSet = new Set<string>();
  const terminals: { col: number; row: number }[] = [];
  for (const e of grid.entries ?? []) {
    terminalSet.add(`${e.col},${e.row}`);
    terminals.push(e);
  }
  for (const x of grid.exits ?? []) {
    terminalSet.add(`${x.col},${x.row}`);
    terminals.push(x);
  }

  // Detect column sectors whose initial path directly hugs the horizontal
  // zone seam (rows midRow-1 .. midRow).
  const seamCrossedByColSector = new Set<number>();
  for (const p of paths) {
    for (const pt of p) {
      if (pt.row === midRow - 1 || pt.row === midRow) {
        seamCrossedByColSector.add(zoneOfCell(pt.col, pt.row, cols, rows) % RL_ZONE_COLS);
      }
    }
  }

  const scaffolds = new Map<number, (readonly [number, number])[]>();
  const horizontalByZone = new Map<number, boolean>();

  for (let z = 0; z < RL_ZONE_DIM; z++) {
    const colSector = z % RL_ZONE_COLS;
    const rowBucket = Math.floor(z / RL_ZONE_COLS);
    const cMin = Math.floor(colSector * zoneW);
    const cMax = Math.min(cols - 1, Math.floor((colSector + 1) * zoneW) - 1);
    const rMin = Math.floor(rowBucket * zoneH);
    const rMax = Math.min(rows - 1, Math.floor((rowBucket + 1) * zoneH) - 1);

    // Measure local path flow direction and anchor coordinate inside/near z.
    let sumDx = 0;
    let sumDy = 0;
    const localRows: number[] = [];
    const localCols: number[] = [];
    for (const p of paths) {
      for (let i = 0; i < p.length; i++) {
        const pt = p[i];
        if (
          pt.col >= cMin - 1 && pt.col <= cMax + 1 &&
          pt.row >= rMin - 1 && pt.row <= rMax + 1
        ) {
          localRows.push(pt.row);
          localCols.push(pt.col);
          if (i + 1 < p.length) {
            sumDx += Math.abs(p[i + 1].col - pt.col);
            sumDy += Math.abs(p[i + 1].row - pt.row);
          }
        }
      }
    }

    // Fallback orientation from global path span if no path enters this zone.
    if (sumDx === 0 && sumDy === 0 && paths.length > 0) {
      for (const p of paths) {
        sumDx += Math.abs(p[p.length - 1].col - p[0].col);
        sumDy += Math.abs(p[p.length - 1].row - p[0].row);
      }
    }
    const horizontal = sumDx >= sumDy;
    horizontalByZone.set(z, horizontal);

    const median = (arr: number[], fallback: number): number => {
      if (arr.length === 0) return fallback;
      const sorted = arr.slice().sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const rMid = median(localRows, Math.floor((rMin + rMax) / 2));
    const cMid = median(localCols, Math.floor((cMin + cMax) / 2));

    const cells: [number, number][] = [];
    const seen = new Set<string>();
    const add = (c: number, r: number): void => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const k = `${c},${r}`;
      if (seen.has(k) || terminalSet.has(k)) return;
      if (grid.cells[r]?.[c] !== CellType.Empty) return;
      seen.add(k);
      cells.push([c, r]);
    };

    // Check if an edge entry/exit sits inside or on the border of this zone.
    const edgeTerm = terminals.find(t =>
      t.col >= cMin && t.col <= cMax &&
      t.row >= Math.max(0, rMin - 1) && t.row <= Math.min(rows - 1, rMax + 1) &&
      (t.col === 0 || t.col === cols - 1 || t.row === 0 || t.row === rows - 1),
    );

    if (edgeTerm && (edgeTerm.col === 0 || edgeTerm.col === cols - 1)) {
      // 3-pass horizontal switchback pocket anchored to a left/right edge terminal.
      const ec = edgeTerm.col;
      const er = edgeTerm.row;
      const inDir = ec === 0 ? 1 : -1;
      const span = Math.max(3, Math.min(5, cMax - cMin));
      const farC = ec + inDir * span;
      // Expand into this zone's half if there is room, else toward the more open side.
      const preferUp = rowBucket === 0;
      const roomUp = er;
      const roomDown = rows - 1 - er;
      const vDir = preferUp
        ? (roomUp >= 5 ? -1 : 1)
        : (roomDown >= 5 ? 1 : -1);

      // Seal the straight-line bypass on the opposite side + 1st rail on er + vDir
      // (or er itself from ec + inDir inward) to force an immediate U-turn.
      add(ec, er - vDir);
      for (let s = 1; s <= span; s++) add(ec + inDir * s, er);
      for (let s = 1; s <= span; s++) add(ec + inDir * s, er + vDir);
      // Far-end vertical cap stepping 2 rows deeper
      add(farC, er + vDir * 2);
      add(farC, er + vDir * 3);
      // 2nd rail returning toward edge (leaving 1-tile U-turn gap at farC - inDir)
      for (let s = 0; s <= span - 2; s++) add(ec + inDir * s, er + vDir * 3);
      // Near-edge vertical cap stepping 2 rows deeper
      add(ec, er + vDir * 4);
      add(ec, er + vDir * 5);
      // 3rd rail heading back inward (leaving 1-tile U-turn gap at ec + inDir)
      for (let s = 2; s <= span; s++) add(ec + inDir * s, er + vDir * 5);
      // Outer containment rail
      for (let s = 1; s <= span; s++) add(ec + inDir * s, er + vDir * 7);
    } else if (edgeTerm && (edgeTerm.row === 0 || edgeTerm.row === rows - 1)) {
      // 3-pass vertical switchback pocket anchored to a top/bottom edge terminal.
      const ec = edgeTerm.col;
      const er = edgeTerm.row;
      const inDir = er === 0 ? 1 : -1;
      const span = Math.max(3, Math.min(5, rMax - rMin));
      const farR = er + inDir * span;
      const hDir = ec >= Math.floor(cols / 2) ? -1 : 1;

      add(ec - hDir, er);
      for (let s = 1; s <= span; s++) add(ec, er + inDir * s);
      for (let s = 1; s <= span; s++) add(ec + hDir, er + inDir * s);
      add(ec + hDir * 2, farR);
      add(ec + hDir * 3, farR);
      for (let s = 0; s <= span - 2; s++) add(ec + hDir * 3, er + inDir * s);
      add(ec + hDir * 4, er);
      add(ec + hDir * 5, er);
      for (let s = 2; s <= span; s++) add(ec + hDir * 5, er + inDir * s);
    } else if (horizontal) {
      // Interior horizontal corridor: alternating 1-tile-thick vertical baffles
      // every 2 columns + top/bottom containment rails.
      let baffleIdx = 0;
      for (let c = cMin + 1; c <= cMax; c += 2) {
        const upBias = baffleIdx % 2 === 0;
        const offsets = upBias ? [0, -1, -2, -3, 1] : [0, 1, 2, 3, -1];
        for (const dr of offsets) add(c, rMid + dr);
        baffleIdx++;
      }
      const railRow = rowBucket === 0 ? rMid - 4 : rMid + 4;
      const oppRailRow = rowBucket === 0 ? rMid + 3 : rMid - 3;
      for (let c = cMin; c <= cMax; c++) add(c, railRow);
      for (let c = cMin; c <= cMax; c++) add(c, oppRailRow);
    } else {
      // Interior vertical corridor: alternating 1-tile-thick horizontal baffles
      // every 2 rows + left/right containment rails.
      let baffleIdx = 0;
      for (let r = rMin + 1; r <= rMax; r += 2) {
        const leftBias = baffleIdx % 2 === 0;
        const offsets = leftBias ? [0, -1, -2, -3, 1] : [0, 1, 2, 3, -1];
        for (const dc of offsets) add(cMid + dc, r);
        baffleIdx++;
      }
      for (let r = rMin; r <= rMax; r++) add(cMid - 4, r);
      for (let r = rMin; r <= rMax; r++) add(cMid + 4, r);
    }

    scaffolds.set(z, cells);
  }

  return { scaffolds, horizontalByZone, seamCrossedByColSector };
}

/** Zone index of a board cell: rowBucket * ZONE_COLS + colBucket. */
export function zoneOfCell(
  col: number,
  row: number,
  cols: number = RL_GRID_COLS,
  rows: number = RL_GRID_ROWS,
): number {
  const zoneColWidth = cols / RL_ZONE_COLS;
  const zoneRowHeight = rows / RL_ZONE_ROWS;
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
  /** In-memory policy weights (browser/game path). Takes precedence
   *  over `policyPath` when both are supplied. */
  policyJSON?: PolicyWeights;
  /** Use the Node-only LearnedScorer placement model. Default true;
   *  set false in the browser bundle (no fs access). */
  useLearnedScorer?: boolean;
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
  /** Immediate reward per new in-range (damage tower, aura tower) pair
   *  created by a placement. Teaches aura-stacking factions (Harmonic)
   *  to cluster Resonators inside a stacked aura field. Default 0. */
  rewardAuraCoef?: number;
  /** Immediate reward for placing a damage tower on a high-coverage cell,
   *  weighted by its DPS (damage / fire interval) so short-range
   *  flamethrowers on corners outscore cheap walls. Normalized to
   *  ~1.0 for 200 DPS-tiles. Default 0. */
  rewardCoverageCoef?: number;
  /** State feature version: 2 (default, 17 dims), 3 (22 dims, adds
   *  the spatial aggregates), 4 (46 dims, adds per-zone spatial
   *  features), 5 (58 dims, adds per-zone mazing potential),
   *  6 (70 dims, adds per-zone post-placement Total Army Exposure gain),
   *  7 (94 dims, adds per-zone exit proximity & lane traffic), or
   *  8 (122 dims, adds aura synergy & short-range coverage).
   *  A loaded policy's own state_dim wins over this — an
   *  old policy must keep seeing its old inputs. */
  stateVersion?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
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

function getScorer(faction: string): PlacementScorer {
  // Browser/game path: a model preloaded via scorerModelLoader.
  const cached = getCachedScorerModel(faction);
  if (cached) return new LearnedScorer([faction], [cached]);
  // Node/headless path: read playtest/models/scorer-<faction>.json.
  if (typeof process !== 'undefined' && process.versions?.node) {
    const hit = scorerCache.get(faction);
    if (hit) return hit;
    const scorer = new LearnedScorer([faction]);
    scorerCache.set(faction, scorer);
    return scorer;
  }
  // Browser without a preloaded model — never construct the fs-backed
  // LearnedScorer (it would throw on node:fs).
  return new NullScorer();
}

/** Minimal scorer contract used by RLBrain placement. */
interface PlacementScorer {
  hasModel(faction: string): boolean;
  score(ctx: BotContext, cell: { col: number; row: number }, tower: TowerType): number;
  /** Optional learned-model best-cell picker (LearnedScorer only). */
  scorerFn?(
    ctx: BotContext,
    tower: TowerType,
    threshold?: number,
    filter?: (cell: { col: number; row: number }) => boolean,
  ): { col: number; row: number } | null;
}

/** Browser-safe no-op scorer: no learned placement model, neutral
 *  scores. Used when `useLearnedScorer: false` (the game bundles
 *  RLBrain without Node's fs-based LearnedScorer models). */
class NullScorer implements PlacementScorer {
  hasModel(_faction: string): boolean { return false; }
  score(_ctx: BotContext, _cell: { col: number; row: number }, _tower: TowerType): number {
    return 0.5;
  }
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
   *  per-zone post-placement Total Army Exposure gain (70 dims), 7 adds
   *  map topology (94 dims), 8 adds aura synergy & short-range coverage
   *  (122 dims). Derived from the policy's state_dim so an old policy
   *  keeps its old inputs. */
  private stateVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 2;
  /** Build slots for this faction (7 for <=7-tower factions, 8 for 8-tower). */
  private buildSlots: number = RL_MAX_BUILD_ACTIONS;
  /** Action-space size for this brain (86 for 7-slot, 98 for 8-slot, 9 for v1). */
  private actionDim: number = RL_ACTION_DIM;
  private deterministic: boolean;
  private recordTrajectory: boolean;
  private scorer: PlacementScorer;
  private warnedNoScorer = false;
  /** Lazily computed once per match from the map's grid & initial creep paths. */
  private dynamicScaffold: DynamicZoneScaffold | null = null;
  private rewardWave: number;
  private rewardGoldCoef: number;
  private rewardGoldCap: number;
  private rewardLifePenalty: number;
  private rewardBuildCoef: number;
  private rewardMazeCoef: number;
  private rewardExposureCoef: number;
  private rewardAuraCoef: number;
  private rewardCoverageCoef: number;

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
    this.buildSlots = buildSlotsForTowers(towerIds);
    this.actionDim = this.buildSlots * RL_ZONE_DIM + 2;
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
    this.rewardAuraCoef = options.rewardAuraCoef ?? 0;
    this.rewardCoverageCoef = options.rewardCoverageCoef ?? 0;
    this.stateVersion = options.stateVersion ?? 2;
    if (options.policyJSON) {
      this.policy = validatePolicyWeights(options.policyJSON, 'policyJSON');
      this.applyPolicyShape();
    } else if (options.policyPath) {
      this.policy = loadPolicyCached(options.policyPath);
      this.applyPolicyShape();
    }
    this.scorer = options.useLearnedScorer === false
      ? new NullScorer()
      : getScorer(this.faction);
    if (!this.scorer.hasModel(this.faction) && !this.warnedNoScorer) {
      this.warnedNoScorer = true;
      console.warn(
        `RLBrain: no LearnedScorer model for ${this.faction} — using closest-to-path fallback cells.`,
      );
    }
  }

  /** Derive policy version, build slots, and state feature version
   *  from a loaded policy's declared dimensions. */
  private applyPolicyShape(): void {
    const policy = this.policy;
    if (!policy) return;
    this.policyVersion = policy.action_dim === RL_ACTION_DIM_V1 ? 1 : 2;
    if (this.policyVersion === 2) {
      this.buildSlots = Math.floor((policy.action_dim - 2) / RL_ZONE_DIM);
    }
    const extraSlots = this.buildSlots - RL_MAX_BUILD_ACTIONS;
    const baseStateDim = policy.state_dim - extraSlots;
    // The file is authoritative: a v8/v7/...-shaped policy gets its
    // matching state regardless of the option, and a 17-dim one keeps 17.
    this.stateVersion = baseStateDim === RL_STATE_DIM_V8
      ? 8
      : baseStateDim === RL_STATE_DIM_V7
      ? 7
      : baseStateDim === RL_STATE_DIM_V6
        ? 6
        : baseStateDim === RL_STATE_DIM_V5
          ? 5
          : baseStateDim === RL_STATE_DIM_V4
            ? 4
            : baseStateDim === RL_STATE_DIM_V3
              ? 3
              : this.policyVersion === 1 ? 1 : 2;
    this.actionDim = policy.action_dim;
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

    const state = extractState(
      ctx, this.towerIds, this.stateVersion, this.buildSlots,
    );
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
    let auraDelta = 0;
    let dpsCoverage = 0;
    if (decision.kind === 'place') {
      spent = decision.type.cost;
      const impact = computePlacementImpact(ctx, decision.col, decision.row, decision.type);
      mazeDelta = impact.mazeDelta;
      exposureDelta = impact.exposureDelta;
      if (this.rewardAuraCoef !== 0) {
        auraDelta = computeAuraSynergyDelta(
          ctx, decision.col, decision.row, decision.type,
        );
      }
      if (this.rewardCoverageCoef !== 0) {
        dpsCoverage = computeDpsCoverage(
          ctx, decision.col, decision.row, decision.type,
        );
      }
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
          this.rewardExposureCoef * exposureDelta +
          (this.rewardAuraCoef !== 0 ? this.rewardAuraCoef * auraDelta : 0) +
          (this.rewardCoverageCoef !== 0 ? this.rewardCoverageCoef *
            Math.min(1, dpsCoverage / 200) : 0),
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
    return this.policyVersion === 1
      ? RL_ACTION_SAVE_V1
      : this.buildSlots * RL_ZONE_DIM;
  }

  private get upgradeAction(): number {
    return this.policyVersion === 1
      ? RL_ACTION_UPGRADE_V1
      : this.buildSlots * RL_ZONE_DIM + 1;
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
    const cols = ctx.grid?.cols ?? RL_GRID_COLS;
    const rows = ctx.grid?.rows ?? RL_GRID_ROWS;
    const populatedZones = new Set<number>();
    for (const c of ctx.candidateCells) {
      populatedZones.add(zoneOfCell(c.col, c.row, cols, rows));
    }
    for (let i = 0; i < this.buildSlots; i++) {
      const towerId = this.towerIds[i];
      const tower = towerId ? TOWER_TYPES[towerId] : undefined;
      if (!tower || ctx.budget < tower.cost) continue;
      for (const z of populatedZones) {
        mask[i * RL_ZONE_DIM + z] = 1;
      }
    }
    mask[this.saveAction] = 1;
    mask[this.upgradeAction] = this.cheapestUpgradable(ctx) ? 1 : 0;
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
      const learned = this.scorer.scorerFn?.(ctx, tower, 0.0);
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
    const cols = ctx.grid?.cols ?? RL_GRID_COLS;
    const rows = ctx.grid?.rows ?? RL_GRID_ROWS;
    const midRow = Math.floor(rows / 2);
    const colSector = zone % RL_ZONE_COLS;

    const paths = (ctx.allPaths ?? []).filter(
      (p): p is PathPoint[] => !!p && p.length > 0,
    );
    if (!ctx.grid || paths.length === 0) {
      if (this.scorer.hasModel(this.faction)) {
        const learned = this.scorer.scorerFn?.(
          ctx, tower, 0.0, c => zoneOfCell(c.col, c.row, cols, rows) === zone,
        );
        if (learned) return learned;
      }
      return closestCellToPath(ctx, zone);
    }

    // Lazily derive the geometry-aware serpentine scaffold once per match from
    // this map's entries, exits, obstacles, and initial creep paths.
    if (!this.dynamicScaffold) {
      this.dynamicScaffold = buildDynamicSerpentineScaffold(ctx.grid, paths);
    }

    // Search cells strictly inside `zone`. If a creep path runs directly along
    // the horizontal zone seam (rows midRow-1..midRow) in this column sector
    // (e.g. Plains / Empty / Islands row 13), also allow the 2-row seam strip
    // so switchbacks can seal across the seam without hijacking distant lanes
    // on multi-lane maps like Crossroads, Fortress, or Gauntlet.
    const allowSeamStrip = this.dynamicScaffold.seamCrossedByColSector.has(colSector);
    const zoneCells = ctx.candidateCells.filter(c => {
      const cz = zoneOfCell(c.col, c.row, cols, rows);
      if (cz === zone) return true;
      if (allowSeamStrip && cz % RL_ZONE_COLS === colSector) {
        return c.row >= midRow - 1 && c.row <= midRow;
      }
      return false;
    });
    if (zoneCells.length === 0) return null;

    const baseLen = paths.reduce((s, p) => s + p.length, 0);
    const baseArmyExp = computeArmyExposure(ctx, paths);

    const perPathSets: Set<string>[] = paths.map(p => {
      const s = new Set<string>();
      for (const pt of p) s.add(`${pt.col},${pt.row}`);
      return s;
    });
    const pathSet = new Set<string>();
    for (const s of perPathSets) {
      for (const k of s) pathSet.add(k);
    }

    const towerSet = new Set<string>();
    for (const t of ctx.placedTowers) {
      towerSet.add(`${t.col},${t.row}`);
    }

    const isMobile = isMobileTower(tower);

    // 1. For static towers, simulate blocking each on-path candidate cell
    //    (re-pathing only paths that actually traverse the cell) to obtain
    //    the exact post-placement path P_new, ΔL, and ΔArmyExp, and filter
    //    out illegal path-blocking cells. Mobile units don't block the grid.
    const simResultMap = new Map<string, { gain: number; armyDelta: number; newPaths: PathPoint[][] }>();
    const illegalBlockSet = new Set<string>();
    if (!isMobile) {
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
          for (let pi = 0; pi < paths.length; pi++) {
            const p = paths[pi];
            if (!perPathSets[pi].has(k)) {
              newPaths.push(p);
              newLen += p.length;
              continue;
            }
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
    }

    const isWallTier = !isMobile && tower.cost <= 45;
    const isMidTier = !isMobile && tower.cost <= 90;
    const mazeWeight = isMobile ? 0 : isWallTier ? 1.15 : isMidTier ? 0.90 : 0.45;
    const armyExpWeight = isMobile ? 0 : isWallTier ? 0.18 : isMidTier ? 0.15 : 0.12;
    const coverWeight = isMobile ? 1.50 : isWallTier ? 0.85 : 1.25;
    const hasLearned = this.scorer.hasModel(this.faction);
    const effRange = Math.max(2, tower.range || 3);

    const auraTowers = ctx.placedTowers.filter(t => isAuraTowerId(t.towerId));
    const isThisAura = isAuraTowerId(tower.id);

    // Geometry-derived serpentine scaffold for this zone (static towers only):
    const primaryList = isMobile ? [] : (this.dynamicScaffold.scaffolds.get(zone) ?? []);
    const zoneHorizontal = this.dynamicScaffold.horizontalByZone.get(zone) ?? true;

    const scaffoldBonusMap = new Map<string, number>();
    let openRank = 0;
    for (const [sc, sr] of primaryList) {
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

      // 4) Wall-extension bonus: extending a 1-tile tooth/baffle perpendicular
      //    to the local creep flow (vertical teeth for horizontal lanes,
      //    horizontal teeth for vertical lanes).
      let finBonus = 0;
      if (squares2x2 === 0) {
        const extendsPerp = zoneHorizontal
          ? (nUp || nDown) && !nLeft && !nRight
          : (nLeft || nRight) && !nUp && !nDown;
        if (extendsPerp && gain > 0) {
          // Stepping ON the path right at the tip of an existing perpendicular
          // wall tooth! This is the classic TD switchback extension move.
          finBonus = 0.85;
        } else if (extendsPerp) {
          finBonus = 0.35;
        }
      }

      const scaffoldBonus = scaffoldBonusMap.get(key) ?? 0;

      const blobPenalty = isMobile
        ? 0
        : squares2x2 * 1.65 + (orthoCount >= 3 ? (orthoCount - 2) * 0.85 : 0);

      // Aura synergy: DPS towers want to sit near an aura tower; aura
      // towers want to sit near existing damage towers (cluster the
      // buff field). Auras stack multiplicatively within their range,
      // so each covering damage tower deepens the field — count damage
      // pairs rather than raw neighbours.
      let synergy = 0;
      if (isThisAura) {
        let damageInRange = 0;
        let auraNeighbours = 0;
        const r2 = effRange * effRange;
        for (const pt of ctx.placedTowers) {
          const dx = pt.col - c.col, dy = pt.row - c.row;
          if (dx * dx + dy * dy > r2) continue;
          if (isDamageTowerId(pt.towerId)) damageInRange++;
          else if (isAuraTowerId(pt.towerId)) auraNeighbours++;
        }
        synergy = Math.min(1.2, damageInRange * 0.22) + Math.min(0.4, auraNeighbours * 0.08);
      } else if (isDamageTowerId(tower.id) && auraTowers.length > 0) {
        for (const a of auraTowers) {
          const aDef = TOWER_TYPES[a.towerId];
          const ar = aDef?.range ?? 3;
          const dx = a.col - c.col, dy = a.row - c.row;
          if (dx * dx + dy * dy <= ar * ar) {
            synergy += 0.22;
          }
        }
        synergy = Math.min(1.1, synergy);
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

/** Validate a policy weights object. Throws on wrong action/state
 *  dims or layer shapes — a silently-random policy would corrupt
 *  training data, so fail fast instead. Accepts the v1 9-action
 *  space, the v2 86-action zone space, the v3 22-dim state, and the
 *  v4 46-dim per-zone state, as well as both `shared` and
 *  `decoupled_res` network architectures. */
export function validatePolicyWeights(raw: PolicyWeights, source: string): PolicyWeights {
  const isV1 = raw.action_dim === RL_ACTION_DIM_V1;
  const isValidZoneActionDim =
    raw.action_dim === RL_ACTION_DIM ||
    raw.action_dim === (RL_MAX_BUILD_ACTIONS + 1) * RL_ZONE_DIM + 2; // 98 (8-tower factions)
  if (!isV1 && !isValidZoneActionDim) {
    throw new Error(
      `RLBrain: policy ${source} has action_dim ${raw.action_dim}, expected ` +
      `${RL_ACTION_DIM} (7-slot), ${(RL_MAX_BUILD_ACTIONS + 1) * RL_ZONE_DIM + 2} (8-slot), or ${RL_ACTION_DIM_V1} (v1)`,
    );
  }
  const slots = isV1 ? RL_MAX_BUILD_ACTIONS : Math.floor((raw.action_dim - 2) / RL_ZONE_DIM);
  const extra = slots - RL_MAX_BUILD_ACTIONS;
  const baseStateDim = raw.state_dim - extra;
  if (
    baseStateDim !== RL_STATE_DIM &&
    baseStateDim !== RL_STATE_DIM_V3 &&
    baseStateDim !== RL_STATE_DIM_V4 &&
    baseStateDim !== RL_STATE_DIM_V5 &&
    baseStateDim !== RL_STATE_DIM_V6 &&
    baseStateDim !== RL_STATE_DIM_V7 &&
    baseStateDim !== RL_STATE_DIM_V8
  ) {
    throw new Error(
      `RLBrain: policy ${source} has state_dim ${raw.state_dim} (slots=${slots}), expected base dim in ` +
      `{${RL_STATE_DIM}, ${RL_STATE_DIM_V3}, ${RL_STATE_DIM_V4}, ${RL_STATE_DIM_V5}, ${RL_STATE_DIM_V6}, ${RL_STATE_DIM_V7}, ${RL_STATE_DIM_V8}}`,
    );
  }
  const arch = raw.arch ?? 'shared';
  const L = raw.layers;
  if (!L) {
    throw new Error(`RLBrain: policy ${source} missing layers`);
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
      throw new Error(`RLBrain: decoupled_res policy ${source} has wrong layer shapes`);
    }
    return raw;
  }
  if (!raw.hidden || raw.hidden[0] !== 128 || raw.hidden[1] !== 64) {
    throw new Error(
      `RLBrain: policy ${source} has hidden ${JSON.stringify(raw.hidden)}, expected [128, 64]`,
    );
  }
  if (
    !L.trunk1_w || !L.trunk1_b || !L.trunk2_w || !L.trunk2_b ||
    L.trunk1_w.length !== 128 || L.trunk1_b.length !== 128 ||
    L.trunk2_w.length !== 64 || L.trunk2_b.length !== 64 ||
    L.policy_w.length !== raw.action_dim || L.policy_b.length !== raw.action_dim ||
    L.value_w.length !== 1 || L.value_b.length !== 1
  ) {
    throw new Error(`RLBrain: policy ${source} has wrong layer shapes`);
  }
  return raw;
}

/** Load + validate a policy weights JSON from disk (Node/headless). */
export function loadPolicy(path: string): PolicyWeights {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as PolicyWeights;
  return validatePolicyWeights(raw, path);
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
 *   - 7: 94 dims (v6 + 24 per-zone exit proximity & multi-lane path traffic features)
 *   - 8: 122 dims (v7 + 4 global aura-network features + 24 per-zone aura
 *        coverage & short-range coverage features)
 * Each version is strictly prefix-compatible with the previous version.
 */
export function extractState(
  ctx: BotContext,
  towerIds: readonly string[] = ARCANE_TOWER_IDS,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 2,
  slots: number = buildSlotsForTowers(towerIds),
): number[] {
  const base = extractStateBase(ctx, towerIds, version === 1 ? 1 : 2, slots);
  if (version <= 2) return base;
  const v3 = [...base, ...extractSpatialFeatures(ctx)];
  if (version === 3) return v3;
  const v4 = [...v3, ...extractZoneSpatialFeatures(ctx)];
  if (version === 4) return v4;
  const v5 = [...v4, ...extractZoneMazeFeatures(ctx)];
  if (version === 5) return v5;
  const v6 = [...v5, ...extractZoneExposureFeatures(ctx)];
  if (version === 6) return v6;
  const v7 = [...v6, ...extractZoneTopologyFeatures(ctx)];
  if (version === 7) return v7;
  return [
    ...v7,
    ...extractAuraFeatures(ctx),
    ...extractZoneSynergyFeatures(ctx),
  ];
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
  if (isMobileTower(tower)) {
    let selfCov = 0;
    for (const p of paths) {
      selfCov += pathCellsWithinRange({ col, row }, p, effRange);
    }
    return { mazeDelta: 0, exposureDelta: selfCov };
  }
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

/** Count the new in-range (damage tower, aura tower) pairs created by
 *  placing `tower` at `(col, row)`. A new aura counts every damage tower
 *  inside its range; a new damage tower counts every aura whose range
 *  covers it. Used by the optional `rewardAuraCoef` shaping term. */
export function computeAuraSynergyDelta(
  ctx: BotContext,
  col: number,
  row: number,
  tower: TowerType,
): number {
  const newIsAura = isAuraTowerId(tower.id);
  const newIsDamage = isDamageTowerId(tower.id);
  if (!newIsAura && !newIsDamage) return 0;
  let pairs = 0;
  for (const pt of ctx.placedTowers) {
    const ptIsAura = isAuraTowerId(pt.towerId);
    if (newIsAura && isDamageTowerId(pt.towerId)) {
      const r = Math.max(1, tower.range ?? 3);
      const dx = pt.col - col;
      const dy = pt.row - row;
      if (dx * dx + dy * dy <= r * r) pairs++;
    } else if (newIsDamage && ptIsAura) {
      const r = Math.max(1, TOWER_TYPES[pt.towerId]?.range ?? 3);
      const dx = pt.col - col;
      const dy = pt.row - row;
      if (dx * dx + dy * dy <= r * r) pairs++;
    }
  }
  return pairs;
}

/** DPS-weighted path coverage of a placement: damage-per-second times
 *  the number of active path cells inside the tower's range. Rewards
 *  efficient damage towers on high-traffic cells (a flamethrower on a
 *  switchback) and ignores walls / zero-damage support. */
export function computeDpsCoverage(
  ctx: BotContext,
  col: number,
  row: number,
  tower: TowerType,
): number {
  if (tower.damage <= 0) return 0;
  const fireSeconds = Math.max(0.05, (tower.fireRate || 1000) / 1000);
  const dps = tower.damage / fireSeconds;
  const range = Math.max(1, tower.range || 3);
  let cells = 0;
  for (const p of ctx.allPaths ?? []) {
    if (!p || p.length === 0) continue;
    cells += pathCellsWithinRange({ col, row }, p, range);
  }
  return dps * cells;
}

function extractStateBase(
  ctx: BotContext,
  towerIds: readonly string[],
  version: 1 | 2,
  slots: number,
): number[] {
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
  const counts = new Array<number>(slots).fill(0);
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
