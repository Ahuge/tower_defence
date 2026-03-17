export type MatchMode = 'sprint' | 'standard' | 'marathon';

export interface WaveCreepGroup {
  creepType: string;
  count: number;
  hpScale: number;
  speedScale: number;
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

    if (waveNum <= 3) {
      // Early: just standard
      groups.push({ creepType: 'standard', count: 5 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 6) {
      // Introduce fast
      groups.push({ creepType: 'standard', count: 4 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 9) {
      // Introduce armored + group
      groups.push({ creepType: 'standard', count: 3 + waveNum, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 8) {
        groups.push({ creepType: 'group', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (waveNum <= 15) {
      // Introduce swarm, evasive, splitter
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.7), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 12) {
        groups.push({ creepType: 'evasive', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (waveNum >= 14) {
        groups.push({ creepType: 'splitter', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (waveNum <= 20) {
      // Introduce mages, flying
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.5), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'splitter', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 18) {
        groups.push({ creepType: 'healer', count: 1, hpScale: baseHp, speedScale: baseSpeed });
        // Mage type rotates
        const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion'];
        groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (waveNum >= 19) {
        groups.push({ creepType: 'flying', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else {
      // Late game: everything
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.4), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'splitter', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'group', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'flying', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      // Rotating mage
      const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion'];
      groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
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
      return generateStandardWaves(100);
  }
}
