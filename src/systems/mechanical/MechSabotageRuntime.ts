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
import type { RuntimeAspects, SetupAspect, LifecycleAspect } from '../campaign/types';
import type { MechSabotageRules } from '../../data/campaigns/mechanical-v2';

export function mechSabotageRuntime(rules: MechSabotageRules): RuntimeAspects {
  // C4: Setup forwards to the host's `installMechSabotage` method
  // (lives on GameScene). The host atomically constructs
  // SabotageController + SabotageRender, blocks the workshop 2×2
  // footprint, reverses the send path, and wires the SABOTAGE_*_EVENT
  // DOM listeners. Single rich method instead of split installs —
  // SabotageController's deps don't split cleanly across calls.
  const setup: SetupAspect = {
    install(world) {
      world.installMechSabotage(rules);
    },
  };
  // The host owns the controller's per-frame ticking + shutdown
  // teardown (still done in GameScene.update + shutdown today). The
  // Lifecycle hooks are present-but-empty so future per-aspect state
  // (e.g. workshop panel auto-close on shutdown) has a place to land
  // without changing the aspect bundle's shape.
  // TODO(Phase E): remove this Lifecycle if it's still empty when the
  //   legacy `_sabotageController` / `SABOTAGE_*_EVENT` teardown moves
  //   out of GameScene.shutdown. An empty Lifecycle is dead weight.
  const lifecycle: LifecycleAspect = {
    update: () => { /* host ticks SabotageController in GameScene.update */ },
    shutdown: () => { /* host removes listeners + nulls refs in GameScene.shutdown */ },
  };
  return { setup, lifecycle };
}
