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
 * Lifecycle aspect: a thin `GreenwardCampaignLifecycle` wrapper is
 * returned so DOM consumers can reach the controllers through the
 * `MissionRunner.getActiveLifecycle(GreenwardCampaignLifecycle)`
 * typed accessor (see `getActiveGreenwardController`). The wrapper
 * does NOT own tick/shutdown — GameScene still ticks and tears down
 * its `_greenwardController` private field directly. The wrapper is
 * a reachability bridge populated by `installGreenwardRules` after
 * the host constructs its controllers (item 6 of the campaign-#5
 * unblocker audit; worked-example for ADR-0003).
 */
import type { RuntimeAspects, SetupAspect } from '../campaign/types';
import type { RuinSpec } from './ConsecrationManager';
import { GreenwardCampaignLifecycle } from './GreenwardCampaignLifecycle';

export interface GreenwardRuntimeConfig {
  rules: { ruins: RuinSpec[] };
  isFinale: boolean;
}

export function greenwardRuntime(cfg: GreenwardRuntimeConfig): RuntimeAspects {
  const lifecycle = new GreenwardCampaignLifecycle();
  const setup: SetupAspect = {
    install(world) {
      world.installGreenwardRules(cfg.rules, cfg.isFinale);
    },
  };
  return { setup, lifecycle };
}
