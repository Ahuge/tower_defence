import { ArmorType, DamageType } from '../data/CreepTypes';

// Damage multiplier matrix: [damageType][armorType]
const MULTIPLIERS: Record<DamageType, Record<ArmorType, number>> = {
  physical: {
    light: 1.25,
    medium: 1.0,
    heavy: 0.5,
  },
  magic: {
    light: 0.75,
    medium: 1.0,
    heavy: 1.5,
  },
};

export function calculateDamage(baseDamage: number, damageType: DamageType, armorType: ArmorType): number {
  const multiplier = MULTIPLIERS[damageType][armorType];
  return Math.max(1, Math.round(baseDamage * multiplier));
}
