/**
 * Mech — Sabotage M10 runtime (aspect refactor, Phase C3 skeleton).
 *
 * Phase C3 stakes out the API surface for the M10 sabotage aspect.
 * The runtime returned here is INTENTIONALLY a placeholder — the
 * real wiring (workshop placement, destructible installation, reverse
 * send path, `SabotageController` construction, DOM event listener
 * registration on SABOTAGE_TRAIN_EVENT / SABOTAGE_UPGRADE_EVENT /
 * SABOTAGE_PANEL_CLOSE_EVENT) lands in C4 when GameScene cuts over to
 * `MissionRunner.startV2`.
 *
 * Why split: the legacy GameScene branch that owns sabotage today
 * needs scene-bound dependencies (scene, grid, economy, towerMgr,
 * mapDef-derived workshop + destructibles, mission-end callbacks).
 * Exposing those via `CampaignCtx` is a Phase B-shape change that
 * we want to keep out of the per-campaign sub-commits — C4 lifts
 * them in one focused move.
 *
 * Until C4 wires the lifecycle, the legacy code path (the
 * `_missionSabotageRules` branch in GameScene.init) continues to
 * own Sabotage M10. The aspect bundle returned here is wired into
 * `MECHANICAL_EXTENSION.buildRuntime` but never invoked, because
 * `MissionRunner.startV2` isn't called for Mech yet.
 *
 *   Setup     — (C4) installs workshop + destructible towers + reverse
 *               send path via the WorldMutator helpers from Phase B.
 *   Lifecycle — (C4) owns the SabotageController + SabotageRender
 *               + DOM event listeners. `update(delta)` ticks the
 *               controller's queued raider train cycle. `shutdown()`
 *               removes DOM listeners and disposes the controller.
 *   Gameplay  — (C4 or beyond) optional — the existing controller
 *               talks to the engine via direct callbacks today, so a
 *               gameplay aspect may not be needed.
 */
import type { RuntimeAspects, LifecycleAspect } from '../campaign/types';
import type { MechSabotageRules } from '../../data/campaigns/mechanical-v2';

export function mechSabotageRuntime(_rules: MechSabotageRules): RuntimeAspects {
  // Lifecycle stubs let C4 grow the runtime in place without
  // changing the buildRuntime dispatch in MECHANICAL_EXTENSION.
  // C2's MechPylonsRuntime returns Setup + Intercept; this skeleton
  // returns Lifecycle so the type surface for Sabotage is staked out
  // — Setup is added in C4 once the workshop + destructibles route
  // through WorldMutator instead of GameScene directly.
  const lifecycle: LifecycleAspect = {
    update: () => {
      // C4: if SabotageController grows per-frame state that isn't
      // already driven by event bus subscriptions, tick it here.
    },
    shutdown: () => {
      // C4: window.removeEventListener for SABOTAGE_TRAIN_EVENT,
      // SABOTAGE_UPGRADE_EVENT, SABOTAGE_PANEL_CLOSE_EVENT; dispose
      // controller + render.
    },
  };
  return { lifecycle };
}
