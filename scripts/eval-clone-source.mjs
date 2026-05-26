#!/usr/bin/env node
/**
 * BC clone-source decision gate — BalancedBrain vs LearningBrain.
 *
 * If `BalancedBrain` is the strongest single brain in the repo, BC
 * should clone it. If `LearningBrain` (the xgboost ensemble over 11
 * sub-brains) dominates significantly, we should consider rebasing
 * off PR #68 (`MazingBrain`) before BC starts — see PRD §11 risk #1
 * and `notes/rl/bc-plan.md` Step 0.
 *
 * Decision rule (from bc-plan.md):
 *   Δ < 15% (Learning roughly equal to Balanced): proceed with BC
 *     cloning BalancedBrain. D2 stays (a).
 *   Δ ≥ 15%: rebase onto PR #68's `ah/feature/brain-mazing-algo`
 *     branch, retarget D2 to clone `MazingBrain` instead.
 *
 *   Δ here = (LearningBrain winRate) − (BalancedBrain winRate),
 *   averaged across {Arcane, Mechanical}.
 *
 * Run:  node scripts/eval-clone-source.mjs
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { expandMatrix, runBatch, aggregate, formatReport } = await import('../src/headless/Batch.ts');

// Side-effect imports so all brains register themselves.
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
await import('../src/systems/bots/brains/RushBrain.ts');
await import('../src/systems/bots/brains/EconBrain.ts');
await import('../src/systems/bots/brains/SynergyBrain.ts');
await import('../src/systems/bots/brains/UltimateBrain.ts');
await import('../src/systems/bots/brains/AOEFocusBrain.ts');
await import('../src/systems/bots/brains/NatureBrain.ts');
await import('../src/systems/bots/brains/HarmonicBrain.ts');
await import('../src/systems/bots/brains/PsionicBrain.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');

const N_SEEDS = 100;
const WAVE_COUNT = 10;

const configs = expandMatrix({
  factions: ['arcane', 'mechanical'],
  difficulties: ['normal'],
  maps: ['plains'],
  brains: ['balanced', 'learning'],
  matchModes: ['standard'],
  seedsPerCell: N_SEEDS,
  baseSeed: 5001,
  waveCount: WAVE_COUNT,
});

console.log(`[eval-clone-source] running ${configs.length} matches (${N_SEEDS} per cell, ${WAVE_COUNT} waves)`);
const t0 = Date.now();
const results = await runBatch(configs, {
  progressEvery: 50,
  onProgress: (done, total) => {
    const dt = Date.now() - t0;
    const rate = done / (dt / 1000);
    const eta = ((total - done) / rate).toFixed(0);
    console.log(`  ${done}/${total}  (${rate.toFixed(1)} matches/s, ETA ${eta}s)`);
  },
});
console.log(`[eval-clone-source] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const stats = aggregate(results);
console.log('\n' + formatReport(stats));

// Per-faction delta extraction.
function winRateFor(brain, faction) {
  const s = stats.find(
    s => s.key === `${faction}|normal|plains|${brain}|standard`
  );
  return s ? s.winRate : NaN;
}

const arcaneBal = winRateFor('balanced', 'arcane');
const arcaneLrn = winRateFor('learning', 'arcane');
const mechBal = winRateFor('balanced', 'mechanical');
const mechLrn = winRateFor('learning', 'mechanical');
const arcaneDelta = arcaneLrn - arcaneBal;
const mechDelta = mechLrn - mechBal;
const meanDelta = (arcaneDelta + mechDelta) / 2;

console.log('\n=== Decision gate ===');
console.log(`arcane:      balanced=${(arcaneBal * 100).toFixed(1)}%  learning=${(arcaneLrn * 100).toFixed(1)}%  Δ=${(arcaneDelta * 100).toFixed(1)}%`);
console.log(`mechanical:  balanced=${(mechBal * 100).toFixed(1)}%  learning=${(mechLrn * 100).toFixed(1)}%  Δ=${(mechDelta * 100).toFixed(1)}%`);
console.log(`mean Δ:      ${(meanDelta * 100).toFixed(1)}%`);

const VERDICT_THRESHOLD = 0.15;
if (Math.abs(meanDelta) < VERDICT_THRESHOLD) {
  console.log(`\nVerdict: Δ < ${VERDICT_THRESHOLD * 100}% — proceed with BC cloning BalancedBrain (D2=a).`);
} else if (meanDelta >= VERDICT_THRESHOLD) {
  console.log(`\nVerdict: LearningBrain dominates by ≥${VERDICT_THRESHOLD * 100}% — REBASE onto PR #68's MazingBrain branch and retarget D2 to clone MazingBrain.`);
} else {
  console.log(`\nVerdict: BalancedBrain dominates by ≥${VERDICT_THRESHOLD * 100}% — LearningBrain is unexpectedly weak. Investigate model file before BC.`);
}
