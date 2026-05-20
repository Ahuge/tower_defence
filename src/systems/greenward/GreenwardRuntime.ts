/**
 * Greenward — per-mission Consecration runtime (Phase D2).
 *
 * Setup forwards `{ rules, isFinale }` through the host's
 * `installGreenwardRules(rules, isFinale)` method (GameScene). The
 * host atomically constructs `GreenwardMissionController` + (when
 * `isFinale`) `GreenwardFinaleController` with onComplete tied to
 * the gameWon path. Reserves regen is handled separately by
 * `GreenwardMissionStateAspect.tickBetweenMissions` (runs in
 * `MissionRunner.startV2` BEFORE scene init), so the host method
 * itself doesn't call `applyMissionRegen` — the regen happened
 * earlier in the launch pipeline.
 *
 * Lifecycle is present-but-empty — the host still owns per-frame
 * tick + shutdown teardown of both controllers today. Phase E
 * moves the tear-down here once the legacy GameScene paths drop.
 */
import type { RuntimeAspects, SetupAspect, LifecycleAspect } from '../campaign/types';
import type { RuinSpec } from './ConsecrationManager';

export interface GreenwardRuntimeConfig {
  rules: { ruins: RuinSpec[] };
  isFinale: boolean;
}

export function greenwardRuntime(cfg: GreenwardRuntimeConfig): RuntimeAspects {
  const setup: SetupAspect = {
    install(world) {
      world.installGreenwardRules(cfg.rules, cfg.isFinale);
    },
  };
  // TODO(Phase E): move legacy GreenwardController teardown out of
  // GameScene.shutdown into a real Lifecycle.shutdown body.
  const lifecycle: LifecycleAspect = {
    update: () => { /* host ticks GreenwardMissionController + Finale in GameScene.update */ },
    shutdown: () => { /* host disposes refs in GameScene.shutdown */ },
  };
  return { setup, lifecycle };
}
