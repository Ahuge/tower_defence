/**
 * QPolicyBrain — uses Q(state, action) directly as a policy.
 *
 * Per decision:
 *   1. Build obs tensor (no beam, no snapshot).
 *   2. Forward Q network → [9361] Q values for each action.
 *   3. Apply legal mask (set Q=-inf for illegal actions).
 *   4. Argmax → action.
 *   5. Decode action into BotDecision.
 *
 * ~1ms per decision (single ONNX forward pass) vs rung 2's
 * 3-5 seconds (3-wave forward-sim per candidate × 10 candidates).
 *
 * No tree search. Q itself is the policy.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { Match } from '../../../headless/Match';
import { fromMatch } from '../learning/ObsTensor';
import { ACTION_SPACE_SIZE, SKIP_INDEX, PLACE_BASE, PLACE_SIZE, UPGRADE_BASE, UPGRADE_SIZE, SELL_BASE, SELL_SIZE, NUM_CELLS } from '../learning/ActionSpace';
import { getFactionTowerIds } from '../learning/FactionVocab';
import { getTowerType } from '../../../data/TowerTypes';
import { GRID_COLS } from '../../../config';
import * as ort from 'onnxruntime-node';

interface QPolicyOptions {
  modelPath: string;
  /** Required so the brain can build obs tensors from the live match. */
  matchRef: { current: Match | null };
  /** Optional temperature for sampling. T=0 = argmax. */
  temperature?: number;
  readonly name?: string;
}

let cachedSession: ort.InferenceSession | null = null;
let cachedSessionPath: string | null = null;

export async function preloadQNet(modelPath: string): Promise<ort.InferenceSession> {
  if (cachedSession && cachedSessionPath === modelPath) return cachedSession;
  cachedSession = await ort.InferenceSession.create(modelPath);
  cachedSessionPath = modelPath;
  return cachedSession;
}

function decodeAction(idx: number, faction: any): BotDecision {
  if (idx === SKIP_INDEX) return { kind: 'skip' };
  if (idx >= SELL_BASE) {
    const cell = idx - SELL_BASE;
    return { kind: 'sell', col: cell % GRID_COLS, row: Math.floor(cell / GRID_COLS) };
  }
  if (idx >= UPGRADE_BASE) {
    const cell = idx - UPGRADE_BASE;
    return { kind: 'upgrade', col: cell % GRID_COLS, row: Math.floor(cell / GRID_COLS) };
  }
  // Place: slot × NUM_CELLS + cell
  const slot = Math.floor(idx / NUM_CELLS);
  const cell = idx % NUM_CELLS;
  const towerIds = getFactionTowerIds(faction);
  const towerId = towerIds[slot];
  if (!towerId) return { kind: 'skip' };
  const type = getTowerType(towerId);
  return { kind: 'place', col: cell % GRID_COLS, row: Math.floor(cell / GRID_COLS), type };
}

export class QPolicyBrain implements BotBrain {
  readonly name: string;
  private modelPath: string;
  private matchRef: { current: Match | null };
  private temperature: number;
  private session: ort.InferenceSession | null = null;
  public stats = {
    decisions: 0,
    skipFallbacks: 0,
    sessionLoads: 0,
  };

  constructor(opts: QPolicyOptions) {
    this.name = opts.name ?? 'q-policy';
    this.modelPath = opts.modelPath;
    this.matchRef = opts.matchRef;
    this.temperature = opts.temperature ?? 0;
  }

  init(ctx: BotContext): void {}

  decide(ctx: BotContext): BotDecision {
    // Sync path: can't await ONNX. Return skip and rely on async path.
    return { kind: 'skip' };
  }

  async decideAsync(ctx: BotContext): Promise<BotDecision> {
    this.stats.decisions++;

    const match = this.matchRef.current;
    if (!match) {
      this.stats.skipFallbacks++;
      return { kind: 'skip' };
    }

    if (!this.session) {
      this.session = await preloadQNet(this.modelPath);
      this.stats.sessionLoads++;
    }

    const obs = fromMatch(match);
    const gridT = new ort.Tensor('float32', obs.grid, [1, 14, 26, 36]);
    const glbT = new ort.Tensor('float32', obs.globals, [1, 25]);
    const out = await this.session.run({ grid: gridT, globals: glbT });
    const q = out.q.data as Float32Array;

    // Apply legal mask: set Q to -infinity for illegal actions.
    let bestIdx = -1;
    let bestQ = -Infinity;
    if (this.temperature === 0) {
      for (let i = 0; i < ACTION_SPACE_SIZE; i++) {
        if (obs.mask[i] === 0) continue;
        if (q[i] > bestQ) {
          bestQ = q[i];
          bestIdx = i;
        }
      }
    } else {
      // Softmax sample over masked actions.
      const T = this.temperature;
      let maxQ = -Infinity;
      for (let i = 0; i < ACTION_SPACE_SIZE; i++) {
        if (obs.mask[i] === 1 && q[i] > maxQ) maxQ = q[i];
      }
      const exps = new Float32Array(ACTION_SPACE_SIZE);
      let sum = 0;
      for (let i = 0; i < ACTION_SPACE_SIZE; i++) {
        if (obs.mask[i] === 1) {
          exps[i] = Math.exp((q[i] - maxQ) / T);
          sum += exps[i];
        }
      }
      // Sample.
      let r = Math.random() * sum;
      for (let i = 0; i < ACTION_SPACE_SIZE; i++) {
        if (obs.mask[i] === 0) continue;
        r -= exps[i];
        if (r <= 0) { bestIdx = i; break; }
      }
      if (bestIdx < 0) bestIdx = SKIP_INDEX;
    }

    if (bestIdx < 0) {
      this.stats.skipFallbacks++;
      return { kind: 'skip' };
    }
    return decodeAction(bestIdx, ctx.faction);
  }
}

registerBrain('q-policy', () => {
  throw new Error('q-policy requires modelPath + matchRef; construct directly');
});
