import { FrontierBuilding, FRONTIER_BUILDINGS, GENERIC_OUTPOSTS, getAllFactionFrontierBuildings } from '../data/FrontierBuildings';
import { FactionId } from '../data/Factions';
import { EventBus } from './EventBus';
import { IncomeManager } from './IncomeManager';

export interface OwnedBuilding {
  def: FrontierBuilding;
  growthStacks: number;
  digLevel: number;
  dormantWaves: number;
  destroyed: boolean;
  /** Handle to the map-world doodad (Phaser.GameObjects.Image). Set by
   *  GameScene when placed; FrontierManager calls `.destroy()` on it
   *  when the building is destroyed so the doodad vanishes from the
   *  map alongside its listing in the frontier panel. Typed as a plain
   *  disposable so this file stays Phaser-free. */
  _doodad?: { destroy(): void };
}

export class FrontierManager {
  private events: EventBus;
  private incomeMgr: IncomeManager;
  private faction: FactionId | null;
  buildings: OwnedBuilding[] = [];
  availableBuildings: FrontierBuilding[];

  constructor(events: EventBus, incomeMgr: IncomeManager, faction: FactionId | null) {
    this.events = events;
    this.incomeMgr = incomeMgr;
    this.faction = faction;

    if (faction === 'random') {
      this.availableBuildings = this.rollRandomFrontier();
    } else if (faction) {
      this.availableBuildings = FRONTIER_BUILDINGS[faction] || [];
    } else {
      this.availableBuildings = GENERIC_OUTPOSTS;
    }
  }

  /** Roll 2 random frontier buildings from all faction pools */
  rollRandomFrontier(): FrontierBuilding[] {
    const all = getAllFactionFrontierBuildings();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  /** Rotate frontier for random faction (called on wave clear) */
  rotateRandomFrontier(): void {
    if (this.faction === 'random') {
      this.availableBuildings = this.rollRandomFrontier();
    }
  }

  purchaseBuilding(building: FrontierBuilding): OwnedBuilding {
    const owned: OwnedBuilding = {
      def: building,
      growthStacks: 0,
      digLevel: 0,
      dormantWaves: 0,
      destroyed: false,
    };
    this.buildings.push(owned);
    this.recalculateBaseIncome();
    return owned;
  }

  /**
   * Called each wave end. Returns BONUS gold beyond base income.
   * Base income flows through IncomeManager.frontierIncome automatically.
   */
  onWaveEnd(waveNum: number): number {
    let bonusGold = 0;

    for (const b of this.buildings) {
      if (b.destroyed) continue;

      if (b.dormantWaves > 0) {
        b.dormantWaves--;
        continue;
      }

      switch (b.def.mechanic) {
        case 'steady':
        case 'overcharge':
          // Base income handled by IncomeManager, no bonus
          break;

        case 'dig':
          // Dig level adds extra income beyond base
          bonusGold += b.digLevel;
          break;

        case 'grow':
          // Growth stacks add extra income beyond base
          b.growthStacks++;
          bonusGold += b.growthStacks * 2;
          break;

        case 'gamble': {
          // All gamble income is bonus (baseIncome is 0)
          const max = b.def.id.includes('_2') ? 30 : 15;
          bonusGold += Math.floor(Math.random() * (max + 1));
          break;
        }
      }
    }

    return bonusGold;
  }

  // Faction-specific actions - return gold earned
  overchargeBuilding(idx: number): number {
    const building = this.getActiveBuildings()[idx];
    if (!building || building.def.mechanic !== 'overcharge' || building.dormantWaves > 0) return 0;
    const burst = building.def.baseIncome * 3;
    building.dormantWaves = 2;
    return burst;
  }

  digDeeper(idx: number): { success: boolean; collapsed: boolean } {
    const building = this.getActiveBuildings()[idx];
    if (!building || building.def.mechanic !== 'dig') return { success: false, collapsed: false };
    building.digLevel++;
    const risk = building.def.id.includes('_2') ? 0.05 : 0.1;
    if (Math.random() < risk * building.digLevel) {
      this.destroyBuilding(building);
      return { success: false, collapsed: true };
    }
    return { success: true, collapsed: false };
  }

  harvestGrowth(idx: number): number {
    const building = this.getActiveBuildings()[idx];
    if (!building || building.def.mechanic !== 'grow') return 0;
    const payout = building.growthStacks * 5;
    building.growthStacks = 0;
    return payout;
  }

  // Batch actions — operate on all active buildings of a given type
  overchargeAllOfType(defId: string): number {
    let totalGold = 0;
    for (const b of this.buildings) {
      if (b.destroyed || b.def.id !== defId || b.def.mechanic !== 'overcharge' || b.dormantWaves > 0) continue;
      totalGold += b.def.baseIncome * 3;
      b.dormantWaves = 2;
    }
    return totalGold;
  }

  digAllOfType(defId: string): { successes: number; collapses: number } {
    let successes = 0;
    let collapses = 0;
    for (const b of this.buildings) {
      if (b.destroyed || b.def.id !== defId || b.def.mechanic !== 'dig') continue;
      b.digLevel++;
      const risk = b.def.id.includes('_2') ? 0.05 : 0.1;
      if (Math.random() < risk * b.digLevel) {
        this.destroyBuilding(b);
        collapses++;
      } else {
        successes++;
      }
    }
    return { successes, collapses };
  }

  harvestAllOfType(defId: string): number {
    let totalGold = 0;
    for (const b of this.buildings) {
      if (b.destroyed || b.def.id !== defId || b.def.mechanic !== 'grow') continue;
      totalGold += b.growthStacks * 5;
      b.growthStacks = 0;
    }
    return totalGold;
  }

  /** Mark a building as destroyed: remove its map doodad, null the
   *  handle, and recompute base income. Called from dig-collapse paths. */
  private destroyBuilding(b: OwnedBuilding): void {
    b.destroyed = true;
    if (b._doodad) {
      try { b._doodad.destroy(); } catch { /* already destroyed elsewhere */ }
      b._doodad = undefined;
    }
    this.recalculateBaseIncome();
  }

  private recalculateBaseIncome(): void {
    let total = 0;
    for (const b of this.buildings) {
      if (!b.destroyed && b.dormantWaves === 0) {
        total += b.def.baseIncome;
      }
    }
    this.incomeMgr.frontierIncome = total;
  }

  getActiveBuildings(): OwnedBuilding[] {
    return this.buildings.filter(b => !b.destroyed);
  }
}
