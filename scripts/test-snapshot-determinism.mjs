/**
 * Determinism test for Match.snapshot() / Match.restoreFromSnapshot().
 *
 * Procedure:
 *   1. Start match M1 with seed S.
 *   2. Step M1 until between-wave at wave W.
 *   3. snapshot = M1.snapshot()
 *   4. Continue M1 to end (this becomes the "reference").
 *   5. M2 = Match.restoreFromSnapshot(config, snapshot)
 *   6. Continue M2 to end.
 *   7. Compare results: outcome, waveReached, lives, towers, buildHash.
 *
 * If M1.result() == M2.result() → snapshot/restore is deterministic.
 * If not → there's hidden state we're not capturing.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');

// No-op brain: always returns skip. Eliminates brain state as a
// source of non-determinism in the snapshot test — we're testing
// whether GAME state is captured correctly, not whether the brain
// reconstructs.
class NoopBrain {
  constructor() { this.name = 'noop'; }
  init() {}
  decide() { return { kind: 'skip' }; }
}

const SEEDS = [7777, 14000, 47919, 9999];

let totalChecks = 0;
let passes = 0;

for (const seed of SEEDS) {
  console.log(`\n=== seed=${seed} ===`);
  const config = {
    faction: 'arcane',
    difficulty: 'normal',
    mapId: 'plains',
    brainId: 'placeholder',
    matchMode: 'standard',
    waveCount: 25,
    seed,
  };

  // Pass 1: get to between-wave at target wave with BalancedBrain
  // playing (placing real towers), then SNAPSHOT, then continue
  // both m1 (orig) and m2 (restored) with NO-OP brain (just skips).
  // If GAME STATE is correctly snapshotted, both should produce
  // identical outcomes since no brain decisions differ.
  for (const snapAtWave of [3, 5, 10, 15]) {
    totalChecks++;
    const m1 = new Match(config, new BalancedBrain());
    while (!m1.isDone() && (m1.result().waveReached < snapAtWave)) m1.step();
    let safety = 0;
    while (!m1.isDone() && safety++ < 5000) {
      const ctx = m1.observe();
      if (ctx.betweenWaves) break;
      m1.step();
    }
    if (m1.isDone()) {
      console.log(`  w${snapAtWave}: match ended before reaching between-wave — skipping`);
      continue;
    }

    let snap;
    try {
      snap = m1.snapshot();
    } catch (e) {
      console.log(`  w${snapAtWave}: snapshot() threw: ${e.message}`);
      continue;
    }

    // Restore m2 with NO-OP brain. Continue m1 by REPLACING its
    // brain with a no-op so any further decisions don't differ
    // due to brain state. Both should now diverge ONLY if game
    // state differs.
    const m2 = Match.restoreFromSnapshot(config, snap, new NoopBrain());
    // Replace m1's brain (hack — set private field).
    m1.brain = new NoopBrain();
    while (!m1.isDone()) m1.step();
    const m1Result = m1.result();
    while (!m2.isDone()) m2.step();
    const m2Result = m2.result();

    const matches =
      m1Result.outcome === m2Result.outcome &&
      m1Result.waveReached === m2Result.waveReached &&
      m1Result.livesRemaining === m2Result.livesRemaining &&
      m1Result.towersBuilt === m2Result.towersBuilt &&
      m1Result.buildHash === m2Result.buildHash;
    if (matches) {
      passes++;
      console.log(`  w${snapAtWave}: ✓ MATCH  outcome=${m1Result.outcome} wave=${m1Result.waveReached} lives=${m1Result.livesRemaining}`);
    } else {
      console.log(`  w${snapAtWave}: ✗ MISMATCH`);
      console.log(`    m1: outcome=${m1Result.outcome} wave=${m1Result.waveReached} lives=${m1Result.livesRemaining} towers=${m1Result.towersBuilt} hash=${m1Result.buildHash.slice(0,8)}`);
      console.log(`    m2: outcome=${m2Result.outcome} wave=${m2Result.waveReached} lives=${m2Result.livesRemaining} towers=${m2Result.towersBuilt} hash=${m2Result.buildHash.slice(0,8)}`);
    }
  }
}

console.log(`\n=== TOTAL: ${passes}/${totalChecks} snapshot/restore round-trips match ===`);
process.exit(passes === totalChecks ? 0 : 1);
