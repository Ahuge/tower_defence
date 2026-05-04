import { describe, it, expect } from 'vitest';
import { SummoningCircle } from './SummoningCircle';
import { HeadlessScene } from '../headless/HeadlessScene';
import { Tower } from './Tower';
import { getTowerType } from '../data/TowerTypes';

function makeTower(typeId: string, col: number, row: number): Tower {
  const scene = new HeadlessScene();
  return new Tower(scene as any, col, row, getTowerType(typeId));
}

describe('SummoningCircle.chargeContribution (M10 adjacency)', () => {
  it('counts only arcane_conduit towers, ignores other arcane types', () => {
    const scene = new HeadlessScene();
    const circle = new SummoningCircle(scene as any, 10, 5);  // 2x2 at (10,5)
    const towers = [
      makeTower('arcane_conduit', 9, 4),   // adjacent — counts
      makeTower('arcane_bolt',    9, 5),   // adjacent but not a conduit — skip
      makeTower('arcane_drain',   9, 6),   // arcane mana drain is no longer a charger — skip
      makeTower('arcane_conduit', 12, 5),  // adjacent (cheby 1 from col 11, row in footprint)
    ];
    expect(circle.chargeContribution(towers)).toBe(2);
  });

  it('uses Chebyshev distance ≤ 1 from any footprint cell', () => {
    const scene = new HeadlessScene();
    const circle = new SummoningCircle(scene as any, 20, 10);  // 2x2 at (20,10) → cells (20,10),(21,10),(20,11),(21,11)
    // Tower at (19, 9) — distance to (20,10) = max(1,1) = 1. Adjacent.
    // Tower at (18, 9) — distance to (20,10) = max(2,1) = 2. NOT adjacent.
    // Tower at (22, 12) — distance to (21,11) = max(1,1) = 1. Adjacent.
    // Tower at (23, 13) — distance to (21,11) = max(2,2) = 2. NOT adjacent.
    const towers = [
      makeTower('arcane_conduit', 19, 9),
      makeTower('arcane_conduit', 18, 9),
      makeTower('arcane_conduit', 22, 12),
      makeTower('arcane_conduit', 23, 13),
    ];
    expect(circle.chargeContribution(towers)).toBe(2);
  });

  it('does not double-count a tower adjacent to multiple footprint cells', () => {
    const scene = new HeadlessScene();
    const circle = new SummoningCircle(scene as any, 5, 5);
    // Tower at (4, 5) is adjacent to BOTH (5,5) and (5,6) — should count once.
    const towers = [makeTower('arcane_conduit', 4, 5)];
    expect(circle.chargeContribution(towers)).toBe(1);
  });

  it('returns 0 with no adjacent drains', () => {
    const scene = new HeadlessScene();
    const circle = new SummoningCircle(scene as any, 1, 1);
    expect(circle.chargeContribution([])).toBe(0);
  });
});
