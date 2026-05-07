/**
 * v4.1 regression test: UniformWaveDirector must produce byte-identical
 * wave lists to the legacy static `getWavesForMode()` generator. If this
 * test fails, the v4 pivot has accidentally changed match behaviour.
 */
import { describe, it, expect } from 'vitest';
import { getWavesForMode } from '../../data/WaveDefinitions';
import { getWaveDirector, registerWaveDirector } from './WaveDirectorBrain';
import { UniformWaveDirector } from './wavedirectors/UniformWaveDirector';

// Side-effect register; safe to import multiple times.
import './wavedirectors/UniformWaveDirector';

describe('UniformWaveDirector', () => {
  it('registers under id "uniform"', () => {
    const d = getWaveDirector('uniform');
    expect(d).not.toBeNull();
    expect(d!.name).toBe('uniform');
  });

  it('produces byte-identical waves to getWavesForMode (standard, 20 waves)', () => {
    const director = new UniformWaveDirector();
    const fromDirector = director.materializeWaves({
      matchMode: 'standard',
      waveCount: 20,
      defenderFaction: 'arcane',
    });
    const fromStatic = getWavesForMode('standard', 20);
    expect(fromDirector).toEqual(fromStatic);
  });

  it('produces byte-identical waves for endless mode', () => {
    const director = new UniformWaveDirector();
    const fromDirector = director.materializeWaves({
      matchMode: 'endless',
      defenderFaction: 'mechanical',
    });
    const fromStatic = getWavesForMode('endless');
    expect(fromDirector).toEqual(fromStatic);
  });

  it('does not vary by defenderFaction (uniform = no faction awareness)', () => {
    const director = new UniformWaveDirector();
    const a = director.materializeWaves({ matchMode: 'standard', waveCount: 10, defenderFaction: 'arcane' });
    const b = director.materializeWaves({ matchMode: 'standard', waveCount: 10, defenderFaction: 'void' });
    expect(a).toEqual(b);
  });

  it('registry returns same factory results across calls', () => {
    const d1 = getWaveDirector('uniform');
    const d2 = getWaveDirector('uniform');
    expect(d1).not.toBeNull();
    expect(d2).not.toBeNull();
    expect(d1!.name).toBe(d2!.name);
  });

  it('registry returns null for unknown id', () => {
    expect(getWaveDirector('not-a-real-director')).toBeNull();
  });

  it('registerWaveDirector() lets new directors register at runtime', () => {
    const fakeDir = { name: 'test_fake', materializeWaves: () => [] };
    registerWaveDirector('test_fake', () => fakeDir);
    const looked = getWaveDirector('test_fake');
    expect(looked).not.toBeNull();
    expect(looked!.name).toBe('test_fake');
  });
});
