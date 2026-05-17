/**
 * Arcane-finale trait registrations. Currently one entry — the
 * `arcane_ult_target` trait that marks a tower as the M10 win-target
 * and registers its golden HP-bar border via the v2 overlay-draw
 * pipeline. Future finale-only behaviours (rage-phase modifiers,
 * channel-amplifier visuals, etc.) hang off the same module.
 *
 * Side-effect imported from main.ts.
 */

import { registerOverlayDraw } from '../traits/Trait';
import { TILE_SIZE } from '../../config';
import type { Tower } from '../../entities/Tower';

/** Marks the Arcane M10 throne tower so its HP bar gets a golden
 *  border treatment + kill-reward in FinaleController uses the
 *  ult-tier reward keys. Purely declarative — the rendering effect
 *  lives in the overlay-draw handler below; FinaleController reads
 *  hasTrait(...) for the reward branch. */
export interface ArcaneUltTargetTrait {
  id: 'arcane_ult_target';
}

// Golden HP-bar border overlay. Reads tower.destructible to position
// the bar identically to the base render in Tower.drawTower (same
// pixel offsets); short-circuits when not destructible or HP is full
// (no bar visible, no border to draw on top of nothing).
registerOverlayDraw('arcane_ult_target', (_trait, tower: Tower, graphics) => {
  const d = tower.destructible;
  if (!d || d.maxHp <= 0 || d.hp >= d.maxHp) return;
  const w = TILE_SIZE * 0.8;
  const h = 3;
  const x = tower.x - w / 2;
  const y = tower.y - TILE_SIZE * 0.55;
  graphics.lineStyle(1, 0xffdd44, 1);
  graphics.strokeRect(x, y, w, h);
});
