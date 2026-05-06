/**
 * NatureBrain — faction-specific brain tuned for Nature's mechanics.
 *
 * Nature loses to every generic brain because its cheap DPS is
 * GATED: Bramble Hedge is a wall at L1 (2 dmg, 400ms = 5 DPS) and
 * only unlocks real damage via the L2 → Razor Bramble branch
 * (5 → 15 dmg as it levels). Rush ignores upgrades until cells
 * saturate, Balanced's coverage heuristic doesn't mark Bramble
 * placements as "done yet", and Synergy never gets enough Blossoms
 * online to matter. None of them branch-pivot at the right time.
 *
 * This brain's opening:
 *   1. Place 2-3 Bramble walls (maze + cheap DPS floor).
 *   2. IMMEDIATELY branch-upgrade each Bramble to Razor once L2
 *      is affordable (15g switch). That's the faction's real DPS
 *      ladder — 3 branched Brambles by wave 3 is a meaningful
 *      kill zone.
 *   3. Place a Blossom so the adjacent Razor Brambles get the
 *      +20%/12% buff.
 *   4. Fill remaining path coverage with Viper (mobile), Root (slow),
 *      Sunroot (splash), and more Bramble→Razor.
 *   5. Late game: Elder Treant ultimate when budget allows.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain, PlacedTower } from '../BotBrain';
import { TowerType, TOWER_TYPES } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';
import { TILE_SIZE } from '../../../config';

const ADJ = 1;
const MAX_OPENING_WALLS = 3;

export class NatureBrain implements BotBrain {
  readonly name = 'Nature';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallsPlaced = 0;
  private wallIds: Set<string> = new Set();
  private auraIds: Set<string> = new Set();
  private mobileUnits: TowerType[] = [];
  private ultimate: TowerType | null = null;

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallsPlaced = 0;
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.auraIds = new Set(this.grouped.aura.map(t => t.id));
    this.mobileUnits = ctx.towerPool.filter(t => hasTrait(t.traits, 'mobile_unit'));
    this.ultimate = ctx.towerPool.find(t => t.ultimate) ?? null;
  }

  decide(ctx: BotContext): BotDecision {
    // --- Priority 1: branch any wall with a DPS branch available. ---
    // This is the defining move for Nature — a 12g wall becomes a
    // 27g (12 + 15 switch) real DPS tower that levels to 15 dmg.
    // No other decision comes close to this ROI on the first few
    // waves, so it jumps the queue.
    const branch = this.findBranchUpgrade(ctx);
    if (branch) return branch;

    // --- Priority 2: short opening maze. ---
    if (this.wallsPlaced < MAX_OPENING_WALLS) {
      const maze = this.decideMaze(ctx);
      if (maze.kind === 'place') return maze;
    }

    // --- Priority 3: ultimate save/place once floor is solid. ---
    if (this.ultimate && ctx.placedTowers.length >= 5 && ctx.lives >= 15) {
      if (ctx.budget >= this.ultimate.cost) {
        const u = this.tryPlaceUltimate(ctx);
        if (u.kind === 'place') return u;
      }
    }

    // --- Priority 4: Blossom placement near existing DPS. ---
    // Seed an aura cluster once we have 2+ damage towers on the board.
    const dpsOwned = ctx.placedTowers.filter(p =>
      !this.wallIds.has(p.towerId) && !this.auraIds.has(p.towerId),
    );
    const auraOwned = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    if (dpsOwned.length >= 2 && auraOwned.length < 2) {
      const aura = this.placeAuraNearDps(ctx, dpsOwned);
      if (aura.kind === 'place') return aura;
    }

    // --- Priority 5: regular DPS fill (mobile + splash + single). ---
    const dps = this.decideDps(ctx);
    if (dps.kind === 'place') return dps;

    // --- Priority 6: upgrade existing non-wall, prefer aura-adjacent. ---
    const upgrade = this.decideUpgrade(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    return { kind: 'skip' };
  }

  /** Scan placedTowers for any wall that has a DPS branch
   *  available and fits the budget. Returns a branch-upgrade
   *  decision for the first match, else null. */
  private findBranchUpgrade(ctx: BotContext): BotDecision | null {
    for (const p of ctx.placedTowers) {
      if (!this.wallIds.has(p.towerId)) continue;
      if (p.upgradeBranches.length === 0) continue;
      const branchId = p.upgradeBranches[0];
      const cost = p.branchUpgradeCosts[branchId] ?? Infinity;
      if (cost > ctx.budget) continue;
      return { kind: 'upgrade', col: p.col, row: p.row, branch: branchId };
    }
    return null;
  }

  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.grouped.wall.filter(t => t.cost <= ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= 0) {
      this.wallsPlaced = MAX_OPENING_WALLS;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  private placeAuraNearDps(ctx: BotContext, dpsCells: PlacedTower[]): BotDecision {
    const auras = this.grouped.aura.filter(t => t.cost <= ctx.budget);
    if (auras.length === 0) return { kind: 'skip' };
    const pick = auras.sort((a, b) => a.cost - b.cost)[0];
    // Best aura slot: one adjacent to the most DPS towers already
    // placed, so the buff covers as many shooters as possible.
    const scored = ctx.candidateCells.map(c => {
      let adj = 0;
      for (const d of dpsCells) {
        if (Math.abs(d.col - c.col) <= ADJ && Math.abs(d.row - c.row) <= ADJ) adj++;
      }
      return { col: c.col, row: c.row, adj };
    }).sort((a, b) => b.adj - a.adj);
    if (scored.length === 0 || scored[0].adj === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pick };
  }

  private decideDps(ctx: BotContext): BotDecision {
    const pool = [
      ...this.grouped['dps-single'],
      ...this.grouped['dps-splash'],
      ...this.grouped.slow,   // Nature's Root is classified 'slow' — treat as DPS-eligible
      ...this.mobileUnits,
    ].filter(t => t.cost <= ctx.budget);
    if (pool.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    // Pick the most expensive affordable — more damage per cell
    // and Nature's cost curve is tight enough that there aren't
    // wildly inefficient options.
    const pick = pool.sort((a, b) => b.cost - a.cost)[0];

    const auraCells = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    const isMobile = hasTrait(pick.traits, 'mobile_unit');

    const scored = ctx.candidateCells.map(c => {
      if (isMobile) {
        let minDist = Infinity;
        for (const p of paths) for (const pt of p) {
          const dx = pt.col - c.col, dy = pt.row - c.row;
          const d = dx * dx + dy * dy;
          if (d < minDist) minDist = d;
        }
        return { col: c.col, row: c.row, score: minDist === Infinity ? 0 : 1000 - Math.round(minDist) };
      }
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, pick.range);
      let auraAdj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - c.col) <= ADJ && Math.abs(a.row - c.row) <= ADJ) auraAdj++;
      }
      // Coverage + 40% bonus per adjacent aura — bigger multiplier
      // than BalancedBrain because Blossom's buff is now 20%/12%.
      const score = coverage + Math.round(coverage * 0.4 * auraAdj);
      return { col: c.col, row: c.row, score };
    }).sort((a, b) => b.score - a.score);

    if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type: pick };
  }

  private tryPlaceUltimate(ctx: BotContext): BotDecision {
    if (!this.ultimate) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };
    const auraCells = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    const scored = ctx.candidateCells.map(c => {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, this.ultimate!.range);
      let auraAdj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - c.col) <= ADJ && Math.abs(a.row - c.row) <= ADJ) auraAdj++;
      }
      return { col: c.col, row: c.row, score: coverage + auraAdj * 10 };
    }).sort((a, b) => b.score - a.score);
    if (scored.length === 0 || scored[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type: this.ultimate };
  }

  private decideUpgrade(ctx: BotContext): BotDecision {
    const candidates = ctx.placedTowers.filter(p =>
      p.upgradeCost > 0 && p.upgradeCost <= ctx.budget,
    );
    if (candidates.length === 0) return { kind: 'skip' };
    const nonWall = candidates.filter(p => !this.wallIds.has(p.towerId));
    const pool = nonWall.length > 0 ? nonWall : candidates;
    const auraCells = ctx.placedTowers.filter(p => this.auraIds.has(p.towerId));
    // Aura-adjacent towers get priority — their levelling compounds
    // with Blossom's +20%/12% buff.
    const scored = pool.map(p => {
      let adj = 0;
      for (const a of auraCells) {
        if (Math.abs(a.col - p.col) <= ADJ && Math.abs(a.row - p.row) <= ADJ) adj++;
      }
      const def = TOWER_TYPES[p.towerId];
      let coverage = 0;
      if (def) {
        const paths = ctx.allPaths.filter((x): x is PathPoint[] => !!x && x.length > 0);
        for (const path of paths) coverage += pathCellsWithinRange(p, path, def.range * TILE_SIZE);
      }
      return { p, adj, coverage };
    }).sort((a, b) => b.adj - a.adj || b.coverage - a.coverage);
    const best = scored[0].p;
    return { kind: 'upgrade', col: best.col, row: best.row };
  }
}

registerBrain('nature', () => new NatureBrain());
