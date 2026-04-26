/**
 * LearningBrain — the action-value-regression brain.
 *
 * On each decide() turn:
 *   1. Compute state features from BotContext.
 *   2. Ask each sub-brain (the 8 existing default brains) for its
 *      preferred decision. Deduplicate proposals with identical
 *      decision shapes.
 *   3. Score each proposal: predict P(win) given (stateFeatures,
 *      actionFeaturesOf(decision)).
 *   4. Return the argmax-Q decision.
 *
 * The model is a gradient-boosted-tree classifier trained offline
 * via ml/train.py. Loaded once from a committed JSON file at
 * construction. If the model file is missing or invalid, falls back
 * to BalancedBrain so the game still works in dev environments
 * without a trained model present.
 */
import { BotBrain, BotContext, BotDecision, registerBrain, BRAIN_REGISTRY } from '../BotBrain';
import { extractStateFeatures, extractActionFeatures } from '../learning/FeatureExtractor';
import { CompiledModel, compileModel, predict } from '../learning/TreeInference';

// The model file is produced by ml/train.py and committed alongside
// the brain. Loaded synchronously the first time a LearningBrain
// init()s, then cached. Loaded via require() in Node (harness
// pathway) or fetch() in the browser (gameplay pathway). Missing-
// file is handled gracefully — falls back to BalancedBrain.
let MODEL: CompiledModel | null = null;
let MODEL_LOAD_ATTEMPTED = false;

function loadModelSync(): CompiledModel | null {
  if (MODEL_LOAD_ATTEMPTED) return MODEL;
  MODEL_LOAD_ATTEMPTED = true;
  // Node side (headless harness, training-data, validation runs).
  // The browser bundle path is set up via Vite's JSON import in a
  // separate code path — we'll wire that when the model is committed.
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const fs = require('node:fs') as typeof import('node:fs');
      const path = require('node:path') as typeof import('node:path');
      const cwd = process.cwd();
      const candidates = [
        path.resolve(cwd, 'models/brain-q-model.json'),
        path.resolve(cwd, '../models/brain-q-model.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          MODEL = compileModel(raw);
          return MODEL;
        }
      }
    }
  } catch {
    // Any load failure → fallback. Brain stays usable.
  }
  return null;
}

// Sub-brain ids consulted as proposers each turn. Deliberately
// excludes 'learning' (would loop) and 'dumb' (no useful proposals).
// We also include the specialised brains so when their faction is
// active they contribute their composition wisdom.
const PROPOSER_IDS = [
  'balanced', 'greedy', 'rush', 'econ', 'synergy',
  'ultimate', 'aoe_focus', 'nature', 'harmonic', 'psionic',
];

export class LearningBrain implements BotBrain {
  readonly name = 'Learning';
  private proposers: BotBrain[] = [];
  private fallback: BotBrain | null = null;
  private modelReady = false;

  init(ctx: BotContext): void {
    // Spin up one fresh instance of each proposer brain. They share
    // ctx but maintain their own internal state across turns.
    this.proposers = [];
    for (const id of PROPOSER_IDS) {
      const factory = BRAIN_REGISTRY[id];
      if (!factory) continue;
      const brain = factory();
      brain.init?.(ctx);
      this.proposers.push(brain);
    }
    // Fallback is BalancedBrain — used when the model failed to load.
    const balancedFactory = BRAIN_REGISTRY['balanced'];
    if (balancedFactory) {
      this.fallback = balancedFactory();
      this.fallback.init?.(ctx);
    }
    // Synchronous load — file is small (~50KB), only done once.
    const m = loadModelSync();
    this.modelReady = !!m;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.modelReady || !MODEL) {
      // Pre-load fallback. Once the model has loaded later in the
      // match, subsequent decide() calls switch to learned scoring.
      return this.fallback?.decide(ctx) ?? { kind: 'skip' };
    }

    // Gather proposals.
    const proposals: { brainName: string; decision: BotDecision }[] = [];
    for (const p of this.proposers) {
      try {
        proposals.push({ brainName: p.name, decision: p.decide(ctx) });
      } catch {
        // Sub-brain crashed — skip it. Don't let one buggy brain
        // poison the whole turn.
      }
    }
    if (proposals.length === 0) return { kind: 'skip' };

    // Deduplicate by decision shape — two proposers placing the
    // same tower at the same cell are identical actions.
    const seen = new Map<string, { brainName: string; decision: BotDecision }>();
    for (const p of proposals) {
      const k = decisionKey(p.decision);
      if (!seen.has(k)) seen.set(k, p);
    }

    // Score each unique proposal.
    const stateF = extractStateFeatures(ctx);
    let bestQ = -Infinity;
    let bestDecision: BotDecision = { kind: 'skip' };
    for (const { decision } of seen.values()) {
      const actionF = extractActionFeatures(ctx, decision);
      const features = [...stateF, ...actionF];
      // Defensive: if feature shape mismatches model, model is stale.
      if (features.length !== MODEL.totalDim) {
        return this.fallback?.decide(ctx) ?? { kind: 'skip' };
      }
      const q = predict(features, MODEL);
      if (q > bestQ) { bestQ = q; bestDecision = decision; }
    }
    return bestDecision;
  }
}

/** Stable key for a BotDecision so duplicates can be dropped. */
function decisionKey(d: BotDecision): string {
  switch (d.kind) {
    case 'place':    return `place:${d.col},${d.row},${d.type.id}`;
    case 'upgrade':  return `upgrade:${d.col},${d.row},${d.branch ?? ''}`;
    case 'sell':     return `sell:${d.col},${d.row}`;
    case 'send':     return `send:${d.sendOptionId}`;
    case 'frontier': return `frontier:${d.buildingId}`;
    case 'skip':     return 'skip';
  }
}

registerBrain('learning', () => new LearningBrain());
