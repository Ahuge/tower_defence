/**
 * GreenwardMissionStateAspect — tickBetweenMissions parity vs the
 * legacy `applyMissionRegen()` semantics.
 */
import { describe, it, expect } from 'vitest';
import { greenwardMissionStateAspect } from './GreenwardMissionStateAspect';
import {
  DEFAULT_GREENWARD_STATE,
  INITIAL_RESERVES,
  MAX_AFTER_SPEND,
  REGEN_PER_MISSION,
  type GreenwardState,
} from './WildwoodReserves';

describe('greenwardMissionStateAspect — tickBetweenMissions', () => {
  it('regens REGEN_PER_MISSION when reserves are below the cap', () => {
    const state: GreenwardState = { ...DEFAULT_GREENWARD_STATE, reserves: 50 };
    const next = greenwardMissionStateAspect.tickBetweenMissions!(state);
    expect(next.reserves).toBe(50 + REGEN_PER_MISSION);
  });

  it('caps at INITIAL_RESERVES when hasSpent is false', () => {
    const state: GreenwardState = { ...DEFAULT_GREENWARD_STATE, reserves: INITIAL_RESERVES - 2, hasSpent: false };
    const next = greenwardMissionStateAspect.tickBetweenMissions!(state);
    expect(next.reserves).toBe(INITIAL_RESERVES);
  });

  it('caps at MAX_AFTER_SPEND once any spending has occurred', () => {
    const state: GreenwardState = { ...DEFAULT_GREENWARD_STATE, reserves: MAX_AFTER_SPEND - 2, hasSpent: true };
    const next = greenwardMissionStateAspect.tickBetweenMissions!(state);
    expect(next.reserves).toBe(MAX_AFTER_SPEND);
  });

  it('preserves caerWenna + modeLean fields untouched', () => {
    const state: GreenwardState = {
      reserves: 50, hasSpent: true,
      caerWenna: { spawnedInMissionIdx: 2 },
      modeLean: { ceremony: 2, siege: 1, mercy: 0 },
    };
    const next = greenwardMissionStateAspect.tickBetweenMissions!(state);
    expect(next.caerWenna).toEqual(state.caerWenna);
    expect(next.modeLean).toEqual(state.modeLean);
  });

  it('applyMissionResult is a pass-through today (mid-mission deduct + GreenwardController.finalize persist directly)', () => {
    const state: GreenwardState = { ...DEFAULT_GREENWARD_STATE, reserves: 42 };
    const result = {
      won: true, wave: 5, durationMs: 0, livesRemaining: 20, livesStart: 20,
      goldRemaining: 0, goldEarned: 0, towerCount: 0, perfectRun: true, custom: {},
    };
    const next = greenwardMissionStateAspect.applyMissionResult(state, result);
    expect(next).toBe(state); // pass-through identity
  });
});
