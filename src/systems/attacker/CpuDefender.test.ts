import { describe, it, expect } from 'vitest';
import { getDifficultyConfig } from './CpuDefender';

describe('getDifficultyConfig', () => {
  it('easy: half treasury', () => {
    expect(getDifficultyConfig('easy')).toEqual({ treasuryMult: 0.5 });
  });

  it('normal: full treasury', () => {
    expect(getDifficultyConfig('normal')).toEqual({ treasuryMult: 1.0 });
  });

  it('hard: 1.5x treasury', () => {
    expect(getDifficultyConfig('hard')).toEqual({ treasuryMult: 1.5 });
  });
});
