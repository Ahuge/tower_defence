/**
 * FactionVocab — per-faction tower slot mapping used by the RL
 * action space. Each faction's tower list is sorted by cost
 * ascending; slot N maps to the N-th cheapest tower id. Slot 0 is
 * always the cheapest opener; slot 7 (when present) is the most
 * expensive / ultimate.
 *
 * Same sort order `Match.setup` already produces, so the RL
 * agent's per-slot intuition matches what hand-written brains
 * see when they iterate the cost-sorted pool.
 *
 * `NUM_TOWER_SLOTS` is the max across all factions we train on
 * (currently 8 — Mechanical hits it; Arcane has 7 and leaves
 * slot 7 permanently masked off).
 */
import { FACTIONS, FactionId } from '../../../data/Factions';
import { getTowerType } from '../../../data/TowerTypes';

export const NUM_TOWER_SLOTS = 8;

const VOCAB_CACHE: Partial<Record<FactionId, string[]>> = {};

/** Cost-sorted tower id list for this faction. Length is whatever
 *  the faction has (1..NUM_TOWER_SLOTS). Cached after first call. */
export function getFactionTowerIds(faction: FactionId): string[] {
  const cached = VOCAB_CACHE[faction];
  if (cached) return cached;
  const ids = FACTIONS[faction].towerIds
    .map(id => ({ id, cost: getTowerType(id).cost }))
    .sort((a, b) => a.cost - b.cost)
    .map(x => x.id);
  VOCAB_CACHE[faction] = ids;
  return ids;
}

/** Tower id for `(faction, slot)`, or null if this faction has
 *  fewer towers than `slot + 1`. Callers must treat null as
 *  "permanently illegal action for this faction." */
export function towerIdForSlot(faction: FactionId, slot: number): string | null {
  const ids = getFactionTowerIds(faction);
  return slot < ids.length ? ids[slot] : null;
}

/** Slot index for a tower id within its faction's pool, or -1 if
 *  the tower doesn't belong to that faction. Used by `encodeAction`. */
export function slotForTowerId(faction: FactionId, towerId: string): number {
  const ids = getFactionTowerIds(faction);
  return ids.indexOf(towerId);
}
