/**
 * ChannelBarOverlay — Phaser-based HUD that paints channel-bars above
 * caster creeps (Plan A: Counterspell).
 *
 * Per-creep treatment:
 *  - Active channel: depleting magenta fill bar with a thin frame.
 *    Thicker frame as channel approaches completion.
 *  - Interrupted: brief shatter flash (red), then fades.
 *  - Completed: brief flash (white), then fades.
 *
 * Top-3 visible at once. Beta-tester flagged that 6 simultaneous bars
 * = visual mush; we cap to the 3 closest to completion (most urgent).
 *
 * Usage:
 *   const overlay = new ChannelBarOverlay(scene);
 *   // every frame:
 *   overlay.update();
 *   // on scene shutdown:
 *   overlay.destroy();
 */

import * as Phaser from 'phaser';
import { ChannelSystem, type ChannelInstance } from '../../systems/channels/ChannelSystem';

const BAR_W = 36;
const BAR_H = 5;
const Y_OFFSET = 22;     // pixels above the creep
const MAX_VISIBLE = 3;

export class ChannelBarOverlay {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(45);
  }

  update(): void {
    const sys = ChannelSystem.peek(this.scene);
    if (!sys) {
      this.graphics.clear();
      return;
    }
    const all = sys.listActive();
    // Order by urgency (most-progress-first), keep top 3.
    const ranked = all
      .filter(c => c.caster && c.caster.alive !== false)
      .sort((a, b) => (b.elapsed / b.duration) - (a.elapsed / a.duration))
      .slice(0, MAX_VISIBLE);

    this.graphics.clear();
    for (const chan of ranked) {
      this.drawBar(chan);
    }
  }

  private drawBar(chan: ChannelInstance): void {
    const c = chan.caster;
    if (typeof c.x !== 'number' || typeof c.y !== 'number') return;
    const x = c.x - BAR_W / 2;
    const y = c.y - Y_OFFSET;

    if (chan.interrupted) {
      this.graphics.fillStyle(0xff4444, 0.85);
      this.graphics.fillRect(x, y, BAR_W, BAR_H);
      this.graphics.lineStyle(1, 0xff8888, 1);
      this.graphics.strokeRect(x, y, BAR_W, BAR_H);
      return;
    }
    if (chan.completed) {
      this.graphics.fillStyle(0xffffff, 0.85);
      this.graphics.fillRect(x, y, BAR_W, BAR_H);
      return;
    }

    // Active channel — backdrop + magenta fill scaling with progress.
    this.graphics.fillStyle(0x180828, 0.85);
    this.graphics.fillRect(x, y, BAR_W, BAR_H);
    const progress = Math.min(1, chan.elapsed / chan.duration);
    this.graphics.fillStyle(0xaa44ff, 1);
    this.graphics.fillRect(x, y, BAR_W * progress, BAR_H);
    // Frame thickens as completion nears — readable urgency cue.
    const frameAlpha = 0.5 + progress * 0.5;
    this.graphics.lineStyle(1, 0xff66ff, frameAlpha);
    this.graphics.strokeRect(x, y, BAR_W, BAR_H);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
