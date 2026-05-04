import { describe, it, expect } from 'vitest';
import { counterScore, getDifficultyConfig } from './CpuDefender';
import type { WaveDefinition } from '../../data/WaveDefinitions';

const wave = (groups: { creepType: string; count: number }[]): WaveDefinition => ({
  wave: 1,
  groups: groups.map(g => ({ ...g, hpScale: 1, speedScale: 1 })),
  spawnInterval: 0,
  isBoss: false,
});

describe('counterScore', () => {
  it('returns 1.0 for an empty wave', () => {
    expect(counterScore('arrow', wave([]))).toBe(1.0);
  });

  it('returns 1.0 for null wave (CPU has no info yet)', () => {
    expect(counterScore('arrow', null)).toBe(1.0);
  });

  it('falls back to 1.0 for an unknown tower id', () => {
    expect(counterScore('unknown_tower', wave([{ creepType: 'fast', count: 10 }]))).toBe(1.0);
  });

  it('rewards arrow towers vs fast/swarm waves', () => {
    expect(counterScore('arrow', wave([{ creepType: 'fast', count: 10 }]))).toBeGreaterThan(1.3);
  });

  it('penalises arrow towers vs heavy armored waves', () => {
    expect(counterScore('arrow', wave([{ creepType: 'armored', count: 10 }]))).toBeLessThan(0.7);
  });

  it('strongly favours sniper towers vs boss creeps', () => {
    expect(counterScore('sniper', wave([{ creepType: 'boss', count: 1 }]))).toBeGreaterThan(1.8);
  });

  it('weights by creep count when groups are mixed', () => {
    // Mostly fast, one sniper-target — arrow should still come out ahead.
    const mixed = wave([
      { creepType: 'fast', count: 10 },
      { creepType: 'boss', count: 1 },
    ]);
    expect(counterScore('arrow', mixed)).toBeGreaterThan(1.0);
    expect(counterScore('sniper', mixed)).toBeGreaterThan(0.5);
  });
});

describe('getDifficultyConfig', () => {
  it('easy: half treasury, no expansions', () => {
    expect(getDifficultyConfig('easy')).toEqual({ treasuryMult: 0.5, maxExpansions: 0 });
  });

  it('normal: full treasury, 2 expansions', () => {
    expect(getDifficultyConfig('normal')).toEqual({ treasuryMult: 1.0, maxExpansions: 2 });
  });

  it('hard: 1.5x treasury, 4 expansions', () => {
    expect(getDifficultyConfig('hard')).toEqual({ treasuryMult: 1.5, maxExpansions: 4 });
  });
});
