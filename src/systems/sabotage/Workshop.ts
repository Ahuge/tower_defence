/**
 * Workshop — the M10 player-side structure. Trains Raider units on a
 * gold + cooldown gate, owns the per-mission upgrade levels, and
 * stamps each newly-trained Raider with the current stats.
 *
 * Pure logic — the entity is constructed with col/row + the player's
 * EconomyManager (or a debit callback) and a "now" supplier; the
 * Phaser-facing layer (sprite, panel UI, sprite spawn) wraps this on
 * top in SabotageController.
 */

import {
  type RaiderStats,
  type UpgradeKind,
  type UpgradeLevels,
  MAX_TIER,
  UPGRADE_TIERS,
  nextUpgradeCost,
  statsForLevels,
} from './WorkshopUpgrades';

/** Callback that the workshop fires when a raider is successfully
 *  trained. The caller (controller) is responsible for actually
 *  instantiating the Raider entity. */
export type TrainRaiderCallback = (stats: RaiderStats) => void;

/** Spender contract — `EconomyManager.spend(cost)` matches this shape
 *  exactly. Defining a structural interface lets Workshop tests pass
 *  a 3-line stub without dragging the full economy in. */
export interface GoldSpender {
  spend(cost: number): boolean;
}

export interface WorkshopConfig {
  col: number;
  row: number;
  economy: GoldSpender;
  /** Gold cost per Raider train. Default 150g. */
  trainCost?: number;
  /** Cooldown (ms) between trains. Default 5000ms. */
  trainCooldownMs?: number;
}

const DEFAULT_TRAIN_COST = 150;
const DEFAULT_TRAIN_CD_MS = 5000;
const MAX_QUEUE = 3;

/** Outcome of a `tryEnqueue` call. Lets the HUD render distinct
 *  feedback per failure mode without re-querying workshop state. */
export type EnqueueResult = 'queued' | 'broke' | 'queue_full';

export class Workshop {
  readonly col: number;
  readonly row: number;
  readonly trainCost: number;
  readonly trainCooldownMs: number;
  private readonly economy: GoldSpender;

  /** Last `now` (ms) at which a Raider was trained. -Infinity until
   *  the first train so cooldown does not gate the opening shot. */
  private _lastTrainAt = -Infinity;

  /** Queued train count (already paid for). Decrements one at a time
   *  as the cooldown elapses inside `tickQueue`. Capped at MAX_QUEUE. */
  private _queue = 0;

  private _levels: UpgradeLevels = { plate: 0, edge: 0, tread: 0 };

  constructor(cfg: WorkshopConfig) {
    this.col = cfg.col;
    this.row = cfg.row;
    this.economy = cfg.economy;
    this.trainCost = cfg.trainCost ?? DEFAULT_TRAIN_COST;
    this.trainCooldownMs = cfg.trainCooldownMs ?? DEFAULT_TRAIN_CD_MS;
  }

  getLevels(): UpgradeLevels {
    return { ...this._levels };
  }

  /** True iff the Workshop is ready to train RIGHT NOW (cooldown
   *  elapsed). Gold check is the caller's responsibility — this is a
   *  cooldown query only. */
  canTrainAt(now: number): boolean {
    return now - this._lastTrainAt >= this.trainCooldownMs;
  }

  /** Remaining cooldown ms until the next train is allowed. 0 when
   *  ready. */
  cooldownRemaining(now: number): number {
    const elapsed = now - this._lastTrainAt;
    return Math.max(0, this.trainCooldownMs - elapsed);
  }

  /** Try to spend gold + train a raider. Returns true on success.
   *  Atomic: cooldown commits only when the gold debit succeeds. */
  tryTrain(now: number, onTrain: TrainRaiderCallback): boolean {
    if (!this.canTrainAt(now)) return false;
    if (!this.economy.spend(this.trainCost)) return false;
    this._lastTrainAt = now;
    onTrain(statsForLevels(this._levels));
    return true;
  }

  /** Number of raiders currently queued (paid-for, waiting for the
   *  cooldown timer to dequeue them). 0..MAX_QUEUE. */
  getQueueCount(): number { return this._queue; }

  /** Hard cap on queue depth (3 — enough to let the player commit to
   *  a push without locking up all their gold). */
  getQueueMax(): number { return MAX_QUEUE; }

  /** Try to enqueue one Raider build. Atomic gold + queue commit.
   *  The actual spawn happens later inside `tickQueue` when the
   *  cooldown elapses — this just reserves a slot and pays. */
  tryEnqueue(): EnqueueResult {
    if (this._queue >= MAX_QUEUE) return 'queue_full';
    if (!this.economy.spend(this.trainCost)) return 'broke';
    this._queue += 1;
    return 'queued';
  }

  /** Per-frame tick: dequeue one Raider if the cooldown is ready and
   *  the queue has at least one entry. Workshop stamps current
   *  upgrade levels onto the spawned stats — so a Raider enqueued
   *  BEFORE an upgrade still inherits the level at SPAWN time, not at
   *  enqueue time. Intentional: encourages "queue + upgrade ↑ + new
   *  raiders come out buffed" sequencing. */
  tickQueue(now: number, onTrain: TrainRaiderCallback): void {
    if (this._queue <= 0) return;
    if (!this.canTrainAt(now)) return;
    this._queue -= 1;
    this._lastTrainAt = now;
    onTrain(statsForLevels(this._levels));
  }

  /** Try to buy the next tier in `kind`. Returns true on success.
   *  Atomic gold + level commit. */
  tryUpgrade(kind: UpgradeKind): boolean {
    const currentLevel = this._levels[kind];
    if (currentLevel >= MAX_TIER) return false;
    const cost = UPGRADE_TIERS[kind][currentLevel + 1].cost;
    if (!this.economy.spend(cost)) return false;
    this._levels[kind] = currentLevel + 1;
    return true;
  }

  /** Stats a Raider trained right now would receive. Convenience for
   *  the UI to render the "next raider will have X HP" hint. */
  previewRaiderStats(): RaiderStats {
    return statsForLevels(this._levels);
  }

  /** Cost to buy the next tier in `kind`, or null if already maxed.
   *  UI uses this to label the upgrade buttons and grey them at max. */
  nextUpgradeCost(kind: UpgradeKind): number | null {
    return nextUpgradeCost(kind, this._levels[kind]);
  }
}
