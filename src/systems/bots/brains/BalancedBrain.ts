/**
 * BalancedBrain — a hand-crafted, role-aware, path-scoring brain.
 *
 * Design (Phase A upgrade, April 2026):
 *   1. Classify tower pool by role (wall / dps-single / dps-splash /
 *      slow / aura / utility) via `getTowerRole()`.
 *   2. Phase state machine:
 *        building-maze:   prioritise wall placements that extend path.
 *        filling-dps:     cover path cells with damage towers.
 *        saving-ultimate: accumulate budget for the faction's ULT
 *                         once coverage is acceptable and lives stable.
 *        panic:           lives < PANIC_LIVES — pivot to slow/AOE.
 *   3. Score-based cell selection:
 *        wall:   path-length gain (from MazePlanner).
 *        dps:    # of path cells within range + aura-neighbour bonus.
 *        mobile: proximity-to-path (not radius coverage — mobile units
 *                move to engage rather than sitting on their cell).
 *        slow:   same as dps but weighted higher when panicking.
 *   4. Upgrade-before-place preference — once DPS coverage is good
 *      enough, pour budget into existing towers rather than new cells.
 *   5. Wave-lookahead bias — if upcoming waves feature a dominant
 *      creep type, nudge the tower pick toward a counter
 *      (splash for swarm/group, slow for fast, pierce for armored).
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain, PlacedTower } from '../BotBrain';
import { TowerType, TOWER_TYPES } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { CREEP_TYPES } from '../../../data/CreepTypes';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';
import { rng } from '../../Rng';
import { TILE_SIZE } from '../../../config';

type Phase = 'building-maze' | 'filling-dps' | 'saving-ultimate' | 'panic';

const PANIC_LIVES = 5;
const MAZE_SATURATION_THRESHOLD = 0;
const MAX_WALL_PLACEMENTS = 8;
/** Coverage (path cells within any DPS tower's range, summed across
 *  all paths) above which the brain prefers to upgrade existing
 *  towers rather than place new ones. Calibrated per path length:
 *  `HIGH_COVERAGE_RATIO × (total path cells × paths)`. */
const HIGH_COVERAGE_RATIO = 1.5;
/** Once this many non-wall towers are placed, the ultimate-save
 *  phase can activate. Below this we still need more raw coverage. */
const MIN_DPS_TOWERS_FOR_ULT = 4;
/** Start buying frontier / saving for ultimate once lives are at
 *  least this high. Keeps panic-mode responsive — you don't save
 *  for an ultimate while bleeding out. */
const STABLE_LIVES_FOR_ULT = 15;

/** Tile-distance within which a tower is "adjacent" for aura
 *  buffing. Matches the engine's Chebyshev-1 adjacency convention
 *  used by `adjacency_buff` and the Harmonic aura radii. */
const ADJACENCY_TILES = 1;

export class BalancedBrain implements BotBrain {
  readonly name = 'Balanced';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallsPlaced = 0;
  /** Cached ultimate tower (if any) for this faction — memoised at
   *  init so we don't re-scan the pool every decide(). */
  private ultimate: TowerType | null = null;
  /** Cached set of tower ids whose role is 'aura' — used for the
   *  adjacency bonus in DPS cell scoring. */
  private auraIds: Set<string> = new Set();
  /** Cached set of wall ids — used throughout for classification. */
  private wallIds: Set<string> = new Set();
  /** Cached mobile-unit tower types (extracted from the utility
   *  bucket) so the brain can place them on proximity-to-path
   *  cells instead of leaving them unbuilt. */
  private mobileUnits: TowerType[] = [];

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallsPlaced = 0;
    this.ultimate = ctx.towerPool.find(t => t.ultimate) ?? null;
    this.auraIds = new Set(this.grouped.aura.map(t => t.id));
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    // Mobile units live in the utility bucket per TowerRoles.ts,
    // but the old brain ignored that bucket entirely — Military
    // (Rifleman/Brawler/Tank/Commander) and Nature (Grove Viper)
    // were never placed. Extract them here for a dedicated path.
    this.mobileUnits = ctx.towerPool.filter(t => hasTrait(t.traits, 'mobile_unit'));
  }

  decide(ctx: BotContext): BotDecision {
    // Meta-economy pass (gated on having a fighting tower on the
    // board so wave 0 doesn't commit the opening budget to frontier).
    if (ctx.betweenWaves && this.hasFightingTower(ctx)) {
      const meta = this.decideMeta(ctx);
      if (meta.kind !== 'skip') return meta;
    }

    const phase = this.pickPhase(ctx);

    // Ultimate-save phase — accumulate budget, place when we can.
    if (phase === 'saving-ultimate') {
      const ult = this.tryPlaceUltimate(ctx);
      if (ult.kind === 'place') return ult;
      // Still saving — fall through to upgrade-only behaviour.
      const upgrade = this.decideUpgrade(ctx);
      if (upgrade.kind === 'upgrade') return upgrade;
      return { kind: 'skip' };
    }

    // Normal phase dispatch.
    let primary: BotDecision;
    switch (phase) {
      case 'building-maze': {
        const d = this.decideMaze(ctx);
        primary = d.kind === 'place' ? d : this.decideDps(ctx);
        break;
      }
      case 'panic': {
        const d = this.decidePanic(ctx);
        primary = d.kind === 'place' ? d : this.decideDps(ctx);
        break;
      }
      case 'filling-dps':
      default:
        primary = this.decideDps(ctx);
    }

    // Upgrade-before-place preference: if coverage is already good,
    // pouring gold into upgrades is more efficient than sprinkling
    // another cheap tower. Fixes mid-game plateaus where the old
    // brain kept placing marginal DPS instead of levelling up the
    // towers that already worked.
    if (primary.kind === 'place' && this.coverageHigh(ctx)) {
      const upgrade = this.decideUpgrade(ctx);
      if (upgrade.kind === 'upgrade') return upgrade;
    }

    if (primary.kind === 'place') return primary;

    const upgrade = this.decideUpgrade(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    if (ctx.candidateCells.length === 0 && ctx.placedTowers.length >= 3) {
      const sell = this.decideSell(ctx);
      if (sell.kind === 'sell') return sell;
    }

    return { kind: 'skip' };
  }

  private decideMeta(ctx: BotContext): BotDecision {
    const roll = rng();
    const wantFrontier = roll < 0.4;
    const wantSend = roll >= 0.4 && roll < 0.7;

    if (wantFrontier && ctx.frontierOptions.length > 0) {
      const affordable = ctx.frontierOptions.filter(o => o.cost <= ctx.budget);
      if (affordable.length > 0) {
        affordable.sort((a, b) => (b.income / b.cost) - (a.income / a.cost));
        return { kind: 'frontier', buildingId: affordable[0].id };
      }
    }

    if (wantSend && ctx.sendOptions.length > 0) {
      const affordable = ctx.sendOptions.filter(o => o.unlocked && o.cost <= ctx.budget);
      if (affordable.length > 0) {
        affordable.sort((a, b) => b.cost - a.cost);
        return { kind: 'send', sendOptionId: affordable[0].id };
      }
    }

    return { kind: 'skip' };
  }

  // ===== Phase selection =====

  private pickPhase(ctx: BotContext): Phase {
    if (ctx.lives > 0 && ctx.lives <= PANIC_LIVES) return 'panic';
    if (this.wallsPlaced < MAX_WALL_PLACEMENTS) return 'building-maze';
    // Ultimate save — only when coverage is solid, lives aren't
    // critical, and we actually have an ultimate to aim for.
    if (
      this.ultimate &&
      ctx.placedTowers.filter(p => !this.wallIds.has(p.towerId)).length >= MIN_DPS_TOWERS_FOR_ULT &&
      ctx.lives >= STABLE_LIVES_FOR_ULT &&
      this.coverageHigh(ctx)
    ) {
      return 'saving-ultimate';
    }
    return 'filling-dps';
  }

  // ===== Phase handlers =====

  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.affordable(this.grouped.wall, ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= MAZE_SATURATION_THRESHOLD) {
      this.wallsPlaced = MAX_WALL_PLACEMENTS;
      return { kind: 'skip' };
    }
    const type = walls[0];
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type };
  }

  /** DPS placement — scores cells by path coverage + aura-neighbour
   *  bonus, picks the best affordable tower biased by upcoming-
   *  wave creep types. Also considers mobile units: if one is
   *  affordable and the chosen cell is near the creep path, pick
   *  the mobile unit instead — that's a faction's key DPS lever
   *  (Military, Nature Viper) that the old brain never built. */
  private decideDps(ctx: BotContext): BotDecision {
    const splash = this.affordable(this.grouped['dps-splash'], ctx.budget);
    const single = this.affordable(this.grouped['dps-single'], ctx.budget);
    const mobile = this.affordable(this.mobileUnits, ctx.budget);
    const pool = [...splash, ...single, ...mobile];
    if (pool.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    // Pick the "best" tower to place. Start with the most expensive
    // affordable (bigger towers = better per cell), then let the
    // wave-lookahead bias swap it for a counter if one exists.
    const pickedType = this.pickTowerType(pool, ctx);

    // Mobile unit: score by cells NEAR the path (proximity), not
    // cells WITHIN RANGE of the path. Mobile units roam and engage;
    // their home cell just needs to leash onto the creep path.
    if (hasTrait(pickedType.traits, 'mobile_unit')) {
      const scored = this.scoreMobileCells(ctx.candidateCells, paths, pickedType);
      if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
      return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pickedType };
    }

    const scored = this.scoreDpsCells(ctx.candidateCells, paths, pickedType.range, ctx.placedTowers);
    if (scored.length === 0) return { kind: 'skip' };
    const best = scored[0];
    if (best.score === 0) return { kind: 'skip' };
    return { kind: 'place', col: best.col, row: best.row, type: pickedType };
  }

  private decidePanic(ctx: BotContext): BotDecision {
    const slows = this.affordable(this.grouped.slow, ctx.budget);
    if (slows.length === 0) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };
    const type = slows[0];
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, type.range, ctx.placedTowers);
    if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type };
  }

  /** Try to buy the faction ultimate. Returns `place` if affordable
   *  now (pick the best-scoring cell); otherwise `skip` — the saving
   *  phase catches the skip and stops spending. */
  private tryPlaceUltimate(ctx: BotContext): BotDecision {
    if (!this.ultimate || ctx.budget < this.ultimate.cost) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };
    // Mobile ultimate (Military Commander) uses the mobile scorer.
    if (hasTrait(this.ultimate.traits, 'mobile_unit')) {
      const scored = this.scoreMobileCells(ctx.candidateCells, paths, this.ultimate);
      if (scored.length === 0) return { kind: 'skip' };
      return { kind: 'place', col: scored[0].col, row: scored[0].row, type: this.ultimate };
    }
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, this.ultimate.range, ctx.placedTowers);
    if (scored.length === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type: this.ultimate };
  }

  private decideUpgrade(ctx: BotContext): BotDecision {
    const affordableOn = (p: PlacedTower): number => {
      if (this.wallIds.has(p.towerId) && p.upgradeBranches.length > 0) {
        const branchCosts = p.upgradeBranches.map(id => p.branchUpgradeCosts[id] ?? Infinity);
        return Math.min(...branchCosts);
      }
      return p.upgradeCost;
    };

    const candidates = ctx.placedTowers.filter(p => {
      if (p.upgradeCost <= 0) return false;
      return affordableOn(p) <= ctx.budget;
    });
    if (candidates.length === 0) return { kind: 'skip' };

    for (const c of candidates) {
      if (this.wallIds.has(c.towerId) && c.upgradeBranches.length > 0) {
        return { kind: 'upgrade', col: c.col, row: c.row, branch: c.upgradeBranches[0] };
      }
    }

    const nonWall = candidates.filter(p => !this.wallIds.has(p.towerId));
    const pool = nonWall.length > 0 ? nonWall : candidates;

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'upgrade', col: pool[0].col, row: pool[0].row };

    const scored = pool.map(p => {
      let coverage = 0;
      for (const path of paths) coverage += pathCellsWithinRange(p, path, 4 * TILE_SIZE);
      return { ...p, coverage };
    });
    scored.sort((a, b) => b.coverage - a.coverage);
    const best = scored[0];
    return { kind: 'upgrade', col: best.col, row: best.row };
  }

  private decideSell(ctx: BotContext): BotDecision {
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0 || ctx.placedTowers.length === 0) return { kind: 'skip' };
    const walls = ctx.placedTowers.filter(p => this.wallIds.has(p.towerId));
    const pool = walls.length > 0 ? walls : ctx.placedTowers;
    const scored = pool.map(p => {
      let coverage = 0;
      for (const path of paths) coverage += pathCellsWithinRange(p, path, 4 * TILE_SIZE);
      return { ...p, coverage };
    });
    scored.sort((a, b) => a.coverage - b.coverage);
    const worst = scored[0];
    return { kind: 'sell', col: worst.col, row: worst.row };
  }

  // ===== Scoring helpers =====

  /** DPS cell scoring with two signals:
   *   - base coverage: path cells within tower range
   *   - aura bonus:    +coverage/4 per adjacent aura-source tower
   *
   *  The aura bonus makes synergy-heavy factions (Nature Blossom,
   *  Harmonic) competitive — placing a DPS next to an already-
   *  placed Amplifier now scores higher than an equivalent cell
   *  in the open. */
  private scoreDpsCells(
    cells: Cell[], paths: PathPoint[][], range: number, placed: PlacedTower[],
  ): { col: number; row: number; score: number }[] {
    const auraCells = placed.filter(p => this.auraIds.has(p.towerId));
    const scored = cells.map(c => {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, range);
      // Adjacency (Chebyshev ≤ 1) to any aura source earns a bonus
      // proportional to the tower's own coverage — a cell that
      // already covers a lot of path AND sits next to an aura is
      // much more valuable than either in isolation.
      let auraAdj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - c.col) <= ADJACENCY_TILES && Math.abs(a.row - c.row) <= ADJACENCY_TILES) {
          auraAdj++;
        }
      }
      const score = coverage + Math.round(coverage * 0.25 * auraAdj);
      return { col: c.col, row: c.row, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /** Mobile-unit placement — picks cells with the smallest distance
   *  to ANY path cell. Mobile units wander from their home cell to
   *  engage creeps via the `mobile_unit` trait's leash, so being
   *  near the path matters more than line-of-sight range coverage. */
  private scoreMobileCells(
    cells: Cell[], paths: PathPoint[][], _type: TowerType,
  ): { col: number; row: number; score: number }[] {
    const scored = cells.map(c => {
      let minDist = Infinity;
      for (const p of paths) {
        for (const pt of p) {
          const dx = pt.col - c.col, dy = pt.row - c.row;
          const d = dx * dx + dy * dy;
          if (d < minDist) minDist = d;
        }
      }
      // Invert so closer = higher score. Clamp to an integer so
      // sort stays stable across cells that tie at same distance.
      const score = minDist === Infinity ? 0 : Math.max(0, 1000 - Math.round(minDist));
      return { col: c.col, row: c.row, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /** Pick the "best" tower to place from a cost-ascending pool.
   *  Default: most expensive (bigger coverage per cell). Override
   *  when upcoming waves have a dominant creep type that one of
   *  the affordable towers specifically counters. */
  private pickTowerType(pool: TowerType[], ctx: BotContext): TowerType {
    const top = [...pool].sort((a, b) => b.cost - a.cost)[0];
    if (!ctx.upcomingWaves || ctx.upcomingWaves.length === 0) return top;

    // Tally creep-type mass across the next 3 waves.
    const typeCount = new Map<string, number>();
    for (const w of ctx.upcomingWaves.slice(0, 3)) {
      for (const g of w.groups) {
        typeCount.set(g.creepType, (typeCount.get(g.creepType) ?? 0) + g.count);
      }
    }

    const dominant = bestKey(typeCount);
    if (!dominant) return top;

    // Counter preference map — each dominant creep type biases us
    // toward a specific tower feature. Picks from the affordable
    // pool; falls back to `top` if nothing matches.
    const counter = findCounterTower(pool, dominant);
    return counter ?? top;
  }

  private affordable(pool: TowerType[], budget: number): TowerType[] {
    return pool.filter(t => t.cost <= budget);
  }

  /** True once the bot owns at least one non-wall tower. */
  private hasFightingTower(ctx: BotContext): boolean {
    if (ctx.placedTowers.length === 0) return false;
    for (const p of ctx.placedTowers) {
      if (!this.wallIds.has(p.towerId)) return true;
    }
    return false;
  }

  /** Rough "is our zone well-defended?" check. Sums path-cell
   *  coverage across all our DPS towers and compares to a ratio
   *  of the total path length. */
  private coverageHigh(ctx: BotContext): boolean {
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return false;
    const totalPathCells = paths.reduce((s, p) => s + p.length, 0);
    let covered = 0;
    for (const placed of ctx.placedTowers) {
      if (this.wallIds.has(placed.towerId)) continue;
      const def = TOWER_TYPES[placed.towerId];
      if (!def) continue;
      for (const p of paths) covered += pathCellsWithinRange(placed, p, def.range * TILE_SIZE);
    }
    return covered >= HIGH_COVERAGE_RATIO * totalPathCells;
  }
}

/** Return the key in a Map with the highest value, or null for
 *  empty input. Tied entries resolve in insertion order. */
function bestKey(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestVal = -Infinity;
  for (const [k, v] of counts) {
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return best;
}

/** Return the first tower in `pool` that counters the given creep
 *  type — heuristics by creep armor/behavior since we don't have
 *  authored counter labels.
 *    armored (heavy)  → splash (bypasses armor less, but high flat hits)
 *    swarm / group    → splash (multi-hit)
 *    fast             → slow-debuff towers
 *    flying           → splash (to hit the straight-line flyers)
 *    shielded         → damage-variance / piercing towers
 *    regenerator      → high-burst DPS (covered by default 'top' pick) */
function findCounterTower(pool: TowerType[], creepTypeId: string): TowerType | null {
  const ct = CREEP_TYPES[creepTypeId];
  if (!ct) return null;
  const hasSplash = (t: TowerType) => hasTrait(t.traits, 'splash_damage');
  const hasSlow = (t: TowerType) => hasTrait(t.traits, 'slow_on_hit');
  const hasPierce = (t: TowerType) => hasTrait(t.traits, 'pierce_damage') || hasTrait(t.traits, 'damage_variance');

  if (ct.armor === 'heavy' || creepTypeId === 'armored') {
    return pool.find(hasSplash) ?? pool.find(hasPierce) ?? null;
  }
  if (ct.spawnBehavior === 'group' || creepTypeId === 'swarm' || creepTypeId === 'group') {
    return pool.find(hasSplash) ?? null;
  }
  if (ct.spawnBehavior === 'flying' || creepTypeId === 'flying') {
    return pool.find(hasSplash) ?? null;
  }
  if (creepTypeId === 'fast') {
    return pool.find(hasSlow) ?? null;
  }
  if (creepTypeId === 'shielded') {
    return pool.find(hasPierce) ?? null;
  }
  return null;
}

registerBrain('balanced', () => new BalancedBrain());
