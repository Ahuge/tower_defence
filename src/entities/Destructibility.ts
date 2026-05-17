/**
 * DestructibleState — grouped destructibility cluster, replacing the
 * scattered `hp?` / `maxHp?` / `_lastHitAt` fields on Tower. Null when
 * the tower is invincible (every player tower in every existing
 * mission); non-null only on M10/finale CPU defender towers that the
 * hero / sends can attack.
 *
 * Lives in entities/ rather than systems/ because it's a per-entity
 * data cluster — no behavior, no global state. Construction goes
 * through `createDestructibleState` for default-aware initialization.
 *
 * Retaliation timestamps (who hit me, when) live on AssailantLog from
 * Damageable.ts rather than here — that lets DestructibleStructure
 * carry retaliation too without duplicating fields.
 */

export interface DestructibleState {
  hp: number;
  readonly maxHp: number;
  /** Scene time (ms) of the most recent damage applied. Drives the
   *  brief white-flash on the sprite in drawTower. -Infinity = never
   *  hit. */
  lastHitAt: number;
}

/** Factory. `hp` defaults to `maxHp` for fresh placements; pass
 *  explicitly when resuming from a saved state. */
export function createDestructibleState(maxHp: number, hp?: number): DestructibleState {
  return {
    hp: hp ?? maxHp,
    maxHp,
    lastHitAt: -Infinity,
  };
}
