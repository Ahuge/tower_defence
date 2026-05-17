import { describe, expect, it, vi } from 'vitest';
import { SIPHON_STACK_THRESHOLD, SuppressionManager, type SuppressibleTower } from './SuppressionManager';
import { CellType, Grid } from '../Grid';
import { gridX, gridY, TILE_SIZE } from '../../config';

/** Minimal Grid stand-in with a fixed shape — no MapDefinition needed.
 *  Tests stamp specific cells; `cells[row][col]` is reachable as on
 *  the real Grid. */
function makeGrid(rows = 20, cols = 30): Grid {
  // Construct without a MapDefinition; the no-arg path initializes
  // cells to Empty and skips entry/exit population.
  const g = new Grid(undefined, rows, cols);
  return g;
}

function makeTower(col: number, row: number, opts: Partial<SuppressibleTower> = {}): SuppressibleTower {
  return {
    col, row,
    lastFired: 0,
    _stress: 0,
    _disabledRemaining: 0,
    _suppressionSeenLastFired: -Infinity,
    ...opts,
  };
}

/** Simulate one tower fire by bumping `lastFired` and calling update. */
function fire(mgr: SuppressionManager, tower: SuppressibleTower, now: number): void {
  tower.lastFired = now;
  mgr.update(now, [tower]);
}

describe('SuppressionManager', () => {
  it('does nothing when there are no pylons', () => {
    const mgr = new SuppressionManager([]);
    const t = makeTower(5, 5);
    for (let i = 0; i < 10; i++) fire(mgr, t, i + 1);
    expect(t._stress).toBe(0);
    expect(t._disabledRemaining).toBe(0);
  });

  it('does nothing for towers outside every pylon radius', () => {
    const mgr = new SuppressionManager([{ col: 0, row: 0, radius: 2 }]);
    const t = makeTower(10, 10);
    for (let i = 0; i < 10; i++) fire(mgr, t, i + 1);
    expect(t._stress).toBe(0);
  });

  it('increments stress on each fire when in radius', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const t = makeTower(5, 5);
    fire(mgr, t, 1);
    fire(mgr, t, 2);
    fire(mgr, t, 3);
    expect(t._stress).toBe(3);
    expect(t._disabledRemaining).toBe(0);
  });

  it('stalls the tower at threshold and resets stress', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const t = makeTower(5, 5);
    for (let i = 0; i < 5; i++) fire(mgr, t, i + 1);
    expect(t._stress).toBe(0);
    expect(t._disabledRemaining).toBe(3);
  });

  it('only counts a tick once even if update runs without a fresh fire', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const t = makeTower(5, 5);
    fire(mgr, t, 1);
    // Same lastFired — manager should not re-count.
    mgr.update(2, [t]);
    mgr.update(3, [t]);
    expect(t._stress).toBe(1);
  });

  it('respects pylon Chebyshev radius edges', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 2 }]);
    const inside = makeTower(7, 7);   // exactly on the edge: |7-5| = 2
    const outside = makeTower(8, 5);  // one beyond: |8-5| = 3
    fire(mgr, inside, 1);
    fire(mgr, outside, 1);
    expect(inside._stress).toBe(1);
    expect(outside._stress).toBe(0);
  });

  it('mute suppresses stress accumulation for the window', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const t = makeTower(5, 5);
    expect(mgr.mutePylonAt(5, 5, 1000, 5_000)).toBe(true);
    fire(mgr, t, 2000);
    fire(mgr, t, 3000);
    expect(t._stress).toBe(0);
    // After the mute window expires, stress accumulates again.
    fire(mgr, t, 7_000);
    expect(t._stress).toBe(1);
  });

  it('remute extends the mute window when the new end-time is later', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.mutePylonAt(5, 5, 1000, 5_000)).toBe(true); // mute until 6000
    expect(mgr.mutePylonAt(5, 5, 2000, 8_000)).toBe(true); // mute until 10000 — extends
    const t = makeTower(5, 5);
    fire(mgr, t, 9_500);
    expect(t._stress).toBe(0);
    fire(mgr, t, 10_500);
    expect(t._stress).toBe(1);
  });

  it('remute is a no-op when the new end-time is earlier', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.mutePylonAt(5, 5, 1000, 10_000)).toBe(true);  // mute until 11000
    expect(mgr.mutePylonAt(5, 5, 1000, 2_000)).toBe(true);   // would mute until 3000 — ignored
    const t = makeTower(5, 5);
    fire(mgr, t, 5_000);
    expect(t._stress).toBe(0); // longer mute still active
  });

  it('mute returns false when no pylon at the cell', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.mutePylonAt(0, 0, 0)).toBe(false);
  });

  it('startChannelAt then update past channel duration mutes the pylon', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.startChannelAt(5, 5, 1000)).toBe('started');
    const t = makeTower(5, 5);
    // Mid-channel — pylon is still active, towers still suppressed.
    fire(mgr, t, 2000);
    expect(t._stress).toBe(1);
    // After channel duration (2.5s default), update applies mute.
    mgr.update(1000 + mgr.getChannelDurationMs() + 1, []);
    fire(mgr, t, 5000);
    expect(t._stress).toBe(1); // mute prevented further accumulation
  });

  it('startChannelAt returns specific failure modes', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.startChannelAt(0, 0, 0)).toBe('no_pylon');
    mgr.mutePylonAt(5, 5, 0, 10_000);
    expect(mgr.startChannelAt(5, 5, 100)).toBe('already_muted');
  });

  it('startChannelAt rejects when a channel is already in progress', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.startChannelAt(5, 5, 0)).toBe('started');
    expect(mgr.startChannelAt(5, 5, 100)).toBe('already_channeling');
  });

  it('cancelChannelAt clears an in-progress channel', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    mgr.startChannelAt(5, 5, 0);
    expect(mgr.cancelChannelAt(5, 5)).toBe(true);
    // Cancelling should NOT auto-mute when update fires later.
    mgr.update(10_000, []);
    const t = makeTower(5, 5);
    fire(mgr, t, 11_000);
    expect(t._stress).toBe(1);
  });

  it('skips CPU-team towers (ownerIndex !== 0/undefined)', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const cpu = makeTower(5, 5, { ownerIndex: 99 });
    for (let i = 0; i < 10; i++) fire(mgr, cpu, i + 1);
    expect(cpu._stress).toBe(0);
  });

  it('skips expired towers', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    const t = makeTower(5, 5, { _expired: true });
    fire(mgr, t, 1);
    expect(t._stress).toBe(0);
  });

  it('multiple pylons covering the same tower count once per fire', () => {
    const mgr = new SuppressionManager([
      { col: 5, row: 5, radius: 3 },
      { col: 6, row: 6, radius: 3 },
    ]);
    const t = makeTower(5, 5);
    fire(mgr, t, 1);
    fire(mgr, t, 2);
    expect(t._stress).toBe(2); // not 4 — fire-once-per-tick semantics
  });

  it('pylonAt returns the right pylon', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }, { col: 10, row: 10 }]);
    expect(mgr.pylonAt(5, 5)?.col).toBe(5);
    expect(mgr.pylonAt(10, 10)?.row).toBe(10);
    expect(mgr.pylonAt(0, 0)).toBeNull();
  });

  // ─── Siphon stacks (Mana Drain auto-channel) ────────────────

  it('applyStacks accumulates below threshold without muting', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    const pylon = mgr.pylons[0];
    expect(mgr.applyStacks(pylon, 1, 0)).toBe(false);
    expect(mgr.applyStacks(pylon, 1, 100)).toBe(false);
    expect(pylon.siphonStacks).toBe(2);
    expect(pylon.isActive(200)).toBe(true);
  });

  it('applyStacks at threshold mutes the pylon and resets stacks', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    const pylon = mgr.pylons[0];
    const triggered = mgr.applyStacks(pylon, SIPHON_STACK_THRESHOLD, 1000);
    expect(triggered).toBe(true);
    expect(pylon.siphonStacks).toBe(0);
    expect(pylon.isActive(2000)).toBe(false);
  });

  it('applyStacks clamps at threshold (extra stacks do not bank)', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    const pylon = mgr.pylons[0];
    mgr.applyStacks(pylon, 100, 1000);
    expect(pylon.siphonStacks).toBe(0); // muted + reset
    // After mute expires, stacks start fresh at 0, NOT at the overflow.
    mgr.update(1000 + 16_000, []);
    expect(pylon.siphonStacks).toBe(0);
  });

  it('applyStacks on a muted pylon is a no-op (no stacking during mute)', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    const pylon = mgr.pylons[0];
    mgr.mutePylonAt(5, 5, 1000, 10_000);
    expect(mgr.applyStacks(pylon, 1, 2000)).toBe(false);
    expect(pylon.siphonStacks).toBe(0);
  });

  it('manual channel completion mutes via applyStacks (stacks reset, mute applied)', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
    expect(mgr.startChannelAt(5, 5, 1000)).toBe('started');
    // Tick past channel duration so _resolveChannels fires.
    mgr.update(1000 + mgr.getChannelDurationMs() + 1, []);
    const pylon = mgr.pylons[0];
    expect(pylon.siphonStacks).toBe(0);
    expect(pylon.isActive(1000 + mgr.getChannelDurationMs() + 2)).toBe(false);
  });

  // ─── Pylon-cell invariant (grid auto-stamp + warning) ───────

  describe('pylon-cell invariant', () => {
    it('auto-converts Empty pylon cells to NoBuild', () => {
      const grid = makeGrid();
      new SuppressionManager([{ col: 5, row: 5 }], grid);
      expect(grid.cells[5][5]).toBe(CellType.NoBuild);
    });

    it('leaves already-NoBuild cells untouched (idempotent)', () => {
      const grid = makeGrid();
      grid.cells[5][5] = CellType.NoBuild;
      new SuppressionManager([{ col: 5, row: 5 }], grid);
      expect(grid.cells[5][5]).toBe(CellType.NoBuild);
    });

    it('warns when a pylon sits on Entry/Exit/Blocked/Tower', () => {
      const grid = makeGrid();
      grid.cells[2][2] = CellType.Entry;
      grid.cells[3][3] = CellType.Exit;
      grid.cells[4][4] = CellType.Blocked;
      grid.cells[6][6] = CellType.Tower;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new SuppressionManager(
        [
          { col: 2, row: 2 },
          { col: 3, row: 3 },
          { col: 4, row: 4 },
          { col: 6, row: 6 },
        ],
        grid,
      );
      expect(warn).toHaveBeenCalledTimes(4);
      // Invariant violations are warnings, not mutations — cell types
      // stay as the designer placed them so the bug is visible in-game.
      expect(grid.cells[2][2]).toBe(CellType.Entry);
      expect(grid.cells[3][3]).toBe(CellType.Exit);
      expect(grid.cells[4][4]).toBe(CellType.Blocked);
      expect(grid.cells[6][6]).toBe(CellType.Tower);
      warn.mockRestore();
    });

    it('silently skips pylons placed out of grid bounds (no warn, no crash)', () => {
      const grid = makeGrid(10, 10);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // row out-of-range, then col out-of-range, then both.
      expect(() => new SuppressionManager(
        [
          { col: 5, row: 99 },
          { col: 99, row: 5 },
          { col: 99, row: 99 },
        ],
        grid,
      )).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('no-arg construction (no grid) skips the invariant entirely', () => {
      // Headless construction without a grid — manager still works for
      // suppression-logic tests that don't care about the invariant.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mgr = new SuppressionManager([{ col: 5, row: 5 }]);
      expect(mgr.pylons).toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  it('getActivePylonsInRangeOf includes only in-range active pylons', () => {
    // Two pylons at very different positions.
    const mgr = new SuppressionManager([
      { col: 5, row: 5 },     // close to the test point
      { col: 30, row: 20 },   // far away
    ]);
    // Use the same gridX/gridY the manager uses, so the comparison is
    // offset-correct under any grid setup.
    const x = gridX(5);
    const y = gridY(5);
    const inRange = mgr.getActivePylonsInRangeOf(x, y, TILE_SIZE * 4, 0);
    expect(inRange.length).toBe(1);
    expect(inRange[0].col).toBe(5);
    // Mute the close one — should drop out of the returned set.
    mgr.mutePylonAt(5, 5, 0, 10_000);
    expect(mgr.getActivePylonsInRangeOf(x, y, TILE_SIZE * 4, 100).length).toBe(0);
  });
});
