import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode, WaveDefinition } from '../../data/WaveDefinitions';
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
      this.arenaManager,
    );

    ctx.eventLog.gameMessage('HERO DEFENSE: Leaked creeps enter the arena!');
    ctx.eventLog.gameMessage('Click arena to move hero. Q/W/E for abilities.');
    ctx.eventLog.gameMessage('Buy items in the sidebar (Weapon/Armor/Boots).');
  }

  update(delta: number): void {
    this.arenaManager.update(delta);
    this.itemShop.update();
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
