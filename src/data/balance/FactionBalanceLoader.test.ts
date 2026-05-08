import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyFactionBalance } from './FactionBalanceLoader';
import { TOWER_TYPES } from '../TowerTypes';

const VAR = 'FACTION_BALANCE_VOID_PARAMS';
const ALIENS_VAR = 'FACTION_BALANCE_ALIENS_PARAMS';

describe('FactionBalanceLoader', () => {
  beforeEach(() => {
    delete process.env[VAR];
    delete process.env[ALIENS_VAR];
  });

  afterEach(() => {
    delete process.env[VAR];
    delete process.env[ALIENS_VAR];
  });

  it('returns no-op restore when env var is missing', () => {
    const before = TOWER_TYPES.void_gambler.cost;
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.cost).toBe(before);
    restore();
    expect(TOWER_TYPES.void_gambler.cost).toBe(before);
  });

  it('patches a core stat and restores on call', () => {
    const before = TOWER_TYPES.void_gambler.cost;
    process.env[VAR] = JSON.stringify({ 'void_gambler.cost': 50 });
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.cost).toBe(50);
    restore();
    expect(TOWER_TYPES.void_gambler.cost).toBe(before);
  });

  it('patches a trait param and restores', () => {
    const trait = TOWER_TYPES.void_gambler.traits.find(t => t.id === 'jackpot') as unknown as { killChance: number };
    const before = trait.killChance;
    process.env[VAR] = JSON.stringify({ 'void_gambler.traits.jackpot.killChance': 0.20 });
    const restore = applyFactionBalance('void');
    const after = TOWER_TYPES.void_gambler.traits.find(t => t.id === 'jackpot') as unknown as { killChance: number };
    expect(after.killChance).toBe(0.20);
    restore();
    const restored = TOWER_TYPES.void_gambler.traits.find(t => t.id === 'jackpot') as unknown as { killChance: number };
    expect(restored.killChance).toBe(before);
  });

  it('patches multiple knobs and restores all in reverse order', () => {
    const costBefore = TOWER_TYPES.void_gambler.cost;
    const dmgBefore = TOWER_TYPES.void_spike.damage;
    process.env[VAR] = JSON.stringify({
      'void_gambler.cost': 25,
      'void_spike.damage': 50,
    });
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.cost).toBe(25);
    expect(TOWER_TYPES.void_spike.damage).toBe(50);
    restore();
    expect(TOWER_TYPES.void_gambler.cost).toBe(costBefore);
    expect(TOWER_TYPES.void_spike.damage).toBe(dmgBefore);
  });

  it('does NOT touch towers from other factions', () => {
    const alienBefore = TOWER_TYPES.alien_spitter.cost;
    // Try to patch an alien tower via void's env — should be ignored
    // because the key references a non-void tower.
    process.env[VAR] = JSON.stringify({ 'alien_spitter.cost': 999 });
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.alien_spitter.cost).toBe(alienBefore);
    restore();
    expect(TOWER_TYPES.alien_spitter.cost).toBe(alienBefore);
  });

  it('is faction-scoped: aliens env doesn\'t affect void towers', () => {
    const voidBefore = TOWER_TYPES.void_gambler.cost;
    process.env[ALIENS_VAR] = JSON.stringify({ 'alien_spitter.cost': 50 });
    const restore = applyFactionBalance('aliens');
    expect(TOWER_TYPES.void_gambler.cost).toBe(voidBefore);
    expect(TOWER_TYPES.alien_spitter.cost).toBe(50);
    restore();
  });

  it('handles malformed JSON gracefully (no crash, no patch)', () => {
    const before = TOWER_TYPES.void_gambler.cost;
    process.env[VAR] = '{ this is not json';
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.cost).toBe(before);
    restore();
  });

  it('skips unknown towers silently', () => {
    process.env[VAR] = JSON.stringify({ 'void_doesnotexist.cost': 50 });
    const restore = applyFactionBalance('void');
    // Just shouldn't throw.
    restore();
  });

  it('skips unknown trait params silently', () => {
    const before = TOWER_TYPES.void_gambler.cost;
    process.env[VAR] = JSON.stringify({ 'void_gambler.traits.nonexistent_trait.foo': 1 });
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.cost).toBe(before);
    restore();
  });

  it('skips non-numeric core fields (id, name, etc.)', () => {
    const before = TOWER_TYPES.void_gambler.id;
    process.env[VAR] = JSON.stringify({ 'void_gambler.id': 99 });
    const restore = applyFactionBalance('void');
    expect(TOWER_TYPES.void_gambler.id).toBe(before);
    restore();
  });

  it('successfully patches infernal Imp expires_after_waves', () => {
    const trait = TOWER_TYPES.infernal_imp.traits.find(t => t.id === 'expires_after_waves') as unknown as { waves: number };
    const before = trait.waves;
    process.env.FACTION_BALANCE_INFERNAL_PARAMS = JSON.stringify({
      'infernal_imp.traits.expires_after_waves.waves': 8,
    });
    const restore = applyFactionBalance('infernal');
    const after = TOWER_TYPES.infernal_imp.traits.find(t => t.id === 'expires_after_waves') as unknown as { waves: number };
    expect(after.waves).toBe(8);
    restore();
    const restored = TOWER_TYPES.infernal_imp.traits.find(t => t.id === 'expires_after_waves') as unknown as { waves: number };
    expect(restored.waves).toBe(before);
    delete process.env.FACTION_BALANCE_INFERNAL_PARAMS;
  });
});
