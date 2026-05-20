/**
 * Arcane — Finale M10 runtime (Phase D1).
 *
 * Setup forwards rules through the host's `installArcaneFinale(rules)`
 * method (lives on GameScene). The host atomically constructs the
 * `FinaleController` + summoning circles + destructible towers +
 * send-path reverse — same atomic-install pattern Mech sabotage uses.
 * Single rich method instead of split installs — FinaleController's
 * deps don't split cleanly across calls.
 */
import type { RuntimeAspects, SetupAspect } from '../campaign/types';
import type { ArcaneFinaleRules } from '../../data/campaigns/arcane';

export function arcaneFinaleRuntime(rules: ArcaneFinaleRules): RuntimeAspects {
  // Host owns the FinaleController's per-frame tick + shutdown
  // teardown via `GameScene.update` + `GameScene.removeArcaneFinale`.
  // No Lifecycle aspect needed; add one when per-aspect state lands.
  const setup: SetupAspect = {
    install(world) {
      world.installArcaneFinale(rules);
    },
  };
  return { setup };
}
