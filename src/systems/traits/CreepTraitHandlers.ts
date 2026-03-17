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
  return 0; // fully absorbed
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
