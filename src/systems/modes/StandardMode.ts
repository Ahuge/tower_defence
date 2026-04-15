import { GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption, getSendCost, getSendIncome } from '../../data/SendCreepTypes';
import { SendPanel } from '../../ui/SendPanel';
import { BaseFrontierMode } from './BaseFrontierMode';
import { GameUIStore, SendOption } from '../../ui/GameUIStore';

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;

/**
 * Standard game mode: gold-based sends, frontier buildings.
 * Used for Standard and Endless modes.
 */
export class StandardMode extends BaseFrontierMode {
  readonly id: MatchMode;
  private sendPanel!: SendPanel;
  private currentWave: number = 0;

  constructor(mode: MatchMode) {
    super();
    this.id = mode;
  }

  createUI(ctx: GameModeContext): void {
    super.createUI(ctx);

    // Send panel
    this.sendPanel = new SendPanel(ctx.scene, (opt: SendCreepOption, scaledCost: number, scaledIncome: number) => {
      if (!this.canStartWave()) return; // only between waves
      if (this.currentWave < opt.unlockWave) return; // not unlocked yet
      if (!ctx.economy.spend(scaledCost)) return;

      if (ctx.versus && ctx.versus.isConnected()) {
        ctx.versus.send({ type: 'send_purchased', sendOptionId: opt.id });
        ctx.versus.sendsSent++;
        ctx.eventLog.gameMessage(`Sent ${opt.name} to opponent!`);
      } else {
        ctx.sendMgr.queueSend(opt);
      }
      ctx.incomeMgr.addSendBonus(scaledIncome);
      ctx.eventLog.sendQueued(opt.name, scaledCost);
      ctx.statsTracker.recordSendSpent(scaledCost);
      ctx.statsTracker.recordSendIncome(scaledIncome);
      ctx.statsTracker.recordGoldSpent(scaledCost);
    }, ctx.sidebarTopY);

    // Track wave for send scaling/unlocks
    ctx.eventBus.on('waveStarted', (waveNum: number) => {
      this.currentWave = waveNum;
      this.sendPanel.setWave(waveNum);
      this.updateDOMSendOptions(waveNum);
    });

    // Initial DOM send options
    this.updateDOMSendOptions(0);

    // Register DOM send callback
    const sendHandler = this.sendPanel;
    GameUIStore.registerCallbacks({
      onSend: (sendId: string) => {
        const opt = SEND_OPTIONS_MAP[sendId];
        if (!opt) return;
        const cost = getSendCost(opt.cost, this.currentWave);
        const income = getSendIncome(opt.incomeReward, this.currentWave);
        if (!this.canStartWave()) return;
        if (this.currentWave < opt.unlockWave) return;
        if (!ctx.economy.spend(cost)) return;
        if (ctx.versus && ctx.versus.isConnected()) {
          ctx.versus.send({ type: 'send_purchased', sendOptionId: opt.id });
          ctx.versus.sendsSent++;
          ctx.eventLog.gameMessage(`Sent ${opt.name} to opponent!`);
        } else {
          ctx.sendMgr.queueSend(opt);
        }
        ctx.incomeMgr.addSendBonus(income);
        ctx.eventLog.sendQueued(opt.name, cost);
        ctx.statsTracker.recordSendSpent(cost);
        ctx.statsTracker.recordSendIncome(income);
        ctx.statsTracker.recordGoldSpent(cost);
        this.updateDOMSendOptions(this.currentWave);
      },
    });
  }

  private updateDOMSendOptions(wave: number): void {
    const hotkeys = ['Z', 'X', 'C', 'V', '1', '2', '3', '4'];
    const options: SendOption[] = SEND_OPTIONS.map((opt, i) => ({
      id: opt.id,
      name: opt.name,
      cost: getSendCost(opt.cost, wave),
      income: getSendIncome(opt.incomeReward, wave),
      tier: opt.tier,
      hotkey: hotkeys[i] || '',
      locked: wave < opt.unlockWave,
      unlockWave: opt.unlockWave,
    }));
    GameUIStore.updateSendOptions(options);
  }

  handleSend(sendId: string): boolean {
    // Handle incoming sends from versus opponent
    const opt = SEND_OPTIONS_MAP[sendId];
    if (opt) {
      this.ctx.sendMgr.queueSend(opt);
      this.ctx.eventLog.gameMessage(`Incoming send: ${opt.name}!`);
      return true;
    }
    return false;
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.sendPanel.getContainer());
    super.reparentSidebarPanels(overlay);
  }

  destroy(): void {
    this.sendPanel.destroy();
    super.destroy();
  }
}
