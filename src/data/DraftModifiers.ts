import { Trait } from '../systems/traits/Trait';
import { rng } from '../systems/Rng';

export interface DraftModifier {
  id: string;
  name: string;
  description: string;
  // Traits applied to every tower on creation
  towerTraits: Trait[];
  // One-time game effects
  extraGold: number;
  extraLives: number;
  livesOverride: number | null;
  extraIncome: number;
  killGoldMult: number;
  costMult: number;
}

export const DRAFT_MODIFIERS: DraftModifier[] = [
  {
    id: 'extra_gold', name: 'Gold Rush', description: '+50 starting gold',
    towerTraits: [], extraGold: 50, extraLives: 0, livesOverride: null,
    extraIncome: 0, killGoldMult: 1, costMult: 1,
  },
  {
    id: 'extra_lives', name: 'Fortified', description: '+10 starting lives',
    towerTraits: [], extraGold: 0, extraLives: 10, livesOverride: null,
    extraIncome: 0, killGoldMult: 1, costMult: 1,
  },
  {
    id: 'fast_towers', name: 'Rapid Fire', description: 'All towers fire 15% faster',
    towerTraits: [{ id: 'fire_rate_mult', factor: 0.85 }],
    extraGold: 0, extraLives: 0, livesOverride: null,
    extraIncome: 0, killGoldMult: 1, costMult: 1,
  },
  {
    id: 'long_range', name: 'Eagle Eye', description: 'All towers +1 range',
    towerTraits: [{ id: 'range_bonus', bonus: 1 }],
    extraGold: 0, extraLives: 0, livesOverride: null,
    extraIncome: 0, killGoldMult: 1, costMult: 1,
  },
  {
    id: 'extra_income', name: 'Merchant', description: '+5 base income per wave',
    towerTraits: [], extraGold: 0, extraLives: 0, livesOverride: null,
    extraIncome: 5, killGoldMult: 1, costMult: 1,
  },
  {
    id: 'cheap_towers', name: 'Discount', description: 'Towers cost 20% less',
    towerTraits: [], extraGold: 0, extraLives: 0, livesOverride: null,
    extraIncome: 0, killGoldMult: 1, costMult: 0.8,
  },
  {
    id: 'strong_creeps', name: 'Challenge', description: 'Creeps have +25% HP, +50% kill gold',
    towerTraits: [], extraGold: 0, extraLives: 0, livesOverride: null,
    extraIncome: 0, killGoldMult: 1.5, costMult: 1,
  },
  {
    id: 'glass_cannon', name: 'Glass Cannon', description: '5 lives, but towers deal 50% more damage',
    towerTraits: [{ id: 'damage_mult', factor: 1.5 }],
    extraGold: 0, extraLives: 0, livesOverride: 5,
    extraIncome: 0, killGoldMult: 1, costMult: 1,
  },
];

export function getRandomModifiers(count: number): DraftModifier[] {
  const shuffled = [...DRAFT_MODIFIERS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}
