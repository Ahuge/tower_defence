import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode } from '../../data/WaveDefinitions';
import { FrontierManager } from '../FrontierManager';
import { FrontierBuilding } from '../../data/FrontierBuildings';
import { FrontierPanel } from '../../ui/FrontierPanel';

/**
 * Circle Co-op game mode: shared map, individual gold, no sends.
 * Standard frontier buildings for economy.
 */
export class CircleCoopMode implements GameMode {
  readonly id: MatchMode = 'circle_coop';
  private ctx!: GameModeContext;
  frontierMgr!: FrontierManager;
  frontierPanel!: FrontierPanel;

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

    // Frontier (no send panel — no sends in co-op)
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
    // No per-frame updates
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
    return true;
  }

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
    overlay.addPanel(this.frontierPanel.getContainer());
  }

  handleSend(_sendId: string): boolean {
    return false; // No sends in circle co-op
  }

  destroy(): void {
    this.frontierPanel.destroy();
  }
}
