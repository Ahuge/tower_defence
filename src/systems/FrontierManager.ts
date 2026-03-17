import { FrontierBuilding, FRONTIER_BUILDINGS, GENERIC_OUTPOSTS } from '../data/FrontierBuildings';
import { FactionId } from '../data/Factions';
import { EventBus } from './EventBus';
import { IncomeManager } from './IncomeManager';

interface OwnedBuilding {
  def: FrontierBuilding;
  // State for faction mechanics
  growthStacks: number; // nature: accumulated growth
  digLevel: number; // mechanical: how deep
  dormantWaves: number; // arcane: waves until active again
  destroyed: boolean; // can be destroyed by raid
}

export class FrontierManager {
  private events: EventBus;
  private incomeMgr: IncomeManager;
  private faction: FactionId | null;
  buildings: OwnedBuilding[] = [];
  availableBuildings: FrontierBuilding[];
  raidPending: boolean = false;

  constructor(events: EventBus, incomeMgr: IncomeManager, faction: FactionId | null) {
    this.events = events;
    this.incomeMgr = incomeMgr;
    this.faction = faction;

    if (faction) {
      this.availableBuildings = FRONTIER_BUILDINGS[faction] || [];
    } else {
      this.availableBuildings = GENERIC_OUTPOSTS;
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
    this.recalculateIncome();
    return owned;
  }

  // Called each wave end to process mechanics and calc income
  onWaveEnd(waveNum: number): number {
    let totalIncome = 0;

    for (const b of this.buildings) {
      if (b.destroyed) continue;

      // Dormancy check (arcane overcharge)
      if (b.dormantWaves > 0) {
        b.dormantWaves--;
        continue;
      }

      switch (b.def.mechanic) {
        case 'steady':
          totalIncome += b.def.baseIncome;
          break;

        case 'overcharge':
          totalIncome += b.def.baseIncome;
          break;

        case 'dig':
          totalIncome += b.def.baseIncome + b.digLevel;
          break;

        case 'grow':
          b.growthStacks++;
          totalIncome += b.def.baseIncome + b.growthStacks * 2;
          break;

        case 'gamble': {
          const max = b.def.id.includes('_2') ? 30 : 15;
          totalIncome += Math.floor(Math.random() * (max + 1));
          break;
        }
      }
    }

    return totalIncome;
  }

  // Faction-specific actions
  overchargeBuilding(building: OwnedBuilding): number {
    if (building.def.mechanic !== 'overcharge' || building.dormantWaves > 0) return 0;
    const burst = building.def.baseIncome * 3;
    building.dormantWaves = 2;
    return burst;
  }

  digDeeper(building: OwnedBuilding): boolean {
    if (building.def.mechanic !== 'dig') return false;
    building.digLevel++;
    // Cave-in risk: 10% per dig level (5% for reinforced)
    const risk = building.def.id.includes('_2') ? 0.05 : 0.1;
    if (Math.random() < risk * building.digLevel) {
      building.destroyed = true;
      this.recalculateIncome();
      return false; // cave-in!
    }
    return true;
  }

  harvestGrowth(building: OwnedBuilding): number {
    if (building.def.mechanic !== 'grow') return 0;
    const payout = building.growthStacks * 5;
    building.growthStacks = 0;
    return payout;
  }

  // Raid: certain waves threaten frontier
  triggerRaid(waveNum: number): boolean {
    // Raids on waves 5, 15, 25 etc
    if (waveNum % 10 === 5 && this.buildings.some(b => !b.destroyed)) {
      this.raidPending = true;
      return true;
    }
    return false;
  }

  // Player can spend gold to defend
  defendRaid(goldSpent: number): boolean {
    this.raidPending = false;
    // Need 20g to defend, otherwise lose cheapest building
    if (goldSpent >= 20) {
      return true; // defended
    }
    // Lose a building
    const target = this.buildings.find(b => !b.destroyed);
    if (target) {
      target.destroyed = true;
      this.recalculateIncome();
    }
    return false;
  }

  private recalculateIncome(): void {
    let total = 0;
    for (const b of this.buildings) {
      if (!b.destroyed) {
        total += b.def.baseIncome;
      }
    }
    this.incomeMgr.frontierIncome = total;
  }

  getActiveBuildings(): OwnedBuilding[] {
    return this.buildings.filter(b => !b.destroyed);
  }
}
