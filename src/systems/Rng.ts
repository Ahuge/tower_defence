/**
 * Module-level seeded RNG. Gameplay code that needs randomness
 * calls `rng()` (returns a float in [0, 1), same contract as
 * `Math.random`) instead of `Math.random()` directly — the headless
 * match runner can then call `seedRng(seed)` at match start and
 * get identical outcomes across runs.
 *
 * Default seeding uses `Date.now() ^ performance.now()` so the
 * production game keeps its old "each run is different" feel
 * without any per-site wiring change.
 *
 * The PRNG is mulberry32 — same 32-bit-state algorithm used in
 * `data/MapGenerator.ts` and mirrored in `scenes/GameScene.ts`'s
 * Endless faction roll. Fast, zero allocations per call, and the
 * output distribution is good enough for per-hit jackpot rolls,
 * enemy spawn order, and frontier gamble payouts.
 */
let state = ((Date.now() >>> 0) ^ ((typeof performance !== 'undefined' ? performance.now() : 0) >>> 0)) >>> 0;

/** Re-seed the generator. Headless match runner calls this at
 *  match start with the MatchConfig.seed so every Math.random
 *  equivalent becomes reproducible. */
export function seedRng(seed: number): void {
  state = seed >>> 0;
}

/** Draw the next value in [0, 1). Drop-in replacement for
 *  `Math.random()` — same return contract so call sites just
 *  swap the identifier. */
export function rng(): number {
  state = (state + 0x6D2B79F5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
