/**
 * GreenwardMissionController — per-mission orchestrator that bundles
 * ConsecrationManager + MercyWatcherTracker + per-mission ModeLean
 * contribution + MissionResult.custom writeback.
 *
 * Constructed from `MissionOverrides.greenwardRules` at scene init.
 * GameScene's mission-init code:
 *
 *   1. Reads `mission.overrides.greenwardRules` if present.
 *   2. Constructs a GreenwardMissionController with those rules.
 *   3. Calls `tick(now, deltaMs, towers)` each frame.
 *   4. Calls `bindDefender / bindWatcher` as Inheritor creeps spawn.
 *   5. Calls `notifyCreepKilled / notifyCreepDamaged` from creep
 *      lifecycle events.
 *   6. At game-end, reads `getMissionResultCustom()` and merges into
 *      `missionResult.custom`. ModeLeanTracker.recordMission is also
 *      called at this step so the campaign-wide tally advances.
 *
 * This module is intentionally thin — the heavy lifting lives in the
 * primitives (ConsecrationManager / MercyWatcher / ModeLeanTracker).
 * The controller is the glue.
 */

import { ConsecrationManager, type RuinSpec, type ConsecrationTower } from './ConsecrationManager';
import { MercyWatcherTracker } from './MercyWatcher';
import { recordMission } from './ModeLeanTracker';
import type { WatcherInWaveSpawn } from './GreenwardSpawns';

/** Minimal creep contract for tick-side scanning. Real Creep carries
 *  more fields but the controller reads only id / typeId / hp / cell.
 *  Defined here (not imported from Creep) so the controller stays
 *  Phaser-free for unit tests. */
export interface NamedCreepRef {
  id: number;
  creepTypeId: string;
  hp: number;
  col: number;
  row: number;
}

export interface GreenwardMissionRules {
  ruins: RuinSpec[];
}

/** Plain-object snapshot that GameScene merges into MissionResult.custom
 *  at game-end. Star objective predicates read these. */
export interface GreenwardMissionCustom {
  /** Total ruins claimed across all modes. */
  ruinsClaimed: number;
  ceremonyClaims: number;
  siegeClaims: number;
  mercyClaims: number;
  /** True iff every Mercy ruin still has an unharmed Watcher. */
  watcherUnharmed: boolean;
  /** For boss-mission Mercy: the Child Watcher specifically. Set true
   *  by default; the mission can flip it via a custom flag. */
  childUnharmed: boolean;
  /** Reserves drained during this mission (delta from start). */
  reservesSpent: number;
  /** Reserves remaining at end (snapshot from WildwoodReserves). */
  reservesRemaining: number;
  /** M5 fast-clear flag — set by the mission's controller when the
   *  headwater Ceremony completes within the speedrun window. */
  headwaterClaimed: boolean;
  /** M3 only: chant interrupted within first 60s. Set by mission code. */
  chantInterruptedFastMs: number;
  /** M6 civilians killed. Tracked per-mission externally. */
  civiliansKilled: number;
  /** M8 named-boss flags. Tracked by per-mission code. */
  knightKilled: boolean;
  heraldKilled: boolean;
  /** M9 only: distinct Nature creep-unit types sent by Marra. */
  distinctCreepUnitsSent: number;
  /** M7 only: distinct tower types used (≤2 for star 3). */
  distinctTowerTypesUsed: number;
  /** M10 only: the player committed to a non-Siege Nave path. */
  naveCommittedNonSiege: boolean;
}

function defaultCustom(reservesAtStart: number): GreenwardMissionCustom {
  return {
    ruinsClaimed: 0,
    ceremonyClaims: 0,
    siegeClaims: 0,
    mercyClaims: 0,
    watcherUnharmed: true,
    childUnharmed: true,
    reservesSpent: 0,
    reservesRemaining: reservesAtStart,
    headwaterClaimed: false,
    chantInterruptedFastMs: Infinity,
    civiliansKilled: 0,
    knightKilled: false,
    heraldKilled: false,
    distinctCreepUnitsSent: 0,
    distinctTowerTypesUsed: 0,
    naveCommittedNonSiege: false,
  };
}

export class GreenwardMissionController {
  readonly consecration: ConsecrationManager;
  readonly mercyWatcher: MercyWatcherTracker;
  /** Reserves at mission start — used to compute `reservesSpent` for
   *  the MissionResult writeback. */
  private readonly reservesAtStart: number;
  /** Mutable per-mission counters set by external mission code (e.g.
   *  M3 chant timer, M9 distinct-creep-units). Merged into the custom
   *  output at game-end. */
  private readonly extra: Partial<GreenwardMissionCustom> = {};
  /** Pending WatcherInWaveSpawn entries — the wave-script will spawn
   *  a creep of each typeId; the controller's tick scans live creeps
   *  and binds the first match to MercyWatcherTracker, then removes
   *  the entry from this list. */
  private pendingWatcherBindings: WatcherInWaveSpawn[] = [];

  constructor(rules: GreenwardMissionRules, reservesAtStart: number) {
    this.consecration = new ConsecrationManager(rules.ruins);
    this.mercyWatcher = new MercyWatcherTracker(this.consecration);
    this.reservesAtStart = reservesAtStart;
  }

  /** Register a wave-mingled Watcher binding. Stays pending until a
   *  creep of the matching typeId appears in the per-frame tick. */
  registerPendingWatcherBinding(spawn: WatcherInWaveSpawn): void {
    this.pendingWatcherBindings.push(spawn);
  }

  /** Per-frame tick. Three concerns:
   *
   *    1. Ceremony channel progress (forwarded to ConsecrationManager).
   *
   *    2. Resolve pending WatcherInWave bindings — scan `creeps` for
   *       the first one matching each pending typeId; bind + remove
   *       from the pending list.
   *
   *    3. HP-change scan for bound Watchers — push the creep's
   *       current HP to MercyWatcherTracker.notifyHpChanged so any
   *       damage taken flips mercyWatcherTouched on the ruin.
   *
   *  Concerns 2 and 3 are no-ops when no watchers are bound (the
   *  common case across the campaign — most missions have zero or
   *  one Watcher). The per-frame cost is one creep scan with early
   *  exits, not measurable. */
  tick(
    now: number,
    deltaMs: number,
    towers: ConsecrationTower[],
    creeps: readonly NamedCreepRef[] = [],
  ): void {
    this.consecration.update(now, deltaMs, towers);
    this._resolvePendingBindings(creeps);
    this._scanWatcherHp(creeps);
  }

  private _resolvePendingBindings(creeps: readonly NamedCreepRef[]): void {
    if (this.pendingWatcherBindings.length === 0) return;
    for (let i = this.pendingWatcherBindings.length - 1; i >= 0; i--) {
      const pending = this.pendingWatcherBindings[i];
      const match = creeps.find(c => c.creepTypeId === pending.typeId);
      if (!match) continue;
      this.mercyWatcher.attach(
        { creepId: match.id, col: match.col, row: match.row, ruinId: pending.ruinId },
        match.hp,
      );
      this.pendingWatcherBindings.splice(i, 1);
    }
  }

  private _scanWatcherHp(creeps: readonly NamedCreepRef[]): void {
    const bindings = this.mercyWatcher.getBindings();
    if (bindings.length === 0) return;
    for (const binding of bindings) {
      const creep = creeps.find(c => c.id === binding.creepId);
      if (!creep) continue;
      this.mercyWatcher.notifyHpChanged(binding.creepId, creep.hp);
    }
  }

  /** External setter — mission-specific code (e.g. M3's chant
   *  interrupt timer) writes to the custom bag through here. */
  setCustom<K extends keyof GreenwardMissionCustom>(key: K, value: GreenwardMissionCustom[K]): void {
    this.extra[key] = value;
  }

  /** Bump a numeric counter. Useful for "distinctTowerTypesUsed",
   *  "civiliansKilled", etc. */
  incCustom<K extends keyof GreenwardMissionCustom>(key: K, by = 1): void {
    const cur = (this.extra[key] as unknown as number | undefined) ?? 0;
    (this.extra[key] as unknown) = cur + by;
  }

  /** Build the final MissionResult.custom payload for this mission.
   *  Called at game-end by GameScene before MissionRunner.finalize.
   *  Also advances the campaign-wide ModeLeanTracker tally. */
  finalize(reservesRemaining: number): GreenwardMissionCustom {
    const snap = this.consecration.getSnapshot();
    const base: GreenwardMissionCustom = {
      ...defaultCustom(this.reservesAtStart),
      ruinsClaimed: snap.claimedByMode.ceremony + snap.claimedByMode.siege + snap.claimedByMode.mercy,
      ceremonyClaims: snap.claimedByMode.ceremony,
      siegeClaims: snap.claimedByMode.siege,
      mercyClaims: snap.claimedByMode.mercy,
      watcherUnharmed: snap.allMercyWatchersUnharmed,
      reservesSpent: Math.max(0, this.reservesAtStart - reservesRemaining),
      reservesRemaining,
    };
    // Per-mission overrides take precedence over the derived fields
    // — e.g. M8 explicitly sets childUnharmed even though base
    // already defaults true.
    const final = { ...base, ...this.extra };

    // Advance the campaign-wide mode-lean tally exactly once per
    // mission completion. The caller (MissionRunner.finalize hook)
    // is responsible for invoking finalize() exactly once.
    recordMission({
      ceremony: final.ceremonyClaims,
      siege: final.siegeClaims,
      mercy: final.mercyClaims,
    });

    return final;
  }
}
