import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridX, gridY } from '../../config';
import { Grid } from '../Grid';
import { findPath, PathPoint } from '../Pathfinding';
import { VersusManager } from './VersusManager';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { CREEP_TYPES } from '../../data/CreepTypes';
import { WaveDefinition } from '../../data/WaveDefinitions';
import { DifficultyHints } from '../../data/Difficulty';
import { MapDefinition } from '../../data/Maps';

interface SimCreep {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  path: PathPoint[];
  alive: boolean;
  reached: boolean;
  color: number;
  size: number;
  isBoss: boolean;
  typeId: string;
}

/**
 * Lightweight simulation of the opponent's game.
 * Maintains a shadow grid from their tower placements,
 * spawns mirrored creeps, and moves them through their maze.
 * Creep deaths are approximate (based on rough tower DPS).
 */
export class OpponentSimulation {
  private grid: Grid;
  private versus: VersusManager;
  private difficulty: DifficultyHints;
  private mapDef: MapDefinition;
  creeps: SimCreep[] = [];
  private spawnQueue: { typeId: string; hp: number; speed: number }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 500;
  private paths: (PathPoint[] | null)[] = [];
  private waveActive: boolean = false;

  // Rough tower DPS estimate for killing creeps
  private totalDps: number = 0;

  constructor(versus: VersusManager, mapDef: MapDefinition, difficulty: DifficultyHints) {
    this.versus = versus;
    this.mapDef = mapDef;
    this.difficulty = difficulty;
    this.grid = new Grid(mapDef);
    this.recalcPaths();
  }

  /** Rebuild grid from opponent's current tower list */
  rebuildGrid(): void {
    this.grid = new Grid(this.mapDef);
    for (const t of this.versus.opponentTowers) {
      const towerDef = TOWER_TYPES[t.towerId];
      // Mobile towers don't block grid
      if (towerDef?.traits.some(tr => tr.id === 'mobile_unit')) continue;
      if (t.col >= 0 && t.col < GRID_COLS && t.row >= 0 && t.row < GRID_ROWS) {
        this.grid.placeTower(t.col, t.row);
      }
    }
    this.recalcPaths();
    this.estimateDps();
  }

  private recalcPaths(): void {
    this.paths = [];
    for (const entry of this.grid.entries) {
      for (const exit of this.grid.exits) {
        this.paths.push(findPath(this.grid, entry, exit));
      }
    }
  }

  /** Estimate total tower DPS for rough creep killing */
  private estimateDps(): void {
    this.totalDps = 0;
    for (const t of this.versus.opponentTowers) {
      const def = TOWER_TYPES[t.towerId];
      if (!def || def.damage === 0) continue;
      const fireRate = def.fireRate;
      if (fireRate >= 99999) continue;
      const dps = (def.damage * (t.level ?? 1)) / (fireRate / 1000);
      this.totalDps += dps;
    }
  }

  /** Start spawning creeps for a wave (mirrored from wave definition) */
  startWave(waveDef: WaveDefinition): void {
    this.rebuildGrid();
    this.spawnQueue = [];

    for (const group of waveDef.groups) {
      const ct = CREEP_TYPES[group.creepType];
      if (!ct) continue;
      const resolved = ct.applyDifficulty(this.difficulty);
      const count = Math.round(group.count * (ct.count || 1) * resolved.countMult);

      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({
          typeId: group.creepType,
          hp: Math.round(group.hpScale * ct.hpMultiplier * resolved.hpMult),
          speed: 80 * group.speedScale * ct.speedMultiplier * resolved.speedMult,
        });
      }
    }

    this.spawnInterval = waveDef.spawnInterval || 500;
    this.spawnTimer = 0;
    this.waveActive = true;
  }

  /** Update simulation — spawn, move, kill creeps */
  update(delta: number): void {
    // Spawn
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const entry = this.spawnQueue.shift()!;
        const ct = CREEP_TYPES[entry.typeId];
        const pathIdx = this.paths.length > 1
          ? Math.floor(Math.random() * this.paths.length)
          : 0;
        const path = this.paths[pathIdx];
        if (path && path.length >= 2) {
          this.creeps.push({
            x: gridX(path[0].col),
            y: gridY(path[0].row),
            hp: entry.hp,
            maxHp: entry.hp,
            speed: entry.speed,
            pathIndex: 1,
            path,
            alive: true,
            reached: false,
            color: ct?.color ?? 0xff4444,
            size: ct?.size ?? 1,
            isBoss: entry.typeId === 'boss',
            typeId: entry.typeId,
          });
        }
        this.spawnTimer = this.spawnInterval;
      }
    }

    // Move and approximate kills
    const dpsPerCreep = this.creeps.filter(c => c.alive && !c.reached).length > 0
      ? this.totalDps / Math.max(1, this.creeps.filter(c => c.alive && !c.reached).length)
      : 0;

    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;

      // Approximate damage from towers
      creep.hp -= dpsPerCreep * (delta / 1000);
      if (creep.hp <= 0) {
        creep.alive = false;
        continue;
      }

      // Move along path
      if (creep.pathIndex >= creep.path.length) {
        creep.reached = true;
        continue;
      }

      const target = creep.path[creep.pathIndex];
      const tx = gridX(target.col);
      const ty = gridY(target.row);
      const dx = tx - creep.x;
      const dy = ty - creep.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = creep.speed * (delta / 1000);

      if (dist <= move) {
        creep.x = tx;
        creep.y = ty;
        creep.pathIndex++;
      } else if (dist > 0) {
        creep.x += (dx / dist) * move;
        creep.y += (dy / dist) * move;
      }
    }

    // Clean up dead/reached
    this.creeps = this.creeps.filter(c => c.alive && !c.reached);

    // Check if wave is done
    if (this.waveActive && this.spawnQueue.length === 0 && this.creeps.length === 0) {
      this.waveActive = false;
    }
  }

  isWaveActive(): boolean {
    return this.waveActive;
  }
}
