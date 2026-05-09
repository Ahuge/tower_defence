import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerProfile } from './PlayerProfile';
import { PlayerProfileStore } from './PlayerProfileStore';

describe('PlayerProfile — markFirstGameComplete (Plan 3 hook)', () => {
  beforeEach(() => {
    PlayerProfileStore.reset();
    // PlayerProfile retains its initialized=true between tests; reset
    // reaches into __reset to flush the in-memory state too.
    PlayerProfile.__reset();
    PlayerProfile.init();
  });

  it('isFirstGameComplete starts false on a fresh profile', () => {
    expect(PlayerProfile.isFirstGameComplete()).toBe(false);
  });

  it('markFirstGameComplete sets the flag and grants XP', () => {
    const before = PlayerProfile.getXP();
    PlayerProfile.markFirstGameComplete();
    expect(PlayerProfile.isFirstGameComplete()).toBe(true);
    // L1 player gets a 200-XP bonus (= 1 full level), L2 transition.
    expect(PlayerProfile.getXP()).toBeGreaterThan(before);
    expect(PlayerProfile.getLevel()).toBeGreaterThanOrEqual(2);
  });

  it('markFirstGameComplete is idempotent — second call awards no XP', () => {
    PlayerProfile.markFirstGameComplete();
    const xpAfterFirst = PlayerProfile.getXP();
    PlayerProfile.markFirstGameComplete();
    expect(PlayerProfile.getXP()).toBe(xpAfterFirst);
  });
});

describe('PlayerProfile — legacy migration pre-marks FTG complete', () => {
  beforeEach(() => {
    PlayerProfileStore.reset();
    PlayerProfile.__reset();
    // Simulate a legacy player by writing td_store directly.
    localStorage.setItem('td_store', JSON.stringify({
      shards: 100,
      gamesPlayed: 5,
      gamesWon: 2,
      transactions: [],
      ownedSkins: [],
      equippedSkins: {},
      equippedTerrain: null,
      unlockedFactions: [],
      unlockedTerrains: [],
      battlePassPremium: false,
      battlePassSeason: '',
      battlePassXP: 0,
      claimedFreeRewards: [],
      claimedPremiumRewards: [],
      dailyChallenges: [],
      dailyResetDate: '',
      weeklyChallenges: [],
      weeklyResetDate: '',
      freeRollsRemaining: 0,
      freeRollResetDate: '',
      adFree: false,
      discoveredCreeps: [],
      firstWinFactions: [],
    }));
    PlayerProfile.init();
  });

  it('migration sets first_game_complete so splash never re-prompts', () => {
    expect(PlayerProfile.isFirstGameComplete()).toBe(true);
  });

  it('migration sets a starting level above 1', () => {
    expect(PlayerProfile.getLevel()).toBeGreaterThan(1);
  });
});
