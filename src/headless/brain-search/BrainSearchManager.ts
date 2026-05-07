/**
 * BrainSearchManager — owns the (μ+λ) evolution-strategy loop for
 * tuning a single brain on a single (faction, difficulty) cell.
 *
 * Contract:
 *   - One manager instance per search.
 *   - Persistence is append-only to `evaluations.jsonl` — every eval
 *     is durable before the manager moves on. State is derived on
 *     resume by replaying the log; no separate state.json.
 *   - Termination is checked before each batch (`shouldContinue`).
 *     The runner can also flag `forceStop = true` if it gets a
 *     fatal error.
 *
 * The manager is intentionally agnostic about WHAT runs the
 * evaluation — the runner passes results back via `recordEval`. This
 * keeps the core ES logic testable without spinning up matches.
 */

export type BrainParams = Record<string, number>;

export interface ParamSpec {
  /** Lower bound (inclusive). */
  min: number;
  /** Upper bound (inclusive). */
  max: number;
  /** Default value (also the "centre" the initial population is
   *  perturbed from). */
  default: number;
  /** Mutation step size — Gaussian σ in raw units. Tuned per
   *  parameter so binary flags don't drift like continuous knobs. */
  step: number;
  /** Snap to integer after sampling (for things like wave counts). */
  integer?: boolean;
}

export type ParamSchema = Record<string, ParamSpec>;

export interface EvalRecord {
  /** Monotonically increasing eval id, 1-indexed. */
  evalId: number;
  ts: number;
  params: BrainParams;
  /** Fraction of seeds that won (0..1). */
  score: number;
  /** Average wave reached — secondary signal when scores tie. */
  avgWave: number;
  /** Number of seeds in this eval (for binomial-CI calculations). */
  n: number;
  /** Average normalised Shannon-entropy of tower-id placement
   *  distribution across the eval's seeds. 0 = monoculture (every
   *  seed placed only one tower id), 1 = perfectly uniform across
   *  the towers it placed. Combined into fitness via diversityWeight
   *  to let brain-search trade off win-rate against tower variety
   *  (the v3.4 M3 lever for "play feels right when all 5 towers see
   *  use"). May be 0 if no towers were placed. */
  diversity?: number;
  /** Optional tag — `'search'`, `'validate'`, `'manual'` etc.
   *  Lets us reconstruct which evals were tight-CI validations vs.
   *  loose-CI search rolls when reading back the log. */
  tag?: string;
  /** Free-form notes — useful for manual probes. */
  note?: string;
}

export interface ManagerConfig {
  /** Population (μ) — number of "parents" kept between generations. */
  mu: number;
  /** Offspring (λ) — number of children spawned per generation. */
  lambda: number;
  /** Hard budget in evaluations (search evals; validations don't count). */
  maxEvals: number;
  /** Seeds per search-time eval (loose CI, fast). */
  searchSeeds: number;
  /** Seeds per validation eval (tight CI, slow). */
  validateSeeds: number;
  /** Score threshold above which the manager re-runs at validate
   *  seeds inline before accepting it as bestSoFar. Avoids false
   *  termination from a lucky n=20 roll. */
  autoValidateThreshold: number;
  /** Score above which we consider the search "done" (validated). */
  perfectScoreThreshold: number;
  /** Hard plateau: stop after N evals without any improvement. */
  hardPlateauEvals: number;
  /** Soft plateau: if mean(last W) - mean(prev W) < softPlateauDelta,
   *  warn → extend by W → if still no movement, stop. */
  softPlateauWindow: number;
  softPlateauDelta: number;
  /** Drift detection: stop if mean(last 20) drops by ≥ this much
   *  vs. mean(prev 20). Catches search wandering away from the
   *  optimum due to noise. */
  driftThreshold: number;
  /** Weight of the placement-diversity term in fitness. 0 = pure
   *  win-rate optimisation (legacy v3.2 behaviour). >0 = trade win
   *  rate for tower variety. At 0.05, two configs with the same win
   *  rate prefer the one with higher Shannon entropy of tower-id
   *  distribution; ties get broken toward variety. At 0.1, a 90%
   *  win-rate config with full variety can beat a 95% win-rate
   *  config with monoculture. brain-search CLI: --diversity-weight=N. */
  diversityWeight: number;
}

export const DEFAULT_MANAGER_CONFIG: ManagerConfig = {
  mu: 2,
  lambda: 8,
  maxEvals: 500,
  searchSeeds: 20,
  validateSeeds: 100,
  autoValidateThreshold: 0.85,
  perfectScoreThreshold: 0.98,
  hardPlateauEvals: 50,
  softPlateauWindow: 30,
  softPlateauDelta: 0.01,
  driftThreshold: 0.05,
  // Default 0 — pure win-rate optimisation (legacy v3.2 behaviour).
  // Override via brain-search CLI flag --diversity-weight=N when running
  // a "show me variety even at win-rate cost" search.
  diversityWeight: 0,
};

export interface ContinueResult {
  continue: boolean;
  reason: string;
}

export class BrainSearchManager {
  readonly schema: ParamSchema;
  readonly cfg: ManagerConfig;
  /** Full chronological eval history. */
  private evals: EvalRecord[] = [];
  /** Best validated record so far (bestOfHistory may be unvalidated). */
  private bestValidated: EvalRecord | null = null;
  /** Best raw record so far — may be a noisy n=searchSeeds win. */
  private bestRaw: EvalRecord | null = null;
  /** μ parents for the next generation. Sorted desc by score. */
  private parents: EvalRecord[] = [];
  /** Soft plateau bookkeeping — tracks how many evals since the
   *  last detected improvement. */
  private evalsSinceImprovement = 0;
  private softPlateauExtended = false;

  constructor(schema: ParamSchema, cfg: Partial<ManagerConfig> = {}) {
    this.schema = schema;
    this.cfg = { ...DEFAULT_MANAGER_CONFIG, ...cfg };
  }

  /** Restore state by replaying a list of eval records. Pass the
   *  parsed contents of evaluations.jsonl. */
  loadHistory(records: EvalRecord[]): void {
    this.evals = [];
    this.bestRaw = null;
    this.bestValidated = null;
    this.evalsSinceImprovement = 0;
    this.softPlateauExtended = false;
    for (const r of records) this.absorb(r);
    this.refreshParents();
  }

  /** Accept a new evaluation. The runner is responsible for the
   *  jsonl append — this method just updates in-memory state. */
  recordEval(r: EvalRecord): void {
    this.absorb(r);
    this.refreshParents();
  }

  private absorb(r: EvalRecord): void {
    this.evals.push(r);
    const isValidate = r.tag === 'validate' || r.n >= this.cfg.validateSeeds;
    // Survival-depth fitness fallback: when no eval has scored a
    // single win yet, fall back to avgWave/100 as the secondary
    // signal. Compounded with score so once any win lands, win rate
    // dominates again. Picks up the "all-zero plateau" case where
    // raw win-rate has no gradient to climb.
    const fitness = (e: EvalRecord) => fitnessOf(e, this.cfg.diversityWeight);
    const newFit = fitness(r);
    if (!this.bestRaw || newFit > fitness(this.bestRaw)) {
      this.bestRaw = r;
      this.evalsSinceImprovement = 0;
    } else {
      this.evalsSinceImprovement++;
    }
    if (isValidate && (!this.bestValidated || r.score > this.bestValidated.score)) {
      this.bestValidated = r;
    }
  }

  /** Recompute μ parents — top-μ by fitness, search-tag evals only.
   *  Validation evals are recorded but don't enter the breeding pool
   *  (they'd dominate via tighter variance, distorting the search). */
  private refreshParents(): void {
    const searchEvals = this.evals.filter(e => e.tag !== 'validate');
    const sorted = [...searchEvals].sort((a, b) => fitnessOf(b, this.cfg.diversityWeight) - fitnessOf(a, this.cfg.diversityWeight));
    this.parents = sorted.slice(0, this.cfg.mu);
  }

  /** Determine whether to continue or stop. Stable to call before
   *  every batch. Returns a structured reason for logging. */
  shouldContinue(): ContinueResult {
    const searchEvals = this.evals.filter(e => e.tag !== 'validate');
    if (searchEvals.length >= this.cfg.maxEvals) {
      return { continue: false, reason: `budget hit (${searchEvals.length}/${this.cfg.maxEvals})` };
    }
    if (this.bestValidated && this.bestValidated.score >= this.cfg.perfectScoreThreshold) {
      return { continue: false, reason: `perfect score validated (${(this.bestValidated.score * 100).toFixed(1)}%)` };
    }
    if (this.evalsSinceImprovement >= this.cfg.hardPlateauEvals) {
      return { continue: false, reason: `hard plateau (${this.evalsSinceImprovement} evals since improvement)` };
    }
    // Soft plateau check — only if we've collected enough samples.
    // Uses window MAX rather than mean: when wins are rare (e.g. 1 in
    // 30 evals at 5%) the mean barely moves but the max does, and we
    // do want to keep mutating in that direction. Fitness is the
    // composite score-plus-survival from fitnessOf().
    if (searchEvals.length >= this.cfg.softPlateauWindow * 2) {
      const recent = searchEvals.slice(-this.cfg.softPlateauWindow);
      const prior = searchEvals.slice(-this.cfg.softPlateauWindow * 2, -this.cfg.softPlateauWindow);
      const recentMax = Math.max(...recent.map(fitnessOf));
      const priorMax = Math.max(...prior.map(fitnessOf));
      if (recentMax - priorMax < this.cfg.softPlateauDelta) {
        if (this.softPlateauExtended) {
          return { continue: false, reason: `soft plateau confirmed (Δmax=${(recentMax - priorMax).toFixed(3)})` };
        }
        this.softPlateauExtended = true;
        // Warning still continues — signal it to the caller.
      } else {
        this.softPlateauExtended = false;
      }
    }
    // Drift check — last 20 vs. prior 20. Same window-max convention
    // so we don't false-trigger when the mean drops because one
    // batch happened to be unlucky.
    if (searchEvals.length >= 40) {
      const last20 = searchEvals.slice(-20);
      const prev20 = searchEvals.slice(-40, -20);
      const drop = Math.max(...prev20.map(fitnessOf)) - Math.max(...last20.map(fitnessOf));
      if (drop >= this.cfg.driftThreshold) {
        return { continue: false, reason: `search drift (max dropped ${drop.toFixed(3)} over last 20)` };
      }
    }
    return { continue: true, reason: 'ok' };
  }

  /** Generate the next batch of params to evaluate. Mutates each
   *  parent with Gaussian noise; if there are fewer than μ parents
   *  yet (early generations), seeds with random samples from the
   *  schema bounds. */
  generateNextBatch(): BrainParams[] {
    const batch: BrainParams[] = [];
    if (this.parents.length === 0) {
      // First generation — start with the default + (λ - 1) random
      // perturbations of it. Including the default guarantees at
      // least one "well-known" config in the population.
      batch.push(this.defaultsParams());
      for (let i = 1; i < this.cfg.lambda; i++) {
        batch.push(this.mutate(this.defaultsParams(), 1.0));
      }
      return batch;
    }
    // Standard generation — μ parents each spawn ⌈λ/μ⌉ children.
    const perParent = Math.ceil(this.cfg.lambda / this.parents.length);
    for (const parent of this.parents) {
      for (let i = 0; i < perParent && batch.length < this.cfg.lambda; i++) {
        batch.push(this.mutate(parent.params, 1.0));
      }
    }
    return batch;
  }

  /** Deterministic clone of the schema defaults. */
  defaultsParams(): BrainParams {
    const out: BrainParams = {};
    for (const [k, spec] of Object.entries(this.schema)) out[k] = spec.default;
    return out;
  }

  /** Apply Gaussian mutation: each param gets shifted by N(0, step×scale)
   *  and clamped to [min, max]. With 0.5 probability each param is
   *  left untouched (sparse mutation — keeps changes localised so the
   *  ES doesn't randomly resample the whole genome each step). */
  private mutate(parent: BrainParams, scale: number): BrainParams {
    const child: BrainParams = { ...parent };
    let mutatedAtLeastOne = false;
    for (const [k, spec] of Object.entries(this.schema)) {
      if (Math.random() < 0.5) continue;
      mutatedAtLeastOne = true;
      let v = (child[k] ?? spec.default) + gaussian() * spec.step * scale;
      if (spec.integer) v = Math.round(v);
      v = Math.max(spec.min, Math.min(spec.max, v));
      child[k] = v;
    }
    // Safety: at least one param must change so we don't re-test
    // the exact same config and waste an eval.
    if (!mutatedAtLeastOne) {
      const keys = Object.keys(this.schema);
      const k = keys[Math.floor(Math.random() * keys.length)];
      const spec = this.schema[k];
      let v = (child[k] ?? spec.default) + gaussian() * spec.step * scale;
      if (spec.integer) v = Math.round(v);
      v = Math.max(spec.min, Math.min(spec.max, v));
      child[k] = v;
    }
    return child;
  }

  // Read-only accessors for the dashboard / runner.
  get history(): EvalRecord[] { return this.evals; }
  get currentParents(): EvalRecord[] { return [...this.parents]; }
  get bestSoFar(): EvalRecord | null { return this.bestValidated ?? this.bestRaw; }
  get bestUnvalidated(): EvalRecord | null { return this.bestRaw; }
  get bestValidatedRecord(): EvalRecord | null { return this.bestValidated; }
  get isInSoftPlateauWarning(): boolean { return this.softPlateauExtended; }
  get evalCount(): number { return this.evals.filter(e => e.tag !== 'validate').length; }
  get validationCount(): number { return this.evals.filter(e => e.tag === 'validate').length; }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Composite fitness: win rate dominates, but `avgWave` provides a
 *  tiny tiebreaker that matters only when scores tie. Surfaces the
 *  "no wins anywhere" case — a config that survives to wave 16 is
 *  preferred over one that dies at wave 4 even when both are 0%.
 *  Once any win lands, the win-rate term (≥0.05 per win at n=20)
 *  swamps the wave term (≤0.20 even at max survival), so the
 *  rankings naturally swap back to win-rate-dominated.
 *
 *  v3.4 M3: optional `diversityWeight` adds a Shannon-entropy term
 *  on tower-id placements. Default 0 keeps legacy behaviour. Set via
 *  `--diversity-weight=N` to trade win rate for tower variety. */
function fitnessOf(e: { score: number; avgWave: number; diversity?: number }, diversityWeight = 0): number {
  const waveBonus = (e.avgWave ?? 0) / 100; // wave 20 → +0.20
  const diversityBonus = diversityWeight * (e.diversity ?? 0);
  return e.score + waveBonus + diversityBonus;
}

/** Box-Muller transform — standard normal, mean 0, σ 1. */
function gaussian(): number {
  const u = Math.max(1e-10, Math.random());
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
