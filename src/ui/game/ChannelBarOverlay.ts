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
import { getTrait } from '../../systems/traits/Trait';

const BAR_W = 36;
const BAR_H = 5;
const Y_OFFSET = 22;     // pixels above the creep
const MAX_VISIBLE = 3;
const HALO_RADIUS = 18;  // pixels around caster — sized to read past the creep sprite

/** Color per channel effect — keeps caster identity readable.
 *  Palette aligns with the cast's flavor: purple for clear-towers,
 *  gold for buff, blue for chain-lightning, orange for meteor,
 *  deep purple for summon. */
const HALO_COLOR: Record<string, number> = {
  clear_towers_radius: 0xaa44ff,
  buff_next_wave_hp: 0xffd966,
  chain_lightning_on_towers: 0x66ccff,
  permadebuff_player_towers: 0xff44aa,
  meteor_drop: 0xff8844,
  summon_creeps_at_position: 0xaa44dd,
  default: 0xff66ff,
};

export class ChannelBarOverlay {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  /** HUD text that shows the active channel HP-buff percent. Lazy-
   *  created on first non-zero buff so non-Counterspell scenes pay
   *  nothing. Pulses gold so it reads as "active threat." */
  private buffText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(45);
  }

  update(): void {
    this.graphics.clear();
    const time = this.scene.time?.now ?? 0;
    this.updateBuffReadout(time);

    // First pass: halos around every caster creep (whether channeling or
    // not). Reads scene.creeps and finds any with the `channel_caster`
    // trait. Without this, casters look identical to standard creeps
    // until their channel-bar appears 1+ seconds after spawn.
    const creeps: any[] = (this.scene as any).creeps ?? [];
    for (const creep of creeps) {
      if (!creep || creep.alive === false || !creep.traits) continue;
      const trait = getTrait(creep.traits, 'channel_caster');
      if (!trait) continue;
      this.drawHalo(creep, trait, time);
    }

    // Second pass: channel bars for active channels.
    const sys = ChannelSystem.peek(this.scene);
    if (!sys) return;
    const all = sys.listActive();
    const ranked = all
      .filter(c => c.caster && c.caster.alive !== false)
      .sort((a, b) => (b.elapsed / b.duration) - (a.elapsed / a.duration))
      .slice(0, MAX_VISIBLE);
    for (const chan of ranked) {
      this.drawBar(chan);
    }
  }

  /** HUD readout for the cumulative `_channelHpBuff` set by the
   *  Scribe's buff_next_wave_hp effect. Pulses gold when active so the
   *  player sees the cause of inflated wave HP bars. */
  private updateBuffReadout(time: number): void {
    const buff = ((this.scene as any)._channelHpBuff as number | undefined) ?? 0;
    if (buff <= 0) {
      if (this.buffText) {
        this.buffText.setVisible(false);
      }
      return;
    }
    if (!this.buffText) {
      const cam = this.scene.cameras?.main;
      const x = (cam?.width ?? 800) / 2;
      const y = 28;
      this.buffText = this.scene.add.text(x, y, '', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(60).setScrollFactor(0);
    }
    const pct = Math.round(buff * 100);
    this.buffText.setText(`☠ Channel buff: +${pct}% creep HP`);
    const pulse = 0.85 + 0.15 * Math.sin(time / 240);
    this.buffText.setAlpha(pulse);
    this.buffText.setVisible(true);
  }

  private drawHalo(creep: any, trait: any, time: number): void {
    if (typeof creep.x !== 'number' || typeof creep.y !== 'number') return;
    const effectId = trait.effectId ?? 'default';
    const color = HALO_COLOR[effectId] ?? HALO_COLOR.default;
    // Subtle pulse so it reads as "channel-pending," not just decoration.
    const pulse = 0.55 + 0.25 * Math.sin(time / 280);
    this.graphics.lineStyle(2, color, pulse);
    this.graphics.strokeCircle(creep.x, creep.y, HALO_RADIUS);
    // Dim inner ring for depth.
    this.graphics.lineStyle(1, color, pulse * 0.5);
    this.graphics.strokeCircle(creep.x, creep.y, HALO_RADIUS - 4);
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
    this.buffText?.destroy();
    this.buffText = null;
  }
}
