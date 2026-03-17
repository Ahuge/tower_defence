import { TILE_SIZE, gridX, gridY } from '../../config';
import { calculateDamage } from '../DamageCalculator';
import {
  registerDelivery, registerDamageMod, registerFireRateMod,
  registerHitEffect, registerOnFire, registerTowerUpdate,
  Trait, HitContext, UpdateContext, addOrRefreshTrait,
} from './Trait';

// ============================================================
// Delivery traits (mutually exclusive — first match wins)
// ============================================================

registerDelivery('direct_damage', (_trait: Trait, ctx: HitContext) => {
  const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
  ctx.target.takeDamage(dmg);
  ctx.hitTargets.push(ctx.target);
});

registerDelivery('splash_damage', (trait: Trait, ctx: HitContext) => {
  const radius = trait.radius ?? 48;
  for (const creep of ctx.allTargets) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - ctx.target.x;
    const dy = creep.y - ctx.target.y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
      creep.takeDamage(dmg);
      ctx.hitTargets.push(creep);
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
    hit.add(nearest);
    current = nearest;
  }
});

registerDelivery('teleport_delivery', (trait: Trait, ctx: HitContext) => {
  const steps = (trait.stepsBase ?? 3) + (trait.stepsPerLevel ?? 1) * ctx.towerLevel;
  const target = ctx.target;
  target.pathIndex = Math.max(1, target.pathIndex - steps);
  const tp = target.path[target.pathIndex - 1];
  if (tp) {
    target.x = gridX(tp.col);
    target.y = gridY(tp.row);
  }
  ctx.hitTargets.push(target);
});

/** Pierce: damages all creeps in a line from tower through target */
registerDelivery('pierce_delivery', (trait: Trait, ctx: HitContext) => {
  const towerX = (trait as any)._towerX ?? ctx.target.x;
  const towerY = (trait as any)._towerY ?? ctx.target.y;
  const lineWidth = trait.lineWidth ?? (TILE_SIZE * 0.8);

  // Direction vector from tower to target
  const dx = ctx.target.x - towerX;
  const dy = ctx.target.y - towerY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len;
  const ny = dy / len;

  // Check all creeps: project onto the line, check perpendicular distance
  for (const creep of ctx.allTargets) {
    if (!creep.alive || creep.reached) continue;
    const cx = creep.x - towerX;
    const cy = creep.y - towerY;
    const proj = cx * nx + cy * ny; // projection along line
    if (proj < 0) continue; // behind tower
    const perpX = cx - proj * nx;
    const perpY = cy - proj * ny;
    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpDist <= lineWidth / 2) {
      const dmg = calculateDamage(ctx.damage, ctx.damageType, creep.armor);
      creep.takeDamage(dmg);
      ctx.hitTargets.push(creep);
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

/** Crit chance: X% chance for multiplied damage */
registerDamageMod('crit_chance', (trait: Trait, damage: number, _ctx: HitContext) => {
  const chance = trait.chance ?? 0.25;
  const multiplier = trait.multiplier ?? 3;
  if (Math.random() < chance) {
    return Math.round(damage * multiplier);
  }
  return damage;
});

/** Jackpot: chance for instant kill OR zero damage */
registerDamageMod('jackpot', (trait: Trait, damage: number, _ctx: HitContext) => {
  const killChance = trait.killChance ?? 0.08;
  const missChance = trait.missChance ?? 0.25;
  const roll = Math.random();
  if (roll < killChance) {
    return 99999; // instant kill
  } else if (roll < killChance + missChance) {
    return 0;
  }
  return damage;
});

// Applied dynamically by adjacency_buff
registerDamageMod('_adj_damage_buff', (trait: Trait, damage: number, _ctx: HitContext) => {
  return damage + (trait.bonus ?? 0);
});

// Applied dynamically by spell_amp
registerDamageMod('_spell_amp_buff', (trait: Trait, damage: number, ctx: HitContext) => {
  // Only amplifies magic damage
  if (ctx.damageType === 'magic') {
    return Math.round(damage * (1 + (trait.bonus ?? 0)));
  }
  return damage;
});

// ============================================================
// Fire rate modifiers (stackable)
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

registerFireRateMod('_adj_rate_buff', (trait: Trait, rate: number, _tower: any) => {
  return rate - (trait.bonus ?? 0);
});

registerFireRateMod('_overclock_buff', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (1 - (trait.bonus ?? 0)));
});

// ============================================================
// On-fire hooks (called when tower fires)
// ============================================================

registerOnFire('ramp_up', (trait: Trait, _tower: any, targetIdx: number) => {
  if (targetIdx === (trait._lastTargetIdx ?? -1)) {
    trait._stacks = Math.min((trait._stacks ?? 0) + 1, trait.maxStacks ?? 5);
  } else {
    trait._stacks = 0;
    trait._lastTargetIdx = targetIdx;
  }
});

// Store tower position for pierce_delivery
registerOnFire('pierce_delivery', (trait: Trait, tower: any, _targetIdx: number) => {
  trait._towerX = tower.x;
  trait._towerY = tower.y;
});

// ============================================================
// Hit effects (stackable, run after delivery on hitTargets)
// ============================================================

registerHitEffect('slow_on_hit', (trait: Trait, ctx: HitContext) => {
  const duration = trait.duration ?? 2000;
  const factor = trait.factor ?? 0.5;
  for (const target of ctx.hitTargets) {
    target.applySlow(duration, factor);
  }
});

registerHitEffect('gold_on_hit', (trait: Trait, ctx: HitContext) => {
  ctx.goldEarned += (trait.amount ?? 1) * ctx.hitTargets.length;
});

/** Burn DoT: flat damage per second */
registerHitEffect('burn_dot', (_trait: Trait, ctx: HitContext) => {
  const dps = _trait.dps ?? 8;
  const duration = _trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('burn', duration, dps);
  }
});

/** Poison DoT: % max HP per second */
registerHitEffect('poison_dot', (_trait: Trait, ctx: HitContext) => {
  const percentPerSec = _trait.percentPerSec ?? 0.02;
  const duration = _trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('poison', duration, percentPerSec);
  }
});

/** Strip shield: instantly remove all shield HP */
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

/** Armor shred: reduce armor tier temporarily */
registerHitEffect('armor_shred_on_hit', (trait: Trait, ctx: HitContext) => {
  const shredAmount = trait.shredAmount ?? 1;
  const duration = trait.duration ?? 4000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('armor_shred', duration, shredAmount);
  }
});

/** Damage amplification: target takes more damage from all sources */
registerHitEffect('damage_amp_on_hit', (trait: Trait, ctx: HitContext) => {
  const ampAmount = trait.ampAmount ?? 0.15;
  const duration = trait.duration ?? 3000;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.applyStacking('damage_amp', duration, ampAmount);
  }
});

/** Root: chance to completely stop a creep */
registerHitEffect('root_on_hit', (trait: Trait, ctx: HitContext) => {
  const chance = trait.chance ?? 0.2;
  const duration = trait.duration ?? 800;
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
  const dmgPercent = trait.damagePercent ?? 0.15;
  const rateBonus = trait.rateBonus ?? 50;

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
        bonus: rateBonus * tower.level,
        _ttl: 200,
      });
    }
  }
});

/** Spell amp: adjacent towers deal more magic damage */
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

/** Overclock: one adjacent tower fires much faster */
registerTowerUpdate('overclock_buff', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const rateReduction = trait.rateReduction ?? 0.4;

  // Find nearest adjacent tower (not another overclocker)
  let bestTower: any = null;
  let bestDist = Infinity;
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dc = Math.abs(other.col - tower.col);
    const dr = Math.abs(other.row - tower.row);
    if (dc <= 1 && dr <= 1) {
      // Don't buff other overclocking towers
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
      bonus: rateReduction * tower.level,
      _ttl: 200,
    });
  }
});

/** Slow aura: passively slow all creeps in range (no projectile needed) */
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

/** Growth scaling: tower gains permanent damage each wave */
registerTowerUpdate('growth_scaling', (trait: Trait, tower: any, ctx: UpdateContext) => {
  // Track which wave we last grew on
  // Check via a simple heuristic: if wave count changed
  if (trait._lastWaveCheck === undefined) trait._lastWaveCheck = 0;
  // We can't easily get wave count from ctx, so we use a time-based approach:
  // grow every 30 seconds of game time as a proxy
  trait._timeAccum = (trait._timeAccum ?? 0) + ctx.delta;
  if (trait._timeAccum >= 30000) {
    trait._timeAccum = 0;
    const growthPercent = trait.growthPercent ?? 0.08;
    tower.damage = Math.round(tower.damage * (1 + growthPercent));
    tower.drawTower();
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
