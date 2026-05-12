/**
 * SuppressionManager — owns the set of Suppression Pylons placed on a
 * mission map and applies their stress effect to player towers each
 * tick.
 *
 * Algorithm: poll each tower's `lastFired` against a remembered
 * timestamp. If a tower fired since the last tick AND it sits inside
 * any active (non-muted) pylon's tile radius, increment its `_stress`
 * counter. At `STRESS_THRESHOLD` the tower stalls via the existing
 * `_disabledRemaining` mechanism (3s, identical pattern to the
 * Stormcaller chain-lightning channel) and stress resets to 0.
 *
 * Towers outside any pylon are untouched — same fire rate, same
 * everything. Stress does not decay otherwise; once a fast-firing
 * tower starts accumulating it commits to the stall. Slow-firing
 * towers naturally accumulate slowly, which is the design intent.
 *
 * Channel is the player's counter — calling `mutePylonAt(col, row,
 * now, durationMs)` mutes any pylon whose center matches the cell.
 * GameScene wires this up to the click-to-channel input.
 */

import { SuppressionPylon, type SuppressionPylonInit } from '../../entities/SuppressionPylon';

/** Outcome of a `startChannelAt` call. Lets the caller render
 *  distinct feedback per failure mode without re-querying pylon
 *  state. */
export type ChannelStartResult = 'started' | 'no_pylon' | 'already_muted' | 'already_channeling';

/** Player tower contract — the manager only reads what it needs. */
export interface SuppressibleTower {
  col: number;
  row: number;
  lastFired: number;
  _expired?: boolean;
  _stress: number;
  _disabledRemaining: number;
  /** Per-tower state the manager tracks — last `lastFired` value it
   *  observed. -Infinity = never. Tower declares this default. */
  _suppressionSeenLastFired: number;
  /** Defenders / CPU towers (M10) shouldn't be suppressed by Voss's
   *  own pylons. ownerIndex 0 / undefined = player team. */
  ownerIndex?: number;
}

const STRESS_THRESHOLD = 5;
const STALL_SECONDS = 3;
const DEFAULT_CHANNEL_MS = 15_000;
/** How long the player must hold a channel on a pylon for the mute
 *  to apply. Shorter than the mute itself so channeling feels worth
 *  the time investment. */
const CHANNEL_DURATION_MS = 2_500;

export class SuppressionManager {
  readonly pylons: SuppressionPylon[];

  constructor(pylons: SuppressionPylonInit[]) {
    this.pylons = pylons.map(p => new SuppressionPylon(p));
  }

  /** Per-frame: walk the tower list, bump stress on those that fired
   *  inside an active pylon, and trigger stalls at threshold. Per-
   *  tower bookkeeping (`_suppressionSeenLastFired`) lives on Tower,
   *  matching the codebase's "instance field" convention rather than
   *  a side WeakMap. Also resolves any in-progress player channels
   *  whose duration has elapsed. */
  update(now: number, towers: SuppressibleTower[]): void {
    if (this.pylons.length === 0) return;
    this._resolveChannels(now);
    for (const tower of towers) {
      if (!tower || tower._expired) continue;
      // Only player towers. Voss's own CPU towers (ownerIndex 99)
      // are immune to his own suppression.
      if ((tower.ownerIndex ?? 0) !== 0) continue;

      if (tower.lastFired <= tower._suppressionSeenLastFired) continue;
      tower._suppressionSeenLastFired = tower.lastFired;

      if (!this._inAnyActivePylon(tower, now)) continue;

      tower._stress++;
      if (tower._stress >= STRESS_THRESHOLD) {
        tower._stress = 0;
        tower._disabledRemaining = STALL_SECONDS;
      }
    }
  }

  /** Mute the pylon at the given cell. Returns true if a pylon was
   *  found and muted, false otherwise. */
  mutePylonAt(col: number, row: number, now: number, durationMs = DEFAULT_CHANNEL_MS): boolean {
    const pylon = this.pylons.find(p => p.col === col && p.row === row);
    if (!pylon) return false;
    pylon.mute(now, durationMs);
    return true;
  }

  /** Try to start a channel on the pylon at the given cell. The
   *  return value disambiguates the failure modes so callers can
   *  surface different feedback ("already muted" vs "already
   *  channeling" vs "no pylon") without re-reading pylon state.
   *  If a stale channel (elapsed but not yet resolved by the per-
   *  frame tick — possible after a frame hitch or paused window)
   *  is detected, complete it here so the mute isn't silently
   *  discarded. */
  startChannelAt(col: number, row: number, now: number): ChannelStartResult {
    const pylon = this.pylons.find(p => p.col === col && p.row === row);
    if (!pylon) return 'no_pylon';
    if (pylon.channelStartedAt !== null && now - pylon.channelStartedAt >= CHANNEL_DURATION_MS) {
      pylon.completeChannel(now, DEFAULT_CHANNEL_MS);
      return 'already_muted';
    }
    if (!pylon.isActive(now)) return 'already_muted';
    if (pylon.isChanneling(now, CHANNEL_DURATION_MS)) return 'already_channeling';
    pylon.beginChannel(now);
    return 'started';
  }

  /** Cancel an in-progress channel on the given cell. Returns true
   *  if a channel was actually cancelled. */
  cancelChannelAt(col: number, row: number): boolean {
    const pylon = this.pylons.find(p => p.col === col && p.row === row);
    if (!pylon || pylon.channelStartedAt === null) return false;
    pylon.cancelChannel();
    return true;
  }

  /** UI helper — channel duration in ms, exposed so renderers can
   *  compute progress without a separate constant. */
  getChannelDurationMs(): number {
    return CHANNEL_DURATION_MS;
  }

  /** UI helper — mute window in ms applied on a successful channel. */
  getMuteDurationMs(): number {
    return DEFAULT_CHANNEL_MS;
  }

  private _resolveChannels(now: number): void {
    for (const pylon of this.pylons) {
      if (pylon.channelStartedAt === null) continue;
      if (now - pylon.channelStartedAt < CHANNEL_DURATION_MS) continue;
      pylon.completeChannel(now, DEFAULT_CHANNEL_MS);
    }
  }

  /** True iff the cell is occupied by a pylon (not whether the pylon
   *  is currently active). Used by GameScene's input gate to detect
   *  channel clicks vs other cell interactions. */
  pylonAt(col: number, row: number): SuppressionPylon | null {
    return this.pylons.find(p => p.col === col && p.row === row) ?? null;
  }

  private _inAnyActivePylon(tower: SuppressibleTower, now: number): boolean {
    for (const p of this.pylons) {
      if (!p.isActive(now)) continue;
      if (p.contains(tower.col, tower.row)) return true;
    }
    return false;
  }
}
