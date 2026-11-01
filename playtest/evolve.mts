/**
 * evolve.mts — per-faction convergence for StrategistBrain.
 *
 * Reuses the repo's BrainSearchManager (μ+λ ES, plateau/drift
 * detection, composite fitness) with a new evaluator: StrategistBrain
 * constructed directly from the candidate params (no env-var
 * plumbing — brainOverride path).
 *
 * Persistence mirrors scripts/brain-search.mjs:
 *   playtest/evolved/<faction>/evaluations.jsonl  (append-only, resumable)
 *   playtest/evolved/<faction>/summary.json
 *
 * Usage:
 *   node --import tsx playtest/evolve.mts --faction=cypherpunk [--max-evals=60]
 *     [--search-seeds=12] [--validate-seeds=50] [--mu=2] [--lambda=8] [--base-seed=5000]
 */
import { writeFileSync, mkdirSync, existsSync, appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

await import('../src/headless/harness/jsdom-setup.ts');
const uw = <T>(m: unknown): T => (m as { default?: T }).default ?? (m as T);
const { BrainSearchManager } = uw<{ BrainSearchManager: new (...a: never[]) => Evolver }>(
  await import('../src/headless/brain-search/BrainSearchManager.ts'));
const { StrategistBrain } = uw<{ StrategistBrain: new (p?: Record<string, number>) => Brain }>(
  await import('./StrategistBrain.ts'));
const { STRATEGIST_BRAIN_SCHEMA } = uw<{ STRATEGIST_BRAIN_SCHEMA: object }>(
  await import('./StrategistBrainSchema.ts'));
const { runMatch } = uw<{ runMatch: (c: object, b?: unknown) => Promise<Match> }>(
  await import('../src/headless/HeadlessMatch.ts'));

type Evolver = {
  shouldContinue(): { continue: boolean; reason: string };
  generateNextBatch(): Record<string, number>[];
  recordEval(r: object): void;
  loadHistory(rs: object[]): void;
  readonly bestSoFar: { score: number; avgWave: number; params: Record<string, number> } | null;
  readonly evalCount: number;
};
type Brain = { name: string };
type Match = { outcome: string; waveReached: number };

const argv = process.argv.slice(2);
const flag = (name: string, def: string): string => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return def;
  return m.includes('=') ? m.split('=').slice(1).join('=') : def;
};

const faction = flag('faction', 'cypherpunk');
const maxEvals = parseInt(flag('max-evals', '60'), 10);
const searchSeeds = parseInt(flag('search-seeds', '12'), 10);
const validateSeeds = parseInt(flag('validate-seeds', '50'), 10);
const mu = parseInt(flag('mu', '2'), 10);
const lambda = parseInt(flag('lambda', '8'), 10);
const baseSeed = parseInt(flag('base-seed', '5000'), 10);

const runDir = join('playtest', 'evolved', faction);
mkdirSync(runDir, { recursive: true });
const evalLogPath = join(runDir, 'evaluations.jsonl');

const manager = new BrainSearchManager(STRATEGIST_BRAIN_SCHEMA, {
  mu, lambda, maxEvals, searchSeeds, validateSeeds,
  autoValidateThreshold: 0.8,
  perfectScoreThreshold: 0.98,
  hardPlateauEvals: 40,
});

let evalId = 1;
if (existsSync(evalLogPath)) {
  const recs = readFileSync(evalLogPath, 'utf8').split('\n')
    .filter(l => l.trim()).map(l => JSON.parse(l));
  manager.loadHistory(recs);
  evalId = recs.length + 1;
  console.log(`resumed ${faction}: ${recs.length} evals replayed`);
}

const seedFor = (id: number, s: number): number => (baseSeed * 31 + id * 7919 + s * 104729) >>> 0;

async function evalParams(
  params: Record<string, number>, n: number, tag: string,
): Promise<{ score: number; avgWave: number }> {
  let wins = 0, waveSum = 0;
  const id = evalId; // seeds derive from the eval id for determinism
  for (let s = 0; s < n; s++) {
    const r = await runMatch({
      faction, difficulty: 'normal', mapId: 'plains', brainId: 'strategist',
      matchMode: 'standard', waveCount: 20, seed: seedFor(id, s),
    }, new StrategistBrain(params));
    if (r.outcome === 'win') wins++;
    waveSum += r.waveReached;
  }
  return { score: wins / n, avgWave: waveSum / n };
}

function record(params: Record<string, number>, score: number, avgWave: number, n: number, tag: string): void {
  const rec = { evalId: evalId++, ts: Date.now(), params, score, avgWave, n, tag };
  appendFileSync(evalLogPath, JSON.stringify(rec) + '\n');
  manager.recordEval(rec);
}

console.log(`evolve ${faction}: maxEvals=${maxEvals} searchSeeds=${searchSeeds} mu=${mu} lambda=${lambda}`);
const t0 = Date.now();
for (;;) {
  const cont = manager.shouldContinue();
  if (!cont.continue) { console.log(`stop: ${cont.reason}`); break; }
  const batch = manager.generateNextBatch();
  for (const params of batch) {
    const { score, avgWave } = await evalParams(params, searchSeeds, 'search');
    record(params, score, avgWave, searchSeeds, 'search');
    const best = manager.bestSoFar;
    console.log(
      `eval ${evalId - 1} score=${(score * 100).toFixed(0)}% avgWave=${avgWave.toFixed(1)} ` +
      `best=${best ? (best.score * 100).toFixed(0) + '% w' + best.avgWave.toFixed(1) : '-'}`,
    );
    if (score >= 0.8) {
      const v = await evalParams(params, validateSeeds, 'validate');
      record(params, v.score, v.avgWave, validateSeeds, 'validate');
      console.log(`  validate: ${(v.score * 100).toFixed(0)}% avgWave=${v.avgWave.toFixed(1)}`);
    }
  }
}

const best = manager.bestSoFar;
writeFileSync(join(runDir, 'summary.json'), JSON.stringify({
  faction, best, evals: evalId - 1,
  wallMs: Date.now() - t0,
}, null, 2));
console.log(`\ndone in ${(((Date.now() - t0) / 60000)).toFixed(1)}m. best:`, JSON.stringify(best, null, 2));
