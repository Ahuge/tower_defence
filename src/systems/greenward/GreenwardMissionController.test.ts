/**
 * Tests for GreenwardMissionController — the per-mission orchestrator
 * that bundles Consecration + Mercy + ModeLean writeback for Greenward
 * missions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  GreenwardMissionController,
  type GreenwardMissionRules,
} from './GreenwardMissionController';
import { getModeLean, resetModeLean } from './ModeLeanTracker';
import { resetGreenwardState } from './WildwoodReserves';

beforeEach(() => {
  resetGreenwardState();
});

function rules(ruins: GreenwardMissionRules['ruins']): GreenwardMissionRules {
  return { ruins };
}

describe('GreenwardMissionController — construction', () => {
  it('builds a consecration manager + mercy watcher from rules', () => {
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'ceremony' },
        { id: 'b', col: 8, row: 8, mode: 'mercy' },
      ]),
      100,
    );
    expect(c.consecration.getRuins()).toHaveLength(2);
    expect(c.mercyWatcher).toBeDefined();
  });
});

describe('GreenwardMissionController — finalize', () => {
  it('reports claimed-by-mode in the custom payload', () => {
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'siege' },
        { id: 'b', col: 6, row: 6, mode: 'siege' },
        { id: 'c', col: 7, row: 7, mode: 'mercy' },
      ]),
      100,
    );
    c.consecration.bindDefender('a', 1);
    c.consecration.bindDefender('b', 2);
    c.consecration.bindWatcher('c', 99);
    c.consecration.bindDefender('c', 3);

    // Kill the siege defenders + the mercy defender. Leave watcher.
    c.consecration.notifyCreepKilled(1);
    c.consecration.notifyCreepKilled(2);
    c.consecration.notifyCreepKilled(3);

    const out = c.finalize(80);
    expect(out.ruinsClaimed).toBe(3);
    expect(out.siegeClaims).toBe(2);
    expect(out.mercyClaims).toBe(1);
    expect(out.ceremonyClaims).toBe(0);
    expect(out.watcherUnharmed).toBe(true);
    expect(out.reservesSpent).toBe(20);
    expect(out.reservesRemaining).toBe(80);
  });

  it('per-mission overrides win against derived defaults', () => {
    const c = new GreenwardMissionController(rules([]), 100);
    c.setCustom('headwaterClaimed', true);
    c.setCustom('knightKilled', true);
    c.setCustom('heraldKilled', true);
    c.incCustom('civiliansKilled', 2);
    c.incCustom('civiliansKilled', 1);

    const out = c.finalize(100);
    expect(out.headwaterClaimed).toBe(true);
    expect(out.knightKilled).toBe(true);
    expect(out.heraldKilled).toBe(true);
    expect(out.civiliansKilled).toBe(3);
  });

  it('naveResolvedMode threads through from setCustom into the custom payload', () => {
    const c = new GreenwardMissionController(rules([]), 100);
    // GameScene calls this with the resolved mode from
    // _greenwardFinaleController.getSnapshot() at game-end.
    c.setCustom('naveResolvedMode', 'mercy' as const);
    const out = c.finalize(100);
    expect(out.naveResolvedMode).toBe('mercy');
  });

  it('naveResolvedMode defaults to null when unset (non-M10 missions / pre-courtyard losses)', () => {
    const c = new GreenwardMissionController(rules([]), 100);
    const out = c.finalize(100);
    expect(out.naveResolvedMode).toBeNull();
  });

  it('advances ModeLeanTracker exactly once per finalize call', () => {
    resetModeLean();
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'ceremony' },
        { id: 'b', col: 6, row: 6, mode: 'mercy' },
      ]),
      100,
    );
    // Claim the ceremony ruin via the channel.
    c.tick(0, 12_000, [{ col: 4, row: 5, typeId: 'nature_blossom' }]);
    // Set up + claim the mercy ruin.
    c.consecration.bindDefender('b', 1);
    c.consecration.bindWatcher('b', 99);
    c.consecration.notifyCreepKilled(1);

    c.finalize(90);
    const lean = getModeLean();
    expect(lean.ceremony).toBe(1);
    expect(lean.mercy).toBe(1);
    expect(lean.siege).toBe(0);
  });

  it('watcherUnharmed is false when a Watcher was damaged', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'a', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.consecration.bindWatcher('a', 99);
    c.consecration.notifyWatcherDamaged(99);
    const out = c.finalize(100);
    expect(out.watcherUnharmed).toBe(false);
  });
});

describe('GreenwardMissionController — tick', () => {
  it('progresses Ceremony channels via forwarded update', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'a', col: 5, row: 5, mode: 'ceremony' }]),
      100,
    );
    c.tick(0, 10_000, [{ col: 4, row: 5, typeId: 'nature_blossom' }]);
    expect(c.consecration.getRuin('a')?.claimed).toBe(true);
  });
});
