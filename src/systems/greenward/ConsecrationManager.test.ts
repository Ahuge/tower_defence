/**
 * Tests for ConsecrationManager — Greenward's signature gameplay
 * system. Covers each of the three modes' claim rules plus the
 * snapshot shape the UI / e2e read.
 */
import { describe, it, expect } from 'vitest';
import {
  ConsecrationManager,
  CEREMONY_CHANNEL_MS,
  CEREMONY_TOWER_TYPE_ID,
  type RuinSpec,
  type ConsecrationTower,
} from './ConsecrationManager';

function ruin(id: string, col: number, row: number, mode: 'ceremony' | 'siege' | 'mercy'): RuinSpec {
  return { id, col, row, mode };
}

function blossomAt(col: number, row: number): ConsecrationTower {
  return { col, row, typeId: CEREMONY_TOWER_TYPE_ID };
}

function nonBlossomAt(col: number, row: number): ConsecrationTower {
  return { col, row, typeId: 'nature_bramble' };
}

describe('ConsecrationManager — ceremony', () => {
  it('does not progress when no Blossom is adjacent', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(1000, 1000, []);
    expect(m.getRuin('a')?.progress01).toBe(0);
    expect(m.getRuin('a')?.claimed).toBe(false);
  });

  it('does not progress when the adjacent tower is not a Blossom', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(1000, 1000, [nonBlossomAt(4, 5)]);
    expect(m.getRuin('a')?.progress01).toBe(0);
  });

  it('progresses when a Blossom is 4-adjacent', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(1000, 1000, [blossomAt(4, 5)]);
    expect(m.getRuin('a')?.progress01).toBeCloseTo(1000 / CEREMONY_CHANNEL_MS);
  });

  it('ignores diagonal Blossoms (4-adjacency only)', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(1000, 1000, [blossomAt(4, 4)]); // diagonal
    expect(m.getRuin('a')?.progress01).toBe(0);
  });

  it('claims when the channel completes', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(0, CEREMONY_CHANNEL_MS, [blossomAt(4, 5)]);
    expect(m.getRuin('a')?.claimed).toBe(true);
    expect(m.getRuin('a')?.progress01).toBe(1);
  });

  it('clamps progress at 1 when the channel overshoots', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(0, CEREMONY_CHANNEL_MS * 5, [blossomAt(4, 5)]);
    expect(m.getRuin('a')?.progress01).toBe(1);
  });

  it('resets progress when the Blossom is removed mid-channel', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'ceremony')]);
    m.update(0, CEREMONY_CHANNEL_MS / 2, [blossomAt(4, 5)]);
    expect(m.getRuin('a')?.progress01).toBeCloseTo(0.5);
    m.update(0, 16, []); // no Blossom this tick
    expect(m.getRuin('a')?.progress01).toBe(0);
  });
});

describe('ConsecrationManager — siege', () => {
  it('auto-claims when every bound defender is dead', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'siege')]);
    m.bindDefender('a', 1);
    m.bindDefender('a', 2);
    expect(m.getRuin('a')?.claimed).toBe(false);
    m.notifyCreepKilled(1);
    expect(m.getRuin('a')?.claimed).toBe(false); // still one alive
    m.notifyCreepKilled(2);
    expect(m.getRuin('a')?.claimed).toBe(true);
  });

  it('ignores deaths of non-defender creeps', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'siege')]);
    m.bindDefender('a', 1);
    m.notifyCreepKilled(999); // not a defender
    expect(m.getRuin('a')?.claimed).toBe(false);
  });

  it('does not auto-claim a siege ruin with zero defenders bound (defenders never arrived)', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'siege')]);
    // No bindings. Manager has no creeps to wait for. Per design,
    // an unbound siege ruin should NOT auto-claim — the mission
    // setup is the contract. (Avoids accidental auto-claim from a
    // misconfigured map.)
    expect(m.getRuin('a')?.claimed).toBe(false);
    // A "no creeps killed" tick should not change that.
    m.update(0, 16, []);
    expect(m.getRuin('a')?.claimed).toBe(false);
  });
});

describe('ConsecrationManager — mercy', () => {
  it('auto-claims when defenders are dead and Watcher is unharmed', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'mercy')]);
    m.bindDefender('a', 1);
    m.bindDefender('a', 2);
    m.bindWatcher('a', 99);
    m.notifyCreepKilled(1);
    m.notifyCreepKilled(2);
    expect(m.getRuin('a')?.claimed).toBe(true);
    expect(m.allMercyWatchersUnharmed()).toBe(true);
  });

  it('refuses to auto-claim when the Watcher was damaged', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'mercy')]);
    m.bindDefender('a', 1);
    m.bindWatcher('a', 99);
    m.notifyWatcherDamaged(99);
    m.notifyCreepKilled(1);
    expect(m.getRuin('a')?.claimed).toBe(false);
    expect(m.allMercyWatchersUnharmed()).toBe(false);
  });

  it('notifyWatcherDamaged is a no-op for non-Mercy ruins', () => {
    const m = new ConsecrationManager([ruin('a', 5, 5, 'siege')]);
    m.bindWatcher('a', 99); // ignored (mode !== mercy)
    m.notifyWatcherDamaged(99);
    expect(m.allMercyWatchersUnharmed()).toBe(true);
  });

  it('allMercyWatchersUnharmed accumulates across multiple Mercy ruins', () => {
    const m = new ConsecrationManager([
      ruin('a', 5, 5, 'mercy'),
      ruin('b', 8, 8, 'mercy'),
    ]);
    m.bindWatcher('a', 10);
    m.bindWatcher('b', 20);
    expect(m.allMercyWatchersUnharmed()).toBe(true);
    m.notifyWatcherDamaged(10);
    expect(m.allMercyWatchersUnharmed()).toBe(false);
  });
});

describe('ConsecrationManager — snapshot', () => {
  it('returns per-ruin state + mode counts', () => {
    const m = new ConsecrationManager([
      ruin('a', 5, 5, 'ceremony'),
      ruin('b', 8, 8, 'siege'),
      ruin('c', 12, 12, 'mercy'),
    ]);
    m.bindDefender('b', 1);
    m.bindWatcher('c', 99);
    m.bindDefender('c', 2);

    // Claim the siege ruin
    m.notifyCreepKilled(1);
    // Damage the mercy watcher (fails the mercy condition)
    m.notifyWatcherDamaged(99);

    const snap = m.getSnapshot();
    expect(snap.ruins).toHaveLength(3);
    expect(snap.claimedByMode.ceremony).toBe(0);
    expect(snap.claimedByMode.siege).toBe(1);
    expect(snap.claimedByMode.mercy).toBe(0);
    expect(snap.allMercyWatchersUnharmed).toBe(false);
    expect(snap.ruins.find(r => r.id === 'b')?.claimed).toBe(true);
  });

  it('reports getClaimedCount across modes', () => {
    const m = new ConsecrationManager([
      ruin('a', 5, 5, 'siege'),
      ruin('b', 6, 6, 'siege'),
    ]);
    m.bindDefender('a', 1);
    m.bindDefender('b', 2);
    expect(m.getClaimedCount()).toBe(0);
    m.notifyCreepKilled(1);
    expect(m.getClaimedCount()).toBe(1);
    m.notifyCreepKilled(2);
    expect(m.getClaimedCount()).toBe(2);
  });
});
