/**
 * Search schema for CounterPickWaveDirector — v4.3.
 *
 * Brain-search loop tunes the director's softmax temperature, role-
 * specific bias weights, and reactivity toggle to find the wave-
 * composition strategy that maximises leak rate (defender's lives
 * lost) against a fixed defender.
 *
 * Defaults match `DEFAULT_COUNTER_PICK_PARAMS` so the search starts at
 * the "near-uniform, slight bias" baseline that v4.2a's smoke test
 * already showed produces measurable pressure.
 */
import { ParamSchema } from './BrainSearchManager';

export const COUNTER_PICK_WAVE_DIRECTOR_SCHEMA: ParamSchema = {
  /** Softmax temperature: 0 = argmax (always pick top counter),
   *  large = uniform. Search range explores from sharp counter-pick
   *  through gentle bias to near-uniform. */
  temperature: {
    min: 0.3, max: 5.0, default: 2.0, step: 0.4,
  },
  /** Minimum number of distinct creep types per wave. Anti-monoculture
   *  floor. Integer 1-4. */
  minDiversity: {
    min: 1, max: 4, default: 2, step: 1, integer: true,
  },
  /** Per-role bias weight scalars. 0 = ignore that role's contribution
   *  to counter-pick. 3.0 = aggressively bias creep types that counter
   *  the role. Default 1.0 = the table's listed multipliers apply at
   *  full strength. */
  weightVsWalls:      { min: 0, max: 3.0, default: 1.0, step: 0.3 },
  weightVsDpsSingle:  { min: 0, max: 3.0, default: 1.0, step: 0.3 },
  weightVsDpsSplash:  { min: 0, max: 3.0, default: 1.0, step: 0.3 },
  weightVsSlow:       { min: 0, max: 3.0, default: 1.0, step: 0.3 },
  weightVsAura:       { min: 0, max: 3.0, default: 1.0, step: 0.3 },
  /** Reactivity toggle. When 0 the director ignores observed towers
   *  and serves static waves verbatim. brain-search can disable
   *  reactivity per cell where the bias-table rules don't help (e.g.
   *  factions whose optimal counter isn't in the standard creep pool). */
  enableReactivity:   { min: 0, max: 1, default: 1, step: 1, integer: true },
};
