import { TILE_SIZE, gridX, gridY } from '../../config';
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
  if (Math.random() < chance) {
    return 0; // dodged!
  }
  return damage;
});

// ============================================================
// Heal Aura — periodically heal nearby creeps
// ============================================================

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
      other.hp = Math.min(other.maxHp, other.hp + Math.floor(other.maxHp * healPercent));
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
      other.hp = Math.min(other.maxHp, other.hp + healAmount);
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
  if (Math.random() < 0.3) {
    const baseSize = creep.isBoss ? TILE_SIZE * 0.45 : TILE_SIZE * 0.3;
    g.lineStyle(1, 0x66ccff, 0.3);
    g.strokeCircle(creep.x, creep.y, baseSize * creep.size + 2);
  }
});
