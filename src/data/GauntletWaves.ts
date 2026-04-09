/**
 * GauntletWaves — generates 10 waves per stage for Faction Gauntlet mode.
 *
 * Each stage's waves use the target faction's creep types.
 * Wave composition progresses from easy (1-3) to mid (4-6) to hard (7-9) to boss (10).
 * Stage scaling increases HP, speed, and count as stages progress.
 */
import { WaveDefinition, WaveCreepGroup } from './WaveDefinitions';
import { DIFFICULTIES, DifficultyLevel } from './Difficulty';

/** Stage scaling multipliers (1-indexed: stage 1 = index 0) */
const STAGE_SCALING = [
  { hpMult: 1.0,  speedMult: 1.0,  extraCount: 0 },  // Stage 1
  { hpMult: 1.15, speedMult: 1.05, extraCount: 0 },  // Stage 2
  { hpMult: 1.3,  speedMult: 1.1,  extraCount: 0 },  // Stage 3
  { hpMult: 1.5,  speedMult: 1.15, extraCount: 0 },  // Stage 4
  { hpMult: 1.7,  speedMult: 1.2,  extraCount: 1 },  // Stage 5
  { hpMult: 2.0,  speedMult: 1.25, extraCount: 0 },  // Stage 6
  { hpMult: 2.3,  speedMult: 1.3,  extraCount: 2 },  // Stage 7
  { hpMult: 2.7,  speedMult: 1.35, extraCount: 0 },  // Stage 8
  { hpMult: 3.2,  speedMult: 1.4,  extraCount: 3 },  // Stage 9
  { hpMult: 4.0,  speedMult: 1.5,  extraCount: 4 },  // Stage 10
];

/** Base HP per wave within a stage (wave 1-10) */
const WAVE_BASE_HP = [30, 45, 60, 90, 120, 150, 200, 260, 340, 500];

/** Base count per wave */
const WAVE_BASE_COUNT = [6, 8, 12, 8, 10, 6, 8, 6, 5, 3];

/**
 * Wave templates — which creep types appear in each wave of a stage.
 * Each wave can have 1-3 groups of different types.
 */
const WAVE_TEMPLATES: { types: string[]; counts: number[] }[] = [
  // Wave 1: Standard only (introduction)
  { types: ['standard'], counts: [6] },
  // Wave 2: Fast rush
  { types: ['fast', 'standard'], counts: [4, 4] },
  // Wave 3: Swarm flood
  { types: ['swarm', 'fast'], counts: [12, 2] },
  // Wave 4: Armored push
  { types: ['armored', 'standard'], counts: [4, 4] },
  // Wave 5: Group + Healer support
  { types: ['group', 'healer'], counts: [8, 2] },
  // Wave 6: Shielded + Armored wall
  { types: ['shielded', 'armored'], counts: [4, 3] },
  // Wave 7: Evasive + Regenerator
  { types: ['evasive', 'regenerator'], counts: [5, 3] },
  // Wave 8: Flying + Mages
  { types: ['flying', 'mage_speed', 'mage_heal'], counts: [4, 2, 1] },
  // Wave 9: Everything hard
  { types: ['splitter', 'mage_armor', 'mage_evasion', 'evasive'], counts: [3, 2, 1, 3] },
  // Wave 10: BOSS + escort
  { types: ['boss', 'healer', 'shielded', 'mage_heal'], counts: [1, 2, 2, 1] },
];

/**
 * Generate 10 waves for a gauntlet stage.
 * @param stageIndex 0-based stage number (0-9)
 * @param difficulty Game difficulty level
 * @returns Array of 10 WaveDefinitions
 */
export function generateGauntletWaves(
  stageIndex: number,
  difficulty: DifficultyLevel,
): WaveDefinition[] {
  const scaling = STAGE_SCALING[Math.min(stageIndex, STAGE_SCALING.length - 1)];
  const diffHints = DIFFICULTIES[difficulty];
  const waves: WaveDefinition[] = [];

  for (let w = 0; w < 10; w++) {
    const template = WAVE_TEMPLATES[w];
    const baseHp = WAVE_BASE_HP[w];
    const baseCount = WAVE_BASE_COUNT[w];

    const groups: WaveCreepGroup[] = [];
    for (let g = 0; g < template.types.length; g++) {
      const creepType = template.types[g];
      const templateCount = template.counts[g];

      // Scale count with difficulty + stage
      let count = Math.round(templateCount * diffHints.count);
      count += scaling.extraCount;
      count = Math.max(1, count);

      // Scale HP with difficulty + stage
      const hpScale = baseHp * diffHints.toughness * scaling.hpMult;

      // Scale speed with difficulty + stage
      const speedScale = diffHints.speed * scaling.speedMult;

      groups.push({ creepType, count, hpScale, speedScale });
    }

    const spawnInterval = w === 9 ? 300 : w < 3 ? 600 : 400;

    waves.push({
      wave: w + 1,
      groups,
      spawnInterval,
      isBoss: w === 9,
    });
  }

  return waves;
}

/** Get the total wave number for display (1-100) */
export function getGlobalWaveNumber(stageIndex: number, waveInStage: number): number {
  return stageIndex * 10 + waveInStage + 1;
}

export { STAGE_SCALING };
