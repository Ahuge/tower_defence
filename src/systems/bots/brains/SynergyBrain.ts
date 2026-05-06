/**
 * SynergyBrain — aura-stacking specialist.
 *
 * Philosophy:
 *   - Place aura towers FIRST (once minimum DPS is on the board),
 *     then cluster DPS towers next to them so the adjacency bonus
 *     multiplies total output.
 *   - Target a "synergy cluster" — a 2×2 region near the path where
 *     every cell sees at least one aura source at Chebyshev-1 range.
 *     Pack tower placements into that cluster until saturated.
 *   - Only maze enough to bend the path into the cluster's range.
 *   - Hands off to upgrades when the cluster is full.
 *
 * Intended for factions whose identity IS aura / adjacency:
 *   - Harmonic (Amplifier, Quickener, Reach, Critical Mass — all aura)
 *   - Nature (Blossom adjacency buff)
 *   - Arcane (spell_amp auras where present)
 *
 * For factions without real aura content this brain falls back to
 * coverage placement and usually loses to Rush — that's fine; the
 * tournament picks the winner per faction.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain, PlacedTower } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

/** Chebyshev adjacency — matches the engine's aura radius for
 *  adjacency_buff and the Harmonic 1-tile auras. */
const ADJ = 1;
const MAX_WALLS_BEFORE_CLUSTER = 2;
/** At least one non-wall, non-aura damage tower on the board
 *  before we start buying auras — otherwise an aura-first opener
 *  has nothing to buff and the first wave leaks. */
const MIN_DAMAGE_FLOOR_TOWERS = 1;

export class SynergyBrain implements BotBrain {
  readonly name = 'Synergy';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallsPlaced = 0;
  private wallIds: Set<string> = new Set();
  private auraIds: Set<string> = new Set();

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallsPlaced = 0;
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.auraIds = new Set(this.grouped.aura.map(t => t.id));
  }

  decide(ctx: BotContext): BotDecision {
    // Short maze phase — we need the path to bend, but we don't
    // want to sink gold we'll need for the aura cluster.
    if (this.wallsPlaced < MAX_WALLS_BEFORE_CLUSTER) {
      const maze = this.decideMaze(ctx);
      if (maze.kind === 'place') return maze;
    }

    // Damage floor — ensure at least one DPS tower exists before
    // we start buying non-attacking auras. Without this the zone
    // leaks before the aura stack ever activates.
    const dpsOwned = ctx.placedTowers.filter(p =>
      !this.wallIds.has(p.towerId) && !this.auraIds.has(p.towerId),
    ).length;

    if (dpsOwned < MIN_DAMAGE_FLOOR_TOWERS) {
      const dps = this.decideDps(ctx);
      if (dps.kind === 'place') return dps;
    }

    // Core loop: place an aura tower adjacent to existing DPS OR
    // seed a fresh cluster near the path, then stack DPS next to
    // every aura source we own.
    const cluster = this.decideCluster(ctx);
    if (cluster.kind === 'place') return cluster;

    // Cluster saturated / no auras affordable — upgrade existing.
    const upgrade = this.decideUpgrade(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    // Last resort — place another DPS anywhere reasonable.
    const dps = this.decideDps(ctx);
    if (dps.kind === 'place') return dps;

    return { kind: 'skip' };
  }

  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.grouped.wall.filter(t => t.cost <= ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= 0) {
      this.wallsPlaced = MAX_WALLS_BEFORE_CLUSTER;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  /** Synergy core. Two sub-strategies:
   *
   *   a) If we own aura sources already, find the DPS cell with
   *      the highest number of adjacent auras and place a DPS there.
   *   b) If we don't yet own auras (or the existing cluster is
   *      saturated), place a new aura tower on a cell close to
   *      existing DPS/path — seeding a new cluster.
   *
   *  Falls through to `decideDps` in the top-level decide if this
   *  returns `skip`. */
  private decideCluster(ctx: BotContext): BotDecision {
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    const auraCells = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    const dpsCells = ctx.placedTowers.filter(p =>
      !this.wallIds.has(p.towerId) && !this.auraIds.has(p.towerId),
    );

    // Sub-strategy a: stack DPS near existing auras.
    if (auraCells.length > 0) {
      const dpsPool = [...this.grouped['dps-single'], ...this.grouped['dps-splash']]
        .filter(t => t.cost <= ctx.budget);
      if (dpsPool.length > 0) {
        const pick = dpsPool.sort((a, b) => b.cost - a.cost)[0];
        const scored = this.scoreClusterCells(ctx.candidateCells, paths, pick.range, auraCells);
        // Require at least one adjacent aura — otherwise we're
        // just placing a regular DPS, which the fallback handles.
        if (scored.length > 0 && scored[0].auraAdj > 0 && scored[0].coverage > 0) {
          return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pick };
        }
      }
    }

    // Sub-strategy b: seed a new aura cluster. Pick the cheapest
    // affordable aura and place it near existing DPS/path.
    const auras = this.grouped.aura.filter(t => t.cost <= ctx.budget);
    if (auras.length > 0) {
      const pick = auras.sort((a, b) => a.cost - b.cost)[0];
      // Score cells by proximity to DPS + path — an aura is most
      // valuable in range of both our towers and the creeps.
      const scored = ctx.candidateCells.map(c => {
        let pathScore = 0;
        for (const p of paths) pathScore += pathCellsWithinRange(c, p, 3 * 28);
        let dpsAdj = 0;
        for (const d of dpsCells) {
          if (Math.abs(d.col - c.col) <= ADJ && Math.abs(d.row - c.row) <= ADJ) dpsAdj++;
        }
        return { col: c.col, row: c.row, score: pathScore + dpsAdj * 20 };
      }).sort((a, b) => b.score - a.score);
      if (scored.length > 0 && scored[0].score > 0) {
        return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pick };
      }
    }

    return { kind: 'skip' };
  }

  /** Coverage score + count of adjacent aura sources. Used to
   *  rank DPS-placement cells when seeding a synergy cluster. */
  private scoreClusterCells(
    cells: Cell[], paths: PathPoint[][], range: number, auraCells: PlacedTower[],
  ): { col: number; row: number; coverage: number; auraAdj: number }[] {
    const scored = cells.map(c => {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, range);
      let auraAdj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - c.col) <= ADJ && Math.abs(a.row - c.row) <= ADJ) auraAdj++;
      }
      return { col: c.col, row: c.row, coverage, auraAdj };
    });
    // Primary sort: adjacent aura count. Tiebreaker: coverage.
    scored.sort((a, b) => b.auraAdj - a.auraAdj || b.coverage - a.coverage);
    return scored;
  }

  private decideDps(ctx: BotContext): BotDecision {
    const pool = [...this.grouped['dps-single'], ...this.grouped['dps-splash']]
      .filter(t => t.cost <= ctx.budget);
    if (pool.length === 0) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };
    const pick = pool.sort((a, b) => b.cost - a.cost)[0];
    const cells = ctx.candidateCells.map(c => {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, pick.range);
      return { col: c.col, row: c.row, coverage };
    }).sort((a, b) => b.coverage - a.coverage);
    if (cells.length === 0 || cells[0].coverage === 0) return { kind: 'skip' };
    return { kind: 'place', col: cells[0].col, row: cells[0].row, type: pick };
  }

  private decideUpgrade(ctx: BotContext): BotDecision {
    const candidates = ctx.placedTowers.filter(p => p.upgradeCost > 0 && p.upgradeCost <= ctx.budget);
    if (candidates.length === 0) return { kind: 'skip' };
    // Prefer upgrading towers in the cluster (adjacent to auras)
    // first — their upgrades compound with the aura bonus.
    const auraCells = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    const scored = candidates.map(p => {
      let adj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - p.col) <= ADJ && Math.abs(a.row - p.row) <= ADJ) adj++;
      }
      return { placed: p, adj };
    }).sort((a, b) => b.adj - a.adj || b.placed.level - a.placed.level);
    const best = scored[0].placed;
    return { kind: 'upgrade', col: best.col, row: best.row };
  }
}

registerBrain('synergy', () => new SynergyBrain());
