/**
 * CollectorBehavior — Snake Eyes M8 boss creep.
 *
 * The Collector is the Dealer's enforcer: a slow, heavy Inheritor-
 * skinned creep that doesn't threaten lives — instead it lobs
 * "tokens" at the player's towers, disabling them temporarily.
 * Defeating the Collector marks SnakeEyesState.collectorDefeatedAt,
 * which cancels next mission's interest charge (one-shot — see
 * DebtTracker.applyMissionStart).
 *
 * This module holds the in-mission state machine + the on-death
 * hook. The actual tower-disable side effect is emitted as a
 * `CollectorDisableEvent` for GameScene to apply (the trait
 * pipeline routes the per-tick "should fire" check; this module
 * computes the target + duration). Keeps the Phaser-touching code
 * out of here so the module is unit-testable.
 *
 * Design:
 *   - Per-creep state machine, instantiated when a Collector
 *     creep spawns. GameScene constructs one instance and ticks
 *     it from the creep's update handler.
 *   - Fires a token at cadence `tokenIntervalMs`. Each token
 *     picks the NEAREST live tower in range (Chebyshev cells)
 *     and emits a disable event for `disableDurationMs`.
 *   - On Collector death (HP ≤ 0), `onDefeated(missionIdx)`
 *     marks the campaign-wide state. Idempotent.
 *
 * Per-tick contract: `tick(now, towers) → CollectorDisableEvent | null`.
 * Pure function over time + tower list; returns null on idle ticks,
 * an event on a "fire" tick. Caller (GameScene) applies the event.
 */

import { markCollectorDefeated } from './DebtTracker';

/** Trait id stamped on the Collector creep type. The trait carries
 *  the per-Collector tuning values (interval, duration, range)
 *  so a future balance pass can edit data without touching code. */
export const COLLECTOR_TRAIT_ID = 'void_collector_disable';

/** Per-tick fire event. The Collector emits one of these whenever
 *  the cooldown elapses + there's a target in range. GameScene
 *  reads `towerId` + `disableDurationMs` and applies the disable. */
export interface CollectorDisableEvent {
  /** Stable id of the targeted tower (Tower.id when towers gain
   *  stable ids; for now this is the index supplied by the caller). */
  towerId: number;
  /** Duration (ms) the tower should stay disabled. */
  disableDurationMs: number;
  /** Time the event was emitted (caller's clock — for telemetry). */
  emittedAtMs: number;
}

/** Minimal tower contract the behavior reads. Real Tower carries
 *  more; we lean only on position + id + alive-flag. */
export interface CollectorTargetTower {
  id: number;
  col: number;
  row: number;
  alive?: boolean;
}

export interface CollectorBehaviorOptions {
  /** Time between token fires (ms). Defaults to the trait config. */
  tokenIntervalMs?: number;
  /** Duration each fired token disables the target tower for. */
  disableDurationMs?: number;
  /** Max Chebyshev distance (cells) from the Collector to a
   *  candidate tower. Out-of-range towers are skipped. */
  rangeCells?: number;
}

const DEFAULTS: Required<CollectorBehaviorOptions> = {
  tokenIntervalMs: 4000,
  disableDurationMs: 6000,
  rangeCells: 6,
};

/** Per-Collector state machine. */
export class CollectorBehavior {
  private readonly tokenIntervalMs: number;
  private readonly disableDurationMs: number;
  private readonly rangeCells: number;
  /** Time of the next token fire (ms). Initialised on first tick. */
  private _nextFireAt: number | null = null;
  /** True after onDefeated has marked the campaign state — guards
   *  the idempotent "kill twice" edge case. */
  private _defeated: boolean = false;

  constructor(opts: CollectorBehaviorOptions = {}) {
    this.tokenIntervalMs   = opts.tokenIntervalMs   ?? DEFAULTS.tokenIntervalMs;
    this.disableDurationMs = opts.disableDurationMs ?? DEFAULTS.disableDurationMs;
    this.rangeCells        = opts.rangeCells        ?? DEFAULTS.rangeCells;
  }

  /** Per-tick update. Returns a disable event if the cooldown
   *  elapsed AND there's a live tower in range; null otherwise.
   *
   *  `collector` is the Collector creep's current cell position.
   *  `towers` is the list of player towers; the nearest live one
   *  in range gets the token.
   *
   *  Idle when defeated. */
  tick(now: number, collector: { col: number; row: number }, towers: readonly CollectorTargetTower[]): CollectorDisableEvent | null {
    if (this._defeated) return null;

    // First tick: schedule the first fire one interval out (the
    // Collector takes a moment to wind up before lobbing).
    if (this._nextFireAt === null) {
      this._nextFireAt = now + this.tokenIntervalMs;
      return null;
    }

    if (now < this._nextFireAt) return null;

    // Cooldown elapsed — find a target.
    const target = this._pickNearestTowerInRange(collector, towers);
    // Schedule the next fire whether or not we hit (don't backlog;
    // if no targets in range, just skip and try next interval).
    this._nextFireAt = now + this.tokenIntervalMs;
    if (!target) return null;

    return {
      towerId: target.id,
      disableDurationMs: this.disableDurationMs,
      emittedAtMs: now,
    };
  }

  /** Called when the Collector creep dies. Marks campaign state +
   *  flips _defeated so further ticks no-op. Idempotent. */
  onDefeated(missionIdx: number): void {
    if (this._defeated) return;
    this._defeated = true;
    markCollectorDefeated(missionIdx);
  }

  /** Test-only inspection of internal state. */
  _isDefeatedForTest(): boolean { return this._defeated; }

  // ─── Targeting ───────────────────────────────────────────────

  private _pickNearestTowerInRange(
    collector: { col: number; row: number },
    towers: readonly CollectorTargetTower[],
  ): CollectorTargetTower | null {
    let best: CollectorTargetTower | null = null;
    let bestDist = Infinity;
    for (const t of towers) {
      if (t.alive === false) continue;
      const dc = Math.abs(t.col - collector.col);
      const dr = Math.abs(t.row - collector.row);
      const dist = Math.max(dc, dr); // Chebyshev
      if (dist > this.rangeCells) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    return best;
  }
}
