/**
 * RecorderBrain — wraps any BotBrain and emits a (state, decision)
 * record on each decide() call. Used by the training-data
 * generation pipeline to capture per-turn data without touching
 * the brain implementations themselves.
 *
 * Stays a thin pass-through: all real decision logic stays in the
 * inner brain. The recorder is invisible to the inner brain (no
 * shared state) and to the rest of the system (returns the same
 * BotDecision the inner brain produced).
 */
import { BotBrain, BotContext, BotDecision } from '../BotBrain';
import { extractStateFeatures, extractActionFeatures } from './FeatureExtractor';

export interface CapturedTurn {
  /** Match-id assigned by the data-gen driver — groups all turns
   *  from one match so we can attach the outcome later. */
  matchId: number;
  /** Monotonically-increasing index within this match. */
  turnIdx: number;
  /** State featurisation at decide() entry. */
  stateFeatures: number[];
  /** Action featurisation of the chosen decision. */
  actionFeatures: number[];
  /** Coarse decision shape — useful for filtering/grouping in
   *  Python, never fed to the regressor (action features carry the
   *  same info numerically). */
  decisionKind: BotDecision['kind'];
  /** Faction + brain + difficulty — match metadata. */
  faction: string;
  brain: string;
  difficulty: string;
  /** Wave at decide time. */
  wave: number;
}

export class RecorderBrain implements BotBrain {
  readonly name: string;
  private readonly inner: BotBrain;
  private readonly buffer: CapturedTurn[];
  private readonly matchId: number;
  private readonly meta: { faction: string; brain: string; difficulty: string };
  private turnIdx = 0;

  constructor(
    inner: BotBrain,
    buffer: CapturedTurn[],
    matchId: number,
    meta: { faction: string; brain: string; difficulty: string },
  ) {
    this.inner = inner;
    this.buffer = buffer;
    this.matchId = matchId;
    this.meta = meta;
    this.name = inner.name;
  }

  init(ctx: BotContext): void {
    this.inner.init?.(ctx);
  }

  decide(ctx: BotContext): BotDecision {
    const decision = this.inner.decide(ctx);
    // Capture features for THIS turn before returning. Capturing
    // before the action commits means the state reflects what the
    // brain saw when deciding — same featurisation as inference time.
    const turn: CapturedTurn = {
      matchId: this.matchId,
      turnIdx: this.turnIdx++,
      stateFeatures: extractStateFeatures(ctx),
      actionFeatures: extractActionFeatures(ctx, decision),
      decisionKind: decision.kind,
      faction: this.meta.faction,
      brain: this.meta.brain,
      difficulty: this.meta.difficulty,
      wave: ctx.wave,
    };
    this.buffer.push(turn);
    return decision;
  }
}
