import { DeathHandler } from './CreepManager';
import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { Creep } from '../entities/Creep';

/**
 * Circle Co-op death handler: routes kill gold based on the
 * killing tower's owner.
 *
 * Three branches:
 *   - owner is local player (or untracked): gold flows into the
 *     shared economy as before, via the creepKilled event bus.
 *   - owner is a CPU bot (registered via `onBotKill` callback):
 *     gold goes into that bot's private pool — the human's
 *     economy is left alone.
 *   - owner is a remote human peer: we neither credit ourselves
 *     nor fire the bot callback; their peer-side death handler
 *     handles their own economy.
 */
export class CircleDeathHandler implements DeathHandler {
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private killGoldMult: number;
  private towerOwners: Map<string, number>;
  private myPlayerIndex: number;
  /** Optional: called with (botPlayerIndex, goldAmount) when a
   *  bot-owned tower gets the killing blow. Wired in GameScene
   *  to route gold into CircleBotAI's per-bot pools. */
  private onBotKill?: (botIndex: number, gold: number) => void;

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    killGoldMult: number,
    towerOwners: Map<string, number>,
    myPlayerIndex: number,
    onBotKill?: (botIndex: number, gold: number) => void,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.killGoldMult = killGoldMult;
    this.towerOwners = towerOwners;
    this.myPlayerIndex = myPlayerIndex;
    this.onBotKill = onBotKill;
  }

  onCreepKilled(creep: Creep): void {
    this.statsTracker.recordKill();

    const key = `${creep.lastHitCol},${creep.lastHitRow}`;
    const owner = this.towerOwners.get(key);
    const killGold = Math.round(this.economy.getKillGold() * this.killGoldMult);

    if (owner === this.myPlayerIndex || owner === undefined) {
      this.eventBus.emit('creepKilled', 0, killGold);
      this.statsTracker.recordGoldEarned(killGold);
    } else if (this.onBotKill) {
      // Bot tower killed the creep — credit the bot's private pool
      // if the owner is a registered bot, otherwise drop the gold
      // (remote human peers track their own economy).
      this.onBotKill(owner, killGold);
    }
  }
}
