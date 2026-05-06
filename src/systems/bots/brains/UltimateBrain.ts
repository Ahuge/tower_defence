/**
 * UltimateBrain — saves for the faction's ultimate tower while
 * keeping the lights on with a minimum survival defence.
 *
 * Philosophy:
 *   1. Survive first. Place enough cheap DPS to cover the path
 *      before banking ANY gold for the ultimate. Never skip a
 *      placement opportunity if survival coverage is below floor.
 *   2. Once survival floor is met, hoard. Don't buy upgrades, don't
 *      buy frontier, don't buy more cheap DPS. Save every coin.
 *   3. The moment budget covers the ultimate, place it at max
 *      coverage. After landing, switch to maintenance: place cheap
 *      DPS in any remaining candidate cells, then upgrade the
 *      ultimate to max level.
 *
 * Survival floor heuristic: at least N path-covering DPS towers
 * exist on the board, where N grows with wave number — the bar to
 * "safe to save" rises as creep waves get tougher. If lives are
 * also low (< 10), we override the saving phase and spend whatever
 * we have on cheap DPS to stabilise.
 *
 * Purpose in the harness: tests whether ultimates are actually
 * pickable / useful at current pricing. Generic brains sometimes
 * never reach an ultimate at all, which means ult-balance
 * questions ("is Apocalypse 900g too steep?") are invisible to them.
 * This brain provides the answer.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

const PANIC_LIVES = 10;
const SURVIVE_DPS_FLOOR = (wave: number) => Math.max(2, Math.min(6, 2 + Math.floor(wave / 4)));

export class UltimateBrain implements BotBrain {
  readonly name = 'Ultimate';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private cheapDps: TowerType | null = null;
  private ultimate: TowerType | null = null;
  private wallIds: Set<string> = new Set();
  private placedUltimate = false;

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.placedUltimate = false;

    // The ultimate: prefer the explicitly-flagged ultimate; otherwise
    // fall back to the most expensive non-mobile tower in the pool.
    this.ultimate = ctx.towerPool.find(t => t.ultimate) ?? null;
    if (!this.ultimate) {
      const sorted = ctx.towerPool
        .filter(t => !hasTrait(t.traits, 'mobile_unit'))
        .sort((a, b) => b.cost - a.cost);
      this.ultimate = sorted[0] ?? null;
    }

    // Cheap DPS for the survival floor. Cheapest single-target,
    // falling back to splash.
    const cheap =
      this.grouped['dps-single'].length > 0 ? this.grouped['dps-single'] :
      this.grouped['dps-splash'];
    const sortedCheap = [...cheap].sort((a, b) => a.cost - b.cost);
    this.cheapDps = sortedCheap[0] ?? null;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.cheapDps) return { kind: 'skip' };

    const dpsOwned = ctx.placedTowers.filter(p =>
      !this.wallIds.has(p.towerId) && p.towerId !== this.ultimate?.id,
    ).length;
    const survivalFloor = SURVIVE_DPS_FLOOR(ctx.wave);
    const lowLives = ctx.lives < PANIC_LIVES;
    const belowFloor = dpsOwned < survivalFloor;

    // Survival rule: if we're below the DPS floor OR in panic-lives
    // mode, place cheap DPS regardless of how much gold the ult
    // would have eaten. Saving while leaking is how this brain dies.
    if ((belowFloor || lowLives) && ctx.budget >= this.cheapDps.cost) {
      const place = this.placeCheap(ctx);
      if (place.kind === 'place') return place;
    }

    // Survival floor met. Try to drop the ultimate if it's affordable
    // and we haven't already placed it.
    if (!this.placedUltimate && this.ultimate && ctx.budget >= this.ultimate.cost) {
      const place = this.placeUltimate(ctx);
      if (place.kind === 'place') {
        this.placedUltimate = true;
        return place;
      }
    }

    // After landing the ultimate: maintenance. Place cheap DPS in
    // remaining candidate cells, then upgrade the ultimate.
    if (this.placedUltimate) {
      if (ctx.budget >= this.cheapDps.cost) {
        const place = this.placeCheap(ctx);
        if (place.kind === 'place') return place;
      }
      const upgrade = this.upgradeUltimate(ctx);
      if (upgrade.kind === 'upgrade') return upgrade;
    }

    // Saving phase — survival floor met, ultimate not yet affordable.
    // Hoard the budget. Skip even if cheap DPS would fit, because
    // the point of this brain is to test "save for ult".
    return { kind: 'skip' };
  }

  private placeCheap(ctx: BotContext): BotDecision {
    if (!this.cheapDps) return { kind: 'skip' };
    return placeAtBestCoverage(ctx, this.cheapDps);
  }

  private placeUltimate(ctx: BotContext): BotDecision {
    if (!this.ultimate) return { kind: 'skip' };
    return placeAtBestCoverage(ctx, this.ultimate);
  }

  private upgradeUltimate(ctx: BotContext): BotDecision {
    const ult = ctx.placedTowers.find(p => p.towerId === this.ultimate?.id);
    if (!ult) return { kind: 'skip' };
    if (ult.upgradeCost <= 0 || ult.upgradeCost > ctx.budget) return { kind: 'skip' };
    return { kind: 'upgrade', col: ult.col, row: ult.row };
  }
}

function placeAtBestCoverage(ctx: BotContext, type: TowerType): BotDecision {
  if (ctx.budget < type.cost) return { kind: 'skip' };
  if (ctx.candidateCells.length === 0) return { kind: 'skip' };
  const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return { kind: 'skip' };

  let bestCol = -1, bestRow = -1, bestCoverage = -1;
  for (const c of ctx.candidateCells) {
    let coverage = 0;
    for (const p of paths) coverage += pathCellsWithinRange(c, p, type.range);
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestCol = c.col;
      bestRow = c.row;
    }
  }
  if (bestCoverage <= 0) return { kind: 'skip' };
  return { kind: 'place', col: bestCol, row: bestRow, type };
}

registerBrain('ultimate', () => new UltimateBrain());
