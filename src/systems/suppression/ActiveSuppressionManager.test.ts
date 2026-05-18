/**
 * Tests for the ActiveSuppressionManager singleton + the
 * mech_pylon_vent_armor creep-damage trait.
 *
 * The singleton bridges scene state into the trait pipeline (which
 * doesn't receive scene context). The trait reads it on every
 * creep-damage event and applies a multiplier when any pylon is
 * channel-muted.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setActiveSuppressionManager,
  getActiveSuppressionManager,
  isAnyPylonMutedNow,
  _resetActiveSuppressionManagerForTest,
} from './ActiveSuppressionManager';
import { SuppressionManager } from './SuppressionManager';
import { resolveCreepDamage } from '../traits/Trait';
import type { Trait } from '../traits/Trait';
import '../traits/CreepTraitHandlers'; // side-effect: registers handlers

beforeEach(() => {
  _resetActiveSuppressionManagerForTest();
});

describe('ActiveSuppressionManager singleton', () => {
  it('returns null when no manager has been registered', () => {
    expect(getActiveSuppressionManager()).toBeNull();
    expect(isAnyPylonMutedNow()).toBe(false);
  });

  it('round-trips set + get', () => {
    const mgr = new SuppressionManager([]);
    setActiveSuppressionManager(mgr);
    expect(getActiveSuppressionManager()).toBe(mgr);
  });

  it('isAnyPylonMutedNow defers to the active manager', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    setActiveSuppressionManager(mgr);
    // Pylon starts active (mutedUntil=0). After an update with now=100,
    // _lastUpdateNow=100 and pylon.isActive(100) === true (not muted).
    mgr.update(100, []);
    expect(isAnyPylonMutedNow()).toBe(false);
    // Mute it for 5000ms starting now=100; pylon becomes inactive
    // (muted) until now=5100. Re-running update advances _lastUpdateNow.
    mgr.pylons[0].mute(100, 5000);
    mgr.update(200, []);
    expect(isAnyPylonMutedNow()).toBe(true);
    // After the mute window expires.
    mgr.update(6000, []);
    expect(isAnyPylonMutedNow()).toBe(false);
  });

  it('setting null disconnects the singleton (scene shutdown)', () => {
    setActiveSuppressionManager(new SuppressionManager([]));
    setActiveSuppressionManager(null);
    expect(getActiveSuppressionManager()).toBeNull();
    expect(isAnyPylonMutedNow()).toBe(false);
  });
});

describe('mech_pylon_vent_armor trait — damage handler', () => {
  it('returns input damage unchanged when no manager is registered', () => {
    const trait: Trait = { id: 'mech_pylon_vent_armor', bonusDamageMult: 1.6 };
    const out = resolveCreepDamage([trait], 100);
    expect(out).toBe(100);
  });

  it('returns input damage unchanged when no pylons are muted', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    setActiveSuppressionManager(mgr);
    mgr.update(100, []);
    const trait: Trait = { id: 'mech_pylon_vent_armor', bonusDamageMult: 1.6 };
    expect(resolveCreepDamage([trait], 100)).toBe(100);
  });

  it('multiplies damage when at least one pylon is muted', () => {
    const mgr = new SuppressionManager([
      { col: 5, row: 5, radius: 3 },
      { col: 10, row: 5, radius: 3 },
    ]);
    setActiveSuppressionManager(mgr);
    mgr.pylons[0].mute(100, 5000); // pylon 0 muted
    mgr.update(200, []);             // advance _lastUpdateNow

    const trait: Trait = { id: 'mech_pylon_vent_armor', bonusDamageMult: 1.6 };
    expect(resolveCreepDamage([trait], 100)).toBe(160);
  });

  it('uses default bonusDamageMult (1.6) when not specified on the trait', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    setActiveSuppressionManager(mgr);
    mgr.pylons[0].mute(100, 5000);
    mgr.update(200, []);

    const trait: Trait = { id: 'mech_pylon_vent_armor' };
    expect(resolveCreepDamage([trait], 100)).toBe(160);
  });

  it('respects a custom bonusDamageMult', () => {
    const mgr = new SuppressionManager([{ col: 5, row: 5, radius: 3 }]);
    setActiveSuppressionManager(mgr);
    mgr.pylons[0].mute(100, 5000);
    mgr.update(200, []);

    const trait: Trait = { id: 'mech_pylon_vent_armor', bonusDamageMult: 2.0 };
    expect(resolveCreepDamage([trait], 50)).toBe(100);
  });
});
