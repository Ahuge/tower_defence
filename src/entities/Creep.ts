import { TILE_SIZE, CREEP_BASE_SPEED, gridX, gridY } from '../config';
import { PathPoint } from '../systems/Pathfinding';
import { StatusEffectManager } from '../systems/StatusEffects';
import { ArmorType, CreepType, CREEP_TYPES } from '../data/CreepTypes';
import {
  Trait, getTrait, resolveCreepDamage, resolveCreepUpdates, resolveCreepDraw,
} from '../systems/traits/Trait';

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
  traits: Trait[];

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
    this.statusEffects = new StatusEffectManager();

    // Clone traits for per-instance mutable state
    this.traits = this.creepType.traits.map(t => ({ ...t }));

    // Init shield state
    const shieldTrait = getTrait(this.traits, 'shield');
    if (shieldTrait) {
      shieldTrait._shieldHp = Math.floor(this.maxHp * (shieldTrait.hpPercent ?? 0.3));
      shieldTrait._active = true;
    }

    this.x = gridX(path[0].col);
    this.y = gridY(path[0].row);
    this.pathIndex = 1;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);
  }

  update(delta: number, nearbyCreeps?: Creep[]): void {
    if (!this.alive || this.reached) return;

    // Update status effects
    this.statusEffects.update(delta);
    this.speed = this.baseSpeed * this.statusEffects.getSlowFactor();

    // Run creep trait updates (heal_aura, etc.)
    resolveCreepUpdates(this.traits, this, delta, nearbyCreeps ?? []);

    if (this.pathIndex >= this.path.length) {
      this.reached = true;
      this.graphics.destroy();
      return;
    }

    const target = this.path[this.pathIndex];
    const tx = gridX(target.col);
    const ty = gridY(target.row);

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
    // Run damage through creep traits (shield absorb, etc.)
    const finalDamage = resolveCreepDamage(this.traits, amount);
    if (finalDamage <= 0) return;

    this.hp -= finalDamage;
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

    // Trait-based overlays (shield glow, heal aura ring)
    resolveCreepDraw(this.traits, this, this.graphics);

    // Body
    const isSlowed = this.statusEffects.has('slow');
    this.graphics.fillStyle(isSlowed ? 0x6688cc : this.color, 1);
    this.graphics.fillCircle(this.x, this.y, drawSize);

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

    // Shield bar (from shield trait state)
    const shieldTrait = getTrait(this.traits, 'shield');
    if (shieldTrait && (shieldTrait._active || shieldTrait._shieldHp > 0)) {
      const shieldMax = Math.floor(this.maxHp * (shieldTrait.hpPercent ?? 0.3));
      const shieldRatio = (shieldTrait._shieldHp ?? 0) / shieldMax;
      this.graphics.fillStyle(0x222244, 1);
      this.graphics.fillRect(barX, barY + barHeight + 1, barWidth, 2);
      this.graphics.fillStyle(0x4488ff, 1);
      this.graphics.fillRect(barX, barY + barHeight + 1, barWidth * shieldRatio, 2);
    }
  }
}
