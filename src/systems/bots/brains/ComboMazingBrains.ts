/**
 * Combo brains — pair an existing brain's strategy logic with the
 * MazingScorer for cell selection. Pure composition: each combo
 * brain holds a delegate `BotBrain` instance + a `MazingScorer`
 * instance, swaps the cell on `place` decisions, passes everything
 * else through unchanged.
 *
 * Pattern:
 *   delegate.decide(ctx) → BotDecision
 *   if BotDecision.kind === 'place': swap cell via scorer.bestCell
 *   else: return as-is
 *
 * Each combo brain maps to a v3 M6 hypothesis — the existing brain's
 * STRATEGY is right, but its CELL CHOICE is naive; the scorer fixes
 * the latter without changing the former. brain-search per cell
 * decides whether the combo wins on each (faction, difficulty).
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { GreedyBrain, GreedyBrainParams } from './GreedyBrain';
import { RushBrain } from './RushBrain';
import { AOEFocusBrain, AOEFocusBrainParams } from './AOEFocusBrain';
import { MazingScorer, MazingScorerOptions, DEFAULT_MAZING_OPTIONS } from '../mazing/MazingScorer';

/** Compose any BotBrain delegate with MazingScorer cell-selection. */
function composeWithScorer(delegate: BotBrain, scorer: MazingScorer): BotBrain {
  return {
    name: `${delegate.name}+Mazing`,
    init(ctx: BotContext): void { delegate.init?.(ctx); },
    decide(ctx: BotContext): BotDecision {
      const d = delegate.decide(ctx);
      if (d.kind !== 'place') return d;
      const pick = scorer.bestCell(ctx, d.type);
      if (!pick) return d;
      return { kind: 'place', col: pick.col, row: pick.row, type: d.type };
    },
  };
}

// ── Greedy + Mazing ───────────────────────────────────────────────
export interface GreedyMazingParams extends GreedyBrainParams, MazingScorerOptions {}

export class GreedyMazingBrain implements BotBrain {
  readonly name = 'GreedyMazing';
  private delegate: BotBrain;
  private scorer: MazingScorer;

  constructor(params?: Partial<GreedyMazingParams>) {
    this.delegate = new GreedyBrain(params);
    this.scorer = new MazingScorer({ ...DEFAULT_MAZING_OPTIONS, ...params });
  }

  init(ctx: BotContext): void { this.delegate.init?.(ctx); }
  decide(ctx: BotContext): BotDecision {
    return composeWithScorer(this.delegate, this.scorer).decide(ctx);
  }
}

// ── Rush + Mazing ─────────────────────────────────────────────────
export class RushMazingBrain implements BotBrain {
  readonly name = 'RushMazing';
  private delegate: BotBrain;
  private scorer: MazingScorer;

  constructor(params?: Partial<MazingScorerOptions>) {
    this.delegate = new RushBrain();
    this.scorer = new MazingScorer({ ...DEFAULT_MAZING_OPTIONS, ...params });
  }

  init(ctx: BotContext): void { this.delegate.init?.(ctx); }
  decide(ctx: BotContext): BotDecision {
    return composeWithScorer(this.delegate, this.scorer).decide(ctx);
  }
}

// ── AOEFocus + Mazing ─────────────────────────────────────────────
export interface AOEFocusMazingParams extends AOEFocusBrainParams, MazingScorerOptions {}

export class AOEFocusMazingBrain implements BotBrain {
  readonly name = 'AOEFocusMazing';
  private delegate: BotBrain;
  private scorer: MazingScorer;

  constructor(params?: Partial<AOEFocusMazingParams>) {
    this.delegate = new AOEFocusBrain(params);
    this.scorer = new MazingScorer({ ...DEFAULT_MAZING_OPTIONS, ...params });
  }

  init(ctx: BotContext): void { this.delegate.init?.(ctx); }
  decide(ctx: BotContext): BotDecision {
    return composeWithScorer(this.delegate, this.scorer).decide(ctx);
  }
}

registerBrain('greedy_mazing', () => new GreedyMazingBrain());
registerBrain('rush_mazing', () => new RushMazingBrain());
registerBrain('aoe_focus_mazing', () => new AOEFocusMazingBrain());
