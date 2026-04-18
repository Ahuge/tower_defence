/**
 * Spec for EconomyManager + its EventBus wiring.
 *
 * Economy is wrapped thinly around ResourceManager('gold'), but the
 * EventBus bindings (creepKilled -> add, waveCleared -> bonus,
 * waveStarted -> track wave for kill-gold scaling) are the parts
 * most likely to silently drift if someone refactors.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyManager } from './EconomyManager';
import { EventBus } from './EventBus';
import { STARTING_GOLD, KILL_GOLD, WAVE_CLEAR_BONUS } from '../config';

function fresh(): { econ: EconomyManager; bus: EventBus } {
  const bus = new EventBus();
  const econ = new EconomyManager(bus);
  return { econ, bus };
}

describe('EconomyManager — initial state', () => {
  it('starts with STARTING_GOLD', () => {
    const { econ } = fresh();
    expect(econ.gold).toBe(STARTING_GOLD);
  });
});

describe('EconomyManager — addGold / spend', () => {
  let econ: EconomyManager;

  beforeEach(() => {
    econ = fresh().econ;
  });

  it('addGold increases the balance', () => {
    const before = econ.gold;
    econ.addGold(50);
    expect(econ.gold).toBe(before + 50);
  });

  it('spend() deducts when there is enough gold and returns true', () => {
    const before = econ.gold;
    expect(econ.spend(25)).toBe(true);
    expect(econ.gold).toBe(before - 25);
  });

  it('spend() returns false and leaves balance unchanged when underfunded', () => {
    const before = econ.gold;
    expect(econ.spend(before + 1)).toBe(false);
    expect(econ.gold).toBe(before);
  });

  it('canAfford returns the right verdict without spending', () => {
    const before = econ.gold;
    expect(econ.canAfford(before)).toBe(true);
    expect(econ.canAfford(before + 1)).toBe(false);
    // Balance should not have changed.
    expect(econ.gold).toBe(before);
  });

  it('gold setter accepts direct writes (used for test harnesses / debug)', () => {
    econ.gold = 1234;
    expect(econ.gold).toBe(1234);
  });
});

describe('EconomyManager — EventBus wiring', () => {
  it('creepKilled adds the reward to gold', () => {
    const { econ, bus } = fresh();
    const before = econ.gold;
    bus.emit('creepKilled', 1, 17);
    expect(econ.gold).toBe(before + 17);
  });

  it('waveCleared adds WAVE_CLEAR_BONUS', () => {
    const { econ, bus } = fresh();
    const before = econ.gold;
    bus.emit('waveCleared', 1);
    expect(econ.gold).toBe(before + WAVE_CLEAR_BONUS);
  });

  it('waveStarted updates the tracked wave (affects getKillGold)', () => {
    const { econ, bus } = fresh();
    const base = econ.getKillGold();
    expect(base).toBe(KILL_GOLD); // wave 0, floor(0/10)=0
    bus.emit('waveStarted', 15);
    // Floor(15/10) = 1 → kill gold reduces by 1 (min 2).
    expect(econ.getKillGold()).toBe(Math.max(2, KILL_GOLD - 1));
  });

  it('getKillGold clamps to a minimum of 2', () => {
    const { econ, bus } = fresh();
    bus.emit('waveStarted', 10_000); // way past the scaling floor
    expect(econ.getKillGold()).toBe(2);
  });
});

describe('EconomyManager — multiple instances share no state', () => {
  // Each EconomyManager takes its own EventBus — kills on one bus
  // must not credit gold on another. This guards against any
  // accidental static state creeping into the wrapper.
  it('independent buses produce independent economies', () => {
    const a = fresh();
    const b = fresh();
    a.bus.emit('creepKilled', 1, 100);
    expect(a.econ.gold).toBe(STARTING_GOLD + 100);
    expect(b.econ.gold).toBe(STARTING_GOLD);
  });
});
