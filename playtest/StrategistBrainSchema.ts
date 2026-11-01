/**
 * Search schema for StrategistBrain — bounds, defaults, and step
 * sizes for every knob the ES may tune. Mirrors the convention in
 * src/headless/brain-search/*Schema.ts so the existing
 * BrainSearchManager can drive it unchanged.
 */
import type { ParamSchema } from '../src/headless/brain-search/BrainSearchManager.ts';

export const STRATEGIST_BRAIN_SCHEMA: ParamSchema = {
  mazeTowers:        { min: 0, max: 10, default: 4, step: 1, integer: true },
  slowByWave:        { min: 0, max: 4, default: 0, step: 1, integer: true },
  aoeByWave:         { min: 2, max: 8, default: 4, step: 1, integer: true },
  sniperByWave:      { min: 4, max: 12, default: 6, step: 1, integer: true },
  secondSlowByWave:  { min: 5, max: 14, default: 8, step: 1, integer: true },
  burstByWave:       { min: 8, max: 18, default: 12, step: 1, integer: true },
  expandFirst:       { min: 4, max: 16, default: 10, step: 1, integer: true },
  maxCheap:          { min: 4, max: 40, default: 8, step: 2, integer: true },
  panicLives:        { min: 5, max: 16, default: 13, step: 1, integer: true },
  ultTowers:         { min: 3, max: 12, default: 6, step: 1, integer: true },
  ultLives:          { min: 10, max: 20, default: 15, step: 2, integer: true },
  ultSaveByWave:     { min: 10, max: 20, default: 16, step: 1, integer: true },
  upgradeReserve:    { min: 0, max: 120, default: 40, step: 10, integer: true },
  expensiveBias:     { min: 0, max: 1, default: 0.3, step: 0.15 },
  linkerPairs:       { min: 0, max: 4, default: 2, step: 1, integer: true },
  aaEnabled:         { min: 0, max: 1, default: 1, step: 1, integer: true },
  buffZone:          { min: 0, max: 1, default: 1, step: 1, integer: true },
  sniperUpgFirst:    { min: 0, max: 1, default: 0, step: 1, integer: true },
  supportByWave:     { min: 0, max: 10, default: 5, step: 1, integer: true },
  maxSupport:        { min: 1, max: 4, default: 2, step: 1, integer: true },
  harmonicResonators: { min: 2, max: 8, default: 4, step: 1, integer: true },
  harmonicAuras:     { min: 6, max: 20, default: 12, step: 2, integer: true },
};
