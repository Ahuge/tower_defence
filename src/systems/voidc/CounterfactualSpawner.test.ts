/**
 * Tests for CounterfactualSpawner — the M2 silhouette / M4 mirror
 * tower / M7 Mirror Walker beat dispatcher + state machines.
 */
import { describe, it, expect } from 'vitest';
import {
  CounterfactualSpawner,
  getCounterfactualBeat,
  SILHOUETTE_BEAT,
  MIRROR_TOWER_BEAT,
  MIRROR_WALKER_BEAT,
} from './CounterfactualSpawner';

describe('getCounterfactualBeat', () => {
  it('M2 (idx 1) → silhouette', () => {
    expect(getCounterfactualBeat(1)).toBe('silhouette');
  });
  it('M4 (idx 3) → mirror_tower', () => {
    expect(getCounterfactualBeat(3)).toBe('mirror_tower');
  });
  it('M7 (idx 6) → mirror_walker', () => {
    expect(getCounterfactualBeat(6)).toBe('mirror_walker');
  });
  it('non-beat missions → none', () => {
    for (const idx of [0, 2, 4, 5, 7, 8, 9]) {
      expect(getCounterfactualBeat(idx)).toBe('none');
    }
  });
});

describe('CounterfactualSpawner — M2 silhouette', () => {
  it('reports beat = silhouette', () => {
    expect(new CounterfactualSpawner(1).getBeat()).toBe('silhouette');
  });

  it('silhouette is not visible before markSilhouetteShown', () => {
    const s = new CounterfactualSpawner(1);
    expect(s.isSilhouetteVisible(0)).toBe(false);
  });

  it('visible immediately after markSilhouetteShown', () => {
    const s = new CounterfactualSpawner(1);
    s.markSilhouetteShown(0);
    expect(s.isSilhouetteVisible(0)).toBe(true);
    expect(s.isSilhouetteVisible(SILHOUETTE_BEAT.visibleMs - 1)).toBe(true);
  });

  it('not visible past the visibleMs window', () => {
    const s = new CounterfactualSpawner(1);
    s.markSilhouetteShown(0);
    expect(s.isSilhouetteVisible(SILHOUETTE_BEAT.visibleMs)).toBe(false);
    expect(s.isSilhouetteVisible(SILHOUETTE_BEAT.visibleMs + 1000)).toBe(false);
  });

  it('subsequent markSilhouetteShown calls are ignored (single-shot)', () => {
    const s = new CounterfactualSpawner(1);
    s.markSilhouetteShown(0);
    s.markSilhouetteShown(10_000); // would have re-triggered if not idempotent
    expect(s.isSilhouetteVisible(SILHOUETTE_BEAT.visibleMs + 100)).toBe(false);
  });

  it('getSilhouetteCell returns the configured cell on M2', () => {
    expect(new CounterfactualSpawner(1).getSilhouetteCell()).toEqual({ ...SILHOUETTE_BEAT.cell });
  });

  it('getSilhouetteCell returns null on non-silhouette missions', () => {
    expect(new CounterfactualSpawner(0).getSilhouetteCell()).toBeNull();
    expect(new CounterfactualSpawner(3).getSilhouetteCell()).toBeNull();
  });
});

describe('CounterfactualSpawner — M4 mirror tower', () => {
  it('reports beat = mirror_tower', () => {
    expect(new CounterfactualSpawner(3).getBeat()).toBe('mirror_tower');
  });

  it('player placement spawns a mirror at the offset', () => {
    const s = new CounterfactualSpawner(3);
    const mirror = s.recordPlayerTowerPlacement({ col: 10, row: 5, towerTypeId: 'void_gambler' });
    expect(mirror).not.toBeNull();
    expect(mirror!.col).toBe(10 + MIRROR_TOWER_BEAT.offset.col);
    expect(mirror!.row).toBe(5 + MIRROR_TOWER_BEAT.offset.row);
    expect(mirror!.towerTypeId).toBe('void_gambler');
    expect(mirror!.sold).toBe(false);
  });

  it('mirror ids are unique + monotonic per mission', () => {
    const s = new CounterfactualSpawner(3);
    const a = s.recordPlayerTowerPlacement({ col: 1, row: 1, towerTypeId: 'void_spike' });
    const b = s.recordPlayerTowerPlacement({ col: 2, row: 2, towerTypeId: 'void_siphon' });
    expect(a!.id).not.toBe(b!.id);
    expect(b!.id).toBeGreaterThan(a!.id);
  });

  it('getLiveMirrors excludes sold mirrors', () => {
    const s = new CounterfactualSpawner(3);
    const a = s.recordPlayerTowerPlacement({ col: 1, row: 1, towerTypeId: 'void_spike' });
    s.recordPlayerTowerPlacement({ col: 2, row: 2, towerTypeId: 'void_siphon' });
    s.recordMirrorTowerSold(a!.id);
    expect(s.getLiveMirrors().length).toBe(1);
  });

  it('selling a mirror returns the Debt reward (-10g) and flags Divergence-reset', () => {
    const s = new CounterfactualSpawner(3);
    const m = s.recordPlayerTowerPlacement({ col: 5, row: 5, towerTypeId: 'void_gambler' });
    expect(s.anyMirrorSoldThisMission()).toBe(false);
    const reward = s.recordMirrorTowerSold(m!.id);
    expect(reward).toBe(MIRROR_TOWER_BEAT.sellDebtReward); // -10
    expect(s.anyMirrorSoldThisMission()).toBe(true);
  });

  it('selling a non-existent mirror is a 0g no-op', () => {
    const s = new CounterfactualSpawner(3);
    expect(s.recordMirrorTowerSold(9999)).toBe(0);
    expect(s.anyMirrorSoldThisMission()).toBe(false);
  });

  it('selling the same mirror twice only counts once', () => {
    const s = new CounterfactualSpawner(3);
    const m = s.recordPlayerTowerPlacement({ col: 5, row: 5, towerTypeId: 'void_spike' });
    s.recordMirrorTowerSold(m!.id);
    expect(s.recordMirrorTowerSold(m!.id)).toBe(0);
  });

  it('non-mirror-tower missions: recordPlayerTowerPlacement returns null', () => {
    expect(new CounterfactualSpawner(1).recordPlayerTowerPlacement({
      col: 1, row: 1, towerTypeId: 'void_gambler',
    })).toBeNull();
    expect(new CounterfactualSpawner(0).recordPlayerTowerPlacement({
      col: 1, row: 1, towerTypeId: 'void_gambler',
    })).toBeNull();
  });
});

describe('CounterfactualSpawner — M7 Mirror Walker copy', () => {
  it('reports beat = mirror_walker', () => {
    expect(new CounterfactualSpawner(6).getBeat()).toBe('mirror_walker');
  });

  it('rollMirrorWalkerCopy is null before any player placement', () => {
    const s = new CounterfactualSpawner(6, { rng: () => 0 });
    expect(s.rollMirrorWalkerCopy()).toBeNull();
  });

  it('after placement, low RNG triggers copy returning the placement', () => {
    const s = new CounterfactualSpawner(6, { rng: () => 0.05 }); // < 0.15
    s.recordPlayerTowerPlacement({ col: 7, row: 7, towerTypeId: 'void_spike' });
    const copy = s.rollMirrorWalkerCopy();
    expect(copy).toEqual({ col: 7, row: 7, towerTypeId: 'void_spike' });
  });

  it('after placement, high RNG returns null (no copy this spawn)', () => {
    const s = new CounterfactualSpawner(6, { rng: () => 0.99 }); // > 0.15
    s.recordPlayerTowerPlacement({ col: 5, row: 5, towerTypeId: 'void_gambler' });
    expect(s.rollMirrorWalkerCopy()).toBeNull();
  });

  it('uses the LAST placement, not the first', () => {
    const s = new CounterfactualSpawner(6, { rng: () => 0.01 });
    s.recordPlayerTowerPlacement({ col: 1, row: 1, towerTypeId: 'void_gambler' });
    s.recordPlayerTowerPlacement({ col: 5, row: 5, towerTypeId: 'void_oblivion' });
    const copy = s.rollMirrorWalkerCopy();
    expect(copy).toEqual({ col: 5, row: 5, towerTypeId: 'void_oblivion' });
  });

  it('non-walker missions never roll copy regardless of RNG', () => {
    const s = new CounterfactualSpawner(0, { rng: () => 0 });
    s.recordPlayerTowerPlacement({ col: 5, row: 5, towerTypeId: 'void_gambler' });
    expect(s.rollMirrorWalkerCopy()).toBeNull();
  });

  it('M7 copy chance matches the configured 15%', () => {
    expect(MIRROR_WALKER_BEAT.copyChance).toBe(0.15);
  });

  it('M7 kill-gold mult is 2× (per plan doc)', () => {
    expect(MIRROR_WALKER_BEAT.killGoldMult).toBe(2);
  });
});
