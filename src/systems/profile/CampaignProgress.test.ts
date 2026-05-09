/**
 * Spec for the campaign progress + mission unlock cascade in
 * PlayerProfile. The unlock model: mission N+1 unlocks when mission N
 * has at least 1 star. Stars are monotonic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerProfile } from './PlayerProfile';
import { PlayerProfileStore } from './PlayerProfileStore';

beforeEach(() => {
  PlayerProfileStore.reset();
  PlayerProfile.__reset();
  PlayerProfile.init();
});

describe('PlayerProfile — campaign progress', () => {
  it('mission 0 of any faction is always unlocked', () => {
    expect(PlayerProfile.isMissionUnlocked('arcane', 0)).toBe(true);
    expect(PlayerProfile.isMissionUnlocked('mechanical', 0)).toBe(true);
  });

  it('mission N+1 is locked until mission N earns at least 1 star', () => {
    expect(PlayerProfile.isMissionUnlocked('arcane', 1)).toBe(false);
    PlayerProfile.recordMissionResult('arcane', 0, 1);
    expect(PlayerProfile.isMissionUnlocked('arcane', 1)).toBe(true);
  });

  it('stars are monotonic — a 2-star replay does not downgrade a 3-star clear', () => {
    PlayerProfile.recordMissionResult('arcane', 0, 3);
    expect(PlayerProfile.getMissionStars('arcane', 0)).toBe(3);
    PlayerProfile.recordMissionResult('arcane', 0, 2);
    expect(PlayerProfile.getMissionStars('arcane', 0)).toBe(3);
  });

  it('replay with higher stars upgrades', () => {
    PlayerProfile.recordMissionResult('arcane', 0, 1);
    PlayerProfile.recordMissionResult('arcane', 0, 3);
    expect(PlayerProfile.getMissionStars('arcane', 0)).toBe(3);
  });

  it('campaign total stars sums across all missions of one faction', () => {
    PlayerProfile.recordMissionResult('arcane', 0, 3);
    PlayerProfile.recordMissionResult('arcane', 1, 2);
    PlayerProfile.recordMissionResult('arcane', 2, 1);
    expect(PlayerProfile.getCampaignTotalStars('arcane')).toBe(6);
  });

  it('campaign progress is per-faction', () => {
    PlayerProfile.recordMissionResult('arcane', 0, 3);
    expect(PlayerProfile.getCampaignTotalStars('arcane')).toBe(3);
    expect(PlayerProfile.getCampaignTotalStars('mechanical')).toBe(0);
  });

  it('clamps invalid star counts (0..3 range)', () => {
    PlayerProfile.recordMissionResult('arcane', 0, 5);
    expect(PlayerProfile.getMissionStars('arcane', 0)).toBe(3);
    PlayerProfile.recordMissionResult('arcane', 1, -2);
    expect(PlayerProfile.getMissionStars('arcane', 1)).toBe(0);
  });
});
