export interface DraftModifier {
  id: string;
  name: string;
  description: string;
  effect: string; // used by game logic to apply
}

export const DRAFT_MODIFIERS: DraftModifier[] = [
  { id: 'extra_gold', name: 'Gold Rush', description: '+50 starting gold', effect: 'extra_gold' },
  { id: 'extra_lives', name: 'Fortified', description: '+10 starting lives', effect: 'extra_lives' },
  { id: 'fast_towers', name: 'Rapid Fire', description: 'All towers fire 15% faster', effect: 'fast_towers' },
  { id: 'long_range', name: 'Eagle Eye', description: 'All towers +1 range', effect: 'long_range' },
  { id: 'extra_income', name: 'Merchant', description: '+5 base income per wave', effect: 'extra_income' },
  { id: 'cheap_towers', name: 'Discount', description: 'Towers cost 20% less', effect: 'cheap_towers' },
  { id: 'strong_creeps', name: 'Challenge', description: 'Creeps have +25% HP, +50% kill gold', effect: 'strong_creeps' },
  { id: 'glass_cannon', name: 'Glass Cannon', description: '5 lives, but towers deal 50% more damage', effect: 'glass_cannon' },
];

export function getRandomModifiers(count: number): DraftModifier[] {
  const shuffled = [...DRAFT_MODIFIERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
