/**
 * ConsecrationManager — Greenward's signature gameplay system.
 *
 * Owns the per-mission set of "ruin tiles" the player must claim.
 * Each ruin is locked to one of three modes — Ceremony, Siege, Mercy —
 * each with its own claim rules. Mode mix per mission is set by the
 * mission def via `MissionOverrides.greenwardRuins` (added in Phase 3
 * mission commits).
 *
 *   - Ceremony: the player places a Blossom adjacent to the ruin;
 *     a channel ticks for CEREMONY_CHANNEL_MS without the Blossom
 *     being destroyed. Star objectives may require the Blossom take
 *     no damage at all.
 *
 *   - Siege: the ruin auto-claims when every Inheritor defender
 *     bound to it has been killed. Defenders register on spawn via
 *     `bindDefender(ruinId, creep)`.
 *
 *   - Mercy: a "Watcher" creep is bound to the ruin via
 *     `bindWatcher(ruinId, creep)`. The ruin claims when every OTHER
 *     defender bound to the ruin is dead, provided the Watcher took
 *     no damage. The Watcher is meant to survive; touching them
 *     fails the mercy mode (mission still finishes — the player
 *     can fall back to Siege at the controller's discretion).
 *
 * This module is the data + logic layer. Integration with creep /
 * tower lifecycle events arrives when MercyWatcherSystem (Phase 2
 * commit 6) plumbs notifications in. The class is also the runtime
 * surface that ModeLeanTracker (commit 7) reads to update the
 * campaign-wide mode tally on mission end.
 *
 * Design: docs/greenward-campaign-plan.md — "Consecration Modes".
 */

/** The three modes a ruin can be claimed in. */
export type RuinMode = 'ceremony' | 'siege' | 'mercy';

/** Per-ruin spec, declared by the mission def. */
export interface RuinSpec {
  /** Stable id within the mission. Used by binders / UI / e2e. */
  id: string;
  /** Grid cell. The ruin occupies one tile; Ceremony detects
   *  Blossoms in the 4-adjacent neighborhood. */
  col: number;
  row: number;
  /** Claim mode. The mission's mode mix is the union of every
   *  ruin's mode field. */
  mode: RuinMode;
}

/** Per-ruin runtime state. `progress01` is 0..1 for Ceremony channel;
 *  always 0 or 1 for Siege / Mercy. */
export interface RuinClaimState {
  spec: RuinSpec;
  claimed: boolean;
  /** Ceremony only: 0..1 channel progress. Reset to 0 when no Blossom
   *  is adjacent (or the adjacent Blossom dies). */
  progress01: number;
  /** Mercy only: true when the Watcher took damage. Locks the
   *  Watcher-unharmed star objective. */
  mercyWatcherTouched: boolean;
  /** Bound creeps (Siege defenders + Mercy non-Watcher creeps). The
   *  manager removes entries as they die. */
  defenders: Set<number>;
  /** Mercy only: bound Watcher creep id. -1 = unbound. */
  watcherCreepId: number;
}

/** Minimal creep contract — manager reads only what it needs. Real
 *  Creep has many more fields. */
export interface ConsecrationCreep {
  /** Stable id used by event hooks. Existing Creep already exposes
   *  a numeric `id`. */
  id: number;
  alive: boolean;
  /** Current hp; the manager compares against `maxHp` to detect
   *  "took any damage" for Mercy fail. */
  hp: number;
  maxHp: number;
}

/** Minimal tower contract — manager reads only what it needs. */
export interface ConsecrationTower {
  col: number;
  row: number;
  typeId: string;
}

/** Ceremony channel duration. 10 seconds matches the writer-locked
 *  prose ("hold the channel"). */
export const CEREMONY_CHANNEL_MS = 10_000;

/** Tower typeId that satisfies Ceremony's "Blossom adjacent" check.
 *  Exposed as a const so a future variant (e.g. branched Blossom
 *  upgrade) can extend the predicate without touching the manager. */
export const CEREMONY_TOWER_TYPE_ID = 'nature_blossom';

/** Reusable empty array — returned when no defenders are bound. */
const NO_DEFENDERS: number[] = [];

export class ConsecrationManager {
  private states: Map<string, RuinClaimState>;
  /** Quick lookup from (col, row) to ruinId for tower-placement
   *  adjacency checks. */
  private cellLookup: Map<string, string>;

  constructor(specs: RuinSpec[]) {
    this.states = new Map();
    this.cellLookup = new Map();
    for (const spec of specs) {
      this.states.set(spec.id, {
        spec,
        claimed: false,
        progress01: 0,
        mercyWatcherTouched: false,
        defenders: new Set(),
        watcherCreepId: -1,
      });
      this.cellLookup.set(`${spec.col},${spec.row}`, spec.id);
    }
  }

  /** Read-only view of all ruins. */
  getRuins(): readonly RuinClaimState[] {
    return Array.from(this.states.values());
  }

  /** Lookup by id. */
  getRuin(id: string): RuinClaimState | null {
    return this.states.get(id) ?? null;
  }

  /** Count of claimed ruins. Used by star-objective predicates +
   *  ModeLeanTracker. */
  getClaimedCount(): number {
    let n = 0;
    for (const s of this.states.values()) if (s.claimed) n++;
    return n;
  }

  /** Count of claimed ruins by mode. Drives the ModeLeanTracker
   *  per-mission contribution. */
  getClaimedCountByMode(mode: RuinMode): number {
    let n = 0;
    for (const s of this.states.values()) if (s.claimed && s.spec.mode === mode) n++;
    return n;
  }

  // ─── Bindings (called at mission/creep spawn time) ─────────────

  /** Register a creep as a defender for a Siege or Mercy ruin. */
  bindDefender(ruinId: string, creepId: number): void {
    const s = this.states.get(ruinId);
    if (!s) return;
    s.defenders.add(creepId);
  }

  /** Register the Watcher for a Mercy ruin. Setting on a non-mercy
   *  ruin is a no-op. */
  bindWatcher(ruinId: string, creepId: number): void {
    const s = this.states.get(ruinId);
    if (!s || s.spec.mode !== 'mercy') return;
    s.watcherCreepId = creepId;
  }

  // ─── Lifecycle hooks (called from per-frame integration) ───────

  /** Per-frame tick. `now` and `deltaMs` are scene clock + frame ms.
   *  `towers` is the alive tower list (manager checks Blossom adjacency
   *  each tick rather than subscribing to placeTower events — simpler
   *  and works the same in headless tests). */
  update(now: number, deltaMs: number, towers: ConsecrationTower[]): void {
    for (const s of this.states.values()) {
      if (s.claimed) continue;
      if (s.spec.mode !== 'ceremony') continue;
      const hasBlossom = this._hasAdjacentBlossom(s.spec, towers);
      if (!hasBlossom) {
        s.progress01 = 0;
        continue;
      }
      s.progress01 = Math.min(1, s.progress01 + deltaMs / CEREMONY_CHANNEL_MS);
      if (s.progress01 >= 1) s.claimed = true;
    }
  }

  /** Notify the manager that a creep just died. Triggers Siege
   *  auto-claim and Mercy auto-claim (when only the Watcher remains).
   *  Mercy ruins with a touched Watcher do NOT auto-claim — the
   *  player has already failed the mercy condition. */
  notifyCreepKilled(creepId: number): void {
    for (const s of this.states.values()) {
      if (s.claimed) continue;
      if (!s.defenders.has(creepId)) continue;
      s.defenders.delete(creepId);
      if (s.spec.mode === 'siege') {
        if (s.defenders.size === 0) s.claimed = true;
      } else if (s.spec.mode === 'mercy') {
        if (s.defenders.size === 0 && !s.mercyWatcherTouched) s.claimed = true;
      }
    }
  }

  /** Mercy-side: notify the manager that the Watcher took damage.
   *  Locks `mercyWatcherTouched` on the relevant ruin. */
  notifyWatcherDamaged(creepId: number): void {
    for (const s of this.states.values()) {
      if (s.spec.mode !== 'mercy') continue;
      if (s.watcherCreepId !== creepId) continue;
      s.mercyWatcherTouched = true;
    }
  }

  /** True iff all Mercy ruins on this mission still have an unharmed
   *  Watcher. Used by mission objective predicates. */
  allMercyWatchersUnharmed(): boolean {
    for (const s of this.states.values()) {
      if (s.spec.mode !== 'mercy') continue;
      if (s.mercyWatcherTouched) return false;
    }
    return true;
  }

  /** Snapshot for UI + e2e + the writeable MissionResult.custom slot.
   *  Per-ruin claim state + per-mode counts. Stable shape; safe to
   *  assert against from a Playwright spec. */
  getSnapshot(): {
    ruins: { id: string; mode: RuinMode; claimed: boolean; progress01: number }[];
    claimedByMode: { ceremony: number; siege: number; mercy: number };
    allMercyWatchersUnharmed: boolean;
  } {
    return {
      ruins: this.getRuins().map(s => ({
        id: s.spec.id,
        mode: s.spec.mode,
        claimed: s.claimed,
        progress01: s.progress01,
      })),
      claimedByMode: {
        ceremony: this.getClaimedCountByMode('ceremony'),
        siege: this.getClaimedCountByMode('siege'),
        mercy: this.getClaimedCountByMode('mercy'),
      },
      allMercyWatchersUnharmed: this.allMercyWatchersUnharmed(),
    };
  }

  // ─── Internal ───────────────────────────────────────────────────

  private _hasAdjacentBlossom(spec: RuinSpec, towers: ConsecrationTower[]): boolean {
    for (const t of towers) {
      if (t.typeId !== CEREMONY_TOWER_TYPE_ID) continue;
      const dc = Math.abs(t.col - spec.col);
      const dr = Math.abs(t.row - spec.row);
      // 4-adjacent only (Chebyshev = 1 with no diagonals).
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) return true;
    }
    return false;
  }
}

// Note: NO_DEFENDERS is intentionally unused above (kept for forward
// compatibility when a `getDefenders(ruinId)` accessor lands). Keeping
// it un-exported avoids tree-shake noise.
void NO_DEFENDERS;
