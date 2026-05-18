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

  constructor(rules: GreenwardMissionRules, reservesAtStart: number) {
    this.consecration = new ConsecrationManager(rules.ruins);
    this.mercyWatcher = new MercyWatcherTracker(this.consecration);
    this.reservesAtStart = reservesAtStart;
  }

  /** Per-frame tick. Forwards to ConsecrationManager.update for
   *  Ceremony progress. */
  tick(now: number, deltaMs: number, towers: ConsecrationTower[]): void {
    this.consecration.update(now, deltaMs, towers);
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
