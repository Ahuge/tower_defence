import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode, WaveDefinition } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { ArenaManager } from '../ArenaManager';
import { ItemShopPanel } from '../../ui/ItemShopPanel';
import { GameUIStore, HeroShopState, HeroItemInfo, TomeInfo, AccessoryInfo, AbilityInfo } from '../../ui/GameUIStore';
import { ITEM_SLOTS, ITEM_SLOT_ORDER } from '../../data/HeroItems';

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;

/**
 * Hero Defense mode: leaked creeps enter an arena where the hero fights them.
 * Base HP replaces lives. Item shop replaces frontier panel.
 */
export class HeroDefenseMode implements GameMode {
  readonly id: MatchMode = 'hero_defense';
  private ctx!: GameModeContext;
  private arenaManager: ArenaManager;
  private itemShop!: ItemShopPanel;

  constructor(arenaManager: ArenaManager) {
    this.arenaManager = arenaManager;
  }

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

    // Item shop panel (replaces frontier)
    this.itemShop = new ItemShopPanel(
      ctx.scene,
      this.arenaManager.hero,
      ctx.economy,
      ctx.eventLog,
      ctx.sidebarTopY,
      this.arenaManager,
    );

    ctx.eventLog.gameMessage('HERO DEFENSE: Leaked creeps enter the arena!');
    ctx.eventLog.gameMessage('Click arena to move hero. Q/W/E for abilities.');
    ctx.eventLog.gameMessage('Buy items in the sidebar (Weapon/Armor/Boots).');

    // Register DOM callbacks
    const hero = this.arenaManager.hero;
    GameUIStore.registerCallbacks({
      onBuyHeroItem: (slotId: string) => {
        const slotIdx = ITEM_SLOT_ORDER.indexOf(slotId as any);
        if (slotIdx >= 0) {
          const { canUpgrade, cost } = hero.canUpgradeItem(slotIdx);
          if (canUpgrade && ctx.economy.spend(cost)) {
            hero.upgradeItem(slotIdx);
            const slotDef = ITEM_SLOTS[slotId as keyof typeof ITEM_SLOTS];
            ctx.eventLog.gameMessage(`Upgraded ${slotDef?.name ?? slotId} (-${cost}g)`);
          }
        }
      },
      onBuyTome: (tomeId: string) => {
        if (tomeId === 'xp') {
          if (ctx.economy.spend(100)) {
            hero.grantXP(50 + hero.level * 5);
            ctx.eventLog.gameMessage(`XP Tome: +${50 + hero.level * 5} XP!`);
          }
        } else if (tomeId === 'stat') {
          const cost = 250 + hero.tomeCount * 50;
          if (ctx.economy.spend(cost)) {
            hero.tomeBonusDamage += 5;
            hero.tomeBonusHp += 30;
            hero.tomeBonusAttackSpeed += 0.1;
            hero.tomeCount++;
            hero.hp = Math.min(hero.hp + 30, hero.getEffectiveMaxHp());
            ctx.eventLog.gameMessage(`Stat Tome #${hero.tomeCount}: +5 DMG, +30 HP, +0.1 AS`);
          }
        } else if (tomeId === 'interest') {
          const tier = (hero as any)._interestTier ?? 0;
          const costs = [200, 400, 800];
          const rates = [3, 4, 5];
          if (tier < 3 && ctx.economy.spend(costs[tier])) {
            (hero as any)._interestTier = tier + 1;
            (hero as any)._interestRate = rates[tier] / 100;
            ctx.eventLog.gameMessage(`Interest Tome: rate now ${rates[tier]}%!`);
          }
        }
      },
      onBuyAccessory: (index: number) => {
        const acc = this.arenaManager.currentAccessoryOffers[index];
        if (acc && hero.accessories.length < 3 && ctx.economy.spend(acc.cost)) {
          hero.accessories.push(acc);
          if (!acc.passive) hero.accessoryCooldowns.set(acc.id, 0);
          this.arenaManager.currentAccessoryOffers.splice(index, 1);
          ctx.eventLog.gameMessage(`Equipped ${acc.name} (-${acc.cost}g)`);
        }
      },
      onHeroUpgrade: (optionId: string) => {
        hero.applyUpgrade(optionId);
      },
      onUpgradeAbility: (abilityIndex: number) => {
        if (hero.pendingUpgrades > 0) hero.upgradeAbility(abilityIndex);
      },
    });
    this.syncHeroShopToDOM();
  }

  private syncHeroShopToDOM(): void {
    const hero = this.arenaManager.hero;

    // Items
    const items: HeroItemInfo[] = ITEM_SLOT_ORDER.map((slotId, i) => {
      const slotDef = ITEM_SLOTS[slotId];
      const item = hero.items[i];
      const tier = item?.tier ?? 0;
      const maxTier = slotDef.tiers.length;
      const nextTier = tier < maxTier ? slotDef.tiers[tier] : null;
      return {
        slotId, name: slotDef.name, tier, maxTier, cost: nextTier?.cost ?? 0,
        description: nextTier?.label ?? (tier >= maxTier ? 'Max tier' : ''),
        owned: tier > 0, color: slotDef.color,
      };
    });

    // Tomes
    const tomes: TomeInfo[] = [
      { id: 'xp', label: `XP Tome: +${50 + hero.level * 5} XP`, cost: 100 },
      { id: 'stat', label: `Stat Tome: +5 DMG +30 HP +0.1 AS`, cost: 250 + hero.tomeCount * 50 },
    ];
    const interestTier = (hero as any)._interestTier ?? 0;
    if (interestTier < 3) {
      const costs = [200, 400, 800];
      const rates = [3, 4, 5];
      tomes.push({ id: 'interest', label: `Interest Tome: → ${rates[interestTier]}%/wave`, cost: costs[interestTier] });
    }

    // Accessories
    const equippedAccessories: AccessoryInfo[] = hero.accessories.map(acc => ({
      id: acc.id, name: acc.name, description: acc.description, cost: 0,
      passive: acc.passive, equipped: true,
      cooldown: !acc.passive ? (hero.accessoryCooldowns.get(acc.id) ?? 0) : undefined,
    }));
    const accessoryOffers: AccessoryInfo[] = this.arenaManager.currentAccessoryOffers.map(acc => ({
      id: acc.id, name: acc.name, description: acc.description, cost: acc.cost,
      passive: acc.passive, equipped: false,
    }));

    // Abilities
    const abilities: AbilityInfo[] = hero.abilities.map((ab, i) => ({
      key: ab.def.key, name: ab.def.name,
      ready: ab.cooldownRemaining <= 0, cooldown: Math.ceil(ab.cooldownRemaining),
      upgrades: hero.abilityUpgrades[i],
    }));
    const ultimate: AbilityInfo | null = hero.ultimate ? {
      key: 'R', name: hero.ultimate.def.name,
      ready: hero.level >= 6 && hero.ultimate.cooldownRemaining <= 0,
      cooldown: hero.level < 6 ? -1 : Math.ceil(hero.ultimate.cooldownRemaining),
      upgrades: hero.abilityUpgrades[3],
    } : null;

    GameUIStore.updateHeroShop({
      heroName: hero.typeDef.name,
      level: hero.level, maxLevel: hero.level >= 15,
      xp: hero.xp, xpNeeded: hero.xpToNextLevel(),
      hp: hero.hp, maxHp: hero.maxHp,
      damage: hero.getEffectiveDamage(), attackSpeed: hero.getEffectiveAttackSpeed(),
      items, tomes,
      equippedAccessories, accessoryOffers,
      nextRotationWave: this.arenaManager.nextRotationWave,
      abilities, ultimate,
      pendingUpgrades: hero.pendingUpgrades,
      upgradeOptions: hero.pendingUpgrades > 0 ? hero.getUpgradeOptions() : [],
    });
  }

  update(delta: number): void {
    this.arenaManager.update(delta);
    this.itemShop.update();
    // Sync hero shop periodically (items can change on level up)
    this.syncHeroShopToDOM();
  }

  onWaveStart(wave: WaveDefinition, waveNum: number): void {
    this.arenaManager.spawnWaveCreeps(wave, waveNum);
  }

  onWaveCleared(waveNum: number): void {
    // Wave income (halved — 10x creeps already provide plenty of kill gold)
    const income = Math.round(this.ctx.incomeMgr.collectWaveIncome() * 0.5);
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);

    // Interest: base 2%, upgradeable via Interest Tome (stored on hero)
    const interestRate = (this.arenaManager.hero as any)._interestRate ?? 0.02;
    const interest = Math.floor(this.ctx.economy.gold * interestRate);
    if (interest > 0) {
      this.ctx.economy.addGold(interest);
      this.ctx.statsTracker.recordGoldEarned(interest);
    }

    // Combined wave clear message
    const parts = [`+${income}g income`];
    if (interest > 0) parts.push(`+${interest}g interest (${Math.round(interestRate * 100)}%)`);
    parts.push('Hero healed 20%');
    this.ctx.eventLog.gameMessage(`Wave cleared! ${parts.join(', ')}`);

    // Heal hero 20% on wave clear
    this.arenaManager.hero.healPercent(0.2);

    // Rotate accessory shop
    this.arenaManager.rotateAccessories(waveNum + 1);
  }

  canStartWave(): boolean {
    return true;
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.itemShop.getContainer());
  }

  handleSend(sendId: string): boolean {
    const opt = SEND_OPTIONS_MAP[sendId];
    if (opt) {
      this.ctx.sendMgr.queueSend(opt);
      this.ctx.eventLog.gameMessage(`Incoming send: ${opt.name}!`);
      return true;
    }
    return false;
  }

  destroy(): void {
    this.itemShop.destroy();
  }
}
