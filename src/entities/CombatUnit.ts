import { TILE_SIZE } from '../config';
import { Grid } from '../systems/Grid';
import { RtsUnit, UnitOwner } from './RtsUnit';
import { CombatUnitDef } from '../data/basedefence/CombatUnitTypes';
import { Building } from './Building';

/** Aggro range — how far units will auto-acquire targets (in pixels) */
const AGGRO_RANGE = TILE_SIZE * 10;
/** Chase range — how far a unit will chase before giving up */
const CHASE_RANGE = TILE_SIZE * 15;
/** How often to re-path toward a target (ms) */
const REPATH_INTERVAL = 1500;

export class CombatUnit extends RtsUnit {
  readonly def: CombatUnitDef;
  readonly color: number;
  readonly damage: number;
  readonly attackSpeed: number;
  readonly attackRange: number;
  private lastAttackTime: number = 0;
  private lastRepathTime: number = 0;

  /** Blink cooldown in seconds remaining (Arcane only) */
  blinkCooldown: number = 0;
  /** Phase Shift: invulnerability timer (Void Phase Stalker) */
  phaseShiftTimer: number = 0;
  phaseShiftCooldown: number = 0;
  /** Rift Walk cooldown (Void Rift Walker — global teleport) */
  riftWalkCooldown: number = 0;

  /** Building target (for attacking enemy base/buildings) */
  buildingTarget: Building | null = null;

  constructor(grid: Grid, owner: UnitOwner, def: CombatUnitDef, col: number, row: number) {
    super(grid, owner, def.id, col, row, def.hp, def.moveSpeed);
    this.def = def;
    this.color = def.color;
    this.damage = def.damage;
    this.attackSpeed = def.attackSpeed;
    this.attackRange = def.attackRange;
  }

  /**
   * Update combat behavior each frame.
   * Returns { unit, building } — whichever was attacked this frame (for damage application).
   */
  updateCombat(
    deltaSec: number, time: number,
    enemies: RtsUnit[],
    enemyBuildings: Building[],
  ): { unit: RtsUnit | null; building: Building | null } {
    if (!this.alive) return { unit: null, building: null };

    // Tick cooldowns
    if (this.blinkCooldown > 0) this.blinkCooldown = Math.max(0, this.blinkCooldown - deltaSec);
    if (this.riftWalkCooldown > 0) this.riftWalkCooldown = Math.max(0, this.riftWalkCooldown - deltaSec);
    if (this.phaseShiftTimer > 0) this.phaseShiftTimer = Math.max(0, this.phaseShiftTimer - deltaSec);
    if (this.phaseShiftCooldown > 0) this.phaseShiftCooldown = Math.max(0, this.phaseShiftCooldown - deltaSec);

    // 1. If attacking a building, pursue it
    if (this.buildingTarget && !this.buildingTarget.destroyed) {
      return { unit: null, building: this.attackBuilding(deltaSec, time) };
    }

    // 2. If we have a unit target, pursue it
    if (this.attackTarget && this.attackTarget.alive) {
      const result = this.pursueAndAttack(deltaSec, time, this.attackTarget);
      if (result) return { unit: result, building: null };
      // Target might have died — fall through to find new target
    }

    // 3. Auto-aggro: always scan for enemies in aggro range (whether idle, moving, or attack-moving)
    const aggroRange = this.attackMove ? AGGRO_RANGE * 1.5 : AGGRO_RANGE;
    const nearestEnemy = this.findNearestEnemy(enemies, aggroRange);
    if (nearestEnemy) {
      this.attackTarget = nearestEnemy;
      this.buildingTarget = null;
      const result = this.pursueAndAttack(deltaSec, time, nearestEnemy);
      return { unit: result, building: null };
    }

    // 4. If attack-moving and no units found, look for enemy buildings
    if (this.attackMove) {
      const nearestBuilding = this.findNearestBuilding(enemyBuildings, aggroRange);
      if (nearestBuilding) {
        this.buildingTarget = nearestBuilding;
        this.attackTarget = null;
        return { unit: null, building: this.attackBuilding(deltaSec, time) };
      }
    }

    // 5. Default: continue moving along path
    if (this.state === 'moving') {
      this.updateMovement(deltaSec);
    }

    return { unit: null, building: null };
  }

  private pursueAndAttack(deltaSec: number, time: number, target: RtsUnit): RtsUnit | null {
    if (!target.alive) {
      this.attackTarget = null;
      this.state = this.path.length > 0 ? 'moving' : 'idle';
      return null;
    }

    const dist = this.distanceTo(target.x, target.y);

    // Give up chase if too far
    if (dist > CHASE_RANGE && !this.attackMove) {
      this.attackTarget = null;
      this.state = this.path.length > 0 ? 'moving' : 'idle';
      return null;
    }

    if (dist <= this.attackRange) {
      // In range — stop and attack
      this.state = 'attacking';
      this.path = [];
      if (time - this.lastAttackTime >= this.attackSpeed) {
        this.lastAttackTime = time;
        return target;
      }
    } else {
      // Move directly toward target (simple pixel movement, no A* needed for short distances)
      this.state = 'moving';
      if (dist < TILE_SIZE * 4) {
        // Close enough — just walk directly
        const step = this.moveSpeed * deltaSec;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      } else if (time - this.lastRepathTime > REPATH_INTERVAL) {
        // Far away — use A* pathfinding periodically
        this.lastRepathTime = time;
        const targetCol = Math.floor(target.x / TILE_SIZE);
        const targetRow = Math.floor(target.y / TILE_SIZE);
        this.moveTo(targetCol, targetRow);
        this.attackTarget = target; // moveTo clears it
        this.state = 'moving';
      } else {
        this.updateMovement(deltaSec);
      }
    }

    return null;
  }

  private attackBuilding(deltaSec: number, time: number): Building | null {
    const b = this.buildingTarget;
    if (!b || b.destroyed) {
      this.buildingTarget = null;
      this.state = this.path.length > 0 ? 'moving' : 'idle';
      return null;
    }

    const bx = (b.col + b.def.footprint / 2) * TILE_SIZE;
    const by = (b.row + b.def.footprint / 2) * TILE_SIZE;
    const dist = this.distanceTo(bx, by);
    const effectiveRange = this.attackRange + b.def.footprint * TILE_SIZE / 2;

    if (dist <= effectiveRange) {
      this.state = 'attacking';
      this.path = [];
      if (time - this.lastAttackTime >= this.attackSpeed) {
        this.lastAttackTime = time;
        return b;
      }
    } else {
      // Walk toward building
      this.state = 'moving';
      const step = this.moveSpeed * deltaSec;
      const dx = bx - this.x;
      const dy = by - this.y;
      if (dist > 0) {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    }

    return null;
  }

  private findNearestEnemy(enemies: RtsUnit[], maxRange: number): RtsUnit | null {
    let best: RtsUnit | null = null;
    let bestDist = maxRange;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = this.distanceTo(enemy.x, enemy.y);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    return best;
  }

  private findNearestBuilding(buildings: Building[], maxRange: number): Building | null {
    let best: Building | null = null;
    let bestDist = maxRange;

    for (const b of buildings) {
      if (b.destroyed) continue;
      const bx = (b.col + b.def.footprint / 2) * TILE_SIZE;
      const by = (b.row + b.def.footprint / 2) * TILE_SIZE;
      const dist = this.distanceTo(bx, by);
      if (dist < bestDist) {
        best = b;
        bestDist = dist;
      }
    }

    return best;
  }

  /** Override takeDamage for Phase Shift invulnerability and phase trigger */
  takeDamage(amount: number): boolean {
    // Phase Shift: invulnerable while active
    if (this.phaseShiftTimer > 0) return false;

    const killed = super.takeDamage(amount);

    // Phase Shift trigger: become invulnerable on taking damage
    if (!killed && this.def.special === 'phase_shift' && this.phaseShiftCooldown <= 0) {
      this.phaseShiftTimer = 2; // 2s invulnerability
      this.phaseShiftCooldown = 30;
    }

    return killed;
  }

  /** Get effective damage (Doom Guard scaling: up to 2× at low HP) */
  getEffectiveDamage(): number {
    if (this.def.special === 'doom_scaling') {
      const hpRatio = this.hp / this.maxHp;
      const mult = 1 + (1 - hpRatio); // 1× at full HP, 2× at 0 HP
      return Math.round(this.damage * mult);
    }
    return this.damage;
  }
}
