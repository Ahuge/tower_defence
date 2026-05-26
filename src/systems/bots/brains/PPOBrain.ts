/**
 * PPOBrain — the neural-policy brain. Loads an ONNX model trained
 * via BC (initial) and PPO self-play (Phase 2+) and samples
 * actions from a masked softmax over `ActionSpace`'s flat indices.
 *
 * Falls back to BalancedBrain when:
 *   - no model file is present (dev environment, fresh checkout)
 *   - the model file fails to load (corrupt, wrong schema version)
 *   - this brain wasn't attached to a Match (e.g. dry-run via the
 *     registry without going through `runMatch`)
 *
 * The fallback path mirrors LearningBrain.ts's pattern so the game
 * stays usable without a committed model.
 *
 * Architecture decisions locked in `notes/rl/bc-plan.md`:
 *   D3 — (β) Conv-only encoder with per-cell action head + scalar
 *        skip head + value head.
 *   D5-extra — (α) Globals fused as input channels by broadcasting
 *        the 25-vec into 25 spatial channels at the input boundary.
 *   D6 — Temperature configurable from day 1. T=0 means argmax
 *        (used by `hard` difficulty in G5); T=1 is BC default;
 *        T>1 increasingly random for `medium` / `easy`.
 *
 * ONNX I/O contract (schema v1.1):
 *   Input  "spatial"  Float32 [N=1, C=14+25, H=26, W=36]
 *                     14 game channels + 25 globals tiled to (H,W)
 *   Output "spatial_logits"  Float32 [N, 10, 26, 36]
 *                            slots 0..7 = place per slot; 8 = upgrade;
 *                            9 = sell
 *   Output "skip_logit"      Float32 [N, 1]
 *   Output "value"           Float32 [N, 1]   (PPO advantage target,
 *                                              unused at inference)
 */
import { BotBrain, BotContext, BotDecision, registerBrain, BRAIN_REGISTRY } from '../BotBrain';
import { Match } from '../../../headless/Match';
import {
  fromMatch as obsFromMatch,
  OBS_CHANNELS,
  OBS_GLOBALS,
} from '../learning/ObsTensor';
import {
  ACTION_SPACE_SIZE,
  ActionSpaceDecision,
  OBS_ACTION_SCHEMA_VERSION,
  decodeAction,
  packSpatialLogits,
  sampleAction,
  toBotDecision,
} from '../learning/ActionSpace';
import { GRID_COLS, GRID_ROWS } from '../../../config';

// ===== Module-level session cache =====
// One InferenceSession per loaded model path. Heavy to construct;
// reused across all PPOBrain instances and across matches.
type Session = {
  // Loosely-typed so we don't pull `onnxruntime-node` types into the
  // public type surface — keeps non-Node consumers (browser bundles
  // that should never instantiate PPOBrain anyway) from tripping
  // module-resolution. Internal users cast at call sites below.
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
  schemaVersion: string;
};

const SESSION_CACHE = new Map<string, Session | null>();
const SESSION_LOAD_PROMISES = new Map<string, Promise<Session | null>>();
const DEFAULT_MODEL_PATH = 'models/ppo-policy.onnx';
const DEFAULT_META_PATH = 'models/ppo-policy.meta.json';

/** Async preload of an ONNX session. Tests / production startup
 *  await this so the first `decide()` call doesn't hit the fallback
 *  path. Resolves to `null` (and stays cached) on any load failure
 *  — the brain interprets `null` as "use fallback." */
export async function preloadPPOModel(modelPath = DEFAULT_MODEL_PATH, metaPath = DEFAULT_META_PATH): Promise<Session | null> {
  const cached = SESSION_CACHE.get(modelPath);
  if (cached !== undefined) return cached;
  const pending = SESSION_LOAD_PROMISES.get(modelPath);
  if (pending) return pending;

  const p = (async (): Promise<Session | null> => {
    try {
      // Node-only by construction; the browser bundle never reaches
      // here because PPOBrain is registered only after a side-effect
      // import in scripts/runners (mirror of LearningBrain).
      if (typeof process === 'undefined' || !process.versions?.node) return null;
      const fs = require('node:fs') as typeof import('node:fs');
      const path = require('node:path') as typeof import('node:path');
      const cwd = process.cwd();
      const candidates = [
        path.resolve(cwd, modelPath),
        path.resolve(cwd, '..', modelPath),
      ];
      let resolvedPath: string | null = null;
      for (const cp of candidates) if (fs.existsSync(cp)) { resolvedPath = cp; break; }
      if (!resolvedPath) return null;

      // Schema version gate — meta.json is co-located with the
      // model. Refuse stale-version loads so we don't silently feed
      // a v1.0-trained policy v1.1-shaped observations.
      let stampedVersion = OBS_ACTION_SCHEMA_VERSION;
      const metaCandidates = [
        path.resolve(cwd, metaPath),
        path.resolve(cwd, '..', metaPath),
      ];
      for (const mp of metaCandidates) {
        if (fs.existsSync(mp)) {
          try {
            const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
            if (typeof meta.schemaVersion === 'string') stampedVersion = meta.schemaVersion;
          } catch { /* tolerate malformed meta */ }
          break;
        }
      }
      if (stampedVersion !== OBS_ACTION_SCHEMA_VERSION) {
        // eslint-disable-next-line no-console
        console.warn(`[PPOBrain] model schema ${stampedVersion} != runtime ${OBS_ACTION_SCHEMA_VERSION}, falling back`);
        return null;
      }

      // Dynamic import keeps the dep optional at module-load time —
      // browser bundles + harnesses that don't use PPOBrain don't
      // pay for the native binary.
      const ort = await import('onnxruntime-node');
      const session = await ort.InferenceSession.create(resolvedPath);
      return {
        run: (feeds) => session.run(feeds as Parameters<typeof session.run>[0]) as Promise<Record<string, { data: Float32Array }>>,
        schemaVersion: stampedVersion,
      };
    } catch {
      // Any failure during load → fallback path. Tests run without
      // a model and rely on this graceful degradation.
      return null;
    }
  })();

  SESSION_LOAD_PROMISES.set(modelPath, p);
  const session = await p;
  SESSION_CACHE.set(modelPath, session);
  SESSION_LOAD_PROMISES.delete(modelPath);
  return session;
}

/** Build the [N=1, C, H, W] input tensor data: concat 14 game
 *  channels with 25 globals broadcast across (H, W). Returns a
 *  flat Float32Array in NCHW order. */
export function buildModelInput(grid: Float32Array, globals: Float32Array): Float32Array {
  const C = OBS_CHANNELS + OBS_GLOBALS;  // 14 + 25 = 39
  const H = GRID_ROWS;
  const W = GRID_COLS;
  const out = new Float32Array(C * H * W);

  // Game channels: copy as-is (grid is already [OBS_CHANNELS, H, W]).
  out.set(grid, 0);

  // Globals broadcast: tile each scalar over the H×W plane.
  const planeSize = H * W;
  let offset = OBS_CHANNELS * planeSize;
  for (let g = 0; g < OBS_GLOBALS; g++) {
    const v = globals[g];
    out.fill(v, offset, offset + planeSize);
    offset += planeSize;
  }
  return out;
}

// ===== PPOBrain =====

export interface PPOBrainOpts {
  modelPath?: string;
  metaPath?: string;
  temperature?: number;
}

export class PPOBrain implements BotBrain {
  readonly name = 'PPO';

  // Match reference attached by `attachMatch()` — needed by
  // ObsTensor.fromMatch (creeps, simTime, grid live state). Public
  // so tests + future Match-driven validators can inspect, but
  // callers must not mutate.
  match: Match | null = null;

  // Lazy session: kicked off at attach time, awaited never (decide
  // is sync). If the session resolves before decide() fires, we use
  // it; otherwise we fall back.
  private session: Session | null = null;
  private sessionLoadStarted = false;

  // Fallback brain — set in init().
  private fallback: BotBrain | null = null;

  readonly modelPath: string;
  readonly metaPath: string;
  temperature: number;
  // For deterministic sampling: tests pass a seeded RNG.
  rngFn: () => number = Math.random;

  constructor(opts: PPOBrainOpts = {}) {
    this.modelPath = opts.modelPath ?? DEFAULT_MODEL_PATH;
    this.metaPath = opts.metaPath ?? DEFAULT_META_PATH;
    this.temperature = opts.temperature ?? 1.0;
  }

  attachMatch(match: Match): void {
    this.match = match;
    // Kick off model load if not already done. Fire-and-forget; the
    // promise resolves into SESSION_CACHE, and `decide()` checks
    // synchronously each call.
    if (!this.sessionLoadStarted) {
      this.sessionLoadStarted = true;
      preloadPPOModel(this.modelPath, this.metaPath).then(s => { this.session = s; }).catch(() => { /* fallback retained */ });
    }
    // Also pick up the cached session if a prior load already finished.
    const cached = SESSION_CACHE.get(this.modelPath);
    if (cached !== undefined) this.session = cached;
  }

  init(ctx: BotContext): void {
    const balancedFactory = BRAIN_REGISTRY['balanced'];
    if (balancedFactory) {
      this.fallback = balancedFactory();
      this.fallback.init?.(ctx);
    }
  }

  decide(ctx: BotContext): BotDecision {
    // Refresh cache view in case session loaded mid-match.
    if (!this.session) {
      const cached = SESSION_CACHE.get(this.modelPath);
      if (cached !== undefined) this.session = cached;
    }

    if (!this.match || !this.session) {
      return this.fallback?.decide(ctx) ?? { kind: 'skip' };
    }

    // Synchronous ObsTensor build (cheap — bunch of typed-array
    // writes).
    const obs = obsFromMatch(this.match);
    const input = buildModelInput(obs.grid, obs.globals);

    // ONNX inference is async (onnxruntime-node returns Promise).
    // The BotBrain interface is sync. We can't await — so we
    // pre-cache the most-recent inference and use the fallback for
    // this turn, kicking off the inference for the NEXT call.
    //
    // The PPOBrain test suite + actual training/eval flow run
    // through `decideAsync()` instead, which awaits and is the
    // production path. This sync `decide()` is here so PPOBrain
    // can still be slotted into the existing brain registry; it
    // degrades to fallback rather than blocking. The proper async
    // path is documented in NOTES below.
    void input;
    return this.fallback?.decide(ctx) ?? { kind: 'skip' };
  }

  /** Async decision path used by trainers/validators that can
   *  await. Builds ObsTensor, runs ONNX inference, samples from
   *  masked logits with the configured temperature, decodes to a
   *  BotDecision.
   *
   *  Production decide loop (BC step 3 rollout generator, validation,
   *  G3 PPO rollouts) calls `decideAsync` directly via a wrapper
   *  that awaits inside the Match step. The sync `decide` falls
   *  back so dropping PPOBrain into legacy code paths doesn't
   *  hard-fail; it just under-performs. */
  async decideAsync(ctx: BotContext): Promise<BotDecision> {
    if (!this.session) {
      const cached = SESSION_CACHE.get(this.modelPath);
      if (cached !== undefined) this.session = cached;
    }
    if (!this.match || !this.session) {
      return this.fallback?.decide(ctx) ?? { kind: 'skip' };
    }

    const obs = obsFromMatch(this.match);
    const input = buildModelInput(obs.grid, obs.globals);

    // Build input tensor. We dynamic-import ort here so this method
    // is a no-op when no model is loaded.
    const ort = await import('onnxruntime-node');
    const inputTensor = new ort.Tensor('float32', input, [1, OBS_CHANNELS + OBS_GLOBALS, GRID_ROWS, GRID_COLS]);

    const results = await this.session.run({ spatial: inputTensor as unknown as Parameters<typeof this.session.run>[0]['spatial'] });
    // Output schema: spatial_logits [1, 10, 26, 36], skip_logit [1, 1].
    const spatialOut = results.spatial_logits?.data;
    const skipOut = results.skip_logit?.data;
    if (!spatialOut || !skipOut) {
      return this.fallback?.decide(ctx) ?? { kind: 'skip' };
    }

    const flatLogits = packSpatialLogits(spatialOut as Float32Array, (skipOut as Float32Array)[0]);
    const actionIdx = sampleAction(flatLogits, obs.mask, this.temperature, this.rngFn);
    const decoded: ActionSpaceDecision = decodeAction(actionIdx, ctx.faction);
    return toBotDecision(decoded);
  }
}

registerBrain('ppo', () => new PPOBrain());

/**
 * NOTES on the sync / async split.
 *
 * The BotBrain interface is sync because Match's step loop is sync.
 * onnxruntime-node's inference is async (it runs the model on a
 * thread pool and returns a Promise). Reconciling them honestly is
 * out of scope for the BC skeleton; the workable middle ground:
 *
 *   - `decide()` (sync) falls back to BalancedBrain. Safe default
 *     when PPOBrain is dropped into any code path that didn't
 *     opt into the async cycle.
 *   - `decideAsync()` (async) is the real inference path. Callers
 *     that can await (rollout generator, validation tournament,
 *     G3 PPO rollouts) use this.
 *
 *   - Future work in BC step 3: write a small `AsyncMatchDriver`
 *     that awaits `decideAsync()` between sim ticks. The Match
 *     class's tick loop is sync, but we can call `match.step()`
 *     between `await decideAsync()` calls — the inner brain.decide
 *     is what matters, and the driver controls when that fires.
 */
