import { TILE_SIZE } from '../config';
import { Creep } from '../entities/Creep';
import { PathPoint } from './Pathfinding';
import { WaveDefinition } from '../data/WaveDefinitions';
import { CREEP_TYPES } from '../data/CreepTypes';
import { DifficultyHints } from '../data/Difficulty';
import { EventBus } from './EventBus';

/** Simple seeded PRNG for deterministic wave spawning */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface SpawnEntry {
  creepType: string;
  hpScale: number;
  speedScale: number;
  isBoss: boolean;
  groupBurst: number;
  pathIndex: number; // which path/entry to use
}

export class SpawnManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private spawnQueue: SpawnEntry[] = [];
  spawnTimer: number = 0;
  private spawnInterval: number = 0;
  private difficulty: DifficultyHints;
  private flyingPath: PathPoint[] | null = null;
  private seed: number;
  private rng: () => number;

  constructor(scene: Phaser.Scene, events: EventBus, difficulty: DifficultyHints, seed: number = 0) {
    this.scene = scene;
    this.events = events;
    this.difficulty = difficulty;
    this.seed = seed || Math.floor(Math.random() * 999999);
    this.rng = seededRandom(this.seed);
  }

  setFlyingPath(entry: { col: number; row: number }, exit: { col: number; row: number }): void {
    this.flyingPath = [
      { col: entry.col, row: entry.row },
      { col: exit.col, row: exit.row },
    ];
  }

  startWave(waveDef: WaveDefinition, numPaths: number = 1): void {
    this.spawnQueue = [];

    for (const group of waveDef.groups) {
      const ct = CREEP_TYPES[group.creepType];
      if (!ct) continue;

      const resolved = ct.applyDifficulty(this.difficulty);
      const baseCount = group.count * (ct.count || 1);
      const actualCount = Math.round(baseCount * resolved.countMult);

      for (let i = 0; i < actualCount; i++) {
        const groupBurst = ct.spawnBehavior === 'group' ? 4 : 1;
        // Distribute creeps across paths (round-robin)
        const pathIndex = numPaths > 1 ? (i % numPaths) : 0;
        this.spawnQueue.push({
          creepType: group.creepType,
          hpScale: group.hpScale * resolved.hpMult,
          speedScale: group.speedScale * resolved.speedMult,
          isBoss: waveDef.isBoss,
          groupBurst,
          pathIndex,
        });
      }
    }

    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }

    this.spawnInterval = waveDef.spawnInterval;
    this.spawnTimer = 0;
  }

  /** Pass all available paths. Creeps spawn from the path matching their pathIndex. */
  update(delta: number, allPaths: (PathPoint[] | null)[], creeps: Creep[]): void {
    if (this.spawnQueue.length === 0) return;
    // Need at least one valid path
    if (!allPaths.some(p => p !== null)) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const entry = this.spawnQueue.shift()!;
      const ct = CREEP_TYPES[entry.creepType];

      // Pick the path for this creep
      let path: PathPoint[] | null = null;
      if (ct?.spawnBehavior === 'flying' && this.flyingPath) {
        path = this.flyingPath;
      } else {
        // Use assigned path, fallback to first valid
        path = allPaths[entry.pathIndex] ?? allPaths.find(p => p !== null) ?? null;
      }

      if (!path) return;

      const burstCount = entry.groupBurst;
      for (let b = 0; b < burstCount; b++) {
        const creep = new Creep(
          this.scene,
          [...path],
          entry.hpScale,
          entry.speedScale,
          entry.isBoss,
          entry.creepType,
        );
        creeps.push(creep);
      }

      if (this.spawnQueue.length > 0) {
        this.spawnTimer = this.spawnInterval;
      }
    }

    // Handle split_on_death
    this.processSplits(allPaths, creeps);
  }

  private processSplits(allPaths: (PathPoint[] | null)[], creeps: Creep[]): void {
    const newCreeps: Creep[] = [];

    for (const creep of creeps) {
      if (creep.alive || creep.reached) continue;
      if (creep.hp > -900) continue;

      for (const trait of creep.creepType.traits) {
        if (trait.id === 'split_on_death') {
          const splitCount = trait.splitCount ?? 2;
          const splitType = trait.splitType ?? 'splitter_child';
          const pathIdx = Math.max(0, creep.pathIndex - 1);
          const remainingPath = creep.path.slice(pathIdx);
          if (remainingPath.length < 2) continue;

          for (let s = 0; s < splitCount; s++) {
            const child = new Creep(
              this.scene,
              [...remainingPath],
              creep.maxHp * 0.4,
              creep.baseSpeed / 80,
              false,
              splitType,
            );
            child.x = creep.x + (Math.random() - 0.5) * TILE_SIZE;
            child.y = creep.y + (Math.random() - 0.5) * TILE_SIZE;
            newCreeps.push(child);
          }
          break;
        }
      }
    }

    creeps.push(...newCreeps);
  }

  /** Spawn a leaked creep mid-wave with specific HP. Used by Circle Co-op. */
  spawnLeakedCreep(
    scene: Phaser.Scene,
    path: PathPoint[],
    hp: number,
    speed: number,
    isBoss: boolean,
    creepType: string,
    creeps: Creep[],
  ): void {
    if (path.length < 2) return;
    const creep = new Creep(
      scene,
      [...path],
      1, // hpScale=1, we override HP directly
      speed / 80, // convert back to speed multiplier (CREEP_BASE_SPEED = 80)
      isBoss,
      creepType,
    );
    // Override HP with the actual leaked value
    creep.hp = Math.round(hp);
    creep.maxHp = Math.round(hp);
    creeps.push(creep);
  }

  isSpawning(): boolean {
    return this.spawnQueue.length > 0;
  }
}
