/**
 * TwoSidedMatch — run two `Match` instances in lockstep on the same
 * shared seed. The two sides are independent in G1 (no sabotage,
 * no cross-communication); with identical brains they produce
 * bit-identical results, with different brains the only divergence
 * is the brain's own decision-making.
 *
 * Why interleave the steps instead of just running them
 * sequentially? Two reasons. First, it forces the RNG save/restore
 * isolation in `Match` to do its job — if either side's RNG
 * progress leaked through the singleton to the other side, the
 * `same-brain → identical outcomes` invariant would fail and the
 * test would catch it. Second, this is the same lockstep shape G6
 * (sabotage) needs: between `step()` calls is exactly where
 * `send_purchased` events will get injected from one side's brain
 * into the other side's `SpawnManager`. Building the harness in
 * that shape now means G6 only adds an event-queue, not a new
 * driver.
 */
import { Match } from './Match';
import { MatchConfig, TwoSidedConfig, TwoSidedResult } from './types';

function matchConfigFor(
  cfg: TwoSidedConfig,
  brainId: string,
): MatchConfig {
  return {
    faction: cfg.faction,
    difficulty: cfg.difficulty,
    mapId: cfg.mapId,
    brainId,
    matchMode: cfg.matchMode,
    waveCount: cfg.waveCount,
    seed: cfg.seed,
    stepMs: cfg.stepMs,
    maxSimMs: cfg.maxSimMs,
    maxWaves: cfg.maxWaves,
  };
}

export async function runTwoSidedMatch(cfg: TwoSidedConfig): Promise<TwoSidedResult> {
  const wallStart = Date.now();
  const matchA = new Match(matchConfigFor(cfg, cfg.brainIdA));
  const matchB = new Match(matchConfigFor(cfg, cfg.brainIdB));

  // Interleaved lockstep — step A, then B, until both finish. Each
  // Match's own RNG save/restore keeps the singleton scoped so the
  // sides don't stomp each other.
  while (!matchA.isDone() || !matchB.isDone()) {
    if (!matchA.isDone()) matchA.step();
    if (!matchB.isDone()) matchB.step();
  }

  return {
    config: cfg,
    sideA: matchA.result(),
    sideB: matchB.result(),
    wallTimeMs: Date.now() - wallStart,
  };
}
