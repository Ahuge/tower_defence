/**
 * HeroEconomyController — mode-agnostic hero progression layer.
 *
 * Owns the per-match hero economy state (accessory shop offers,
 * rotation cadence) and the wiring that connects DOM purchase clicks
 * (`GameUIStore.requestBuyHeroItem`, `requestBuyTome`,
 * `requestBuyAccessory`, `requestHeroUpgrade`, `requestUpgradeAbility`)
 * to the underlying `Hero` + `EconomyManager`.
 *
 * Originally this logic was inlined inside `HeroDefenseMode` (with the
 * accessory state living on `ArenaManager`). M10 needed the same shop
 * but isn't a Hero Defense mode — extracting let both modes plug into
 * the existing `HeroItemsDOM` panel without duplication.
 *
 * Lifecycle:
 *   1. Caller constructs the controller with hero / economy / eventLog
 *      after the Hero exists. Initial accessory offers are rolled.
 *   2. `registerCallbacks()` wires the GameUIStore purchase callbacks.
 *   3. Each frame the surrounding mode calls `syncToDOM()` — this
 *      pushes the latest HeroShopState into the store so the DOM panel
 *      re-renders with current cooldowns / costs / level / etc.
 *   4. After every wave the mode calls `onWaveCleared(waveNum, opts)`
 *      to heal the hero, apply gold interest, and rotate the
 *      accessory pool. Each piece is opt-in via the options bag so
 *      modes can enable only the parts that fit.
 *   5. `destroy()` clears the registered callbacks (so a HD scene that
 *      ends doesn't leave stale cb refs reaching into a torn-down Hero).
 *
 * The controller is intentionally orthogonal to base HP, lives, leaks,
 * arena spawn, and any mode-specific defensive shields (e.g.
 * Sanctuary). Those stay in the mode that owns them.
 */

import { Hero } from '../../entities/Hero';
import { EconomyManager } from '../EconomyManager';
import { EventLog } from '../../ui/EventLog';
import {
  GameUIStore, HeroShopState, HeroItemInfo, TomeInfo,
  AccessoryInfo, AbilityInfo,
} from '../../ui/GameUIStore';
import { ITEM_SLOTS, ITEM_SLOT_ORDER } from '../../data/HeroItems';
import { AccessoryDef, getRandomAccessories } from '../../data/HeroAccessories';

export interface HeroEconomyOptions {
  /** Waves between accessory rotations. HD ships with 5; M10 finale
   *  uses 4 to fit ~7-8 offers into the longer match. */
  rotationCadence?: number;
  /** Wave number the FIRST rotation occurs at. HD rolls fresh offers
   *  at construction (wave 1). Pass higher to delay (e.g. M10 finale
   *  could wait until the hero is summoned). */
  initialRotationWave?: number;
  /** Skip the constructor's initial offer roll. Useful when the
   *  caller wants to defer the first roll until a specific event
   *  (e.g. M10's first hero summon). */
  skipInitialRoll?: boolean;
}

export interface WaveClearedOptions {
  /** Heal hero by this fraction of max HP. HD uses 0.20. Pass 0 or
   *  omit to skip. */
  healPercent?: number;
  /** Apply compounding interest to the gold pool by this rate. HD
   *  reads the per-hero `_interestRate` from Interest Tomes. Omit to
   *  skip. */
  interestRate?: number;
  /** Optional callback fired when interest is paid out, so the mode
   *  can log it / record it against ROI / etc. */
  onInterestPaid?: (amount: number) => void;
}

export class HeroEconomyController {
  hero: Hero;
  economy: EconomyManager;
  eventLog: EventLog;
  /** Currently-offered accessories (3 at a time). Rotated on a
   *  cadence via onWaveCleared. */
  currentAccessoryOffers: AccessoryDef[];
  /** Wave number when the offer pool will next rotate. */
  nextRotationWave: number;
  private rotationCadence: number;
  /** True after `destroy()` runs, to short-circuit any in-flight
   *  callbacks that may still hold a ref. */
  private destroyed = false;

  constructor(
    hero: Hero,
    economy: EconomyManager,
    eventLog: EventLog,
    opts: HeroEconomyOptions = {},
  ) {
    this.hero = hero;
    this.economy = economy;
    this.eventLog = eventLog;
    this.rotationCadence = opts.rotationCadence ?? 5;
    this.nextRotationWave = opts.initialRotationWave ?? 1;
    this.currentAccessoryOffers = opts.skipInitialRoll
      ? []
      : getRandomAccessories(3);
  }

  /** Wire the GameUIStore purchase callbacks to this controller's
   *  hero. Idempotent — re-registering replaces prior callbacks via
   *  the store's spread-merge.
   *
   *  IMPORTANT: only one HeroEconomyController should hold the
   *  callback set at a time. In modes where multiple heroes might
   *  exist (none currently), per-hero dispatch would need a shared
   *  registry. Today: HD has one hero per scene; M10 has one hero. */
  registerCallbacks(): void {
    GameUIStore.registerCallbacks({
      onBuyHeroItem: (slotId) => this.onBuyHeroItem(slotId),
      onBuyTome: (tomeId) => this.onBuyTome(tomeId),
      onBuyAccessory: (index) => this.onBuyAccessory(index),
      onHeroUpgrade: (optionId) => this.onHeroUpgrade(optionId),
      onUpgradeAbility: (abilityIndex) => this.onUpgradeAbility(abilityIndex),
    });
  }

  /** Build the HeroShopState payload and push to the store. Modes
   *  call this each frame (cheap — pure object construction). */
  syncToDOM(): void {
    if (this.destroyed) return;
    GameUIStore.updateHeroShop(this.buildShopState());
  }

  /** Fired after a wave is cleared. Applies optional heal + interest
   *  + accessory rotation. Modes choose which knobs to flip via the
   *  options bag. */
  onWaveCleared(waveNum: number, opts: WaveClearedOptions = {}): void {
    if (this.destroyed) return;
    if (opts.healPercent && opts.healPercent > 0) {
      this.hero.healPercent(opts.healPercent);
    }
    if (opts.interestRate && opts.interestRate > 0) {
      const interest = Math.floor(this.economy.gold * opts.interestRate);
      if (interest > 0) {
        this.economy.addGold(interest);
        opts.onInterestPaid?.(interest);
      }
    }
    this.rotateAccessories(waveNum + 1);
  }

  /** Buy an accessory by index in the current offers. Returns true
   *  on success. Failure modes (slots full, duplicate, can't afford)
   *  log a player-facing message via eventLog. */
  buyAccessory(index: number): boolean {
    const acc = this.currentAccessoryOffers[index];
    if (!acc) return false;
    if (this.hero.accessories.length >= Hero.MAX_ACCESSORIES) {
      this.eventLog.gameMessage('Accessory slots full! (3/3)');
      return false;
    }
    if (this.hero.accessories.some(a => a.id === acc.id)) {
      this.eventLog.gameMessage('Already equipped!');
      return false;
    }
    if (!this.economy.spend(acc.cost)) return false;
    this.hero.equipAccessory(acc);
    this.currentAccessoryOffers.splice(index, 1);
    this.eventLog.gameMessage(
      `Equipped ${acc.name}! (${this.hero.accessories.length}/3)`,
    );
    return true;
  }

  /** Roll a fresh batch of 3 offers if `waveNum` has passed the
   *  rotation threshold. Idempotent across the same wave. */
  rotateAccessories(waveNum: number): void {
    if (waveNum >= this.nextRotationWave) {
      // Seed with `waveNum * 7919` so the same wave produces the same
      // 3 offers in repeat playthroughs (per the existing HD pattern).
      this.currentAccessoryOffers = getRandomAccessories(3, waveNum * 7919);
      this.nextRotationWave = waveNum + this.rotationCadence;
    }
  }

  /** Tear down. Clears the GameUIStore callbacks pointing at this
   *  controller's hero so a follow-up scene can register cleanly. */
  destroy(): void {
    this.destroyed = true;
    GameUIStore.registerCallbacks({
      onBuyHeroItem: undefined,
      onBuyTome: undefined,
      onBuyAccessory: undefined,
      onHeroUpgrade: undefined,
      onUpgradeAbility: undefined,
    });
  }

  // ─── Internal handlers ───────────────────────────────────────────

  private onBuyHeroItem(slotId: string): void {
    const slotIdx = ITEM_SLOT_ORDER.indexOf(slotId as typeof ITEM_SLOT_ORDER[number]);
    if (slotIdx < 0) return;
    const { canUpgrade, cost } = this.hero.canUpgradeItem(slotIdx);
    if (!canUpgrade) return;
    if (!this.economy.spend(cost)) return;
    this.hero.upgradeItem(slotIdx);
    const slotDef = ITEM_SLOTS[slotId as keyof typeof ITEM_SLOTS];
    this.eventLog.gameMessage(`Upgraded ${slotDef?.name ?? slotId} (-${cost}g)`);
  }

  private onBuyTome(tomeId: string): void {
    const hero = this.hero;
    if (tomeId === 'xp') {
      if (this.economy.spend(100)) {
        hero.grantXP(50 + hero.level * 5);
        this.eventLog.gameMessage(`XP Tome: +${50 + hero.level * 5} XP!`);
      }
    } else if (tomeId === 'stat') {
      const cost = 250 + hero.tomeCount * 50;
      if (this.economy.spend(cost)) {
        hero.tomeBonusDamage += 5;
        hero.tomeBonusHp += 30;
        hero.tomeBonusAttackSpeed += 0.1;
        hero.tomeCount++;
        hero.hp = Math.min(hero.hp + 30, hero.getEffectiveMaxHp());
        this.eventLog.gameMessage(
          `Stat Tome #${hero.tomeCount}: +5 DMG, +30 HP, +0.1 AS`,
        );
      }
    } else if (tomeId === 'interest') {
      const tier = (hero as unknown as { _interestTier?: number })._interestTier ?? 0;
      const costs = [200, 400, 800];
      const rates = [3, 4, 5];
      if (tier < 3 && this.economy.spend(costs[tier])) {
        (hero as unknown as { _interestTier: number; _interestRate: number })._interestTier = tier + 1;
        (hero as unknown as { _interestTier: number; _interestRate: number })._interestRate = rates[tier] / 100;
        this.eventLog.gameMessage(`Interest Tome: rate now ${rates[tier]}%!`);
      }
    }
  }

  private onBuyAccessory(index: number): void {
    this.buyAccessory(index);
  }

  private onHeroUpgrade(optionId: string): void {
    this.hero.applyUpgrade(optionId);
  }

  private onUpgradeAbility(abilityIndex: number): void {
    if (this.hero.pendingUpgrades > 0) this.hero.upgradeAbility(abilityIndex);
  }

  // ─── Shop-state builder (was inline in HeroDefenseMode) ──────────

  private buildShopState(): HeroShopState {
    const hero = this.hero;

    const items: HeroItemInfo[] = ITEM_SLOT_ORDER.map((slotId, i) => {
      const slotDef = ITEM_SLOTS[slotId];
      const item = hero.items[i];
      const tier = item?.tier ?? 0;
      const maxTier = slotDef.tiers.length;
      const nextTier = tier < maxTier ? slotDef.tiers[tier] : null;
      return {
        slotId, name: slotDef.name, tier, maxTier,
        cost: nextTier?.cost ?? 0,
        description: nextTier?.label ?? (tier >= maxTier ? 'Max tier' : ''),
        owned: tier > 0, color: slotDef.color,
      };
    });

    const tomes: TomeInfo[] = [
      { id: 'xp', label: `XP Tome: +${50 + hero.level * 5} XP`, cost: 100 },
      { id: 'stat', label: 'Stat Tome: +5 DMG +30 HP +0.1 AS', cost: 250 + hero.tomeCount * 50 },
    ];
    const interestTier = (hero as unknown as { _interestTier?: number })._interestTier ?? 0;
    if (interestTier < 3) {
      const costs = [200, 400, 800];
      const rates = [3, 4, 5];
      tomes.push({
        id: 'interest',
        label: `Interest Tome: → ${rates[interestTier]}%/wave`,
        cost: costs[interestTier],
      });
    }

    const equippedAccessories: AccessoryInfo[] = hero.accessories.map(acc => ({
      id: acc.id, name: acc.name, description: acc.description, cost: 0,
      passive: acc.passive, equipped: true,
      cooldown: !acc.passive ? (hero.accessoryCooldowns.get(acc.id) ?? 0) : undefined,
    }));
    const accessoryOffers: AccessoryInfo[] = this.currentAccessoryOffers.map(acc => ({
      id: acc.id, name: acc.name, description: acc.description, cost: acc.cost,
      passive: acc.passive, equipped: false,
    }));

    const abilities: AbilityInfo[] = hero.abilities.map((ab, i) => ({
      key: ab.def.key, name: ab.def.name,
      ready: ab.cooldownRemaining <= 0,
      cooldown: Math.ceil(ab.cooldownRemaining),
      upgrades: hero.abilityUpgrades[i],
    }));
    const ultimate: AbilityInfo | null = hero.ultimate ? {
      key: 'R', name: hero.ultimate.def.name,
      ready: hero.level >= 6 && hero.ultimate.cooldownRemaining <= 0,
      cooldown: hero.level < 6 ? -1 : Math.ceil(hero.ultimate.cooldownRemaining),
      upgrades: hero.abilityUpgrades[3],
    } : null;

    return {
      heroName: hero.typeDef.name,
      level: hero.level, maxLevel: hero.level >= 15,
      xp: hero.xp, xpNeeded: hero.xpToNextLevel(),
      hp: hero.hp, maxHp: hero.maxHp,
      damage: hero.getEffectiveDamage(),
      attackSpeed: hero.getEffectiveAttackSpeed(),
      items, tomes,
      equippedAccessories, accessoryOffers,
      nextRotationWave: this.nextRotationWave,
      abilities, ultimate,
      pendingUpgrades: hero.pendingUpgrades,
      upgradeOptions: hero.pendingUpgrades > 0 ? hero.getUpgradeOptions() : [],
    };
  }
}
