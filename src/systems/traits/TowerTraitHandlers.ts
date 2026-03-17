import { TILE_SIZE, gridX, gridY } from '../../config';
import { calculateDamage } from '../DamageCalculator';
import {
  registerDelivery, registerDamageMod, registerFireRateMod,
  registerHitEffect, registerOnFire, registerTowerUpdate,
  Trait, HitContext, UpdateContext, addOrRefreshTrait,
} from './Trait';

// Helper: scale a value by tower level (10% per level above 1)
function levelScale(base: number, level: number, perLevel: number = 0.1): number {
  return base * (1 + perLevel * (level - 1));
}

// ============================================================
// Delivery traits (mutually exclusive — first match wins)
// ============================================================

registerDelivery('direct_damage', (_trait: Trait, ctx: HitContext) => {
  const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
  ctx.target.takeDamage(dmg);
  ctx.hitTargets.push(ctx.target);
  ctx.hitStats.directDamage += dmg;
});

registerDelivery('splash_damage', (trait: Trait, ctx: HitContext) => {
  // Radius scales with level: +10% per level above 1
  const baseRadius = trait.radius ?? 48;
  const radius = levelScale(baseRadius, ctx.towerLevel);
  for (const creep of ctx.allTargets) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - ctx.target.x;
    const dy = creep.y - ctx.target.y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
      creep.takeDamage(dmg);
      ctx.hitTargets.push(creep);
      ctx.hitStats.splashDamage += dmg;
    }
  }
});

registerDelivery('chain_damage', (trait: Trait, ctx: HitContext) => {
  const chainCount = (trait.chainCount ?? 2) + Math.floor(ctx.towerLevel / 2);
  const chainRange = trait.chainRange ?? (TILE_SIZE * 3);
  const falloff = trait.falloff ?? 0.7;

  const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
  ctx.target.takeDamage(dmg);
  ctx.hitTargets.push(ctx.target);
  ctx.hitStats.chainDamage += dmg;

  const hit = new Set([ctx.target]);
  let current = ctx.target;
  for (let c = 0; c < chainCount; c++) {
    let nearest: typeof current | null = null;
    let nearDist = Infinity;
    for (const creep of ctx.allTargets) {
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
    const chainDmg = calculateDamage(
      Math.round(ctx.damage * falloff),
      ctx.damageType,
      nearest.armor,
    );
    nearest.takeDamage(chainDmg);
    ctx.hitTargets.push(nearest);
    ctx.hitStats.chainDamage += chainDmg;
    hit.add(nearest);
    current = nearest;
  }
});

registerDelivery('teleport_delivery', (trait: Trait, ctx: HitContext) => {
  const steps = (trait.stepsBase ?? 3) + (trait.stepsPerLevel ?? 2) * ctx.towerLevel;
  const target = ctx.target;
  target.pathIndex = Math.max(1, target.pathIndex - steps);
  const tp = target.path[target.pathIndex - 1];
  if (tp) {
    target.x = gridX(tp.col);
    target.y = gridY(tp.row);
  }
  ctx.hitTargets.push(target);
});

/** Tower-centered AoE: damages all creeps near the TOWER, not the target */
registerDelivery('tower_aura_damage', (trait: Trait, ctx: HitContext) => {
  const radius = levelScale(trait.radius ?? 96, ctx.towerLevel);
  const towerX = (trait as any)._towerX ?? ctx.target.x;
  const towerY = (trait as any)._towerY ?? ctx.target.y;

  for (const creep of ctx.allTargets) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - towerX;
    const dy = creep.y - towerY;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
      creep.takeDamage(dmg);
      ctx.hitTargets.push(creep);
      ctx.hitStats.auraDamage += dmg;
    }
  }
});

registerDelivery('pierce_delivery', (trait: Trait, ctx: HitContext) => {
  const towerX = (trait as any)._towerX ?? ctx.target.x;
  const towerY = (trait as any)._towerY ?? ctx.target.y;
  const lineWidth = trait.lineWidth ?? (TILE_SIZE * 0.8);

  const dx = ctx.target.x - towerX;
  const dy = ctx.target.y - towerY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len;
  const ny = dy / len;

  for (const creep of ctx.allTargets) {
    if (!creep.alive || creep.reached) continue;
    const cx = creep.x - towerX;
    const cy = creep.y - towerY;
    const proj = cx * nx + cy * ny;
    if (proj < 0) continue;
    const perpX = cx - proj * nx;
    const perpY = cy - proj * ny;
    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpDist <= lineWidth / 2) {
      const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
      creep.takeDamage(dmg);
      ctx.hitTargets.push(creep);
      ctx.hitStats.pierceDamage += dmg;
    }
  }
});

// ============================================================
// Damage modifiers (stackable, run before delivery)
// ============================================================

registerDamageMod('damage_variance', (trait: Trait, damage: number, _ctx: HitContext) => {
  const min = trait.min ?? 0.5;
  const max = trait.max ?? 1.5;
  return Math.round(damage * (min + Math.random() * (max - min)));
});

registerDamageMod('damage_mult', (trait: Trait, damage: number, _ctx: HitContext) => {
  return Math.round(damage * (trait.factor ?? 1));
});

registerDamageMod('crit_chance', (trait: Trait, damage: number, ctx: HitContext) => {
  // Chance scales: +3% per level above 1
  const baseChance = trait.chance ?? 0.25;
  const chance = Math.min(0.8, baseChance + 0.03 * (ctx.towerLevel - 1));
  const multiplier = trait.multiplier ?? 3;
  if (Math.random() < chance) {
    return Math.round(damage * multiplier);
  }
  return damage;
});

registerDamageMod('jackpot', (trait: Trait, damage: number, ctx: HitContext) => {
  // Kill chance scales: +2% per level above 1
  const baseKill = trait.killChance ?? 0.08;
  const killChance = Math.min(0.5, baseKill + 0.02 * (ctx.towerLevel - 1));
  const missChance = trait.missChance ?? 0.25;
  const roll = Math.random();
  if (roll < killChance) {
    return 99999;
  } else if (roll < killChance + missChance) {
    return 0;
  }
  return damage;
});

registerDamageMod('_adj_damage_buff', (trait: Trait, damage: number, _ctx: HitContext) => {
  return damage + (trait.bonus ?? 0);
});

registerDamageMod('_spell_amp_buff', (trait: Trait, damage: number, ctx: HitContext) => {
  if (ctx.damageType === 'magic') {
    return Math.round(damage * (1 + (trait.bonus ?? 0)));
  }
  return damage;
});

// ============================================================
// Fire rate modifiers (all percentage-based)
// ============================================================

registerFireRateMod('ramp_up', (trait: Trait, rate: number, _tower: any) => {
  const stacks = trait._stacks ?? 0;
  const reductionPerStack = trait.reductionPerStack ?? 0.08;
  const maxReduction = (trait.maxStacks ?? 5) * reductionPerStack;
  const reduction = Math.min(stacks * reductionPerStack, maxReduction);
  return Math.round(rate * (1 - reduction));
});

registerFireRateMod('fire_rate_mult', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (trait.factor ?? 1));
});

// Percentage-based: bonus is a fraction (e.g. 0.08 = 8% faster)
registerFireRateMod('_adj_rate_buff', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (1 - (trait.bonus ?? 0)));
});

registerFireRateMod('_overclock_buff', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (1 - (trait.bonus ?? 0)));
});

// ============================================================
// On-fire hooks
// ============================================================

registerOnFire('ramp_up', (trait: Trait, _tower: any, targetIdx: number) => {
  if (targetIdx === (trait._lastTargetIdx ?? -1)) {
    trait._stacks = Math.min((trait._stacks ?? 0) + 1, trait.maxStacks ?? 5);
  } else {
    trait._stacks = 0;
    trait._lastTargetIdx = targetIdx;
  }
});

registerOnFire('pierce_delivery', (trait: Trait, tower: any, _targetIdx: number) => {
  trait._towerX = tower.x;
  trait._towerY = tower.y;
});

registerOnFire('tower_aura_damage', (trait: Trait, tower: any, _targetIdx: number) => {
  trait._towerX = tower.x;
  trait._towerY = tower.y;
});

// ============================================================
// Hit effects (stackable, run after delivery — scale with level)
// ============================================================

registerHitEffect('slow_on_hit', (trait: Trait, ctx: HitContext) => {
  // Duration scales: +15% per level above 1
  const baseDuration = trait.duration ?? 2000;
  const duration = levelScale(baseDuration, ctx.towerLevel, 0.15);
  const factor = trait.factor ?? 0.5;
  for (const target of ctx.hitTargets) {
    target.applySlow(duration, factor);
  }
});

registerHitEffect('gold_on_hit', (trait: Trait, ctx: HitContext) => {
  ctx.goldEarned += (trait.amount ?? 1) * ctx.hitTargets.length;
});

registerHitEffect('burn_dot', (trait: Trait, ctx: HitContext) => {
  // DPS scales: +20% per level above 1
  const baseDps = trait.dps ?? 8;
  const dps = Math.round(levelScale(baseDps, ctx.towerLevel, 0.2));
  const duration = trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('burn', duration, dps);
  }
});

registerHitEffect('poison_dot', (trait: Trait, ctx: HitContext) => {
  // % scales: +15% per level above 1
  const basePercent = trait.percentPerSec ?? 0.02;
  const percent = levelScale(basePercent, ctx.towerLevel, 0.15);
  const duration = trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('poison', duration, percent);
  }
});

registerHitEffect('strip_shield', (_trait: Trait, ctx: HitContext) => {
  for (const target of ctx.hitTargets) {
    const traits = (target as any).traits;
    if (traits) {
      const shield = traits.find((t: Trait) => t.id === 'shield');
      if (shield) {
        shield._shieldHp = 0;
        shield._active = false;
      }
    }
  }
});

registerHitEffect('armor_shred_on_hit', (trait: Trait, ctx: HitContext) => {
  const shredAmount = trait.shredAmount ?? 1;
  // Duration scales: +15% per level
  const duration = levelScale(trait.duration ?? 4000, ctx.towerLevel, 0.15);
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('armor_shred', duration, shredAmount);
  }
});

registerHitEffect('damage_amp_on_hit', (trait: Trait, ctx: HitContext) => {
  // Amp amount scales: +10% per level
  const baseAmp = trait.ampAmount ?? 0.15;
  const amp = levelScale(baseAmp, ctx.towerLevel, 0.1);
  const duration = trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.applyStacking('damage_amp', duration, amp);
  }
});

registerHitEffect('root_on_hit', (trait: Trait, ctx: HitContext) => {
  // Chance scales: +3% per level, duration scales: +15% per level
  const baseChance = trait.chance ?? 0.2;
  const chance = Math.min(0.6, baseChance + 0.03 * (ctx.towerLevel - 1));
  const baseDuration = trait.duration ?? 800;
  const duration = levelScale(baseDuration, ctx.towerLevel, 0.15);
  for (const target of ctx.hitTargets) {
    if (Math.random() < chance) {
      (target as any).statusEffects?.apply('root', duration, 1);
    }
  }
});

// ============================================================
// Tower update traits (per-frame)
// ============================================================

registerTowerUpdate('adjacency_buff', (trait: Trait, tower: any, ctx: UpdateContext) => {
  // Percentage-based: damagePercent and ratePercent
  const dmgPercent = trait.damagePercent ?? 0.15;
  const ratePercent = trait.ratePercent ?? 0.08;

  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dc = Math.abs(other.col - tower.col);
    const dr = Math.abs(other.row - tower.row);
    if (dc <= 1 && dr <= 1) {
      addOrRefreshTrait(other.traits, {
        id: '_adj_damage_buff',
        bonus: Math.round(other.damage * dmgPercent * tower.level),
        _ttl: 200,
      });
      addOrRefreshTrait(other.traits, {
        id: '_adj_rate_buff',
        bonus: ratePercent * tower.level, // percentage
        _ttl: 200,
      });
    }
  }
});

registerTowerUpdate('spell_amp', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const ampPercent = trait.ampPercent ?? 0.3;

  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dc = Math.abs(other.col - tower.col);
    const dr = Math.abs(other.row - tower.row);
    if (dc <= 1 && dr <= 1) {
      addOrRefreshTrait(other.traits, {
        id: '_spell_amp_buff',
        bonus: ampPercent * tower.level,
        _ttl: 200,
      });
    }
  }
});

registerTowerUpdate('overclock_buff', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const rateReduction = trait.rateReduction ?? 0.4; // percentage

  let bestTower: any = null;
  let bestDist = Infinity;
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dc = Math.abs(other.col - tower.col);
    const dr = Math.abs(other.row - tower.row);
    if (dc <= 1 && dr <= 1) {
      if (other.damage === 0) continue;
      const dist = dc + dr;
      if (dist < bestDist) {
        bestTower = other;
        bestDist = dist;
      }
    }
  }

  if (bestTower) {
    addOrRefreshTrait(bestTower.traits, {
      id: '_overclock_buff',
      bonus: Math.min(0.6, rateReduction * tower.level), // cap at 60%
      _ttl: 200,
    });
  }
});

registerTowerUpdate('slow_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const factor = trait.factor ?? 0.7;
  const range = tower.range;
  for (const creep of ctx.allCreeps) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - tower.x;
    const dy = creep.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      creep.applySlow(200, factor);
    }
  }
});

registerTowerUpdate('growth_scaling', (trait: Trait, tower: any, ctx: UpdateContext) => {
  trait._timeAccum = (trait._timeAccum ?? 0) + ctx.delta;
  if (trait._timeAccum >= 30000) {
    trait._timeAccum = 0;
    const growthPercent = trait.growthPercent ?? 0.08;
    tower.damage = Math.round(tower.damage * (1 + growthPercent));
    tower.drawTower();
  }
});

/** Mobile unit: full map awareness, moves to engage, returns home when idle.
 *  Ranged units stop at engageRange, melee units close to 0.8 tiles. */
registerTowerUpdate('mobile_unit', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const moveSpeed = (trait.moveSpeed ?? 120) * (ctx.delta / 1000);
  const engageRange = (trait.engageRange ?? 0.8) * TILE_SIZE;
  const attackDamage = tower.damage;
  const attackCooldown = trait.attackCooldown ?? 600;
  const attackSplash = trait.attackSplash ?? 0;

  // Init state
  if (trait._target === undefined) trait._target = null;
  if (trait._attackTimer === undefined) trait._attackTimer = 0;
  trait._attackTimer -= ctx.delta;

  // Validate current target
  let target = trait._target;
  if (target && (!target.alive || target.reached)) {
    target = null;
    trait._target = null;
  }

  // Full map awareness: find closest creep anywhere on the map
  if (!target) {
    let closest = null;
    let closestDist = Infinity;
    for (const creep of ctx.allCreeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - tower.x;
      const dy = creep.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closest = creep;
        closestDist = dist;
      }
    }
    target = closest;
    trait._target = target;
  }

  if (target) {
    const dx = target.x - tower.x;
    const dy = target.y - tower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > engageRange) {
      // Move toward target (ranged units stop at engageRange)
      tower.x += (dx / dist) * moveSpeed;
      tower.y += (dy / dist) * moveSpeed;
    } else {
      // In range — attack on cooldown
      if (trait._attackTimer <= 0) {
        trait._attackTimer = attackCooldown;

        if (attackSplash > 0) {
          for (const creep of ctx.allCreeps) {
            if (!creep.alive || creep.reached) continue;
            const cx = creep.x - tower.x;
            const cy = creep.y - tower.y;
            if (Math.sqrt(cx * cx + cy * cy) <= attackSplash) {
              creep.takeDamage(attackDamage);
              tower.damageDealt += attackDamage;
            }
          }
        } else {
          target.takeDamage(attackDamage);
          tower.damageDealt += attackDamage;
        }
      }
    }
  }
  // No targets: stay put (don't return home until wave ends)
});

/** Barbed wire: passively slows adjacent creeps (1-tile radius) */
registerTowerUpdate('barbed_wire', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const factor = trait.factor ?? 0.6;
  const range = TILE_SIZE * 1.5; // adjacent cells only
  for (const creep of ctx.allCreeps) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - tower.homeX;
    const dy = creep.y - tower.homeY;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      creep.applySlow(200, factor);
    }
  }
});

// TTL countdown for dynamic buff traits
registerTowerUpdate('_adj_damage_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});
registerTowerUpdate('_adj_rate_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});
registerTowerUpdate('_spell_amp_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});
registerTowerUpdate('_overclock_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});
