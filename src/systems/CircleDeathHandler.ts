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
  /**
   * Per-player running kill count. Keyed by playerIndex, includes
   * every slot — local human, remote humans, and bots. Roster UI
   * reads this as the single source of truth for kills (no more
   * "bot kills live in CircleBotAI, human kills live in
   * StatsTracker" split). Only populated for owners the death
   * handler can identify — untracked towers don't credit anyone.
   */
  private killsByPlayer: Map<number, number> = new Map();

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

  /** Snapshot of kills by player index. Roster UI consumes this to
   *  render the `NK` count per row. */
  getKillsByPlayer(): Map<number, number> {
    return this.killsByPlayer;
  }

  onCreepKilled(creep: Creep): void {
    this.statsTracker.recordKill();

    const key = `${creep.lastHitCol},${creep.lastHitRow}`;
    const owner = this.towerOwners.get(key);
    const killGold = Math.round(this.economy.getKillGold() * this.killGoldMult);

    // Track per-player kills even when the gold routes elsewhere.
    // Untracked towers (owner === undefined) fall under the local
    // player's count since they're typically host-authoritative.
    const creditedTo = owner ?? this.myPlayerIndex;
    this.killsByPlayer.set(creditedTo, (this.killsByPlayer.get(creditedTo) ?? 0) + 1);

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
