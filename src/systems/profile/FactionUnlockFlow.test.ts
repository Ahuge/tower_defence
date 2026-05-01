/**
 * Spec for the Plan 5 faction-tree state machine + Shards purchase flow.
 *
 * These tests run with localStorage (jsdom) so PlayerProfile +
 * StorePersistence + ShardWallet writes are real. We reset both stores
 * between tests for isolation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerProfile } from './PlayerProfile';
import { PlayerProfileStore } from './PlayerProfileStore';
import { StorePersistence } from '../monetization/StorePersistence';
import { ShardWallet } from '../monetization/ShardWallet';
import {
  getFactionNodeState,
  isFactionPlayable,
  isFactionCampaignPurchased,
  isFactionCampaignComplete,
} from './UnlockGates';
import { attemptFactionUnlock } from './FactionUnlockFlow';

beforeEach(() => {
  PlayerProfileStore.reset();
  StorePersistence.reset();
  PlayerProfile.__reset();
  PlayerProfile.init();
});

describe('isFactionPlayable', () => {
  it('Arcane is always playable (free root)', () => {
    expect(isFactionPlayable('arcane')).toBe(true);
  });

  it('Mechanical is not playable until campaign purchased + completed', () => {
    expect(isFactionPlayable('mechanical')).toBe(false);
  });

  it('legacy_faction_playable flag pre-grants playable status', () => {
    PlayerProfile.setFlag('legacy_faction_playable.mechanical', true);
    expect(isFactionPlayable('mechanical')).toBe(true);
  });

  it('chaos / random are always playable (meta entries — not in tree)', () => {
    expect(isFactionPlayable('chaos')).toBe(true);
    expect(isFactionPlayable('random')).toBe(true);
  });
});

describe('Faction node state — locked_level / locked_parents / unlockable', () => {
  it('Mechanical at L1 is locked_level (need L3)', () => {
    expect(getFactionNodeState('mechanical')).toBe('locked_level');
  });

  it('Mechanical at L3 with Arcane already root-implicit is unlockable', () => {
    // Bump player level to 3.
    PlayerProfile.addXP(600, 'test'); // 600 XP → L3
    expect(PlayerProfile.getLevel()).toBeGreaterThanOrEqual(3);
    expect(getFactionNodeState('mechanical')).toBe('unlockable');
  });

  it('Military at L6 with Mechanical NOT purchased is locked_parents', () => {
    PlayerProfile.addXP(3000, 'test'); // 200+400+600+800+1000 = L6
    expect(PlayerProfile.getLevel()).toBeGreaterThanOrEqual(6);
    expect(getFactionNodeState('military')).toBe('locked_parents');
  });

  it('Military at L6 with Mechanical purchased is unlockable', () => {
    PlayerProfile.addXP(3000, 'test');
    StorePersistence.update(s => { s.unlockedFactions.push('mechanical'); });
    expect(getFactionNodeState('military')).toBe('unlockable');
  });

  it('Harmonic capstone at L18 requires any 4 unlocks', () => {
    // Get to L18.
    let xp = 0;
    for (let l = 1; l < 18; l++) xp += l * 200;
    PlayerProfile.addXP(xp, 'test');
    expect(PlayerProfile.getLevel()).toBeGreaterThanOrEqual(18);
    expect(getFactionNodeState('harmonic')).toBe('locked_capstone');
    StorePersistence.update(s => {
      s.unlockedFactions.push('mechanical', 'nature', 'void', 'military');
    });
    expect(getFactionNodeState('harmonic')).toBe('unlockable');
  });
});

describe('attemptFactionUnlock', () => {
  it('rejects with not_in_tree for chaos / random', () => {
    expect(attemptFactionUnlock('chaos').reason).toBe('not_in_tree');
    expect(attemptFactionUnlock('random').reason).toBe('not_in_tree');
  });

  it('rejects unlockable but insufficient shards', () => {
    PlayerProfile.addXP(600, 'test'); // L3
    expect(getFactionNodeState('mechanical')).toBe('unlockable');
    expect(ShardWallet.getBalance()).toBeLessThan(1000);
    expect(attemptFactionUnlock('mechanical').reason).toBe('insufficient_shards');
  });

  it('succeeds with enough shards + state=unlockable', () => {
    PlayerProfile.addXP(600, 'test');
    ShardWallet.earn(2000, 'test');
    const r = attemptFactionUnlock('mechanical');
    expect(r.ok).toBe(true);
    expect(isFactionCampaignPurchased('mechanical')).toBe(true);
    expect(ShardWallet.getBalance()).toBe(1000); // 2000 - 1000
  });

  it('rejects already_purchased on a second attempt', () => {
    PlayerProfile.addXP(600, 'test');
    ShardWallet.earn(2000, 'test');
    attemptFactionUnlock('mechanical');
    const second = attemptFactionUnlock('mechanical');
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('already_purchased');
  });

  it('purchase + no campaign content = campaign_pending state', () => {
    PlayerProfile.addXP(600, 'test');
    ShardWallet.earn(2000, 'test');
    attemptFactionUnlock('mechanical');
    // Mech campaign hasn't shipped (Plan 14 v1 only ships Arcane).
    expect(getFactionNodeState('mechanical')).toBe('campaign_pending');
  });

  it('Arcane (free root) cannot be re-purchased', () => {
    expect(isFactionCampaignPurchased('arcane')).toBe(true);
    expect(isFactionCampaignComplete('arcane')).toBe(false); // no missions won yet
  });
});
