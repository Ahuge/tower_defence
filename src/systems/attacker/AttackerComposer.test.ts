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
