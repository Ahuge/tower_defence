/**
 * Phaser-side render for the Mech finale's player squad.
 *
 *   - Workshop: static `scene.add.image` placed once at construction.
 *   - Raiders: per-raider Phaser sprite created in onRaiderSpawned and
 *     destroyed in onRaiderDied. Walk-frame advanced per tick. Drawn
 *     onto a graphics overlay for the HP bar + selection-ring (those
 *     are dynamic, cheap to redraw).
 *   - Generators / Throne: their sprite textures are swapped by
 *     SabotageController at placement time. This render layer updates
 *     their damage-tier frames per tick.
 *
 * Headless-unfriendly (Phaser-only).
 */

import * as Phaser from 'phaser';
import type { SabotageController } from './SabotageController';
import type { Raider } from '../../entities/Raider';
import {
  WORKSHOP_TEXTURE,
  RAIDER_TEXTURE,
  GENERATOR_TEXTURE,
  VOSS_THRONE_TEXTURE,
  generatorFrameForHp,
  throneFrameForHp,
} from './SabotageAssets';

const HP_BAR_WIDTH = 22;
const HP_BAR_HEIGHT = 3;
const HP_BAR_OFFSET_Y = -22;
const RAIDER_SELECTED_OUTLINE = 0xffffff;
const RAIDER_SELECTED_RADIUS = 14;
/** Walk-cycle cadence — ms per frame. Slow enough that the four-frame
 *  shuffle reads as a steady stride at the raider's default 90 px/s. */
const WALK_FRAME_MS = 150;
/** Forge-orange tint for the generator → linked-tower power lines. */
const POWER_LINE_COLOR = 0xff8844;
/** Period (ms) for the power-line pulse animation along each link. */
const POWER_LINE_PULSE_MS = 1500;

export class SabotageRender {
  private gfx: Phaser.GameObjects.Graphics;
  private workshopSprite: Phaser.GameObjects.Image;
  private raiderSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private getSelected: () => Raider | null;
  private scene: Phaser.Scene;
  private walkClock = 0;

  constructor(
    scene: Phaser.Scene,
    workshopPixel: { x: number; y: number },
    getSelected: () => Raider | null = () => null,
  ) {
    this.scene = scene;
    this.getSelected = getSelected;
    // HP-bar + selection-ring overlays live on a graphics layer that
    // sits above the sprite layer; raiders + workshop are real
    // sprite/image GameObjects.
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(19);
    this.workshopSprite = scene.add.image(workshopPixel.x, workshopPixel.y, WORKSHOP_TEXTURE);
    this.workshopSprite.setDepth(15);
  }

  /** Per-frame tick: advance walk anim, sync per-raider sprite
   *  positions, prune stale raider sprites, refresh damage-tier
   *  frames on generators + throne, redraw HP bars / selection rings,
   *  and trace power-lines from each live generator to its linked
   *  CPU towers (telegraphs the cascade-kill relationship). */
  update(controller: SabotageController, deltaMs = 0, now = 0): void {
    this.walkClock = (this.walkClock + deltaMs) % (WALK_FRAME_MS * 4);
    const walkFrame = Math.floor(this.walkClock / WALK_FRAME_MS);
    this.syncRaiderSprites(controller, walkFrame);
    this.syncDamageFrames(controller);
    this.drawOverlays(controller, now);
  }

  destroy(): void {
    this.gfx.destroy();
    this.workshopSprite.destroy();
    for (const s of this.raiderSprites.values()) s.destroy();
    this.raiderSprites.clear();
  }

  // ─── RAIDER SPRITE LIFECYCLE ──────────────────────────────

  private syncRaiderSprites(controller: SabotageController, walkFrame: number): void {
    const live = controller.getRaiders();
    const liveIds = new Set<number>();
    for (const r of live) {
      liveIds.add(r.id);
      if (!r.alive) continue;
      let s = this.raiderSprites.get(r.id);
      if (!s) {
        s = this.scene.add.sprite(r.x, r.y, RAIDER_TEXTURE, 0);
        s.setDepth(17);
        this.raiderSprites.set(r.id, s);
      }
      s.setPosition(r.x, r.y);
      s.setFrame(walkFrame);
    }
    // Sweep dead / pruned raiders. Controller has already removed
    // dead raiders from its list, so any raiderSprites key not in
    // liveIds is orphaned.
    for (const [id, s] of this.raiderSprites) {
      if (!liveIds.has(id)) {
        s.destroy();
        this.raiderSprites.delete(id);
      }
    }
  }

  // ─── GENERATOR / THRONE DAMAGE-FRAME SYNC ─────────────────

  private syncDamageFrames(controller: SabotageController): void {
    for (const gen of controller.getGenerators()) {
      if (gen._expired) continue;
      if (!gen.sprite || gen.maxHp === undefined || gen.hp === undefined) continue;
      gen.sprite.setFrame(generatorFrameForHp(gen.hp / gen.maxHp));
    }
    const throne = controller.getThrone();
    if (throne && throne.sprite && throne.maxHp !== undefined && throne.hp !== undefined) {
      // F0 — "shield up". The throne is invulnerable while any
      // generator is alive, so F0 stays pinned until SabotageController
      // flips _invulnerable. Once mortal, frame tracks HP.
      const frame = throne._invulnerable ? 0 : throneFrameForHp(throne.hp / throne.maxHp);
      throne.sprite.setFrame(frame);
    }
  }

  // ─── HP BARS + SELECTION RING + POWER LINES ──────────────

  private drawOverlays(controller: SabotageController, now: number): void {
    this.gfx.clear();
    this.drawGeneratorPowerLines(controller, now);
    const selected = this.getSelected();
    for (const r of controller.getRaiders()) {
      if (!r.alive) continue;
      if (r === selected) this.drawSelectionRing(r);
      this.drawHpBar(r);
    }
  }

  /** For each live generator, trace a thin forge-orange line to every
   *  linked CPU tower. A bright pulse cycles along each link to
   *  reinforce direction-of-flow. Players learn "this generator powers
   *  these towers" by looking, instead of by surprise when a generator
   *  death cascade-kills a cluster. */
  private drawGeneratorPowerLines(controller: SabotageController, now: number): void {
    for (const gen of controller.getGenerators()) {
      if (gen._expired) continue;
      if (gen.hp !== undefined && gen.hp <= 0) continue;
      const cells = gen.generatorLinkedCells ?? [];
      if (cells.length === 0) continue;
      // HP-scaled alpha so the visual fades as the generator weakens
      // (a hint that the link is about to break).
      const hpRatio = gen.maxHp ? Math.max(0, (gen.hp ?? 0) / gen.maxHp) : 1;
      const baseAlpha = 0.25 + 0.25 * hpRatio;
      for (const cell of cells) {
        const target = controller.findCpuTowerAt(cell.col, cell.row);
        if (!target || target._expired) continue;
        // Static line.
        this.gfx.lineStyle(1, POWER_LINE_COLOR, baseAlpha);
        this.gfx.beginPath();
        this.gfx.moveTo(gen.x, gen.y);
        this.gfx.lineTo(target.x, target.y);
        this.gfx.strokePath();
        // Pulse dot — one bright pixel that walks from generator to
        // target on a 1.5s cycle so the player can see which way the
        // power is flowing.
        const t = (now % POWER_LINE_PULSE_MS) / POWER_LINE_PULSE_MS;
        const px = gen.x + (target.x - gen.x) * t;
        const py = gen.y + (target.y - gen.y) * t;
        this.gfx.fillStyle(POWER_LINE_COLOR, Math.min(1, baseAlpha + 0.4));
        this.gfx.fillCircle(px, py, 2);
      }
    }
  }

  private drawSelectionRing(r: Raider): void {
    this.gfx.lineStyle(2, RAIDER_SELECTED_OUTLINE, 0.9);
    this.gfx.strokeCircle(r.x, r.y, RAIDER_SELECTED_RADIUS);
  }

  private drawHpBar(r: Raider): void {
    const ratio = Math.max(0, r.hp / r.maxHp);
    const x = r.x - HP_BAR_WIDTH / 2;
    const y = r.y + HP_BAR_OFFSET_Y;
    this.gfx.fillStyle(0x000000, 0.7);
    this.gfx.fillRect(x - 1, y - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);
    const hpColor = ratio > 0.5 ? 0x44dd66 : ratio > 0.25 ? 0xddaa44 : 0xdd4444;
    this.gfx.fillStyle(hpColor, 1);
    this.gfx.fillRect(x, y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }
}
