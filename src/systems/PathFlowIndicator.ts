/**
 * PathFlowIndicator — animated "flowing gradient" that makes a creep path
 * visually distinct without reading as a creep.
 *
 * Replaces the old single-Arc pip that lerped from entry to exit (which
 * players kept mistaking for an actual creep). Instead, we sample the path
 * at a fixed spacing and redraw every sample each frame as a filled circle
 * with a traveling-wave alpha — bright bands march from start to end, so
 * the whole path glows as a single moving stripe rather than a point.
 *
 * One instance per distinct path on the map (multi-entry maps get several).
 * All samples share a single Phaser.Graphics, so the per-frame cost is a
 * single `clear()` plus ~100 `fillCircle()` calls.
 */
import * as Phaser from 'phaser';
import { gridX, gridY } from '../config';
import type { PathPoint } from './Pathfinding';

export interface PathFlowSample {
  x: number;
  y: number;
  /** Distance along the path in world pixels from the start to this sample. */
  dist: number;
}

/** Sample a path in pixel-space at fixed `spacing`-pixel intervals.
 *  Separated from the class so it can be unit-tested without a Phaser
 *  scene. Exposed for tests via module export; production code only
 *  goes through PathFlowIndicator. */
export function samplePath(path: PathPoint[], spacing: number): PathFlowSample[] {
  const out: PathFlowSample[] = [];
  if (!path || path.length < 2) return out;

  // Walk the path in pixel-space and drop a sample every `spacing`
  // pixels. Carry over the leftover distance between segments so
  // spacing stays even across corners.
  let carry = 0;
  let accumulated = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = gridX(path[i].col);
    const ay = gridY(path[i].row);
    const bx = gridX(path[i + 1].col);
    const by = gridY(path[i + 1].row);
    const dx = bx - ax;
    const dy = by - ay;
    const segLen = Math.hypot(dx, dy);
    if (segLen === 0) continue;
    const ux = dx / segLen;
    const uy = dy / segLen;

    let cursor = carry;
    while (cursor <= segLen) {
      out.push({
        x: ax + ux * cursor,
        y: ay + uy * cursor,
        dist: accumulated + cursor,
      });
      cursor += spacing;
    }
    carry = cursor - segLen;
    accumulated += segLen;
  }
  return out;
}

/** Spacing between sample points in pixels. Lower = denser, prettier, but
 *  more draw calls. ~14 gives a smooth continuous line at any map size. */
const SAMPLE_SPACING = 14;

/** Wavelength of the traveling brightness wave, in pixels along the path.
 *  Tuned by eye so two or three bright bands are visible on a normal map. */
const WAVELENGTH = 180;

/** Wave travel speed (radians of phase per second). Positive = start → end. */
const PHASE_SPEED = 2.8;

/** Base alpha when the indicator is at full brightness (between waves). */
const BRIGHT_ALPHA = 0.42;

/** Alpha during active waves — path stays visible as a reference but
 *  doesn't compete with the creeps moving along it. */
const DIM_ALPHA = 0.12;

/** Alpha during a flash (new path just computed). */
const FLASH_ALPHA = 0.75;

/** How long a flash lasts, in ms. */
const FLASH_DURATION_MS = 550;

/** Base radius of each sample circle. Gets pulsed with the phase so
 *  brighter samples are also slightly larger. */
const SAMPLE_BASE_RADIUS = 2.2;
const SAMPLE_PULSE_RADIUS = 1.4;

/** How sharp the wave crests are — raising the sin-output to this power
 *  narrows the bright bands so there's clear dark space between them. */
const CREST_SHARPNESS = 1.6;

export class PathFlowIndicator {
  private graphics: Phaser.GameObjects.Graphics;
  private samples: PathFlowSample[] = [];
  private time: number = 0;
  private flashUntil: number = 0;

  constructor(
    private scene: Phaser.Scene,
    path: PathPoint[],
    private color: number = 0x88bbff,
  ) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);
    this.rebuildSamples(path);
  }

  /** Re-sample the path (called when the map layout changes mid-match). */
  setPath(path: PathPoint[]): void {
    this.rebuildSamples(path);
  }

  /** Brighten the whole indicator for FLASH_DURATION_MS. Use when a path
   *  has just been recomputed (tower placed / sold). */
  flash(): void {
    this.flashUntil = this.time + FLASH_DURATION_MS / 1000;
  }

  /** Per-frame tick. `dimmed` should be true while a wave is active so the
   *  indicator fades into the background. */
  tick(realDeltaMs: number, dimmed: boolean): void {
    this.time += realDeltaMs / 1000;
    const g = this.graphics;
    g.clear();

    if (this.samples.length === 0) return;

    const flashing = this.time < this.flashUntil;
    const targetBase =
      flashing ? FLASH_ALPHA :
      dimmed   ? DIM_ALPHA   :
                 BRIGHT_ALPHA;

    const phaseRate = PHASE_SPEED * this.time;
    const k = (Math.PI * 2) / WAVELENGTH;

    for (const s of this.samples) {
      // Traveling wave: positive when the crest is passing this sample.
      const raw = Math.sin(phaseRate - s.dist * k);
      if (raw <= 0) continue; // dark trough — skip draw entirely
      const eased = Math.pow(raw, CREST_SHARPNESS);
      const alpha = targetBase * eased;
      const radius = SAMPLE_BASE_RADIUS + SAMPLE_PULSE_RADIUS * eased;
      g.fillStyle(this.color, alpha);
      g.fillCircle(s.x, s.y, radius);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.samples = [];
  }

  // ─── internals ──────────────────────────────────────────

  private rebuildSamples(path: PathPoint[]): void {
    this.samples = samplePath(path, SAMPLE_SPACING);
  }
}
