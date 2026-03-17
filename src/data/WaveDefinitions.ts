export type MatchMode = 'sprint' | 'standard' | 'marathon';

export interface WaveCreepGroup {
  creepType: string;
  count: number;
  hpScale: number; // multiplier on base hp for this wave
  speedScale: number; // multiplier on base speed
}

export interface WaveDefinition {
  wave: number;
  groups: WaveCreepGroup[];
  spawnInterval: number;
  isBoss: boolean;
}

function generateStandardWaves(count: number): WaveDefinition[] {
  const waves: WaveDefinition[] = [];

  for (let i = 0; i < count; i++) {
    const waveNum = i + 1;
    const baseHp = 20 + waveNum * 8;
    const baseSpeed = 1 + waveNum * 0.02;
    const interval = Math.max(200, 600 - waveNum * 10);

    // Boss waves every 10
    if (waveNum % 10 === 0) {
      waves.push({
        wave: waveNum,
        groups: [{ creepType: 'boss', count: 1, hpScale: baseHp, speedScale: 1 }],
        spawnInterval: 0,
        isBoss: true,
      });
      continue;
    }

    const groups: WaveCreepGroup[] = [];

    // Mix creep types based on wave number
    if (waveNum <= 3) {
      groups.push({ creepType: 'standard', count: 5 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 6) {
      groups.push({ creepType: 'standard', count: 4 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 9) {
      groups.push({ creepType: 'standard', count: 3 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 1, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 15) {
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.8), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 12) {
        groups.push({ creepType: 'swarm', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (waveNum <= 20) {
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.6), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 18) {
        groups.push({ creepType: 'healer', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else {
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.5), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    }

    waves.push({ wave: waveNum, groups, spawnInterval: interval, isBoss: false });
  }

  return waves;
}

export function getWavesForMode(mode: MatchMode): WaveDefinition[] {
  switch (mode) {
    case 'sprint':
      return generateStandardWaves(15);
    case 'standard':
      return generateStandardWaves(30);
    case 'marathon':
      // Generate 100 waves with scaling
      return generateStandardWaves(100);
  }
}
