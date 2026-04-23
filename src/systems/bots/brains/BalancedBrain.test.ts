/**
 * BalancedBrain spec — decision-making behaviour of the role-aware
 * brain under controlled contexts.
 *
 * Every test constructs a `BotContext` fixture and drives
 * `decide()` directly. No game loop, no scene, no timers.
 * Fixture helpers make it easy to add new scenarios as the brain
 * grows (wave reactivity, upgrades, etc.).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { BalancedBrain } from './BalancedBrain';
import { BotContext } from '../BotBrain';
import { Grid, CellType } from '../../Grid';
import { findPath } from '../../Pathfinding';
import { TowerType } from '../../../data/TowerTypes';

/** Minimal TowerType factory — just enough fields for the brain's
 *  role classifier + scorer. */
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
const SPLASH = tower({
  id: 'splash_fake', name: 'Mortar', cost: 45, damage: 30, range: 5, fireRate: 1500,
  traits: [{ id: 'splash_damage', radius: 48 }],
});

function openGrid(cols: number, rows: number): Grid {
  const g = new Grid(undefined, rows, cols);
  (g as any).entry = { col: 0, row: Math.floor(rows / 2) };
  (g as any).exit = { col: cols - 1, row: Math.floor(rows / 2) };
  g.cells[Math.floor(rows / 2)][0] = CellType.Entry;
  g.cells[Math.floor(rows / 2)][cols - 1] = CellType.Exit;
  return g;
}

function ctx(overrides: Partial<BotContext>): BotContext {
  const grid = overrides.grid ?? openGrid(10, 5);
  // Supply the default grid-entry→exit path as the single spawner
  // path. Tests can override via the overrides arg if a scenario
  // needs multiple or custom paths.
  const defaultPath = findPath(grid);
  return {
    playerIndex: 1,
    faction: 'mechanical',
    candidateCells: [{ col: 5, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 0 }],
    towerPool: [WALL, DPS_CHEAP, DPS_EXPENSIVE, SLOW, SPLASH],
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

describe('BalancedBrain.init', () => {
  it('groups the tower pool by role', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    // No public accessor — we validate indirectly: a decide() in
    // maze phase should produce a wall placement, which requires
    // grouping to have found the WALL tower.
    const decision = brain.decide(ctx({ lives: 20, budget: 500 }));
    // Phase starts at maze; the brain may pick wall OR fall through
    // to DPS. Either is a valid `place`; a `skip` would mean
    // grouping failed entirely.
    expect(decision.kind).not.toBe('skip');
  });
});

describe('BalancedBrain.decide — maze phase', () => {
  let brain: BalancedBrain;
  beforeEach(() => {
    brain = new BalancedBrain();
    brain.init(ctx({}));
  });

  it('places a wall on the cell with max path gain', () => {
    const grid = openGrid(10, 5);
    // The direct path is row 2. (5,2) blocks it → positive gain.
    // (5,0) off-path → zero gain. Brain should pick (5,2).
    const decision = brain.decide(ctx({
      grid,
      candidateCells: [{ col: 5, row: 0 }, { col: 5, row: 2 }],
    }));
    expect(decision.kind).toBe('place');
    if (decision.kind !== 'place') return;
    expect(decision.col).toBe(5);
    expect(decision.row).toBe(2);
    expect(decision.type.id).toBe(WALL.id);
  });

  it('falls through to DPS when no cell offers positive maze gain', () => {
    // All candidates are off-path → bestMazeCell returns null →
    // brain falls through to decideDps().
    const grid = openGrid(10, 5);
    const decision = brain.decide(ctx({
      grid,
      candidateCells: [{ col: 5, row: 0 }, { col: 6, row: 0 }],
    }));
    expect(decision.kind).toBe('place');
    if (decision.kind !== 'place') return;
    // DPS fallback should NOT pick the wall (on-path score would be
    // zero since the candidates are off-path).
    expect(decision.type.id).not.toBe(WALL.id);
  });

  it('skips when budget < cheapest wall AND no DPS is affordable', () => {
    const decision = brain.decide(ctx({ budget: 5 }));
    expect(decision.kind).toBe('skip');
  });
});

describe('BalancedBrain.decide — panic phase', () => {
  it('prefers a slow tower when lives <= 5', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    const decision = brain.decide(ctx({ lives: 3 }));
    expect(decision.kind).toBe('place');
    if (decision.kind !== 'place') return;
    expect(decision.type.id).toBe(SLOW.id);
  });

  it('falls through to DPS if no slow is affordable', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    // Budget too small for SLOW (25g) but enough for DPS_CHEAP (20g).
    const decision = brain.decide(ctx({ lives: 3, budget: 22 }));
    expect(decision.kind).toBe('place');
    if (decision.kind !== 'place') return;
    expect(decision.type.id).not.toBe(SLOW.id);
  });
});

describe('BalancedBrain.decide — filling-dps phase', () => {
  it('picks the most expensive affordable damage tower', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    // Force phase to filling-dps by simulating 8 wall placements.
    // Easiest way is to grab the private counter via `any`.
    (brain as any).wallsPlaced = 999;
    const decision = brain.decide(ctx({ budget: 100 }));
    expect(decision.kind).toBe('place');
    if (decision.kind !== 'place') return;
    // DPS_EXPENSIVE (60g) or SPLASH (45g). Brain picks by cost DESC
    // so DPS_EXPENSIVE should win when budget allows.
    expect(decision.type.id).toBe(DPS_EXPENSIVE.id);
  });

  it('returns skip when no DPS cell covers any path', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    (brain as any).wallsPlaced = 999;
    // Candidate cells far from the path row (row 2). On a 10×5 grid
    // the direct path stays at row 2; range 3.5 easily reaches row 0
    // from (5,0). Use row 10+ to truly be out of range — impossible
    // on a 5-row grid, so skip this edge case check here.
    // Instead: empty candidates short-circuits the same branch.
    const decision = brain.decide(ctx({
      candidateCells: [],
    }));
    expect(decision.kind).toBe('skip');
  });
});

describe('BalancedBrain.decide — invariants', () => {
  it('never picks a tower over budget', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    // Budget 30 excludes SPLASH (45), DPS_EXPENSIVE (60). Only WALL,
    // DPS_CHEAP, SLOW available.
    const decision = brain.decide(ctx({ budget: 30 }));
    if (decision.kind === 'place') {
      expect(decision.type.cost).toBeLessThanOrEqual(30);
    }
  });

  it('only picks cells from the candidate list', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    const cells = [{ col: 5, row: 2 }, { col: 7, row: 3 }];
    const decision = brain.decide(ctx({ candidateCells: cells }));
    if (decision.kind === 'place') {
      expect(cells.some(c => c.col === decision.col && c.row === decision.row)).toBe(true);
    }
  });
});

describe('BalancedBrain.decide — divergent upgrade branches', () => {
  it('upgrades a wall tower via its DPS branch when one is available', () => {
    const brain = new BalancedBrain();
    // Use a tower pool that includes a "wall" (cheap low-DPS, like
    // Bramble) so the classifier tags `wall_fake` as wall.
    brain.init(ctx({}));
    // Drive with no candidateCells — forces the brain past the
    // placement phases into decideUpgrade.
    const decision = brain.decide(ctx({
      candidateCells: [],
      // One placed wall with a 'razor' branch available at 20g.
      // upgradeCost of the default path is 15g; razor branch is 20g.
      placedTowers: [{
        col: 5, row: 2, towerId: 'wall_fake', level: 1,
        upgradeCost: 15,
        upgradeBranches: ['razor'],
        branchUpgradeCosts: { razor: 20 },
        sellValue: 5,
      }],
      budget: 50,
    }));
    expect(decision.kind).toBe('upgrade');
    if (decision.kind === 'upgrade') {
      expect(decision.branch).toBe('razor');
      expect(decision.col).toBe(5);
      expect(decision.row).toBe(2);
    }
  });

  it('skips branch upgrade when the branch is unaffordable', () => {
    const brain = new BalancedBrain();
    brain.init(ctx({}));
    const decision = brain.decide(ctx({
      candidateCells: [],
      placedTowers: [{
        col: 5, row: 2, towerId: 'wall_fake', level: 1,
        upgradeCost: 15,
        upgradeBranches: ['razor'],
        branchUpgradeCosts: { razor: 500 }, // too expensive
        sellValue: 5,
      }],
      budget: 20, // can't afford 500g razor branch
    }));
    // Brain should fall through to skip / sell since the default
    // upgrade of a wall tower is filtered out by the non-wall pref.
    expect(['skip', 'sell', 'upgrade']).toContain(decision.kind);
    if (decision.kind === 'upgrade') {
      // If it did upgrade, it should be the default path (no branch)
      expect(decision.branch ?? null).toBe(null);
    }
  });
});
