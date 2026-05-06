/**
 * AdversarialBeam spec — the beam-search adversarial maze planner.
 *
 * Tests the public surface (`runBeam`) against fixture grids. We
 * don't test individual mutation operators directly — the beam loop
 * exercises them indirectly, and the public score-history check
 * proves they're producing valid candidates.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, CellType } from '../../Grid';
import { runBeam, DEFAULT_BEAM_OPTIONS, BeamOptions } from './AdversarialBeam';
import { findPathWithMetrics } from '../../Pathfinding';
import { Cell } from '../BotBrain';
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

beforeEach(() => seedRng(42));

describe('AdversarialBeam — runBeam', () => {
  it('produces a non-empty plan on an open grid', () => {
    const g = openGrid(10, 7);
    const result = runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    expect(result.bestPlan.length).toBeGreaterThan(0);
  });

  it('the produced plan extends the BFS path', () => {
    const g = openGrid(10, 7);
    const baseline = findPathWithMetrics(g, g.entry, g.exit);
    expect(baseline).not.toBeNull();
    const baselineLen = baseline!.path.length;

    const result = runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);

    // Apply the plan to the grid and re-measure.
    for (const c of result.bestPlan) {
      g.cells[c.row][c.col] = CellType.Tower;
    }
    const after = findPathWithMetrics(g, g.entry, g.exit);
    expect(after).not.toBeNull();
    expect(after!.path.length).toBeGreaterThan(baselineLen);
  });

  it('never strands the goal — every cell in the plan keeps reachability', () => {
    const g = openGrid(8, 5);
    const result = runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    for (const c of result.bestPlan) g.cells[c.row][c.col] = CellType.Tower;
    const after = findPathWithMetrics(g, g.entry, g.exit);
    expect(after).not.toBeNull();
  });

  it('score history is monotone non-decreasing across waves', () => {
    const g = openGrid(10, 7);
    const result = runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    // The beam keeps the best so far; later waves can't produce a
    // worse top-of-beam unless they failed to mutate (in which case
    // the prior score is recorded). Allow one strict-equality but no
    // strict decrease.
    for (let i = 1; i < result.scoreHistory.length; i++) {
      expect(result.scoreHistory[i]).toBeGreaterThanOrEqual(result.scoreHistory[i - 1]);
    }
  });

  it('seeded rng makes runs reproducible', () => {
    const g1 = openGrid(8, 5);
    seedRng(123);
    const r1 = runBeam(g1, allEmpty(g1), [{ start: g1.entry, end: g1.exit }], DEFAULT_BEAM_OPTIONS);
    const g2 = openGrid(8, 5);
    seedRng(123);
    const r2 = runBeam(g2, allEmpty(g2), [{ start: g2.entry, end: g2.exit }], DEFAULT_BEAM_OPTIONS);
    expect(r1.bestPlan).toEqual(r2.bestPlan);
  });

  it('respects the candidate pool — no plan cell falls outside it', () => {
    const g = openGrid(8, 5);
    // Restrict candidates to the top-left quadrant only.
    const restricted: Cell[] = [];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        if (g.cells[r][c] === CellType.Empty) restricted.push({ col: c, row: r });
      }
    }
    const result = runBeam(g, restricted, [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    for (const cell of result.bestPlan) {
      const inPool = restricted.some(c => c.col === cell.col && c.row === cell.row);
      expect(inPool).toBe(true);
    }
  });

  it('handles multi-spawner segments by summing path metrics', () => {
    const g = openGrid(10, 7);
    const segs = [
      { start: g.entry, end: g.exit },
      { start: { col: 0, row: 0 }, end: { col: 9, row: 6 } },
    ];
    const result = runBeam(g, allEmpty(g), segs, DEFAULT_BEAM_OPTIONS);
    expect(result.bestPlan.length).toBeGreaterThan(0);
  });

  it('does not mutate the baseline grid', () => {
    const g = openGrid(8, 5);
    const before = g.cells.map(r => r.slice());
    const beforeVersion = g.version;
    runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        expect(g.cells[r][c]).toBe(before[r][c]);
      }
    }
    expect(g.version).toBe(beforeVersion);
  });

  it('returns an empty plan when no candidates are available', () => {
    const g = openGrid(6, 5);
    const result = runBeam(g, [], [{ start: g.entry, end: g.exit }], DEFAULT_BEAM_OPTIONS);
    expect(result.bestPlan).toEqual([]);
  });

  it('tiny beam + few mutations still yields a valid plan', () => {
    const g = openGrid(8, 5);
    const opts: BeamOptions = { ...DEFAULT_BEAM_OPTIONS, beamWidth: 1, mutationsPerState: 3, waves: 4 };
    const result = runBeam(g, allEmpty(g), [{ start: g.entry, end: g.exit }], opts);
    for (const c of result.bestPlan) g.cells[c.row][c.col] = CellType.Tower;
    expect(findPathWithMetrics(g, g.entry, g.exit)).not.toBeNull();
  });
});
