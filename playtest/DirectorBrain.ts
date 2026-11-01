/**
 * DirectorBrain — a responsive decision layer built from Alex's general
 * principles (not hardcoded strategies).
 *
 * The six principles:
 * 1. Post-wave assessment → cruising / close / struggling
 * 2. Risk budget → how much future-betting the assessment allows
 * 3. Responsive mazing → extend or upgrade high-traffic when penetrated
 * 4. Ability-driven composition → read traits, not faction IDs
 * 5. Sends as eco → profitable when defense has slack
 * 6. Saving for expensive towers → time-horizon calculation
 *
 * Architecture: the Director assesses and allocates. It delegates actual
 * tower placement to the faction strategies (the "vocabulary"), but
 * controls WHEN to greed vs turtle, WHEN to send, and WHAT to save for.
 */

import type { BotBrain, BotContext, BotDecision, Cell } from '../src/systems/bots/BotBrain.ts';
import { StrategistBrain } from './StrategistBrain.ts';
import { DIRECTOR_BRAIN_SCHEMA } from './DirectorBrainSchema.ts';

type Mode = 'cruising' | 'close' | 'struggling';

interface WaveRecord {
  wave: number;
  livesLost: number;
  livesRemaining: number;
}

export class DirectorBrain implements BotBrain {
  readonly id = 'director';
  readonly name = 'Director (responsive)';

  // The faction strategies are the vocabulary, not the plan.
  private strategist = new StrategistBrain();

  // Tunable knobs (from schema, set via setParams).
  private params: Record<string, number>;

  // Wave history for assessment.
  private history: WaveRecord[] = [];
  private lastLives: number | null = null;
  private lastWave: number = 0;

  // Savings goal: tower ID we're saving for, if any.
  private savingsGoal: string | null = null;

  constructor(params?: Record<string, number>) {
    this.params = { ...this.defaults(), ...(params ?? {}) };
    this.strategist.setParams?.(this.params);
  }

  private defaults(): Record<string, number> {
    const d: Record<string, number> = {};
    for (const [k, v] of Object.entries(DIRECTOR_BRAIN_SCHEMA)) {
      d[k] = v.default;
    }
    return d;
  }

  setParams(params: Record<string, number>): void {
    this.params = { ...this.defaults(), ...params };
  }

  init(ctx: BotContext): void {
    this.strategist.init(ctx);
    this.history = [];
    this.lastLives = null;
    this.lastWave = 0;
    this.savingsGoal = null;
  }

  decide(ctx: BotContext): BotDecision {
    // Track wave transitions for assessment.
    this.trackWave(ctx);

    // Get the strategist's decision first.
    const stratDecision = this.strategist.decide(ctx);

    // Never override a real decision — only fill gaps.
    // (The faction strategies are finely tuned; overriding them with
    //  general principles hurts. The Director adds value in the gaps.)
    if (stratDecision.kind !== 'skip') {
      return stratDecision;
    }

    // Strategist skipped — Director can consider eco bets.
    const mode = this.assess(ctx);
    if (mode !== 'cruising') return stratDecision;

    const riskBudget = this.riskBudget(ctx, mode);
    if (ctx.betweenWaves) {
      const send = this.evaluateSend(ctx, riskBudget);
      if (send) return send;
    }

    return stratDecision;
  }

  /**
   * Principle 1: Post-wave assessment.
   * Track lives lost per wave, determine mode.
   */
  private trackWave(ctx: BotContext): void {
    if (ctx.wave !== this.lastWave) {
      // New wave — record what happened last wave.
      if (this.lastLives !== null && this.lastWave > 0) {
        const lost = this.lastLives - ctx.lives;
        this.history.push({
          wave: this.lastWave,
          livesLost: Math.max(0, lost),
          livesRemaining: ctx.lives,
        });
        // Keep last 5 waves.
        if (this.history.length > 5) this.history.shift();
      }
      this.lastWave = ctx.wave;
      this.lastLives = ctx.lives;
    } else {
      // Same wave, update lives (mid-wave decide calls).
      this.lastLives = ctx.lives;
    }
  }

  private assess(ctx: BotContext): Mode {
    const p = this.params;
    // Need sufficient history — early waves don't prove anything.
    // (Losing 0 lives on waves 1-3 doesn't mean you're cruising.)
    if (this.history.length < p.historyNeeded) return 'close';

    const recent = this.history.slice(-3);
    const totalLost = recent.reduce((s, r) => s + r.livesLost, 0);
    const avgLost = totalLost / recent.length;

    // Struggling: losing lives consistently or critically low.
    if (ctx.lives <= p.strugglingLives) return 'struggling';
    if (avgLost >= p.strugglingAvg) return 'struggling';

    // Close: losing some lives, or trend worsening.
    if (avgLost >= p.closeAvg) return 'close';
    if (recent.length >= 2) {
      const trend = recent[recent.length - 1].livesLost - recent[0].livesLost;
      if (trend > 0) return 'close'; // getting worse
    }

    // Cruising: enough history, no lives lost, stable.
    // Require clean streak to be confident.
    const cleanStreak = this.history.slice(-Math.ceil(p.cleanStreak)).every(r => r.livesLost === 0);
    if (!cleanStreak) return 'close';

    return 'cruising';
  }

  /**
   * Principle 2: Risk budget.
   * How much gold can we gamble on future bets?
   */
  private riskBudget(ctx: BotContext, mode: Mode): number {
    const p = this.params;
    switch (mode) {
      case 'cruising': return Math.floor(ctx.budget * p.cruisingRisk);
      case 'close': return Math.floor(ctx.budget * p.closeRisk);
      case 'struggling': return 0;
    }
  }

  /**
   * Principle 5: Sends as eco.
   * Profitable when defense has slack (cruising). The send income +
   * kill bounty beats the cost IF we don't leak.
   */
  private evaluateSend(ctx: BotContext, riskBudget: number): BotDecision | null {
    if (!ctx.sendOptions || ctx.sendOptions.length === 0) return null;
    if (riskBudget <= 0) return null;

    // Pick the cheapest send we can afford within risk budget.
    // (More sophisticated: estimate kill probability from mode.)
    const affordable = ctx.sendOptions
      .filter(s => s.cost <= riskBudget)
      .sort((a, b) => a.cost - b.cost);

    if (affordable.length === 0) return null;

    // In cruising mode, the cheapest send is a profitable eco bet.
    // We trust the assessment: if we're cruising, we can kill it.
    const send = affordable[0];
    return { kind: 'send', sendId: send.id } as BotDecision;
  }

  /**
   * Principle 6: Saving for expensive towers.
   * Time-horizon calculation: can we survive the save waves?
   */
  private evaluateSavings(ctx: BotContext, mode: Mode, riskBudget: number): BotDecision | null {
    // Only consider savings when cruising (close = too risky).
    if (mode !== 'cruising') {
      this.savingsGoal = null;
      return null;
    }

    // Find expensive towers worth saving for: high cost, high DPS/gold.
    // For now: any tower costing > 2x current budget with good DPS.
    const expensive = ctx.towerPool
      .filter(t => t.cost > ctx.budget * 1.5 && t.cost <= ctx.budget * 4)
      .filter(t => (t.damage ?? 0) > 0)
      .sort((a, b) => (b.damage / b.cost) - (a.damage / a.cost));

    if (expensive.length === 0) {
      this.savingsGoal = null;
      return null;
    }

    const target = expensive[0];
    const wavesToSave = Math.ceil((target.cost - ctx.budget) / 100); // rough income est

    // Check upcoming waves for bosses/spikes within savings window.
    const upcoming = ctx.upcomingWaves ?? [];
    const dangerInWindow = upcoming.slice(0, wavesToSave).some(w =>
      w.isBoss || w.groups.some(g => /boss|elite/i.test(g.creepType)));

    if (dangerInWindow) {
      // Can't save through a boss — spend now.
      this.savingsGoal = null;
      return null;
    }

    // Save: skip spending this turn to accumulate.
    // (Only if we're already close to the goal — don't save from zero.)
    if (ctx.budget >= target.cost * 0.6) {
      this.savingsGoal = target.id;
      return { kind: 'skip' };
    }

    this.savingsGoal = null;
    return null;
  }
}
