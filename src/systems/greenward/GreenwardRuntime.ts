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
 * No Lifecycle aspect: host still owns per-frame tick + shutdown
 * teardown of both controllers via `GameScene.update` +
 * `GameScene.removeGreenwardRules`.
 */
import type { RuntimeAspects, SetupAspect } from '../campaign/types';
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
  return { setup };
}
