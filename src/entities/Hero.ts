import * as Phaser from 'phaser';
import { HeroTypeDef, AbilityDef } from '../data/HeroTypes';
import { ensureHeroSkinTexture } from '../systems/PaletteSwap';
import { ItemSlot, ITEM_SLOTS, ITEM_SLOT_ORDER, getItemUpgradeCost } from '../data/HeroItems';
import { AccessoryDef } from '../data/HeroAccessories';
import { ArenaCreep } from './ArenaCreep';
import type { Tower } from './Tower';
import type { DestructibleStructure } from './DestructibleStructure';
import { DamageNumberEntry, DMG_COLOR } from '../systems/FloatingDamage';
import { ArenaEffect, FX } from '../systems/ArenaEffects';
import { spawnHeroAbilityVfx } from '../systems/ArenaFloorRenderer';

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
  dmgColor: string;   // floating damage text color
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
  sprite: Phaser.GameObjects.Sprite | null = null;
  /** Animation state for sprite: tracks current action + frame cycling */
  private _animState: 'idle' | 'walk' | 'attack' | 'ability' = 'idle';
  private _animTimer: number = 0;
  private _animFrame: number = 0;
  private _abilityIndex: number = -1; // which ability was just used (for row 3 frame)
  private _abilityAnimTimer: number = 0;
  private _facingRow: number = 0; // 0=down, 1=side, 2=up
  scene: Phaser.Scene;
  lastAttackTime: number = 0;
  kills: number = 0;
  deaths: number = 0;
  totalDamageDealt: number = 0;
  abilitiesUsed: number = 0;

  // Leveling
  level: number = 1;
  xp: number = 0;
  static readonly MAX_LEVEL = 999; // effectively uncapped
  static readonly ULTIMATE_UNLOCK_LEVEL = 6;
  pendingUpgrades: number = 0; // queued upgrade choices
  abilityUpgrades: number[] = [0, 0, 0, 0]; // Q, W, E, R upgrade counts

  // Tome bonuses (cumulative from purchased tomes)
  tomeBonusDamage: number = 0;
  tomeBonusHp: number = 0;
  tomeBonusSpeed: number = 0;
  tomeBonusAttackSpeed: number = 0;
  tomeCount: number = 0; // how many attribute tomes purchased (for scaling cost)

  // Accessories (up to 3)
  static readonly MAX_ACCESSORIES = 3;
  accessories: AccessoryDef[] = [];
  accessoryCooldowns: Map<string, number> = new Map(); // id → seconds remaining
  guardianAngelUsed: boolean = false;
  phasing: number = 0; // seconds remaining

  // Projectiles (ranged auto-attacks)
  private projectiles: HeroProjectile[] = [];
  private static readonly MELEE_THRESHOLD = 50; // attackRange <= this = melee (instant damage)
  private static readonly PROJECTILE_SPEED = 400; // pixels per second

  // Ultimate ability
  ultimate: AbilityState | null = null;

  // Ultimate state
  invulnerable: number = 0; // seconds remaining
  meteorStorm: { remaining: number; interval: number; timer: number; damage: number; radius: number } | null = null;
  deathMark: { remaining: number; damageDealt: number; bonusPct: number; targets: Set<ArenaCreep> } | null = null;

  // Ability targeting mode
  pendingAbilityIndex: number | null = null; // index into abilities, or -1 for ultimate

  // Visual effects queue (drained by ArenaManager each frame)
  pendingEffects: ArenaEffect[] = [];

  // Pending meteor (processed by ArenaManager which knows all creep positions)
  pendingMeteor: { damage: number; radius: number } | null = null;
  // Pending chain lightning (processed by ArenaManager)
  pendingChainLightning: { x: number; y: number; damage: number } | null = null;
  // Pending splash attacks (processed by ArenaManager)
  pendingSplash: { x: number; y: number; radius: number; damage: number }[] = [];
  // Pending reflect damage (processed by ArenaManager on attacking creeps)
  pendingReflectDamage: number = 0;

  // Floating damage numbers queue (drained by ArenaManager each frame)
  pendingDamageNumbers: DamageNumberEntry[] = [];

  // Temporary buffs
  private buffs: { stat: string; amount: number; remaining: number }[] = [];
  private dodgeRemaining: number = 0;
  private ampTarget: ArenaCreep | null = null;
  private ampRemaining: number = 0;
  private ampPercent: number = 0;

  // Arena bounds
  private arenaWidth: number;
  private arenaHeight: number;
  /** M10 finale — instance-configurable respawn time. Defaults to the
   *  static RESPAWN_TIME for backward compat with HeroDefenseMode;
   *  FinaleController bumps it for the climax (~20s). */
  respawnSeconds: number = Hero.RESPAWN_TIME;
  /** M10 finale — anchor the hero respawns to. Defaults to the arena
   *  centre (Hero Defense mode behaviour); FinaleController sets this
   *  to the midpoint of the two summoning circles. */
  spawnAnchor: { x: number; y: number };
  /** M10 finale — world bounds for clamp + ability targeting. When set,
   *  overrides arenaWidth/Height. FinaleController sets it to the
   *  full grid pixel rect. */
  worldBounds?: { minX: number; minY: number; maxX: number; maxY: number };
  /** M10 finale — clicked CPU damage target. When set, the hero
   *  prioritizes attacking this target over any creep auto-attack.
   *  Accepts a Tower (existing CPU defenders) OR a DestructibleStructure
   *  (PRD 06 boss structures like the Archmage Throne). Cleared when
   *  the target dies or the player clicks elsewhere. */
  clickedTarget: Tower | DestructibleStructure | null = null;
  /** M10 finale — count of CPU towers this hero has destroyed. Drives
   *  the "Win without losing the hero" star objective + analytics. */
  towersDestroyed: number = 0;
  /** M10 finale — pre-computed pixel waypoints the hero walks along.
   *  Replaces straight-line moveTarget walking when set, so the hero
   *  pathfinds around blocked cells instead of getting stuck on walls.
   *  FinaleController computes via findPath when the player issues a
   *  move command or sets a tower target. */
  pathWaypoints: { x: number; y: number }[] | null = null;

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
    this.spawnAnchor = { x, y };  // default to construct position

    this.abilities = typeDef.abilities.map(a => ({
      def: a,
      cooldownRemaining: 0,
    })) as [AbilityState, AbilityState, AbilityState];

    this.items = ITEM_SLOT_ORDER.map(slot => ({
      slot,
      tier: 0,
    })) as [ItemState, ItemState, ItemState];

    if (typeDef.ultimate) {
      this.ultimate = { def: typeDef.ultimate, cooldownRemaining: 0 };
    }

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);

    // Create hero sprite if available — resolves to skinned texture if equipped,
    // generating it from the base hero spritesheet via palette-swap if needed.
    const heroSheetKey = ensureHeroSkinTexture(scene, typeDef.id);
    if (heroSheetKey && scene.textures.exists(heroSheetKey)) {
      this.sprite = scene.add.sprite(x, y, heroSheetKey, 0);
      this.sprite.setDepth(15);
      this.sprite.setScale(40 / 64);
      this.sprite.setOrigin(0.5, 0.75);
      this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
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
    dmg += this.accSum('bonusDamage');
    dmg += this.tomeBonusDamage;
    // Berserker Band: +X% damage per 1% missing HP
    const berserk = this.accSum('berserkerScaling');
    if (berserk > 0) {
      const missingPct = 1 - (this.hp / this.maxHp);
      dmg = Math.round(dmg * (1 + missingPct * berserk));
    }
    return dmg;
  }

  getEffectiveAttackSpeed(): number {
    let as = this.baseAttackSpeed;
    for (const buff of this.buffs) {
      if (buff.stat === 'attackSpeed') as *= (1 + buff.amount);
    }
    const accBonus = this.accSum('attackSpeedPct');
    if (accBonus > 0) as *= (1 + accBonus);
    as += this.tomeBonusAttackSpeed;
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
    if (this.phasing > 0) {
      const phaseMult = this.accSum('phaseSpeedMult');
      if (phaseMult > 0) speed *= (1 + phaseMult);
    }
    return speed;
  }

  getEffectiveRange(): number {
    return this.baseAttackRange + this.accSum('bonusRange');
  }

  getEffectiveMaxHp(): number {
    let hp = this.typeDef.hp;
    for (const item of this.items) {
      if (item.tier > 0) {
        const stats = ITEM_SLOTS[item.slot].tiers[item.tier - 1].stats;
        hp += stats.bonusHp ?? 0;
      }
    }
    hp += this.accSum('bonusHp');
    hp += this.tomeBonusHp;
    return hp;
  }

  getArmorFlat(): number {
    let armor = this.typeDef.baseArmor ?? 0;
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
    if (this.ultimate && this.ultimate.cooldownRemaining > 0) {
      this.ultimate.cooldownRemaining = Math.max(0, this.ultimate.cooldownRemaining - dt);
    }

    // Tick invulnerability
    if (this.invulnerable > 0) this.invulnerable -= dt;

    // Tick accessory cooldowns and phasing
    for (const [id, cd] of this.accessoryCooldowns) {
      if (cd > 0) this.accessoryCooldowns.set(id, Math.max(0, cd - dt));
    }
    if (this.phasing > 0) this.phasing -= dt;

    // Tick meteor storm — only fire next if previous was consumed
    if (this.meteorStorm) {
      this.meteorStorm.timer -= dt;
      if (this.meteorStorm.timer <= 0 && this.meteorStorm.remaining > 0 && !this.pendingMeteor) {
        this.meteorStorm.remaining--;
        this.meteorStorm.timer = this.meteorStorm.interval / 1000;
        this.pendingMeteor = {
          damage: this.meteorStorm.damage,
          radius: this.meteorStorm.radius,
        };
      }
      if (this.meteorStorm.remaining <= 0 && !this.pendingMeteor) {
        this.meteorStorm = null;
      }
    }

    // Tick death mark
    if (this.deathMark) {
      this.deathMark.remaining -= dt;
      if (this.deathMark.remaining <= 0) {
        // Apply bonus damage to all marked targets
        const bonus = Math.round(this.deathMark.damageDealt * this.deathMark.bonusPct / 100);
        if (bonus > 0) {
          for (const c of this.deathMark.targets) {
            if (c.alive) {
              c.takeDamage(bonus);
              this.totalDamageDealt += bonus;
              this.pendingDamageNumbers.push({ x: c.x, y: c.y - 10, text: String(bonus), color: DMG_COLOR.ABILITY, duration: 1.0 });
              this.pendingEffects.push(FX.execute(c.x, c.y));
              if (!c.alive) this.kills++;
            }
          }
        }
        this.deathMark = null;
      }
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

    // Move along pre-computed waypoint path (M10 finale pathfinding).
    // Walks toward the next waypoint; advances when reached. Beats the
    // legacy straight-line move when set so hero doesn't no-clip walls.
    if (this.pathWaypoints && this.pathWaypoints.length > 0) {
      const speed = this.getEffectiveSpeed();
      let remaining = speed * dt;
      while (remaining > 0 && this.pathWaypoints.length > 0) {
        const wp = this.pathWaypoints[0];
        const dx = wp.x - this.x;
        const dy = wp.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= remaining) {
          this.x = wp.x;
          this.y = wp.y;
          remaining -= dist;
          this.pathWaypoints.shift();
        } else {
          this.x += (dx / dist) * remaining;
          this.y += (dy / dist) * remaining;
          remaining = 0;
        }
      }
      if (this.pathWaypoints.length === 0) {
        this.pathWaypoints = null;
        this.moveTarget = null;
      }
    } else if (this.moveTarget) {
      // Legacy straight-line move (Hero Defense / non-finale).
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

    // Clamp to bounds. M10 finale uses worldBounds (full grid rect);
    // every other mode uses the arena rectangle.
    if (this.worldBounds) {
      this.x = Math.max(this.worldBounds.minX + 20, Math.min(this.worldBounds.maxX - 20, this.x));
      this.y = Math.max(this.worldBounds.minY + 20, Math.min(this.worldBounds.maxY - 20, this.y));
    } else {
      this.x = Math.max(20, Math.min(this.arenaWidth - 20, this.x));
      this.y = Math.max(20, Math.min(this.arenaHeight - 20, this.y));
    }

    // M10 finale — prioritize the player's clicked CPU target (Tower or
    // DestructibleStructure). Approach via pathfinding (FinaleController
    // set pathWaypoints), then attack on cooldown. Straight-line fallback
    // skipped when worldBounds is set (finale mode) — without a real path
    // the hero just sits and waits for player to re-click.
    let firedTowerThisFrame = false;
    if (this.clickedTarget) {
      const t = this.clickedTarget;
      const targetDead = !isClickedTargetAlive(t);
      if (targetDead) {
        this.clickedTarget = null;
      } else {
        const dx = t.x - this.x;
        const dy = t.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.getEffectiveRange()) {
          const attackInterval = 1000 / this.getEffectiveAttackSpeed();
          const now = this.scene.time.now;
          if (now - this.lastAttackTime >= attackInterval) {
            this.attackTarget(t);
            this.lastAttackTime = now;
            firedTowerThisFrame = true;
          }
        } else if (!this.worldBounds && !this.moveTarget) {
          // Legacy non-finale: straight-line walk. Finale path uses
          // pathWaypoints (handled in the move block above), so this
          // fallback only fires for old Hero Defense flows.
          const speed = this.getEffectiveSpeed();
          const move = speed * dt;
          this.x += (dx / dist) * move;
          this.y += (dy / dist) * move;
        }
      }
    }

    // Find target
    if (!this.target || !this.target.alive) {
      this.target = this.findTarget(arenaCreeps);
    }

    // Auto-attack
    if (!firedTowerThisFrame && this.target && this.target.alive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.getEffectiveRange()) {
        const attackInterval = 1000 / this.getEffectiveAttackSpeed();
        const now = this.scene.time.now;
        if (now - this.lastAttackTime >= attackInterval) {
          this.attack(this.target);
          this.lastAttackTime = now;
        }
      } else if (!this.moveTarget && !this.clickedTarget && !this.pathWaypoints) {
        // Move towards creep target only when the player has not
        // commanded a destination. Otherwise the hero would fight
        // its own move command (running off to creeps mid-walk).
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
    let isCrit = false;
    const critChance = this.getCritChance();
    if (Math.random() < critChance) {
      let critMult = 1.5;
      critMult += this.accSum('critDmgBonus');
      dmg = Math.round(dmg * critMult);
      isCrit = true;
    }
    // Amp mark
    if (this.ampTarget === target && this.ampRemaining > 0) {
      dmg = Math.round(dmg * (1 + this.ampPercent / 100));
    }

    const dmgColor = isCrit ? DMG_COLOR.CRIT : DMG_COLOR.NORMAL;

    if (this.baseAttackRange <= Hero.MELEE_THRESHOLD) {
      this.applyDamage(target, dmg, dmgColor);
      this.applyOnHitEffects(target, dmg);
    } else {
      const g = this.scene.add.graphics().setDepth(16);
      this.projectiles.push({
        x: this.x,
        y: this.y,
        target,
        damage: dmg,
        speed: Hero.PROJECTILE_SPEED,
        color: this.typeDef.color,
        dmgColor,
        graphics: g,
      });
    }
  }

  /** M10 finale — apply damage to a CPU target (Tower or
   *  DestructibleStructure). Mirrors `attack()` but routes damage
   *  through `target.takeDamage` instead of the arena-creep pipeline.
   *  Crit + lifesteal still apply; on-hit status effects (slow /
   *  mark / chain) are no-op against towers/structures for v1
   *  (immobile, can't be slowed; chain spread to creeps is v2
   *  polish). Increments towersDestroyed on the killing blow for
   *  analytics + star objective tracking. Both Tower and
   *  DestructibleStructure expose the same `takeDamage(amount):
   *  boolean` shape, so this works structurally. */
  private attackTarget(target: Tower | DestructibleStructure): void {
    let dmg = this.getEffectiveDamage();
    let isCrit = false;
    if (Math.random() < this.getCritChance()) {
      let critMult = 1.5;
      critMult += this.accSum('critDmgBonus');
      dmg = Math.round(dmg * critMult);
      isCrit = true;
    }
    const dmgColor = isCrit ? DMG_COLOR.CRIT : DMG_COLOR.NORMAL;
    // Floating damage number above the target so the player sees feedback.
    // Anchor above the target's pixel center; for multi-cell structures
    // that's the structure center, which reads correctly.
    this.pendingDamageNumbers.push({
      x: target.x, y: target.y - 24,
      text: String(dmg), color: dmgColor, duration: 0.6,
    });
    const killed = target.takeDamage(dmg);
    if (killed) {
      this.towersDestroyed++;
      this.clickedTarget = null; // clear so player can pick a new one
    }
    // Lifesteal (sum across accessories)
    const ls = this.accSum('lifestealPct');
    if (ls > 0) {
      const heal = Math.round(dmg * ls);
      if (heal > 0 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.pendingDamageNumbers.push({ x: this.x, y: this.y - 20, text: `+${heal}`, color: DMG_COLOR.HEAL, duration: 0.6 });
      }
    }
  }

  /** Apply accessory on-hit effects (aggregated across all equipped) */
  private applyOnHitEffects(target: ArenaCreep, dmg: number): void {
    if (this.accessories.length === 0) return;
    // Lifesteal (sum)
    const ls = this.accSum('lifestealPct');
    if (ls > 0) {
      const heal = Math.round(dmg * ls);
      if (heal > 0 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.pendingDamageNumbers.push({ x: this.x, y: this.y - 20, text: `+${heal}`, color: DMG_COLOR.HEAL, duration: 0.6 });
      }
    }
    // Frost slow (use strongest)
    const slowPct = this.accSum('slowPct');
    const slowDur = this.accSum('slowDuration');
    if (slowPct > 0 && slowDur > 0 && target.alive) {
      target.slowed = slowDur;
      target.slowFactor = slowPct;
    }
    // Chain lightning (sum chance)
    const clChance = this.accSum('chainLightningChance');
    if (clChance > 0 && Math.random() < clChance) {
      this.pendingChainLightning = {
        x: target.x, y: target.y,
        damage: this.accSum('chainLightningDmg') || 30,
      };
    }
    // Splash AoE (use best equipped)
    const splashRadius = this.accSum('splashRadius');
    const splashPct = this.accSum('splashPct');
    if (splashRadius > 0 && splashPct > 0) {
      this.pendingSplash.push({
        x: target.x, y: target.y,
        radius: splashRadius,
        damage: Math.round(dmg * splashPct),
      });
    }
  }

  private applyDamage(target: ArenaCreep, dmg: number, color?: string): void {
    target.takeDamage(dmg);
    this.totalDamageDealt += dmg;
    // Track death mark damage
    if (this.deathMark && this.deathMark.targets.has(target)) {
      this.deathMark.damageDealt += dmg;
    }
    this.pendingDamageNumbers.push({
      x: target.x, y: target.y - 10,
      text: String(dmg),
      color: color ?? DMG_COLOR.NORMAL,
      duration: 0.8,
    });
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
        this.applyDamage(proj.target, proj.damage, proj.dmgColor);
        this.applyOnHitEffects(proj.target, proj.damage);
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

  useAbility(index: number, arenaCreeps: ArenaCreep[], targetX?: number, targetY?: number, overrideDef?: AbilityDef): boolean {
    let def: AbilityDef;
    if (overrideDef) {
      // Ultimate — cooldown managed by ArenaManager
      def = overrideDef;
      if (!this.alive) return false;
    } else {
      const ab = this.abilities[index];
      if (!ab || ab.cooldownRemaining > 0 || !this.alive) return false;
      ab.cooldownRemaining = ab.def.cooldown;
      this.abilitiesUsed++;
      def = ab.def;
    }

    // Trigger ability animation
    if (this.sprite) {
      this._animState = 'ability';
      this._abilityIndex = overrideDef ? 3 : index; // ultimate = slot 3
      this._abilityAnimTimer = 0.5; // show ability frame for 0.5s
    }

    // PRD 03: per-hero ability VFX. Spawned at the impact location
    // when the sheet exists for this hero × ability combo. Layers on
    // top of the existing procedural FX (no removal — both can co-exist
    // for v1; we'll dial the procedurals back after authoring lands
    // for all 11 heroes). No-op when this hero hasn't shipped a VFX
    // sheet yet (v1 = mage / ranger / paladin only).
    {
      const heroId = this.typeDef.id;
      const targetCreep = this.target ?? this.findTarget(arenaCreeps);
      const fxX = targetX !== undefined
        ? targetX
        : (def.type === 'self_buff' || def.type === 'aoe' || def.key === 'E')
          ? this.x
          : (targetCreep?.x ?? this.x);
      const fxY = targetY !== undefined
        ? targetY
        : (def.type === 'self_buff' || def.type === 'aoe' || def.key === 'E')
          ? this.y
          : (targetCreep?.y ?? this.y);
      spawnHeroAbilityVfx(this.scene, heroId, def.key, fxX, fxY);
    }

    switch (def.type) {
      case 'stun': {
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          const d = def.damage ?? 0;
          target.takeDamage(d);
          this.totalDamageDealt += d;
          target.stunned = def.stunDuration ?? 1;
          if (d > 0) this.pendingDamageNumbers.push({ x: target.x, y: target.y - 10, text: String(d), color: DMG_COLOR.ABILITY, duration: 0.8 });
          this.pendingEffects.push(FX.stun(target.x, target.y));
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
        this.pendingEffects.push(FX.buffRing(this.x, this.y, this.typeDef.color));
        break;
      }
      case 'aoe': {
        const aoeDmg = def.damage ?? 0;
        const aoeRadius = def.splashRadius ?? 100;
        const aoeColor = def.slowAmount ? 0x44aaff : 0xff6644; // blue if slow, orange otherwise
        this.pendingEffects.push(FX.aoeBlast(this.x, this.y, aoeRadius, aoeColor));
        if (def.slowAmount) this.pendingEffects.push(FX.shockwave(this.x, this.y, aoeRadius, 0x44aaff));
        for (const c of arenaCreeps) {
          if (!c.alive) continue;
          const dx = c.x - this.x;
          const dy = c.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= aoeRadius) {
            c.takeDamage(aoeDmg);
            this.totalDamageDealt += aoeDmg;
            if (aoeDmg > 0) this.pendingDamageNumbers.push({ x: c.x, y: c.y - 10, text: String(aoeDmg), color: DMG_COLOR.ABILITY, duration: 0.8 });
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
        const target = this.target ?? this.findTarget(arenaCreeps);
        if (target) {
          const d = def.damage ?? 0;
          target.takeDamage(d);
          this.totalDamageDealt += d;
          if (d > 0) this.pendingDamageNumbers.push({ x: target.x, y: target.y - 10, text: String(d), color: DMG_COLOR.ABILITY, duration: 0.8 });
          // Projectile trail + impact
          this.pendingEffects.push(FX.dashTrail(this.x, this.y, target.x, target.y, this.typeDef.color));
          this.pendingEffects.push(FX.aoeBlast(target.x, target.y, def.splashRadius ?? 60, 0xff6622));
          if (!target.alive) this.kills++;
          if (def.splashRadius) {
            for (const c of arenaCreeps) {
              if (!c.alive || c === target) continue;
              const dx = c.x - target.x;
              const dy = c.y - target.y;
              if (Math.sqrt(dx * dx + dy * dy) <= def.splashRadius) {
                const splashDmg = Math.round(d * 0.6);
                c.takeDamage(splashDmg);
                this.totalDamageDealt += splashDmg;
                if (splashDmg > 0) this.pendingDamageNumbers.push({ x: c.x, y: c.y - 10, text: String(splashDmg), color: DMG_COLOR.ABILITY, duration: 0.8 });
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
          const startX = this.x, startY = this.y;
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (def.dashRange ?? 200)) {
            this.x = target.x - 20;
            this.y = target.y;
            const d = def.damage ?? 0;
            target.takeDamage(d);
            this.totalDamageDealt += d;
            if (d > 0) this.pendingDamageNumbers.push({ x: target.x, y: target.y - 10, text: String(d), color: DMG_COLOR.ABILITY, duration: 0.8 });
            this.pendingEffects.push(FX.dashTrail(startX, startY, this.x, this.y, this.typeDef.color));
            this.pendingEffects.push(FX.stun(target.x, target.y));
            if (def.ampPercent) {
              this.ampTarget = target;
              this.ampPercent = def.ampPercent;
              this.ampRemaining = 5;
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
            this.pendingEffects.push(FX.teleportFlash(this.x, this.y, this.typeDef.color));
            this.x = targetX;
            this.y = targetY;
            this.pendingEffects.push(FX.teleportFlash(this.x, this.y, this.typeDef.color));
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
          this.pendingDamageNumbers.push({ x: target.x, y: target.y - 10, text: String(dmg), color: DMG_COLOR.ABILITY, duration: 0.8 });
          this.pendingEffects.push(FX.execute(target.x, target.y));
          if (hpRatio < (def.hpThreshold ?? 0.3)) {
            this.pendingEffects.push(FX.shockwave(target.x, target.y, 40, 0xff4444));
          }
          if (!target.alive) this.kills++;
        }
        break;
      }
      case 'taunt': {
        this.invulnerable = def.invulnDuration ?? 5;
        for (const c of arenaCreeps) {
          if (c.alive) c.forcedTarget = true;
        }
        this.pendingEffects.push(FX.shockwave(this.x, this.y, 200, 0xffdd44));
        this.pendingEffects.push(FX.buffRing(this.x, this.y, 0xffdd44));
        this.pendingDamageNumbers.push({ x: this.x, y: this.y - 30, text: 'FORTRESS!', color: DMG_COLOR.ABILITY, duration: 1.5 });
        break;
      }
      case 'meteor_storm': {
        const interval = def.meteorInterval ?? 1000;
        this.meteorStorm = {
          remaining: (def.meteorCount ?? 3) - 1,
          interval,
          timer: interval / 1000,
          damage: def.meteorDamage ?? 150,
          radius: def.meteorRadius ?? 100,
        };
        this.pendingMeteor = { damage: def.meteorDamage ?? 150, radius: def.meteorRadius ?? 100 };
        this.pendingEffects.push(FX.shockwave(this.x, this.y, 150, 0xff6622));
        this.pendingDamageNumbers.push({ x: this.x, y: this.y - 30, text: 'METEOR STORM!', color: DMG_COLOR.ABILITY, duration: 1.5 });
        break;
      }
      case 'death_mark': {
        this.deathMark = {
          remaining: def.markDuration ?? 3,
          damageDealt: 0,
          bonusPct: def.markBonusPct ?? 30,
          targets: new Set(arenaCreeps.filter(c => c.alive)),
        };
        this.pendingDamageNumbers.push({ x: this.x, y: this.y - 30, text: 'DEATH MARK!', color: DMG_COLOR.ABILITY, duration: 1.5 });
        break;
      }
    }

    return true;
  }

  // === Damage / Death / Respawn ===

  takeDamage(amount: number): void {
    if (!this.alive) return;
    // Invulnerability check
    if (this.invulnerable > 0) return;
    // Dodge check
    if (Math.random() < this.getDodgeChance()) {
      this.pendingDamageNumbers.push({
        x: this.x, y: this.y - 20, text: 'DODGE', color: DMG_COLOR.NORMAL, duration: 0.6,
      });
      return;
    }
    // Armor reduction
    const armor = this.getArmorFlat();
    const reduction = armor / (armor + 50); // diminishing returns
    const dmg = Math.max(1, Math.round(amount * (1 - reduction)));
    this.hp -= dmg;
    this.pendingDamageNumbers.push({
      x: this.x, y: this.y - 20, text: String(dmg), color: DMG_COLOR.HERO_DAMAGE, duration: 0.8,
    });
    // Thorns Mail: reflect damage (sum)
    const reflect = this.accSum('reflectPct');
    if (reflect > 0) {
      this.pendingReflectDamage = Math.round(dmg * reflect);
    }
    if (this.hp <= 0) {
      // Guardian Angel: revive once
      if (this.accHas('guardianAngel') && !this.guardianAngelUsed) {
        this.guardianAngelUsed = true;
        this.hp = Math.round(this.maxHp * 0.5);
        this.pendingDamageNumbers.push({
          x: this.x, y: this.y - 30, text: 'REVIVED!', color: DMG_COLOR.HEAL, duration: 1.5,
        });
        return;
      }
      this.die();
    }
  }

  die(): void {
    this.alive = false;
    this.hp = 0;
    this.deaths++;
    this.respawnTimer = this.respawnSeconds;
    this.target = null;
    this.moveTarget = null;
  }

  respawn(): void {
    this.alive = true;
    this.maxHp = this.getEffectiveMaxHp();
    this.hp = this.maxHp;
    // Default Hero Defense: respawn at arena centre. M10 finale: respawn
    // at the configured spawnAnchor (midpoint of summoning circles).
    if (this.worldBounds) {
      this.x = this.spawnAnchor.x;
      this.y = this.spawnAnchor.y;
    } else {
      this.x = this.arenaWidth / 2;
      this.y = this.arenaHeight / 2;
    }
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
    const heal = Math.round(this.maxHp * pct);
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    const actual = this.hp - oldHp;
    if (actual > 0) {
      this.pendingDamageNumbers.push({
        x: this.x, y: this.y - 20, text: `+${actual}`, color: DMG_COLOR.HEAL, duration: 1.0,
      });
    }
  }

  // === Accessories ===

  /** Get sum/first value of a numeric accessory property across all equipped */
  accSum(key: keyof AccessoryDef): number {
    let total = 0;
    for (const a of this.accessories) {
      const v = a[key];
      if (typeof v === 'number') total += v;
    }
    return total;
  }

  /** Check if any accessory has a truthy property */
  accHas(key: keyof AccessoryDef): boolean {
    return this.accessories.some(a => !!a[key]);
  }

  equipAccessory(acc: AccessoryDef): void {
    if (this.accessories.length >= Hero.MAX_ACCESSORIES) return; // full
    this.accessories.push(acc);
    this.accessoryCooldowns.set(acc.id, 0);
    if (acc.guardianAngel) this.guardianAngelUsed = false;
  }

  useAccessory(arenaCreeps: ArenaCreep[]): boolean {
    if (!this.alive) return false;
    // Find first active accessory that's off cooldown
    const active = this.accessories.find(a => !a.passive && (this.accessoryCooldowns.get(a.id) ?? 0) <= 0);
    if (!active) return false;
    this.accessoryCooldowns.set(active.id, active.cooldown ?? 30);

    if (active.healPct) {
      this.healPercent(active.healPct);
    }
    if (active.phaseDuration) {
      this.phasing = active.phaseDuration;
      this.pendingDamageNumbers.push({ x: this.x, y: this.y - 20, text: 'PHASE!', color: DMG_COLOR.ABILITY, duration: 0.8 });
    }
    if (active.stunDuration && active.stunRadius) {
      for (const c of arenaCreeps) {
        if (!c.alive) continue;
        const dx = c.x - this.x;
        const dy = c.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) <= active.stunRadius) {
          c.stunned = active.stunDuration;
        }
      }
      this.pendingDamageNumbers.push({ x: this.x, y: this.y - 20, text: 'HORN!', color: DMG_COLOR.ABILITY, duration: 0.8 });
    }
    return true;
  }

  // === Leveling ===

  /** XP needed to reach NEXT level from current (level * 15) */
  xpToNextLevel(): number {
    if (this.level >= Hero.MAX_LEVEL) return Infinity;
    return this.level * 15;
  }

  /** Total XP needed from 0 to reach a given level */
  xpForLevel(lvl: number): number {
    return ((lvl - 1) * lvl / 2) * 15;
  }

  grantXP(amount: number): void {
    if (this.level >= Hero.MAX_LEVEL) return;
    this.xp += amount;
    while (this.level < Hero.MAX_LEVEL && this.xp >= this.xpToNextLevel()) {
      this.xp -= this.xpToNextLevel();
      this.level++;
      this.applyLevelUp();
    }
    if (this.level >= Hero.MAX_LEVEL) this.xp = 0;
  }

  private applyLevelUp(): void {
    this.pendingUpgrades++;
    this.pendingDamageNumbers.push({
      x: this.x, y: this.y - 30, text: `LEVEL ${this.level}!`, color: DMG_COLOR.LEVEL_UP, duration: 1.5,
    });
    if (this.level === Hero.ULTIMATE_UNLOCK_LEVEL && this.ultimate) {
      this.pendingDamageNumbers.push({
        x: this.x, y: this.y - 45, text: '[R] UNLOCKED!', color: DMG_COLOR.ABILITY, duration: 2.0,
      });
    }
  }

  /** Available upgrade choices (shown in sidebar) */
  getUpgradeOptions(): { id: string; label: string; desc: string }[] {
    return [
      { id: 'hp', label: '+30 Max HP', desc: `${this.maxHp} → ${this.maxHp + 30}` },
      { id: 'damage', label: '+5 Damage', desc: `${this.baseDamage} → ${this.baseDamage + 5}` },
      { id: 'attackSpeed', label: '+0.05 Attack Speed', desc: `${this.baseAttackSpeed.toFixed(2)} → ${(this.baseAttackSpeed + 0.05).toFixed(2)}` },
      { id: 'cooldown', label: '-10% Ability CDs', desc: 'All Q/W/E cooldowns' },
    ];
  }

  /** Apply a chosen upgrade */
  applyUpgrade(id: string): void {
    if (this.pendingUpgrades <= 0) return;
    this.pendingUpgrades--;
    switch (id) {
      case 'hp':
        this.maxHp += 30;
        this.hp = Math.min(this.hp + 30, this.maxHp);
        break;
      case 'damage':
        this.baseDamage += 5;
        break;
      case 'attackSpeed':
        this.baseAttackSpeed += 0.05;
        break;
      case 'cooldown':
        for (const ab of this.abilities) {
          ab.def = { ...ab.def, cooldown: Math.round(ab.def.cooldown * 0.9 * 10) / 10 };
        }
        break;
    }
  }

  /** Upgrade a specific ability (Q=0, W=1, E=2, R=3). Costs 1 pending upgrade point.
   *  Each upgrade: +20% damage/effect, -5% cooldown */
  upgradeAbility(index: number): void {
    if (this.pendingUpgrades <= 0) return;
    const ab = index === 3 ? this.ultimate : this.abilities[index];
    if (!ab) return;
    // R requires unlock
    if (index === 3 && this.level < Hero.ULTIMATE_UNLOCK_LEVEL) return;

    this.pendingUpgrades--;
    this.abilityUpgrades[index]++;

    const def = ab.def;
    const boosted = { ...def };

    // -5% cooldown
    boosted.cooldown = Math.round(def.cooldown * 0.95 * 10) / 10;

    // +20% to damage values
    if (boosted.damage) boosted.damage = Math.round(boosted.damage * 1.2);
    if (boosted.damageBelow) boosted.damageBelow = Math.round(boosted.damageBelow * 1.2);
    if (boosted.damageAbove) boosted.damageAbove = Math.round(boosted.damageAbove * 1.2);
    if (boosted.meteorDamage) boosted.meteorDamage = Math.round(boosted.meteorDamage * 1.2);

    // +20% to buff/effect values
    if (boosted.buffAmount) boosted.buffAmount = boosted.buffAmount * 1.2;
    if (boosted.buffDuration) boosted.buffDuration = Math.round(boosted.buffDuration * 1.2 * 10) / 10;
    if (boosted.stunDuration) boosted.stunDuration = Math.round(boosted.stunDuration * 1.2 * 10) / 10;
    if (boosted.slowAmount) boosted.slowAmount = Math.min(0.9, boosted.slowAmount * 1.2);
    if (boosted.slowDuration) boosted.slowDuration = Math.round(boosted.slowDuration * 1.2 * 10) / 10;
    if (boosted.dodgeDuration) boosted.dodgeDuration = Math.round(boosted.dodgeDuration * 1.2 * 10) / 10;
    if (boosted.invulnDuration) boosted.invulnDuration = Math.round(boosted.invulnDuration * 1.2 * 10) / 10;
    if (boosted.markBonusPct) boosted.markBonusPct = Math.round(boosted.markBonusPct * 1.2);
    if (boosted.splashRadius) boosted.splashRadius = Math.round(boosted.splashRadius * 1.1);
    if (boosted.meteorRadius) boosted.meteorRadius = Math.round(boosted.meteorRadius * 1.1);
    if (boosted.ampPercent) boosted.ampPercent = Math.round(boosted.ampPercent * 1.2);

    ab.def = boosted;

    const key = index === 3 ? 'R' : ['Q', 'W', 'E'][index];
    this.pendingDamageNumbers.push({
      x: this.x, y: this.y - 30, text: `${key} UPGRADED!`, color: DMG_COLOR.ABILITY, duration: 1.2,
    });
  }

  // === Rendering ===

  draw(): void {
    this.graphics.clear();

    if (!this.alive) {
      if (this.sprite) this.sprite.setVisible(false);
      return;
    }

    // Update sprite position and animation
    if (this.sprite) {
      this.sprite.setVisible(true);
      this.sprite.setPosition(this.x, this.y);

      // Determine facing direction
      const dx = this.moveTarget ? this.moveTarget.x - this.x : (this.target ? this.target.x - this.x : 0);
      const dy = this.moveTarget ? this.moveTarget.y - this.y : (this.target ? this.target.y - this.y : 0);

      // Row: 0=down, 1=side, 2=up
      if (Math.abs(dy) > Math.abs(dx)) {
        this._facingRow = dy < 0 ? 2 : 0;
        this.sprite.setFlipX(false);
      } else if (dx !== 0) {
        this._facingRow = 1;
        this.sprite.setFlipX(dx < 0);
      }

      // Animation state machine
      // Sheet layout per row: idle(0,1), walk(2,3,4,5), attack(6,7)
      const isMoving = this.moveTarget !== null;
      const isAttacking = this.target !== null && !isMoving;

      // Tick ability animation timer
      if (this._abilityAnimTimer > 0) {
        this._abilityAnimTimer -= 1 / 60; // approximate delta
        if (this._abilityAnimTimer <= 0) {
          this._animState = 'idle';
        }
      }

      // Update animation state (ability takes priority)
      if (this._animState !== 'ability') {
        if (isAttacking) this._animState = 'attack';
        else if (isMoving) this._animState = 'walk';
        else this._animState = 'idle';
      }

      // Tick frame animation
      this._animTimer += 1 / 60;

      let col = 0;
      switch (this._animState) {
        case 'idle':
          // Alternate between frames 0-1 slowly
          col = Math.floor(this._animTimer * 2) % 2;
          break;
        case 'walk':
          // Cycle through frames 2-5
          col = 2 + Math.floor(this._animTimer * 6) % 4;
          break;
        case 'attack':
          // Slow attack cycle: frame 6 (windup) holds longer, frame 7 (strike) flashes
          // ~1.5fps gives a deliberate, weighty feel
          col = 6 + Math.floor(this._animTimer * 1.5) % 2;
          break;
        case 'ability':
          // Show ability frame from row 3
          // Row 3 has 8 frames: abilities 0-3 use pairs of frames
          const abilityCol = Math.min(this._abilityIndex, 3) * 2;
          this.sprite.setFrame(3 * 8 + abilityCol);
          break; // skip normal row selection
      }

      if (this._animState !== 'ability') {
        this.sprite.setFrame(this._facingRow * 8 + col);
      }
    }

    const size = 14;

    // Only draw Graphics body if no sprite
    if (!this.sprite) {
      this.graphics.fillStyle(this.typeDef.color, 1);
      this.graphics.beginPath();
      this.graphics.moveTo(this.x, this.y - size);
      this.graphics.lineTo(this.x + size, this.y);
      this.graphics.lineTo(this.x, this.y + size);
      this.graphics.lineTo(this.x - size, this.y);
      this.graphics.closePath();
      this.graphics.fillPath();

      this.graphics.lineStyle(2, 0xffffff, 0.6);
      this.graphics.beginPath();
      this.graphics.moveTo(this.x, this.y - size);
      this.graphics.lineTo(this.x + size, this.y);
      this.graphics.lineTo(this.x, this.y + size);
      this.graphics.lineTo(this.x - size, this.y);
      this.graphics.closePath();
      this.graphics.strokePath();
    }

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
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
    for (const p of this.projectiles) p.graphics.destroy();
    this.projectiles = [];
  }
}

/** Liveness check shared by Hero target logic. Tower and
 *  DestructibleStructure use slightly different shapes:
 *   - Tower: alive when `destructible && !_expired && (hp ?? 1) > 0`
 *   - DestructibleStructure: has an explicit `alive` getter
 *  Returns false on any unexpected shape so dead targets are cleared. */
function isClickedTargetAlive(t: Tower | DestructibleStructure): boolean {
  if ('alive' in t && typeof (t as { alive?: unknown }).alive === 'boolean') {
    return (t as { alive: boolean }).alive;
  }
  // Tower path
  const tw = t as Tower;
  if (!tw.destructible) return false;
  if ((tw as { _expired?: boolean })._expired) return false;
  return (tw.hp ?? 1) > 0;
}
