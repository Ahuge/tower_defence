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
import type { RuntimeAspects, SetupAspect, LifecycleAspect } from '../campaign/types';
import type { ArcaneFinaleRules } from '../../data/campaigns/arcane-v2';

export function arcaneFinaleRuntime(rules: ArcaneFinaleRules): RuntimeAspects {
  const setup: SetupAspect = {
    install(world) {
      world.installArcaneFinale(rules);
    },
  };
  // Host owns the FinaleController's per-frame tick + shutdown
  // teardown today. Lifecycle methods are present-but-empty so
  // future per-aspect state has a place to land without changing
  // the aspect bundle's shape.
  // TODO(Phase E): remove this Lifecycle if it's still empty when
  //   the legacy `_finaleController` teardown moves out of
  //   GameScene.shutdown.
  const lifecycle: LifecycleAspect = {
    update: () => { /* host ticks FinaleController in GameScene.update */ },
    shutdown: () => { /* host removes refs in GameScene.shutdown */ },
  };
  return { setup, lifecycle };
}
