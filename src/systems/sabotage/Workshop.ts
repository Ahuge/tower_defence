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

export class Workshop {
  readonly col: number;
  readonly row: number;
  readonly trainCost: number;
  readonly trainCooldownMs: number;
  private readonly economy: GoldSpender;

  /** Last `now` (ms) at which a Raider was trained. -Infinity until
   *  the first train so cooldown does not gate the opening shot. */
  private _lastTrainAt = -Infinity;

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
