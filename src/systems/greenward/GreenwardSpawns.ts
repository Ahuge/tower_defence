/**
 * GreenwardSpawns — per-mission named-character spawn declarations.
 *
 * Each named Watcher / boss in the Greenward campaign is declared
 * here as a `NamedSpawn` record. GameScene reads the list for the
 * active mission at scene init, instantiates the corresponding
 * Creep(s) at the recorded cell(s), and (for Watcher entries) calls
 * `MercyWatcherTracker.attach` with the resulting creep id +
 * ruinId.
 *
 * This module is the data layer; the actual Creep instantiation
 * lives in GameScene's mission-init hook for Greenward. Per-mission
 * commits across this PR add their named-character entries to the
 * mission-keyed registry below.
 */

export interface NamedSpawn {
  /** CREEP_TYPES id — `inheritor_old_woman`, `inheritor_cethric`, etc. */
  typeId: string;
  /** Spawn cell. */
  col: number;
  row: number;
  /** When set, GameScene's spawn hook calls
   *  `MercyWatcherTracker.attach({ creepId, col, row, ruinId })`
   *  after instantiation. Null = boss / non-Watcher (no binding). */
  ruinId: string | null;
}

/** Mission-idx → ordered list of named spawns. Empty for missions
 *  without named characters. Per-mission commits in this PR populate
 *  each entry. */
export const NAMED_SPAWNS: Record<number, readonly NamedSpawn[]> = {
  // M3 — The Circle at Eadwin
  2: [
    { typeId: 'inheritor_old_woman', col: 18, row: 10, ruinId: 'inn_hearth' },
  ],
  // M4 — The Road of Crows
  3: [
    { typeId: 'inheritor_cethric', col: 18, row: 13, ruinId: 'crossroads' },
  ],
  // M7 — Wedding-Stone. The Stone Bride is the altar's Watcher;
  // she mingles into the wedding-stone livery so Marra cannot tell
  // from above which is the bride. Slow-walk + visual cue is the
  // identifier the writer specified.
  6: [
    { typeId: 'inheritor_stone_bride', col: 18, row: 10, ruinId: 'altar' },
  ],
  // M8 — The Stillborn Court. The Child Watcher walks behind the
  // boss host without ever fighting. Knight + Herald (commit 5)
  // are the actual boss creeps.
  7: [
    { typeId: 'inheritor_child', col: 22, row: 13, ruinId: 'the_child' },
  ],
};

/** Convenience accessor. Returns an empty array for missions with no
 *  named spawns rather than null, so callers can iterate safely. */
export function namedSpawnsFor(missionIdx: number): readonly NamedSpawn[] {
  return NAMED_SPAWNS[missionIdx] ?? [];
}
