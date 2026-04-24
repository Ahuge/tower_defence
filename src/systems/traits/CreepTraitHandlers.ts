import { TILE_SIZE, gridX, gridY } from '../../config';
import { rng } from '../Rng';
import {
  registerCreepDamage, registerCreepUpdate, registerCreepDraw,
  Trait,
} from './Trait';

// ============================================================
// Shield — absorb damage before HP
// ============================================================

registerCreepDamage('shield', (trait: Trait, damage: number) => {
  if (!trait._active || trait._shieldHp <= 0) return damage;

  trait._shieldHp -= damage;
  if (trait._shieldHp <= 0) {
    trait._active = false;
    const overflow = -trait._shieldHp;
    trait._shieldHp = 0;
    return overflow;
  }
  return 0;
});

// ============================================================
// Damage Cap Shield — max 1 damage per hit until shield depleted
// ============================================================

registerCreepDamage('damage_cap_shield', (trait: Trait, damage: number) => {
  if ((trait._hits ?? 0) >= (trait.shieldHits ?? 15)) return damage; // shield depleted
  trait._hits = (trait._hits ?? 0) + 1;
  return 1; // cap to 1 damage per hit
});

registerCreepDraw('damage_cap_shield', (trait: Trait, creep: any, g: any) => {
  const remaining = (trait.shieldHits ?? 15) - (trait._hits ?? 0);
  if (remaining <= 0) return;
  const baseSize = creep.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
  const drawSize = baseSize * creep.size;
  // Hexagonal shield effect
  g.lineStyle(2, 0x44aaff, 0.6);
  g.strokeCircle(creep.x, creep.y, drawSize + 4);
  g.strokeCircle(creep.x, creep.y, drawSize + 6);
});

// ============================================================
// Evasion — chance to dodge incoming damage entirely
// ============================================================

registerCreepDamage('evasion', (trait: Trait, damage: number) => {
  const chance = trait.chance ?? 0.25;
  if (rng() < chance) {
    return 0; // dodged!
  }
  return damage;
});

// ============================================================
// Heal Aura — periodically heal nearby creeps
// Diminishing returns: each additional heal source on the same
// creep in the same tick is reduced by 50% (1st=100%, 2nd=50%, 3rd=25%...)
// Healers themselves only receive 10% of healing.
// ============================================================

/** Apply heal with diminishing returns and healer penalty */
function applyHeal(target: any, amount: number): void {
  // Healers receive only 10% healing
  const isHealer = target.traits?.some((t: Trait) => t.id === 'heal_aura' || t.id === 'flat_heal_aura');
  if (isHealer) amount = Math.floor(amount * 0.1);

  // Diminishing returns: 50% reduction per additional source this tick
  const sources = (target._healSourcesThisTick ?? 0);
  const multiplier = Math.pow(0.5, sources);
  const finalHeal = Math.max(1, Math.floor(amount * multiplier));

  target.hp = Math.min(target.maxHp, target.hp + finalHeal);
  target._healSourcesThisTick = sources + 1;
}

registerCreepUpdate('heal_aura', (trait: Trait, creep: any, delta: number, nearbyCreeps: any[]) => {
  trait._cooldown = (trait._cooldown ?? 0) - delta;
  if (trait._cooldown > 0) return;

  trait._cooldown = trait.cooldown ?? 1000;
  const healRange = (trait.range ?? 3) * TILE_SIZE;
  const healPercent = trait.healPercent ?? 0.03;

  for (const other of nearbyCreeps) {
    if (other === creep || !other.alive || other.reached) continue;
    const dx = other.x - creep.x;
    const dy = other.y - creep.y;
    if (Math.sqrt(dx * dx + dy * dy) <= healRange) {
      applyHeal(other, Math.floor(other.maxHp * healPercent));
    }
  }
});

// ============================================================
// Flat Heal Aura (Heal Mage) — periodic flat HP heal
// ============================================================

registerCreepUpdate('flat_heal_aura', (trait: Trait, creep: any, delta: number, nearbyCreeps: any[]) => {
  trait._cooldown = (trait._cooldown ?? 0) - delta;
  if (trait._cooldown > 0) return;

  trait._cooldown = trait.cooldown ?? 800;
  const range = (trait.range ?? 4) * TILE_SIZE;
  const healAmount = trait.healAmount ?? 15;

  for (const other of nearbyCreeps) {
    if (other === creep || !other.alive || other.reached) continue;
    const dx = other.x - creep.x;
    const dy = other.y - creep.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      applyHeal(other, healAmount);
    }
  }
});

registerCreepDraw('flat_heal_aura', (trait: Trait, creep: any, g: any) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  g.lineStyle(1, 0x44ffaa, 0.25);
  g.strokeCircle(creep.x, creep.y, range);
});

// ============================================================
// Armor Aura (Mage) — nearby creeps gain +1 armor tier
// ============================================================

registerCreepUpdate('armor_aura', (trait: Trait, creep: any, _delta: number, nearbyCreeps: any[]) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  const TIERS = ['light', 'medium', 'heavy'];

  for (const other of nearbyCreeps) {
    if (other === creep || !other.alive || other.reached) continue;
    const dx = other.x - creep.x;
    const dy = other.y - creep.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      // Temporarily boost armor (will be reset next frame by creep's own shred calc)
      const baseIdx = TIERS.indexOf(other.baseArmor);
      const boosted = TIERS[Math.min(TIERS.length - 1, baseIdx + 1)];
      if (TIERS.indexOf(other.armor) < TIERS.indexOf(boosted)) {
        other.armor = boosted;
      }
    }
  }
});

// ============================================================
// Speed Aura (Mage) — nearby creeps move faster
// ============================================================

registerCreepUpdate('speed_aura', (trait: Trait, creep: any, _delta: number, nearbyCreeps: any[]) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  const speedBonus = trait.speedBonus ?? 0.3;

  for (const other of nearbyCreeps) {
    if (other === creep || !other.alive || other.reached) continue;
    const dx = other.x - creep.x;
    const dy = other.y - creep.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      other.speed = Math.max(other.speed, other.baseSpeed * (1 + speedBonus));
    }
  }
});

// ============================================================
// Evasion Aura (Mage) — nearby creeps gain evasion
// ============================================================

registerCreepUpdate('evasion_aura', (trait: Trait, creep: any, _delta: number, nearbyCreeps: any[]) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  const bonus = trait.evasionBonus ?? 0.15;

  for (const other of nearbyCreeps) {
    if (other === creep || !other.alive || other.reached) continue;
    const dx = other.x - creep.x;
    const dy = other.y - creep.y;
    if (Math.sqrt(dx * dx + dy * dy) <= range) {
      // Apply temporary evasion — handled by checking for evasion_aura_buff status
      other.statusEffects?.apply('evasion_buff', 200, bonus);
    }
  }
});

// ============================================================
// Regeneration — heals percentage of max HP per second
// ============================================================

registerCreepUpdate('regeneration', (trait: Trait, creep: any, delta: number, _nearbyCreeps: any[]) => {
  if (!creep.alive || creep.reached) return;
  if (creep.hp >= creep.maxHp) return;

  const regenPercent = trait.regenPercent ?? 0.02;
  const healAmount = creep.maxHp * regenPercent * (delta / 1000);
  creep.hp = Math.min(creep.maxHp, creep.hp + healAmount);
});

registerCreepDraw('regeneration', (_trait: Trait, creep: any, g: any) => {
  if (creep.hp >= creep.maxHp) return;
  // Green pulse when regenerating
  const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
  const baseSize = creep.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
  g.lineStyle(2, 0x44ff44, pulse);
  g.strokeCircle(creep.x, creep.y, baseSize * creep.size + 3);
});

// ============================================================
// Visual overlays
// ============================================================

registerCreepDraw('shield', (trait: Trait, creep: any, g: any) => {
  if (!trait._active) return;
  const baseSize = creep.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
  const drawSize = baseSize * creep.size;
  g.lineStyle(2, 0x4488ff, 0.5);
  g.strokeCircle(creep.x, creep.y, drawSize + 3);
});

registerCreepDraw('heal_aura', (trait: Trait, creep: any, g: any) => {
  const healRange = (trait.range ?? 3) * TILE_SIZE;
  g.lineStyle(1, 0x44ff88, 0.3);
  g.strokeCircle(creep.x, creep.y, healRange);
});

registerCreepDraw('armor_aura', (trait: Trait, creep: any, g: any) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  g.lineStyle(1, 0x8888cc, 0.2);
  g.strokeCircle(creep.x, creep.y, range);
});

registerCreepDraw('speed_aura', (trait: Trait, creep: any, g: any) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  g.lineStyle(1, 0xffcc44, 0.2);
  g.strokeCircle(creep.x, creep.y, range);
});

registerCreepDraw('evasion_aura', (trait: Trait, creep: any, g: any) => {
  const range = (trait.range ?? 4) * TILE_SIZE;
  g.lineStyle(1, 0xaabbdd, 0.2);
  g.strokeCircle(creep.x, creep.y, range);
});

registerCreepDraw('evasion', (_trait: Trait, creep: any, g: any) => {
  // Subtle shimmer effect for evasive creeps
  if (rng() < 0.3) {
    const baseSize = creep.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
    g.lineStyle(1, 0x66ccff, 0.3);
    g.strokeCircle(creep.x, creep.y, baseSize * creep.size + 2);
  }
});
