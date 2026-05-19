/**
 * Tests for PlacementGateController — the ghost-tower state machine
 * that gates placement behind a tick/X confirmation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PlacementGateController } from './PlacementGateController';

describe('PlacementGateController — fresh state', () => {
  let c: PlacementGateController;
  beforeEach(() => { c = new PlacementGateController(); });

  it('no ghost on construct', () => {
    expect(c.getGhost()).toBeNull();
    expect(c.isPending()).toBe(false);
  });

  it('not dragging on construct', () => {
    expect(c.isDragging()).toBe(false);
  });

  it('consumeForCommit returns null when nothing pending', () => {
    expect(c.consumeForCommit()).toBeNull();
  });

  it('cancel is a no-op when nothing pending', () => {
    expect(() => c.cancel()).not.toThrow();
    expect(c.isPending()).toBe(false);
  });

  it('moveGhost returns false (state unchanged) when nothing pending', () => {
    expect(c.moveGhost(5, 5)).toBe(false);
    expect(c.isPending()).toBe(false);
  });

  it('startDrag is a no-op when nothing pending', () => {
    c.startDrag();
    expect(c.isDragging()).toBe(false);
  });
});

describe('PlacementGateController — placeGhost', () => {
  let c: PlacementGateController;
  beforeEach(() => { c = new PlacementGateController(); });

  it('stages a pending placement', () => {
    c.placeGhost(10, 5, 'arcane_bolt');
    expect(c.getGhost()).toEqual({ col: 10, row: 5, towerTypeId: 'arcane_bolt' });
    expect(c.isPending()).toBe(true);
  });

  it('replaces a prior ghost (re-tap with same type)', () => {
    c.placeGhost(10, 5, 'arcane_bolt');
    c.placeGhost(12, 8, 'arcane_bolt');
    expect(c.getGhost()).toEqual({ col: 12, row: 8, towerTypeId: 'arcane_bolt' });
  });

  it('replaces a prior ghost when the player picks a different tower', () => {
    c.placeGhost(10, 5, 'arcane_bolt');
    c.placeGhost(10, 5, 'arcane_frost');
    expect(c.getGhost()?.towerTypeId).toBe('arcane_frost');
  });

  it('re-staging clears any in-flight drag', () => {
    c.placeGhost(10, 5, 'arcane_bolt');
    c.startDrag();
    expect(c.isDragging()).toBe(true);
    c.placeGhost(11, 6, 'arcane_bolt');
    expect(c.isDragging()).toBe(false);
  });
});

describe('PlacementGateController — moveGhost (drag/re-tap reposition)', () => {
  let c: PlacementGateController;
  beforeEach(() => {
    c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
  });

  it('updates the ghost cell + reports state changed', () => {
    expect(c.moveGhost(12, 7)).toBe(true);
    expect(c.getGhost()).toEqual({ col: 12, row: 7, towerTypeId: 'arcane_bolt' });
  });

  it('preserves the tower type across moves', () => {
    c.moveGhost(12, 7);
    expect(c.getGhost()?.towerTypeId).toBe('arcane_bolt');
  });

  it('same-cell move is a no-op (no state change)', () => {
    expect(c.moveGhost(10, 5)).toBe(false);
    expect(c.getGhost()).toEqual({ col: 10, row: 5, towerTypeId: 'arcane_bolt' });
  });

  it('chained moves track the latest position', () => {
    c.moveGhost(11, 5);
    c.moveGhost(12, 5);
    c.moveGhost(13, 5);
    expect(c.getGhost()).toEqual({ col: 13, row: 5, towerTypeId: 'arcane_bolt' });
  });
});

describe('PlacementGateController — drag state', () => {
  let c: PlacementGateController;
  beforeEach(() => {
    c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
  });

  it('startDrag flips the flag', () => {
    c.startDrag();
    expect(c.isDragging()).toBe(true);
  });

  it('endDrag flips it back', () => {
    c.startDrag();
    c.endDrag();
    expect(c.isDragging()).toBe(false);
  });

  it('endDrag is a no-op when not dragging', () => {
    c.endDrag();
    expect(c.isDragging()).toBe(false);
  });

  it('moves during drag still update the ghost', () => {
    c.startDrag();
    c.moveGhost(15, 5);
    expect(c.getGhost()?.col).toBe(15);
    expect(c.isDragging()).toBe(true);
  });
});

describe('PlacementGateController — consumeForCommit', () => {
  let c: PlacementGateController;
  beforeEach(() => {
    c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
  });

  it('returns the pending placement and clears state', () => {
    const spec = c.consumeForCommit();
    expect(spec).toEqual({ col: 10, row: 5, towerTypeId: 'arcane_bolt' });
    expect(c.isPending()).toBe(false);
    expect(c.getGhost()).toBeNull();
  });

  it('reflects the latest move (drag-then-commit)', () => {
    c.moveGhost(13, 8);
    const spec = c.consumeForCommit();
    expect(spec).toEqual({ col: 13, row: 8, towerTypeId: 'arcane_bolt' });
  });

  it('clears drag flag on consume', () => {
    c.startDrag();
    c.consumeForCommit();
    expect(c.isDragging()).toBe(false);
  });

  it('second consume returns null (only one commit per ghost)', () => {
    c.consumeForCommit();
    expect(c.consumeForCommit()).toBeNull();
  });
});

describe('PlacementGateController — cancel', () => {
  let c: PlacementGateController;
  beforeEach(() => {
    c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
  });

  it('clears the pending ghost', () => {
    c.cancel();
    expect(c.isPending()).toBe(false);
    expect(c.getGhost()).toBeNull();
  });

  it('clears the drag flag', () => {
    c.startDrag();
    c.cancel();
    expect(c.isDragging()).toBe(false);
  });

  it('cancel + placeGhost = fresh ghost', () => {
    c.cancel();
    c.placeGhost(20, 20, 'arcane_frost');
    expect(c.getGhost()).toEqual({ col: 20, row: 20, towerTypeId: 'arcane_frost' });
  });
});

describe('PlacementGateController — end-to-end lifecycle', () => {
  it('tap → drag → move → commit', () => {
    const c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
    c.startDrag();
    c.moveGhost(11, 5);
    c.moveGhost(12, 5);
    c.endDrag();
    const spec = c.consumeForCommit();
    expect(spec).toEqual({ col: 12, row: 5, towerTypeId: 'arcane_bolt' });
  });

  it('tap → cancel → tap (different cell) → commit', () => {
    const c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
    c.cancel();
    c.placeGhost(20, 10, 'arcane_bolt');
    const spec = c.consumeForCommit();
    expect(spec).toEqual({ col: 20, row: 10, towerTypeId: 'arcane_bolt' });
  });

  it('tap → re-tap same type elsewhere (no cancel needed) → commit', () => {
    const c = new PlacementGateController();
    c.placeGhost(10, 5, 'arcane_bolt');
    c.placeGhost(20, 10, 'arcane_bolt'); // re-tap replaces
    const spec = c.consumeForCommit();
    expect(spec).toEqual({ col: 20, row: 10, towerTypeId: 'arcane_bolt' });
  });
});
