/**
 * ObsRecorderBrain — wraps an inner BotBrain and records each
 * decision as an (ObsTensor, action_index, mask) row for BC
 * training data.
 *
 * Sibling of the existing `RecorderBrain` in this same directory,
 * which records 56-dim FeatureExtractor features for the xgboost
 * `LearningBrain` pipeline. This recorder targets the v1.1 ObsTensor
 * + flat ActionSpace surface used by `PPOBrain` and the BC trainer.
 *
 * Inner brain choice (per `bc-plan.md` D2) is `LearningBrain` —
 * Step 0 showed it dominates BalancedBrain on Arcane (+47%) and
 * matches it within noise on Mechanical (-8%).
 *
 * Non-Phase-1-2 actions (`frontier`, `frontierManage`, `send`) are
 * silently dropped — the BC action space doesn't encode them. The
 * decision is still made (so the match plays out correctly), it
 * just doesn't get recorded. The distribution probe in BC step 3.5
 * reports the drop rate so we can confirm it's low enough to ignore.
 */
import { BotBrain, BotContext, BotDecision } from '../BotBrain';
import { Match } from '../../../headless/Match';
import { fromMatch as obsFromMatch, Obs } from './ObsTensor';
import {
  encodeAction,
  ActionSpaceDecision,
} from './ActionSpace';

/** One recorded decision. Buffer-friendly: keeps the actual typed
 *  arrays so the writer can base64 them in bulk. */
export interface ObsRecordRow {
  matchId: string;
  tick: number;
  faction: string;
  action: number;
  obs: Obs;
}

/** Outcome stats so the writer can stamp each match file with
 *  whether the inner brain won / lost / how far it got. Lets the
 *  trainer weight by outcome later if it wants to. */
export interface RecordedMatchStats {
  matchId: string;
  faction: string;
  seed: number;
  innerBrainName: string;
  decisions: number;
  dropped: { send: number; frontier: number; frontierManage: number };
}

function actionToSpaceDecision(d: BotDecision): ActionSpaceDecision | null {
  switch (d.kind) {
    case 'place':   return { kind: 'place',   col: d.col, row: d.row, towerId: d.type.id };
    case 'upgrade': return { kind: 'upgrade', col: d.col, row: d.row };
    case 'sell':    return { kind: 'sell',    col: d.col, row: d.row };
    case 'skip':    return { kind: 'skip' };
    default:        return null;  // send / frontier / frontierManage — dropped
  }
}

export class ObsRecorderBrain implements BotBrain {
  readonly name: string;
  private inner: BotBrain;
  match: Match | null = null;

  readonly rows: ObsRecordRow[] = [];
  readonly dropped = { send: 0, frontier: 0, frontierManage: 0, illegalUnderMask: 0 };
  readonly matchId: string;
  private tick = 0;

  constructor(inner: BotBrain, matchId: string) {
    this.inner = inner;
    this.matchId = matchId;
    this.name = `Recorder(${inner.name})`;
  }

  attachMatch(match: Match): void {
    this.match = match;
    // Forward to inner if it cares (e.g. another wrapper layer).
    const innerAttach = this.inner as { attachMatch?: (m: Match) => void };
    innerAttach.attachMatch?.(match);
  }

  init(ctx: BotContext): void {
    this.inner.init?.(ctx);
  }

  decide(ctx: BotContext): BotDecision {
    this.tick++;
    // Capture obs BEFORE the inner brain decides — the inner
    // shouldn't mutate state, but we want the action to be a
    // response to the same state the policy will see at inference.
    const obs = this.match ? obsFromMatch(this.match) : null;
    const decision = this.inner.decide(ctx);
    const asd = actionToSpaceDecision(decision);

    if (!asd) {
      // Out-of-scope action — count it and drop the row.
      if (decision.kind === 'send')           this.dropped.send++;
      else if (decision.kind === 'frontier')  this.dropped.frontier++;
      else if (decision.kind === 'frontierManage') this.dropped.frontierManage++;
      return decision;
    }

    if (obs) {
      const actionIdx = encodeAction(asd, ctx.faction);
      // Filter: drop rows where the inner brain's proposal is
      // illegal under our own legalMask. This happens most often
      // in the in-wave brain-decide branch (every 30 ticks of
      // sim time) where Match.runOneIteration only accepts
      // `upgrade` and `sell` decisions but BalancedBrain /
      // LearningBrain may still propose `place`. Match silently
      // ignores those, and so should the recorder — otherwise we'd
      // train the policy on labels Match wouldn't actually accept.
      if (obs.mask[actionIdx] === 0) {
        this.dropped.illegalUnderMask++;
      } else {
        this.rows.push({
          matchId: this.matchId,
          tick: this.tick,
          faction: ctx.faction,
          action: actionIdx,
          obs,
        });
      }
    }
    return decision;
  }

  stats(seed: number): RecordedMatchStats {
    return {
      matchId: this.matchId,
      faction: this.rows[0]?.faction ?? 'unknown',
      seed,
      innerBrainName: this.inner.name,
      decisions: this.rows.length,
      dropped: { ...this.dropped },
    };
  }
}
