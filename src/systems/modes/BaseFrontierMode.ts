import { GameMode, GameModeContext } from '../GameMode';
import { SidebarOverlay } from '../../ui/SidebarOverlay';
import { MatchMode } from '../../data/WaveDefinitions';
import { FrontierManager, OwnedBuilding } from '../FrontierManager';
import { FrontierBuilding } from '../../data/FrontierBuildings';
import { FrontierPanel } from '../../ui/FrontierPanel';
import { GameUIStore, FrontierState, FrontierBuildingInfo, OwnedBuildingInfo } from '../../ui/GameUIStore';

/**
 * Base class for game modes that use frontier buildings.
 * Provides FrontierManager + FrontierPanel setup, frontier actions,
 * wave-end income collection, and random frontier rotation.
 *
 * Subclasses override createUI() (calling super) to add mode-specific panels,
 * and may override reparentSidebarPanels/handleSend/destroy as needed.
 */
export abstract class BaseFrontierMode implements GameMode {
  abstract readonly id: MatchMode;
  protected ctx!: GameModeContext;
  frontierMgr!: FrontierManager;
  frontierPanel!: FrontierPanel;

  createUI(ctx: GameModeContext): void {
    this.ctx = ctx;

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

    // Register DOM frontier callbacks
    GameUIStore.registerCallbacks({
      onFrontierPurchase: (buildingId: string) => {
        const building = this.frontierMgr.availableBuildings.find(b => b.id === buildingId);
        if (building && ctx.economy.spend(building.cost)) {
          const owned = this.frontierMgr.purchaseBuilding(building);
          this.frontierPanel.updateOwned();
          ctx.eventLog.frontierPurchased(building.name, building.cost);
          ctx.statsTracker.recordFrontierSpent(building.cost);
          ctx.statsTracker.recordGoldSpent(building.cost);
          this.syncFrontierToDOM();
          const handle = GameUIStore.placeFrontierDoodad(0xffaa44, building.id, ctx.faction ?? 'generic');
          if (handle) owned._doodad = handle;
        }
      },
      onFrontierAction: (action: string, idx: number) => {
        this.handleFrontierAction(action, idx);
        this.syncFrontierToDOM();
      },
      onFrontierBatchAction: (action: string, defId: string) => {
        this.handleFrontierBatchAction(action, defId);
        this.syncFrontierToDOM();
      },
    });

    // Initial sync
    this.syncFrontierToDOM();
  }

  /** Push frontier state to the DOM store */
  protected syncFrontierToDOM(): void {
    const available: FrontierBuildingInfo[] = this.frontierMgr.availableBuildings.map(b => ({
      id: b.id, name: b.name, cost: b.cost, description: b.description, mechanic: b.mechanic,
    }));

    const active = this.frontierMgr.getActiveBuildings();
    // Group by defId
    const groups = new Map<string, OwnedBuilding[]>();
    for (const b of active) {
      const key = b.def.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    }

    const owned: OwnedBuildingInfo[] = [];
    for (const [defId, buildings] of groups) {
      const first = buildings[0];
      let status = '';
      switch (first.def.mechanic) {
        case 'steady': status = `+${first.def.baseIncome}/w`; break;
        case 'overcharge': status = first.dormantWaves > 0 ? `Dormant ${first.dormantWaves}w` : 'Ready'; break;
        case 'dig': status = `Depth ${first.digLevel}`; break;
        case 'grow': status = `${first.growthStacks} stacks`; break;
        case 'gamble': status = 'Random'; break;
      }
      owned.push({
        defId, name: first.def.name, mechanic: first.def.mechanic,
        status, destroyed: false, count: buildings.length,
      });
    }
    // Destroyed buildings are omitted entirely — their doodad is removed
    // by FrontierManager when collapse happens, and the panel listing
    // disappears alongside it.

    GameUIStore.updateFrontier({ available, owned });
  }

  update(_delta: number): void {
    // Default: no per-frame updates
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
    this.syncFrontierToDOM();

    // Wave income
    const income = this.ctx.incomeMgr.collectWaveIncome();
    this.ctx.economy.addGold(income);
    this.ctx.statsTracker.recordGoldEarned(income);
  }

  canStartWave(): boolean {
    return true;
  }

  /** Rotate random faction frontier buildings */
  rotateRandomFrontier(): void {
    this.frontierMgr.rotateRandomFrontier();
    this.frontierPanel.rebuildPurchaseList();
    this.syncFrontierToDOM();
  }

  handleSend(_sendId: string): boolean {
    return false;
  }

  reparentSidebarPanels(overlay: SidebarOverlay): void {
    overlay.addPanel(this.frontierPanel.getContainer());
  }

  destroy(): void {
    this.frontierPanel.destroy();
  }

  protected handleFrontierAction(action: string, idx: number): void {
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

  protected handleFrontierBatchAction(action: string, defId: string): void {
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
}
