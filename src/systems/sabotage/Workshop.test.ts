import { describe, expect, it, vi } from 'vitest';
import { Workshop, type GoldSpender } from './Workshop';
import { statsForLevels, MAX_TIER } from './WorkshopUpgrades';

/** Stub spender — debits from a mutable balance, mirroring
 *  EconomyManager.spend's signature. */
function makeEconomy(initial: number): GoldSpender & { balance: () => number } {
  let bal = initial;
  return {
    spend(cost: number) {
      if (bal < cost) return false;
      bal -= cost;
      return true;
    },
    balance: () => bal,
  };
}

describe('Workshop', () => {
  it('trains a raider when cooldown is elapsed and gold is sufficient', () => {
    const economy = makeEconomy(1000);
    const w = new Workshop({ col: 0, row: 0, economy });
    const onTrain = vi.fn();
    expect(w.tryTrain(0, onTrain)).toBe(true);
    expect(economy.balance()).toBe(850);
    expect(onTrain).toHaveBeenCalledOnce();
  });

  it('rejects training during cooldown', () => {
    const economy = makeEconomy(1000);
    const w = new Workshop({ col: 0, row: 0, economy, trainCooldownMs: 5000 });
    const onTrain = vi.fn();
    expect(w.tryTrain(0, onTrain)).toBe(true);
    expect(w.tryTrain(2000, onTrain)).toBe(false);
    expect(w.tryTrain(5000, onTrain)).toBe(true);
    expect(onTrain).toHaveBeenCalledTimes(2);
  });

  it('rejects training when gold is insufficient (no cooldown commit)', () => {
    const economy = makeEconomy(50);
    const w = new Workshop({ col: 0, row: 0, economy });
    const onTrain = vi.fn();
    expect(w.tryTrain(0, onTrain)).toBe(false);
    // Cooldown was NOT committed — a richer player could train at t=1.
    const economy2 = makeEconomy(1000);
    const w2 = new Workshop({ col: 0, row: 0, economy: economy2 });
    expect(w2.tryTrain(1, onTrain)).toBe(true);
  });

  it('cooldownRemaining decays linearly and zeroes at the deadline', () => {
    const economy = makeEconomy(1000);
    const w = new Workshop({ col: 0, row: 0, economy, trainCooldownMs: 5000 });
    w.tryTrain(0, () => {});
    expect(w.cooldownRemaining(1000)).toBe(4000);
    expect(w.cooldownRemaining(5000)).toBe(0);
    expect(w.cooldownRemaining(99_999)).toBe(0);
  });

  it('trains stamp current upgrade levels onto the spawned stats', () => {
    const economy = makeEconomy(99_999);
    const w = new Workshop({ col: 0, row: 0, economy });
    let stamped: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(0, (s) => { stamped = s; });
    expect(stamped).toEqual(statsForLevels({ plate: 0, edge: 0, tread: 0 }));

    w.tryUpgrade('plate');
    w.tryUpgrade('edge');
    let stamped2: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(99_999, (s) => { stamped2 = s; });
    expect(stamped2).toEqual(statsForLevels({ plate: 1, edge: 1, tread: 0 }));
    // Already-stamped raider was NOT retroactively upgraded.
    expect(stamped).toEqual(statsForLevels({ plate: 0, edge: 0, tread: 0 }));
  });

  it('upgrade buys ascending tiers and stops at MAX_TIER', () => {
    const economy = makeEconomy(99_999);
    const w = new Workshop({ col: 0, row: 0, economy });
    for (let i = 0; i < MAX_TIER; i++) {
      expect(w.tryUpgrade('plate')).toBe(true);
    }
    expect(w.getLevels().plate).toBe(MAX_TIER);
    // Past max → no further buys.
    expect(w.tryUpgrade('plate')).toBe(false);
    expect(w.nextUpgradeCost('plate')).toBeNull();
  });

  it('upgrade rejects when broke (no level commit)', () => {
    const economy = makeEconomy(0);
    const w = new Workshop({ col: 0, row: 0, economy });
    expect(w.tryUpgrade('plate')).toBe(false);
    expect(w.getLevels().plate).toBe(0);
  });

  it('previewRaiderStats matches the next-train output', () => {
    const economy = makeEconomy(99_999);
    const w = new Workshop({ col: 0, row: 0, economy });
    w.tryUpgrade('tread');
    const preview = w.previewRaiderStats();
    let stamped: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(0, (s) => { stamped = s; });
    expect(stamped).toEqual(preview);
  });
});
