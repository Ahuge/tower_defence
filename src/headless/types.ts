import { FactionId } from '../data/Factions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';

/** Everything needed to spin up a single headless match. Config
 *  objects are serialisable (no object refs) so they travel cleanly
 *  through `worker_threads.postMessage` in the Phase 3 batch runner. */
export interface MatchConfig {
  faction: FactionId;
  difficulty: DifficultyLevel;
  mapId: MapId;
  /** Brain id registered in `BRAIN_REGISTRY` (e.g. 'balanced'). Drives
   *  placements + upgrades + economy decisions on behalf of the
   *  "player". */
  brainId: string;
  /** Match mode — 'standard' or 'endless' for v1. Other modes
   *  (circle_coop, versus, hero_defense, gauntlet) can be added
   *  later; they each have extra setup that's out of scope for the
   *  first balance-testing pass. */
  matchMode: 'standard' | 'endless';
  /** Total waves to play. Ignored for endless — endless runs until
   *  the bot loses or hits `maxWaves` as a safety cap. */
  waveCount?: number;
  /** Seed for the whole sim. Same seed + same config → same
   *  outcome once Phase 2 (RNG threading) is done. */
  seed: number;
  /** Sim step in ms. Lower = closer to 60 Hz fidelity but slower.
   *  Default 32 (~30 FPS). */
  stepMs?: number;
  /** Safety cap to avoid runaway matches. Match aborts as a draw
   *  once sim time exceeds this. Default 30 minutes of sim time. */
  maxSimMs?: number;
  /** Cap on waves simulated even in endless mode. Default 60. */
  maxWaves?: number;
}

/** Config for a two-sided headless match — two `Match` instances
 *  step in lockstep on the same shared seed. Used for self-play
 *  RL training: both sides defend the same mirrored wave list
 *  independently; the only differences across sides are the brains
 *  driving them and (in Phase 2.5+) any sabotage events injected
 *  between sides mid-match.
 *
 *  G1 scope is no-sabotage: A and B run as fully independent
 *  defends on a shared seed. With identical brains the result
 *  must be bit-identical across sides; with different brains the
 *  divergence reflects only the brain's decisions, not any RNG
 *  drift.
 */
export interface TwoSidedConfig {
  faction: FactionId;
  difficulty: DifficultyLevel;
  mapId: MapId;
  matchMode: 'standard';
  waveCount: number;
  /** Shared across both sides — same wave RNG, same trait rolls. */
  seed: number;
  brainIdA: string;
  brainIdB: string;
  stepMs?: number;
  maxSimMs?: number;
  maxWaves?: number;
}

export interface TwoSidedResult {
  config: TwoSidedConfig;
  sideA: MatchResult;
  sideB: MatchResult;
  wallTimeMs: number;
}

/** Per-match telemetry the aggregator consumes. Everything here is
 *  JSON-serialisable so results can be written line-by-line to
 *  `results.jsonl` and read back without custom deserialisers. */
export interface MatchResult {
  config: MatchConfig;
  outcome: 'win' | 'loss' | 'timeout' | 'error';
  waveReached: number;
  livesRemaining: number;
  goldEarned: number;
  goldSpent: number;
  creepsKilled: number;
  towersBuilt: number;
  simTimeMs: number;
  wallTimeMs: number;
  /** Optional error message when `outcome === 'error'`. */
  error?: string;
  /** Hash of the final tower build (sorted multiset of
   *  `${towerId}@L${level}`). Lets the harness diagnose whether two
   *  match results converged on the same build or diverged: if a
   *  patched run has the same `buildHash` as baseline but a moved
   *  win-rate, the change is brain-noise (MCTS roulette / FP-tie
   *  drift); different hash ⇒ the change actually altered placement
   *  decisions, so the win-rate delta carries real signal. */
  buildHash: string;
}
