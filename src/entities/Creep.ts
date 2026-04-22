import * as Phaser from 'phaser';
import { TILE_SIZE, CREEP_BASE_SPEED, gridX, gridY } from '../config';
import { PathPoint } from '../systems/Pathfinding';
import { StatusEffectManager } from '../systems/StatusEffects';
import { ArmorType, CreepType, CREEP_TYPES } from '../data/CreepTypes';
import {
  Trait, getTrait, resolveCreepDamage, resolveCreepUpdates, resolveCreepDraw,
} from '../systems/traits/Trait';
import { FactionId } from '../data/Factions';
import { createCreepSprite, getCreepSpriteScale, playCreepDeath, hasCreepSprites } from '../systems/CreepSpriteManager';

const ARMOR_TIERS: ArmorType[] = ['light', 'medium', 'heavy'];

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
  baseArmor: ArmorType;
  creepType: CreepType;
  color: number;
  size: number;
  traits: Trait[];
  /** Col/row of the tower that last dealt damage (for kill credit in co-op) */
  lastHitCol: number = -1;
  lastHitRow: number = -1;
  /** Optional sprite (used when creep faction sprites are loaded) */
  sprite: Phaser.GameObjects.Sprite | null = null;
  private _prevX: number = 0;
  private _scene: Phaser.Scene;
  private _creepTypeId: string = 'standard';
  private _creepFaction: FactionId | null = null;

  /** The creep type ID (e.g. 'standard', 'fast', 'boss') */
  get creepTypeId(): string { return this._creepTypeId; }
  /** The faction this creep belongs to */
  get creepFaction(): FactionId | null { return this._creepFaction; }

  constructor(scene: Phaser.Scene, path: PathPoint[], hp: number, speedMultiplier: number, isBoss: boolean, creepTypeId: string = 'standard', creepFaction?: FactionId) {
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
    this.baseArmor = this.creepType.armor;
    this.armor = this.baseArmor;
    this.color = this.creepType.color;
    this.size = this.creepType.size;
    this.statusEffects = new StatusEffectManager();

    this.traits = this.creepType.traits.map(t => ({ ...t }));

    const shieldTrait = getTrait(this.traits, 'shield');
    if (shieldTrait) {
      shieldTrait._shieldHp = Math.floor(this.maxHp * (shieldTrait.hpPercent ?? 0.3));
      shieldTrait._active = true;
    }

    this.x = gridX(path[0].col);
    this.y = gridY(path[0].row);
    this.pathIndex = 1;

    this._scene = scene;
    this._creepTypeId = creepTypeId;
    this._creepFaction = creepFaction ?? null;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);

    // Create sprite if creep faction has sprites loaded
    if (creepFaction && hasCreepSprites(creepFaction, scene)) {
      this.sprite = createCreepSprite(scene, creepFaction, creepTypeId, this.x, this.y);
      if (this.sprite) {
        const scale = getCreepSpriteScale(creepTypeId);
        this.sprite.setScale(scale);
      }
    }
    this._prevX = this.x;
  }

  update(delta: number, nearbyCreeps?: Creep[]): void {
    if (!this.alive || this.reached) return;

    // Update status effects
    this.statusEffects.update(delta);

    // Recalculate effective armor (with shred)
    const shred = this.statusEffects.getArmorShred();
    const baseIdx = ARMOR_TIERS.indexOf(this.baseArmor);
    this.armor = ARMOR_TIERS[Math.max(0, baseIdx - shred)];

    // Process DoT damage
    const dotDmg = this.statusEffects.getDotDamage(delta, this.maxHp);
    if (dotDmg > 0) {
      this.hp -= dotDmg;
      if (this.hp <= 0) {
        this.alive = false;
        this.graphics.destroy();
        if (this.sprite) {
          playCreepDeath(this._scene, this.sprite, (this._scene as any).creepFaction ?? 'arcane', this._creepTypeId);
          this.sprite = null;
        }
        return;
      }
    }

    // Speed (slow + root)
    this.speed = this.baseSpeed * this.statusEffects.getSlowFactor();

    // Reset heal stacking counter for diminishing returns
    (this as any)._healSourcesThisTick = 0;

    // Trait updates (heal_aura, etc.) — suppressed when muted
    if (!this.statusEffects.isMuted()) {
      resolveCreepUpdates(this.traits, this, delta, nearbyCreeps ?? []);
    }

    if (this.pathIndex >= this.path.length) {
      this.reached = true;
      // Diagnostic: confirm creep-reached → leak-handler pipeline
      // is firing. If we never see this log but creeps appear to
      // reach the exit visually, the reached detection is stale
      // (wrong path length, drifted pixel-cell alignment, etc).
      // Remove once the Circle Co-op life-loss bug is resolved.
      // eslint-disable-next-line no-console
      console.log('[creep] reached', {
        creepType: this._creepTypeId,
        isBoss: this.isBoss,
        pathLen: this.path.length,
        pathIndex: this.pathIndex,
        lastCell: this.path[this.path.length - 1],
      });
      this.graphics.destroy();
      this.sprite?.destroy();
      this.sprite = null;
      return;
    }

    // Confused: walk backward along path
    const confused = this.statusEffects.isConfused();
    if (confused && this.pathIndex > 1) {
      const prev = this.path[this.pathIndex - 2];
      const bx = gridX(prev.col);
      const by = gridY(prev.row);
      const bdx = bx - this.x;
      const bdy = by - this.y;
      const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
      const move = this.speed * (delta / 1000);
      if (bdist <= move) {
        this.x = bx;
        this.y = by;
        this.pathIndex = Math.max(1, this.pathIndex - 1);
      } else if (bdist > 0) {
        this.x += (bdx / bdist) * move;
        this.y += (bdy / bdist) * move;
      }
      this.draw();
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
    } else if (dist > 0) {
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }

    this.draw();
  }

  takeDamage(amount: number, towerCol?: number, towerRow?: number): void {
    if (towerCol !== undefined && towerRow !== undefined) {
      this.lastHitCol = towerCol;
      this.lastHitRow = towerRow;
    }
    // Check evasion buff from mage auras
    const auraEvasion = this.statusEffects.getEvasionChance();
    if (auraEvasion > 0 && Math.random() < auraEvasion) {
      return; // dodged via aura
    }

    // Apply damage amplification
    const amp = this.statusEffects.getDamageAmp();
    const amped = Math.round(amount * amp);

    // Run through creep traits (shield absorb, own evasion, etc.)
    const finalDamage = resolveCreepDamage(this.traits, amped);
    if (finalDamage <= 0) return;

    this.hp -= finalDamage;
    if (this.hp <= 0) {
      this.alive = false;
      this.graphics.destroy();
      if (this.sprite) {
        playCreepDeath(this._scene, this.sprite, (this._scene as any).creepFaction ?? 'arcane', this._creepTypeId);
        this.sprite = null;
      }
    }
  }

  applySlow(duration: number, factor: number): void {
    this.statusEffects.apply('slow', duration, factor);
  }

  draw(): void {
    this.graphics.clear();

    const baseSize = this.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
    const drawSize = baseSize * this.size;

    // Trait overlays (shield glow, heal aura ring)
    resolveCreepDraw(this.traits, this, this.graphics);

    // Position and flip sprite based on movement direction
    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);
      // Flip sprite when moving left
      if (this.x < this._prevX) this.sprite.setFlipX(true);
      else if (this.x > this._prevX) this.sprite.setFlipX(false);
      this._prevX = this.x;

      // Ground shadow
      const shadowW = drawSize * 1.6;
      const shadowH = drawSize * 0.5;
      this.graphics.fillStyle(0x000000, 0.2);
      this.graphics.fillEllipse(this.x, this.y + drawSize * 0.8, shadowW, shadowH);

      // Apply status tint
      if (this.statusEffects.has('confused')) this.sprite.setTint(0xff00ff);
      else if (this.statusEffects.has('root')) this.sprite.setTint(0xffffff);
      else if (this.statusEffects.has('virus')) this.sprite.setTint(0x00ff88);
      else if (this.statusEffects.has('burn')) this.sprite.setTint(0xff6622);
      else if (this.statusEffects.has('poison')) this.sprite.setTint(0x44cc22);
      else if (this.statusEffects.has('slow')) this.sprite.setTint(0x6688cc);
      else this.sprite.clearTint();
    } else {
      // Fallback: colored circle (no sprite available)
      let bodyColor = this.color;
      if (this.statusEffects.has('confused')) bodyColor = 0xff00ff;
      else if (this.statusEffects.has('root')) bodyColor = 0xffffff;
      else if (this.statusEffects.has('virus')) bodyColor = 0x00ff88;
      else if (this.statusEffects.has('burn')) bodyColor = 0xff6622;
      else if (this.statusEffects.has('poison')) bodyColor = 0x44cc22;
      else if (this.statusEffects.has('slow')) bodyColor = 0x6688cc;

      this.graphics.fillStyle(bodyColor, 1);
      this.graphics.fillCircle(this.x, this.y, drawSize);
    }

    // Armor shred indicator
    if (this.statusEffects.has('armor_shred')) {
      this.graphics.lineStyle(1, 0x880088, 0.6);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 2);
    }

    // Damage amp indicator
    if (this.statusEffects.has('damage_amp')) {
      this.graphics.lineStyle(1, 0xff0000, 0.4);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 4);
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

    // Shield bar
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
