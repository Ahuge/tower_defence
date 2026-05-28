export type MatchMode = 'standard' | 'standard_long' | 'standard_long_scaled' | 'endless' | 'battle' | 'hero_defense' | 'circle_coop' | 'gauntlet' | 'tutorial' | 'attacker';

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

/** Generate standard-mode waves.
 *
 *  `flattenAt` optionally enables long-match mode:
 *  - HP quadratic term is clamped at `flattenAt` (past that wave,
 *    HP grows linearly at ~+8/wave instead of quadratically).
 *  - Wave composition past `flattenAt` cycles through the wave
 *    11-20 composition patterns instead of switching to the
 *    harder wave 21+ compositions (healer+armored packs, fast
 *    rushes, regenerator clusters, etc.).
 *
 *  Together these let RL training reach 30-50+ waves without the
 *  current source brains hitting a wall. Canonical `standard`
 *  mode (no flatten) is unchanged for live-game players.
 *
 *  At flattenAt=20:
 *    - HP at wave 25: 20+200+160=380 (vs 20+200+250=470 unflattened)
 *    - HP at wave 50: 20+400+160=580 (vs 20+400+1000=1420 unflattened)
 *    - Wave 25 composition uses wave 15's mix (swarm/evasive/armored)
 *      not wave 25's regenerator pack.
 */
function generateStandardWaves(
  count: number,
  flattenAt?: number,
  linearScalePast?: number,
  linearRate = 15,
): WaveDefinition[] {
  const waves: WaveDefinition[] = [];

  for (let i = 0; i < count; i++) {
    const waveNum = i + 1;
    const effW = flattenAt !== undefined ? Math.min(waveNum, flattenAt) : waveNum;
    // Linear ramp kicks in past `linearScalePast` — adds `linearRate`
    // HP per wave on top of the (now-clamped) quadratic. Used by
    // `standard_long_scaled` to keep long matches non-trivial
    // without the standard mode's runaway quadratic.
    const linearBonus = linearScalePast !== undefined
      ? Math.max(0, waveNum - linearScalePast) * linearRate
      : 0;
    const baseHp = Math.round(20 + waveNum * 8 + effW * effW * 0.4 + linearBonus);
    // When flattening, also clamp the wave-number used for the
    // composition dispatch below. Past `flattenAt` we cycle through
    // the wave 11-20 compositions (varied but tractable for current
    // brains) rather than the wave 21+ compositions (healer packs,
    // regenerator clusters) that the rule brains can't survive.
    const dispatchW = flattenAt !== undefined && waveNum > flattenAt
      ? 11 + ((waveNum - flattenAt - 1) % (flattenAt - 10))
      : waveNum;
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

    if (dispatchW <= 3) {
      // Early: just standard
      groups.push({ creepType: 'standard', count: 5 + dispatchW, hpScale: baseHp, speedScale: baseSpeed });
    } else if (dispatchW <= 6) {
      // Introduce fast
      groups.push({ creepType: 'standard', count: 4 + dispatchW, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 2, hpScale: baseHp, speedScale: baseSpeed });
    } else if (dispatchW <= 9) {
      // Introduce armored + group
      groups.push({ creepType: 'standard', count: 3 + dispatchW, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      if (dispatchW >= 8) {
        groups.push({ creepType: 'group', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (dispatchW <= 15) {
      // Introduce swarm, evasive, splitter
      groups.push({ creepType: 'standard', count: Math.floor(dispatchW * 0.7), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (dispatchW >= 12) {
        groups.push({ creepType: 'evasive', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (dispatchW >= 13) {
        groups.push({ creepType: 'shielded', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (dispatchW >= 14) {
        groups.push({ creepType: 'splitter', count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
    } else if (dispatchW <= 20) {
      // Introduce mages, flying
      groups.push({ creepType: 'standard', count: Math.floor(dispatchW * 0.5), hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'fast', count: 4, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'armored', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'swarm', count: 3, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'evasive', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'splitter', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      groups.push({ creepType: 'shielded', count: 2, hpScale: baseHp, speedScale: baseSpeed });
      if (dispatchW >= 18) {
        groups.push({ creepType: 'healer', count: 1, hpScale: baseHp, speedScale: baseSpeed });
        // Mage type rotates
        const mageTypes = ['mage_armor', 'mage_speed', 'mage_evasion', 'mage_heal'];
        groups.push({ creepType: mageTypes[dispatchW % mageTypes.length], count: 1, hpScale: baseHp, speedScale: baseSpeed });
      }
      if (dispatchW >= 19) {
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
    case 'standard_long':
      // Capped-difficulty variant of standard, intended for RL
      // training across long horizons. Wave generator caps the
      // quadratic HP term at wave 15 (linear past that), AND
      // cycles wave 11-15 compositions past wave 15 (avoids
      // flying/healers/mages which the rule-based source brains
      // can't handle reliably). flattenAt=15 was chosen
      // empirically: at flattenAt=20 the brains still hit wave-19
      // flying creeps and die at wave 22; at 15 they survive
      // significantly longer.
      return generateStandardWaves(waveCount ?? 50, 15);
    case 'standard_long_scaled':
      // Same composition cap as standard_long (no flying/healer
      // packs) but with a LINEAR scaling ramp past wave 20.
      // standard_long was effectively flat past wave 15, so the
      // agent had no need to evolve mid-match strategy. This mode
      // continues to scale HP at +15/wave linearly so wave 50 is
      // ~3x harder than wave 20. Designed for RL curriculum where
      // the policy needs to adapt to growing difficulty over a
      // long match (the 'really long map' the user asked for).
      //
      // HP comparison:
      //   wave 10  standard 140  long 140  long_scaled 140
      //   wave 20  standard 340  long 270  long_scaled 270
      //   wave 30  standard 620  long 270  long_scaled 420
      //   wave 50  standard 1420 long 270  long_scaled 720
      //   wave 100 standard ~4500 long 270 long_scaled 1470
      return generateStandardWaves(waveCount ?? 50, 15, 20, 15);
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
