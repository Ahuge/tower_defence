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
import { SUMMONING_CIRCLE_KEY, summoningCircleFrame } from '../systems/ArenaFloorRenderer';

export class SummoningCircle {
  /** Top-left grid coordinate of the 2x2 footprint. */
  col: number;
  row: number;
  /** Pixel center of the 2x2 footprint — used for VFX + spawn anchor math. */
  cx: number;
  cy: number;

  /** Sprite-based render (PRD 04 art). Falls back to Graphics when
   *  the sheet hasn't been preloaded (headless scene / missing asset). */
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private lastFrame: number = -1;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    this.col = col;
    this.row = row;
    this.cx = (gridX(col) + gridX(col + 1)) / 2;
    this.cy = (gridY(row) + gridY(row + 1)) / 2;
    // Try sprite first — only available in real Phaser scenes.
    const textures = (scene as { textures?: { exists: (k: string) => boolean } }).textures;
    const addSprite = (scene as { add?: { sprite?: (...a: unknown[]) => Phaser.GameObjects.Sprite } }).add?.sprite;
    if (textures?.exists(SUMMONING_CIRCLE_KEY) && typeof addSprite === 'function') {
      this.sprite = addSprite.call(scene.add, this.cx, this.cy, SUMMONING_CIRCLE_KEY, 0);
      this.sprite.setDepth(1);
      // Sprite is 56x56 = exactly 2x2 tiles. Center origin so it
      // anchors at the footprint center (this.cx, this.cy).
      this.sprite.setOrigin?.(0.5, 0.5);
    } else if (typeof (scene.add as { graphics?: () => Phaser.GameObjects.Graphics }).graphics === 'function') {
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

  /** Render the circle at its current charge state. Sprite path picks
   *  one of 10 charge frames; Graphics path is the legacy fallback
   *  for headless / missing-asset states. */
  draw(charge: number): void {
    if (this.sprite) {
      const frame = summoningCircleFrame(charge);
      if (frame !== this.lastFrame) {
        this.sprite.setFrame(frame);
        this.lastFrame = frame;
      }
      return;
    }
    // Graphics fallback (headless / missing asset)
    if (!this.graphics) return;
    const g = this.graphics;
    g.clear();
    const radius = TILE_SIZE * 1.05;
    g.lineStyle(3, 0x442266, 0.55);
    g.strokeCircle(this.cx, this.cy, radius);
    const pct = Math.max(0, Math.min(1, charge));
    if (pct > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * pct;
      g.lineStyle(4, 0xcc88ff, 0.95);
      g.beginPath();
      g.arc(this.cx, this.cy, radius, startAngle, endAngle, false);
      g.strokePath();
    }
    if (pct >= 1) {
      g.fillStyle(0xcc88ff, 0.18);
      g.fillCircle(this.cx, this.cy, radius * 0.7);
    }
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
