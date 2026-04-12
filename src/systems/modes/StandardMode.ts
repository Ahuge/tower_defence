import { GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { SendPanel } from '../../ui/SendPanel';
import { BaseFrontierMode } from './BaseFrontierMode';

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
    });
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
