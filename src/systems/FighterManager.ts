import * as Phaser from 'phaser';
import { TILE_SIZE, gridX, gridY } from '../config';
import { FighterType } from '../data/FighterTypes';
import { Fighter } from '../entities/Fighter';
import { Creep } from '../entities/Creep';
import { EventBus } from './EventBus';

export class FighterManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  fighters: Fighter[] = [];
  rallyX: number;
  rallyY: number;

  constructor(scene: Phaser.Scene, events: EventBus, rallyCol: number, rallyRow: number) {
    this.scene = scene;
    this.events = events;
    this.rallyX = gridX(rallyCol);
    this.rallyY = gridY(rallyRow);
  }

  purchaseFighter(fighterType: FighterType): Fighter[] {
    const spawned: Fighter[] = [];
    for (let i = 0; i < fighterType.count; i++) {
      // Spread spawn positions slightly
      const offsetX = (Math.random() - 0.5) * TILE_SIZE * 2;
      const offsetY = (Math.random() - 0.5) * TILE_SIZE * 2;
      const fighter = new Fighter(
        this.scene,
        this.rallyX + offsetX,
        this.rallyY + offsetY,
        fighterType,
      );
      fighter.rallyX = this.rallyX;
      fighter.rallyY = this.rallyY;
      this.fighters.push(fighter);
      spawned.push(fighter);
    }
    return spawned;
  }

  update(time: number, delta: number, creeps: Creep[]): void {
    for (const fighter of this.fighters) {
      fighter.update(time, delta, creeps);
    }

    // Handle death AoE
    for (let i = this.fighters.length - 1; i >= 0; i--) {
      const f = this.fighters[i];
      if (!f.alive) {
        if (f.typeDef.ability === 'death_aoe') {
          // Deal AoE damage on death
          for (const creep of creeps) {
            if (!creep.alive || creep.reached) continue;
            const dx = creep.x - f.x;
            const dy = creep.y - f.y;
            if (Math.sqrt(dx * dx + dy * dy) <= TILE_SIZE * 2) {
              creep.takeDamage(f.damage * 2);
            }
          }
        }
        this.fighters.splice(i, 1);
      }
    }
  }

  getFighterCount(): number {
    return this.fighters.length;
  }
}
