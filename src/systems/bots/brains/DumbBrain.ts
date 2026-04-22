/**
 * DumbBrain — the "dumb but alive" baseline. Picks a random tower
 * it can afford from the faction's full pool and places it in a
 * random empty in-zone cell. No wave awareness, no prioritisation,
 * no upgrades.
 *
 * Good enough to solo-play co-op maps: the bot steadily fills its
 * zone with towers and pulls its weight on defence without ever
 * getting clever. If a brain needs clever, add a new one alongside
 * this — don't change this one.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';

export class DumbBrain implements BotBrain {
  readonly name = 'Dumb';

  decide(ctx: BotContext): BotDecision {
    // Towers we can afford this round. `towerPool` is cost-sorted
    // ASC so this is just a budget slice.
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) return { kind: 'skip' };

    if (ctx.candidateCells.length === 0) return { kind: 'skip' };

    const type = affordable[Math.floor(Math.random() * affordable.length)];
    const cell = ctx.candidateCells[Math.floor(Math.random() * ctx.candidateCells.length)];
    return { kind: 'place', col: cell.col, row: cell.row, type };
  }
}

registerBrain('dumb', () => new DumbBrain());
