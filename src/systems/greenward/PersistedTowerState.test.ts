/**
 * Tests for the Caer Wenna persistence system. Asserts the binding
 * window (M1-M6), the M7/M8 refusal beat, and the M9+ release.
 *
 * Uses the shared GreenwardState slot, so we reset between tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCaerWenna,
  isCaerWennaBound,
  markCaerWennaSpawn,
  canPlaceElder,
  clearCaerWenna,
  CAER_WENNA_BINDING_MAX_IDX,
} from './PersistedTowerState';
import { resetGreenwardState } from './WildwoodReserves';

beforeEach(() => {
  resetGreenwardState();
});

describe('Caer Wenna — binding', () => {
  it('starts unbound on a fresh state', () => {
    expect(getCaerWenna()).toBeNull();
    expect(isCaerWennaBound()).toBe(false);
  });

  it('binds on first Elder placement within the binding window (M1)', () => {
    expect(markCaerWennaSpawn(0)).toBe(true);
    expect(isCaerWennaBound()).toBe(true);
    expect(getCaerWenna()?.spawnedInMissionIdx).toBe(0);
  });

  it('binds at the edge of the binding window (M6 = idx 5)', () => {
    expect(markCaerWennaSpawn(CAER_WENNA_BINDING_MAX_IDX)).toBe(true);
    expect(getCaerWenna()?.spawnedInMissionIdx).toBe(CAER_WENNA_BINDING_MAX_IDX);
  });

  it('refuses to bind past the binding window (M7 = idx 6)', () => {
    expect(markCaerWennaSpawn(6)).toBe(false);
    expect(isCaerWennaBound()).toBe(false);
  });

  it('refuses to bind in M10 too (idx 9)', () => {
    expect(markCaerWennaSpawn(9)).toBe(false);
    expect(isCaerWennaBound()).toBe(false);
  });

  it('subsequent spawn calls are no-ops once bound (first wins)', () => {
    markCaerWennaSpawn(2);
    expect(markCaerWennaSpawn(4)).toBe(false);
    expect(getCaerWenna()?.spawnedInMissionIdx).toBe(2);
  });
});

describe('Caer Wenna — canPlaceElder', () => {
  it('allows placement everywhere when no Wenna is bound', () => {
    for (let idx = 0; idx <= 9; idx++) {
      expect(canPlaceElder(idx)).toBe(true);
    }
  });

  it('allows placement in M1-M6 even when Wenna is bound (re-placement of the same Wenna)', () => {
    markCaerWennaSpawn(2);
    for (let idx = 0; idx <= 5; idx++) {
      expect(canPlaceElder(idx)).toBe(true);
    }
  });

  it('refuses placement in M7 and M8 once Wenna is bound', () => {
    markCaerWennaSpawn(2);
    expect(canPlaceElder(6)).toBe(false);
    expect(canPlaceElder(7)).toBe(false);
  });

  it('allows placement again in M9 and M10 after the refusal beat', () => {
    markCaerWennaSpawn(2);
    expect(canPlaceElder(8)).toBe(true);
    expect(canPlaceElder(9)).toBe(true);
  });
});

describe('Caer Wenna — clear', () => {
  it('clearCaerWenna wipes the binding', () => {
    markCaerWennaSpawn(3);
    expect(isCaerWennaBound()).toBe(true);
    clearCaerWenna();
    expect(isCaerWennaBound()).toBe(false);
    expect(getCaerWenna()).toBeNull();
  });

  it('clearCaerWenna does not disturb the Reserves slot', async () => {
    // Touch reserves so the slot is populated, then clear Wenna,
    // and confirm reserves persist unchanged.
    const { deduct, getReserves } = await import('./WildwoodReserves');
    deduct(20);
    const before = getReserves();
    markCaerWennaSpawn(3);
    clearCaerWenna();
    expect(getReserves()).toBe(before);
  });
});
