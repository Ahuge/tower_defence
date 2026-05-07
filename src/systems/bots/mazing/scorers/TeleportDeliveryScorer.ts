/**
 * TeleportDeliveryScorer — push-creep-backward contribution for towers
 * with the `teleport_delivery` trait (Void Rift).
 *
 * Trait shape: { id: 'teleport_delivery', stepsBase: 4, stepsPerLevel: 2 }
 * Each hit teleports the creep `stepsBase` (+ stepsPerLevel × upgrade
 * level) tiles backward along its path. The creep then re-walks those
 * tiles, re-exposing itself to every other tower whose range covers
 * them — a Rift compounds the work of every nearby DPS tower.
 *
 * Value model: per-hit teleport ≈ steps × averageDpsPerPathCell, where
 * averageDpsPerPathCell is approximated by total damage of all OTHER
 * placed towers divided by total path cells they collectively cover.
 * The scorer doesn't have a true per-cell DPS map, so we use a
 * conservative constant (DPS_PER_TILE_ESTIMATE) tunable via the
 * brain-search weight knob.
 *
 * Why an independent scorer? Rift's value is purely emergent — alone
 * it does almost no damage (2 dmg @ 3500ms = 0.6 DPS). DpsCoverageScorer
 * sees Rift as a near-zero contributor. Without this term Rift is
 * never picked by the planner, but in real play Rift IS the win
 * condition for late-Void late-game (creeps that should leak get
 * cycled back through the kill zone repeatedly). brain-search will
 * tune the weight to find the right point — likely 0 on factions
 * without a teleport tower, non-zero on Void.
 */
import { ContributionScorer, ScorerContext } from './types';

/** Per-tile DPS proxy when other towers carpet-cover the relevant path
 *  cells. Tunable; matches a single mid-tier DPS tower covering one
 *  path cell at fireRate ~1s. brain-search re-scales via weight. */
const DPS_PER_TILE_ESTIMATE = 5;

interface TeleportTower {
  range: number;
  fireRate: number;
  traits: { id: string; [k: string]: unknown }[];
}

export class TeleportDeliveryScorer implements ContributionScorer {
  readonly id = 'teleport_delivery';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += teleportContributionForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return total;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    const out: Record<string, number> = {};
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const v = teleportContributionForTower(t, placed.col, placed.row, c.pathGeometries);
      if (v > 0) {
        out[`${placed.col},${placed.row}:${placed.towerId}`] = v;
      }
    }
    return out;
  }
}

function teleportContributionForTower(
  tower: TeleportTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const trait = tower.traits.find(t => t.id === 'teleport_delivery') as
    { stepsBase?: number; stepsPerLevel?: number } | undefined;
  if (!trait) return 0;
  const steps = trait.stepsBase ?? 0;
  if (steps <= 0) return 0;

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

  // Hits-per-sec when path cells are within range, capped by fireRate.
  const shotsPerSec = 1000 / Math.max(tower.fireRate, 1);
  // Each hit teleports `steps` tiles backward. Effective extra damage
  // dealt = steps × DPS_PER_TILE_ESTIMATE × shotsPerSec. Multiply by a
  // path-coverage factor so a Rift that doesn't cover the path scores 0.
  const coverageFactor = Math.min(1, pathCellsInRange / 6);
  return steps * DPS_PER_TILE_ESTIMATE * shotsPerSec * coverageFactor;
}
