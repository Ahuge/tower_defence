import { FactionId } from '../data/Factions';
import { createCreepSprite, getCreepSpriteScale, playCreepDeath, hasCreepSprites } from '../systems/CreepSpriteManager';

/** Simplified creep for the hero arena. Moves left→right, attacks hero if in range. */
export class ArenaCreep {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;   // pixels per second
  baseDamage: number; // damage to base on reaching right edge
  alive: boolean = true;
  atBase: boolean = false; // reached base, now attacking it
  isBoss: boolean;
  color: number;
  size: number;
  graphics: Phaser.GameObjects.Graphics;
  scene: Phaser.Scene;

  // Elite type (null = normal creep)
  eliteType: string | null = null;
  // Wave-spawned creeps (not leaked) get reduced gold
  isWaveSpawned: boolean = false;

  // Status effects
  stunned: number = 0;   // seconds remaining
  slowed: number = 0;    // seconds remaining
  slowFactor: number = 0; // 0-1, reduces speed by this fraction
  forcedTarget: boolean = false; // taunt — always chase hero
  shielded: number = 0;  // seconds remaining — damage cap 1

  // Combat — creeps fight back
  readonly aggroRange: number;    // pixels — detect hero and move toward them
  readonly attackRange: number;   // pixels — stop and attack
  readonly attackDamage: number;  // per hit
  readonly attackInterval: number; // ms between attacks
  private lastAttackTime: number = 0;

  // Elite mechanic timer
  eliteTimer: number = 0; // seconds until next mechanic activation
  pendingEliteAction: string | null = null; // action for ArenaManager to process

  private arenaWidth: number;
  sprite: Phaser.GameObjects.Sprite | null = null;
  private _prevX: number = 0;
  private _creepTypeId: string = 'standard';
  private _creepFaction: FactionId | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    baseDamage: number,
    isBoss: boolean,
    color: number,
    size: number,
    arenaWidth: number,
    creepTypeId?: string,
    creepFaction?: FactionId,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.baseDamage = baseDamage;
    this.isBoss = isBoss;
    this.color = color;
    this.size = size;
    this.arenaWidth = arenaWidth;

    // Combat stats scale with creep strength
    this.aggroRange = isBoss ? 360 : 240;  // detection range to chase hero
    this.attackRange = isBoss ? 50 : 35;   // melee range to stop and hit
    this.attackDamage = isBoss ? Math.round(hp * 0.08) : Math.max(3, Math.round(hp * 0.04));
    this.attackInterval = isBoss ? 1200 : 1500; // ms

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(14);

    this._creepTypeId = creepTypeId ?? 'standard';
    this._creepFaction = creepFaction ?? null;
    this._prevX = x;

    if (creepFaction && creepTypeId && hasCreepSprites(creepFaction, scene)) {
      this.sprite = createCreepSprite(scene, creepFaction, creepTypeId, x, y);
      if (this.sprite) {
        this.sprite.setScale(getCreepSpriteScale(creepTypeId) * 1.5); // arena creeps slightly larger
        this.sprite.setDepth(14);
      }
    }
  }

  /** Update creep. Pass hero position for aggro. Returns true if reached base. */
  update(delta: number, heroX?: number, heroY?: number, heroAlive?: boolean): boolean {
    if (!this.alive) return false;

    const dt = delta / 1000;

    // Tick status effects
    if (this.stunned > 0) {
      this.stunned -= dt;
      this.draw();
      return false; // stunned, no movement
    }
    if (this.slowed > 0) {
      this.slowed -= dt;
    }
    if (this.shielded > 0) {
      this.shielded -= dt;
    }

    // Elite mechanic timer
    if (this.eliteType && this.eliteTimer > 0) {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.pendingEliteAction = this.eliteType;
      }
    }

    let moveSpeed = this.speed;
    if (this.slowed > 0) moveSpeed *= (1 - this.slowFactor);

    // Already at base — stay parked and attack it (don't chase hero)
    if (this.atBase) {
      this.draw();
      return false;
    }

    // Base charger ignores hero — heads straight for base
    if (this.eliteType === 'base_charger') {
      this.x += moveSpeed * dt;
      if (this.x >= this.arenaWidth - 40) {
        this.x = this.arenaWidth - 45 + Math.random() * 10;
        this.atBase = true;
      }
      this.draw();
      return false;
    }

    // Check hero proximity — chase if in aggro range (or taunted), stop if in attack range
    if (heroX !== undefined && heroY !== undefined && heroAlive) {
      const dx = heroX - this.x;
      const dy = heroY - this.y;
      const distToHero = Math.sqrt(dx * dx + dy * dy);

      if (distToHero <= this.attackRange) {
        this.draw();
        return false;
      }

      if (this.forcedTarget || distToHero <= this.aggroRange) {
        const step = moveSpeed * dt;
        this.x += (dx / distToHero) * step;
        this.y += (dy / distToHero) * step;
        this.draw();
        return false;
      }
    }

    // Default: move left → right toward base
    this.x += moveSpeed * dt;

    // Reached base area → park and start attacking it
    if (this.x >= this.arenaWidth - 40) {
      this.x = this.arenaWidth - 45 + Math.random() * 10;
      this.atBase = true;
      this.draw();
      return false;
    }

    this.draw();
    return false;
  }

  /** Check if this creep can attack the hero right now */
  canAttackHero(heroX: number, heroY: number, now: number): boolean {
    if (!this.alive || this.stunned > 0) return false;
    const dx = heroX - this.x;
    const dy = heroY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.attackRange) return false;
    return now - this.lastAttackTime >= this.attackInterval;
  }

  /** Check if this creep can attack the base right now */
  canAttackBase(now: number): boolean {
    if (!this.alive || !this.atBase || this.stunned > 0) return false;
    return now - this.lastAttackTime >= this.attackInterval;
  }

  /** Record that an attack was made */
  recordAttack(now: number): void {
    this.lastAttackTime = now;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    const dmg = this.shielded > 0 ? Math.min(amount, 1) : amount;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.graphics.destroy();
      if (this.sprite && this._creepFaction) {
        playCreepDeath(this.scene, this.sprite, this._creepFaction, this._creepTypeId);
        this.sprite = null;
      } else if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
    }
  }

  draw(): void {
    this.graphics.clear();
    if (!this.alive) return;

    const baseSize = this.isBoss ? 12 : 7;
    const drawSize = baseSize * this.size;

    // Position and flip sprite
    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);
      if (this.x < this._prevX) this.sprite.setFlipX(true);
      else if (this.x > this._prevX) this.sprite.setFlipX(false);
      this._prevX = this.x;

      // Status tints
      if (this.stunned > 0) this.sprite.setTint(0xffff44);
      else if (this.slowed > 0) this.sprite.setTint(0x44aaff);
      else this.sprite.clearTint();

      // Ground shadow
      this.graphics.fillStyle(0x000000, 0.2);
      this.graphics.fillEllipse(this.x, this.y + drawSize * 0.8, drawSize * 1.6, drawSize * 0.5);
    } else {
      // Fallback: colored circle
      this.graphics.fillStyle(this.color, 1);
      this.graphics.fillCircle(this.x, this.y, drawSize);
    }

    // Stun indicator
    if (this.stunned > 0) {
      this.graphics.lineStyle(2, 0xffff44, 0.8);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 3);
    }

    // Slow indicator
    if (this.slowed > 0) {
      this.graphics.lineStyle(1, 0x44aaff, 0.6);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 2);
    }

    // Elite indicator — larger outline
    if (this.eliteType) {
      this.graphics.lineStyle(2, 0xff6600, 0.8);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 4);
    }

    // Shield indicator
    if (this.shielded > 0) {
      this.graphics.lineStyle(2, 0x44aaff, 0.8);
      this.graphics.strokeCircle(this.x, this.y, drawSize + 2);
    }

    // HP bar
    const barW = drawSize * 2.5;
    const barH = 3;
    const barX = this.x - barW / 2;
    const barY = this.y - drawSize - 5;
    const hpRatio = this.hp / this.maxHp;

    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, barW, barH);
    this.graphics.fillStyle(hpRatio > 0.5 ? 0x44ff44 : 0xff4444, 1);
    this.graphics.fillRect(barX, barY, barW * hpRatio, barH);
  }

  destroy(): void {
    if (this.graphics) this.graphics.destroy();
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
  }
}
