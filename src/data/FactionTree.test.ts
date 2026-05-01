/**
 * FactionTree spec — locks the agreed shape (Harmonic capstone, Mech /
 * Nature / Void archetypes, the chosen specialist groupings). If the
 * tree gets edited later this test fails loudly so the change has to
 * be deliberate.
 */
import { describe, it, expect } from 'vitest';
import { listTreeNodes, getTreeNode, getChildren, nodesByTier } from './FactionTree';

describe('FactionTree — shape', () => {
  it('has 11 real factions (chaos / random excluded)', () => {
    expect(listTreeNodes().length).toBe(11);
  });

  it('Arcane is the free root at L1', () => {
    const arcane = getTreeNode('arcane')!;
    expect(arcane.tier).toBe(0);
    expect(arcane.minLevel).toBe(1);
    expect(arcane.shardCost).toBe(0);
    expect(arcane.parents).toEqual([]);
  });

  it('tier 1 archetypes are Mech / Nature / Void at L3 / 1000 Shards', () => {
    for (const id of ['mechanical', 'nature', 'void'] as const) {
      const n = getTreeNode(id)!;
      expect(n.tier).toBe(1);
      expect(n.minLevel).toBe(3);
      expect(n.shardCost).toBe(1000);
      expect(n.parents).toEqual(['arcane']);
    }
  });

  it('groupings: Mech parents Military + Celestial', () => {
    expect(getChildren('mechanical').map(n => n.id).sort()).toEqual(['celestial', 'military']);
  });

  it('groupings: Nature parents Aliens + Infernal', () => {
    expect(getChildren('nature').map(n => n.id).sort()).toEqual(['aliens', 'infernal']);
  });

  it('groupings: Void parents Psionic + Cypherpunk', () => {
    expect(getChildren('void').map(n => n.id).sort()).toEqual(['cypherpunk', 'psionic']);
  });

  it('all tier-2 specialists at L6 / 1500 Shards', () => {
    for (const id of ['military', 'celestial', 'aliens', 'infernal', 'psionic', 'cypherpunk'] as const) {
      const n = getTreeNode(id)!;
      expect(n.tier).toBe(2);
      expect(n.minLevel).toBe(6);
      expect(n.shardCost).toBe(1500);
    }
  });

  it('Harmonic is the capstone — L18, 2000 Shards, requires any 4', () => {
    const h = getTreeNode('harmonic')!;
    expect(h.tier).toBe(3);
    expect(h.minLevel).toBe(18);
    expect(h.shardCost).toBe(2000);
    expect(h.requiresAnyN).toBe(4);
    expect(h.parents).toEqual([]); // capstone uses requiresAnyN, not parents
  });

  it('chaos and random are NOT in the tree', () => {
    expect(getTreeNode('chaos')).toBeNull();
    expect(getTreeNode('random')).toBeNull();
  });

  it('nodesByTier buckets correctly', () => {
    const t = nodesByTier();
    expect(t[0].length).toBe(1); // Arcane
    expect(t[1].length).toBe(3); // Mech / Nature / Void
    expect(t[2].length).toBe(6); // 6 specialists
    expect(t[3].length).toBe(1); // Harmonic
  });
});
