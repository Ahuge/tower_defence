/**
 * Phaser-side render for Voss's Suppression Pylons. Each pylon is a
 * single Phaser sprite with its frame swapped per tick based on
 * pylon state (active pulse loop / channeling / muted). The
 * field-of-effect circle + clockwise channel-progress arc stay as
 * graphics overlays since they're continuously valued.
 *
 * Headless-unfriendly. GameScene constructs one alongside the
 * SuppressionManager.
 */

import * as Phaser from 'phaser';
import { TILE_SIZE, gridX, gridY } from '../../config';
import type { SuppressionManager } from './SuppressionManager';
import type { SuppressionPylon } from '../../entities/SuppressionPylon';
import { SUPPRESSION_PYLON_TEXTURE } from '../sabotage/SabotageAssets';

const FIELD_OUTLINE_ACTIVE = 0xcc88ff;
const FIELD_OUTLINE_MUTED  = 0x553366;
const CHANNEL_RING         = 0xffdd44;
const PULSE_PERIOD_MS      = 1000;  // 4 frames × 250ms = 1s breath cycle

export class SuppressionRender {
  private gfx: Phaser.GameObjects.Graphics;
  private pylonSprites = new Map<SuppressionPylon, Phaser.GameObjects.Sprite>();
  private scene: Phaser.Scene;
  private pulseClock = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(17);
  }

  update(mgr: SuppressionManager, now: number, deltaMs = 0): void {
    this.pulseClock = (this.pulseClock + deltaMs) % PULSE_PERIOD_MS;
    this.gfx.clear();
    const channelDuration = mgr.getChannelDurationMs();
    for (const pylon of mgr.pylons) {
      this.syncSprite(pylon, now, channelDuration);
      this.drawFieldAndChannel(pylon, now, channelDuration);
    }
  }

  destroy(): void {
    this.gfx.destroy();
    for (const s of this.pylonSprites.values()) s.destroy();
    this.pylonSprites.clear();
  }

  /** Frame index from pylon state. 0-3 active loop, 4-5 channeling
   *  (advancement-keyed), 6-7 muted (slow alternation). */
  private pylonFrame(p: SuppressionPylon, now: number, channelDurationMs: number): number {
    const active = p.isActive(now);
    if (!active) {
      // Muted alternation — slow 800ms-per-frame flicker.
      return 6 + (Math.floor(now / 800) % 2);
    }
    if (p.isChanneling(now, channelDurationMs)) {
      // Channel progress maps to F4..F5.
      const advancement = p.channelProgress(now, channelDurationMs);
      return advancement < 0.5 ? 4 : 5;
    }
    // Active pulse loop — cycles every PULSE_PERIOD_MS.
    return Math.floor((this.pulseClock / PULSE_PERIOD_MS) * 4) % 4;
  }

  private syncSprite(pylon: SuppressionPylon, now: number, channelDurationMs: number): void {
    let sprite = this.pylonSprites.get(pylon);
    if (!sprite) {
      sprite = this.scene.add.sprite(gridX(pylon.col), gridY(pylon.row), SUPPRESSION_PYLON_TEXTURE, 0);
      sprite.setDepth(15);
      this.pylonSprites.set(pylon, sprite);
    }
    sprite.setFrame(this.pylonFrame(pylon, now, channelDurationMs));
  }

  private drawFieldAndChannel(p: SuppressionPylon, now: number, channelDurationMs: number): void {
    const x = gridX(p.col);
    const y = gridY(p.row);
    const active = p.isActive(now);
    // Field-of-effect outline circle — visualises the stress radius.
    this.gfx.lineStyle(1, active ? FIELD_OUTLINE_ACTIVE : FIELD_OUTLINE_MUTED, active ? 0.45 : 0.2);
    this.gfx.strokeCircle(x, y, p.radius * TILE_SIZE);
    // Channel progress ring — only while channeling, active state.
    if (p.channelStartedAt !== null && active) {
      const progress = p.channelProgress(now, channelDurationMs);
      const arc = progress * Math.PI * 2;
      const ringR = TILE_SIZE * 0.5 + 4;
      this.gfx.lineStyle(2.5, CHANNEL_RING, 1);
      this.gfx.beginPath();
      this.gfx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + arc, false);
      this.gfx.strokePath();
    }
  }
}
