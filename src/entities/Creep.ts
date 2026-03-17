import { TILE_SIZE, CREEP_BASE_SPEED } from '../config';
import { PathPoint } from '../systems/Pathfinding';
import { StatusEffectManager } from '../systems/StatusEffects';
import { ArmorType, CreepType, CREEP_TYPES } from '../data/CreepTypes';

export class Creep {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  speed: number;
  pathIndex: number;
  path: PathPoint[];
  alive: boolean;
  reached: boolean;
  graphics: Phaser.GameObjects.Graphics;
  isBoss: boolean;
  statusEffects: StatusEffectManager;
  armor: ArmorType;
  creepType: CreepType;
  color: number;
  size: number;
  abilities: string[];
  healCooldown: number = 0;
  shieldHp: number = 0;
  shieldActive: boolean = false;

  constructor(scene: Phaser.Scene, path: PathPoint[], hp: number, speedMultiplier: number, isBoss: boolean, creepTypeId: string = 'standard') {
    this.creepType = CREEP_TYPES[creepTypeId] || CREEP_TYPES.standard;
    this.path = path;
    this.pathIndex = 0;
    this.hp = Math.round(hp * this.creepType.hpMultiplier);
    this.maxHp = this.hp;
    this.baseSpeed = CREEP_BASE_SPEED * speedMultiplier * this.creepType.speedMultiplier;
    this.speed = this.baseSpeed;
    this.alive = true;
    this.reached = false;
    this.isBoss = isBoss || creepTypeId === 'boss';
    this.armor = this.creepType.armor;
    this.color = this.creepType.color;
    this.size = this.creepType.size;
    this.abilities = [...this.creepType.abilities];
    this.statusEffects = new StatusEffectManager();

    // Boss shield
    if (this.abilities.includes('shield')) {
      this.shieldHp = Math.floor(this.maxHp * 0.3);
      this.shieldActive = true;
    }

    this.x = path[0].col * TILE_SIZE + TILE_SIZE / 2;
    this.y = path[0].row * TILE_SIZE + TILE_SIZE / 2;
    this.pathIndex = 1;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);
  }

  update(delta: number, nearbyCreeps?: Creep[]): void {
    if (!this.alive || this.reached) return;

    // Update status effects
    this.statusEffects.update(delta);
    this.speed = this.baseSpeed * this.statusEffects.getSlowFactor();

    // Heal aura ability
    if (this.abilities.includes('heal_aura') && nearbyCreeps) {
      this.healCooldown -= delta;
      if (this.healCooldown <= 0) {
        this.healCooldown = 1000; // heal every 1s
        for (const other of nearbyCreeps) {
          if (other === this || !other.alive || other.reached) continue;
          const dx = other.x - this.x;
          const dy = other.y - this.y;
          if (Math.sqrt(dx * dx + dy * dy) <= TILE_SIZE * 3) {
            other.hp = Math.min(other.maxHp, other.hp + Math.floor(other.maxHp * 0.03));
          }
        }
      }
    }

    if (this.pathIndex >= this.path.length) {
      this.reached = true;
      this.graphics.destroy();
      return;
    }

    const target = this.path[this.pathIndex];
    const tx = target.col * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.row * TILE_SIZE + TILE_SIZE / 2;

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const move = this.speed * (delta / 1000);

    if (dist <= move) {
      this.x = tx;
      this.y = ty;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }

    this.draw();
  }

  takeDamage(amount: number): void {
    // Shield absorbs damage first
    if (this.shieldActive && this.shieldHp > 0) {
      this.shieldHp -= amount;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        amount = -this.shieldHp; // remaining damage
        this.shieldHp = 0;
      } else {
        return; // all absorbed
      }
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this.graphics.destroy();
    }
  }

  applySlow(duration: number, factor: number): void {
    this.statusEffects.apply('slow', duration, factor);
  }

  draw(): void {
    this.graphics.clear();

    const baseSize = this.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
    const drawSize = baseSize * this.size;

    // Shield glow
    if (this.shieldActive) {
      this.graphics.lineStyle(2, 0x4488ff, 0.5);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 3);
    }

    // Body
    const isSlowed = this.statusEffects.has('slow');
    this.graphics.fillStyle(isSlowed ? 0x6688cc : this.color, 1);
    this.graphics.fillCircle(this.x, this.y, drawSize);

    // Heal aura indicator
    if (this.abilities.includes('heal_aura')) {
      this.graphics.lineStyle(1, 0x44ff88, 0.3);
      this.graphics.strokeCircle(this.x, this.y, TILE_SIZE * 3);
    }

    // HP bar
    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 3;
    const barX = this.x - barWidth / 2;
    const barY = this.y - drawSize - 6;
    const hpRatio = this.hp / this.maxHp;

    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);
    this.graphics.fillStyle(hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa00 : 0xff2222, 1);
    this.graphics.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Shield bar (below hp bar)
    if (this.shieldActive || this.shieldHp > 0) {
      const shieldMax = Math.floor(this.maxHp * 0.3);
      const shieldRatio = this.shieldHp / shieldMax;
      this.graphics.fillStyle(0x222244, 1);
      this.graphics.fillRect(barX, barY + barHeight + 1, barWidth, 2);
      this.graphics.fillStyle(0x4488ff, 1);
      this.graphics.fillRect(barX, barY + barHeight + 1, barWidth * shieldRatio, 2);
    }
  }
}
