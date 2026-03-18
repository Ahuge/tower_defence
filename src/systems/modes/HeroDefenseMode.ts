import { GameMode, GameModeContext } from '../GameMode';
import { MatchMode } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { ArenaManager } from '../ArenaManager';
import { ItemShopPanel } from '../../ui/ItemShopPanel';

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
    );

    ctx.eventLog.gameMessage('HERO DEFENSE: Leaked creeps enter the arena!');
    ctx.eventLog.gameMessage('Click arena to move hero. Q/W/E for abilities.');
    ctx.eventLog.gameMessage('Buy items in the sidebar (Weapon/Armor/Boots).');
  }

  update(delta: number): void {
    this.arenaManager.update(delta);
    this.itemShop.update();
  }

  onWaveCleared(waveNum: number): void {
    // Wave income
    const income = this.ctx.incomeMgr.collectWaveIncome();
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);

    // Heal hero 20% on wave clear
    this.arenaManager.hero.healPercent(0.2);
    this.ctx.eventLog.gameMessage('Wave cleared! Hero healed 20%.');
  }

  canStartWave(): boolean {
    return true;
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
}
