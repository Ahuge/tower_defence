import { describe, expect, it, vi } from 'vitest';
import { Workshop } from './Workshop';
import { statsForLevels, MAX_TIER } from './WorkshopUpgrades';

/** Debit factory — returns a function that takes from a mutable wallet
 *  and reports the running total + history. */
function makeWallet(initial: number) {
  let bal = initial;
  return {
    debit: (amount: number) => {
      if (bal < amount) return false;
      bal -= amount;
      return true;
    },
    balance: () => bal,
  };
}

describe('Workshop', () => {
  it('trains a raider when cooldown is elapsed and gold is sufficient', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(1000);
    const onTrain = vi.fn();
    expect(w.tryTrain(0, wallet.debit, onTrain)).toBe(true);
    expect(wallet.balance()).toBe(850);
    expect(onTrain).toHaveBeenCalledOnce();
  });

  it('rejects training during cooldown', () => {
    const w = new Workshop({ col: 0, row: 0, trainCooldownMs: 5000 });
    const wallet = makeWallet(1000);
    const onTrain = vi.fn();
    expect(w.tryTrain(0, wallet.debit, onTrain)).toBe(true);
    expect(w.tryTrain(2000, wallet.debit, onTrain)).toBe(false);
    expect(w.tryTrain(5000, wallet.debit, onTrain)).toBe(true);
    expect(onTrain).toHaveBeenCalledTimes(2);
  });

  it('rejects training when gold is insufficient (no cooldown commit)', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(50);
    const onTrain = vi.fn();
    expect(w.tryTrain(0, wallet.debit, onTrain)).toBe(false);
    // Cooldown was NOT committed — a richer player could train at t=1.
    const wallet2 = makeWallet(1000);
    expect(w.tryTrain(1, wallet2.debit, onTrain)).toBe(true);
  });

  it('cooldownRemaining decays linearly and zeroes at the deadline', () => {
    const w = new Workshop({ col: 0, row: 0, trainCooldownMs: 5000 });
    const wallet = makeWallet(1000);
    w.tryTrain(0, wallet.debit, () => {});
    expect(w.cooldownRemaining(1000)).toBe(4000);
    expect(w.cooldownRemaining(5000)).toBe(0);
    expect(w.cooldownRemaining(99_999)).toBe(0);
  });

  it('trains stamp current upgrade levels onto the spawned stats', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(99_999);
    let stamped: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(0, wallet.debit, (s) => { stamped = s; });
    expect(stamped).toEqual(statsForLevels({ plate: 0, edge: 0, tread: 0 }));

    w.tryUpgrade('plate', wallet.debit);
    w.tryUpgrade('edge', wallet.debit);
    let stamped2: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(99_999, wallet.debit, (s) => { stamped2 = s; });
    expect(stamped2).toEqual(statsForLevels({ plate: 1, edge: 1, tread: 0 }));
    // Already-stamped raider was NOT retroactively upgraded.
    expect(stamped).toEqual(statsForLevels({ plate: 0, edge: 0, tread: 0 }));
  });

  it('upgrade buys ascending tiers and stops at MAX_TIER', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(99_999);
    for (let i = 0; i < MAX_TIER; i++) {
      expect(w.tryUpgrade('plate', wallet.debit)).toBe(true);
    }
    expect(w.getLevels().plate).toBe(MAX_TIER);
    // Past max → no further buys.
    expect(w.tryUpgrade('plate', wallet.debit)).toBe(false);
    expect(w.nextUpgradeCost('plate')).toBeNull();
  });

  it('upgrade rejects when broke (no level commit)', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(0);
    expect(w.tryUpgrade('plate', wallet.debit)).toBe(false);
    expect(w.getLevels().plate).toBe(0);
  });

  it('previewRaiderStats matches the next-train output', () => {
    const w = new Workshop({ col: 0, row: 0 });
    const wallet = makeWallet(99_999);
    w.tryUpgrade('tread', wallet.debit);
    const preview = w.previewRaiderStats();
    let stamped: ReturnType<typeof statsForLevels> | null = null;
    w.tryTrain(0, wallet.debit, (s) => { stamped = s; });
    expect(stamped).toEqual(preview);
  });
});
