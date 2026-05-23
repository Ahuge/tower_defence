import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

/**
 * Called when a creep reaches the exit. Different game modes handle
 * this differently:
 * - Standard: subtract lives
 * - Hero Defense: route creep to hero arena
 * - Circle Co-op: pass to next player's sector
 */
export interface LeakHandler {
  onCreepLeaked(creep: Creep): number; // returns life damage (0 if handled otherwise)
}

/**
 * Called when a creep is killed. Different modes can add behavior:
 * - Standard: award gold
 * - Hero Defense: hero arena kills award 50% gold
 */
export interface DeathHandler {
  onCreepKilled(creep: Creep): void;
}

/** Standard leak handler: boss = 5 lives, normal = 1 life. Celestial
 *  Sanctuary towers with `leak_absorb` charges consume one charge per
 *  leak and return 0 damage. */
export class StandardLeakHandler implements LeakHandler {
  private eventLog: EventLog;
  private statsTracker: StatsTracker;
  private getTowers: () => any[];

  constructor(eventLog: EventLog, statsTracker: StatsTracker, getTowers: () => any[] = () => []) {
    this.eventLog = eventLog;
    this.statsTracker = statsTracker;
    this.getTowers = getTowers;
  }

  onCreepLeaked(creep: Creep): number {
    // M10 finale (and any future attacker-style hybrid): friendly
    // sends are the player's OWN units walking into the CPU base.
    // Reaching the end of their (reversed) path is neutral — not a
    // leak, not a player-life loss. Just disappear.
    if (creep.isFriendly) {
      this.eventLog.gameMessage('Send reached the cabal\'s line — fades into the spire.');
      return 0;
    }
    // Celestial Sanctuary: consume a leak_absorb charge if any tower has one.
    // No range check — description is global ("Absorbs 1 leaked creep"),
    // and Sanctuary's placement is constrained enough by its other traits.
    for (const tower of this.getTowers()) {
      for (const trait of tower.traits ?? []) {
        if (trait.id !== 'leak_absorb') continue;
        if ((trait._charges ?? 0) <= 0) continue;
        trait._charges -= 1;
        this.eventLog.gameMessage(`${tower.typeDef?.name ?? 'Sanctuary'} absorbed a leak!`);
        this.statsTracker.recordLeak();
        return 0;
      }
    }

    const damage = creep.isBoss ? 5 : 1;
    this.eventLog.gameMessage(damage > 1 ? `BOSS leaked! -${damage} lives` : 'Creep reached exit! -1 life');
    this.statsTracker.recordLeak();
    return damage;
  }
}

/** Standard death handler: award kill gold */
export class StandardDeathHandler implements DeathHandler {
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private killGoldMult: number;
  /** Optional campaign-supplied transform applied AFTER killGoldMult.
   *  Snake Eyes uses this to delegate to
   *  `SnakeEyesMissionController.modifyCreepKillGold`, which forwards
   *  to the active Wager's effect handler. The transform receives the
   *  post-mult gold and returns the final amount credited.
   *  Modifier-mode killGoldMult continues to apply first. */
  private goldTransform: ((baseGold: number) => number) | undefined;

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    killGoldMult: number,
    goldTransform?: (baseGold: number) => number,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.killGoldMult = killGoldMult;
    this.goldTransform = goldTransform;
  }

  onCreepKilled(creep: Creep): void {
    const multGold = Math.round(this.economy.getKillGold() * this.killGoldMult);
    const killGold = this.goldTransform ? this.goldTransform(multGold) : multGold;
    this.eventBus.emit('creepKilled', 0, killGold);
    this.statsTracker.recordKill();
    this.statsTracker.recordGoldEarned(killGold);
  }
}

/** Attacker mode death handler: every kill funds the CPU defender's
 *  treasury (which auto-spends on tower upgrades). The player's
 *  economy is not credited — the player's "win" is leaks, not kills. */
export class AttackerDeathHandler implements DeathHandler {
  private economy: EconomyManager;  // for reading the kill-gold curve
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private addToDefenderTreasury: (amount: number) => void;

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    addToDefenderTreasury: (amount: number) => void,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.addToDefenderTreasury = addToDefenderTreasury;
  }

  onCreepKilled(_creep: Creep): void {
    const killGold = this.economy.getKillGold();
    this.addToDefenderTreasury(killGold);
    this.eventBus.emit('creepKilled', 0, 0); // 0 to player
    this.statsTracker.recordKill();
  }
}

export interface LeakResult {
  totalLeakDamage: number;
  leakCount: number;
}

/**
 * Manages creep lifecycle: movement, leaks, kills, cleanup.
 * Leak and death behavior is pluggable via handlers.
 */
export class CreepManager {
  creeps: Creep[] = [];
  totalCreepsKilled: number = 0;
  leakHandler: LeakHandler;
  deathHandler: DeathHandler;
  /** Shared `Phaser.GameObjects.Graphics` for every creep's HP bar /
   *  shadow / status overlay. One render entry per frame instead of
   *  N. Set by GameScene via `setOverlay`; left null in headless. */
  private overlay: any = null;
  /** Creeps killed during the most recent update tick. Consumed by
   *  kill-reactive tower traits (e.g. life_on_kill) on the NEXT tower
   *  update pass, then cleared at the top of the following update. */
  justDiedCreeps: Creep[] = [];

  constructor(leakHandler: LeakHandler, deathHandler: DeathHandler) {
    this.leakHandler = leakHandler;
    this.deathHandler = deathHandler;
  }

  /** Wire in the shared overlay graphics. Called once by GameScene
   *  after `add.graphics()` is available. No-op in headless. */
  setOverlay(g: any): void {
    this.overlay = g;
  }

  /** Clear the shared overlay and redraw every living creep into it
   *  in a single pass. Cheap because it's one Graphics → one render
   *  entry, regardless of creep count. */
  drawAll(): void {
    if (!this.overlay) return;
    this.overlay.clear();
    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;
      creep.drawInto(this.overlay);
    }
  }

  /** Update all creeps, process leaks and kills. Returns leak damage. */
  update(delta: number): LeakResult {
    // Clear last frame's kill list — tower-update pass in the current
    // tick has already consumed it before CreepManager runs.
    this.justDiedCreeps.length = 0;

    // Move creeps
    for (const creep of this.creeps) {
      creep.update(delta, this.creeps);
    }

    // Process leaks via handler
    let totalLeakDamage = 0;
    let leakCount = 0;
    for (const creep of this.creeps) {
      if (creep.reached) {
        const damage = this.leakHandler.onCreepLeaked(creep);
        totalLeakDamage += damage;
        leakCount++;
        creep.reached = false;
        creep.alive = false;
        // Destroy any lingering sprite. Normally Creep.update tears
        // down the sprite when the creep walks off the end of its
        // path (pathIndex >= path.length), but `reached` can also be
        // set externally — e.g. by the wave-stuck recovery path
        // (forceLeakAllAlive) or any future leak-promotion logic.
        // Without this, the leaked creep's sprite gets orphaned and
        // sits frozen on the board forever.
        if ((creep as any).sprite) {
          (creep as any).sprite.destroy();
          (creep as any).sprite = null;
        }
      }
    }

    // Process kills via handler
    for (const creep of this.creeps) {
      if (!creep.alive && !creep.reached && creep.hp <= 0) {
        this.deathHandler.onCreepKilled(creep);
        this.totalCreepsKilled++;
        this.justDiedCreeps.push(creep);
        creep.hp = -999; // sentinel to prevent double-processing
      }
    }

    // Clean up dead
    this.creeps = this.creeps.filter(c => c.alive);

    return { totalLeakDamage, leakCount };
  }

  /** Auto-recovery: mark every alive creep as `reached` so the next
   *  update tick processes them through the leak handler. Used by
   *  WaveController when a wave has been stuck past the force-clear
   *  threshold (typically a single creep mis-pathed after a tower
   *  placement and the wave-end gate is waiting for it to finish).
   *  Without this the entire match can hang on one stuck creep. */
  forceLeakAllAlive(): void {
    for (const creep of this.creeps) {
      if (creep.alive) creep.reached = true;
    }
  }

  /** Find nearest creep to a pixel position */
  findCreepNear(px: number, py: number, maxDist: number): Creep | null {
    let closest: Creep | null = null;
    let closestDist = maxDist;
    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - px;
      const dy = creep.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closest = creep;
        closestDist = dist;
      }
    }
    return closest;
  }
}
