import { STARTING_GOLD, KILL_GOLD, WAVE_CLEAR_BONUS } from '../config';
import { EventBus } from './EventBus';
import { ResourceManager } from './ResourceManager';

/**
 * Backward-compatible gold economy. Wraps ResourceManager('gold').
 * All existing code that calls economy.gold, economy.spend(), etc.
 * continues to work unchanged.
 */
export class EconomyManager {
  resources: ResourceManager;
  private events: EventBus;
  private currentWave = 0;

  constructor(events: EventBus, resourceMgr?: ResourceManager) {
    this.events = events;
    this.resources = resourceMgr ?? new ResourceManager(events);

    // Register gold as the primary resource
    if (!this.resources.has('gold')) {
      this.resources.addResource({
        id: 'gold',
        name: 'Gold',
        startingAmount: STARTING_GOLD,
        tickRate: 0,
        color: '#ffdd44',
      });
    }

    events.on('creepKilled', (_id: number, reward: number) => {
      this.addGold(reward);
    });

    events.on('waveCleared', () => {
      this.addGold(WAVE_CLEAR_BONUS);
    });

    events.on('waveStarted', (waveNum: number) => {
      this.currentWave = waveNum;
    });
  }

  get gold(): number {
    return this.resources.get('gold');
  }

  set gold(v: number) {
    const r = this.resources.getState('gold');
    if (r) r.current = v;
  }

  canAfford(cost: number): boolean {
    return this.resources.canAfford('gold', cost);
  }

  spend(cost: number): boolean {
    return this.resources.spend('gold', cost);
  }

  addGold(amount: number): void {
    this.resources.add('gold', amount);
  }

  getKillGold(): number {
    return Math.max(2, KILL_GOLD - Math.floor(this.currentWave / 10));
  }
}
