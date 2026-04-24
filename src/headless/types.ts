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
}
