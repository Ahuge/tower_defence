/**
 * HeadlessMatch — entry point for running one full game-match in
 * process, with no Phaser rendering and no UI. Same system layer
 * `GameScene` drives (Grid, SpawnManager, TowerManager,
 * CreepManager, WaveController, EconomyManager, FrontierManager)
 * but replaces the scene with a stub and the human player with a
 * `BotBrain`.
 *
 * The actual game-loop implementation lives in `Match.ts` as a
 * class with `step()` / `isDone()` / `result()` so external callers
 * (e.g. `TwoSidedMatch`, future PPO rollout harnesses) can drive
 * the sim tick-by-tick. This file keeps the historical
 * `runMatch(config, brainOverride?)` shape — used by `Batch`,
 * `brain-search-worker`, and the determinism snapshot test — as a
 * thin wrapper around `Match.runToEnd()`.
 *
 * Scope: standard + endless modes only for v1. Circle Co-op /
 * Versus / Hero Defense need extra setup (opponent sim, arena,
 * shared-economy routing) and are intentionally deferred.
 */
import { BotBrain } from '../systems/bots/BotBrain';
import { Match } from './Match';
import { MatchConfig, MatchResult } from './types';

export async function runMatch(
  config: MatchConfig,
  brainOverride?: BotBrain | null,
): Promise<MatchResult> {
  const match = new Match(config, brainOverride ?? null);
  return match.runToEnd();
}

// Re-export the class for callers that want tick-level control.
export { Match } from './Match';
