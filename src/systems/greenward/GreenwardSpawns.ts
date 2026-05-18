/**
 * GreenwardSpawns — per-mission named-character spawn declarations.
 *
 * Each named Watcher in the Greenward campaign is declared here as a
 * `NamedSpawn` record. Two spawn-kinds cover the variants:
 *
 *   - **WatcherAtCellSpawn** — the named creep is placed at a fixed
 *     cell at scene init. Doesn't walk (its CreepType has
 *     `speedMultiplier: 0`). The bind to MercyWatcherTracker fires
 *     immediately at spawn time.
 *     Used by: Old Woman (M3), Cethric (M4), Child (M8).
 *
 *   - **WatcherInWaveSpawn** — the named creep arrives via the
 *     mission's normal wave-script. This record registers a pending
 *     binding; GreenwardMissionController.tick scans newly-spawned
 *     creeps each frame, and the first one with the matching typeId
 *     gets bound to the Watcher ruin. Lets a named creep mingle
 *     into a livery wave (e.g. Stone Bride hidden among
 *     wedding-stone livery in M7).
 *
 * Architecture is future-proof: a new campaign declares its own
 * NamedSpawn entries against the same mission-idx-keyed registry,
 * adds its creep types, and the GameScene dispatch handles them
 * uniformly. The discriminated `kind` field lets the compiler
 * enforce the spawn-pipeline contract per variant.
 *
 * Bosses (Knight / Herald) don't appear here — they arrive via the
 * normal wave-script and use BOSS_KILL_CUSTOM_FLAGS for the
 * death-side flag flip. Distinct concerns kept on distinct registries.
 */

/** Stationary Watcher placed at a fixed cell at scene init. */
export interface WatcherAtCellSpawn {
  kind: 'watcher_at_cell';
  /** Creep typeId. Should have `speedMultiplier: 0` so the spawned
   *  creep stays at its cell after instantiation. */
  typeId: string;
  /** Cell where the creep is placed. */
  col: number;
  row: number;
  /** ConsecrationManager Mercy ruin this Watcher binds to. */
  ruinId: string;
}

/** Watcher who arrives via the mission's wave-script. The first creep
 *  observed in CreepManager.creeps with the matching typeId gets
 *  bound. Lets a named creep mingle into a wave of livery walkers. */
export interface WatcherInWaveSpawn {
  kind: 'watcher_in_wave';
  /** Creep typeId. The mission's wave-script (in MissionOverrides)
   *  must include this typeId for the binding to ever fire. */
  typeId: string;
  /** ConsecrationManager Mercy ruin this Watcher binds to. */
  ruinId: string;
}

export type NamedSpawn = WatcherAtCellSpawn | WatcherInWaveSpawn;

/** Mission-idx → ordered list of named spawns. Empty for missions
 *  without named characters. */
export const NAMED_SPAWNS: Record<number, readonly NamedSpawn[]> = {
  // M3 — The Circle at Eadwin. Old Woman sits at the hearth.
  2: [
    { kind: 'watcher_at_cell', typeId: 'inheritor_old_woman', col: 18, row: 10, ruinId: 'inn_hearth' },
  ],
  // M4 — The Road of Crows. Cethric at the crossroads.
  3: [
    { kind: 'watcher_at_cell', typeId: 'inheritor_cethric', col: 18, row: 13, ruinId: 'crossroads' },
  ],
  // M7 — Wedding-Stone. The Stone Bride is wave-mingled — the
  // mission's wave-script must include `inheritor_stone_bride`
  // alongside wedding-stone livery for the binding to fire on her
  // spawn. The first stone-bride creep observed binds to the altar
  // ruin. Visual cue (slow-walk + moss-veil) distinguishes her
  // mid-wave for the player.
  6: [
    { kind: 'watcher_in_wave', typeId: 'inheritor_stone_bride', ruinId: 'altar' },
  ],
  // M8 — The Stillborn Court. The Child walks behind the host.
  // Knight + Herald spawn via the boss-rush wave-script (no named
  // spawn entry — see BOSS_KILL_CUSTOM_FLAGS below).
  7: [
    { kind: 'watcher_at_cell', typeId: 'inheritor_child', col: 22, row: 13, ruinId: 'the_child' },
  ],
};

/** Convenience accessor. Returns an empty array for missions with no
 *  named spawns so callers can iterate safely. */
export function namedSpawnsFor(missionIdx: number): readonly NamedSpawn[] {
  return NAMED_SPAWNS[missionIdx] ?? [];
}

/** GreenwardMissionCustom flag a boss-kill flips. Used as the value
 *  type for BOSS_KILL_CUSTOM_FLAGS so the call site at GameScene
 *  doesn't need a cast. Extend this union when adding new boss
 *  types — the compiler will flag missing entries downstream. */
export type BossKillFlag = 'knightKilled' | 'heraldKilled';

/** Boss-kill listeners — maps creep typeIds whose death flips a
 *  GreenwardMissionCustom boolean flag. GameScene's per-frame
 *  scan of CreepManager.justDiedCreeps consults this when the
 *  active mission is Greenward.
 *
 *  Distinct from NAMED_SPAWNS because bosses arrive via the normal
 *  wave-script (boss_rush archetype) — they don't need cell coords
 *  or pre-spawn binding, just a death-side trigger. */
export const BOSS_KILL_CUSTOM_FLAGS: Readonly<Record<string, BossKillFlag>> = {
  inheritor_knight: 'knightKilled',
  inheritor_herald: 'heraldKilled',
};
