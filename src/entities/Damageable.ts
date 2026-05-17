/**
 * Damageable — unified interface for things the M10 finale's hero
 * (and queued sends) can attack. Implemented by `Tower` (when its
 * `destructible` sub-object is non-null) and `DestructibleStructure`
 * (the PRD 06 entity for multi-tile boss structures).
 *
 * The hero's `findTarget<T extends Damageable>` and the send-creep
 * "attack adjacent CPU destructible" pathway both consume this
 * interface, so they don't have to branch on Tower vs Structure.
 *
 * The interface is intentionally **rich** (per the user's PRD 06
 * answer): exposes footprint dims, faction ownership, and the
 * mission-win-target flag so callers can prioritize / filter without
 * casting back to the concrete type.
 *
 * Lives in `entities/` (not `systems/finale/`) — campaign-agnostic
 * primitive. Hero attacks, send attacks, raider attacks, future
 * destructible mechanics all route through this contract.
 */

/** Where damage came from. Drives retaliation priority on the
 *  receiving entity (e.g. a CPU tower whose hero hit it recently
 *  retaliates against the hero before falling back to range-based
 *  targeting). Typed so a typo at a call site fails at compile time
 *  instead of silently falling into `'unknown'`. */
export type DamageSource = 'hero' | 'send' | 'creep' | 'tower' | 'raider' | 'unknown';

/** Per-source last-hit timestamps (scene time ms). Lookups use the
 *  `lastBy` accessor; writes use `log`. -Infinity marks "never hit by
 *  this source." Held by every Damageable so retaliation logic works
 *  uniformly for Tower and DestructibleStructure (and any future
 *  destructible entity). */
export interface AssailantLog {
  log(source: DamageSource, now: number): void;
  lastBy(source: DamageSource): number;
}

/** Default factory — flat in-memory record. Cheap; one allocation per
 *  destructible entity. Per-source state stays public via the getter
 *  so the implementation can switch to a Map / Int32Array later if
 *  the per-frame retaliation lookup ever becomes a hot path. */
export function createAssailantLog(): AssailantLog {
  const last: Partial<Record<DamageSource, number>> = {};
  return {
    log(source, now) { last[source] = now; },
    lastBy(source) { return last[source] ?? -Infinity; },
  };
}

/** Generic damage target. Tower and DestructibleStructure both
 *  implement this. */
export interface Damageable {
  /** Stable id — not unique per instance, but identifies the kind
   *  of target (e.g. 'arcane_drain', 'arcane_archmage_throne').
   *  Useful for filtering in target priority logic. */
  readonly id: string;
  /** Pixel center of the target. For multi-cell structures this is
   *  the visual center of the footprint. */
  readonly x: number;
  readonly y: number;
  /** Top-left grid coord. For 1×1 targets, this is the cell. For 3×3
   *  the structure's cells span [col, col + widthCells). */
  readonly col: number;
  readonly row: number;
  /** Footprint in grid cells. 1×1 for towers, can be NxM for
   *  structures. */
  readonly widthCells: number;
  readonly heightCells: number;
  /** Current health. */
  hp: number;
  /** Maximum health. */
  readonly maxHp: number;
  /** Live / dead state. Equivalent to `hp > 0 && !_expired`. */
  readonly alive: boolean;
  /** Faction id (e.g. 'arcane', 'mechanical'). Used by the send
   *  attack adapter to filter "only attack non-player factions" and
   *  by the rage phase to distinguish hero from CPU creeps. */
  readonly factionId: string;
  /** Player index that owns this entity. Conventionally:
   *   - 0 / 1+ for human players
   *   - 99 for CPU defender forces (M10 throne / walls / towers)
   *  Sends only attack `ownerIndex !== <send's player>`. */
  readonly ownerIndex: number;
  /** When true, FinaleController.checkWin() requires this target to
   *  be dead before firing onWin. */
  readonly isMissionWinTarget: boolean;
  /** Per-source last-hit log. Lets retaliation logic ("X is attacking
   *  me — fire back at X first") work uniformly across destructible
   *  entity kinds. Optional for back-compat with Damageable
   *  implementations that haven't migrated yet; remove the `?` after
   *  all implementers carry one. */
  readonly assailants?: AssailantLog;

  /**
   * Apply damage. Returns true on the killing blow (HP just hit 0),
   * false otherwise. Implementations are responsible for marking
   * themselves expired — callers should NOT mutate hp directly.
   *
   * `source` lets the receiving entity log who hit it (for retaliation
   * priority). Optional for back-compat; defaults to 'unknown' inside
   * implementations that read it.
   */
  takeDamage(amount: number, source?: DamageSource): boolean;
}

/** Cheap "is this a Damageable?" runtime check — lets handlers safely
 *  accept a `unknown` target and filter. */
export function isDamageable(x: unknown): x is Damageable {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.hp === 'number' &&
    typeof o.maxHp === 'number' &&
    typeof o.takeDamage === 'function'
  );
}
