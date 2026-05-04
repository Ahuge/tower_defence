/**
 * SummoningCircle — M10 finale entity. A 2x2 placement on the grid
 * that accumulates **charge** from adjacent Mana Drain towers.
 *
 * Two circles share a single charge meter (managed by FinaleController);
 * each circle individually counts its own adjacent Mana Drains and
 * exposes `chargeContribution()`. The controller sums those and ticks
 * the meter forward each frame.
 *
 * Adjacency: Chebyshev distance ≤ 1 (8 cardinal neighbors) of any of
 * the circle's four footprint cells. Towers in the magenta zone but
 * NOT adjacent to a circle don't contribute.
 *
 * Rendering: a faint lavender ring around the 2x2 footprint plus a
 * radial fill that grows clockwise as the shared charge accumulates.
 * On 100% the controller fires hero spawn; the circle stays full as a
 * visual indicator of "active." Subsequent hero deaths respawn at the
 * scene anchor without resetting the meter.
 */
import * as Phaser from 'phaser';
import { TILE_SIZE, gridX, gridY } from '../config';
import type { Tower } from './Tower';

export class SummoningCircle {
  /** Top-left grid coordinate of the 2x2 footprint. */
  col: number;
  row: number;
  /** Pixel center of the 2x2 footprint — used for VFX + spawn anchor math. */
  cx: number;
  cy: number;

  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    this.col = col;
    this.row = row;
    this.cx = (gridX(col) + gridX(col + 1)) / 2;
    this.cy = (gridY(row) + gridY(row + 1)) / 2;
    if (typeof (scene.add as { graphics?: () => Phaser.GameObjects.Graphics }).graphics === 'function') {
      this.graphics = scene.add.graphics();
      this.graphics.setDepth(1);
    }
  }

  /** Count of adjacent Mana Conduit towers — Chebyshev distance ≤ 1 of
   *  any of the 2x2 footprint cells. The same tower counted at most
   *  once even if it sits adjacent to multiple footprint cells.
   *
   *  Only `arcane_conduit` contributes — the player keeps their full
   *  Arcane kit (Bolt / Frost / Storm / Mana Drain / Meteor / Nova)
   *  for actual defense and dedicates conduit placements to summoning. */
  chargeContribution(towers: Tower[]): number {
    let count = 0;
    const seen = new Set<Tower>();
    for (const t of towers) {
      if (seen.has(t)) continue;
      if (t.typeId !== 'arcane_conduit') continue;
      // Chebyshev distance to closest footprint cell.
      const dc = Math.max(0, Math.abs(t.col - (this.col + 0.5)) - 0.5);
      const dr = Math.max(0, Math.abs(t.row - (this.row + 0.5)) - 0.5);
      if (Math.max(dc, dr) <= 1) {
        count++;
        seen.add(t);
      }
    }
    return count;
  }

  /** Render the ring + charge fill. Called each frame from
   *  FinaleController so the visual always reflects the live shared
   *  charge value. */
  draw(charge: number): void {
    if (!this.graphics) return;
    const g = this.graphics;
    g.clear();
    const radius = TILE_SIZE * 1.05;
    // Ring background
    g.lineStyle(3, 0x442266, 0.55);
    g.strokeCircle(this.cx, this.cy, radius);
    // Charge fill — clockwise arc from top.
    const pct = Math.max(0, Math.min(1, charge));
    if (pct > 0) {
      // Phaser arc: start at top (-PI/2), sweep clockwise by 2*PI*pct.
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * pct;
      g.lineStyle(4, 0xcc88ff, 0.95);
      g.beginPath();
      g.arc(this.cx, this.cy, radius, startAngle, endAngle, false);
      g.strokePath();
    }
    // Inner glow when fully charged
    if (pct >= 1) {
      g.fillStyle(0xcc88ff, 0.18);
      g.fillCircle(this.cx, this.cy, radius * 0.7);
    }
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
