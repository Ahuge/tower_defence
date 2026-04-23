import { DeathHandler } from './CreepManager';
import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { Creep } from '../entities/Creep';

export interface CircleKillRoute {
  /** Broadcast this peer's local kill to the other peers so their
   *  rosters update + they can credit their own economies when
   *  they're the killer or the spawn-owner. */
  broadcast: (killedBy: number, spawnOwnerIndex: number, goldValue: number) => void;
  /** Deposit gold into a CPU-bot's private economy. Only the lobby
   *  host hosts bots; on non-host peers this is a no-op. */
  creditBot?: (botIndex: number, gold: number) => void;
  /** Is this player-index a CPU bot we're hosting? Used to decide
   *  whether to route a share to `creditBot` or drop it. */
  isLocalBot?: (playerIndex: number) => boolean;
}

/**
 * Circle Co-op death handler — shared-economy version.
 *
 * The gold from every kill splits 50/50:
 *   • half to whichever player's tower struck the killing blow,
 *   • half to whichever player's *zone* or *bought send* spawned the creep.
 *
 * Each peer runs this on their own local creeps as they die, credits
 * any beneficiaries they host (self + their bots), then broadcasts
 * a `creep_killed` message. Remote peers apply the broadcast via
 * `onRemoteKill` so all peers converge on the same per-player kill
 * counts and everyone's EconomyManager sees the share they're owed.
 *
 * When `spawnOwnerIndex === -1` (no tracked spawn-owner, e.g. a
 * natural wave creep on a non-Circle map), the full gold goes to
 * the killer — the 50/50 split would have nothing to route the
 * other half to.
 */
export class CircleDeathHandler implements DeathHandler {
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private killGoldMult: number;
  private towerOwners: Map<string, number>;
  private myPlayerIndex: number;
  private route: CircleKillRoute;
  /**
   * Per-player running kill count. Keyed by playerIndex, includes
   * every slot — local human, remote humans, and bots. Roster UI
   * reads this as the single source of truth for kills.
   */
  private killsByPlayer: Map<number, number> = new Map();

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    killGoldMult: number,
    towerOwners: Map<string, number>,
    myPlayerIndex: number,
    route: CircleKillRoute,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.killGoldMult = killGoldMult;
    this.towerOwners = towerOwners;
    this.myPlayerIndex = myPlayerIndex;
    this.route = route;
  }

  getKillsByPlayer(): Map<number, number> {
    return this.killsByPlayer;
  }

  onCreepKilled(creep: Creep): void {
    this.statsTracker.recordKill();

    const key = `${creep.lastHitCol},${creep.lastHitRow}`;
    const owner = this.towerOwners.get(key);
    const killedBy = owner ?? this.myPlayerIndex;
    const spawnOwnerIndex = creep.spawnOwnerIndex ?? -1;
    const goldValue = Math.round(this.economy.getKillGold() * this.killGoldMult);

    // Local-side effects (kill count + the slices of the pot this
    // peer is responsible for crediting).
    this.applyKillLocal(killedBy, spawnOwnerIndex, goldValue);

    // Tell the other peers so they can do their own local-side
    // effects for the same kill. Without this, peers diverge on
    // kill totals + on which economies see the shared gold.
    this.route.broadcast(killedBy, spawnOwnerIndex, goldValue);
  }

  /** Receiver side — called by GameScene when a `creep_killed`
   *  message arrives from another peer. Applies the same local-
   *  side effects the sender already applied on their end. */
  onRemoteKill(killedBy: number, spawnOwnerIndex: number, goldValue: number): void {
    this.applyKillLocal(killedBy, spawnOwnerIndex, goldValue);
  }

  private applyKillLocal(killedBy: number, spawnOwnerIndex: number, goldValue: number): void {
    // Roster-visible kill count. Always credited, even when the
    // gold goes elsewhere — the display is "who got the kill", not
    // "who got paid".
    if (killedBy >= 0) {
      this.killsByPlayer.set(killedBy, (this.killsByPlayer.get(killedBy) ?? 0) + 1);
    }

    // Compute the split. With no spawn-owner the killer gets the
    // full pot — otherwise a clean 50/50 (odd gold rounds to the
    // killer so there's no lost rounding slice).
    const hasSpawner = spawnOwnerIndex >= 0;
    const killerShare = hasSpawner ? Math.ceil(goldValue / 2) : goldValue;
    const spawnerShare = hasSpawner ? Math.floor(goldValue / 2) : 0;

    this.creditShare(killedBy, killerShare);
    if (hasSpawner) this.creditShare(spawnOwnerIndex, spawnerShare);
  }

  /** Route a gold share to the target player. Only actually pays
   *  out on the peer that hosts that player's economy — either the
   *  local human or a bot this peer is simulating. Other peers
   *  drop the share on the floor; the owning peer will have already
   *  credited themselves (for their own kill) or will credit
   *  themselves when they receive the matching `creep_killed`. */
  private creditShare(playerIndex: number, gold: number): void {
    if (gold <= 0 || playerIndex < 0) return;
    if (playerIndex === this.myPlayerIndex) {
      // Local human — push through the shared event bus so income
      // ledger, achievements, and UI toasts all see it.
      this.eventBus.emit('creepKilled', 0, gold);
      this.statsTracker.recordGoldEarned(gold);
    } else if (this.route.isLocalBot?.(playerIndex) && this.route.creditBot) {
      this.route.creditBot(playerIndex, gold);
    }
    // Else: beneficiary is a remote peer we don't host. They'll
    // credit themselves when the broadcast reaches them.
  }
}
