import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode } from '../../data/WaveDefinitions';
import { SEND_OPTIONS, SendCreepOption } from '../../data/SendCreepTypes';
import { FrontierManager } from '../FrontierManager';
import { FrontierBuilding } from '../../data/FrontierBuildings';
import { SendPanel } from '../../ui/SendPanel';
import { FrontierPanel } from '../../ui/FrontierPanel';

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;

/**
 * Standard game mode: gold-based sends, frontier buildings.
 * Used for Sprint, Standard, and Marathon.
 */
export class StandardMode implements GameMode {
  readonly id: MatchMode;
  private ctx!: GameModeContext;
  private sendPanel!: SendPanel;
  private currentWave: number = 0;
  frontierMgr!: FrontierManager;
  frontierPanel!: FrontierPanel;

  constructor(mode: MatchMode) {
    this.id = mode;
  }

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

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

    // Frontier
    this.frontierMgr = new FrontierManager(ctx.eventBus, ctx.incomeMgr, ctx.faction);
    this.frontierPanel = new FrontierPanel(
      ctx.scene,
      this.frontierMgr,
      (building: FrontierBuilding) => {
        if (ctx.economy.spend(building.cost)) {
          this.frontierMgr.purchaseBuilding(building);
          this.frontierPanel.updateOwned();
          ctx.eventLog.frontierPurchased(building.name, building.cost);
          ctx.statsTracker.recordFrontierSpent(building.cost);
          ctx.statsTracker.recordGoldSpent(building.cost);
        }
      },
      (action: string, idx: number) => this.handleFrontierAction(action, idx),
      (action: string, defId: string) => this.handleFrontierBatchAction(action, defId),
    );
  }

  update(_delta: number): void {
    // Standard mode has no per-frame economy updates
  }

  onWaveCleared(waveNum: number): void {
    // Frontier income
    const frontierBonus = this.frontierMgr.onWaveEnd(waveNum);
    if (frontierBonus > 0) {
      this.ctx.economy.addGold(frontierBonus);
      this.ctx.statsTracker.recordFrontierEarned(frontierBonus);
      this.ctx.statsTracker.recordGoldEarned(frontierBonus);
      this.ctx.eventLog.frontierIncome('Frontier bonus', frontierBonus);
    }
    this.frontierPanel.updateOwned();

    // Wave income
    const income = this.ctx.incomeMgr.collectWaveIncome();
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);
  }

  canStartWave(): boolean {
    return true; // no special restrictions
  }

  /** Rotate random faction frontier buildings */
  rotateRandomFrontier(): void {
    this.frontierMgr.rotateRandomFrontier();
    this.frontierPanel.rebuildPurchaseList();
  }

  private handleFrontierAction(action: string, idx: number): void {
    const ctx = this.ctx;
    switch (action) {
      case 'overcharge': {
        const gold = this.frontierMgr.overchargeBuilding(idx);
        if (gold > 0) {
          ctx.economy.addGold(gold);
          ctx.eventLog.frontierAction('Overcharge', `+${gold}g burst, dormant 2 waves`);
        }
        break;
      }
      case 'dig': {
        const result = this.frontierMgr.digDeeper(idx);
        if (result.collapsed) {
          ctx.eventLog.frontierAction('Dig Deeper', 'CAVE-IN! Mine destroyed');
        } else if (result.success) {
          ctx.eventLog.frontierAction('Dig Deeper', 'Success! +1 depth');
        }
        break;
      }
      case 'harvest': {
        const gold = this.frontierMgr.harvestGrowth(idx);
        if (gold > 0) {
          ctx.economy.addGold(gold);
          ctx.eventLog.frontierAction('Harvest', `+${gold}g collected`);
        }
        break;
      }
    }
    this.frontierPanel.updateOwned();
  }

  private handleFrontierBatchAction(action: string, defId: string): void {
    const ctx = this.ctx;
    switch (action) {
      case 'overcharge': {
        const gold = this.frontierMgr.overchargeAllOfType(defId);
        if (gold > 0) {
          ctx.economy.addGold(gold);
          ctx.eventLog.frontierAction('Overcharge All', `+${gold}g burst`);
        }
        break;
      }
      case 'dig': {
        const result = this.frontierMgr.digAllOfType(defId);
        ctx.eventLog.frontierAction('Dig All', `${result.successes} ok, ${result.collapses} collapsed`);
        break;
      }
      case 'harvest': {
        const gold = this.frontierMgr.harvestAllOfType(defId);
        if (gold > 0) {
          ctx.economy.addGold(gold);
          ctx.eventLog.frontierAction('Harvest All', `+${gold}g collected`);
        }
        break;
      }
    }
    this.frontierPanel.updateOwned();
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.sendPanel.getContainer());
    overlay.addPanel(this.frontierPanel.getContainer());
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
}
