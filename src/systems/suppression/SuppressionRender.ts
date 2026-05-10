/**
 * Phaser-side render for Voss's Suppression Pylons. Draws each pylon
 * tile + its radius outline + (when relevant) a channel-progress
 * ring above it. Cleared and redrawn each frame from a single
 * `Phaser.GameObjects.Graphics` instance.
 *
 * Headless-unfriendly. GameScene constructs one alongside the
 * SuppressionManager.
 */

import * as Phaser from 'phaser';
import { TILE_SIZE, gridX, gridY } from '../../config';
import type { SuppressionManager } from './SuppressionManager';
import type { SuppressionPylon } from '../../entities/SuppressionPylon';

const PYLON_FILL = 0x4a2a6a;            // dark violet
const PYLON_FILL_MUTED = 0x2a1a3a;      // dimmed when muted
const PYLON_OUTLINE = 0xcc88ff;
const FIELD_OUTLINE_ACTIVE = 0xcc88ff;
const FIELD_OUTLINE_MUTED = 0x553366;
const CHANNEL_RING = 0xffdd44;

export class SuppressionRender {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(17);
  }

  update(mgr: SuppressionManager, now: number): void {
    this.gfx.clear();
    const channelDuration = mgr.getChannelDurationMs();
    for (const pylon of mgr.pylons) {
      this.drawPylon(pylon, now, channelDuration);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }

  private drawPylon(p: SuppressionPylon, now: number, channelDurationMs: number): void {
    const x = gridX(p.col);
    const y = gridY(p.row);
    const active = p.isActive(now);

    // Field-of-effect outline — circle (visual cue that the radius is
    // square would lie about Chebyshev's actual cell coverage, but a
    // circle is much easier to read at a glance).
    this.gfx.lineStyle(1, active ? FIELD_OUTLINE_ACTIVE : FIELD_OUTLINE_MUTED, active ? 0.45 : 0.2);
    this.gfx.strokeCircle(x, y, p.radius * TILE_SIZE);

    // Pylon body — diamond / rotated square.
    const half = TILE_SIZE * 0.35;
    this.gfx.fillStyle(active ? PYLON_FILL : PYLON_FILL_MUTED, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(x, y - half);
    this.gfx.lineTo(x + half, y);
    this.gfx.lineTo(x, y + half);
    this.gfx.lineTo(x - half, y);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.lineStyle(1.5, PYLON_OUTLINE, active ? 1 : 0.5);
    this.gfx.strokePath();

    // Channel progress ring — when channeling, draw an arc that fills
    // around the pylon clockwise.
    if (p.channelStartedAt !== null && active) {
      const progress = p.channelProgress(now, channelDurationMs);
      const arc = progress * Math.PI * 2;
      this.gfx.lineStyle(2.5, CHANNEL_RING, 1);
      this.gfx.beginPath();
      this.gfx.arc(x, y, half + 4, -Math.PI / 2, -Math.PI / 2 + arc, false);
      this.gfx.strokePath();
    }
  }
}
