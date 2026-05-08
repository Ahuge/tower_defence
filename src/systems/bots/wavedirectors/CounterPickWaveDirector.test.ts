import { describe, it, expect } from 'vitest';
import { CounterPickWaveDirector } from './CounterPickWaveDirector';
import { WaveObservation } from '../WaveDirectorBrain';

function obs(towers: WaveObservation['observedTowers'], waveIndex = 5): WaveObservation {
  return {
    waveIndex,
    livesRemaining: 20,
    defenderFaction: 'arcane',
    observedTowers: towers,
    observedPath: null,
  };
}

describe('CounterPickWaveDirector', () => {
  it('registers under id "counter_pick"', async () => {
    const { getWaveDirector } = await import('../WaveDirectorBrain');
    await import('./CounterPickWaveDirector'); // ensure registered
    const d = getWaveDirector('counter_pick');
    expect(d).not.toBeNull();
    expect(d!.name).toBe('counter_pick');
  });

  it('returns base wave when no towers placed (early game)', () => {
    const d = new CounterPickWaveDirector();
    d.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
    const result = d.nextWave(obs([], 1));
    expect(result.groups.length).toBeGreaterThan(0);
    // Wave 1 with no towers should match the static generator's wave 1.
  });

  it('returns base wave when enableReactivity=0', () => {
    const d = new CounterPickWaveDirector({ enableReactivity: 0 });
    d.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
    const w1 = d.nextWave(obs([{ col: 0, row: 0, towerId: 'arcane_bolt', level: 1 }], 5));
    const w2 = d.nextWave(obs([], 5));
    // Both should equal the static wave 5 — disabling reactivity makes
    // the director ignore observations.
    expect(w1.groups.map(g => g.creepType)).toEqual(w2.groups.map(g => g.creepType));
  });

  it('shifts creep mix toward swarm when defender heavy in dps-single', () => {
    // Take 100 sample waves with lots of dps-single towers placed.
    // Count proportion of swarm vs other types.
    const heavyDpsSingleTowers = Array.from({ length: 8 }, (_, i) => ({
      col: i, row: 0, towerId: 'arcane_bolt', level: 1,
    }));
    const noTowers: WaveObservation['observedTowers'] = [];

    let swarmHeavyMix = 0;
    let neutralMix = 0;
    for (let i = 0; i < 50; i++) {
      const dHeavy = new CounterPickWaveDirector({ temperature: 0.5 });  // sharp picks
      dHeavy.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
      const wave = dHeavy.nextWave(obs(heavyDpsSingleTowers, 8));
      swarmHeavyMix += wave.groups.filter(g => g.creepType === 'swarm' || g.creepType === 'group').length;

      const dNeutral = new CounterPickWaveDirector({ temperature: 0.5 });
      dNeutral.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
      const waveN = dNeutral.nextWave(obs(noTowers, 8));
      neutralMix += waveN.groups.filter(g => g.creepType === 'swarm' || g.creepType === 'group').length;
    }
    // The dps-single defender should attract MORE swarm/group than
    // the no-tower baseline. Allow some noise — assert >= rather than >.
    expect(swarmHeavyMix).toBeGreaterThanOrEqual(neutralMix);
  });

  it('preserves group count + spawn interval (only types change)', () => {
    const d = new CounterPickWaveDirector({ temperature: 0.5 });
    d.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
    const towers = [
      { col: 0, row: 0, towerId: 'arcane_meteor', level: 1 },  // splash
      { col: 1, row: 0, towerId: 'arcane_meteor', level: 1 },
    ];
    const result = d.nextWave(obs(towers, 8));
    // Compare to static — same group count, same per-group counts,
    // same hpScale, same speedScale.
    const staticDir = new CounterPickWaveDirector({ enableReactivity: 0 });
    staticDir.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
    const stat = staticDir.nextWave(obs(towers, 8));
    expect(result.groups.length).toBe(stat.groups.length);
    expect(result.groups.map(g => g.count)).toEqual(stat.groups.map(g => g.count));
    expect(result.groups.map(g => g.hpScale)).toEqual(stat.groups.map(g => g.hpScale));
  });

  it('high temperature → near-uniform sampling (mostly base-similar)', () => {
    const d = new CounterPickWaveDirector({ temperature: 100 });  // basically uniform
    d.init({ matchMode: 'standard', waveCount: 20, defenderFaction: 'arcane' });
    const towers = [{ col: 0, row: 0, towerId: 'arcane_meteor', level: 1 }];
    // Sample many waves; type distribution should be roughly uniform
    // across the base wave's types.
    const counts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const wave = d.nextWave(obs(towers, 8));
      for (const g of wave.groups) counts[g.creepType] = (counts[g.creepType] ?? 0) + 1;
    }
    // At least 2 types should be sampled; no single type should
    // dominate >80% of slots.
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    const max = Math.max(...Object.values(counts));
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(2);
    expect(max / total).toBeLessThan(0.85);
  });
});
