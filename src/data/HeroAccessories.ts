/**
 * Accessories for Hero Defense mode.
 * 1 accessory slot. Rotating shop offers 3 random accessories every 5 waves.
 */

export interface AccessoryDef {
  id: string;
  name: string;
  cost: number;
  description: string;
  passive: boolean;     // false = active (T key to use)
  cooldown?: number;    // seconds, for actives
  // Effects
  healPct?: number;           // Healing Potion
  phaseDuration?: number;     // Phase Boots
  phaseSpeedMult?: number;
  stunDuration?: number;      // Battle Horn
  stunRadius?: number;
  aggroRangeMult?: number;    // Ward Stone
  lifestealPct?: number;      // Vampiric Fang
  slowPct?: number;           // Frost Amulet
  slowDuration?: number;
  chainLightningChance?: number; // Thunder Cloak
  chainLightningDmg?: number;
  berserkerScaling?: number;  // Berserker Band: +X% dmg per 1% missing HP
  guardianAngel?: boolean;    // Guardian Angel: revive once
  critDmgBonus?: number;      // Scout Lens: +crit damage multiplier
  reflectPct?: number;        // Thorns Mail
  goldPerKill?: number;       // Soul Harvester
  splashRadius?: number;      // Cleave/splash AoE radius in pixels
  splashPct?: number;         // % of attack damage dealt as splash (0-1)
}

export const ACCESSORIES: AccessoryDef[] = [
  // === ACTIVES (T key) ===
  {
    id: 'healing_potion',
    name: 'Healing Potion',
    cost: 800,
    description: 'Heal 30% HP (45s CD)',
    passive: false,
    cooldown: 45,
    healPct: 0.3,
  },
  {
    id: 'phase_boots',
    name: 'Phase Boots',
    cost: 800,
    description: 'Phase through creeps 3s +50% speed (30s CD)',
    passive: false,
    cooldown: 30,
    phaseDuration: 3,
    phaseSpeedMult: 0.5,
  },
  {
    id: 'battle_horn',
    name: 'Battle Horn',
    cost: 900,
    description: 'Stun all creeps in range 1s (40s CD)',
    passive: false,
    cooldown: 40,
    stunDuration: 1,
    stunRadius: 150,
  },
  // === PASSIVES ===
  {
    id: 'ward_stone',
    name: 'Ward Stone',
    cost: 600,
    description: '+20% aggro range',
    passive: true,
    aggroRangeMult: 0.2,
  },
  {
    id: 'vampiric_fang',
    name: 'Vampiric Fang',
    cost: 1200,
    description: '8% lifesteal',
    passive: true,
    lifestealPct: 0.08,
  },
  {
    id: 'frost_amulet',
    name: 'Frost Amulet',
    cost: 1000,
    description: 'Attacks slow 20% for 1s',
    passive: true,
    slowPct: 0.2,
    slowDuration: 1,
  },
  {
    id: 'thunder_cloak',
    name: 'Thunder Cloak',
    cost: 900,
    description: '15% chain lightning chance (30 dmg)',
    passive: true,
    chainLightningChance: 0.15,
    chainLightningDmg: 30,
  },
  {
    id: 'berserker_band',
    name: 'Berserker Band',
    cost: 1100,
    description: '+1% dmg per 1% missing HP',
    passive: true,
    berserkerScaling: 1,
  },
  {
    id: 'guardian_angel',
    name: 'Guardian Angel',
    cost: 2000,
    description: 'Revive once at 50% HP (consumed)',
    passive: true,
    guardianAngel: true,
  },
  {
    id: 'scout_lens',
    name: 'Scout Lens',
    cost: 700,
    description: '+30% crit damage',
    passive: true,
    critDmgBonus: 0.3,
  },
  {
    id: 'thorns_mail',
    name: 'Thorns Mail',
    cost: 1000,
    description: 'Reflect 15% damage taken',
    passive: true,
    reflectPct: 0.15,
  },
  {
    id: 'soul_harvester',
    name: 'Soul Harvester',
    cost: 1500,
    description: '+2 gold per arena kill',
    passive: true,
    goldPerKill: 2,
  },
  // === SPLASH / AOE ===
  {
    id: 'cleave_axe',
    name: 'Cleave Axe',
    cost: 900,
    description: 'Attacks splash 40% dmg in 50px',
    passive: true,
    splashRadius: 50,
    splashPct: 0.4,
  },
  {
    id: 'inferno_blade',
    name: 'Inferno Blade',
    cost: 1400,
    description: 'Attacks splash 60% dmg in 70px',
    passive: true,
    splashRadius: 70,
    splashPct: 0.6,
  },
  {
    id: 'tempest_hammer',
    name: 'Tempest Hammer',
    cost: 2000,
    description: 'Attacks splash 80% dmg in 90px',
    passive: true,
    splashRadius: 90,
    splashPct: 0.8,
  },
];

/** Get N random accessories for rotation */
export function getRandomAccessories(count: number, seed?: number): AccessoryDef[] {
  const shuffled = [...ACCESSORIES];
  // Simple Fisher-Yates with optional seed
  let s = seed ?? Math.floor(Math.random() * 100000);
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
