/**
 * v5.1 — FactionBalanceSchema
 *
 * Per BRAIN_V5_PLAN.md, v5 tunes faction-internal values (tower stats,
 * trait params) within bounds that preserve the faction's identity and
 * never affect other factions. This file builds the brain-search schema
 * for one faction by reflecting `TOWER_TYPES[faction]` into a flat
 * dot-path → ParamSpec map.
 *
 * Knob naming: `<towerId>.<field>` for core stats, e.g.
 * `void_gambler.cost`. Trait params: `<towerId>.traits.<traitId>.<param>`
 * e.g. `void_gambler.traits.jackpot.killChance`.
 *
 * Bounds:
 *   - cost: ±50%, integer, min 1
 *   - damage: ±50%, integer (no-op for damage=0 walls)
 *   - range: ±30% (geometry-sensitive, smaller swings)
 *   - fireRate: ±40% (no-op for non-attacking towers, fireRate ≥ 90000)
 *   - projectileSpeed: ±50% (no-op for melee/no-projectile)
 *   - per-trait: each known trait has its own bound generators (jackpot
 *     killChance, slow factor, splash radius, gold amount, etc.); unknown
 *     traits are skipped to avoid breaking unmodelled mechanics.
 *
 * Round-trip guarantee: applying the schema's defaults via the v5.2
 * loader produces a TOWER_TYPES bit-identical to the source. Tested in
 * `FactionBalanceSchema.test.ts`.
 */
import { TOWER_TYPES } from '../TowerTypes';
import { FACTIONS, FactionId } from '../Factions';
import { ParamSchema, ParamSpec } from '../../headless/brain-search/BrainSearchManager';

// ── Core-stat bound generators ─────────────────────────────────────

function costBounds(c: number): ParamSpec {
  return {
    min: Math.max(1, Math.floor(c * 0.5)),
    max: Math.ceil(c * 1.5),
    default: c,
    step: Math.max(1, Math.floor(c * 0.1)),
    integer: true,
  };
}

function damageBounds(c: number): ParamSpec {
  // damage=0 towers (sandbag, wire, harmonic auras) keep their identity —
  // don't generate a knob that could turn them into attackers.
  if (c === 0) return frozenBounds(0);
  return {
    min: Math.max(1, Math.floor(c * 0.5)),
    max: Math.ceil(c * 1.5),
    default: c,
    step: Math.max(1, Math.floor(c * 0.1)),
    integer: true,
  };
}

function rangeBounds(c: number): ParamSpec {
  if (c <= 0) return frozenBounds(c);
  return {
    min: Math.max(0.5, c * 0.7),
    max: c * 1.3,
    default: c,
    step: 0.2,
    integer: false,
  };
}

function fireRateBounds(c: number): ParamSpec {
  // fireRate >= 90000 = "never attacks" sentinel for walls / pure-aura
  // towers. Don't tune.
  if (c >= 90000) return frozenBounds(c);
  return {
    min: Math.max(100, Math.floor(c * 0.6)),
    max: Math.ceil(c * 1.4),
    default: c,
    step: Math.max(50, Math.floor(c * 0.05)),
    integer: true,
  };
}

function projectileSpeedBounds(c: number): ParamSpec {
  if (c === 0) return frozenBounds(0);
  return {
    min: Math.max(50, Math.floor(c * 0.5)),
    max: Math.ceil(c * 1.5),
    default: c,
    step: 50,
    integer: true,
  };
}

/** A "no-op knob" used when a stat shouldn't be tuned (damage=0 towers,
 *  no-attack fireRate sentinels, projectileSpeed=0 for melee). The
 *  brain-search ES will not move it because min === max. */
function frozenBounds(c: number): ParamSpec {
  return { min: c, max: c, default: c, step: 1, integer: Number.isInteger(c) };
}

// ── Trait-param bound generators ──────────────────────────────────

/** Symmetric ±50% percent knob, capped at 1.0. */
function pct(c: number): ParamSpec {
  return {
    min: Math.max(0.01, c * 0.5),
    max: Math.min(1.0, c * 1.5),
    default: c,
    step: 0.05,
    integer: false,
  };
}

/** ±50% percent knob without the 1.0 cap (for things like crit
 *  multipliers, damage-amp percents that can exceed 1.0). */
function pctUncapped(c: number): ParamSpec {
  return {
    min: Math.max(0.01, c * 0.5),
    max: c * 1.5,
    default: c,
    step: 0.05,
    integer: false,
  };
}

/** Slow factor: lower = stronger slow. 0.3 strong, 0.9 mild. Bounded
 *  to avoid degenerate "100% stop" or "0% slow" tunings. */
function slowFactor(c: number): ParamSpec {
  return { min: 0.3, max: 0.9, default: c, step: 0.1, integer: false };
}

/** Duration in ms — ±50% with a 100ms floor. */
function durationMs(c: number): ParamSpec {
  return {
    min: Math.max(100, Math.floor(c * 0.5)),
    max: Math.ceil(c * 2),
    default: c,
    step: 100,
    integer: true,
  };
}

/** Crit multiplier, integer-ish but kept float for finer-grained search. */
function critMult(c: number): ParamSpec {
  return { min: 1.2, max: c * 1.5, default: c, step: 0.1, integer: false };
}

/** Gold amount per hit / kill — integer 1..2× current. */
function goldAmount(c: number): ParamSpec {
  return { min: 1, max: Math.max(2, Math.ceil(c * 2)), default: c, step: 1, integer: true };
}

/** Tile range for trait fields like splash radius (in pixels — handled
 *  carefully) or aura tiles. ±30%. */
function tileRange(c: number): ParamSpec {
  return { min: Math.max(0.5, c * 0.7), max: c * 1.3, default: c, step: 0.5, integer: false };
}

/** Splash radius in pixels (the engine uses pixel radii like 48). */
function splashRadiusPixels(c: number): ParamSpec {
  return { min: Math.max(8, Math.floor(c * 0.7)), max: Math.ceil(c * 1.3), default: c, step: 4, integer: true };
}

/** Small integer count (chain bounces, lifespan waves). ±2 around current. */
function smallInt(c: number): ParamSpec {
  return { min: Math.max(1, c - 2), max: c + 2, default: c, step: 1, integer: true };
}

/** Falloff factor for chain damage / similar. Bounded 0.3..0.95. */
function falloffFactor(c: number): ParamSpec {
  return { min: 0.3, max: 0.95, default: c, step: 0.05, integer: false };
}

/** Decay percent (Hellfire decay_per_wave). Bounded 0.05..0.30. */
function decayPercent(c: number): ParamSpec {
  return { min: 0.05, max: 0.30, default: c, step: 0.025, integer: false };
}

// ── Trait knob registry ───────────────────────────────────────────

/** Map of trait id → { paramName → bounds generator }. Unknown traits
 *  are skipped (we never produce a knob for a trait we haven't
 *  modelled). When a new trait is added to the game, extend this
 *  registry — until then, v5 won't tune that trait's params. */
const TRAIT_KNOBS: Record<string, Record<string, (c: number) => ParamSpec>> = {
  jackpot: { killChance: pct, missChance: pct },
  slow_on_hit: { factor: slowFactor, chance: pct, duration: durationMs },
  barbed_wire: { factor: slowFactor },
  splash_damage: { radius: splashRadiusPixels },
  damage_aura: { percent: pct },
  rate_aura: { percent: pct },
  crit_aura: { chance: pct, multiplier: critMult },
  range_aura: { tiles: tileRange },
  adjacency_buff: { damagePercent: pct, ratePercent: pct, damageMult: pctUncapped, fireRateMult: pct },
  overclock_buff: { damagePercent: pct, ratePercent: pct, damageMult: pctUncapped, fireRateMult: pct },
  spell_amp: { bonus: pct },
  gold_on_hit: { chance: pct, amount: goldAmount },
  gold_per_kill_range: { goldPerKill: goldAmount },
  teleport_delivery: { stepsBase: smallInt, stepsPerLevel: smallInt },
  expires_after_waves: { waves: smallInt },
  decay_per_wave: { decayPercent: decayPercent },
  chain_damage: { chainCount: smallInt, falloff: falloffFactor },
  damage_amp_on_hit: { ampAmount: pct, duration: durationMs },
  damage_variance: { min: pct, max: pctUncapped },
  burn_dot: { dps: damageBounds, duration: durationMs },
  root_on_hit: { chance: pct, duration: durationMs },
  confuse_on_hit: { chance: pct, duration: durationMs },
};

// ── Schema generator ──────────────────────────────────────────────

const CORE_STAT_GENERATORS: Record<string, (c: number) => ParamSpec> = {
  cost: costBounds,
  damage: damageBounds,
  range: rangeBounds,
  fireRate: fireRateBounds,
  projectileSpeed: projectileSpeedBounds,
};

/** Build a brain-search-compatible ParamSchema for one faction. Knob
 *  count is roughly (towers × 5 core stats) + Σ(trait-knobs across all
 *  traits across all towers). For Void: ~5 towers × 5 + ~10 trait
 *  knobs ≈ 35 knobs. For Mechanical: ~8 × 5 + ~12 trait ≈ 50 knobs. */
export function buildFactionBalanceSchema(faction: FactionId): ParamSchema {
  const factionDef = FACTIONS[faction];
  if (!factionDef) throw new Error(`unknown faction: ${faction}`);

  const schema: ParamSchema = {};
  for (const towerId of factionDef.towerIds) {
    const tower = TOWER_TYPES[towerId];
    if (!tower) continue;

    // Core stats — only emit knobs whose bounds aren't frozen (skip
    // damage=0 towers' damage knob, etc.). Frozen bounds would just
    // bloat the search space without contributing.
    for (const [statName, generator] of Object.entries(CORE_STAT_GENERATORS)) {
      const current = (tower as unknown as Record<string, unknown>)[statName];
      if (typeof current !== 'number') continue;
      const spec = generator(current);
      if (spec.min === spec.max) continue;  // skip frozen knobs
      schema[`${towerId}.${statName}`] = spec;
    }

    // Trait params — only known traits + known params get knobs.
    for (const trait of tower.traits) {
      const paramGens = TRAIT_KNOBS[trait.id];
      if (!paramGens) continue;
      for (const [paramName, generator] of Object.entries(paramGens)) {
        const current = (trait as Record<string, unknown>)[paramName];
        if (typeof current !== 'number') continue;
        const spec = generator(current);
        if (spec.min === spec.max) continue;
        schema[`${towerId}.traits.${trait.id}.${paramName}`] = spec;
      }
    }
  }
  return schema;
}

/** Extract the default-valued params dict from a schema. Useful for
 *  round-trip tests and warm-starting brain-search at "current values". */
export function defaultParamsFor(schema: ParamSchema): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = spec.default;
  }
  return out;
}

/** All faction ids that have at least one tower in TOWER_TYPES.
 *  Convenience for self-balance scripts that iterate every cell. */
export function balanceableFactions(): FactionId[] {
  return (Object.keys(FACTIONS) as FactionId[]).filter(f => {
    const def = FACTIONS[f];
    return def.towerIds.length > 0 && def.towerIds.some(id => TOWER_TYPES[id]);
  });
}
