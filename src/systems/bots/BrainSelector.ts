/**
 * BrainSelector — recommends the best brain id per (faction, difficulty)
 * cell based on brain-coverage matrix results.
 *
 * Production code that needs a brain (Circle Co-op's addBot, the
 * 1v1 versus CPU opponent, the headless harness when a brain isn't
 * specified) can consult this table to get the empirically-best
 * brain for the cell.
 *
 * The recommendations come from `node --import tsx scripts/brain-coverage.mjs`
 * — n=50 normal-difficulty plains. When two brains tie, the cheaper
 * one wins (greedy < aoe_focus < mazing < combo brains in CPU cost).
 *
 * Manually maintained — re-run brain-coverage and re-bake when the
 * brain pool changes or a new winner emerges. v3 results below
 * (untuned combo defaults; brain-search per cell would push some
 * cells higher).
 *
 * Usage:
 *   import { recommendBrain } from './BrainSelector';
 *   const brainId = recommendBrain('cypherpunk', 'normal');
 *   const brain = createBrain(brainId);
 */
import { FactionId } from '../../data/Factions';
import { DifficultyLevel } from '../../data/Difficulty';

/** Best brain id per (faction, difficulty). Lookup table baked from
 *  brain-coverage.mjs n=50 results. When the table doesn't have a
 *  cell, fall back to 'balanced' (the safe default). */
const BRAIN_RECOMMENDATIONS: Record<DifficultyLevel, Partial<Record<FactionId, string>>> = {
  // hard / insane / easy currently fall back to 'balanced'. Rerun
  // brain-coverage on those difficulties to populate.
  easy: {},
  hard: {},
  insane: {},

  // Normal difficulty — populated from the v3 M6 brain-coverage run.
  // Format: { faction: 'brainId' /* score */ }
  normal: {
    arcane:     'greedy',         // 50/50 — pure single-target spam
    mechanical: 'balanced',       // 0/50 across the board — fallback
    nature:     'rush',           // 50/50 — speed-fills wallspots fast
    void:       'greedy',         // 50/50 (5 brains tie at 50; greedy is cheapest)
    military:   'rush',           // 50/50 — squad+rush works perfectly
    aliens:     'mazing',         // 39/50 — only mazing cracks this cell
    cypherpunk: 'greedy_mazing',  // 47/50 — combo wins over aoe_focus 41
    infernal:   'aoe_focus',      // 50/50 (mazing/g+M also 49-50; aoe is cheapest)
    celestial:  'greedy',         // 50/50 — same recipe as arcane
    psionic:    'greedy_mazing',  // 23/50 — combo nearly 2x greedy's 12
    harmonic:   'greedy_mazing',  // 6/50 — best available (still poor)
  },
};

/** Resolve the recommended brain id for a (faction, difficulty) cell.
 *  Falls back to 'balanced' when the cell isn't in the table — keeps
 *  callers from hitting `undefined` when difficulty data is missing. */
export function recommendBrain(faction: FactionId, difficulty: DifficultyLevel): string {
  return BRAIN_RECOMMENDATIONS[difficulty]?.[faction] ?? 'balanced';
}

/** Diagnostic: surface the whole table. Used by a debug UI / docs
 *  generator if we want to render the recommendations programmatically. */
export function getBrainRecommendations(): Readonly<typeof BRAIN_RECOMMENDATIONS> {
  return BRAIN_RECOMMENDATIONS;
}
