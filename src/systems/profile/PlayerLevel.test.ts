import { describe, it, expect } from 'vitest';
import {
  xpToNext, totalXpForLevel, levelFromXp, xpProgressInLevel, xpForGameEnd,
  SOFT_LEVEL_CAP,
} from './PlayerLevel';

describe('PlayerLevel — XP curve', () => {
  it('xpToNext is linear in level', () => {
    expect(xpToNext(1)).toBe(200);
    expect(xpToNext(2)).toBe(400);
    expect(xpToNext(10)).toBe(2000);
    expect(xpToNext(50)).toBe(10000);
  });

  it('totalXpForLevel sums correctly', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(200);
    expect(totalXpForLevel(3)).toBe(600);
    expect(totalXpForLevel(4)).toBe(1200);
    // L20 == sum 1..19 of (200*i) = 200 * 19*20/2 = 38000
    expect(totalXpForLevel(20)).toBe(38000);
  });

  it('levelFromXp matches totalXpForLevel boundaries', () => {
    for (let l = 1; l <= 20; l++) {
      expect(levelFromXp(totalXpForLevel(l))).toBe(l);
      expect(levelFromXp(totalXpForLevel(l) + 1)).toBe(l);
      if (l > 1) expect(levelFromXp(totalXpForLevel(l) - 1)).toBe(l - 1);
    }
  });

  it('soft-caps at SOFT_LEVEL_CAP', () => {
    // Wildly more than enough XP to "reach" L1000.
    expect(levelFromXp(10_000_000)).toBe(SOFT_LEVEL_CAP);
  });

  it('xpProgressInLevel splits into current+required correctly', () => {
    // 100 XP at L1 → halfway through L1.
    const a = xpProgressInLevel(100);
    expect(a.level).toBe(1);
    expect(a.current).toBe(100);
    expect(a.required).toBe(200);
    // 250 XP → L2 with 50 progress.
    const b = xpProgressInLevel(250);
    expect(b.level).toBe(2);
    expect(b.current).toBe(50);
    expect(b.required).toBe(400);
  });
});

describe('PlayerLevel — XP awards', () => {
  const baseCtx = {
    mode: 'standard' as const,
    result: 'victory' as const,
    wave: 30,
    difficulty: 'normal' as const,
    faction: 'arcane',
    mapId: 'plains',
    waveCount: 30,
    firstFactionPlay: false,
    firstMapWin: false,
  };

  it('Standard 30 win on Normal = 150', () => {
    expect(xpForGameEnd(baseCtx).amount).toBe(150);
  });

  it('Standard 15 win on Easy = 50', () => {
    expect(xpForGameEnd({ ...baseCtx, waveCount: 15, difficulty: 'easy' }).amount).toBe(50);
  });

  it('Standard 30 win on Hard = 225 (1.5x)', () => {
    expect(xpForGameEnd({ ...baseCtx, difficulty: 'hard' }).amount).toBe(225);
  });

  it('Standard 30 win on Insane = 300 (2.0x)', () => {
    expect(xpForGameEnd({ ...baseCtx, difficulty: 'insane' }).amount).toBe(300);
  });

  it('Hero Defense win = 200', () => {
    expect(xpForGameEnd({ ...baseCtx, mode: 'hero_defense', waveCount: undefined }).amount).toBe(200);
  });

  it('Gauntlet win = 800', () => {
    expect(xpForGameEnd({ ...baseCtx, mode: 'gauntlet', waveCount: 100 }).amount).toBe(800);
  });

  it('first faction adds 50, first map win adds 25', () => {
    const r = xpForGameEnd({ ...baseCtx, firstFactionPlay: true, firstMapWin: true });
    expect(r.amount).toBe(150 + 50 + 25);
    expect(r.reason).toContain('first-faction');
    expect(r.reason).toContain('first-map-win');
  });

  it('defeat at wave 4 awards 0 (engagement floor)', () => {
    const r = xpForGameEnd({ ...baseCtx, result: 'defeat', wave: 4 });
    expect(r.amount).toBe(0);
  });

  it('defeat at wave 10 awards 10', () => {
    const r = xpForGameEnd({ ...baseCtx, result: 'defeat', wave: 10 });
    expect(r.amount).toBe(10);
  });
});
