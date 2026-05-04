import { describe, it, expect } from 'vitest';
import { Tower } from './Tower';
import { HeadlessScene } from '../headless/HeadlessScene';
import { getTowerType } from '../data/TowerTypes';

function makeTower(): Tower {
  const scene = new HeadlessScene();
  return new Tower(scene as any, 5, 5, getTowerType('arcane_bolt'));
}

describe('Tower.takeDamage (M10 finale destructibility)', () => {
  it('no-ops when destructible flag is not set (default for every existing mission)', () => {
    const t = makeTower();
    const killed = t.takeDamage(100);
    expect(killed).toBe(false);
    expect(t.hp).toBeUndefined(); // never assigned
    expect((t as { _expired?: boolean })._expired).toBeFalsy();
  });

  it('reduces hp on a destructible tower and does not set _expired above 0', () => {
    const t = makeTower();
    t.destructible = true;
    t.maxHp = 200;
    t.hp = 200;
    const killed = t.takeDamage(50);
    expect(killed).toBe(false);
    expect(t.hp).toBe(150);
    expect((t as { _expired?: boolean })._expired).toBeFalsy();
  });

  it('returns true and sets _expired exactly on the killing blow', () => {
    const t = makeTower();
    t.destructible = true;
    t.maxHp = 100;
    t.hp = 100;
    expect(t.takeDamage(30)).toBe(false);
    expect(t.takeDamage(30)).toBe(false);
    expect(t.takeDamage(50)).toBe(true); // overkill
    expect(t.hp).toBe(0);
    expect((t as { _expired?: boolean })._expired).toBe(true);
  });

  it('does not double-fire the killing blow (subsequent calls return false)', () => {
    const t = makeTower();
    t.destructible = true;
    t.maxHp = 50;
    t.hp = 50;
    expect(t.takeDamage(60)).toBe(true);
    expect(t.takeDamage(10)).toBe(false); // already dead
    expect(t.takeDamage(10)).toBe(false);
  });

  it('clamps hp to 0 instead of going negative', () => {
    const t = makeTower();
    t.destructible = true;
    t.maxHp = 30;
    t.hp = 30;
    t.takeDamage(999);
    expect(t.hp).toBe(0);
  });
});
