/**
 * FactionTree — graph spec for Plan 5's unlock tree.
 *
 * Tree shape (locked with the user, in conversation):
 *
 *                          Arcane (root, L1, free)
 *                            /      |       \
 *                Mechanical (L3)  Nature (L3)  Void (L3)
 *                   /     \         /     \      /     \
 *               Military Celestial Aliens Infernal Psionic Cypherpunk
 *                (L6)     (L6)     (L6)    (L6)    (L6)     (L6)
 *                              \     |    |    /
 *                              Harmonic (L18, capstone)
 *
 * Costs:
 *   - Arcane: 0 (free root, already playable from L1)
 *   - Tier 1 archetypes (Mech / Nature / Void):  1000 Shards
 *   - Tier 2 specialists (6 nodes):              1500 Shards
 *   - Capstone (Harmonic):                       2000 Shards (+ any 4 unlocked)
 *
 * Two-step unlock model:
 *   1. Pay Shards → unlocks the campaign for that faction
 *   2. Beat the campaign → faction becomes playable
 *
 * The Shards purchase is what `FactionTree.attemptUnlock` covers.
 * Campaign-completion → playable is computed in `UnlockGates
 * .isFactionPlayable` against PlayerProfile campaign progress.
 *
 * No rerolls, no refunds. Locked.
 */

import type { FactionId } from './Factions';

export type FactionTier = 0 | 1 | 2 | 3;

export interface FactionTreeNode {
  /** Faction this node represents. */
  id: FactionId;
  /** 0=root, 1=archetype, 2=specialist, 3=capstone. */
  tier: FactionTier;
  /** Parent factions that must be Shards-unlocked before this node
   *  becomes purchasable. Empty for root + capstone (capstone uses
   *  `requiresAnyN` instead). */
  parents: FactionId[];
  /** Player Level required. */
  minLevel: number;
  /** Shards cost to unlock the campaign. 0 means free (root only). */
  shardCost: number;
  /** For the capstone: minimum number of OTHER nodes that must be
   *  Shards-unlocked before this is purchasable. Undefined for
   *  non-capstone nodes (they use `parents` instead). */
  requiresAnyN?: number;
}

const TREE: FactionTreeNode[] = [
  // Root
  { id: 'arcane',     tier: 0, parents: [],            minLevel: 1,  shardCost: 0 },

  // Tier 1 — archetypes
  { id: 'mechanical', tier: 1, parents: ['arcane'],    minLevel: 3,  shardCost: 1000 },
  { id: 'nature',     tier: 1, parents: ['arcane'],    minLevel: 3,  shardCost: 1000 },
  { id: 'void',       tier: 1, parents: ['arcane'],    minLevel: 3,  shardCost: 1000 },

  // Tier 2 — specialists (locked groupings)
  { id: 'military',   tier: 2, parents: ['mechanical'], minLevel: 6,  shardCost: 1500 },
  { id: 'celestial',  tier: 2, parents: ['mechanical'], minLevel: 6,  shardCost: 1500 },
  { id: 'aliens',     tier: 2, parents: ['nature'],     minLevel: 6,  shardCost: 1500 },
  { id: 'infernal',   tier: 2, parents: ['nature'],     minLevel: 6,  shardCost: 1500 },
  { id: 'psionic',    tier: 2, parents: ['void'],       minLevel: 6,  shardCost: 1500 },
  { id: 'cypherpunk', tier: 2, parents: ['void'],       minLevel: 6,  shardCost: 1500 },

  // Tier 3 — capstone
  { id: 'harmonic',   tier: 3, parents: [], minLevel: 18, shardCost: 2000, requiresAnyN: 4 },
];

const BY_ID = new Map<FactionId, FactionTreeNode>(TREE.map(n => [n.id, n]));

/** All real factions in the tree. Excludes meta entries (chaos / random). */
export function listTreeNodes(): readonly FactionTreeNode[] {
  return TREE;
}

/** Look up a node by faction id. Null for meta entries (chaos / random). */
export function getTreeNode(id: FactionId): FactionTreeNode | null {
  return BY_ID.get(id) ?? null;
}

/** Children of a node (factions whose `parents` include this id). */
export function getChildren(id: FactionId): FactionTreeNode[] {
  return TREE.filter(n => n.parents.includes(id));
}

/** Tier-bucketed view for the tree-graph layout. */
export function nodesByTier(): { [tier: number]: FactionTreeNode[] } {
  const out: { [tier: number]: FactionTreeNode[] } = { 0: [], 1: [], 2: [], 3: [] };
  for (const n of TREE) out[n.tier].push(n);
  return out;
}
