export type MatchMode = 'standard' | 'endless' | 'battle' | 'hero_defense' | 'circle_coop' | 'gauntlet' | 'tutorial' | 'attacker';

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
    const baseHp = Math.round(20 + waveNum * 8 + waveNum * waveNum * 0.4);
    const baseSpeed = 1 + waveNum * 0.02;
    const interval = Math.max(150, 600 - waveNum * 12);

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
      if (waveNum >= 13) {
        groups.push({ creepType: 'shielded', count: 1, hpScale: baseHp, speedScale: baseSpeed });
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
      groups.push({ creepType: 'shielded', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (waveNum >= 18) {
        groups.push({ creepType: 'healer', count: 1, hpScale: baseHp, speedScale: baseSpeed });
        // Mage type rotates
        const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion', 'mage_heal'];
        groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (waveNum >= 19) {
        groups.push({ creepType: 'flying', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (waveNum <= 22) {
      // Wave 21-22: Healer + Armored packs (healers keep tanks alive)
      groups.push({ creepType: 'armored', count: 6, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'standard', count: Math.floor(waveNum * 0.4), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'shielded', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'mage_armor', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'mage_heal', count: 1, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 24) {
      // Wave 23-24: Speed + Swarm rush (overwhelming numbers)
      groups.push({ creepType: 'fast', count: 8, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 6, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'mage_speed', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'group', count: 3, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 26) {
      // Wave 25-26: Shielded + Heal + Regenerator (DPS check)
      groups.push({ creepType: 'shielded', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'regenerator', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'mage_heal', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'splitter', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    } else if (waveNum <= 28) {
      // Wave 27-28: Flying + Healer + Evasion (bypass maze + sustain)
      groups.push({ creepType: 'flying', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'mage_evasion', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'regenerator', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    } else {
      // Wave 29+: Everything mixed, maximum threat
      groups.push({ creepType: 'armored', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 6, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 5, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'shielded', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'regenerator', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'healer', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'flying', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'splitter', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'group', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      // Rotating mage
      const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion', 'mage_heal'];
      groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
    }

    waves.push({ wave: waveNum, groups, spawnInterval: interval, isBoss: false });
  }

  return waves;
}

/** Generate waves for endless mode with aggressive scaling */
export function generateEndlessWaves(startWave: number, count: number): WaveDefinition[] {
  const waves: WaveDefinition[] = [];
  const creepTypes = ['standard', 'fast', 'armored', 'swarm', 'evasive', 'shielded', 'splitter', 'regenerator', 'healer', 'flying', 'group'];
  const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion', 'mage_heal'];

  for (let i = 0; i < count; i++) {
    const waveNum = startWave + i;
    const baseHp = Math.round(20 + waveNum * 10 + waveNum * waveNum * 0.5 + Math.max(0, waveNum - 50) ** 2 * 0.3);
    const baseSpeed = Math.min(3.0, 1 + waveNum * 0.015);
    const creepCount = Math.min(30, 5 + Math.floor(waveNum * 0.5));
    const interval = Math.max(100, 600 - waveNum * 8);

    // Boss every 10 waves
    if (waveNum % 10 === 0) {
      waves.push({
        wave: waveNum,
        groups: [{ creepType: 'boss', count: 1, hpScale: baseHp * 2, speedScale: 1 }],
        spawnInterval: 0,
        isBoss: true,
      });
      continue;
    }

    const groups: WaveCreepGroup[] = [];

    // Mix of creep types that scales with wave number
    const availableTypes = creepTypes.slice(0, Math.min(creepTypes.length, 3 + Math.floor(waveNum / 5)));
    for (const ct of availableTypes) {
      const count = Math.max(1, Math.floor(creepCount / availableTypes.length));
      groups.push({ creepType: ct, count, hpScale: baseHp, speedScale: baseSpeed });
    }

    // Add mages after wave 15
    if (waveNum >= 15) {
      groups.push({ creepType: mageTypes[waveNum % mageTypes.length], count: 1 + Math.floor(waveNum / 30), hpScale: baseHp, speedScale: baseSpeed });
    }

    waves.push({ wave: waveNum, groups, spawnInterval: interval, isBoss: false });
  }

  return waves;
}

export function getWavesForMode(mode: MatchMode, waveCount?: number): WaveDefinition[] {
  switch (mode) {
    case 'standard':
      return generateStandardWaves(waveCount ?? 30);
    case 'endless':
      return generateEndlessWaves(1, 20); // initial batch; more appended at runtime
    case 'battle':
      return generateStandardWaves(waveCount ?? 30); // same wave structure, different economy
    case 'hero_defense':
      return generateStandardWaves(waveCount ?? 30).map(w => ({
        ...w,
        groups: w.groups.map(g => ({ ...g, count: g.count * 10 })),
        spawnInterval: Math.max(80, Math.round(w.spawnInterval * 0.4)),
      })); // 10x creeps, faster spawns — flood the arena
    case 'circle_coop':
      return generateStandardWaves(waveCount ?? 30); // same structure, leaked creeps forward to next player
    case 'gauntlet':
      return generateStandardWaves(10); // placeholder — actual waves come from GauntletMode.getStageWaves()
    case 'tutorial':
      return generateTutorialWaves();
    case 'attacker':
      // Attacker mode reuses Standard wave shapes — the player's
      // creeps follow the normal spawn cadence. The role-reversal
      // is handled at the GameScene level (no player tower
      // placement, leaks count as attacker score).
      return generateStandardWaves(waveCount ?? 10);
  }
}

/**
 * Three hand-tuned waves for the onboarding tutorial match.
 * Wave 1: 5 slow standards — one Arcane Bolt is enough. Builds confidence.
 * Wave 2: 8 standards + 2 fast — rewards the second tower / first upgrade.
 * Wave 3: 12 standards + 1 heavy — rewards sends/frontier spend from earlier steps.
 * No boss flag, no mages/flyers — tutorial stays inside the lesson scope.
 */
function generateTutorialWaves(): WaveDefinition[] {
  return [
    {
      wave: 1,
      groups: [{ creepType: 'standard', count: 5, hpScale: 24, speedScale: 0.85 }],
      spawnInterval: 650,
      isBoss: false,
    },
    {
      // Wave 2 leans into fast creeps so the tutorial's Frost slow
      // effect is visibly useful — you can actually see the fast
      // units crawl through the slow zone.
      wave: 2,
      groups: [
        { creepType: 'standard', count: 6, hpScale: 32, speedScale: 0.9 },
        { creepType: 'fast',     count: 5, hpScale: 24, speedScale: 1.0 },
      ],
      spawnInterval: 520,
      isBoss: false,
    },
    {
      wave: 3,
      groups: [
        { creepType: 'standard', count: 12, hpScale: 44, speedScale: 0.95 },
        { creepType: 'armored',  count: 1,  hpScale: 90, speedScale: 0.8 },
      ],
      spawnInterval: 480,
      isBoss: false,
    },
  ];
}
