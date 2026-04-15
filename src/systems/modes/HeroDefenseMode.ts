import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode, WaveDefinition } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { ArenaManager } from '../ArenaManager';
import { ItemShopPanel } from '../../ui/ItemShopPanel';
import { GameUIStore, HeroShopState, HeroItemInfo } from '../../ui/GameUIStore';
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
    GameUIStore.registerCallbacks({
      onBuyHeroItem: (slotId: string) => {
        const slotIdx = ITEM_SLOT_ORDER.indexOf(slotId as any);
        if (slotIdx >= 0) {
          const { canUpgrade, cost } = this.arenaManager.hero.canUpgradeItem(slotIdx);
          if (canUpgrade && ctx.economy.spend(cost)) {
            this.arenaManager.hero.upgradeItem(slotIdx);
            const slotDef = ITEM_SLOTS[slotId as keyof typeof ITEM_SLOTS];
            ctx.eventLog.gameMessage(`Upgraded ${slotDef?.name ?? slotId} (-${cost}g)`);
            this.syncHeroShopToDOM();
          }
        }
      },
    });
    this.syncHeroShopToDOM();
  }

  private syncHeroShopToDOM(): void {
    const hero = this.arenaManager.hero;
    const items: HeroItemInfo[] = ITEM_SLOT_ORDER.map((slotId, i) => {
      const slotDef = ITEM_SLOTS[slotId];
      const item = hero.items[i];
      const tier = item?.tier ?? 0;
      const maxTier = slotDef.tiers.length;
      const nextTier = tier < maxTier ? slotDef.tiers[tier] : null;
      return {
        slotId, name: slotDef.name, tier, maxTier, cost: nextTier?.cost ?? 0,
        description: nextTier?.label ?? (tier >= maxTier ? 'Max tier' : ''),
        owned: tier > 0,
      };
    });
    GameUIStore.updateHeroShop({ heroName: hero.typeDef.name, items });
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
