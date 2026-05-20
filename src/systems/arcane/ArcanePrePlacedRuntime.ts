/**
 * Arcane — Pre-placed Towers runtime (Phase D1).
 *
 * Used by M1 (single Frost) and M2 (two Frosts) to gift the player
 * the Frost-interrupt verb before Frost is buildable. Aspect Setup
 * forwards the spec list through `WorldMutator.installPrePlacedTowers`
 * — the host (GameScene) is responsible for placing the towers via
 * the existing legacy code path (which Phase E lifts into a clean
 * host method).
 */
import type { RuntimeAspects, SetupAspect, PrePlacedTowerSpec } from '../campaign/types';

export function arcanePrePlacedRuntime(towers: PrePlacedTowerSpec[]): RuntimeAspects {
  const setup: SetupAspect = {
    install(world) {
      world.installPrePlacedTowers(towers);
    },
  };
  return { setup };
}
