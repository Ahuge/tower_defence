export type ItemSlot = 'weapon' | 'armor' | 'boots';

export interface ItemTier {
  tier: number;
  cost: number;
  label: string;
  stats: Record<string, number>; // stat key → value
}

export interface ItemSlotDef {
  slot: ItemSlot;
  name: string;
  color: string;
  tiers: [ItemTier, ItemTier, ItemTier];
}

export const ITEM_SLOTS: Record<ItemSlot, ItemSlotDef> = {
  weapon: {
    slot: 'weapon',
    name: 'Weapon',
    color: '#ff6644',
    tiers: [
      { tier: 1, cost: 50, label: 'Iron Blade', stats: { damage: 15 } },
      { tier: 2, cost: 120, label: 'Steel Sword', stats: { damage: 35 } },
      { tier: 3, cost: 250, label: 'Runic Edge', stats: { damage: 60, critChance: 0.1 } },
    ],
  },
  armor: {
    slot: 'armor',
    name: 'Armor',
    color: '#4488ff',
    tiers: [
      { tier: 1, cost: 40, label: 'Chain Mail', stats: { armorFlat: 2, bonusHp: 50 } },
      { tier: 2, cost: 100, label: 'Plate Armor', stats: { armorFlat: 5, bonusHp: 120 } },
      { tier: 3, cost: 220, label: 'Guardian Plate', stats: { armorFlat: 10, bonusHp: 200 } },
    ],
  },
  boots: {
    slot: 'boots',
    name: 'Boots',
    color: '#44ff88',
    tiers: [
      { tier: 1, cost: 30, label: 'Leather Boots', stats: { speedMult: 0.2 } },
      { tier: 2, cost: 80, label: 'Swift Greaves', stats: { speedMult: 0.4 } },
      { tier: 3, cost: 180, label: 'Windrunners', stats: { speedMult: 0.6, dodgeChance: 0.1 } },
    ],
  },
};

export const ITEM_SLOT_ORDER: ItemSlot[] = ['weapon', 'armor', 'boots'];

/** Get total cost to upgrade from tier 0 (no item) to a specific tier */
export function getItemTotalCost(slot: ItemSlot, targetTier: number): number {
  const def = ITEM_SLOTS[slot];
  let total = 0;
  for (let i = 0; i < targetTier; i++) {
    total += def.tiers[i].cost;
  }
  return total;
}

/** Get cost to upgrade from current tier to next */
export function getItemUpgradeCost(slot: ItemSlot, currentTier: number): number | null {
  const def = ITEM_SLOTS[slot];
  if (currentTier >= 3) return null;
  return def.tiers[currentTier].cost;
}
