/**
 * Phaser-side render for the Mech finale's player squad. Draws the
 * Workshop building + each alive Raider + HP bars + manual-target
 * indicator into a single `Phaser.GameObjects.Graphics` cleared and
 * redrawn each frame. Placeholder visuals — bespoke sprites are a
 * follow-up.
 *
 * Headless-unfriendly (Phaser-only). GameScene constructs one of
 * these alongside the SabotageController.
 */

import * as Phaser from 'phaser';
import { TILE_SIZE } from '../../config';
import type { SabotageController } from './SabotageController';
import type { Raider } from '../../entities/Raider';

const WORKSHOP_COLOR = 0x6688aa;
const WORKSHOP_OUTLINE = 0xddeeff;
const RAIDER_COLOR = 0xffaa44;
const RAIDER_OUTLINE = 0xffffff;
const RAIDER_RADIUS = 9;
const HP_BAR_WIDTH = 22;
const HP_BAR_HEIGHT = 3;
const HP_BAR_OFFSET_Y = -16;

export class SabotageRender {
  private gfx: Phaser.GameObjects.Graphics;
  private workshopPx: { x: number; y: number };
  /** Optional getter for the player's currently-selected raider, so
   *  the render can highlight it. Returns null when no selection. */
  private getSelected: () => Raider | null;

  constructor(
    scene: Phaser.Scene,
    workshopPixel: { x: number; y: number },
    getSelected: () => Raider | null = () => null,
  ) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(18);
    this.workshopPx = workshopPixel;
    this.getSelected = getSelected;
  }

  /** Redraw everything from scratch each frame. ~50 raiders worst-case
   *  is well under Phaser's graphics budget. */
  update(controller: SabotageController): void {
    this.gfx.clear();
    this.drawWorkshop();
    const selected = this.getSelected();
    for (const r of controller.getRaiders()) {
      this.drawRaider(r, r === selected);
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }

  private drawWorkshop(): void {
    const half = TILE_SIZE * 0.4;
    this.gfx.fillStyle(WORKSHOP_COLOR, 1);
    this.gfx.fillRect(this.workshopPx.x - half, this.workshopPx.y - half, half * 2, half * 2);
    this.gfx.lineStyle(2, WORKSHOP_OUTLINE, 1);
    this.gfx.strokeRect(this.workshopPx.x - half, this.workshopPx.y - half, half * 2, half * 2);
    // Crossed-hammers motif inside the box, hand-drawn in graphics.
    this.gfx.lineStyle(1.5, WORKSHOP_OUTLINE, 0.9);
    this.gfx.beginPath();
    this.gfx.moveTo(this.workshopPx.x - half * 0.6, this.workshopPx.y - half * 0.6);
    this.gfx.lineTo(this.workshopPx.x + half * 0.6, this.workshopPx.y + half * 0.6);
    this.gfx.moveTo(this.workshopPx.x - half * 0.6, this.workshopPx.y + half * 0.6);
    this.gfx.lineTo(this.workshopPx.x + half * 0.6, this.workshopPx.y - half * 0.6);
    this.gfx.strokePath();
  }

  private drawRaider(raider: Raider, isSelected: boolean): void {
    if (!raider.alive) return;
    this.gfx.fillStyle(RAIDER_COLOR, 1);
    this.gfx.fillCircle(raider.x, raider.y, RAIDER_RADIUS);
    this.gfx.lineStyle(isSelected ? 2.5 : 1.5, isSelected ? 0xffffff : RAIDER_OUTLINE, 1);
    this.gfx.strokeCircle(raider.x, raider.y, RAIDER_RADIUS);
    this.drawHpBar(raider);
  }

  private drawHpBar(raider: Raider): void {
    const ratio = Math.max(0, raider.hp / raider.maxHp);
    const x = raider.x - HP_BAR_WIDTH / 2;
    const y = raider.y + HP_BAR_OFFSET_Y;
    this.gfx.fillStyle(0x000000, 0.7);
    this.gfx.fillRect(x - 1, y - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);
    const hpColor = ratio > 0.5 ? 0x44dd66 : ratio > 0.25 ? 0xddaa44 : 0xdd4444;
    this.gfx.fillStyle(hpColor, 1);
    this.gfx.fillRect(x, y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }
}
