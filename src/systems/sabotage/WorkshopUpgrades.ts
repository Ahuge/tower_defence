/**
 * Mech finale Workshop — upgrade tier definitions.
 *
 * Three axes (Plate / Edge / Tread), four levels each (T0 base + T1/
 * T2/T3 paid tiers). Buying tier N applies the multiplier from `tiers
 * [N]` to every Raider built FROM THAT POINT ON. Already-alive Raiders
 * keep whatever stats they were trained with — there is no retroactive
 * upgrade. This makes the spend-early-vs-train-early call a real
 * economic decision.
 *
 * Costs scale 600 / 1200 / 1800 (T1 / T2 / T3) per axis = 3,600g for a
 * full set across one axis, 10,800g for max-out. With ~20k mission
 * gold available across the M10 finale, the player can fully max one
 * axis + half another, OR partially upgrade all three. The "global
 * upgrade" tradeoff is real.
 */

export type UpgradeKind = 'plate' | 'edge' | 'tread';

/** Stat multiplier applied to the Raider's base stat per axis. */
export interface RaiderStats {
  hp: number;
  attack: number;
  /** Pixels/second. */
  speed: number;
}

const BASE_RAIDER_STATS: RaiderStats = {
  hp: 200,
  attack: 30,
  speed: 90,
};

/** Per-axis tier table: cost (gold) + multiplier on the base stat. T0
 *  is the no-purchase baseline; T1+ are the paid tiers. */
export const UPGRADE_TIERS: Record<UpgradeKind, { cost: number; mult: number }[]> = {
  plate: [
    { cost: 0, mult: 1.0 },
    { cost: 600, mult: 1.5 },
    { cost: 1200, mult: 2.0 },
    { cost: 1800, mult: 2.5 },
  ],
  edge: [
    { cost: 0, mult: 1.0 },
    { cost: 600, mult: 1.5 },
    { cost: 1200, mult: 2.0 },
    { cost: 1800, mult: 2.5 },
  ],
  tread: [
    { cost: 0, mult: 1.0 },
    { cost: 600, mult: 1.25 },
    { cost: 1200, mult: 1.50 },
    { cost: 1800, mult: 1.75 },
  ],
};

export const MAX_TIER = 3;

export interface UpgradeLevels {
  plate: number;
  edge: number;
  tread: number;
}

/** Stats a Raider built at the given upgrade levels would have. Pure
 *  function — no caching, called once per train. */
export function statsForLevels(levels: UpgradeLevels): RaiderStats {
  return {
    hp: BASE_RAIDER_STATS.hp * UPGRADE_TIERS.plate[levels.plate].mult,
    attack: BASE_RAIDER_STATS.attack * UPGRADE_TIERS.edge[levels.edge].mult,
    speed: BASE_RAIDER_STATS.speed * UPGRADE_TIERS.tread[levels.tread].mult,
  };
}

/** Cost to buy the NEXT tier in the given axis at the given current
 *  level. Returns null when already at MAX_TIER (no further upgrade
 *  available). */
export function nextUpgradeCost(kind: UpgradeKind, currentLevel: number): number | null {
  if (currentLevel >= MAX_TIER) return null;
  return UPGRADE_TIERS[kind][currentLevel + 1].cost;
}
