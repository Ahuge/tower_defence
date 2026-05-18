/**
 * Tests for the WildwoodReserves system. The arithmetic is small but
 * load-bearing for the campaign's "Cost of Spread" thesis: the
 * Wildwood must visibly thin across the 10 missions.
 *
 * State persists via PlayerProfileStore / CampaignState — each test
 * resets to defaults explicitly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGreenwardState,
  getReserves,
  canAfford,
  deduct,
  refund,
  applyMissionRegen,
  resetGreenwardState,
  INITIAL_RESERVES,
  REGEN_PER_MISSION,
  MAX_AFTER_SPEND,
} from './WildwoodReserves';

beforeEach(() => {
  resetGreenwardState();
});

describe('WildwoodReserves — initial state', () => {
  it('starts at INITIAL_RESERVES (100)', () => {
    expect(getReserves()).toBe(INITIAL_RESERVES);
  });

  it('hasSpent is false on a fresh state', () => {
    expect(getGreenwardState().hasSpent).toBe(false);
  });

  it('canAfford returns true for amounts up to and including the current total', () => {
    expect(canAfford(0)).toBe(true);
    expect(canAfford(50)).toBe(true);
    expect(canAfford(100)).toBe(true);
    expect(canAfford(101)).toBe(false);
  });
});

describe('WildwoodReserves — deduct', () => {
  it('subtracts the amount from reserves on a successful deduction', () => {
    expect(deduct(20)).toBe(true);
    expect(getReserves()).toBe(80);
  });

  it('flips hasSpent to true on the first deduction', () => {
    expect(getGreenwardState().hasSpent).toBe(false);
    deduct(1);
    expect(getGreenwardState().hasSpent).toBe(true);
  });

  it('refuses a deduction that would go negative', () => {
    deduct(50);
    expect(deduct(60)).toBe(false);
    expect(getReserves()).toBe(50); // unchanged
  });

  it('refuses a negative amount', () => {
    expect(deduct(-1)).toBe(false);
    expect(getReserves()).toBe(INITIAL_RESERVES);
  });

  it('allows multiple sequential deductions to drain the pool', () => {
    deduct(40);
    deduct(40);
    deduct(20);
    expect(getReserves()).toBe(0);
  });
});

describe('WildwoodReserves — refund + regen', () => {
  it('refunds add back to reserves', () => {
    deduct(50);
    expect(refund(20)).toBe(70);
    expect(getReserves()).toBe(70);
  });

  it('refund caps at INITIAL_RESERVES when no spending has occurred yet', () => {
    // Synthetic case: refund without deduct (refund-only paths in
    // future test code). Cap is INITIAL because hasSpent is still false.
    expect(refund(200)).toBe(INITIAL_RESERVES);
  });

  it('refund caps at MAX_AFTER_SPEND once spending has occurred', () => {
    deduct(50);   // hasSpent = true, reserves = 50
    refund(200);  // would go to 250; cap at MAX_AFTER_SPEND (95)
    expect(getReserves()).toBe(MAX_AFTER_SPEND);
  });

  it('applyMissionRegen adds REGEN_PER_MISSION and respects the post-spend cap', () => {
    deduct(40);  // 60
    applyMissionRegen();  // 70
    expect(getReserves()).toBe(60 + REGEN_PER_MISSION);
  });

  it('once hasSpent is true, no amount of regen can return to full', () => {
    deduct(10);
    for (let i = 0; i < 50; i++) applyMissionRegen();
    expect(getReserves()).toBe(MAX_AFTER_SPEND);
    expect(getReserves()).toBeLessThan(INITIAL_RESERVES);
  });

  it('refund rejects negative amounts', () => {
    deduct(20);
    const before = getReserves();
    refund(-5);
    expect(getReserves()).toBe(before);
  });
});

describe('WildwoodReserves — persistence across calls', () => {
  it('reads after writes return the persisted value', () => {
    deduct(33);
    expect(getReserves()).toBe(67);
    expect(getGreenwardState().reserves).toBe(67);
  });

  it('resetGreenwardState wipes to defaults', () => {
    deduct(75);
    resetGreenwardState();
    expect(getReserves()).toBe(INITIAL_RESERVES);
    expect(getGreenwardState().hasSpent).toBe(false);
  });
});
