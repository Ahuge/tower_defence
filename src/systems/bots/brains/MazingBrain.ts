/**
 * MazingBrain — BalancedBrain with adversarial-BFS cell selection.
 *
 * v2 phase 4: wishlist + per-role veto. The brain owns the strategic
 * intent (which towers it'd prefer to place, in priority order) and
 * the scorer owns the spatial intent (where good cells exist for
 * each tower's role). bestCell returns null when no role-compatible
 * cell scores above the confidence floor — the brain falls down its
 * wishlist (splash → single → mobile, or slow → splash → single in
 * panic) and tries the next preference. All-vetoed → parent's
 * coverage scorer fallback so the brain never stalls.
 *
 * Wishlist composition by phase:
 *   - decideMaze:  [cheapest wall]
 *   - decideDps:   [counter-pick, ...remaining splash, ...single, ...mobile]
 *   - decidePanic: [cheapest slow, ...remaining DPS pool]
 *   - tryPlaceUltimate: [the ult] (single-item)
 *
 * The "wait N waves and slows will be great here" emergent behavior
 * is built in: every 4-second decision, the brain re-walks its
 * wishlist with the scorer's veto-of-the-moment. As placements
 * accumulate and the plan replans, formerly-rejected roles become
 * accepted naturally.
 *
 * Mobile units retain the parent's proximity-to-path scorer — the
 * BFS-flavored ranking doesn't model wandering creep-engagement well.
 */
import {
  BotContext, BotDecision, registerBrain,
} from '../BotBrain';
import { BalancedBrain, BalancedBrainParams } from './BalancedBrain';
import { TowerType } from '../../../data/TowerTypes';
import { hasTrait } from '../../traits/Trait';
import { MazingScorer, MazingScorerOptions, DEFAULT_MAZING_OPTIONS } from '../mazing/MazingScorer';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { PathPoint } from '../../Pathfinding';
import { TILE_SIZE } from '../../../config';

export interface MazingBrainParams extends BalancedBrainParams, MazingScorerOptions {}

// Defaults harvested from brain-search on infernal (winner: 99/100).
// Verified vs BalancedBrain (n=50 normal plains): the new defaults
// score 49/50 on infernal (vs Balanced 28/50 → +21pp WIN), 4/50 on
// void (+4 vs Balanced 0/50), and don't regress any other cell from
// the prior un-tuned defaults. Net +23 wins.
//
// Caveats:
// - Tuned for infernal specifically. Other cells may want different
//   weights — the per-faction specialised-brain pattern (see
//   HarmonicBrain / PsionicBrain) is the next step for cells that
//   benefit from custom tuning.
// - epsilonSlow=0 means slow towers contribute nothing to the
//   planner's score. On factions where slow placement matters
//   strategically, this could regress — re-tune per cell when
//   appropriate.
// Defaults harvested from v3 brain-search on infernal — winner 100/100.
// (v2 winner was 99/100; v3 found a slightly better config that uses
// the new aura_chain scorer.) Used as fallback when ctx.faction has no
// specialised entry in MAZING_FACTION_CONFIGS.
export const DEFAULT_MAZING_BRAIN_PARAMS: MazingBrainParams = {
  panicLives: 6,
  mazeSaturationThreshold: 0,
  maxWallPlacements: 10,
  highCoverageRatio: 1.0168,
  minDpsTowersForUlt: 4,
  stableLivesForUlt: 12,
  expensiveBias: 0.9027,
  frontierBuyChance: 0.2116,
  sendBuyChance: 0.3266,
  auraAdjacencyBonus: 0.1971,
  waveLookaheadWindow: 3,
  upgradeCoverageRange: 5,
  skipUltimateSave: 1,
  upgradeStrategyIdx: 0,
  towerPickStrategyIdx: 2,
  alpha: 5.0897,
  beta: 1.1814,
  gamma: 0.7667,
  deltaDps: 0.2877,
  epsilonSlow: 0.2675,
  zetaAura: 0,
  beamWidth: 5,
  mutationsPerState: 12,
  waves: 10,
  baseBudget: 61,
  budgetGrowth: 20,
  growBranchMaxLen: 10,
  towerPickMode: 0,
  pAddTower: 0.4685,
  pGrowBranch: 0,
  pRemoveTower: 0.007,
  pSwapTower: 0.0481,
  addBiasWall: 3.3097,
  addBiasDps: 0.3034,
  addBiasSlow: 0.0694,
  addBiasAura: 0,
  confidenceFloor: 0.3721,
  // v3 scorer weights — only aura_chain is enabled at modest weight on infernal.
  weight_slow_overlap: 0.2295, weight_aura_chain: 0.1715, weight_cc_boost: 0.0695,
  weight_mobile_engagement: 0, weight_dot_overlap: 0.4544,
  enable_slow_overlap: 0, enable_aura_chain: 1, enable_cc_boost: 0,
  enable_mobile_engagement: 0, enable_dot_overlap: 0,
};

/** Per-faction MazingScorer configs harvested from brain-search runs.
 *  Each entry is the bestSoFar params from
 *  brain-search/mazing-<faction>-normal/summary.json. Keyed by
 *  faction id; init(ctx) picks the right one based on ctx.faction.
 *
 *  Cells included = those where MazingBrain beats every prior brain
 *  by > 5pp (verified on n=100 validation in the brain-search run):
 *    - infernal:   99% (was 56% balanced)  — DEFAULT, kept verbatim
 *    - void:       98% (was 100% greedy, ~tie)
 *    - aliens:     73% (was 2% best)
 *    - harmonic:    8% (was 0% best)
 *    - mechanical:  7% (was 0% best)
 *
 *  Cells NOT included (keep their existing winner):
 *    - arcane→greedy 100%  - psionic→greedy 12%
 *    - nature→rush 100%    - cypherpunk→aoe_focus 82%
 *    - military→rush 100%  - celestial→greedy 100%
 *
 *  When ctx.faction isn't in this table, the brain falls back to
 *  DEFAULT_MAZING_BRAIN_PARAMS (the infernal config). */
export const MAZING_FACTION_CONFIGS: Record<string, Partial<MazingBrainParams>> = {
  // v3-tuned: void winner 99/100 (was v2 98/100). Scorer toggles
  // enabled aura_chain + cc_boost + slow_overlap with small weights.
  void: {
    panicLives: 7, mazeSaturationThreshold: 0, maxWallPlacements: 7,
    highCoverageRatio: 1.3589, minDpsTowersForUlt: 4, stableLivesForUlt: 17,
    expensiveBias: 1, frontierBuyChance: 0.2062, sendBuyChance: 0.1808,
    auraAdjacencyBonus: 0.4153, waveLookaheadWindow: 3, upgradeCoverageRange: 4,
    skipUltimateSave: 0, upgradeStrategyIdx: 0, towerPickStrategyIdx: 1,
    alpha: 4.877, beta: 0.9419, gamma: 0,
    deltaDps: 0.05, epsilonSlow: 0.1624, zetaAura: 0,
    beamWidth: 2, mutationsPerState: 15, waves: 12,
    baseBudget: 104, budgetGrowth: 66, growBranchMaxLen: 6, towerPickMode: 1,
    pAddTower: 0.5683, pGrowBranch: 0.2686, pRemoveTower: 0.15, pSwapTower: 0,
    addBiasWall: 2.6923, addBiasDps: 0.2697, addBiasSlow: 0.6297, addBiasAura: 0.5991,
    confidenceFloor: 0.683,
    weight_slow_overlap: 0.1016, weight_aura_chain: 0, weight_cc_boost: 0,
    weight_mobile_engagement: 0.103, weight_dot_overlap: 0,
    enable_slow_overlap: 1, enable_aura_chain: 1, enable_cc_boost: 1,
    enable_mobile_engagement: 0, enable_dot_overlap: 0,
  },
  // v3-tuned: aliens winner 77/100 (was v2 73/100). Verbatim from
  // brain-search/mazing-aliens-normal/summary.json bestSoFar.
  aliens: {
    panicLives: 5, mazeSaturationThreshold: 0, maxWallPlacements: 8,
    highCoverageRatio: 1.7837, minDpsTowersForUlt: 9, stableLivesForUlt: 20,
    expensiveBias: 0.6987, frontierBuyChance: 0.2098, sendBuyChance: 0.1794,
    auraAdjacencyBonus: 0.2998, waveLookaheadWindow: 5, upgradeCoverageRange: 8,
    skipUltimateSave: 1, upgradeStrategyIdx: 0, towerPickStrategyIdx: 3,
    alpha: 1.2182, beta: 0.8082, gamma: 0.7702,
    deltaDps: 0.1477, epsilonSlow: 0.2354, zetaAura: 0.1612,
    beamWidth: 2, mutationsPerState: 18, waves: 10,
    baseBudget: 50, budgetGrowth: 133, growBranchMaxLen: 11, towerPickMode: 1,
    pAddTower: 0.0696, pGrowBranch: 0.5791, pRemoveTower: 0.2775, pSwapTower: 0.1414,
    addBiasWall: 2.7446, addBiasDps: 1.4664, addBiasSlow: 0.6832, addBiasAura: 0.746,
    confidenceFloor: 0.306,
    weight_slow_overlap: 0.0856, weight_aura_chain: 0.0858, weight_cc_boost: 1.5259,
    weight_mobile_engagement: 0.5657, weight_dot_overlap: 0,
    enable_slow_overlap: 1, enable_aura_chain: 0, enable_cc_boost: 0,
    enable_mobile_engagement: 0, enable_dot_overlap: 0,
  },
  harmonic: {
    panicLives: 2, mazeSaturationThreshold: 2, maxWallPlacements: 11,
    highCoverageRatio: 1.4938, minDpsTowersForUlt: 7, stableLivesForUlt: 18,
    expensiveBias: 1, frontierBuyChance: 0.2334, sendBuyChance: 0.4855,
    auraAdjacencyBonus: 0.0908, waveLookaheadWindow: 4, upgradeCoverageRange: 5,
    skipUltimateSave: 1, upgradeStrategyIdx: 0, towerPickStrategyIdx: 0,
    alpha: 4.12, beta: 0.3986, gamma: 0.1811,
    deltaDps: 0.1438, epsilonSlow: 0.2582, zetaAura: 0.1234,
    beamWidth: 3, mutationsPerState: 18, waves: 8,
    baseBudget: 103, budgetGrowth: 59, growBranchMaxLen: 7, towerPickMode: 0,
    pAddTower: 0.96, pGrowBranch: 0, pRemoveTower: 0.2971, pSwapTower: 0.1734,
    addBiasWall: 1.7111, addBiasDps: 2.3636, addBiasSlow: 1.2069, addBiasAura: 1.7585,
    confidenceFloor: 0.0966,
  },
  mechanical: {
    // Mechanical's brain-search winner — 7% on a previously-unsolved
    // cell. Mech kit emphasises wall placements (mech_wall is cheap,
    // mech_spike) plus DPS coverage. Towers tend to want to occupy
    // the path itself, not the chokes.
    panicLives: 1, maxWallPlacements: 9, highCoverageRatio: 1.46,
    expensiveBias: 1.0, sendBuyChance: 0.32, auraAdjacencyBonus: 0.33,
    skipUltimateSave: 0, upgradeStrategyIdx: 2,
    alpha: 6.26, beta: 1.47, gamma: 0.21,
    deltaDps: 0.05, epsilonSlow: 0, zetaAura: 0.23,
    beamWidth: 5, mutationsPerState: 19, waves: 14,
    baseBudget: 78, budgetGrowth: 44, growBranchMaxLen: 7, towerPickMode: 0,
    pAddTower: 0.30, pGrowBranch: 0.02, pRemoveTower: 0.30, pSwapTower: 0.17,
    addBiasWall: 2.84, addBiasDps: 1.25, addBiasSlow: 0, addBiasAura: 0,
    confidenceFloor: 0.22,
  },
  // infernal: omitted — its winner IS the DEFAULT_MAZING_BRAIN_PARAMS.
};

function loadMazingParamsFromEnv(): MazingBrainParams {
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env.MAZING_BRAIN_PARAMS : undefined;
  if (!raw) return DEFAULT_MAZING_BRAIN_PARAMS;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MAZING_BRAIN_PARAMS, ...parsed };
  } catch {
    return DEFAULT_MAZING_BRAIN_PARAMS;
  }
}

export class MazingBrain extends BalancedBrain {
  readonly name: string = 'Mazing';
  protected scorer: MazingScorer;
  /** Optional explicit override (test injection / brain-search). When
   *  null, init(ctx) picks the per-faction config from
   *  MAZING_FACTION_CONFIGS keyed on ctx.faction. */
  private readonly explicitParams: Partial<MazingBrainParams> | null;

  constructor(params?: Partial<MazingBrainParams>) {
    // Resolve params at construction time only when explicitly given
    // OR when the env override is set. Otherwise defer to init(ctx)
    // so we can pick the per-faction config.
    const envParams = !params ? loadMazingParamsFromEnv() : null;
    const initial = params
      ? { ...DEFAULT_MAZING_BRAIN_PARAMS, ...params }
      : (envParams ?? DEFAULT_MAZING_BRAIN_PARAMS);
    super(initial);
    this.scorer = new MazingScorer(initial);
    this.explicitParams = params ?? null;
  }

  init(ctx: BotContext): void {
    super.init(ctx);
    // Per-faction tuning: when no explicit override AND no env var,
    // swap in the brain-search-tuned config for this faction. Falls
    // back to DEFAULT_MAZING_BRAIN_PARAMS (the infernal-tuned config)
    // when the faction has no specialised entry. Both the parent's
    // strategic knobs (panicLives, frontierBuyChance, etc.) AND the
    // scorer's spatial weights need swapping — they were tuned together
    // by brain-search and the win-rates depend on the combination.
    // `typeof process !== 'undefined'` guard is mandatory — in browser
    // builds `process` is not defined and a bare reference throws,
    // which kills GameScene.create() mid-init and leaves the HUD at
    // 0/0/DEAD. The headless harness has process via Node so it skips
    // the guard branch naturally.
    const envOverride = (typeof process !== 'undefined' && process.env)
      ? process.env.MAZING_BRAIN_PARAMS : undefined;
    if (!this.explicitParams && !envOverride) {
      const factionConfig = MAZING_FACTION_CONFIGS[ctx.faction];
      if (factionConfig) {
        const merged = { ...DEFAULT_MAZING_BRAIN_PARAMS, ...factionConfig };
        this.params = merged;       // swap parent's strategic knobs
        this.scorer = new MazingScorer(merged);  // swap scorer weights
      }
    }
  }

  // ── decideMaze ─────────────────────────────────────────────────
  protected decideMaze(ctx: BotContext): BotDecision {
    const walls = this.affordable(this.grouped.wall, ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };

    // Per-role query: ask the scorer specifically for a wall cell.
    // Phase 3 returns role-bucketed picks, so this gets back a cell
    // the planner scored as "good for a wall" rather than "good for
    // anything" (which used to land us at DPS-best cells).
    const pick = this.scorer.bestCell(ctx, walls[0]);
    if (pick) {
      this.wallsPlaced++;
      return { kind: 'place', col: pick.col, row: pick.row, type: walls[0] };
    }

    // Fallback: parent's greedy single-cell scorer (always wall-extending).
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= this.params.mazeSaturationThreshold) {
      this.wallsPlaced = this.params.maxWallPlacements;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  // ── decideDps ──────────────────────────────────────────────────
  protected decideDps(ctx: BotContext): BotDecision {
    const wishlist = this.buildDpsWishlist(ctx);
    if (wishlist.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    // Walk the wishlist asking the scorer per-tower. First non-null
    // wins. Mobile units route through the parent's proximity scorer
    // since the BFS-flavored ranking doesn't model wandering.
    for (const tower of wishlist) {
      if (hasTrait(tower.traits, 'mobile_unit')) {
        const scored = this.scoreMobileCells(ctx.candidateCells, paths, tower);
        if (scored.length > 0 && scored[0].score > 0) {
          return { kind: 'place', col: scored[0].col, row: scored[0].row, type: tower };
        }
        continue;
      }
      const pick = this.scorer.bestCell(ctx, tower);
      if (pick) {
        return { kind: 'place', col: pick.col, row: pick.row, type: tower };
      }
    }

    // All-vetoed fallback: try the parent's coverage scorer with the
    // top wishlist tower so we don't stall when the planner's plan
    // is exhausted.
    const top = wishlist[0];
    if (hasTrait(top.traits, 'mobile_unit')) return { kind: 'skip' };
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, top.range, ctx.placedTowers);
    if (scored.length === 0) return { kind: 'skip' };
    const best = scored[0];
    if (best.score === 0) return { kind: 'skip' };
    return { kind: 'place', col: best.col, row: best.row, type: top };
  }

  // ── decidePanic ────────────────────────────────────────────────
  // Panic mode wishlist: slow first, then DPS as a fallback so the
  // brain never silently does nothing while lives bleed.
  protected decidePanic(ctx: BotContext): BotDecision {
    const slows = this.affordable(this.grouped.slow, ctx.budget);
    const splash = this.affordable(this.grouped['dps-splash'], ctx.budget);
    const single = this.affordable(this.grouped['dps-single'], ctx.budget);
    const wishlist: TowerType[] = [...slows, ...splash, ...single];
    if (wishlist.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    for (const tower of wishlist) {
      const pick = this.scorer.bestCell(ctx, tower);
      if (pick) return { kind: 'place', col: pick.col, row: pick.row, type: tower };
    }

    // All-vetoed fallback — use the parent's coverage scorer with the
    // top wishlist entry. Panic mode never wants to skip silently.
    const type = wishlist[0];
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, type.range, ctx.placedTowers);
    if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type };
  }

  // ── tryPlaceUltimate ───────────────────────────────────────────
  protected tryPlaceUltimate(ctx: BotContext): BotDecision {
    if (!this.ultimate || ctx.budget < this.ultimate.cost) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    if (hasTrait(this.ultimate.traits, 'mobile_unit')) {
      const scored = this.scoreMobileCells(ctx.candidateCells, paths, this.ultimate);
      if (scored.length === 0) return { kind: 'skip' };
      return { kind: 'place', col: scored[0].col, row: scored[0].row, type: this.ultimate };
    }

    const pick = this.scorer.bestCell(ctx, this.ultimate);
    if (pick) return { kind: 'place', col: pick.col, row: pick.row, type: this.ultimate };

    const scored = this.scoreDpsCells(ctx.candidateCells, paths, this.ultimate.range, ctx.placedTowers);
    if (scored.length === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type: this.ultimate };
  }

  /** Build the DPS-phase tower wishlist. The counter-aware top pick
   *  from `pickTowerType` leads, with the rest of the affordable pool
   *  trailing in role-priority order: splash → single → mobile. The
   *  scorer's veto is what makes this list useful — without it the
   *  brain just always places the top pick. */
  protected buildDpsWishlist(ctx: BotContext): TowerType[] {
    const splash = this.affordable(this.grouped['dps-splash'], ctx.budget);
    const single = this.affordable(this.grouped['dps-single'], ctx.budget);
    const mobile = this.affordable(this.mobileUnits, ctx.budget);
    const pool = [...splash, ...single, ...mobile];
    if (pool.length === 0) return [];
    const top = this.pickTowerType(pool, ctx);
    const rest = pool.filter(t => t.id !== top.id);
    return [top, ...rest];
  }
}

// Imports kept for v2 phase 5+ work. TS tree-shake handles unused at build time.
void pathCellsWithinRange;
void TILE_SIZE;

registerBrain('mazing', () => new MazingBrain());
