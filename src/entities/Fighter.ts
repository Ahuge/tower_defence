import { TILE_SIZE } from '../config';
import { FighterType } from '../data/FighterTypes';
import { Creep } from './Creep';

export class Fighter {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  lastAttacked: number = 0;
  alive: boolean = true;
  target: Creep | null = null;
  graphics: Phaser.GameObjects.Graphics;
  typeDef: FighterType;
  color: number;
  scene: Phaser.Scene;
  rallyX: number;
  rallyY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, fighterType: FighterType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rallyX = x;
    this.rallyY = y;
    this.typeDef = fighterType;
    this.hp = fighterType.hp;
    this.maxHp = fighterType.hp;
    this.damage = fighterType.damage;
    this.attackSpeed = fighterType.attackSpeed;
    this.moveSpeed = fighterType.moveSpeed;
    this.color = fighterType.color;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(12);
  }

  update(time: number, delta: number, creeps: Creep[]): void {
    if (!this.alive) return;

    // Find target
    if (!this.target || !this.target.alive || this.target.reached) {
      this.target = this.findTarget(creeps);
    }

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const engageRange = TILE_SIZE * 0.8;

      if (dist > engageRange) {
        // Move towards target
        const move = this.moveSpeed * (delta / 1000);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      } else {
        // Attack
        if (time - this.lastAttacked >= this.attackSpeed) {
          this.target.takeDamage(this.damage);
          this.lastAttacked = time;
        }
      }
    } else {
      // Return to rally point
      const dx = this.rallyX - this.x;
      const dy = this.rallyY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) {
        const move = this.moveSpeed * (delta / 1000);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      }
    }

    this.draw();
  }

  findTarget(creeps: Creep[]): Creep | null {
    let best: Creep | null = null;
    let bestScore = Infinity;

    for (const creep of creeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - this.x;
      const dy = creep.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only engage within a reasonable distance
      if (dist > TILE_SIZE * 8) continue;

      let score: number;
      if (this.typeDef.ability === 'target_weakest') {
        score = creep.hp; // target lowest HP
      } else {
        score = dist; // target nearest
      }

      if (score < bestScore) {
        best = creep;
        bestScore = score;
      }
    }

    return best;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      // Death AoE (arcane_mage)
      if (this.typeDef.ability === 'death_aoe') {
        this.deathAoE();
      }
      this.graphics.destroy();
    }
  }

  private deathAoE(): void {
    // Deal damage to nearby creeps in a small radius
    // This will be called from FighterManager which passes creeps
  }

  draw(): void {
    this.graphics.clear();

    const size = TILE_SIZE * 0.2;

    // Diamond shape for fighters
    this.graphics.fillStyle(this.color, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(this.x, this.y - size);
    this.graphics.lineTo(this.x + size, this.y);
    this.graphics.lineTo(this.x, this.y + size);
    this.graphics.lineTo(this.x - size, this.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // HP bar
    const barWidth = TILE_SIZE * 0.5;
    const barHeight = 2;
    const barX = this.x - barWidth / 2;
    const barY = this.y - size - 4;
    const hpRatio = this.hp / this.maxHp;

    if (hpRatio < 1) {
      this.graphics.fillStyle(0x333333, 1);
      this.graphics.fillRect(barX, barY, barWidth, barHeight);
      this.graphics.fillStyle(0x44ff44, 1);
      this.graphics.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
