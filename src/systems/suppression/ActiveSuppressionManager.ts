/**
 * ActiveSuppressionManager — module-level singleton pointing at the
 * SuppressionManager owned by the currently-active GameScene.
 *
 * Trait handlers in the creep damage pipeline (Trait.ts
 * `registerCreepDamage`) don't get scene context — they receive only
 * the trait + raw damage number. The `mech_pylon_vent_armor` trait
 * on the M5 flagship walker needs to know "is any pylon currently
 * muted?" at the moment the creep takes damage, so this module
 * exposes a global pointer the handler can query.
 *
 * Lifecycle:
 *   - GameScene calls `setActiveSuppressionManager(this._suppressionMgr)`
 *     once the manager is instantiated.
 *   - GameScene calls `setActiveSuppressionManager(null)` on scene
 *     shutdown so a stale reference doesn't leak into the next scene.
 *
 * Pattern mirrors how `__td_test` is exposed for Playwright: a
 * narrowly-scoped escape hatch that exists because the trait
 * pipeline's per-call context doesn't carry the right state for
 * pylon-aware damage handlers.
 */

import type { SuppressionManager } from './SuppressionManager';

let _active: SuppressionManager | null = null;

/** Register the SuppressionManager owned by the active GameScene.
 *  Pass `null` on scene shutdown. */
export function setActiveSuppressionManager(mgr: SuppressionManager | null): void {
  _active = mgr;
}

/** Read the active manager, or null if no Mech mission is running. */
export function getActiveSuppressionManager(): SuppressionManager | null {
  return _active;
}

/** Convenience: true iff the active manager exists AND reports at
 *  least one currently-muted pylon. Returns false in all other
 *  cases (no manager, no pylons, no mutes). */
export function isAnyPylonMutedNow(): boolean {
  return _active?.hasAnyMutedPylonNow() ?? false;
}

/** Test-only — clear the singleton between cases. */
export function _resetActiveSuppressionManagerForTest(): void {
  _active = null;
}
