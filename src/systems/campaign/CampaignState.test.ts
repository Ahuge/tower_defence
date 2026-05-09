/**
 * CampaignState read/write spec.
 *
 * Phase 0 acceptance gate: state slot persists per-faction, defaults
 * merge cleanly on first read, set replaces wholesale, and existing
 * v1 saves (no campaignState field) load with the empty default.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignState } from './CampaignState';
import { PlayerProfile } from '../profile/PlayerProfile';
import { PlayerProfileStore } from '../profile/PlayerProfileStore';

interface TestState {
  ore: number;
  ingots: number;
  rage: 0 | 1 | 2 | 3;
}

const DEFAULT_STATE: TestState = { ore: 0, ingots: 0, rage: 0 };

beforeEach(() => {
  PlayerProfileStore.reset();
  PlayerProfile.__reset();
  PlayerProfile.init();
});

describe('CampaignState', () => {
  it('returns the provided default on first read (no slot)', () => {
    const state = CampaignState.get<TestState>('mechanical', DEFAULT_STATE);
    expect(state).toEqual(DEFAULT_STATE);
    // Did not persist on read.
    expect(CampaignState.has('mechanical')).toBe(false);
  });

  it('persists a written state and reads it back', () => {
    CampaignState.set<TestState>('mechanical', { ore: 47, ingots: 12, rage: 1 });
    const state = CampaignState.get<TestState>('mechanical', DEFAULT_STATE);
    expect(state).toEqual({ ore: 47, ingots: 12, rage: 1 });
    expect(CampaignState.has('mechanical')).toBe(true);
  });

  it('merges defaults so newly-added fields appear without rewriting', () => {
    // Simulate an old save with a smaller schema persisted.
    PlayerProfileStore.update(s => {
      s.campaignState['mechanical'] = { ore: 5 };
    });
    interface ExpandedState extends TestState { foundryHealth: number }
    const state = CampaignState.get<ExpandedState>('mechanical', {
      ...DEFAULT_STATE, foundryHealth: 100,
    });
    expect(state.ore).toBe(5);
    expect(state.foundryHealth).toBe(100);
    expect(state.rage).toBe(0);
  });

  it('separates state per faction', () => {
    CampaignState.set<TestState>('mechanical', { ore: 47, ingots: 12, rage: 1 });
    CampaignState.set<TestState>('arcane', { ore: 0, ingots: 0, rage: 3 });
    expect(CampaignState.get<TestState>('mechanical', DEFAULT_STATE).ore).toBe(47);
    expect(CampaignState.get<TestState>('arcane', DEFAULT_STATE).rage).toBe(3);
  });

  it('reset() clears the slot for a faction', () => {
    CampaignState.set<TestState>('mechanical', { ore: 47, ingots: 12, rage: 1 });
    CampaignState.reset('mechanical');
    expect(CampaignState.has('mechanical')).toBe(false);
    expect(CampaignState.get<TestState>('mechanical', DEFAULT_STATE)).toEqual(DEFAULT_STATE);
  });

  it('legacy save without campaignState field loads with empty default', () => {
    // Phase 0 migration acceptance: a v1 save (no campaignState key)
    // should not throw and should hand back the consumer's default.
    PlayerProfileStore.update(s => {
      delete (s as Partial<typeof s>).campaignState;
    });
    const state = CampaignState.get<TestState>('mechanical', DEFAULT_STATE);
    expect(state).toEqual(DEFAULT_STATE);
  });
});
