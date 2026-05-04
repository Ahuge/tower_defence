import { describe, it, expect } from 'vitest';
import { AttackerComposer } from './AttackerComposer';
import type { AttackerPalette } from '../../data/AttackerPalettes';
import type { AttackerAbilityDef } from '../../data/AttackerAbilityDefs';

const PALETTE: AttackerPalette = {
  factionId: 'coalition',
  entries: [
    { creepType: 'standard', label: 'Raider',     cost: 5,  description: '' },
    { creepType: 'fast',     label: 'Skirmisher', cost: 4,  description: '' },
    { creepType: 'boss',     label: 'Ram',        cost: 60, description: '' },
  ],
};

const ABILITIES: AttackerAbilityDef[] = [
  { id: 'a', label: 'A', description: '', effectId: 'a', cooldown: 3 },
  { id: 'b', label: 'B', description: '', effectId: 'b', cooldown: 2 },
];

describe('AttackerComposer picks + budget', () => {
  it('respects budget when adding picks', () => {
    const c = new AttackerComposer(PALETTE, 20);
    expect(c.adjust('standard', 4)).toBe(true);  // 20e
    expect(c.adjust('standard', 1)).toBe(false); // overflows
    expect(c.lockedPicks().length).toBe(1);
    expect(c.lockedPicks()[0].count).toBe(4);
  });

  it('refuses negative count', () => {
    const c = new AttackerComposer(PALETTE, 100);
    expect(c.adjust('standard', -1)).toBe(false);
  });

  it('clear() resets picks but preserves budget', () => {
    const c = new AttackerComposer(PALETTE, 100);
    c.adjust('standard', 5);
    c.clear();
    expect(c.lockedPicks().length).toBe(0);
    expect(c.getState().remainingEssence).toBe(100);
  });

  it('hasAnyPicks reflects state', () => {
    const c = new AttackerComposer(PALETTE, 100);
    expect(c.hasAnyPicks()).toBe(false);
    c.adjust('standard', 1);
    expect(c.hasAnyPicks()).toBe(true);
    c.adjust('standard', -1);
    expect(c.hasAnyPicks()).toBe(false);
  });
});

describe('AttackerComposer abilities', () => {
  it('toggles queued state when ready', () => {
    const c = new AttackerComposer(PALETTE, 100, ABILITIES);
    expect(c.toggleAbility('a')).toBe(true);
    expect(c.queuedAbilities().length).toBe(1);
    expect(c.toggleAbility('a')).toBe(true); // toggle off
    expect(c.queuedAbilities().length).toBe(0);
  });

  it('refuses toggle while on cooldown', () => {
    const c = new AttackerComposer(PALETTE, 100, ABILITIES);
    c.toggleAbility('a');
    c.commitQueuedAbilities();
    // 'a' is now on cooldown 3.
    expect(c.toggleAbility('a')).toBe(false);
    expect(c.queuedAbilities().length).toBe(0);
  });

  it('cooldowns tick down each resetForWave', () => {
    const c = new AttackerComposer(PALETTE, 100, ABILITIES);
    c.toggleAbility('a');
    c.commitQueuedAbilities();
    expect(c.getState().abilities[0].cooldownRemaining).toBe(3);
    c.resetForWave(100);
    expect(c.getState().abilities[0].cooldownRemaining).toBe(2);
    c.resetForWave(100);
    c.resetForWave(100);
    c.resetForWave(100); // floors at 0
    expect(c.getState().abilities[0].cooldownRemaining).toBe(0);
    expect(c.toggleAbility('a')).toBe(true); // ready again
  });
});

describe('AttackerComposer economy v3 — carryover + growth', () => {
  it('income grows per wave', () => {
    const c = new AttackerComposer(PALETTE, {
      baseBudget: 80, growthPerWave: 12, maxCarryoverMult: 0,
      camps: { costPerCamp: 50, incomePerWave: 15, max: 0 },
      wagon: { costPerWagon: 25, max: 2 },
    });
    expect(c.getState().budget).toBe(80);
    c.resetForWave(2);
    expect(c.getState().budget).toBe(92); // 80 + 12
    c.resetForWave(5);
    expect(c.getState().budget).toBe(80 + 12 * 4);
  });

  it('carryover rolls unspent essence forward, capped at maxCarryoverMult × income', () => {
    const c = new AttackerComposer(PALETTE, {
      baseBudget: 100, growthPerWave: 0, maxCarryoverMult: 2,
      camps: { costPerCamp: 50, incomePerWave: 15, max: 0 },
      wagon: { costPerWagon: 25, max: 2 },
    });
    // Spend 30, leave 70 unspent; resetForWave should roll the 70 in
    // (which is < 2×100 = 200 cap, so all of it rolls).
    c.adjust('standard', 6); // 30e
    c.resetForWave(2);
    expect(c.getState().carryover).toBe(70);
    expect(c.getState().budget).toBe(170); // 100 income + 70 carryover
  });

  it('carryover capped when exceeds maxCarryoverMult × income', () => {
    // Income wave 2 = 100, mult 0.5 → max carryover = 50.
    const c = new AttackerComposer(PALETTE, {
      baseBudget: 100, growthPerWave: 0, maxCarryoverMult: 0.5,
      camps: { costPerCamp: 50, incomePerWave: 15, max: 0 },
      wagon: { costPerWagon: 25, max: 2 },
    });
    // Don't spend anything — leave full 100 unspent.
    c.resetForWave(2);
    expect(c.getState().carryover).toBe(50); // capped at 0.5 × 100
    expect(c.getState().budget).toBe(150);
  });
});

describe('AttackerComposer economy v3 — camps', () => {
  const ECONOMY = {
    baseBudget: 100, growthPerWave: 0, maxCarryoverMult: 0,
    camps: { costPerCamp: 50, incomePerWave: 15, max: 2 },
    wagon: { costPerWagon: 25, max: 2 },
  };

  it('build subtracts cost from current wave', () => {
    const c = new AttackerComposer(PALETTE, ECONOMY);
    expect(c.adjustCamps(1)).toBe(true);
    expect(c.getState().camps.count).toBe(1);
    expect(c.getState().remainingEssence).toBe(50);
  });

  it('built camps persist across resetForWave AND boost income', () => {
    const c = new AttackerComposer(PALETTE, ECONOMY);
    c.adjustCamps(1);
    c.resetForWave(2);
    expect(c.getState().camps.count).toBe(1); // persisted
    expect(c.getState().thisWaveIncome).toBe(115); // 100 + 15 from camp
    expect(c.getState().budget).toBe(115); // no carryover
  });

  it('two camps stack their income bonuses', () => {
    const c = new AttackerComposer(PALETTE, ECONOMY);
    c.adjustCamps(1);
    c.adjustCamps(1);
    c.resetForWave(2);
    expect(c.getState().thisWaveIncome).toBe(130); // 100 + 2×15
  });

  it('paid-for camps do NOT recharge against next wave (no double pay)', () => {
    const c = new AttackerComposer(PALETTE, ECONOMY);
    c.adjustCamps(1); // 50 spent of 100 wave-1 budget
    c.resetForWave(2);
    // Wave 2 starts with 115 budget; the previously-built camp is
    // already paid, doesn't drain wave 2.
    expect(c.getState().remainingEssence).toBe(115);
  });

  it('camps capped at max', () => {
    const c = new AttackerComposer(PALETTE, ECONOMY);
    c.adjustCamps(1);
    c.adjustCamps(1);
    expect(c.adjustCamps(1)).toBe(false);
    expect(c.getState().camps.count).toBe(2);
  });

  it('camps disabled when max=0', () => {
    const c = new AttackerComposer(PALETTE, {
      ...ECONOMY,
      camps: { ...ECONOMY.camps, max: 0 },
    });
    expect(c.adjustCamps(1)).toBe(false);
    expect(c.getState().camps.max).toBe(0);
  });
});

describe('AttackerComposer wagons', () => {
  it('costs essence per wagon (default 25)', () => {
    const c = new AttackerComposer(PALETTE, 100);
    expect(c.adjustWagon(1)).toBe(true);
    expect(c.getState().remainingEssence).toBe(75);
    expect(c.adjustWagon(1)).toBe(true);
    expect(c.getState().remainingEssence).toBe(50);
  });

  it('caps at max (default 2)', () => {
    const c = new AttackerComposer(PALETTE, 100);
    c.adjustWagon(1);
    c.adjustWagon(1);
    expect(c.adjustWagon(1)).toBe(false);
    expect(c.getState().wagon.count).toBe(2);
  });

  it('refuses when budget cannot afford', () => {
    const c = new AttackerComposer(PALETTE, 20);
    expect(c.adjustWagon(1)).toBe(false); // wagon costs 25, budget 20
  });

  it('resets to 0 between waves', () => {
    const c = new AttackerComposer(PALETTE, 100);
    c.adjustWagon(2);
    c.resetForWave(100);
    expect(c.getState().wagon.count).toBe(0);
  });
});
