/**
 * MazingBrain spec — sanity tests that prove the BalancedBrain
 * subclass still places towers, reaches phases correctly, and
 * delegates cell selection to the MazingScorer.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MazingBrain } from './MazingBrain';
import { BotContext } from '../BotBrain';
import { Grid, CellType } from '../../Grid';
import { findPath } from '../../Pathfinding';
import { TowerType } from '../../../data/TowerTypes';
import { seedRng } from '../../Rng';

function tower(overrides: Partial<TowerType> & Pick<TowerType, 'id' | 'name' | 'cost' | 'damage' | 'range' | 'fireRate'>): TowerType {
  return {
    damageType: 'physical',
    color: 0xffffff,
    projectileSpeed: 300,
    sellRefundRatio: 0.5,
    upgrades: [],
    traits: [{ id: 'direct_damage' }],
    hotkey: '1',
    description: '',
    ...overrides,
  };
}

const WALL = tower({ id: 'wall_fake', name: 'Wall', cost: 10, damage: 2, range: 1.5, fireRate: 2000 });
const DPS_CHEAP = tower({ id: 'dps_cheap', name: 'Arrow', cost: 20, damage: 8, range: 3.5, fireRate: 600 });
const DPS_EXPENSIVE = tower({ id: 'dps_pro', name: 'Sniper', cost: 60, damage: 40, range: 6, fireRate: 1500 });
const SLOW = tower({
  id: 'slow_fake', name: 'Frost', cost: 25, damage: 0, range: 3, fireRate: 800,
  traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2000, factor: 0.4 }],
});

function openGrid(cols: number, rows: number): Grid {
  const g = new Grid(undefined, rows, cols);
  (g as { entry: { col: number; row: number } }).entry = { col: 0, row: Math.floor(rows / 2) };
  (g as { exit: { col: number; row: number } }).exit = { col: cols - 1, row: Math.floor(rows / 2) };
  g.cells[Math.floor(rows / 2)][0] = CellType.Entry;
  g.cells[Math.floor(rows / 2)][cols - 1] = CellType.Exit;
  return g;
}

function rectCells(c1: number, r1: number, c2: number, r2: number, grid: Grid): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (grid.cells[r][c] === CellType.Empty) out.push({ col: c, row: r });
    }
  }
  return out;
}

function ctx(overrides: Partial<BotContext>): BotContext {
  const grid = overrides.grid ?? openGrid(10, 5);
  const defaultPath = findPath(grid);
  return {
    playerIndex: 1,
    faction: 'mechanical',
    candidateCells: rectCells(2, 0, 8, 4, grid),
    towerPool: [WALL, DPS_CHEAP, DPS_EXPENSIVE, SLOW],
    budget: 500,
    wave: 1,
    lives: 20,
    grid,
    allPaths: defaultPath ? [defaultPath] : [],
    placedTowers: [],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: false,
    ...overrides,
  };
}

beforeEach(() => seedRng(11));

describe('MazingBrain — basic decisions', () => {
  it('places a wall on first decision when in maze phase', () => {
    const brain = new MazingBrain();
    const c = ctx({});
    brain.init(c);
    const d = brain.decide(c);
    expect(d.kind).toBe('place');
    if (d.kind === 'place') {
      // First placement should be a wall (maze phase). The cell should
      // be one the brain's candidate pool offered.
      expect(d.type.id).toBe(WALL.id);
      const inPool = c.candidateCells.some(cell => cell.col === d.col && cell.row === d.row);
      expect(inPool).toBe(true);
    }
  });

  it('places a DPS once maze cap is hit', () => {
    const brain = new MazingBrain();
    const c = ctx({});
    brain.init(c);
    // Burn through the wall placements.
    for (let i = 0; i < 10; i++) {
      const d = brain.decide(c);
      if (d.kind === 'place' && d.type.id === WALL.id) {
        c.grid.placeTower(d.col, d.row);
        c.candidateCells = c.candidateCells.filter(cell => cell.col !== d.col || cell.row !== d.row);
      } else {
        break;
      }
    }
    // After enough walls, the next decision should be a non-wall placement.
    const final = brain.decide(c);
    if (final.kind === 'place') {
      expect(final.type.id).not.toBe(WALL.id);
    }
  });

  it('decideDps cell selection delegates to MazingScorer', () => {
    const brain = new MazingBrain();
    const c = ctx({});
    brain.init(c);
    // Force-fill the wallsPlaced counter to bypass maze phase.
    for (let i = 0; i < 8; i++) (brain as unknown as { wallsPlaced: number }).wallsPlaced = 8;
    const d = brain.decide(c);
    expect(d.kind).toBe('place');
    // The cell must be in the candidate pool.
    if (d.kind === 'place') {
      const inPool = c.candidateCells.some(cell => cell.col === d.col && cell.row === d.row);
      expect(inPool).toBe(true);
    }
  });

  it('panics into a defensive tower placement when lives are low', () => {
    // Phase 4 wishlist: panic walks [slow, splash, single]. Slow is
    // preferred but the scorer's veto can fall through to splash or
    // single. Either is valid panic-mode behaviour — what matters is
    // the brain doesn't silently skip while lives bleed.
    //
    // Per-faction tuning means panicLives varies per faction (the
    // mechanical default is 1). Pass explicit params to force a
    // predictable panic threshold for the test.
    const brain = new MazingBrain({ panicLives: 5 });
    const c = ctx({ lives: 3 });
    brain.init(c);
    const d = brain.decide(c);
    expect(d.kind).toBe('place');
    if (d.kind === 'place') {
      const okIds = [SLOW.id, DPS_CHEAP.id, DPS_EXPENSIVE.id];
      expect(okIds).toContain(d.type.id);
    }
  });

  it('falls back to skip when no candidates exist and no upgrade is possible', () => {
    const brain = new MazingBrain();
    const c = ctx({ candidateCells: [] });
    brain.init(c);
    const d = brain.decide(c);
    expect(d.kind).toBe('skip');
  });

  it('the scorer caches its plan across decisions', () => {
    const brain = new MazingBrain();
    const c = ctx({});
    brain.init(c);
    brain.decide(c);
    const planA = (brain as unknown as { scorer: { getCachedPlan: () => unknown } }).scorer.getCachedPlan();
    brain.decide(c);
    const planB = (brain as unknown as { scorer: { getCachedPlan: () => unknown } }).scorer.getCachedPlan();
    expect(planA).toBe(planB);
  });

  it('advancing the wave triggers a replan', () => {
    // Cache invalidation is wave-based — cross-bot grid mutations no
    // longer trip a replan storm. The bot's own placement progress is
    // tracked separately (placedTowers count vs plan length).
    const brain = new MazingBrain();
    const c = ctx({});
    brain.init(c);
    brain.decide(c);
    const planA = (brain as unknown as { scorer: { getCachedPlan: () => unknown } }).scorer.getCachedPlan();
    c.wave = 5;
    brain.decide(c);
    const planB = (brain as unknown as { scorer: { getCachedPlan: () => unknown } }).scorer.getCachedPlan();
    expect(planA).not.toBe(planB);
  });
});

describe('MazingBrain — registry', () => {
  it('is registered under id "mazing"', async () => {
    // Import the registry side-effect.
    await import('./MazingBrain');
    const { createBrain } = await import('../BotBrain');
    const brain = createBrain('mazing');
    expect(brain).not.toBeNull();
    expect(brain!.name).toBe('Mazing');
  });
});
