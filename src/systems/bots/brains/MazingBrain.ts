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
export const DEFAULT_MAZING_BRAIN_PARAMS: MazingBrainParams = {
  // BalancedBrain inheritance — most knobs left at sensible defaults
  // because brain-search converged near them. Notable changes:
  //   panicLives 5→7 (panic earlier)
  //   expensiveBias 1.0→0.79 (slightly cheaper towers)
  //   frontierBuyChance 0.4→0.02 (almost never)
  //   sendBuyChance 0.3→0.18 (less often)
  //   auraAdjacencyBonus 0.25→0.21 (slightly less aura sensitivity)
  //   skipUltimateSave 0→1 (don't save for ult)
  //   highCoverageRatio 1.5→1.54
  panicLives: 7,
  mazeSaturationThreshold: 0,
  maxWallPlacements: 8,
  highCoverageRatio: 1.54,
  minDpsTowersForUlt: 4,
  stableLivesForUlt: 15,
  expensiveBias: 0.79,
  frontierBuyChance: 0.02,
  sendBuyChance: 0.18,
  auraAdjacencyBonus: 0.21,
  waveLookaheadWindow: 3,
  upgradeCoverageRange: 4,
  skipUltimateSave: 1,
  upgradeStrategyIdx: 0,
  towerPickStrategyIdx: 0,
  // Mazing scorer / beam options. All harvested from brain-search.
  // Note epsilonSlow=0: slow towers contribute nothing on this
  // tuning. Worth retuning per cell if/when needed.
  alpha: 6.39,
  beta: 1.51,
  gamma: 0.5,
  deltaDps: 0.38,
  epsilonSlow: 0,
  zetaAura: 0.39,
  beamWidth: 4,
  mutationsPerState: 12,
  waves: 8,
  baseBudget: 100,
  budgetGrowth: 100,
  growBranchMaxLen: 10,
  towerPickMode: 1,
  pAddTower: 0.65,
  pGrowBranch: 0.30,
  pRemoveTower: 0.22,
  pSwapTower: 0.10,
  addBiasWall: 1.91,
  addBiasDps: 0.73,
  addBiasSlow: 1.04,
  addBiasAura: 0.40,
  confidenceFloor: 0.40,
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

  constructor(params?: Partial<MazingBrainParams>) {
    const merged = params ? { ...DEFAULT_MAZING_BRAIN_PARAMS, ...params } : loadMazingParamsFromEnv();
    super(merged);
    this.scorer = new MazingScorer(merged);
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
