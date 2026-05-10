/**
 * SuppressionPylon — Voss's anti-arcane device. Sits at a fixed grid
 * cell, projects a square radius of "stress" that disrupts every
 * player tower inside it. Cannot be destroyed; the player can
 * channel the pylon to mute it for a window.
 *
 * Owned by SuppressionManager, instantiated from `MapDefinition.
 * suppressionPylons` at scene init. Pure data + a couple of helpers
 * — no Phaser dependencies on this side, the manager handles
 * rendering + input.
 */

export interface SuppressionPylonInit {
  col: number;
  row: number;
  /** Chebyshev tile radius. Default 5 — covers a 11×11 square. */
  radius?: number;
}

export class SuppressionPylon {
  readonly col: number;
  readonly row: number;
  readonly radius: number;

  /** Wall-clock ms (Phaser scene `time.now`) until which the pylon is
   *  muted. While `time < mutedUntil` the pylon contributes no stress
   *  and renders as dimmed. */
  mutedUntil: number = 0;

  constructor(init: SuppressionPylonInit) {
    this.col = init.col;
    this.row = init.row;
    this.radius = init.radius ?? 5;
  }

  isActive(now: number): boolean {
    return now >= this.mutedUntil;
  }

  /** Mute this pylon for `durationMs` starting at `now`. Idempotent
   *  in the sense that calling again with a later end-time extends
   *  the mute; calling with an earlier end-time is a no-op. */
  mute(now: number, durationMs: number): void {
    const end = now + durationMs;
    if (end > this.mutedUntil) this.mutedUntil = end;
  }

  /** Chebyshev distance check on tile coordinates. */
  contains(col: number, row: number): boolean {
    return Math.abs(col - this.col) <= this.radius
      && Math.abs(row - this.row) <= this.radius;
  }
}
