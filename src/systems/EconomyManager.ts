import { STARTING_GOLD, KILL_GOLD, WAVE_CLEAR_BONUS } from '../config';
import { EventBus } from './EventBus';

export class EconomyManager {
  gold: number;
  private events: EventBus;

  constructor(events: EventBus) {
    this.events = events;
    this.gold = STARTING_GOLD;

    events.on('creepKilled', (_id, reward) => {
      this.addGold(reward);
    });

    events.on('waveCleared', () => {
      this.addGold(WAVE_CLEAR_BONUS);
    });
  }

  canAfford(cost: number): boolean {
    return this.gold >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost;
    this.events.emit('goldChanged', -cost, this.gold);
    return true;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.events.emit('goldChanged', amount, this.gold);
  }

  getKillGold(): number {
    return KILL_GOLD;
  }
}
