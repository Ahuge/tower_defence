import { Creep } from '../entities/Creep';
import { PathPoint } from './Pathfinding';
import { WaveDefinition, WaveCreepGroup } from '../data/WaveDefinitions';
import { CREEP_TYPES } from '../data/CreepTypes';
import { EventBus } from './EventBus';

interface SpawnEntry {
  creepType: string;
  hpScale: number;
  speedScale: number;
  isBoss: boolean;
}

export class SpawnManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private spawnQueue: SpawnEntry[] = [];
  spawnTimer: number = 0;
  private spawnInterval: number = 0;

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;
  }

  startWave(waveDef: WaveDefinition): void {
    this.spawnQueue = [];

    // Flatten groups into individual spawn entries, interleave types
    for (const group of waveDef.groups) {
      const ct = CREEP_TYPES[group.creepType];
      const actualCount = group.count * (ct?.count || 1);
      for (let i = 0; i < actualCount; i++) {
        this.spawnQueue.push({
          creepType: group.creepType,
          hpScale: group.hpScale,
          speedScale: group.speedScale,
          isBoss: waveDef.isBoss,
        });
      }
    }

    // Shuffle to interleave types
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }

    this.spawnInterval = waveDef.spawnInterval;
    this.spawnTimer = 0; // spawn first immediately
  }

  update(delta: number, currentPath: PathPoint[] | null, creeps: Creep[]): void {
    if (this.spawnQueue.length === 0 || !currentPath) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const entry = this.spawnQueue.shift()!;
      const creep = new Creep(
        this.scene,
        [...currentPath],
        entry.hpScale,
        entry.speedScale,
        entry.isBoss,
        entry.creepType,
      );
      creeps.push(creep);
      if (this.spawnQueue.length > 0) {
        this.spawnTimer = this.spawnInterval;
      }
    }
  }

  isSpawning(): boolean {
    return this.spawnQueue.length > 0;
  }
}
