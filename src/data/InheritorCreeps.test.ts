/**
 * Tests for the Inheritor creep entries added to CREEP_TYPES for the
 * Greenward campaign. Asserts they exist + carry the expected shapes
 * (HP / speed multipliers, armor, civilians granting zero gold).
 *
 * Boss + named-Watcher variants (Knight / Herald / Child / Old Woman
 * of Eadwin / Cethric / Stone Bride / Heron) arrive in per-mission
 * commits.
 */
import { describe, it, expect } from 'vitest';
import { CREEP_TYPES, getCreepType } from './CreepTypes';

const INHERITOR_IDS = [
  'inheritor_road_walker',
  'inheritor_den_walker',
  'inheritor_messenger',
  'inheritor_river_crawler',
  'inheritor_civilian',
  'inheritor_wedding_stone',
];

describe('Inheritor creeps — registration', () => {
  it('every Inheritor type id is registered in CREEP_TYPES', () => {
    for (const id of INHERITOR_IDS) {
      expect(CREEP_TYPES[id], `missing ${id}`).toBeTruthy();
    }
  });

  it('every Inheritor name is non-empty', () => {
    for (const id of INHERITOR_IDS) {
      expect(getCreepType(id).name.length).toBeGreaterThan(0);
    }
  });

  it('every Inheritor has a description longer than the id', () => {
    for (const id of INHERITOR_IDS) {
      expect(getCreepType(id).description.length).toBeGreaterThan(id.length);
    }
  });
});

describe('Inheritor creeps — type-specific shape', () => {
  it('Road-Walker is the slow baseline (speed < 1, hp ~ 1)', () => {
    const c = getCreepType('inheritor_road_walker');
    expect(c.speedMultiplier).toBeLessThan(1);
    expect(c.hpMultiplier).toBe(1);
  });

  it('Messenger is fast and fragile', () => {
    const c = getCreepType('inheritor_messenger');
    expect(c.speedMultiplier).toBeGreaterThan(1.3);
    expect(c.hpMultiplier).toBeLessThan(1);
    expect(c.armor).toBe('light');
  });

  it('Wedding-Stone is slow and heavy-armored', () => {
    const c = getCreepType('inheritor_wedding_stone');
    expect(c.speedMultiplier).toBeLessThan(0.75);
    expect(c.armor).toBe('heavy');
  });

  it('Civilian grants zero gold via the applyDifficulty hook', () => {
    const c = getCreepType('inheritor_civilian');
    const resolved = c.applyDifficulty({ toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0 });
    expect(resolved.goldMult).toBe(0);
  });

  it('Civilian does NOT scale with difficulty (constraint, not threat)', () => {
    const c = getCreepType('inheritor_civilian');
    const easy = c.applyDifficulty({ toughness: 0.5, speed: 0.8, count: 1, goldMult: 0.5, toughnessPerWave: 0 });
    const insane = c.applyDifficulty({ toughness: 2.5, speed: 1.3, count: 1.5, goldMult: 2, toughnessPerWave: 0 });
    expect(easy.hpMult).toBe(1);
    expect(insane.hpMult).toBe(1);
    expect(easy.speedMult).toBe(1);
    expect(insane.speedMult).toBe(1);
  });
});
