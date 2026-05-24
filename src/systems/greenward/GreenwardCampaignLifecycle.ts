/**
 * GreenwardCampaignLifecycle — typed reachability bridge for ADR-0003.
 *
 * Greenward's runtime predates the per-campaign Mission Controller
 * pattern (the controller is constructed inside GameScene's
 * `installGreenwardRules` host method and stored on a
 * `_greenwardController` private scene field, then ticked from the
 * scene's update loop, then nulled by `removeGreenwardRules`). That
 * pattern is grandfathered indefinitely per ADR-0003's revised
 * position — see the "Adoption status across existing campaigns"
 * section.
 *
 * This wrapper is the **minimum viable** migration to the new
 * pattern: a thin `LifecycleAspect` that GameScene populates with
 * references to its already-constructed controllers, allowing DOM
 * consumers to reach them through
 * `MissionRunner.getActiveLifecycle(GreenwardCampaignLifecycle)` →
 * the same typed-accessor cross-DOM pattern Snake Eyes uses. The
 * scene still owns construction, tick, and teardown of the
 * controllers; this wrapper does not duplicate them.
 *
 * Two payoffs this unlocks (for future Greenward work, not today):
 *   1. A DOM-side feature wanting mid-mission Consecration state
 *      (e.g. a HUD overlay) can `getActiveGreenwardController()` and
 *      get a typed instance back — no module globals, no `instanceof`
 *      narrowing scattered through call sites.
 *   2. Future migrations of the in-scene callsites (the 7 places that
 *      currently touch `_greenwardController` directly) can move one
 *      at a time, going through the wrapper's getters, until the
 *      scene field is deleted.
 *
 * For campaign #5 this file IS the worked example referenced in
 * ADR-0003. The pattern should be: implement LifecycleAspect, accept
 * controller references from the host's install method, expose them
 * via getters, and provide a typed accessor in the same module.
 */
import type { LifecycleAspect } from '../campaign/types';
import type { GreenwardMissionController } from './GreenwardMissionController';
import type { GreenwardFinaleController } from './GreenwardFinaleController';
import { MissionRunner } from '../missions/MissionRunner';

export class GreenwardCampaignLifecycle implements LifecycleAspect {
  private controller: GreenwardMissionController | null = null;
  private finaleController: GreenwardFinaleController | null = null;

  /** Called by `GameScene.installGreenwardRules` after the scene
   *  constructs its controllers. The wrapper is reference-only — it
   *  does not own construction or teardown. */
  setControllers(
    controller: GreenwardMissionController,
    finaleController: GreenwardFinaleController | null,
  ): void {
    this.controller = controller;
    this.finaleController = finaleController;
  }

  getController(): GreenwardMissionController | null {
    return this.controller;
  }

  getFinaleController(): GreenwardFinaleController | null {
    return this.finaleController;
  }

  /** No-op — GameScene's update loop still ticks the controllers
   *  directly (see `_greenwardController.tick(...)` inside
   *  GameScene.update). Moving the tick here would require migrating
   *  the seven other `_greenwardController` callsites at the same
   *  time, which is outside the scope of the reachability-only
   *  bridge described in this file's module header. */
  update(_deltaMs: number): void {
    // intentionally empty
  }

  /** No-op — `GameScene.removeGreenwardRules` nulls the scene's
   *  controller refs, which are the load-bearing ones. The wrapper's
   *  references go out of scope when the per-mission runtime is
   *  cleared by MissionRunner. */
  shutdown(): void {
    this.controller = null;
    this.finaleController = null;
  }
}

/**
 * Cross-DOM typed accessor for the active Greenward mission
 * controller. Returns `null` when:
 *   - no mission is currently active
 *   - the active mission belongs to a different campaign
 *   - the runtime's lifecycle isn't a Greenward wrapper (e.g. a
 *     Greenward mission shipped without aspects, though no such
 *     mission exists today)
 *   - the wrapper exists but the scene hasn't yet populated its
 *     controller reference (brief window between `startV2` and the
 *     scene's `installGreenwardRules` host call)
 *
 * Same pattern as `getActiveSnakeEyesController` — the only sanctioned
 * way for DOM-land to reach the Greenward controller.
 */
export function getActiveGreenwardController(): GreenwardMissionController | null {
  const wrapper = MissionRunner.getActiveLifecycle(GreenwardCampaignLifecycle);
  return wrapper?.getController() ?? null;
}
