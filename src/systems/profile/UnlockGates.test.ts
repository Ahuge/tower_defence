import { describe, it, expect } from 'vitest';
import {
  isModeUnlocked, isMapUnlocked,
  modeUnlockLevel, mapUnlockLevel,
  factionLevelTier, unlocksAtLevel, nextUnlockHint,
} from './UnlockGates';

describe('UnlockGates — modes', () => {
  it('standard always unlocked', () => {
    expect(isModeUnlocked('standard', 1)).toBe(true);
    expect(isModeUnlocked('standard', 50)).toBe(true);
  });

  it('endless requires L5', () => {
    expect(isModeUnlocked('endless', 4)).toBe(false);
    expect(isModeUnlocked('endless', 5)).toBe(true);
  });

  it('hero_defense requires L8', () => {
    expect(isModeUnlocked('hero_defense', 7)).toBe(false);
    expect(isModeUnlocked('hero_defense', 8)).toBe(true);
  });

  it('career requires L15 (gated by Plan 15)', () => {
    expect(modeUnlockLevel('career')).toBe(15);
  });

  it('unknown modes default to unlocked', () => {
    expect(isModeUnlocked('unknown_mode', 1)).toBe(true);
  });
});

describe('UnlockGates — maps', () => {
  it('plains and tutorial always available', () => {
    expect(isMapUnlocked('plains', 1)).toBe(true);
    expect(isMapUnlocked('tutorial', 1)).toBe(true);
  });

  it('crossroads at L2', () => {
    expect(isMapUnlocked('crossroads', 1)).toBe(false);
    expect(isMapUnlocked('crossroads', 2)).toBe(true);
  });

  it('siege at L12', () => {
    expect(mapUnlockLevel('siege')).toBe(12);
  });
});

describe('UnlockGates — factionLevelTier', () => {
  it('arcane is root', () => {
    expect(factionLevelTier('arcane')).toEqual({ tier: 0, minLevel: 1 });
  });
  it('mech / nature / void are tier 1 at L3', () => {
    expect(factionLevelTier('mechanical').minLevel).toBe(3);
    expect(factionLevelTier('nature').minLevel).toBe(3);
    expect(factionLevelTier('void').minLevel).toBe(3);
  });
  it('celestial is capstone at L18', () => {
    expect(factionLevelTier('celestial')).toEqual({ tier: 3, minLevel: 18 });
  });
  it('chaos / random are tierless', () => {
    expect(factionLevelTier('chaos').tier).toBeNull();
    expect(factionLevelTier('random').tier).toBeNull();
  });
});

describe('UnlockGates — reveal hints', () => {
  it('L2 reveals frontier and crossroads', () => {
    const reveals = unlocksAtLevel(2);
    expect(reveals.find(r => r.id === 'frontier')).toBeTruthy();
    expect(reveals.find(r => r.id === 'crossroads')).toBeTruthy();
  });

  it('L5 reveals endless + draft + serpentine', () => {
    const reveals = unlocksAtLevel(5);
    expect(reveals.find(r => r.id === 'endless')).toBeTruthy();
    expect(reveals.find(r => r.id === 'draft')).toBeTruthy();
    expect(reveals.find(r => r.id === 'serpentine')).toBeTruthy();
  });

  it('nextUnlockHint finds the next non-empty level', () => {
    // Player at L1 — next unlock is L2.
    const hint = nextUnlockHint(1, 5);
    expect(hint?.level).toBe(2);
    expect(hint?.items.length).toBeGreaterThan(0);
  });

  it('nextUnlockHint returns null when nothing within lookahead', () => {
    // L50 with a 1-level lookahead — no L51 reveals.
    const hint = nextUnlockHint(50, 1);
    expect(hint).toBeNull();
  });
});
