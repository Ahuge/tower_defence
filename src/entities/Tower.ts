import * as Phaser from 'phaser';
import { TILE_SIZE, COLOR_PROJECTILE, gridX, gridY } from '../config';
import { TowerType, TowerUpgrade, TOWER_TYPES, TargetingMode } from '../data/TowerTypes';
import { DamageType } from '../data/CreepTypes';
import { HitTarget } from '../systems/traits/Trait';
import { hasTowerSprite, isMobileTowerSprite, shouldTowerRotate, createTowerSprite, setTowerSpriteState, updateMobileTowerSprite, hasProjectileSprite, createProjectileSprite, playProjectileImpact } from '../systems/SpriteManager';

/** One upgrade option presented to the player. A linear tower has
 *  a single option (branchId=null). A branching tower surfaces the
 *  default path plus one option per defined branch. */
export interface UpgradeOption {
  /** null = default linear continuation; otherwise the branch id. */
  branchId: string | null;
  /** Short label for the button. "Upgrade" for linear, "Hedge" /
   *  "Razor Bramble" / ... for branches. */
  label: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  /** Tower display name AFTER picking this option. Differs from
   *  the current name only when a branch renames the tower. */
  resolvedName: string;
}
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
  destX: number;
  destY: number;
  speed: number;
  graphics: Phaser.GameObjects.Graphics;
  locationBased: boolean;
  age: number;
  /** Optional sprite (replaces Graphics circle when present) */
  sprite?: Phaser.GameObjects.Sprite;
  /** Tower ID that fired this (for impact animation lookup) */
  towerId?: string;
  /** Pierce beam: travels to map edge, damages creeps as it passes */
  isPierce?: boolean;
  /** Direction vector (normalized) for pierce beams */
  dirX?: number;
  dirY?: number;
  /** Set of creeps already damaged by this pierce beam */
  piercedCreeps?: Set<Creep>;
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
  hitStatsAccum: HitStats = createHitStats();
  /** Circle Co-op: player-index of the bot/human who built this
   *  tower. Used by `TowerManager.updateTowers` to route per-hit
   *  gold (gold_on_hit / jackpot etc.) to the correct economy —
   *  leaving this undefined means "shared economy" (tutorial /
   *  standard / hero defense). */
  ownerIndex?: number;
  /** Divergent-upgrade branch id once the player (or bot) has
   *  committed to one. Undefined on linear towers + pre-branch
   *  state. Broadcast over `tower_upgraded.branch` so peers can
   *  apply the same path. */
  chosenBranch?: string;
  /** Name override applied after a branching upgrade swaps the
   *  typeDef. Read by UI via `tower.displayName ?? typeDef.name`. */
  displayName?: string;
  /** Live upgrade ladder — mutated on each upgrade. Initialised
   *  from `typeDef.upgrades` in the constructor and replaced with
   *  the target typeDef's upgrades array when a branch fires. */
  private _remainingUpgrades: TowerUpgrade[] = [];
  projectileColor: number;
  homeX: number = 0;
  homeY: number = 0;
  isMobile: boolean = false;

  /** Optional sprite (for factions with art). When set, Graphics drawing is skipped. */
  sprite: Phaser.GameObjects.Sprite | null = null;
  private _scene: Phaser.Scene;

  /** Mobile unit sprite — track previous position for direction detection */
  private _prevX: number = 0;
  private _prevY: number = 0;
  /** Last rotation applied to sprite (preserved when no target) */
  private _lastSpriteRotation: number = 0;
  /** Cached findTarget result for the current tick. Cleared at the
   *  top of every update(); rotation + fire both call findTarget
   *  with the same creeps array, so the cache saves one full scan
   *  per rotating tower per tick. Invalidated per call of update(). */
  private _frameTarget: Creep | null = null;
  private _frameTargetValid: boolean = false;

  constructor(scene: Phaser.Scene, col: number, row: number, towerType: TowerType) {
    this.col = col;
    this.row = row;
    this.x = gridX(col);
    this.y = gridY(row);
    this.homeX = this.x;
    this.homeY = this.y;
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
    this._remainingUpgrades = towerType.upgrades.slice();

    const rangeBonus = getTrait(this.traits, 'range_bonus');
    if (rangeBonus) {
      this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE;
    }

    this._scene = scene;
    this._prevX = this.x;
    this._prevY = this.y;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);

    // Try to create a sprite for this tower (if spritesheet available)
    if (hasTowerSprite(this.typeId)) {
      this.sprite = createTowerSprite(scene, this.typeId, this.x, this.y);
    }

    this.drawTower();
  }

  drawTower(): void {
    this.graphics.clear();

    // Update sprite position and animation
    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);

      // Set idle frame for current upgrade level (non-mobile towers)
      if (!isMobileTowerSprite(this.typeId)) {
        setTowerSpriteState(this.sprite, this.typeId, 'idle', this.level);
      }

      // Mobile unit sprites need directional walk-cycle animations
      if (isMobileTowerSprite(this.typeId)) {
        const dx = this.x - this._prevX;
        const dy = this.y - this._prevY;
        const isAttacking = this.lastFired > 0 && (Date.now() - this.lastFired < 300);
        updateMobileTowerSprite(this.sprite, this.typeId, dx, dy, isAttacking);
        this._prevX = this.x;
        this._prevY = this.y;
      }
    }

    const isMobile = hasTrait(this.traits, 'mobile_unit');
    const s = TILE_SIZE * 0.35;

    // Only draw Graphics body if no sprite
    if (!this.sprite) {
      this.graphics.fillStyle(this.color, 1);
      if (isMobile) {
        this.graphics.beginPath();
        this.graphics.moveTo(this.x, this.y - s);
        this.graphics.lineTo(this.x + s, this.y);
        this.graphics.lineTo(this.x, this.y + s);
        this.graphics.lineTo(this.x - s, this.y);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.lineStyle(1, 0xffffff, 0.4);
        this.graphics.strokePath();
      } else {
        this.graphics.fillRect(this.x - s, this.y - s, s * 2, s * 2);
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(this.x - s, this.y - s, s * 2, s * 2);
      }
    }

    // Mobile home marker (draw even with sprites)
    if (isMobile) {
      const dx = this.x - this.homeX;
      const dy = this.y - this.homeY;
      if (Math.sqrt(dx * dx + dy * dy) > 4) {
        this.graphics.lineStyle(1, this.color, 0.2);
        this.graphics.strokeCircle(this.homeX, this.homeY, TILE_SIZE * 0.25);
      }
    }

    if (this.level > 1) {
      this.graphics.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < this.level - 1; i++) {
        this.graphics.fillCircle(this.x - 4 + i * 8, this.y + s + 4, 2);
      }
    }

    if (hasTrait(this.traits, '_adj_damage_buff') || hasTrait(this.traits, '_adj_rate_buff') || hasTrait(this.traits, '_faction_rate_buff')) {
      this.graphics.lineStyle(1, 0xff88aa, 0.4);
      this.graphics.strokeCircle(this.x, this.y, s + 3);
    }

    // Firewall beam visual
    const fwTrait = getTrait(this.traits, 'firewall_link');
    if (fwTrait && fwTrait._partnerX !== undefined) {
      this.graphics.lineStyle(2, 0x00ffcc, 0.5);
      this.graphics.lineBetween(this.x, this.y, fwTrait._partnerX, fwTrait._partnerY);
    }

    // Conduit link visuals — colored lines to each linked aura tower
    const conduit = getTrait(this.traits, 'conduit_link');
    if (conduit && conduit._links) {
      for (const link of conduit._links) {
        this.graphics.lineStyle(2, link.color ?? 0xffcc44, 0.4);
        this.graphics.lineBetween(this.x, this.y, link.x, link.y);
      }
    }

    // Show link indicator on aura towers connected via Conduit
    if ((this as any)._linkedByConduit) {
      this.graphics.lineStyle(1, 0xffcc44, 0.5);
      this.graphics.strokeCircle(this.x, this.y, s + 5);
      // Faint line back to conduit
      if ((this as any)._conduitX !== undefined) {
        this.graphics.lineStyle(1, 0xffcc44, 0.15);
        this.graphics.lineBetween(this.x, this.y, (this as any)._conduitX, (this as any)._conduitY);
      }
    }

    // Harmonic aura range indicators (each type has distinct color)
    if (hasTrait(this.traits, 'damage_aura')) {
      this.graphics.lineStyle(1, 0xff4444, 0.2); // red
      this.graphics.strokeCircle(this.x, this.y, this.range);
    }
    if (hasTrait(this.traits, 'rate_aura')) {
      this.graphics.lineStyle(1, 0x44ff44, 0.2); // green
      this.graphics.strokeCircle(this.x, this.y, this.range);
    }
    if (hasTrait(this.traits, 'range_aura')) {
      this.graphics.lineStyle(1, 0x4488ff, 0.2); // blue
      this.graphics.strokeCircle(this.x, this.y, this.range);
    }
    if (hasTrait(this.traits, 'crit_aura')) {
      this.graphics.lineStyle(1, 0xff44ff, 0.2); // magenta
      this.graphics.strokeCircle(this.x, this.y, this.range);
    }
  }

  canUpgrade(): boolean {
    return this._remainingUpgrades.length > 0;
  }

  /** Cost of the DEFAULT next upgrade. Back-compat for code that
   *  only knows linear upgrades. Branches have their own cost
   *  exposed via `getUpgradeOptions`. */
  getUpgradeCost(): number {
    if (!this.canUpgrade()) return 0;
    return this._remainingUpgrades[0].cost;
  }

  /** Surface all upgrade choices currently available. Linear
   *  towers return a one-element array; towers at a branch point
   *  return the default + one option per branch. Empty when max
   *  level is reached. */
  getUpgradeOptions(): UpgradeOption[] {
    if (!this.canUpgrade()) return [];
    const next = this._remainingUpgrades[0];
    const options: UpgradeOption[] = [{
      branchId: null,
      label: next.branchLabel ?? 'Upgrade',
      cost: next.cost,
      damage: next.damage,
      range: next.range,
      fireRate: next.fireRate,
      resolvedName: this.displayName ?? this.typeDef.name,
    }];
    if (next.branches) {
      for (const b of next.branches) {
        const target = TOWER_TYPES[b.transformsTo];
        if (!target) continue; // defensive: unknown id → hide option
        options.push({
          branchId: b.id,
          label: b.label,
          cost: target.cost,
          damage: target.damage,
          range: target.range,
          fireRate: target.fireRate,
          resolvedName: target.name,
        });
      }
    }
    return options;
  }

  upgrade(branchId: string | null = null): void {
    if (!this.canUpgrade()) return;
    const next = this._remainingUpgrades[0];

    // Branch path: swap typeDef to the target TowerType. Tower
    // identity (col/row/object ref) is preserved — only stats, art,
    // name, and the remaining upgrade ladder change.
    if (branchId && next.branches) {
      const branch = next.branches.find(b => b.id === branchId);
      if (!branch) return;
      const newDef = TOWER_TYPES[branch.transformsTo];
      if (!newDef) return;
      this.chosenBranch = branchId;
      this.displayName = newDef.name;
      this.typeDef = newDef;
      this.typeId = newDef.id;
      this.color = newDef.color;
      this.damageType = newDef.damageType;
      this.projectileColor = newDef.projectileColor ?? COLOR_PROJECTILE;
      this.level = next.level; // displayed level is unchanged — still L2
      this.damage = newDef.damage;
      this.range = newDef.range * TILE_SIZE;
      this.fireRate = newDef.fireRate;
      this.totalInvested += newDef.cost;
      this._remainingUpgrades = newDef.upgrades.slice();

      const rangeBonus = getTrait(this.traits, 'range_bonus');
      if (rangeBonus) {
        this.range += (rangeBonus.bonus ?? 0) * TILE_SIZE;
      }

      // Destroy old sprite and create a new one from the swapped
      // typeDef so the tower visibly changes on the board.
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
      if (hasTowerSprite(this.typeId)) {
        this.sprite = createTowerSprite(this._scene, this.typeId, this.x, this.y);
      }
      this.drawTower();
      return;
    }

    // Default (linear) path.
    this.level = next.level;
    this.damage = next.damage;
    this.range = next.range * TILE_SIZE;
    this.fireRate = next.fireRate;
    this.totalInvested += next.cost;
    this._remainingUpgrades = this._remainingUpgrades.slice(1);

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
    // Redraw towers with dynamic visuals each frame
    const needsRedraw = hasTrait(this.traits, 'firewall_link') ||
      hasTrait(this.traits, 'conduit_link') ||
      hasTrait(this.traits, 'damage_aura') || hasTrait(this.traits, 'rate_aura') ||
      hasTrait(this.traits, 'range_aura') || hasTrait(this.traits, 'crit_aura');
    if (needsRedraw && this.graphics.visible) {
      this.drawTower();
    }
  }

  update(time: number, delta: number, creeps: Creep[]): void {
    // Mobile units are handled by their trait — skip normal projectile firing
    if (hasTrait(this.traits, 'mobile_unit')) {
      if (this.graphics.visible) {
        this.drawTower(); // redraw at current position each frame
      }
      return;
    }

    // Per-tick findTarget cache. Rotation + fire both call findTarget
    // with the same creeps[] in the same tick; without the cache the
    // list is scanned twice. Reset at top of update() so state can't
    // leak across ticks.
    this._frameTargetValid = false;
    this._frameTarget = null;

    // Rotate tower sprite to face nearest target (mechanical/military towers with barrels)
    if (this.sprite && !isMobileTowerSprite(this.typeId) && shouldTowerRotate(this.typeId)) {
      const nearest = this.findTarget(creeps);
      if (nearest) {
        this._lastSpriteRotation = Math.atan2(nearest.y - this.y, nearest.x - this.x) + Math.PI / 2;
      }
      // Always apply the saved rotation (persists when no target)
      this.sprite.setRotation(this._lastSpriteRotation);
    }

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
    if (this._frameTargetValid) return this._frameTarget;

    const mode: TargetingMode = this.typeDef.targeting ?? 'first';
    const weakestMode = mode === 'weakest';
    let best: Creep | null = null;
    let bestScore = weakestMode ? Infinity : -Infinity;

    for (const creep of creeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - this.x;
      const dy = creep.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.range) continue;

      let score: number;
      switch (mode) {
        case 'first':     score = creep.pathIndex; break;  // highest pathIndex = closest to exit
        case 'closest':   score = -dist; break;            // shortest distance to tower
        case 'strongest': score = creep.hp; break;         // highest current HP
        case 'weakest':   score = creep.hp; break;         // lowest current HP (uses < below)
        case 'fastest':   score = creep.speed; break;      // fastest current speed
        default:          score = creep.pathIndex; break;
      }

      const isBetter = weakestMode ? score < bestScore : score > bestScore;
      if (isBetter) {
        best = creep;
        bestScore = score;
      }
    }

    this._frameTarget = best;
    this._frameTargetValid = true;
    return best;
  }

  fire(target: Creep): void {
    const scene = this._scene;
    const g = scene.add.graphics();
    g.setDepth(15);
    const isPierce = hasTrait(this.traits, 'pierce_delivery');
    const isLocationBased = hasTrait(this.traits, 'splash_damage') || isPierce || hasTrait(this.traits, 'tower_aura_damage');

    // For pierce beams: calculate direction and destination at map edge
    let destX = target.x;
    let destY = target.y;
    let dirX = 0;
    let dirY = 0;
    if (isPierce) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dirX = dx / len;
        dirY = dy / len;
        // Extend to a far distance (well past map edge)
        destX = this.x + dirX * 2000;
        destY = this.y + dirY * 2000;
      }
    }

    // Try to create a projectile sprite
    const projSprite = hasProjectileSprite(this.typeId)
      ? createProjectileSprite(scene, this.typeId, this.x, this.y)
      : null;

    this.projectiles.push({
      x: this.x,
      y: this.y,
      target,
      destX,
      destY,
      speed: this.typeDef.projectileSpeed,
      graphics: g,
      locationBased: isLocationBased,
      age: 0,
      sprite: projSprite ?? undefined,
      isPierce,
      dirX, dirY,
      piercedCreeps: isPierce ? new Set() : undefined,
      towerId: this.typeId,
    });

    // Set tower sprite to fire state briefly
    if (this.sprite) {
      setTowerSpriteState(this.sprite, this.typeId, 'fire', this.level);
      scene.time.delayedCall(200, () => {
        if (this.sprite) setTowerSpriteState(this.sprite, this.typeId, 'idle', this.level);
      });
    }
  }

  updateProjectiles(delta: number, allCreeps: Creep[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // If target died: location-based projectiles continue, tracking ones disappear
      if (!p.target.alive && !p.locationBased) {
        p.graphics.destroy();
        if (p.sprite) p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Move toward target (if alive and tracking) or destination (location-based)
      const tx = (p.target.alive && !p.locationBased) ? p.target.x : p.destX;
      const ty = (p.target.alive && !p.locationBased) ? p.target.y : p.destY;

      // Update destination if target is still alive (track moving targets)
      // Location-based projectiles (splash/meteor) lock their destination at fire time
      if (p.target.alive && !p.locationBased) {
        p.destX = p.target.x;
        p.destY = p.target.y;
      }

      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Tracking projectiles accelerate parabolically so they always catch up
      // Location-based projectiles travel at constant speed
      p.age += delta / 1000;
      const effectiveSpeed = p.locationBased
        ? p.speed
        : p.speed * (1 + p.age * p.age * 2);
      const move = effectiveSpeed * (delta / 1000);

      // Pierce beam: damage creeps as the beam passes them
      if (p.isPierce && p.piercedCreeps && p.dirX !== undefined && p.dirY !== undefined) {
        const pierceTrait = getTrait(this.traits, 'pierce_delivery');
        const lineWidth = (pierceTrait?.lineWidth ?? 24) / 2;
        for (const creep of allCreeps) {
          if (!creep.alive || creep.reached || p.piercedCreeps.has(creep)) continue;
          // Check if creep is behind the beam's current position (already passed)
          const cx = creep.x - this.x;
          const cy = creep.y - this.y;
          const proj = cx * p.dirX + cy * p.dirY;
          // Beam front = distance from tower to projectile
          const beamFront = (p.x - this.x) * p.dirX + (p.y - this.y) * p.dirY;
          if (proj < 0 || proj > beamFront) continue; // not yet reached or behind tower
          const perpX = cx - proj * p.dirX;
          const perpY = cy - proj * p.dirY;
          const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
          if (perpDist <= lineWidth) {
            const stats = createHitStats();
            const dmg = this.damage; // simplified — full damage to each
            creep.takeDamage(dmg);
            creep.lastHitCol = this.col;
            creep.lastHitRow = this.row;
            p.piercedCreeps.add(creep);
          }
        }
      }

      // Pierce beams: remove when they've gone far off-screen
      if (p.isPierce && (p.x < -100 || p.x > 2000 || p.y < -100 || p.y > 2000)) {
        p.graphics.destroy();
        if (p.sprite) p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (dist <= move) {
        // Pierce beams don't stop at target — they keep going
        if (p.isPierce) {
          // Don't remove, just keep moving (removed by off-screen check above)
          p.x += (dx / dist) * move;
          p.y += (dy / dist) * move;
          if (p.sprite) {
            p.sprite.setPosition(p.x, p.y);
            if (!p.locationBased) p.sprite.setRotation(Math.atan2(dy, dx));
          }
          continue;
        }

        if (p.target.alive) {
          this.onProjectileHit(p, allCreeps);
        } else {
          this.onProjectileHitLocation(p, allCreeps);
        }
        p.graphics.destroy();
        // Play impact animation — scale to splash radius for AoE towers
        if (p.sprite && p.towerId) {
          const splashTrait = getTrait(this.traits, 'splash_damage');
          const splashRadius = splashTrait?.radius as number | undefined;
          playProjectileImpact(p.sprite, p.towerId, splashRadius);
        } else if (p.sprite) {
          p.sprite.destroy();
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * move;
        p.y += (dy / dist) * move;

        if (p.sprite) {
          p.sprite.setPosition(p.x, p.y);
          // Rotate tracking projectiles to face direction; location-based fall straight
          if (!p.locationBased) {
            p.sprite.setRotation(Math.atan2(dy, dx));
          }
        } else {
          p.graphics.clear();
          const hasSplash = hasTrait(this.traits, 'splash_damage');
          p.graphics.fillStyle(this.projectileColor, 1);
          p.graphics.fillCircle(p.x, p.y, hasSplash ? 4 : 3);
        }
      }
    }
  }

  private onProjectileHit(p: Projectile, allCreeps: Creep[]): void {
    // Stamp kill credit for co-op tower ownership
    p.target.lastHitCol = this.col;
    p.target.lastHitRow = this.row;

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
      isBoss: false,
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
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
    for (const p of this.projectiles) {
      p.graphics.destroy();
      if (p.sprite) p.sprite.destroy();
    }
    this.projectiles = [];
  }
}
