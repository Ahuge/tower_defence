import { describe, it, expect } from 'vitest';
import { buildFactionBalanceSchema, defaultParamsFor, balanceableFactions } from './FactionBalanceSchema';
import { TOWER_TYPES } from '../TowerTypes';
import { FACTIONS } from '../Factions';

describe('FactionBalanceSchema', () => {
  it('builds non-empty schema for void', () => {
    const schema = buildFactionBalanceSchema('void');
    expect(Object.keys(schema).length).toBeGreaterThan(10);
  });

  it('every knob has min < max except frozen (skipped) ones', () => {
    const schema = buildFactionBalanceSchema('infernal');
    for (const [key, spec] of Object.entries(schema)) {
      expect(spec.min, key).toBeLessThan(spec.max);
      expect(spec.default, key).toBeGreaterThanOrEqual(spec.min);
      expect(spec.default, key).toBeLessThanOrEqual(spec.max);
    }
  });

  it('every knob default matches the live TOWER_TYPES value (round-trip)', () => {
    const factions: ('void'|'infernal'|'mechanical'|'harmonic'|'aliens')[] = ['void', 'infernal', 'mechanical', 'harmonic', 'aliens'];
    for (const faction of factions) {
      const schema = buildFactionBalanceSchema(faction);
      for (const [key, spec] of Object.entries(schema)) {
        // Resolve dot-path against TOWER_TYPES + traits.
        const live = resolveLive(key);
        expect(live, key).toBe(spec.default);
      }
    }
  });

  it('does not generate knobs for damage=0 towers core damage', () => {
    const schema = buildFactionBalanceSchema('military');
    expect(schema).not.toHaveProperty('mil_sandbag.damage');
    expect(schema).not.toHaveProperty('mil_wire.damage');
  });

  it('does not generate fireRate knobs for non-attacking towers (>=90000 fireRate)', () => {
    const schema = buildFactionBalanceSchema('military');
    expect(schema).not.toHaveProperty('mil_sandbag.fireRate');
    expect(schema).not.toHaveProperty('mil_wire.fireRate');
    const harmonicSchema = buildFactionBalanceSchema('harmonic');
    expect(harmonicSchema).not.toHaveProperty('harmonic_amplifier.fireRate');
  });

  it('emits jackpot.killChance knob for void_gambler', () => {
    const schema = buildFactionBalanceSchema('void');
    expect(schema).toHaveProperty('void_gambler.traits.jackpot.killChance');
    const spec = schema['void_gambler.traits.jackpot.killChance'];
    expect(spec.default).toBe(0.04);  // matches TowerTypes.ts
    expect(spec.integer).toBe(false);
  });

  it('emits chain_damage.chainCount for mech_tesla', () => {
    const schema = buildFactionBalanceSchema('mechanical');
    expect(schema).toHaveProperty('mech_tesla.traits.chain_damage.chainCount');
    const spec = schema['mech_tesla.traits.chain_damage.chainCount'];
    expect(spec.default).toBe(2);
    expect(spec.integer).toBe(true);
  });

  it('emits gold_on_hit.amount for void_siphon', () => {
    const schema = buildFactionBalanceSchema('void');
    expect(schema).toHaveProperty('void_siphon.traits.gold_on_hit.amount');
    expect(schema['void_siphon.traits.gold_on_hit.amount'].default).toBe(2);
  });

  it('emits expires_after_waves.waves for infernal_imp', () => {
    const schema = buildFactionBalanceSchema('infernal');
    expect(schema).toHaveProperty('infernal_imp.traits.expires_after_waves.waves');
    expect(schema['infernal_imp.traits.expires_after_waves.waves'].default).toBe(4);
  });

  it('skips unknown traits without crashing', () => {
    // direct_damage trait has no params; should not cause errors
    const schema = buildFactionBalanceSchema('void');
    // Just verify the function returned successfully
    expect(typeof schema).toBe('object');
  });

  it('defaultParamsFor returns one entry per knob', () => {
    const schema = buildFactionBalanceSchema('void');
    const defaults = defaultParamsFor(schema);
    expect(Object.keys(defaults).length).toBe(Object.keys(schema).length);
    for (const key of Object.keys(schema)) {
      expect(defaults[key]).toBe(schema[key].default);
    }
  });

  it('balanceableFactions includes all real factions with towers', () => {
    const factions = balanceableFactions();
    expect(factions).toContain('void');
    expect(factions).toContain('infernal');
    expect(factions).toContain('mechanical');
    expect(factions.length).toBeGreaterThan(8);
  });

  it('schema knob counts are reasonable per faction', () => {
    // Sanity check from BRAIN_V5_PLAN.md: ~35 knobs/Void, ~50/Mechanical
    const voidSchema = buildFactionBalanceSchema('void');
    const mechSchema = buildFactionBalanceSchema('mechanical');
    expect(Object.keys(voidSchema).length).toBeGreaterThan(15);
    expect(Object.keys(voidSchema).length).toBeLessThan(60);
    expect(Object.keys(mechSchema).length).toBeGreaterThan(20);
    expect(Object.keys(mechSchema).length).toBeLessThan(80);
  });
});

/** Resolve a dot-path key like `void_gambler.cost` or
 *  `void_gambler.traits.jackpot.killChance` into the live value from
 *  TOWER_TYPES. Used by the round-trip test to confirm defaults match. */
function resolveLive(dotPath: string): unknown {
  const parts = dotPath.split('.');
  const towerId = parts[0];
  const tower = TOWER_TYPES[towerId];
  if (!tower) return undefined;
  if (parts.length === 2) {
    return (tower as unknown as Record<string, unknown>)[parts[1]];
  }
  if (parts[1] === 'traits' && parts.length === 4) {
    const trait = tower.traits.find(t => t.id === parts[2]);
    if (!trait) return undefined;
    return (trait as Record<string, unknown>)[parts[3]];
  }
  return undefined;
}

void FACTIONS;
