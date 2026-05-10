import { describe, expect, it } from 'vitest';
import { SuppressionManager, type SuppressibleTower } from './SuppressionManager';

function makeTower(col: number, row: number, opts: Partial<SuppressibleTower> = {}): SuppressibleTower {
  return {
    col, row,
    lastFired: 0,
    _stress: 0,
    _disabledRemaining: 0,
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
});
