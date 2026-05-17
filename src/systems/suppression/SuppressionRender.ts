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
import { SIPHON_STACK_THRESHOLD, type SuppressionManager } from './SuppressionManager';
import type { SuppressionPylon } from '../../entities/SuppressionPylon';
import { SUPPRESSION_PYLON_TEXTURE } from '../sabotage/SabotageAssets';
import type { Tower } from '../../entities/Tower';

const FIELD_OUTLINE_ACTIVE = 0xcc88ff;
const FIELD_OUTLINE_MUTED  = 0x553366;
const CHANNEL_RING         = 0xffdd44;
const CHANNEL_START_FLASH  = 0xffeebb;
const PULSE_PERIOD_MS      = 1000;  // 4 frames × 250ms = 1s breath cycle
/** Duration of the "channel just started" flash in ms. */
const CHANNEL_START_FLASH_MS = 220;
/** Stack dot palette — forge-blue (matches Mana Drain projectile). */
const STACK_DOT_FILLED = 0x44aaff;
const STACK_DOT_EMPTY  = 0x223344;

export class SuppressionRender {
  private gfx: Phaser.GameObjects.Graphics;
  private pylonSprites = new Map<SuppressionPylon, Phaser.GameObjects.Sprite>();
  private scene: Phaser.Scene;
  private pulseClock = 0;
  /** Per-pylon flash timer state — when the channel began (so the
   *  renderer can show a fading flash without polling the manager). */
  private flashStartedAt = new WeakMap<SuppressionPylon, number>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(17);
  }

  update(mgr: SuppressionManager, now: number, deltaMs = 0, towers: Tower[] = []): void {
    this.pulseClock = (this.pulseClock + deltaMs) % PULSE_PERIOD_MS;
    this.gfx.clear();
    const channelDuration = mgr.getChannelDurationMs();
    for (const pylon of mgr.pylons) {
      this.syncSprite(pylon, now, channelDuration);
      this.drawFieldAndChannel(pylon, now, channelDuration);
      this.drawStackDots(pylon, now);
    }
    // Per-tower suppression indicator — violet dust above any tower
    // accumulating stress. Lets the player see "this tower is being
    // suppressed" without having to notice the missed shots.
    if (towers.length > 0) {
      this.drawSuppressionIndicators(towers, now);
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

  /** Draw a small violet sparkle above each tower with active stress.
   *  Brightness scales with stress level (0 → 5 stacks). Players see
   *  the suppression building up instead of being blindsided by a
   *  sudden 3s stall on the 5th shot. */
  private drawSuppressionIndicators(towers: Tower[], now: number): void {
    for (const t of towers) {
      if (t._expired) continue;
      if ((t.ownerIndex ?? 0) !== 0) continue;
      const stress = t._stress;
      if (stress <= 0) continue;
      // Intensity rises 0..1 across the 5 stress stacks.
      const intensity = Math.min(1, stress / 5);
      const alpha = 0.4 + 0.5 * intensity;
      const dustColor = 0xcc88ff;
      const cx = t.x;
      const cy = t.y - TILE_SIZE * 0.55;
      // Two small dust pixels, slightly offset, jitter per-frame using
      // `now` so the dust feels alive instead of static.
      const jitter = (Math.floor(now / 80) % 4) - 2; // -2..1
      this.gfx.fillStyle(dustColor, alpha);
      this.gfx.fillRect(cx - 2 + jitter, cy, 2, 2);
      this.gfx.fillRect(cx + 1 - jitter, cy + 2, 2, 2);
      // At high stress, add a 3rd glow + a brighter halo so the player
      // sees "this one's about to stall."
      if (intensity >= 0.6) {
        this.gfx.fillStyle(0xeebbff, alpha);
        this.gfx.fillRect(cx, cy - 2, 2, 2);
      }
    }
  }

  /** Render `SIPHON_STACK_THRESHOLD` small dots above the pylon —
   *  filled forge-blue for accumulated stacks, dim for empty. Reads
   *  cleanly at a glance: "this pylon is 3/5 of the way to a mute."
   *  Hidden while muted (no stacks during the mute window). */
  private drawStackDots(p: SuppressionPylon, now: number): void {
    if (!p.isActive(now) && p.siphonStacks === 0) return;
    const stacks = p.siphonStacks;
    const cx = gridX(p.col);
    const cy = gridY(p.row) - TILE_SIZE * 0.7;
    const dotR = 1.7;
    const spacing = 5;
    const totalW = (SIPHON_STACK_THRESHOLD - 1) * spacing;
    const startX = cx - totalW / 2;
    for (let i = 0; i < SIPHON_STACK_THRESHOLD; i++) {
      const x = startX + i * spacing;
      const filled = i < stacks;
      const color = filled ? STACK_DOT_FILLED : STACK_DOT_EMPTY;
      const alpha = filled ? 1 : 0.55;
      this.gfx.fillStyle(color, alpha);
      this.gfx.fillCircle(x, cy, dotR);
    }
  }

  private drawFieldAndChannel(p: SuppressionPylon, now: number, channelDurationMs: number): void {
    const x = gridX(p.col);
    const y = gridY(p.row);
    const active = p.isActive(now);
    const fullRadius = p.radius * TILE_SIZE;
    // Field-of-effect outline circle.
    //
    // - Active: full radius at moderate alpha, violet — "the pylon is
    //   currently suppressing inside this area."
    // - Muted: the circle SHRINKS inward over the mute duration,
    //   acting as a countdown — full radius at start of mute, zero
    //   when the mute is about to expire. Players see a clear
    //   "the field is closing in again, channel another or move."
    let renderRadius = fullRadius;
    let outlineColor = FIELD_OUTLINE_ACTIVE;
    let outlineAlpha = 0.45;
    if (!active) {
      const remainingMs = Math.max(0, p.mutedUntil - now);
      // Map remaining-mute-time onto [0, fullRadius]. Visible from full
      // size (just muted) down to tiny (about to re-activate).
      const muteWindow = 15_000; // matches DEFAULT_CHANNEL_MS in SuppressionManager
      const ratio = Math.min(1, remainingMs / muteWindow);
      renderRadius = fullRadius * ratio;
      outlineColor = FIELD_OUTLINE_MUTED;
      outlineAlpha = 0.3;
    }
    if (renderRadius > 1) {
      this.gfx.lineStyle(1, outlineColor, outlineAlpha);
      this.gfx.strokeCircle(x, y, renderRadius);
    }
    // Channel-start flash — bright golden burst that fades over a
    // short window. Triggered by detecting the leading edge of
    // channelStartedAt (compare against the stored timer).
    if (p.channelStartedAt !== null) {
      const stored = this.flashStartedAt.get(p);
      if (stored !== p.channelStartedAt) {
        this.flashStartedAt.set(p, p.channelStartedAt);
      }
    }
    const flashStart = this.flashStartedAt.get(p);
    if (flashStart !== undefined) {
      const flashElapsed = now - flashStart;
      if (flashElapsed >= 0 && flashElapsed <= CHANNEL_START_FLASH_MS) {
        const flashAlpha = 1 - flashElapsed / CHANNEL_START_FLASH_MS;
        const flashR = TILE_SIZE * 0.5 + 6 + flashElapsed * 0.04;
        this.gfx.lineStyle(2, CHANNEL_START_FLASH, flashAlpha);
        this.gfx.strokeCircle(x, y, flashR);
      }
    }
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
