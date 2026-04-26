/**
 * State + action featurisation for the learning brain pipeline.
 *
 * The same featurisers are used in two places:
 *   1. Training-data capture: per-decide() turn, we record
 *      `{ stateFeatures, actionFeatures, outcome }`.
 *   2. Runtime inference: LearningBrain calls these on each ctx
 *      and proposed action, scores the result through the
 *      committed regressor, picks argmax.
 *
 * Keep them PURE and DETERMINISTIC — same features on the same
 * input, no side effects, no Date.now(), no Math.random(). The
 * regressor's correctness depends on identical featurisation
 * during training and inference.
 *
 * Schema is keyed by NAME, not order. Any reordering will break
 * existing committed models — the model JSON pins feature names.
 */
import { BotContext, BotDecision, PlacedTower } from '../BotBrain';
import { TowerType, TOWER_TYPES } from '../../../data/TowerTypes';
import { TowerRole, getTowerRole } from '../../../data/TowerRoles';
import { FactionId, FACTIONS } from '../../../data/Factions';
import { hasTrait } from '../../traits/Trait';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';

// ──────────────────────────────────────────────────────────────────
// State features (~24)
// ──────────────────────────────────────────────────────────────────

export const STATE_FEATURE_NAMES = [
  // Match progress
  'wave_norm',          // current wave / 20
  'lives_norm',         // current lives / 20
  'gold_norm',          // current gold / 200
  'between_waves',      // 0/1
  // Owned tower mix
  'tower_count',
  'wall_count', 'dps_single_count', 'dps_splash_count',
  'slow_count', 'aura_count', 'utility_count',
  'has_ult_placed',     // 0/1
  // Board state
  'candidate_cells_norm', // count / 100
  'path_coverage_pct',    // covered path cells / total path cells
  'has_aura_zone',        // 0/1, any aura tower placed
  // Faction one-hot (11)
  'is_arcane', 'is_mechanical', 'is_nature', 'is_void', 'is_military',
  'is_aliens', 'is_cypherpunk', 'is_infernal', 'is_celestial',
  'is_psionic', 'is_harmonic',
] as const;
export type StateFeatureName = (typeof STATE_FEATURE_NAMES)[number];
export const STATE_FEATURE_COUNT = STATE_FEATURE_NAMES.length;

const FACTION_ORDER: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military',
  'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];

export function extractStateFeatures(ctx: BotContext): number[] {
  const out: number[] = new Array(STATE_FEATURE_COUNT).fill(0);
  let i = 0;
  out[i++] = (ctx.wave ?? 0) / 20;
  out[i++] = (ctx.lives ?? 0) / 20;
  out[i++] = (ctx.budget ?? 0) / 200;
  out[i++] = ctx.betweenWaves ? 1 : 0;

  // Tower mix
  let walls = 0, single = 0, splash = 0, slow = 0, aura = 0, util = 0, ults = 0;
  for (const p of ctx.placedTowers) {
    const t = TOWER_TYPES[p.towerId];
    if (!t) continue;
    if (t.ultimate) ults++;
    const role = getTowerRole(t);
    if (role === 'wall') walls++;
    else if (role === 'dps-single') single++;
    else if (role === 'dps-splash') splash++;
    else if (role === 'slow') slow++;
    else if (role === 'aura') aura++;
    else util++;
  }
  out[i++] = ctx.placedTowers.length;
  out[i++] = walls;
  out[i++] = single;
  out[i++] = splash;
  out[i++] = slow;
  out[i++] = aura;
  out[i++] = util;
  out[i++] = ults > 0 ? 1 : 0;

  // Board
  out[i++] = ctx.candidateCells.length / 100;

  const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
  let totalPathCells = 0, coveredPathCells = 0;
  if (paths.length > 0) {
    for (const p of paths) totalPathCells += p.length;
    // Cheap coverage estimate: count path cells within the largest
    // tower range any of our towers has. Approximate but stable.
    const covers = new Set<string>();
    for (const placed of ctx.placedTowers) {
      const t = TOWER_TYPES[placed.towerId];
      if (!t || t.range <= 0) continue;
      for (const path of paths) {
        const r2 = t.range * t.range;
        for (const pt of path) {
          const dx = pt.col - placed.col, dy = pt.row - placed.row;
          if (dx * dx + dy * dy <= r2) covers.add(`${pt.col},${pt.row}`);
        }
      }
    }
    coveredPathCells = covers.size;
  }
  out[i++] = totalPathCells > 0 ? coveredPathCells / totalPathCells : 0;
  out[i++] = aura > 0 ? 1 : 0;

  // Faction one-hot
  for (const f of FACTION_ORDER) {
    out[i++] = ctx.faction === f ? 1 : 0;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Action features (~12)
// ──────────────────────────────────────────────────────────────────

export const ACTION_FEATURE_NAMES = [
  // Decision kind one-hot
  'is_place', 'is_upgrade', 'is_sell', 'is_send', 'is_frontier', 'is_skip',
  // Tower-related (place/upgrade) — 0 for non-place/upgrade
  'tower_cost_norm',     // cost / 200
  'tower_damage_norm',   // base damage / 100
  'tower_range_norm',    // range / 10
  'tower_firerate_norm', // 1000 / fireRate (faster = higher)
  'tower_role_wall', 'tower_role_dps_single', 'tower_role_dps_splash',
  'tower_role_slow', 'tower_role_aura', 'tower_role_utility',
  'tower_is_ult',
  // Cell-related (place only)
  'cell_path_coverage_norm', // path cells within tower range
  'cell_in_aura_zone',       // 0/1, cell sits in an existing aura tower's range
] as const;
export type ActionFeatureName = (typeof ACTION_FEATURE_NAMES)[number];
export const ACTION_FEATURE_COUNT = ACTION_FEATURE_NAMES.length;

export function extractActionFeatures(ctx: BotContext, decision: BotDecision): number[] {
  const out: number[] = new Array(ACTION_FEATURE_COUNT).fill(0);
  let i = 0;
  // One-hot kind
  out[i++] = decision.kind === 'place' ? 1 : 0;
  out[i++] = decision.kind === 'upgrade' ? 1 : 0;
  out[i++] = decision.kind === 'sell' ? 1 : 0;
  out[i++] = decision.kind === 'send' ? 1 : 0;
  out[i++] = decision.kind === 'frontier' ? 1 : 0;
  out[i++] = decision.kind === 'skip' ? 1 : 0;

  let towerType: TowerType | null = null;
  if (decision.kind === 'place') {
    towerType = decision.type;
  } else if (decision.kind === 'upgrade') {
    const owned = ctx.placedTowers.find(p => p.col === decision.col && p.row === decision.row);
    if (owned) towerType = TOWER_TYPES[owned.towerId] ?? null;
  } else if (decision.kind === 'sell') {
    const owned = ctx.placedTowers.find(p => p.col === decision.col && p.row === decision.row);
    if (owned) towerType = TOWER_TYPES[owned.towerId] ?? null;
  }

  if (towerType) {
    out[i++] = (towerType.cost ?? 0) / 200;
    out[i++] = (towerType.damage ?? 0) / 100;
    out[i++] = (towerType.range ?? 0) / 10;
    out[i++] = towerType.fireRate > 0 ? 1000 / towerType.fireRate : 0;

    const role = getTowerRole(towerType);
    out[i++] = role === 'wall' ? 1 : 0;
    out[i++] = role === 'dps-single' ? 1 : 0;
    out[i++] = role === 'dps-splash' ? 1 : 0;
    out[i++] = role === 'slow' ? 1 : 0;
    out[i++] = role === 'aura' ? 1 : 0;
    out[i++] = role === 'utility' ? 1 : 0;
    out[i++] = towerType.ultimate ? 1 : 0;
  } else {
    // Skip past tower features (already 0)
    i += 11;
  }

  // Cell features (place only)
  if (decision.kind === 'place') {
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    let coverage = 0;
    for (const p of paths) {
      coverage += pathCellsWithinRange({ col: decision.col, row: decision.row }, p, decision.type.range);
    }
    out[i++] = Math.min(1, coverage / 50);

    // In aura zone?
    let inAuraZone = 0;
    for (const placed of ctx.placedTowers) {
      const t = TOWER_TYPES[placed.towerId];
      if (!t) continue;
      const role = getTowerRole(t);
      if (role !== 'aura' && role !== 'slow') continue;
      const dx = placed.col - decision.col, dy = placed.row - decision.row;
      if (dx * dx + dy * dy <= t.range * t.range) { inAuraZone = 1; break; }
    }
    out[i++] = inAuraZone;
  } else {
    i += 2;
  }

  return out;
}

// ──────────────────────────────────────────────────────────────────
// Combined feature vector (state || action) — what the regressor sees.
// ──────────────────────────────────────────────────────────────────

export const ALL_FEATURE_NAMES = [
  ...STATE_FEATURE_NAMES.map(n => `s_${n}`),
  ...ACTION_FEATURE_NAMES.map(n => `a_${n}`),
];
export const ALL_FEATURE_COUNT = STATE_FEATURE_COUNT + ACTION_FEATURE_COUNT;

export function extractAllFeatures(ctx: BotContext, decision: BotDecision): number[] {
  return [...extractStateFeatures(ctx), ...extractActionFeatures(ctx, decision)];
}
