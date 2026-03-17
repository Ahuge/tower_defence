import { TILE_SIZE, COLOR_PROJECTILE, gridX, gridY } from '../config';
import { TowerType } from '../data/TowerTypes';
import { DamageType } from '../data/CreepTypes';
import { HitTarget } from '../systems/traits/Trait';
import {
  Trait, HitContext, HitStats, createHitStats, hasTrait, getTrait,
  resolveDelivery, resolveDamageModifiers, resolveFireRate,
  resolveHitEffects, resolveOnFire, resolveTowerUpdates,
  cleanupExpiredTraits, UpdateContext,
} from '../systems/traits/Trait';
import { Creep } from './Creep';

interface Projectile {
  x: number;
  y: number;
  target: Creep;
  destX: number; // snapshot of target position at fire time
  destY: number;
  speed: number;
  graphics: Phaser.GameObjects.Graphics;
  locationBased: boolean; // true = continues to location if target dies
}

export class Tower {
  col: number;
  row: number;
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFired: number;
  graphics: Phaser.GameObjects.Graphics;
  projectiles: Projectile[];
  typeId: string;
  typeDef: TowerType;
  color: number;
  cost: number;
  totalInvested: number;
  sellRefundRatio: number;
  level: number;
  damageType: DamageType;
  traits: Trait[];
  goldEarned: number = 0;
  damageDealt: number = 0;
  hitStatsAccum: HitStats = createHitStats(); // granular damage stats
  projectileColor: number;

  constructor(scene: Phaser.Scene, col: number, row: number, towerType: TowerType) {
    this.col = col;
    this.row = row;
    this.x = gridX(col);
    this.y = gridY(row);
    this.typeDef = towerType;
    this.typeId = towerType.id;
    this.range = towerType.range * TILE_SIZE;
    this.damage = towerType.damage;
    this.fireRate = towerType.fireRate;
    this.color = towerType.color;
    this.cost = towerType.cost;
    this.totalInvested = towerType.cost;
    this.sellRefundRatio = towerType.sellRefundRatio;
    this.damageType = towerType.damageType;
    this.projectileColor = towerType.projectileColor ?? COLOR_PROJECTILE;
    this.level = 1;
    this.lastFired = 0;
    this.projectiles = [];

    this.traits = towerType.traits.map(t => ({ ...t }));

    const rangeBonus = getTrait(this.traits, 'range_bonus');
    if (rangeBonus) {
      this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE;
    }

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
    this.drawTower();
  }

  drawTower(): void {
    this.graphics.clear();

    this.graphics.fillStyle(this.color, 1);
    const s = TILE_SIZE * 0.35;
    this.graphics.fillRect(this.x - s, this.y - s, s * 2, s * 2);

    this.graphics.lineStyle(1, 0xffffff, 0.3);
    this.graphics.strokeRect(this.x - s, this.y - s, s * 2, s * 2);

    if (this.level > 1) {
      this.graphics.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < this.level - 1; i++) {
        this.graphics.fillCircle(this.x - 4 + i * 8, this.y + s + 4, 2);
      }
    }

    if (hasTrait(this.traits, '_adj_damage_buff') || hasTrait(this.traits, '_adj_rate_buff')) {
      this.graphics.lineStyle(1, 0xff88aa, 0.4);
      this.graphics.strokeCircle(this.x, this.y, s + 3);
    }
  }

  canUpgrade(): boolean {
    return this.level - 1 < this.typeDef.upgrades.length;
  }

  getUpgradeCost(): number {
    if (!this.canUpgrade()) return 0;
    return this.typeDef.upgrades[this.level - 1].cost;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    const upg = this.typeDef.upgrades[this.level - 1];
    this.level = upg.level;
    this.damage = upg.damage;
    this.range = upg.range * TILE_SIZE;
    this.fireRate = upg.fireRate;
    this.totalInvested += upg.cost;

    const rangeBonus = getTrait(this.traits, 'range_bonus');
    if (rangeBonus) {
      this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE;
    }

    this.drawTower();
  }

  getEffectiveFireRate(): number {
    return resolveFireRate(this.traits, this.fireRate, this);
  }

  runTraitUpdates(ctx: UpdateContext): void {
    resolveTowerUpdates(this.traits, this, ctx);
    cleanupExpiredTraits(this.traits);
  }

  update(time: number, delta: number, creeps: Creep[]): void {
    const effectiveRate = this.getEffectiveFireRate();
    if (time - this.lastFired >= effectiveRate) {
      const target = this.findTarget(creeps);
      if (target) {
        const targetIdx = creeps.indexOf(target);
        resolveOnFire(this.traits, this, targetIdx);
        this.fire(target);
        this.lastFired = time;
      }
    }

    this.updateProjectiles(delta, creeps);
  }

  findTarget(creeps: Creep[]): Creep | null {
    let closest: Creep | null = null;
    let closestDist = Infinity;

    for (const creep of creeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - this.x;
      const dy = creep.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.range && dist < closestDist) {
        closest = creep;
        closestDist = dist;
      }
    }

    return closest;
  }

  fire(target: Creep): void {
    const g = this.graphics.scene.add.graphics();
    g.setDepth(15);
    const isLocationBased = hasTrait(this.traits, 'splash_damage') || hasTrait(this.traits, 'pierce_delivery') || hasTrait(this.traits, 'tower_aura_damage');
    this.projectiles.push({
      x: this.x,
      y: this.y,
      target,
      destX: target.x,
      destY: target.y,
      speed: this.typeDef.projectileSpeed,
      graphics: g,
      locationBased: isLocationBased,
    });
  }

  updateProjectiles(delta: number, allCreeps: Creep[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // If target died: location-based projectiles continue, tracking ones disappear
      if (!p.target.alive && !p.locationBased) {
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Move toward target (if alive and tracking) or destination (location-based)
      const tx = (p.target.alive && !p.locationBased) ? p.target.x : p.destX;
      const ty = (p.target.alive && !p.locationBased) ? p.target.y : p.destY;

      // Update destination if target is still alive (track moving targets)
      if (p.target.alive) {
        p.destX = p.target.x;
        p.destY = p.target.y;
      }

      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = p.speed * (delta / 1000);

      if (dist <= move) {
        if (p.target.alive) {
          this.onProjectileHit(p, allCreeps);
        } else {
          // Location-based: hit whatever's at the destination
          this.onProjectileHitLocation(p, allCreeps);
        }
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;

        p.graphics.clear();
        const hasSplash = hasTrait(this.traits, 'splash_damage');
        p.graphics.fillStyle(this.projectileColor, 1);
        p.graphics.fillCircle(p.x, p.y, hasSplash ? 4 : 3);
      }
    }
  }

  private onProjectileHit(p: Projectile, allCreeps: Creep[]): void {
    const stats = createHitStats();
    const ctx: HitContext = {
      towerLevel: this.level,
      damage: this.damage,
      damageType: this.damageType,
      target: p.target,
      allTargets: allCreeps,
      hitTargets: [],
      goldEarned: 0,
      hitStats: stats,
    };

    resolveDamageModifiers(this.traits, ctx);
    resolveDelivery(this.traits, ctx);
    resolveHitEffects(this.traits, ctx);
    this.goldEarned += ctx.goldEarned;
    this.damageDealt += ctx.damage * ctx.hitTargets.length;
    // Accumulate granular stats
    for (const key of Object.keys(stats)) {
      this.hitStatsAccum[key] = (this.hitStatsAccum[key] ?? 0) + stats[key];
    }
  }

  private onProjectileHitLocation(p: Projectile, allCreeps: Creep[]): void {
    const phantom: HitTarget = {
      x: p.destX, y: p.destY,
      alive: false, reached: false,
      armor: 'medium',
      pathIndex: 0, path: [],
      takeDamage: () => {},
      applySlow: () => {},
    };

    const stats = createHitStats();
    const ctx: HitContext = {
      towerLevel: this.level,
      damage: this.damage,
      damageType: this.damageType,
      target: phantom,
      allTargets: allCreeps,
      hitTargets: [],
      goldEarned: 0,
      hitStats: stats,
    };

    resolveDamageModifiers(this.traits, ctx);
    resolveDelivery(this.traits, ctx);
    resolveHitEffects(this.traits, ctx);
    this.goldEarned += ctx.goldEarned;
    this.damageDealt += ctx.damage * ctx.hitTargets.length;
    for (const key of Object.keys(stats)) {
      this.hitStatsAccum[key] = (this.hitStatsAccum[key] ?? 0) + stats[key];
    }
  }

  getSellValue(): number {
    return Math.floor(this.totalInvested * this.sellRefundRatio);
  }

  destroy(): void {
    this.graphics.destroy();
    for (const p of this.projectiles) {
      p.graphics.destroy();
    }
    this.projectiles = [];
  }
}
