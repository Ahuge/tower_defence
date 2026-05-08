/**
 * CounterPickWaveDirector — v4.2a, the "dumb adversary" baseline.
 *
 * Observes the defender's placed-tower role distribution and redistributes
 * each wave's creep counts toward types the defender is structurally
 * weak against. Per BRAIN_V4_LOOP.md, this is intentionally simple:
 *
 *   - No per-tower simulation, no lookahead — just role counting.
 *   - Stochastic via softmax temperature so brain-search can dial
 *     "sharp counter pick" vs "near uniform" per cell.
 *   - Same per-wave totals + hpScale/speedScale as the static
 *     generator. Only the creep TYPE distribution shifts.
 *
 * Counter rules (defender role → creep type weight bias):
 *   wall-heavy        → flying ×3.0  (bypass mazes)
 *   dps-single-heavy  → swarm/group ×2.0  (overwhelm single-target)
 *   dps-splash-heavy  → boss ×2.0, mage_armor ×2.0  (single tough target)
 *   slow-heavy        → flying ×2.0, boss ×1.5  (resist or bypass)
 *   aura-heavy        → boss ×2.0  (dilutes aura value)
 *
 * Defaults are tuned for "weakly biased, mostly uniform" — temperature
 * 2.0 (high randomness), bias multipliers all 1.0 (off until brain-
 * search tunes them up). Generation 0 of the v4 self-play loop uses
 * these defaults and the defender is expected to win nearly all matches.
 */
import { WaveDefinition, WaveCreepGroup } from '../../../data/WaveDefinitions';
import { getWavesForMode } from '../../../data/WaveDefinitions';
import { TOWER_TYPES } from '../../../data/TowerTypes';
import { getTowerRole, TowerRole } from '../../../data/TowerRoles';
import { CREEP_TYPES } from '../../../data/CreepTypes';
import { rng } from '../../Rng';
import {
  WaveDirectorBrain,
  WaveDirectorMaterializeContext,
  WaveObservation,
  registerWaveDirector,
} from '../WaveDirectorBrain';

export interface CounterPickParams {
  /** Softmax temperature over creep-type weights. 0 = argmax (always
   *  pick top counter), ∞ = uniform. Default 2.0 = nearly uniform with
   *  slight counter bias. brain-search tunes 0.3–5.0. */
  temperature: number;
  /** Minimum number of distinct creep types per wave. Prevents
   *  monoculture even at low temperature. Default 2. */
  minDiversity: number;
  /** How much each tower-role contributes to the counter bias. 0 =
   *  ignore that role. Default 1.0 across the board. */
  weightVsWalls: number;
  weightVsDpsSingle: number;
  weightVsDpsSplash: number;
  weightVsSlow: number;
  weightVsAura: number;
  /** Default-on toggle: per-wave reactivity. When 0, falls back to
   *  static wave for the wave (still uses random temperature jitter
   *  on creep types so the run isn't bit-identical to UniformWave-
   *  Director). */
  enableReactivity: number;
}

export const DEFAULT_COUNTER_PICK_PARAMS: CounterPickParams = {
  temperature: 2.0,
  minDiversity: 2,
  weightVsWalls: 1.0,
  weightVsDpsSingle: 1.0,
  weightVsDpsSplash: 1.0,
  weightVsSlow: 1.0,
  weightVsAura: 1.0,
  enableReactivity: 1,
};

/** Counter-bias rules: row = defender role, col = creep type id, value
 *  = multiplicative weight. Values >1 mean "this creep counters that
 *  role"; values <1 mean "this creep is bad against that role" (the
 *  defender's role beats it). 1.0 is neutral. */
const COUNTER_TABLE: Record<TowerRole, Record<string, number>> = {
  'wall': {
    flying: 3.0,
    fast: 1.5,
    boss: 1.0,
    swarm: 1.0,
  },
  'dps-single': {
    swarm: 2.0,
    group: 2.0,
    splitter: 1.5,
    fast: 1.2,
  },
  'dps-splash': {
    boss: 2.0,
    mage_armor: 2.0,
    armored: 1.5,
    standard: 0.5,  // splash already wins these, no need to send them
    swarm: 0.3,     // splash demolishes swarms
  },
  'slow': {
    flying: 2.0,
    boss: 1.5,
    evasive: 1.5,
  },
  'aura': {
    boss: 2.0,
    mage_armor: 1.8,
    armored: 1.3,
  },
  'utility': {},
};

export class CounterPickWaveDirector implements WaveDirectorBrain {
  readonly name = 'counter_pick';
  private params: CounterPickParams = { ...DEFAULT_COUNTER_PICK_PARAMS };
  private staticWaves: WaveDefinition[] = [];

  constructor(params?: Partial<CounterPickParams>) {
    if (params) this.params = { ...DEFAULT_COUNTER_PICK_PARAMS, ...params };
  }

  init(ctx: WaveDirectorMaterializeContext): void {
    this.staticWaves = getWavesForMode(ctx.matchMode, ctx.waveCount);
  }

  nextWave(obs: WaveObservation): WaveDefinition {
    const baseWave = this.staticWaves[obs.waveIndex - 1]
      ?? this.staticWaves[this.staticWaves.length - 1];
    // Pre-defender-placement (wave 1, no towers) → return base unchanged.
    if (obs.observedTowers.length === 0 || this.params.enableReactivity === 0) {
      return baseWave;
    }

    // Count placed-tower roles.
    const roleCounts = countTowerRoles(obs.observedTowers);

    // Weighted counter score per creep type.
    const creepWeights = computeCounterWeights(roleCounts, this.params);

    // Pick a redistributed creep mix preserving total count + spawn
    // interval + boss flag, with the creep types softmax-sampled
    // per-group from the weighted distribution.
    const newGroups = redistributeGroups(
      baseWave.groups, creepWeights, this.params.temperature,
      this.params.minDiversity,
    );
    return { ...baseWave, groups: newGroups };
  }
}

/** Count how many of each role the defender has placed. Levels are
 *  ignored — a Lv2 splash tower counts the same as Lv1. */
function countTowerRoles(
  towers: { towerId: string }[],
): Record<TowerRole, number> {
  const out: Record<TowerRole, number> = {
    'wall': 0, 'dps-single': 0, 'dps-splash': 0,
    'slow': 0, 'aura': 0, 'utility': 0,
  };
  for (const t of towers) {
    const def = TOWER_TYPES[t.towerId];
    if (!def) continue;
    out[getTowerRole(def)]++;
  }
  return out;
}

/** Build a creep-type → weight map from the counter table, scaled by
 *  the defender's role distribution and the per-role tunable weights. */
function computeCounterWeights(
  roleCounts: Record<TowerRole, number>,
  params: CounterPickParams,
): Record<string, number> {
  const weights: Record<string, number> = {};
  // Initialise every known creep type at neutral 1.0.
  for (const id of Object.keys(CREEP_TYPES)) weights[id] = 1.0;

  const roleWeights: Record<TowerRole, number> = {
    'wall': params.weightVsWalls,
    'dps-single': params.weightVsDpsSingle,
    'dps-splash': params.weightVsDpsSplash,
    'slow': params.weightVsSlow,
    'aura': params.weightVsAura,
    'utility': 0,
  };

  // Total tower count for normalisation. Without this, factions with
  // many towers placed would have wildly higher counter bias than
  // factions with few.
  const totalTowers = Object.values(roleCounts).reduce((s, c) => s + c, 0);
  if (totalTowers === 0) return weights;

  for (const role of Object.keys(roleCounts) as TowerRole[]) {
    const count = roleCounts[role];
    if (count === 0) continue;
    const tableForRole = COUNTER_TABLE[role];
    const roleShare = count / totalTowers;
    const roleWeight = roleWeights[role];
    if (roleWeight === 0) continue;
    for (const [creepId, biasMult] of Object.entries(tableForRole)) {
      // Multiplicative blend: biasMult shifts weight away from 1.0,
      // scaled by how dominant this role is in the defender's mix
      // and how much the params weight this role.
      const shift = (biasMult - 1) * roleShare * roleWeight;
      weights[creepId] = (weights[creepId] ?? 1) * (1 + shift);
    }
  }
  return weights;
}

/** Take a base wave's groups and redistribute creep counts according
 *  to weights + temperature, while preserving total creep count and
 *  per-group spawn timing. Each base group keeps its hpScale/speedScale
 *  (we don't mess with stats — only types) and gets a creep type
 *  sampled from the weighted distribution. minDiversity creep types
 *  are guaranteed to appear at least once. */
function redistributeGroups(
  baseGroups: WaveCreepGroup[],
  weights: Record<string, number>,
  temperature: number,
  minDiversity: number,
): WaveCreepGroup[] {
  if (baseGroups.length === 0) return baseGroups;

  // Limit creep-type pool to those present in the base wave PLUS those
  // the static generator might use at this difficulty. Without this
  // restriction the director could spawn `boss` on wave 3 which would
  // break the difficulty curve. Pool = union of types in baseGroups.
  const poolIds = Array.from(new Set(baseGroups.map(g => g.creepType)));
  if (poolIds.length === 0) return baseGroups;

  // Softmax over the pool's weights with temperature.
  const poolWeights = poolIds.map(id => weights[id] ?? 1);
  const probs = softmaxTemperature(poolWeights, temperature);

  // For each base group, sample a new creep type. Track the set of
  // types used; if it falls below minDiversity, force-replace some
  // groups with the next-most-likely unused types.
  const usedTypes = new Set<string>();
  const newGroups: WaveCreepGroup[] = [];
  for (const g of baseGroups) {
    const sampledIdx = sampleFromDistribution(probs);
    const newType = poolIds[sampledIdx];
    usedTypes.add(newType);
    newGroups.push({ ...g, creepType: newType });
  }

  // Diversity floor: if too few distinct types, replace the LAST N
  // groups with unused types in descending probability order. The
  // last groups often contain the wave's "spice" (heavy/boss/etc),
  // so swapping them preserves wave shape while restoring variety.
  if (usedTypes.size < Math.min(minDiversity, poolIds.length)) {
    const unused = poolIds
      .map((id, idx) => ({ id, p: probs[idx] }))
      .filter(x => !usedTypes.has(x.id))
      .sort((a, b) => b.p - a.p);
    let groupIdx = newGroups.length - 1;
    for (const u of unused) {
      if (usedTypes.size >= minDiversity || groupIdx < 0) break;
      newGroups[groupIdx] = { ...newGroups[groupIdx], creepType: u.id };
      usedTypes.add(u.id);
      groupIdx--;
    }
  }
  return newGroups;
}

/** Softmax(w / T). Higher T = flatter distribution. */
function softmaxTemperature(weights: number[], temperature: number): number[] {
  if (weights.length === 0) return [];
  const T = Math.max(0.01, temperature);
  // Numerical stability: subtract max log-weight before exp.
  const logs = weights.map(w => Math.log(Math.max(1e-9, w)) / T);
  const maxLog = Math.max(...logs);
  const exps = logs.map(l => Math.exp(l - maxLog));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}

/** Sample an index from a probability distribution using the engine's
 *  seeded RNG (so director picks are deterministic given the same
 *  match seed — important for reproducible brain-search evals). */
function sampleFromDistribution(probs: number[]): number {
  let r = rng();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

registerWaveDirector('counter_pick', () => new CounterPickWaveDirector());
