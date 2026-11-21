/**
 * PlacementAdvisor spec — pure advisor math + the path-blocking rule
 * the advisor's candidate check relies on.
 *
 * Covers the 2026-11-06 advisor fixes:
 *  - board signature changes on place / upgrade / sell (refresh gate)
 *  - upgrade value heuristic (DPS gained per gold)
 *  - label layout: adjacent top-3 cells don't overlap
 *  - wouldBlockPath: a maze-closing cell is detected via findPath
 */
import { describe, it, expect } from 'vitest';
import {
  boardSignature,
  scoreUpgradeValue,
  layoutAdvisorLabels,
  AdvisorTower,
} from './PlacementAdvisor';
import { Grid, CellType } from './Grid';
import { findPath } from './Pathfinding';

function tower(over: Partial<AdvisorTower> & { col: number; row: number }): AdvisorTower {
  return {
    towerId: 'arc_bolt', name: 'Bolt', level: 1,
    damage: 8, fireRate: 600,
    upgradeCost: 30, nextDamage: 12, nextFireRate: 550,
    ...over,
  };
}

/** Mirror of GameScene.wouldBlockPath — same algorithm, tested here
 *  against Grid + findPath directly (GameScene needs a live scene). */
function wouldBlockPath(grid: Grid, col: number, row: number): boolean {
  const prev = grid.cells[row][col];
  grid.cells[row][col] = CellType.Tower;
  try {
    for (const entry of grid.entries) {
      for (const exit of grid.exits) {
        if (!findPath(grid, entry, exit)) return true;
      }
    }
    return false;
  } finally {
    grid.cells[row][col] = prev;
  }
}

describe('boardSignature', () => {
  it('changes on place', () => {
    const a = [tower({ col: 5, row: 10 })];
    const b = [...a, tower({ col: 6, row: 10 })];
    expect(boardSignature(a)).not.toBe(boardSignature(b));
  });

  it('changes on upgrade at the same count (the old count gate missed this)', () => {
    const a = [tower({ col: 5, row: 10, level: 1 })];
    const b = [tower({ col: 5, row: 10, level: 2 })];
    expect(boardSignature(a)).not.toBe(boardSignature(b));
  });

  it('changes on sell and is stable when unchanged', () => {
    const a = [tower({ col: 5, row: 10 })];
    expect(boardSignature(a)).not.toBe(boardSignature([]));
    expect(boardSignature(a)).toBe(boardSignature(a));
  });

  it('is order-independent', () => {
    const a = [tower({ col: 5, row: 10 }), tower({ col: 6, row: 11 })];
    expect(boardSignature(a)).toBe(boardSignature([...a].reverse()));
  });
});

describe('scoreUpgradeValue', () => {
  it('scores a cheap early upgrade high', () => {
    // Bolt-like: 13.3 DPS -> 21.8 DPS for 30g.
    const s = scoreUpgradeValue(8 / 0.6, 12 / 0.55, 30);
    expect(s).toBeGreaterThan(0.9);
  });

  it('scores an expensive late upgrade low', () => {
    // 50 DPS -> 55 DPS for 200g.
    expect(scoreUpgradeValue(50, 55, 200)).toBeLessThan(0.3);
  });

  it('never recommends a DPS downgrade', () => {
    expect(scoreUpgradeValue(10 / 0.6, 8 / 0.6, 30)).toBe(-1);
  });
});

describe('layoutAdvisorLabels', () => {
  // Alex's screenshot case: top cells at (0,4) and (1,4) — labels
  // "1 · ..." and "3 · ..." overlapped. TILE_SIZE = 28.
  const CHAR_W = 6.6;
  function labelBox(x: number, y: number, text: string) {
    const w = text.length * CHAR_W + 4;
    return { x0: x - w / 2, x1: x + w / 2, y0: y - 7.5, y1: y + 7.5 };
  }
  function overlaps(a: ReturnType<typeof labelBox>, b: ReturnType<typeof labelBox>) {
    return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  }

  it('staggers horizontally adjacent labels so they do not overlap', () => {
    const texts = ['1 · Gambler 0.62', '2 · Gambler 0.61', '3 · Gambler 0.60'];
    const items = [
      { cx: 14, cy: 100, w: texts[0].length * CHAR_W + 4 },
      { cx: 42, cy: 100, w: texts[1].length * CHAR_W + 4 },
      { cx: 70, cy: 100, w: texts[2].length * CHAR_W + 4 },
    ];
    const out = layoutAdvisorLabels(items, 0);
    const boxes = out.map((p, i) => labelBox(p.x, p.y, texts[i]));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false);
      }
    }
    // At least one label moved off the shared row.
    expect(out.some(p => p.y !== 100)).toBe(true);
  });

  it('leaves well-separated labels untouched', () => {
    const items = [
      { cx: 14, cy: 100, w: 60 },
      { cx: 400, cy: 300, w: 60 },
    ];
    const out = layoutAdvisorLabels(items, 0);
    expect(out).toEqual([{ x: 14, y: 100 }, { x: 400, y: 300 }]);
  });
});

describe('wouldBlockPath', () => {
  it('open board: no single cell blocks', () => {
    const grid = new Grid(); // plains: entry (0,13), exit (35,13)
    expect(wouldBlockPath(grid, 18, 13)).toBe(false);
    expect(wouldBlockPath(grid, 0, 7)).toBe(false);
    expect(grid.cells[13][18]).toBe(CellType.Empty); // restored
  });

  it('wall with a single gap: the gap cell blocks', () => {
    const grid = new Grid();
    for (let r = 0; r < 26; r++) {
      if (r !== 13) grid.placeTower(18, r);
    }
    expect(wouldBlockPath(grid, 18, 13)).toBe(true);
    expect(wouldBlockPath(grid, 5, 5)).toBe(false);
  });
});
