import * as Phaser from 'phaser';
import { SendCreepOption } from '../data/SendCreepTypes';
import { CREEP_TYPES } from '../data/CreepTypes';
import { Creep } from '../entities/Creep';
import { PathPoint } from './Pathfinding';
import { EventBus } from './EventBus';

interface QueuedSend {
  option: SendCreepOption;
  /** Which player-index sent this, if any. Carried onto each
   *  spawned creep so the post-kill gold-split knows who to pay
   *  the spawner half. Null for non-multiplayer queues. */
  spawnOwnerIndex: number | null;
}

export class SendManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private queuedSends: QueuedSend[] = [];
  private spawnQueue: { creepType: string; hp: number; speed: number; spawnOwnerIndex: number | null }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 150;
  /** Straight-line path used by flying sends so they bypass the
   *  maze just like flying creeps in regular waves. Synced by
   *  GameScene alongside `SpawnManager.setFlyingPath`. */
  private flyingPath: PathPoint[] | null = null;
  /** M10 finale: when set, sends use THIS path instead of the wave
   *  creep currentPath. Lets the player's sends walk right→left
   *  (into the CPU tower lattice) while wave creeps walk left→right
   *  on the standard path. Null = use whatever the caller passes. */
  private sendPathOverride: PathPoint[] | null = null;

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;
  }

  setFlyingPath(entry: { col: number; row: number }, exit: { col: number; row: number }): void {
    this.flyingPath = [
      { col: entry.col, row: entry.row },
      { col: exit.col, row: exit.row },
    ];
  }

  /** M10 finale: set a per-send path override (right→left walker
   *  through the CPU tower lattice). Pass null to clear. */
  setSendPathOverride(path: PathPoint[] | null): void {
    this.sendPathOverride = path;
  }

  /** Queue a send. `spawnOwnerIndex` lets the receiver credit the
   *  original sender later (Circle Co-op shared economy: 50% of
   *  the kill gold flows back to whoever's sent creep died). Null
   *  for local tests / standard solo where ownership is irrelevant. */
  queueSend(option: SendCreepOption, spawnOwnerIndex: number | null = null): void {
    this.queuedSends.push({ option, spawnOwnerIndex });
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
          spawnOwnerIndex: send.spawnOwnerIndex,
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
    // M10 finale: send-path override beats the wave-creep current path.
    // Lets the player's sends walk a different direction without
    // affecting the standard wave-creep flow.
    const effectivePath = this.sendPathOverride ?? currentPath;
    if (this.spawnQueue.length === 0 || !effectivePath) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      // Spawn a batch if many are queued
      const batchSize = this.spawnQueue.length > 20 ? 3 : this.spawnQueue.length > 10 ? 2 : 1;
      for (let b = 0; b < batchSize && this.spawnQueue.length > 0; b++) {
        const entry = this.spawnQueue.shift()!;
        // Flying sends (and any other send whose creep type is
        // marked `spawnBehavior === 'flying'`) skip the maze by
        // using the straight-line flying path. Falls back to the
        // normal path if the flying one hasn't been set (e.g.
        // Circle Co-op maps with no shared entry/exit).
        const ct = CREEP_TYPES[entry.creepType];
        const path = ct?.spawnBehavior === 'flying' && this.flyingPath
          ? this.flyingPath
          : effectivePath;
        const creep = new Creep(
          this.scene,
          [...path],
          entry.hp,
          entry.speed,
          false,
          entry.creepType,
          (this.scene as any).creepFaction,
        );
        creep.spawnOwnerIndex = entry.spawnOwnerIndex;
        creep.isSend = true;
        // M10 finale: when a send-path override is active, sends are
        // the player's own (decoy fodder). ownerIndex = the spawning
        // player slot (defaults to 0 for single-player); player towers
        // skip them via the same-team filter, CPU defenders target them.
        if (this.sendPathOverride) {
          creep.ownerIndex = entry.spawnOwnerIndex ?? 0;
          creep.goalMode = 'attacking';
        }
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
