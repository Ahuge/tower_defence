/**
 * MazingScorer spec — public API + dirty-bit cache invalidation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, CellType } from '../../Grid';
import { MazingScorer, DEFAULT_MAZING_OPTIONS } from './MazingScorer';
import { Cell, BotContext } from '../BotBrain';
import { seedRng } from '../../Rng';

function openGrid(cols: number, rows: number): Grid {
  const g = new Grid(undefined, rows, cols);
  const entry = { col: 0, row: Math.floor(rows / 2) };
  const exit = { col: cols - 1, row: Math.floor(rows / 2) };
  (g as { entry: Cell }).entry = entry;
  (g as { exit: Cell }).exit = exit;
  g.cells[entry.row][entry.col] = CellType.Entry;
  g.cells[exit.row][exit.col] = CellType.Exit;
  return g;
}

function allEmpty(grid: Grid): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c] === CellType.Empty) out.push({ col: c, row: r });
    }
  }
  return out;
}

function makeCtx(grid: Grid, candidates: Cell[], wave: number = 0): BotContext {
  return {
    playerIndex: 0,
    faction: 'arcane',
    candidateCells: candidates,
    towerPool: [],
    budget: 1000,
    wave,
    lives: 20,
    grid,
    allPaths: [[grid.entry, grid.exit]],
    placedTowers: [],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: false,
  };
}

beforeEach(() => seedRng(7));

describe('MazingScorer — basic API', () => {
  it('returns a cell pick on the first call', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    const pick = scorer.bestCell(makeCtx(g, allEmpty(g)));
    expect(pick).not.toBeNull();
    expect(pick!.planRank).toBe(0);
  });

  it('returns null when the candidate pool is empty', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    const pick = scorer.bestCell(makeCtx(g, []));
    expect(pick).toBeNull();
  });

  it('respects confidenceFloor — returns null below the floor', () => {
    const g = openGrid(8, 5);
    // floor=1.0 means even rank-0 (confidence = 1 - 0/N) just barely
    // qualifies. Setting it higher than 1 is impossible, so a sane
    // way to force rejection is a high floor + a wide plan: only
    // rank-0 has confidence 1.0; rank-1 confidence < 1.0 and gets
    // rejected if no rank-0 cell is in the pool.
    const scorer = new MazingScorer({ confidenceFloor: 0.99 });
    // Pull a plan first.
    const ctx = makeCtx(g, allEmpty(g));
    scorer.bestCell(ctx);
    const plan = scorer.getCachedPlan()!.bestPlan;
    expect(plan.length).toBeGreaterThan(0);
    // Now restrict the pool to exclude the rank-0 cell — rank-1+
    // should get vetoed by the high floor.
    const restricted = allEmpty(g).filter(c => c.col !== plan[0].col || c.row !== plan[0].row);
    const ctx2 = makeCtx(g, restricted);
    const pick = scorer.bestCell(ctx2);
    expect(pick).toBeNull();
  });
});

describe('MazingScorer — dirty-bit cache', () => {
  it('reuses the cached plan when grid.version + wave are unchanged', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    const ctx = makeCtx(g, allEmpty(g));
    scorer.bestCell(ctx);
    const planA = scorer.getCachedPlan();
    scorer.bestCell(ctx);
    const planB = scorer.getCachedPlan();
    // Same reference — no replan happened.
    expect(planA).toBe(planB);
  });

  it('replans when grid.version advances', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    scorer.bestCell(makeCtx(g, allEmpty(g)));
    const planA = scorer.getCachedPlan();
    g.placeTower(2, 2);  // bumps grid.version
    scorer.bestCell(makeCtx(g, allEmpty(g)));
    const planB = scorer.getCachedPlan();
    expect(planA).not.toBe(planB);
  });

  it('replans when wave advances', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    scorer.bestCell(makeCtx(g, allEmpty(g), 1));
    const planA = scorer.getCachedPlan();
    scorer.bestCell(makeCtx(g, allEmpty(g), 2));
    const planB = scorer.getCachedPlan();
    expect(planA).not.toBe(planB);
  });

  it('manual invalidate forces a replan', () => {
    const g = openGrid(8, 5);
    const scorer = new MazingScorer({ confidenceFloor: 0 });
    scorer.bestCell(makeCtx(g, allEmpty(g)));
    const planA = scorer.getCachedPlan();
    scorer.invalidate();
    scorer.bestCell(makeCtx(g, allEmpty(g)));
    const planB = scorer.getCachedPlan();
    expect(planA).not.toBe(planB);
  });
});

describe('MazingScorer — config plumbing', () => {
  it('default options match DEFAULT_MAZING_OPTIONS', () => {
    expect(DEFAULT_MAZING_OPTIONS.confidenceFloor).toBe(0.4);
    expect(DEFAULT_MAZING_OPTIONS.alpha).toBe(5.0);
  });

  it('partial options merge with defaults', () => {
    const scorer = new MazingScorer({ alpha: 10.0 });
    // Smoke: doesn't crash on construction. Alpha is now 10 internally
    // but isn't surfaced — the test exists to lock the spread merge.
    void scorer;
  });
});
