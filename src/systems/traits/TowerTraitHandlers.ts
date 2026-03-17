import { TILE_SIZE } from '../../config';
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

  // Primary target
  const dmg = calculateDamage(ctx.damage, ctx.damageType, ctx.target.armor);
  ctx.target.takeDamage(dmg);
  ctx.hitTargets.push(ctx.target);

  // Chain to nearby
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
    target.x = tp.col * TILE_SIZE + TILE_SIZE / 2;
    target.y = tp.row * TILE_SIZE + TILE_SIZE / 2;
  }
  ctx.hitTargets.push(target);
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

// Applied dynamically by adjacency_buff
registerDamageMod('_adj_damage_buff', (trait: Trait, damage: number, _ctx: HitContext) => {
  return damage + (trait.bonus ?? 0);
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

// Applied dynamically by adjacency_buff
registerFireRateMod('_adj_rate_buff', (trait: Trait, rate: number, _tower: any) => {
  return rate - (trait.bonus ?? 0);
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

// TTL countdown for dynamic buff traits
registerTowerUpdate('_adj_damage_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});

registerTowerUpdate('_adj_rate_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});
