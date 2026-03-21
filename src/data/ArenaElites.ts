/**
 * Elite/mini-boss arena enemies that spawn at wave milestones.
 * Each has unique mechanics beyond normal arena creeps.
 */

export interface ArenaEliteDef {
  id: string;
  name: string;
  wave: number;          // spawns at this wave number
  hpMultiplier: number;  // multiplied by base wave HP
  color: number;
  size: number;
  mechanic: 'shield_guardian' | 'base_charger' | 'necromancer';
  // Mechanic-specific
  shieldInterval?: number;  // seconds between shield casts
  shieldDuration?: number;  // seconds shield lasts
  chargeSpeedMult?: number; // speed multiplier for base charger
  chargeBaseDamage?: number;// damage to base per hit
  resurrectInterval?: number; // seconds between resurrections
  resurrectHpPct?: number;   // HP % of resurrected creeps
}

export const ARENA_ELITES: ArenaEliteDef[] = [
  {
    id: 'shield_guardian',
    name: 'Shield Guardian',
    wave: 10,
    hpMultiplier: 8,
    color: 0x44aaff,
    size: 2.0,
    mechanic: 'shield_guardian',
    shieldInterval: 8,
    shieldDuration: 3,
  },
  {
    id: 'base_charger',
    name: 'Base Charger',
    wave: 20,
    hpMultiplier: 12,
    color: 0xff6644,
    size: 2.2,
    mechanic: 'base_charger',
    chargeSpeedMult: 2,
    chargeBaseDamage: 25,
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    wave: 30,
    hpMultiplier: 6,
    color: 0x88ff44,
    size: 1.8,
    mechanic: 'necromancer',
    resurrectInterval: 5,
    resurrectHpPct: 50,
  },
];

export function getEliteForWave(waveNum: number): ArenaEliteDef | null {
  return ARENA_ELITES.find(e => e.wave === waveNum) ?? null;
}
