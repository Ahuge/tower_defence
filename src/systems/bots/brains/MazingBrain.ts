/**
 * MazingBrain — BalancedBrain with adversarial-BFS cell selection.
 *
 * Inherits the entire decision pipeline from BalancedBrain (meta pass,
 * phase machine, panic mode, ultimate-save, upgrade, sell). The only
 * thing that changes is *where* a tower goes once the brain has
 * decided what kind of placement to make:
 *
 *   - decideMaze:  cell picked by MazingScorer.bestCell (was bestMazeCell)
 *   - decideDps:   cell picked by MazingScorer.bestCell (was scoreDpsCells)
 *   - decidePanic: cell picked by MazingScorer.bestCell (was scoreDpsCells)
 *   - tryPlaceUltimate: cell picked by MazingScorer.bestCell (was scoreDpsCells)
 *
 * v1 ignores the tower being placed (every cell gets one score). v2
 * passes the tower into bestCell so role-aware scoring can shift the
 * best-cell ranking.
 *
 * Why subclass instead of compose: the spatial choice is a single
 * helper deep in BalancedBrain's machinery — overriding 4 methods is
 * lower-friction than wrapping the whole brain and re-deriving
 * candidate cells / wallsPlaced state on each call.
 *
 * Fallback behaviour: when MazingScorer.bestCell returns null (the
 * cached plan has no cells matching the brain's candidate pool, or
 * confidence is below the floor), the override falls back to the
 * parent's scorer so we never stall harder than BalancedBrain would.
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

export const DEFAULT_MAZING_BRAIN_PARAMS: MazingBrainParams = {
  // Spread the BalancedBrain defaults so any future addition to that
  // schema lands here automatically. Searched values come in via the
  // env-var path BalancedBrain already uses, plus a parallel one for
  // mazing-specific knobs (loadParamsFromEnv hook below).
  panicLives: 5,
  mazeSaturationThreshold: 0,
  maxWallPlacements: 8,
  highCoverageRatio: 1.5,
  minDpsTowersForUlt: 4,
  stableLivesForUlt: 15,
  expensiveBias: 1.0,
  frontierBuyChance: 0.4,
  sendBuyChance: 0.3,
  auraAdjacencyBonus: 0.25,
  waveLookaheadWindow: 3,
  upgradeCoverageRange: 4,
  skipUltimateSave: 0,
  upgradeStrategyIdx: 0,
  towerPickStrategyIdx: 0,
  // MazingScorerOptions defaults (alpha/beta/gamma + beam shape +
  // mutation probs + confidence-floor + budget projection).
  ...DEFAULT_MAZING_OPTIONS,
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
  // Per-bot scorer instance — owns the cached plan + dirty-bit. Bots
  // in different zones don't share caches because their candidate
  // pools (and thus their plans) diverge.
  protected scorer: MazingScorer;

  constructor(params?: Partial<MazingBrainParams>) {
    const merged = params ? { ...DEFAULT_MAZING_BRAIN_PARAMS, ...params } : loadMazingParamsFromEnv();
    super(merged);
    this.scorer = new MazingScorer(merged);
  }

  // ── decideMaze ─────────────────────────────────────────────────
  // Use the cached beam plan to choose the wall cell. Falls back to
  // the parent's bestMazeCell when the plan is empty or below
  // confidence. Affordability + walls-placed counter logic is
  // unchanged from the parent.
  protected decideMaze(ctx: BotContext): BotDecision {
    const walls = this.affordable(this.grouped.wall, ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };

    const pick = this.scorer.bestCell(ctx);
    if (pick) {
      this.wallsPlaced++;
      return { kind: 'place', col: pick.col, row: pick.row, type: walls[0] };
    }

    // Fallback to BalancedBrain's greedy single-cell scorer.
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= this.params.mazeSaturationThreshold) {
      this.wallsPlaced = this.params.maxWallPlacements;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  // ── decideDps ──────────────────────────────────────────────────
  // Same tower-pick logic (expensive-bias / counter-swap / etc) as the
  // parent. Cell selection switches to MazingScorer with parent
  // fallback. Mobile units keep the parent's proximity-to-path scorer
  // since their placement semantics are different (roam, not coverage).
  protected decideDps(ctx: BotContext): BotDecision {
    const splash = this.affordable(this.grouped['dps-splash'], ctx.budget);
    const single = this.affordable(this.grouped['dps-single'], ctx.budget);
    const mobile = this.affordable(this.mobileUnits, ctx.budget);
    const pool = [...splash, ...single, ...mobile];
    if (pool.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    const pickedType = this.pickTowerType(pool, ctx);

    // Mobile units: parent path. The scorer's BFS-flavored ranking
    // doesn't model wandering units well — a mobile placed at a
    // far-from-path "good wall" cell wastes its DPS.
    if (hasTrait(pickedType.traits, 'mobile_unit')) {
      const scored = this.scoreMobileCells(ctx.candidateCells, paths, pickedType);
      if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
      return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pickedType };
    }

    // Stationary towers (Bolt, Cannon, Frost, Sniper, etc): scorer
    // picks the cell. v1 ignores `pickedType` — every plan cell looks
    // the same — but we pass it through so v2's role-weighted scoring
    // is a drop-in upgrade.
    const pick = this.scorer.bestCell(ctx, pickedType);
    if (pick) {
      return { kind: 'place', col: pick.col, row: pick.row, type: pickedType };
    }
    // Fallback to the parent's coverage scorer.
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, pickedType.range, ctx.placedTowers);
    if (scored.length === 0) return { kind: 'skip' };
    const best = scored[0];
    if (best.score === 0) return { kind: 'skip' };
    return { kind: 'place', col: best.col, row: best.row, type: pickedType };
  }

  // ── decidePanic ────────────────────────────────────────────────
  // Slow tower placement. The scorer's path-extension term naturally
  // rewards placing the slow at a chokepoint, which is where panic
  // actually wants it.
  protected decidePanic(ctx: BotContext): BotDecision {
    const slows = this.affordable(this.grouped.slow, ctx.budget);
    if (slows.length === 0) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    const type = slows[0];
    const pick = this.scorer.bestCell(ctx, type);
    if (pick) return { kind: 'place', col: pick.col, row: pick.row, type };

    const scored = this.scoreDpsCells(ctx.candidateCells, paths, type.range, ctx.placedTowers);
    if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type };
  }

  // ── tryPlaceUltimate ───────────────────────────────────────────
  // Ult placement. Mobile ults stay on the parent's proximity scorer.
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
}

// pathCellsWithinRange + TILE_SIZE are imported for v2 role-weighted
// scoring; harmless in v1 because TS will tree-shake. The TowerType
// import is the parameter type for `bestCell`.
void pathCellsWithinRange;
void TILE_SIZE;

registerBrain('mazing', () => new MazingBrain());
