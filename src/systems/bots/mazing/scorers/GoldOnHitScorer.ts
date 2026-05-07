/**
 * GoldOnHitScorer — economic-value contribution for towers that mint
 * gold per hit or per kill in their range.
 *
 * Modeled traits:
 *   - gold_on_hit       (Void Siphon, Void Oblivion): {amount, chance}
 *                       chance × amount gold per shot fired against a creep
 *   - gold_per_kill_range (Infernal Soul Drain): {goldPerKill}
 *                       fixed gold per kill within the tower's range,
 *                       regardless of which tower dealt the killing blow
 *
 * Conversion to a comparable score: 1 gold ≈ 1 unit of effective DPS.
 * Towers cost roughly 1g per damage at low tiers; this is approximate
 * but lets the planner compare "place a Siphon" vs "place a Gambler"
 * on a single combined scale. brain-search re-tunes the weight.
 *
 * Why not just bake into DpsCoverageScorer like jackpot?
 * Jackpot directly multiplies per-hit damage — same input shape. Gold
 * generation is *categorically* different (income, not damage), so
 * separating it into its own scorer means brain-search can dial the
 * gold-vs-damage exchange rate independently per faction. Cypherpunk
 * and Void with strong gold-engine kits should land on a higher weight
 * than Arcane (which has none).
 */
import { ContributionScorer, ScorerContext } from './types';

/** Representative shots-per-creep — how many times a tower fires at the
 *  same target creep before it dies or leaves range. Used to convert
 *  per-hit gold to gold-per-creep-traversal. Conservative estimate; a
 *  Siphon with range 3 + path going through its full radius fires ~3-5
 *  times per creep. */
const SHOTS_PER_CREEP = 4;

/** Representative kills-per-second-per-path-cell within range. The
 *  gold_per_kill_range payout depends on creeps dying inside the tower's
 *  range, which is bounded by total kill rate of nearby damage towers.
 *  Approximation: each path cell covered by the tower contributes
 *  ~0.05 kills/sec across normal play. */
const KILLS_PER_PATH_CELL_PER_SEC = 0.05;

interface GoldTower {
  range: number;
  fireRate: number;
  traits: { id: string; [k: string]: unknown }[];
}

export class GoldOnHitScorer implements ContributionScorer {
  readonly id = 'gold_on_hit';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += goldContributionForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return total;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    const out: Record<string, number> = {};
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const g = goldContributionForTower(t, placed.col, placed.row, c.pathGeometries);
      if (g > 0) {
        out[`${placed.col},${placed.row}:${placed.towerId}`] = g;
      }
    }
    return out;
  }
}

/** Gold-per-second equivalent for a tower's economy traits, scaled by
 *  path coverage. Returns gold/sec; the registry weight scales it into
 *  the combined score (1 gold ≈ 1 unit of DPS at default weight=1). */
function goldContributionForTower(
  tower: GoldTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const goldOnHit = tower.traits.find(t => t.id === 'gold_on_hit') as
    { amount?: number; chance?: number } | undefined;
  const goldPerKillRange = tower.traits.find(t => t.id === 'gold_per_kill_range') as
    { goldPerKill?: number } | undefined;
  if (!goldOnHit && !goldPerKillRange) return 0;

  const r2 = tower.range * tower.range;
  let pathCellsInRange = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) pathCellsInRange++;
    }
  }
  if (pathCellsInRange === 0) return 0;

  let goldPerSec = 0;

  if (goldOnHit) {
    // chance × amount per shot × shots per creep × creeps per second.
    // creeps-per-sec ≈ pathCellsInRange × 0.5 / SHOTS_PER_CREEP (rough
    // proxy that scales with how much path the tower covers). Net:
    //   chance × amount × 0.5 × pathCellsInRange × shotsPerSec
    const chance = goldOnHit.chance ?? 0;
    const amount = goldOnHit.amount ?? 0;
    const shotsPerSec = 1000 / Math.max(tower.fireRate, 1);
    goldPerSec += chance * amount * shotsPerSec * pathCellsInRange * 0.5;
    void SHOTS_PER_CREEP;
  }

  if (goldPerKillRange) {
    // goldPerKill × kills-per-sec-in-range. Kills in range scale with
    // total damage delivered to creeps walking through. Approximation:
    // pathCellsInRange × KILLS_PER_PATH_CELL_PER_SEC.
    const goldPerKill = goldPerKillRange.goldPerKill ?? 0;
    goldPerSec += goldPerKill * pathCellsInRange * KILLS_PER_PATH_CELL_PER_SEC;
  }

  return goldPerSec;
}
