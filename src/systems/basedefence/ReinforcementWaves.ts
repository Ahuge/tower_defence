import { Grid } from '../Grid';
import { UnitManager } from './UnitManager';
import { COMBAT_UNIT_TYPES, CombatUnitDef } from '../../data/basedefence/CombatUnitTypes';
import { DifficultyLevel } from '../../data/Difficulty';
import { TILE_SIZE } from '../../config';

/** Time between reinforcement waves (seconds) */
const WAVE_INTERVAL = 90;

/** First wave time by difficulty */
const FIRST_WAVE_BY_DIFFICULTY: Record<DifficultyLevel, number> = {
  easy: 240,   // 4 min
  normal: 180, // 3 min
  hard: 120,   // 2 min
  insane: 60,  // 1 min
};

/**
 * Spawns periodic reinforcement waves that attack-move toward the player base.
 * Units spawn near the CPU base (guaranteed connected) and walk to the player.
 */
export class ReinforcementWaves {
  private grid: Grid;
  private unitMgr: UnitManager;
  private playerBaseCol: number;
  private playerBaseRow: number;
  private cpuBaseCol: number;
  private cpuBaseRow: number;

  private timer: number = 0;
  private waveNumber: number = 0;
  private unitPool: CombatUnitDef[];

  constructor(
    grid: Grid,
    unitMgr: UnitManager,
    playerBaseCol: number,
    playerBaseRow: number,
    cpuBaseCol: number,
    cpuBaseRow: number,
    difficulty: DifficultyLevel = 'normal',
  ) {
    this.grid = grid;
    this.unitMgr = unitMgr;
    this.playerBaseCol = playerBaseCol;
    this.playerBaseRow = playerBaseRow;
    this.cpuBaseCol = cpuBaseCol;
    this.cpuBaseRow = cpuBaseRow;
    this.unitPool = Object.values(COMBAT_UNIT_TYPES);
    const firstWaveTime = FIRST_WAVE_BY_DIFFICULTY[difficulty];
    this.timer = WAVE_INTERVAL - firstWaveTime;
  }

  update(deltaSec: number): void {
    this.timer += deltaSec;

    if (this.timer >= WAVE_INTERVAL) {
      this.timer = 0;
      this.waveNumber++;
      this.spawnWave();
    }
  }

  private spawnWave(): void {
    const baseCount = 2 + Math.floor(this.waveNumber * 0.8);
    const count = Math.min(baseCount, 15);

    for (let i = 0; i < count; i++) {
      const def = this.pickUnitForWave();

      // Spawn near the CPU base — find a walkable tile in a ring around it
      const { col, row } = this.findSpawnNearBase();

      const unit = this.unitMgr.spawnCombatUnit('cpu', def, col, row);
      const pathOk = unit.attackMoveTo(this.playerBaseCol, this.playerBaseRow);
      if (!pathOk) {
        // Fallback: walk directly toward player base (no pathfinding, just beeline)
        unit.directMoveX = this.playerBaseCol * TILE_SIZE + TILE_SIZE / 2;
        unit.directMoveY = this.playerBaseRow * TILE_SIZE + TILE_SIZE / 2;
        unit.directMoveActive = true;
        unit.attackMove = true;
        unit.state = 'moving';
      }
    }
  }

  /** Find a walkable tile near the CPU base for spawning */
  private findSpawnNearBase(): { col: number; row: number } {
    // Search in expanding ring around CPU base
    for (let radius = 5; radius < 20; radius++) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const col = Math.round(this.cpuBaseCol + Math.cos(angle) * radius);
        const row = Math.round(this.cpuBaseRow + Math.sin(angle) * radius);
        if (col >= 1 && col < this.grid.cols - 1 && row >= 1 && row < this.grid.rows - 1) {
          if (this.grid.isWalkable(col, row)) {
            return { col, row };
          }
        }
      }
    }
    // Absolute fallback
    return { col: this.cpuBaseCol + 5, row: this.cpuBaseRow + 5 };
  }

  private pickUnitForWave(): CombatUnitDef {
    const cheapUnits = this.unitPool.filter(u => u.role !== 'heavy');

    if (this.waveNumber <= 2) {
      return cheapUnits[Math.floor(Math.random() * cheapUnits.length)];
    }

    const heavyChance = Math.min(0.4, this.waveNumber * 0.05);
    if (Math.random() < heavyChance) {
      const heavies = this.unitPool.filter(u => u.role === 'heavy');
      if (heavies.length > 0) {
        return heavies[Math.floor(Math.random() * heavies.length)];
      }
    }

    return this.unitPool[Math.floor(Math.random() * this.unitPool.length)];
  }

  getStatus(): { wave: number; nextIn: number } {
    return {
      wave: this.waveNumber,
      nextIn: Math.max(0, WAVE_INTERVAL - this.timer),
    };
  }
}
