/**
 * Compositional usage test — proves MazingScorer can be used by a
 * brain that does NOT extend BalancedBrain.
 *
 * Most brains extend BalancedBrain because that's where the meta /
 * phase / upgrade machinery lives. But the WHERE-to-place decision is
 * spatial reasoning that any brain can delegate to MazingScorer via
 * composition. This test validates the architectural claim — any
 * brain can hold a MazingScorer and ask it for cells.
 *
 * Useful as a template for v3 M6's combo brains
 * (GreedyMazingBrain, RushMazingBrain, etc.).
 */
import { describe, it, expect } from 'vitest';
import { Grid, CellType } from '../../Grid';
import { findPath } from '../../Pathfinding';
import { TowerType } from '../../../data/TowerTypes';
import { BotBrain, BotContext, BotDecision, Cell } from '../BotBrain';
import { MazingScorer } from './MazingScorer';
import { seedRng } from '../../Rng';

const tower = (overrides: Partial<TowerType> & Pick<TowerType, 'id' | 'cost' | 'damage' | 'range' | 'fireRate'>): TowerType => ({
  name: overrides.id, description: '',
  damageType: 'physical', color: 0, projectileSpeed: 0,
  sellRefundRatio: 0, upgrades: [],
  traits: [{ id: 'direct_damage' }],
  hotkey: '1',
  ...overrides,
});

const WALL = tower({ id: 'wall', cost: 10, damage: 0, range: 1, fireRate: 99999 });
const DPS = tower({ id: 'dps', cost: 50, damage: 30, range: 4, fireRate: 600 });

/**
 * MinimalScorerBrain — a brain that holds a MazingScorer and uses it
 * for cell selection. Does NOT extend BalancedBrain or any other brain.
 * The simplest possible composition.
 *
 * Strategy: just place DPS towers wherever the scorer recommends.
 * Real combo brains (M6) layer their own meta / phase logic on top.
 */
class MinimalScorerBrain implements BotBrain {
  readonly name = 'MinimalScorer';
  private scorer = new MazingScorer({ confidenceFloor: 0 });

  decide(ctx: BotContext): BotDecision {
    if (ctx.candidateCells.length === 0) return { kind: 'skip' };
    const dps = ctx.towerPool.filter(t => t.id === DPS.id && t.cost <= ctx.budget);
    if (dps.length === 0) return { kind: 'skip' };
    const pick = this.scorer.bestCell(ctx, dps[0]);
    if (!pick) return { kind: 'skip' };
    return { kind: 'place', col: pick.col, row: pick.row, type: dps[0] };
  }
}

function openGrid(cols: number, rows: number): Grid {
  const g = new Grid(undefined, rows, cols);
  (g as { entry: Cell }).entry = { col: 0, row: Math.floor(rows / 2) };
  (g as { exit: Cell }).exit = { col: cols - 1, row: Math.floor(rows / 2) };
  g.cells[Math.floor(rows / 2)][0] = CellType.Entry;
  g.cells[Math.floor(rows / 2)][cols - 1] = CellType.Exit;
  return g;
}

function ctx(): BotContext {
  const grid = openGrid(10, 5);
  const path = findPath(grid);
  const cells: Cell[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c] === CellType.Empty) cells.push({ col: c, row: r });
    }
  }
  return {
    playerIndex: 0, faction: 'arcane',
    candidateCells: cells, towerPool: [WALL, DPS],
    budget: 500, wave: 1, lives: 20,
    grid, allPaths: path ? [path] : [],
    placedTowers: [], sendOptions: [], frontierOptions: [],
    betweenWaves: false,
  };
}

describe('MazingScorer — used by a non-BalancedBrain', () => {
  it('a minimal compositional brain can place towers via the scorer', () => {
    seedRng(7);
    const brain = new MinimalScorerBrain();
    const c = ctx();
    const d = brain.decide(c);
    expect(d.kind).toBe('place');
    if (d.kind === 'place') {
      expect(d.type.id).toBe(DPS.id);
      const inPool = c.candidateCells.some(cc => cc.col === d.col && cc.row === d.row);
      expect(inPool).toBe(true);
    }
  });

  it('returns skip cleanly when scorer has no plan', () => {
    const brain = new MinimalScorerBrain();
    const c = ctx();
    c.candidateCells = []; // no candidates → scorer returns null
    const d = brain.decide(c);
    expect(d.kind).toBe('skip');
  });

  it('the scorer is fully isolated — no BalancedBrain or MazingBrain imports', async () => {
    // This is a static-shape assertion — read the module file and
    // assert it has zero coupling to brain inheritance.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const scorerPath = path.resolve(__dirname, 'MazingScorer.ts');
    const src = fs.readFileSync(scorerPath, 'utf-8');
    expect(src).not.toMatch(/from.*BalancedBrain/);
    expect(src).not.toMatch(/from.*MazingBrain/);
  });
});
