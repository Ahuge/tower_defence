import { TILE_SIZE, gridX, gridY } from '../../config';
import { calculateDamage } from '../DamageCalculator';
import {
  registerDelivery, registerDamageMod, registerFireRateMod,
  registerHitEffect, registerOnFire, registerTowerUpdate,
  Trait, HitContext, UpdateContext, addOrRefreshTrait,
} from './Trait';

/**
 * Spawn a visual attack effect for mobile units.
 * Melee: impact flash at target. Ranged: bullet trail. AoE: splash ring.
 */
function spawnAttackEffect(tower: any, target: any, splashRadius: number, ctx: UpdateContext): void {
  const scene = tower.graphics?.scene;
  if (!scene) return;

  const towerTypeId: string = tower.typeId ?? '';
  const isMelee = towerTypeId.includes('brawler');
  const isHeavy = towerTypeId.includes('heavy') || towerTypeId.includes('commander');

  if (splashRadius > 0) {
    // AoE flash ring (Tank / splash mobile units)
    const gfx = scene.add.graphics();
    gfx.setDepth(14);
    const color = isHeavy ? 0xff8844 : 0xffffff;
    let progress = 0;
    const timer = scene.time.addEvent({
      delay: 16, repeat: 12,
      callback: () => {
        progress += 1 / 12;
        gfx.clear();
        gfx.lineStyle(2, color, 1 - progress);
        gfx.strokeCircle(tower.x, tower.y, splashRadius * progress);
        gfx.fillStyle(color, (1 - progress) * 0.1);
        gfx.fillCircle(tower.x, tower.y, splashRadius * progress);
        if (progress >= 1) { gfx.destroy(); timer.destroy(); }
      },
    });
  } else if (target && isMelee) {
    // Melee impact burst at target
    const gfx = scene.add.graphics();
    gfx.setDepth(14);
    let progress = 0;
    const timer = scene.time.addEvent({
      delay: 16, repeat: 8,
      callback: () => {
        progress += 1 / 8;
        gfx.clear();
        const size = 8 + 10 * progress;
        gfx.fillStyle(0xffff44, 1 - progress);
        // Star burst
        for (let a = 0; a < 4; a++) {
          const angle = (a / 4) * Math.PI * 2 + progress * 2;
          gfx.fillRect(target.x + Math.cos(angle) * size - 1, target.y + Math.sin(angle) * size - 1, 3, 3);
        }
        if (progress >= 1) { gfx.destroy(); timer.destroy(); }
      },
    });
  } else if (target) {
    // Ranged bullet trail (Rifleman, Commander)
    const gfx = scene.add.graphics();
    gfx.setDepth(14);
    const color = towerTypeId.includes('commander') ? 0xffcc44 : 0xffffaa;
    gfx.lineStyle(2, color, 0.8);
    gfx.lineBetween(tower.x, tower.y, target.x, target.y);
    // Small impact circle
    gfx.fillStyle(color, 0.9);
    gfx.fillCircle(target.x, target.y, 4);
    scene.time.delayedCall(100, () => gfx.destroy());
  }
}

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
      // Break HP shield (boss)
      const shield = traits.find((t: Trait) => t.id === 'shield');
      if (shield) {
        shield._shieldHp = 0;
        shield._active = false;
      }
      // Break damage cap shield
      const capShield = traits.find((t: Trait) => t.id === 'damage_cap_shield');
      if (capShield) {
        capShield._hits = capShield.shieldHits ?? 15;
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

/** Mobile unit: full map awareness, moves to engage, re-aggros if target escapes.
 *  Ranged units stop at engageRange, melee units close to 0.8 tiles.
 *  leashRange (default: engageRange × 4) — if target gets this far, drop it and
 *  find a closer creep so units don't chase forever. */
registerTowerUpdate('mobile_unit', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const moveSpeed = (trait.moveSpeed ?? 120) * (ctx.delta / 1000);
  const engageRange = (trait.engageRange ?? 0.8) * TILE_SIZE;
  const leashRange = (trait.leashRange ?? (trait.engageRange ?? 0.8) * 4) * TILE_SIZE;
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

  // Leash check: if target has moved too far away, drop it and re-aggro
  if (target) {
    const ldx = target.x - tower.x;
    const ldy = target.y - tower.y;
    const lDist = Math.sqrt(ldx * ldx + ldy * ldy);
    if (lDist > leashRange) {
      target = null;
      trait._target = null;
    }
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
          // Visual: AoE flash
          spawnAttackEffect(tower, null, attackSplash, ctx);
        } else {
          target.takeDamage(attackDamage);
          tower.damageDealt += attackDamage;
          // Visual: hit effect at target
          spawnAttackEffect(tower, target, 0, ctx);
        }

        // Self-destruct: destroy tower after first attack (kamikaze)
        if (trait.selfDestruct) {
          tower._expired = true;
        }
      }
    }
  }
  // No targets: stay put (don't return home until wave ends)
});

/** Barbed wire: passively slows adjacent creeps (1-tile radius) */
/** Swarm Commander: buffs specific tower types within a large radius */
registerTowerUpdate('commander_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const dmgPercent = trait.damagePercent ?? 0.20;
  const ratePercent = trait.ratePercent ?? 0.15;
  const buffRange = (trait.buffRange ?? 6) * TILE_SIZE;
  const targetIds: string[] = (trait.targetIds as string[]) ?? [];

  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    if (targetIds.length > 0 && !targetIds.includes(other.typeId)) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= buffRange) {
      addOrRefreshTrait(other.traits, {
        id: '_adj_damage_buff',
        bonus: Math.round(other.damage * dmgPercent * tower.level),
        _ttl: 200,
      });
      addOrRefreshTrait(other.traits, {
        id: '_adj_rate_buff',
        bonus: ratePercent * tower.level,
        _ttl: 200,
      });
    }
  }
});

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

// ============================================================
// NEW FACTION TRAITS
// ============================================================

// --- True Damage delivery (Psionic — bypasses armor) ---
registerDelivery('true_damage', (_trait: Trait, ctx: HitContext) => {
  ctx.target.takeDamage(ctx.damage);
  ctx.hitTargets.push(ctx.target);
  ctx.hitStats.directDamage += ctx.damage;
});

// --- Confuse on hit (Psionic — creep walks backward) ---
registerHitEffect('confuse_on_hit', (trait: Trait, ctx: HitContext) => {
  const duration = levelScale(trait.duration ?? 1200, ctx.towerLevel, 0.1);
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('confused', duration, 1);
  }
});

// --- Bonus vs boss/shielded (Celestial Smite) ---
registerDamageMod('bonus_vs_boss', (trait: Trait, damage: number, ctx: HitContext) => {
  const target = ctx.target as any;
  const isBoss = target.isBoss;
  const hasShield = target.traits?.some((t: any) => t.id === 'shield' || t.id === 'damage_cap_shield');
  if (isBoss || hasShield) {
    return Math.round(damage * (1 + (trait.bonus ?? 0.5)));
  }
  return damage;
});

// --- Bonus vs mage creeps (Psionic Mind Spike) ---
registerDamageMod('bonus_vs_mage', (trait: Trait, damage: number, ctx: HitContext) => {
  const target = ctx.target as any;
  const isMage = target.creepType?.id?.includes('mage');
  if (isMage) {
    return Math.round(damage * (1 + (trait.bonus ?? 0.5)));
  }
  return damage;
});

// --- Life on kill (Celestial — chance to gain life) ---
registerTowerUpdate('life_on_kill', (trait: Trait, tower: any, ctx: UpdateContext) => {
  // Check for recently dead creeps near tower
  const chance = trait.chance ?? 0.05;
  const range = tower.range || (TILE_SIZE * 5);
  for (const creep of ctx.allCreeps) {
    if (creep.alive || creep.reached || creep.hp > -900) continue;
    const dx = creep.x - tower.x;
    const dy = creep.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      if (Math.random() < chance) {
        // Signal to GameScene via a special flag on tower
        tower._livesEarned = (tower._livesEarned ?? 0) + 1;
      }
    }
  }
});

// --- Mute mage aura (Celestial Ward / Cypherpunk Rootkit) ---
registerTowerUpdate('mute_mage_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const range = tower.range || (TILE_SIZE * 4);
  for (const creep of ctx.allCreeps) {
    if (!creep.alive || creep.reached) continue;
    const dx = creep.x - tower.x;
    const dy = creep.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      creep.statusEffects?.apply('muted', 200, 1);
    }
  }
});

// --- Leak absorb (Celestial Sanctuary) ---
registerTowerUpdate('leak_absorb', (trait: Trait, _tower: any, _ctx: UpdateContext) => {
  // State managed by GameScene checking tower._leakCharges
  if (trait._charges === undefined) {
    trait._charges = trait.maxCharges ?? 1;
    trait._rechargeTimer = 0;
  }
  // Recharge over waves (handled externally)
});

// --- Firewall link (Cypherpunk — damage beam between two firewalls) ---
registerTowerUpdate('firewall_link', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const linkRange = (trait.linkRange ?? 8) * TILE_SIZE;
  const dps = trait.dps ?? 15;
  const damage = dps * (ctx.delta / 1000);

  // Find partner if not linked
  if (!trait._partnerCol && trait._partnerCol !== 0) {
    for (const other of ctx.allTowers) {
      if (other === tower) continue;
      const otherTrait = other.traits?.find((t: any) => t.id === 'firewall_link');
      if (!otherTrait) continue;
      if (otherTrait._partnerCol !== undefined) continue; // already linked
      const dx = other.x - tower.x;
      const dy = other.y - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) <= linkRange) {
        trait._partnerCol = other.col;
        trait._partnerRow = other.row;
        trait._partnerX = other.x;
        trait._partnerY = other.y;
        otherTrait._partnerCol = tower.col;
        otherTrait._partnerRow = tower.row;
        otherTrait._partnerX = tower.x;
        otherTrait._partnerY = tower.y;
        break;
      }
    }
  }

  if (trait._partnerX === undefined) return;

  // Draw beam and damage creeps crossing it
  const ax = tower.x, ay = tower.y;
  const bx = trait._partnerX, by = trait._partnerY;
  const beamLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  if (beamLen === 0) return;
  const nx = (bx - ax) / beamLen;
  const ny = (by - ay) / beamLen;

  for (const creep of ctx.allCreeps) {
    if (!creep.alive || creep.reached) continue;
    const cx = creep.x - ax;
    const cy = creep.y - ay;
    const proj = cx * nx + cy * ny;
    if (proj < 0 || proj > beamLen) continue;
    const perpX = cx - proj * nx;
    const perpY = cy - proj * ny;
    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpDist <= TILE_SIZE * 0.6) {
      creep.takeDamage(damage);
      tower.damageDealt += damage;
      // Heavy slow while crossing the beam
      const slowFactor = trait.slowFactor ?? 0.4;
      creep.applySlow(500, slowFactor);
    }
  }

  // Visual beam drawn in Tower.drawTower
});

// --- Virus spread (Cypherpunk — DoT that chains to nearby) ---
registerHitEffect('virus_spread', (trait: Trait, ctx: HitContext) => {
  const dps = trait.dps ?? 10;
  const duration = trait.duration ?? 4000;
  const spreadRange = (trait.spreadRange ?? 2) * TILE_SIZE;
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('virus', duration, dps);
    // Spread to nearby
    for (const other of ctx.allTargets) {
      if (other === target || !other.alive || other.reached) continue;
      const dx = other.x - target.x;
      const dy = other.y - target.y;
      if (Math.sqrt(dx * dx + dy * dy) <= spreadRange) {
        (other as any).statusEffects?.apply('virus', duration * 0.7, dps * 0.7);
      }
    }
  }
});

// --- Hack reverse (Cypherpunk Backdoor — creep walks backward) ---
registerHitEffect('hack_reverse', (trait: Trait, ctx: HitContext) => {
  const duration = levelScale(trait.duration ?? 1500, ctx.towerLevel, 0.15);
  for (const target of ctx.hitTargets) {
    (target as any).statusEffects?.apply('confused', duration, 1);
  }
});

// --- Disable abilities (Cypherpunk Rootkit) ---
// Same as mute_mage_aura — reuse that handler

// --- Expires after waves (Infernal Imp) ---
registerTowerUpdate('expires_after_waves', (trait: Trait, tower: any, _ctx: UpdateContext) => {
  // Wave counting handled by GameScene on wave clear
  // This trait stores _wavesRemaining
  if (trait._wavesRemaining !== undefined && trait._wavesRemaining <= 0) {
    tower._expired = true;
  }
});

// --- Decay per wave (Infernal Hellfire) ---
// Damage reduction handled by GameScene on wave clear
registerTowerUpdate('decay_per_wave', (_trait: Trait, _tower: any, _ctx: UpdateContext) => {
  // No per-frame action — decay applied on wave clear in GameScene
});

// --- Gold per kill in range (Infernal Soul Drain) ---
registerTowerUpdate('gold_per_kill_range', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const goldPerKill = trait.goldPerKill ?? 2;
  const range = tower.range || (TILE_SIZE * 4);
  for (const creep of ctx.allCreeps) {
    if (creep.alive || creep.reached || creep.hp > -900) continue;
    const dx = creep.x - tower.x;
    const dy = creep.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      tower.goldEarned += goldPerKill;
    }
  }
});

// --- Faction speed aura (Spawn Aliens — buff same-faction towers) ---
registerTowerUpdate('faction_speed_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const rateBonus = trait.ratePercent ?? 0.2;
  const range = tower.range || (TILE_SIZE * 4);
  const faction = tower.typeDef?.faction;
  if (!faction) return;

  for (const other of ctx.allTowers) {
    if (other === tower || other.typeDef?.faction !== faction) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      addOrRefreshTrait(other.traits, {
        id: '_faction_rate_buff',
        bonus: rateBonus * tower.level,
        _ttl: 200,
      });
    }
  }
});

registerFireRateMod('_faction_rate_buff', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (1 - (trait.bonus ?? 0)));
});
registerTowerUpdate('_faction_rate_buff', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
});

/** Spawn temporary swarmlings each wave (Alien Brood Mother) */
// This trait is handled in GameScene on wave start, not per-frame.
// The trait just stores the config. GameScene checks for it.
registerTowerUpdate('spawn_swarmlings_per_wave', (_trait: Trait, _tower: any, _ctx: UpdateContext) => {
  // No per-frame action — spawning handled by GameScene on wave start
});

// ============================================================
// HARMONIC FACTION AURAS
// ============================================================

/**
 * Harmonic aura system — all auras STACK additively.
 * Each aura handler adds to the buff trait's bonus.
 * The _harmonic_* buff traits reset each frame via _ttl expiry
 * and get re-added by active auras, accumulating from all sources.
 */

/** Damage aura: +X% damage to all towers in range (stacks) */
registerTowerUpdate('damage_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const bonus = (trait.percent ?? 0.2) * tower.level;
  const range = tower.range || (TILE_SIZE * 4);
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      const existing = other.traits.find((t: any) => t.id === '_harmonic_damage');
      if (existing) {
        existing.bonus += bonus; // stack!
        existing._ttl = 200;
      } else {
        other.traits.push({ id: '_harmonic_damage', bonus, _ttl: 200 });
      }
    }
  }
});

registerDamageMod('_harmonic_damage', (trait: Trait, damage: number, _ctx: HitContext) => {
  return Math.round(damage * (1 + (trait.bonus ?? 0)));
});
registerTowerUpdate('_harmonic_damage', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
  // Reset bonus for next frame's accumulation (if not expired, it gets re-added)
  if (trait._ttl <= 0) trait.bonus = 0;
});

/** Rate aura: +X% fire rate to all towers in range (stacks) */
registerTowerUpdate('rate_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const bonus = (trait.percent ?? 0.15) * tower.level;
  const range = tower.range || (TILE_SIZE * 4);
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      const existing = other.traits.find((t: any) => t.id === '_harmonic_rate');
      if (existing) {
        existing.bonus += bonus;
        existing._ttl = 200;
      } else {
        other.traits.push({ id: '_harmonic_rate', bonus, _ttl: 200 });
      }
    }
  }
});

registerFireRateMod('_harmonic_rate', (trait: Trait, rate: number, _tower: any) => {
  return Math.round(rate * (1 - Math.min(0.8, trait.bonus ?? 0))); // cap at 80% reduction
});
registerTowerUpdate('_harmonic_rate', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
  if (trait._ttl <= 0) trait.bonus = 0;
});

/** Range aura: +X tiles range to all towers in range (stacks) */
registerTowerUpdate('range_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const bonus = (trait.tiles ?? 1.5) * tower.level;
  const range = tower.range || (TILE_SIZE * 4);
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      const existing = other.traits.find((t: any) => t.id === '_harmonic_range');
      if (existing) {
        existing.bonus += bonus * TILE_SIZE;
        existing._ttl = 200;
      } else {
        other.traits.push({ id: '_harmonic_range', bonus: bonus * TILE_SIZE, _ttl: 200 });
      }
    }
  }
});

registerTowerUpdate('_harmonic_range', (trait: Trait, tower: any, ctx: UpdateContext) => {
  // Apply accumulated range bonus
  const baseRange = tower.typeDef.range * TILE_SIZE;
  tower.range = baseRange + (trait.bonus ?? 0);
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
  if (trait._ttl <= 0) trait.bonus = 0;
});

/** Crit aura: grants stacking crit chance to towers in range */
registerTowerUpdate('crit_aura', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const chance = (trait.chance ?? 0.15) * tower.level;
  const multiplier = trait.multiplier ?? 2;
  const range = tower.range || (TILE_SIZE * 4);
  for (const other of ctx.allTowers) {
    if (other === tower) continue;
    const dx = other.x - tower.x;
    const dy = other.y - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      const existing = other.traits.find((t: any) => t.id === '_harmonic_crit');
      if (existing) {
        existing.chance = Math.min(0.8, (existing.chance ?? 0) + chance); // stack, cap 80%
        existing.multiplier = Math.max(existing.multiplier ?? 2, multiplier);
        existing._ttl = 200;
      } else {
        other.traits.push({ id: '_harmonic_crit', chance: Math.min(0.8, chance), multiplier, _ttl: 200 });
      }
    }
  }
});

registerDamageMod('_harmonic_crit', (trait: Trait, damage: number, _ctx: HitContext) => {
  if (Math.random() < (trait.chance ?? 0.15)) {
    return Math.round(damage * (trait.multiplier ?? 2));
  }
  return damage;
});
registerTowerUpdate('_harmonic_crit', (trait: Trait, _tower: any, ctx: UpdateContext) => {
  trait._ttl = (trait._ttl ?? 0) - ctx.delta;
  if (trait._ttl <= 0) { trait.chance = 0; trait.bonus = 0; }
});

/** Conduit: links 2-3 nearest aura towers and shares their auras */
/** Conduit: MANUAL linking. Links stored in trait._manualLinks by GameScene. */
registerTowerUpdate('conduit_link', (trait: Trait, tower: any, ctx: UpdateContext) => {
  const auraTraitIds = ['damage_aura', 'rate_aura', 'range_aura', 'crit_aura'];
  const auraColors: Record<string, number> = {
    damage_aura: 0xff4444, rate_aura: 0x44ff44,
    range_aura: 0x4488ff, crit_aura: 0xff44ff,
  };

  // Resolve manual links to actual tower references
  const manualLinks = (trait._manualLinks ?? []) as { col: number; row: number }[];
  const linkedTowers: any[] = [];

  for (const link of manualLinks) {
    const linkedTower = ctx.allTowers.find((t: any) => t.col === link.col && t.row === link.row);
    if (linkedTower) linkedTowers.push(linkedTower);
  }

  // Store link positions + colors for visual
  trait._links = linkedTowers.map((t: any) => {
    const auraTrait = t.traits.find((tr: any) => auraTraitIds.includes(tr.id));
    return { x: t.x, y: t.y, color: auraColors[auraTrait?.id] ?? 0xffcc44 };
  });

  // Mark linked towers
  for (const lt of linkedTowers) {
    lt._linkedByConduit = true;
    lt._conduitX = tower.x;
    lt._conduitY = tower.y;
  }

  // Share auras between each pair of linked towers
  for (let i = 0; i < linkedTowers.length; i++) {
    for (let j = i + 1; j < linkedTowers.length; j++) {
      const towerA = linkedTowers[i];
      const towerB = linkedTowers[j];

      for (const traitA of towerA.traits) {
        if (!auraTraitIds.includes(traitA.id)) continue;
        shareAura(traitA, towerB, ctx, tower.level);
      }
      for (const traitB of towerB.traits) {
        if (!auraTraitIds.includes(traitB.id)) continue;
        shareAura(traitB, towerA, ctx, tower.level);
      }
    }
  }

  // Re-emit: each linked aura tower re-emits inherited buffs to its own neighbors.
  // This makes the Amplifier emit the Quickener's rate aura it received, etc.
  // Use 50% of the inherited value (70% * 50% = 35% of original) to prevent overpowering.
  const linkedSet = new Set(linkedTowers);
  const reEmitEffectiveness = 0.5;
  const harmonicBuffIds: Record<string, string> = {
    '_harmonic_damage': 'damage_aura',
    '_harmonic_rate': 'rate_aura',
    '_harmonic_range': 'range_aura',
    '_harmonic_crit': 'crit_aura',
  };

  for (const lt of linkedTowers) {
    const ltRange = lt.range || (TILE_SIZE * 4);
    for (const buff of lt.traits) {
      if (!harmonicBuffIds[buff.id]) continue;
      // Only re-emit if this buff was inherited (the tower doesn't have the source aura itself)
      const sourceAuraId = harmonicBuffIds[buff.id];
      if (lt.traits.some((t: any) => t.id === sourceAuraId)) continue;

      for (const other of ctx.allTowers) {
        if (other === lt || linkedSet.has(other) || other === tower) continue;
        const dx = other.x - lt.x;
        const dy = other.y - lt.y;
        if (Math.sqrt(dx * dx + dy * dy) > ltRange) continue;

        if (buff.id === '_harmonic_damage') {
          addOrRefreshTrait(other.traits, {
            id: '_harmonic_damage',
            bonus: (buff.bonus ?? 0) * reEmitEffectiveness,
            _ttl: 200,
          });
        } else if (buff.id === '_harmonic_rate') {
          addOrRefreshTrait(other.traits, {
            id: '_harmonic_rate',
            bonus: (buff.bonus ?? 0) * reEmitEffectiveness,
            _ttl: 200,
          });
        } else if (buff.id === '_harmonic_range') {
          addOrRefreshTrait(other.traits, {
            id: '_harmonic_range',
            bonus: (buff.bonus ?? 0) * reEmitEffectiveness,
            _ttl: 200,
          });
        } else if (buff.id === '_harmonic_crit') {
          addOrRefreshTrait(other.traits, {
            id: '_harmonic_crit',
            chance: Math.min(0.5, (buff.chance ?? 0) * reEmitEffectiveness),
            multiplier: buff.multiplier ?? 2,
            _ttl: 200,
          });
        }
      }
    }
  }
});

function shareAura(auraTrait: Trait, fromTower: any, ctx: UpdateContext, conduitLevel: number): void {
  const range = fromTower.range || (TILE_SIZE * 4);
  const effectiveness = 0.7; // shared auras are 70% as strong

  for (const other of ctx.allTowers) {
    if (other === fromTower) continue;
    const dx = other.x - fromTower.x;
    const dy = other.y - fromTower.y;
    if (Math.sqrt(dx * dx + dy * dy) > range) continue;

    switch (auraTrait.id) {
      case 'damage_aura':
        addOrRefreshTrait(other.traits, {
          id: '_harmonic_damage',
          bonus: (auraTrait.percent ?? 0.2) * conduitLevel * effectiveness,
          _ttl: 200,
        });
        break;
      case 'rate_aura':
        addOrRefreshTrait(other.traits, {
          id: '_harmonic_rate',
          bonus: (auraTrait.percent ?? 0.15) * conduitLevel * effectiveness,
          _ttl: 200,
        });
        break;
      case 'range_aura':
        addOrRefreshTrait(other.traits, {
          id: '_harmonic_range',
          bonus: (auraTrait.tiles ?? 1.5) * conduitLevel * effectiveness * TILE_SIZE,
          _ttl: 200,
        });
        break;
      case 'crit_aura':
        addOrRefreshTrait(other.traits, {
          id: '_harmonic_crit',
          chance: Math.min(0.5, (auraTrait.chance ?? 0.15) * conduitLevel * effectiveness),
          multiplier: auraTrait.multiplier ?? 2,
          _ttl: 200,
        });
        break;
    }
  }
}
