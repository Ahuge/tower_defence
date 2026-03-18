import { HeroTypeDef, AbilityDef } from '../data/HeroTypes';
import { ItemSlot, ITEM_SLOTS, ITEM_SLOT_ORDER, getItemUpgradeCost } from '../data/HeroItems';
import { ArenaCreep } from './ArenaCreep';

export interface AbilityState {
  def: AbilityDef;
  cooldownRemaining: number; // seconds remaining
}

export interface ItemState {
  slot: ItemSlot;
  tier: number; // 0 = empty, 1-3 = purchased tiers
}

interface HeroProjectile {
  x: number;
  y: number;
  target: ArenaCreep;
  damage: number;
  speed: number;      // pixels per second
  color: number;
  graphics: Phaser.GameObjects.Graphics;
}

export class Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseDamage: number;
  baseAttackSpeed: number;
  baseAttackRange: number;
  baseMoveSpeed: number;
  moveTarget: { x: number; y: number } | null = null;
  target: ArenaCreep | null = null;
  abilities: [AbilityState, AbilityState, AbilityState];
  items: [ItemState, ItemState, ItemState];
  alive: boolean = true;
  respawnTimer: number = 0; // seconds remaining
  typeDef: HeroTypeDef;
  graphics: Phaser.GameObjects.Graphics;
  scene: Phaser.Scene;
  lastAttackTime: number = 0;
  kills: number = 0;
  deaths: number = 0;
  totalDamageDealt: number = 0;
  abilitiesUsed: number = 0;

  // Projectiles (ranged auto-attacks)
  private projectiles: HeroProjectile[] = [];
  private static readonly MELEE_THRESHOLD = 50; // attackRange <= this = melee (instant damage)
  private static readonly PROJECTILE_SPEED = 400; // pixels per second

  // Temporary buffs
  private buffs: { stat: string; amount: number; remaining: number }[] = [];
  private dodgeRemaining: number = 0;
  private ampTarget: ArenaCreep | null = null;
  private ampRemaining: number = 0;
  private ampPercent: number = 0;

  // Arena bounds
  private arenaWidth: number;
  private arenaHeight: number;

  static readonly RESPAWN_TIME = 10; // seconds

  constructor(scene: Phaser.Scene, x: number, y: number, typeDef: HeroTypeDef, arenaWidth: number, arenaHeight: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.typeDef = typeDef;
    this.hp = typeDef.hp;
    this.maxHp = typeDef.hp;
    this.baseDamage = typeDef.damage;
    this.baseAttackSpeed = typeDef.attackSpeed;
    this.baseAttackRange = typeDef.attackRange;
    this.baseMoveSpeed = typeDef.moveSpeed;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    this.abilities = typeDef.abilities.map(a => ({
      def: a,
      cooldownRemaining: 0,
    })) as [AbilityState, AbilityState, AbilityState];

    this.items = ITEM_SLOT_ORDER.map(slot => ({
      slot,
      tier: 0,
    })) as [ItemState, ItemState, ItemState];

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
  }

  // === Effective stats (base + items + buffs) ===

  getEffectiveDamage(): number {
    let dmg = this.baseDamage;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        dmg += stats.damage ?? 0;
      }
    }
    return dmg;
  }

  getEffectiveAttackSpeed(): number {
    let as = this.baseAttackSpeed;
    for (const buff of this.buffs) {
      if (buff.stat === 'attackSpeed') as *= (1 + buff.amount);
    }
    return as;
  }

  getEffectiveSpeed(): number {
    let speed = this.baseMoveSpeed;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        if (stats.speedMult) speed *= (1 + stats.speedMult);
      }
    }
    return speed;
  }

  getEffectiveMaxHp(): number {
    let hp = this.typeDef.hp;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        hp += stats.bonusHp ?? 0;
      }
    }
    return hp;
  }

  getArmorFlat(): number {
    let armor = 0;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        armor += stats.armorFlat ?? 0;
      }
    }
    return armor;
  }

  getDodgeChance(): number {
    if (this.dodgeRemaining > 0) return 1.0;
    let dodge = 0;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        dodge += stats.dodgeChance ?? 0;
      }
    }
    return dodge;
  }

  getCritChance(): number {
    let crit = 0;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        crit += stats.critChance ?? 0;
      }
    }
    return crit;
  }

  // === Item management ===

  canUpgradeItem(slotIndex: number): { canUpgrade: boolean; cost: number } {
    const item = this.items[slotIndex];
    const cost = getItemUpgradeCost(item.slot, item.tier);
    return { canUpgrade: cost !== null, cost: cost ?? 0 };
  }

  upgradeItem(slotIndex: number): void {
    const item = this.items[slotIndex];
    if (item.tier >= 3) return;
    item.tier++;
    // Update max HP and current HP proportionally
    const newMax = this.getEffectiveMaxHp();
    if (newMax > this.maxHp) {
      const hpGain = newMax - this.maxHp;
      this.maxHp = newMax;
      this.hp = Math.min(this.hp + hpGain, this.maxHp);
    }
  }

  // === Update ===

  update(delta: number, arenaCreeps: ArenaCreep[]): void {
    const dt = delta / 1000;

    // Tick cooldowns
    for (const ab of this.abilities) {
      if (ab.cooldownRemaining > 0) ab.cooldownRemaining = Math.max(0, ab.cooldownRemaining - dt);
    }

    // Tick buffs
    for (const buff of this.buffs) {
      buff.remaining -= dt;
    }
    this.buffs = this.buffs.filter(b => b.remaining > 0);

    if (this.dodgeRemaining > 0) this.dodgeRemaining -= dt;
    if (this.ampRemaining > 0) {
      this.ampRemaining -= dt;
      if (this.ampRemaining <= 0) {
        this.ampTarget = null;
        this.ampPercent = 0;
      }
    }

    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      this.updateProjectiles(dt); // let in-flight projectiles finish
      this.draw();
      return;
    }

    // Move towards move target
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = this.getEffectiveSpeed();
      const move = speed * dt;

      if (dist <= move) {
        this.x = this.moveTarget.x;
        this.y = this.moveTarget.y;
        this.moveTarget = null;
      } else {
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      }
    }

    // Clamp to arena bounds
    this.x = Math.max(20, Math.min(this.arenaWidth - 20, this.x));
    this.y = Math.max(20, Math.min(this.arenaHeight - 20, this.y));

    // Find target
    if (!this.target || !this.target.alive) {
      this.target = this.findTarget(arenaCreeps);
    }

    // Auto-attack
    if (this.target && this.target.alive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.baseAttackRange) {
        const attackInterval = 1000 / this.getEffectiveAttackSpeed();
        const now = this.scene.time.now;
        if (now - this.lastAttackTime >= attackInterval) {
          this.attack(this.target);
          this.lastAttackTime = now;
        }
      } else if (!this.moveTarget) {
        // Move towards target if no explicit move command
        const speed = this.getEffectiveSpeed();
        const move = speed * dt;
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      }
    }

    // Update projectiles in flight
    this.updateProjectiles(dt);

    this.draw();
  }

  private findTarget(creeps: ArenaCreep[]): ArenaCreep | null {
    let best: ArenaCreep | null = null;
    let bestDist = Infinity;
    for (const c of creeps) {
      if (!c.alive) continue;
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    return best;
  }

  private attack(target: ArenaCreep): void {
    let dmg = this.getEffectiveDamage();
    // Crit
    if (Math.random() < this.getCritChance()) dmg = Math.round(dmg * 1.5);
    // Amp mark
    if (this.ampTarget === target && this.ampRemaining > 0) {
      dmg = Math.round(dmg * (1 + this.ampPercent / 100));
    }

    if (this.baseAttackRange <= Hero.MELEE_THRESHOLD) {
      // Melee: instant damage
      this.applyDamage(target, dmg);
    } else {
      // Ranged: spawn projectile
      const g = this.scene.add.graphics().setDepth(16);
      this.projectiles.push({
        x: this.x,
        y: this.y,
        target,
        damage: dmg,
        speed: Hero.PROJECTILE_SPEED,
        color: this.typeDef.color,
        graphics: g,
      });
    }
  }

  private applyDamage(target: ArenaCreep, dmg: number): void {
    target.takeDamage(dmg);
    this.totalDamageDealt += dmg;
    if (!target.alive) {
      this.kills++;
      if (this.target === target) this.target = null;
    }
  }

  private updateProjectiles(dt: number): void {
    for (const proj of this.projectiles) {
      if (!proj.target.alive) {
        // Target died — remove projectile
        proj.graphics.destroy();
        proj.damage = 0; // mark for cleanup
        continue;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = proj.speed * dt;

      if (dist <= move + 5) {
        // Hit!
        this.applyDamage(proj.target, proj.damage);
        proj.graphics.destroy();
        proj.damage = 0; // mark for cleanup
      } else {
        // Move toward target
        proj.x += (dx / dist) * move;
        proj.y += (dy / dist) * move;

        // Draw projectile
        proj.graphics.clear();
        proj.graphics.fillStyle(proj.color, 1);
        proj.graphics.fillCircle(proj.x, proj.y, 4);
        proj.graphics.lineStyle(1, 0xffffff, 0.6);
        proj.graphics.strokeCircle(proj.x, proj.y, 4);
      }
    }

    // Remove completed projectiles
    this.projectiles = this.projectiles.filter(p => p.damage > 0);
  }

  // === Abilities ===

  useAbility(index: number, arenaCreeps: ArenaCreep[], targetX?: number, targetY?: number): boolean {
    const ab = this.abilities[index];
    if (!ab || ab.cooldownRemaining > 0 || !this.alive) return false;

    ab.cooldownRemaining = ab.def.cooldown;
    this.abilitiesUsed++;
    const def = ab.def;

    switch (def.type) {
      case 'stun': {
        // Stun nearest target
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          target.takeDamage(def.damage ?? 0);
          this.totalDamageDealt += def.damage ?? 0;
          target.stunned = def.stunDuration ?? 1;
          if (!target.alive) this.kills++;
        }
        break;
      }
      case 'self_buff': {
        if (def.buffStat && def.buffAmount && def.buffDuration) {
          this.buffs.push({ stat: def.buffStat, amount: def.buffAmount, remaining: def.buffDuration });
        }
        if (def.dodgeChance && def.dodgeDuration) {
          this.dodgeRemaining = def.dodgeDuration;
        }
        break;
      }
      case 'aoe': {
        for (const c of arenaCreeps) {
          if (!c.alive) continue;
          const dx = c.x - this.x;
          const dy = c.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (def.splashRadius ?? 100)) {
            c.takeDamage(def.damage ?? 0);
            this.totalDamageDealt += def.damage ?? 0;
            if (def.slowAmount && def.slowDuration) {
              c.slowed = def.slowDuration;
              c.slowFactor = def.slowAmount;
            }
            if (!c.alive) this.kills++;
          }
        }
        break;
      }
      case 'skillshot': {
        // Damage target + splash
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          target.takeDamage(def.damage ?? 0);
          this.totalDamageDealt += def.damage ?? 0;
          if (!target.alive) this.kills++;
          // Splash
          if (def.splashRadius) {
            for (const c of arenaCreeps) {
              if (!c.alive || c === target) continue;
              const dx = c.x - target.x;
              const dy = c.y - target.y;
              if (Math.sqrt(dx * dx + dy * dy) <= def.splashRadius) {
                const splashDmg = Math.round((def.damage ?? 0) * 0.6);
                c.takeDamage(splashDmg);
                this.totalDamageDealt += splashDmg;
                if (!c.alive) this.kills++;
              }
            }
          }
        }
        break;
      }
      case 'dash': {
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          // Dash to target
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (def.dashRange ?? 200)) {
            this.x = target.x - 20;
            this.y = target.y;
            target.takeDamage(def.damage ?? 0);
            this.totalDamageDealt += def.damage ?? 0;
            if (def.ampPercent) {
              this.ampTarget = target;
              this.ampPercent = def.ampPercent;
              this.ampRemaining = 5; // 5 second amp duration
            }
            if (!target.alive) this.kills++;
          }
        }
        break;
      }
      case 'teleport': {
        if (targetX !== undefined && targetY !== undefined) {
          const dx = targetX - this.x;
          const dy = targetY - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (def.range ?? 300)) {
            this.x = targetX;
            this.y = targetY;
          }
        }
        break;
      }
      case 'execute': {
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          const hpRatio = target.hp / target.maxHp;
          const dmg = hpRatio < (def.hpThreshold ?? 0.3) ? (def.damageBelow ?? 200) : (def.damageAbove ?? 50);
          target.takeDamage(dmg);
          this.totalDamageDealt += dmg;
          if (!target.alive) this.kills++;
        }
        break;
      }
    }

    return true;
  }

  // === Damage / Death / Respawn ===

  takeDamage(amount: number): void {
    if (!this.alive) return;
    // Dodge check
    if (Math.random() < this.getDodgeChance()) return;
    // Armor reduction
    const armor = this.getArmorFlat();
    const reduction = armor / (armor + 50); // diminishing returns
    const dmg = Math.round(amount * (1 - reduction));
    this.hp -= Math.max(1, dmg);
    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    this.alive = false;
    this.hp = 0;
    this.deaths++;
    this.respawnTimer = Hero.RESPAWN_TIME;
    this.target = null;
    this.moveTarget = null;
  }

  respawn(): void {
    this.alive = true;
    this.maxHp = this.getEffectiveMaxHp();
    this.hp = this.maxHp;
    this.x = this.arenaWidth / 2;
    this.y = this.arenaHeight / 2;
    this.respawnTimer = 0;
    this.buffs = [];
    this.dodgeRemaining = 0;
  }

  moveTo(px: number, py: number): void {
    if (!this.alive) return;
    this.moveTarget = { x: px, y: py };
  }

  healPercent(pct: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * pct));
  }

  // === Rendering ===

  draw(): void {
    this.graphics.clear();

    if (!this.alive) {
      // Show respawn timer
      return;
    }

    const size = 14;

    // Hero body — larger than fighters
    this.graphics.fillStyle(this.typeDef.color, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(this.x, this.y - size);
    this.graphics.lineTo(this.x + size, this.y);
    this.graphics.lineTo(this.x, this.y + size);
    this.graphics.lineTo(this.x - size, this.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Outline
    this.graphics.lineStyle(2, 0xffffff, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(this.x, this.y - size);
    this.graphics.lineTo(this.x + size, this.y);
    this.graphics.lineTo(this.x, this.y + size);
    this.graphics.lineTo(this.x - size, this.y);
    this.graphics.closePath();
    this.graphics.strokePath();

    // HP bar
    const barW = 40;
    const barH = 4;
    const barX = this.x - barW / 2;
    const barY = this.y - size - 8;
    const hpRatio = this.hp / this.maxHp;

    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, barW, barH);
    const hpColor = hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa44 : 0xff4444;
    this.graphics.fillStyle(hpColor, 1);
    this.graphics.fillRect(barX, barY, barW * hpRatio, barH);

    // Idle pulse when buffed
    if (this.buffs.length > 0) {
      this.graphics.lineStyle(1, 0xffff44, 0.4);
      this.graphics.strokeCircle(this.x, this.y, size + 4);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    for (const p of this.projectiles) p.graphics.destroy();
    this.projectiles = [];
  }
}
