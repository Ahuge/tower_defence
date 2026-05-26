/**
 * PPORecorderBrain — wraps a PPOBrain and captures rollouts for
 * the PPO trainer.
 *
 * Per-decision row: obs, actionIdx, logProb, value, plus per-step
 * reward (filled in as match progresses) and `done` (set true on
 * the final row). Post-episode, the trainer computes returns +
 * GAE advantages from these.
 *
 * Reward shape (bc-plan D1=b confirmed for G3):
 *   per tick:        -0.0001  (mild time penalty, accumulated
 *                              between brain decisions)
 *   per wave clear:  +0.1
 *   on win:          +1.0
 *   on loss:         -1.0
 *
 * The recorder doesn't know the per-tick count between successive
 * decide() calls (the Match's between-waves loop fires multiple
 * decides between sim ticks). For the smoke loop we approximate
 * per-decision step penalty as -0.0001, and reconcile at episode
 * end with the match's final simTimeMs if needed.
 */
import { BotBrain, BotContext, BotDecision } from '../BotBrain';
import { Match } from '../../../headless/Match';
import { PPOBrain } from '../brains/PPOBrain';
import { fromMatch as obsFromMatch, Obs } from './ObsTensor';

export interface PPORecordRow {
  matchId: string;
  tick: number;
  faction: string;
  obs: Obs;
  action: number;
  logProb: number;
  value: number;
  reward: number;
  done: boolean;
}

export interface RewardConfig {
  perDecisionTickPenalty: number;
  perWaveBonus: number;
  winBonus: number;
  lossPenalty: number;
}

export const DEFAULT_REWARD: RewardConfig = {
  perDecisionTickPenalty: -0.0001,
  perWaveBonus: 0.1,
  winBonus: 1.0,
  lossPenalty: -1.0,
};

export class PPORecorderBrain implements BotBrain {
  readonly name: string;
  private inner: PPOBrain;
  match: Match | null = null;
  readonly matchId: string;
  readonly reward: RewardConfig;

  readonly rows: PPORecordRow[] = [];
  readonly dropped = { fallback: 0, send: 0, frontier: 0, frontierManage: 0, illegalUnderMask: 0 };
  private lastWaveSeen = 0;
  private tick = 0;

  constructor(inner: PPOBrain, matchId: string, reward: RewardConfig = DEFAULT_REWARD) {
    this.inner = inner;
    this.matchId = matchId;
    this.reward = reward;
    this.name = `PPORecorder(${inner.name})`;
  }

  attachMatch(match: Match): void {
    this.match = match;
    this.inner.attachMatch(match);
  }

  init(ctx: BotContext): void {
    this.inner.init?.(ctx);
  }

  /** Async path used by `Match.stepAsync` when our caller drove the
   *  match via `runToEndAsync`. This is the real production path
   *  for PPO rollout gen. */
  async decideAsync(ctx: BotContext): Promise<BotDecision> {
    this.tick++;
    const obs = this.match ? obsFromMatch(this.match) : null;
    const stats = await this.inner.decideAsyncWithStats(ctx);

    // Fallback rows are useless to PPO (no on-policy log_prob), so
    // we skip recording them. Match still gets the fallback action.
    if (stats.fellBack) {
      this.dropped.fallback++;
      return stats.decision;
    }

    // Out-of-scope action kinds (`send`, `frontier`, `frontierManage`)
    // can't be encoded into our flat action space — but PPOBrain
    // already only emits Phase-1-2 decisions, so this branch is
    // unreachable in normal flow. Defensively count and drop.
    if (stats.decision.kind === 'send') { this.dropped.send++; return stats.decision; }
    if (stats.decision.kind === 'frontier') { this.dropped.frontier++; return stats.decision; }
    if (stats.decision.kind === 'frontierManage') { this.dropped.frontierManage++; return stats.decision; }

    // Mask consistency — the obs.mask was captured at the same
    // state PPOBrain just decided on. If the sampled action ended
    // up outside the mask somehow (shouldn't happen via
    // sampleAction), drop the row.
    if (!obs || obs.mask[stats.actionIdx] === 0) {
      this.dropped.illegalUnderMask++;
      return stats.decision;
    }

    // Per-decision tick penalty. Wave bonus added below if a wave
    // ticked over since the last decision.
    let stepReward = this.reward.perDecisionTickPenalty;
    if (this.match) {
      const ctxNow = this.match.observe();
      if (ctxNow.wave > this.lastWaveSeen) {
        stepReward += this.reward.perWaveBonus * (ctxNow.wave - this.lastWaveSeen);
        this.lastWaveSeen = ctxNow.wave;
      }
    }

    this.rows.push({
      matchId: this.matchId,
      tick: this.tick,
      faction: ctx.faction,
      obs,
      action: stats.actionIdx,
      logProb: stats.logProb,
      value: stats.value,
      reward: stepReward,
      done: false,
    });
    return stats.decision;
  }

  /** Sync path — Match.step() calls this. PPOBrain's sync path
   *  falls back to BalancedBrain (no ONNX inference); we don't
   *  record anything because there are no logProb/value to record.
   *  Caller should use Match.runToEndAsync for actual rollouts. */
  decide(ctx: BotContext): BotDecision {
    this.dropped.fallback++;
    return this.inner.decide(ctx);
  }

  /** Finalize the episode: set `done=true` on the last row, add
   *  the terminal win/loss bonus to its reward. Returns the same
   *  rows for the writer to serialize. */
  finalize(outcome: 'win' | 'loss' | 'timeout' | 'error'): PPORecordRow[] {
    if (this.rows.length === 0) return this.rows;
    const last = this.rows[this.rows.length - 1];
    last.done = true;
    if (outcome === 'win') last.reward += this.reward.winBonus;
    else if (outcome === 'loss') last.reward += this.reward.lossPenalty;
    // timeout/error: no terminal bonus
    return this.rows;
  }
}
