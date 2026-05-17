import { describe, it, expect } from 'vitest';
import { Tower } from './Tower';
import { HeadlessScene } from '../headless/HeadlessScene';
import { getTowerType } from '../data/TowerTypes';
import { createDestructibleState } from './Destructibility';

function makeTower(): Tower {
  const scene = new HeadlessScene();
  return new Tower(scene as any, 5, 5, getTowerType('arcane_bolt'));
}

describe('Tower.takeDamage (M10 finale destructibility)', () => {
  it('no-ops when destructible is null (default for every existing mission)', () => {
    const t = makeTower();
    const killed = t.takeDamage(100);
    expect(killed).toBe(false);
    expect(t.destructible).toBeNull();
    expect((t as { _expired?: boolean })._expired).toBeFalsy();
  });

  it('reduces hp on a destructible tower and does not set _expired above 0', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(200);
    const killed = t.takeDamage(50);
    expect(killed).toBe(false);
    expect(t.destructible.hp).toBe(150);
    expect((t as { _expired?: boolean })._expired).toBeFalsy();
  });

  it('returns true and sets _expired exactly on the killing blow', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(100);
    expect(t.takeDamage(30)).toBe(false);
    expect(t.takeDamage(30)).toBe(false);
    expect(t.takeDamage(50)).toBe(true); // overkill
    expect(t.destructible.hp).toBe(0);
    expect((t as { _expired?: boolean })._expired).toBe(true);
  });

  it('does not double-fire the killing blow (subsequent calls return false)', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(50);
    expect(t.takeDamage(60)).toBe(true);
    expect(t.takeDamage(10)).toBe(false); // already dead
    expect(t.takeDamage(10)).toBe(false);
  });

  it('clamps hp to 0 instead of going negative', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(30);
    t.takeDamage(999);
    expect(t.destructible.hp).toBe(0);
  });

  it('logs the assailant timestamp by source', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(200);
    // Headless scene's time.now is 0 by default; sufficient to assert
    // the source was logged (was -Infinity before any hit).
    expect(t.assailants.lastBy('hero')).toBe(-Infinity);
    t.takeDamage(10, 'hero');
    expect(t.assailants.lastBy('hero')).toBeGreaterThan(-Infinity);
    expect(t.assailants.lastBy('send')).toBe(-Infinity);
  });

  it('defaults the damage source to "unknown" when omitted', () => {
    const t = makeTower();
    t.destructible = createDestructibleState(200);
    t.takeDamage(5);
    expect(t.assailants.lastBy('unknown')).toBeGreaterThan(-Infinity);
  });
});
