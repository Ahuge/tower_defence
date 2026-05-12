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

  /** Wall-clock ms when the player started channeling this pylon, or
   *  null when no channel is active. While channeling, stress is NOT
   *  suppressed — the pylon is still active until the channel
   *  completes (mute applied) or is cancelled. */
  channelStartedAt: number | null = null;

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

  /** True iff a channel is currently in progress (not finished yet). */
  isChanneling(now: number, durationMs: number): boolean {
    return this.channelStartedAt !== null && (now - this.channelStartedAt) < durationMs;
  }

  /** Channel progress in [0, 1], or 0 when no channel is active OR the
   *  channel has already elapsed past its duration. Self-cleaning so
   *  renderers don't depend on the manager having resolved the channel
   *  first — a renderer reading mid-frame won't see a stale `1.0`. */
  channelProgress(now: number, durationMs: number): number {
    if (this.channelStartedAt === null) return 0;
    const elapsed = now - this.channelStartedAt;
    if (elapsed >= durationMs) return 0;
    return Math.max(0, elapsed / durationMs);
  }

  /** Start a channel at `now`. Idempotent — re-calling with a later
   *  start replaces the prior start. Callers should gate on
   *  `isActive` / `isChanneling` for the user-facing rules. */
  beginChannel(now: number): void {
    this.channelStartedAt = now;
  }

  /** Cancel an in-progress channel without applying the mute. */
  cancelChannel(): void {
    this.channelStartedAt = null;
  }

  /** Apply the mute window and clear the channel slot in one call —
   *  used by the manager when a channel's duration has elapsed. */
  completeChannel(now: number, muteDurationMs: number): void {
    this.mute(now, muteDurationMs);
    this.channelStartedAt = null;
  }
}
