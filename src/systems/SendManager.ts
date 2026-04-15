import { SendCreepOption } from '../data/SendCreepTypes';
import { CREEP_TYPES } from '../data/CreepTypes';
import { Creep } from '../entities/Creep';
import { PathPoint } from './Pathfinding';
import { EventBus } from './EventBus';

interface QueuedSend {
  option: SendCreepOption;
}

export class SendManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private queuedSends: QueuedSend[] = [];
  private spawnQueue: { creepType: string; hp: number; speed: number }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 150;

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;
  }

  queueSend(option: SendCreepOption): void {
    this.queuedSends.push({ option });
  }

  // Called at wave start to generate extra creeps from sends
  activateSends(baseHp: number, baseSpeed: number): void {
    this.spawnQueue = [];
    for (const send of this.queuedSends) {
      const ct = CREEP_TYPES[send.option.creepType];
      const actualCount = send.option.count * (ct?.count || 1);
      for (let i = 0; i < actualCount; i++) {
        this.spawnQueue.push({
          creepType: send.option.creepType,
          hp: baseHp,
          speed: baseSpeed,
        });
      }
    }
    this.queuedSends = [];
    this.spawnTimer = 0;

    // Scale interval: more sends = faster spawning, minimum 50ms
    // Base 150ms, but if 20+ creeps queued, batch them out quickly
    const count = this.spawnQueue.length;
    if (count <= 5) {
      this.spawnInterval = 200;
    } else if (count <= 15) {
      this.spawnInterval = 120;
    } else {
      this.spawnInterval = Math.max(50, Math.round(3000 / count));
    }
  }

  update(delta: number, currentPath: PathPoint[] | null, creeps: Creep[]): void {
    if (this.spawnQueue.length === 0 || !currentPath) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      // Spawn a batch if many are queued
      const batchSize = this.spawnQueue.length > 20 ? 3 : this.spawnQueue.length > 10 ? 2 : 1;
      for (let b = 0; b < batchSize && this.spawnQueue.length > 0; b++) {
        const entry = this.spawnQueue.shift()!;
        const creep = new Creep(
          this.scene,
          [...currentPath],
          entry.hp,
          entry.speed,
          false,
          entry.creepType,
          (this.scene as any).creepFaction,
        );
        creeps.push(creep);
      }
      this.spawnTimer = this.spawnInterval;
    }
  }

  isSpawning(): boolean {
    return this.spawnQueue.length > 0;
  }

  getPendingSendCount(): number {
    return this.queuedSends.length;
  }
}
