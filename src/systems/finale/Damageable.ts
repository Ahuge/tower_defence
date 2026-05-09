/**
 * Damageable — unified interface for things the M10 finale's hero
 * (and queued sends) can attack. Implemented by `Tower` (when its
 * `destructible` flag is true) and `DestructibleStructure` (the new
 * PRD 06 entity for multi-tile boss structures).
 *
 * The hero's `findTarget<T extends Damageable>` and the send-creep
 * "attack adjacent CPU destructible" pathway both consume this
 * interface, so they don't have to branch on Tower vs Structure.
 *
 * The interface is intentionally **rich** (per the user's PRD 06
 * answer): exposes footprint dims, faction ownership, and the
 * mission-win-target flag so callers can prioritize / filter without
 * casting back to the concrete type.
 */

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

  /**
   * Apply damage. Returns true on the killing blow (HP just hit 0),
   * false otherwise. Implementations are responsible for marking
   * themselves expired — callers should NOT mutate hp directly.
   */
  takeDamage(amount: number): boolean;
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
