import { TILE_SIZE, COLOR_PROJECTILE } from '../config';
import { TowerType } from '../data/TowerTypes';
import { DamageType } from '../data/CreepTypes';
import { calculateDamage } from '../systems/DamageCalculator';
import { Creep } from './Creep';

interface Projectile {
  x: number;
  y: number;
  target: Creep;
  speed: number;
  graphics: Phaser.GameObjects.Graphics;
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
  splash: number;
  slowDuration: number;
  slowFactor: number;
  ability: string | undefined;

  // Ramp-up state (mech_turret)
  private lastTargetId: number = -1;
  private rampStacks: number = 0;

  // Adjacency buff tracking
  adjacencyDamageBonus: number = 0;
  adjacencyRateBonus: number = 0;

  // Gold earned tracking (void_siphon)
  goldEarned: number = 0;

  constructor(scene: Phaser.Scene, col: number, row: number, towerType: TowerType) {
    this.col = col;
    this.row = row;
    this.x = col * TILE_SIZE + TILE_SIZE / 2;
    this.y = row * TILE_SIZE + TILE_SIZE / 2;
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
    this.splash = towerType.splash;
    this.slowDuration = towerType.slowDuration;
    this.slowFactor = towerType.slowFactor;
    this.ability = towerType.ability;
    this.level = 1;
    this.lastFired = 0;
    this.projectiles = [];

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

    // Level pips
    if (this.level > 1) {
      this.graphics.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < this.level - 1; i++) {
        this.graphics.fillCircle(this.x - 4 + i * 8, this.y + s + 4, 2);
      }
    }

    // Adjacency buff glow
    if (this.adjacencyDamageBonus > 0 || this.adjacencyRateBonus > 0) {
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
    this.drawTower();
  }

  getEffectiveDamage(): number {
    let dmg = this.damage + this.adjacencyDamageBonus;
    if (this.ability === 'variance') {
      // 50% to 150% random
      dmg = Math.round(dmg * (0.5 + Math.random()));
    }
    return dmg;
  }

  getEffectiveFireRate(): number {
    let rate = this.fireRate - this.adjacencyRateBonus;
    if (this.ability === 'ramp_up') {
      // Up to 40% faster with 5 stacks on same target
      const reduction = Math.min(this.rampStacks * 0.08, 0.4);
      rate = Math.round(rate * (1 - reduction));
    }
    return Math.max(100, rate);
  }

  update(time: number, delta: number, creeps: Creep[]): void {
    const effectiveRate = this.getEffectiveFireRate();
    if (time - this.lastFired >= effectiveRate) {
      const target = this.findTarget(creeps);
      if (target) {
        // Track ramp stacks
        const targetId = creeps.indexOf(target);
        if (this.ability === 'ramp_up') {
          if (targetId === this.lastTargetId) {
            this.rampStacks = Math.min(this.rampStacks + 1, 5);
          } else {
            this.rampStacks = 0;
            this.lastTargetId = targetId;
          }
        }

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
    this.projectiles.push({
      x: this.x,
      y: this.y,
      target,
      speed: this.typeDef.projectileSpeed,
      graphics: g,
    });
  }

  updateProjectiles(delta: number, allCreeps: Creep[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (!p.target.alive) {
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const move = p.speed * (delta / 1000);

      if (dist <= move) {
        this.onProjectileHit(p, allCreeps);
        p.graphics.destroy();
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;

        p.graphics.clear();
        const projColor = this.ability === 'gold_on_hit' ? 0xffdd44 : COLOR_PROJECTILE;
        p.graphics.fillStyle(projColor, 1);
        p.graphics.fillCircle(p.x, p.y, this.splash > 0 ? 4 : 3);
      }
    }
  }

  private onProjectileHit(p: Projectile, allCreeps: Creep[]): void {
    const effectiveDmg = this.getEffectiveDamage();

    if (this.ability === 'teleport_back') {
      // Move creep back along its path
      const stepsBack = 3 + this.level;
      p.target.pathIndex = Math.max(1, p.target.pathIndex - stepsBack);
      const tp = p.target.path[p.target.pathIndex - 1];
      if (tp) {
        p.target.x = tp.col * TILE_SIZE + TILE_SIZE / 2;
        p.target.y = tp.row * TILE_SIZE + TILE_SIZE / 2;
      }
      return;
    }

    if (this.ability === 'chain') {
      // Hit primary target, then chain to 2 more nearby
      const chainCount = 2 + Math.floor(this.level / 2);
      const chainRange = TILE_SIZE * 3;
      const dmg = calculateDamage(effectiveDmg, this.damageType, p.target.armor);
      p.target.takeDamage(dmg);

      const hit = new Set<Creep>([p.target]);
      let current = p.target;
      for (let c = 0; c < chainCount; c++) {
        let nearest: Creep | null = null;
        let nearDist = Infinity;
        for (const creep of allCreeps) {
          if (!creep.alive || creep.reached || hit.has(creep)) continue;
          const dx = creep.x - current.x;
          const dy = creep.y - current.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= chainRange && d < nearDist) {
            nearest = creep;
            nearDist = d;
          }
        }
        if (!nearest) break;
        const chainDmg = calculateDamage(Math.round(effectiveDmg * 0.7), this.damageType, nearest.armor);
        nearest.takeDamage(chainDmg);
        hit.add(nearest);
        current = nearest;
      }
      return;
    }

    if (this.splash > 0) {
      for (const creep of allCreeps) {
        if (!creep.alive || creep.reached) continue;
        const dx = creep.x - p.target.x;
        const dy = creep.y - p.target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.splash) {
          const dmg = calculateDamage(effectiveDmg, this.damageType, creep.armor);
          creep.takeDamage(dmg);
          if (this.slowDuration > 0) {
            creep.applySlow(this.slowDuration, this.slowFactor);
          }
        }
      }
    } else {
      const dmg = calculateDamage(effectiveDmg, this.damageType, p.target.armor);
      p.target.takeDamage(dmg);
      if (this.slowDuration > 0) {
        p.target.applySlow(this.slowDuration, this.slowFactor);
      }
    }

    // Gold on hit (void_siphon)
    if (this.ability === 'gold_on_hit') {
      this.goldEarned += 1;
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
