/**
 * Mech — Suppression Pylons runtime (aspect refactor, Phase C2).
 *
 * Returns a `{ setup, intercept }` aspect bundle for Mech missions
 * whose campaign payload carries `kind: 'pylons'` (M2, M5, M6, M8 today).
 *
 *   Setup     — declares the pylon specs to the engine via the
 *               `WorldMutator.installSuppressionPylons` helper. The host
 *               (GameScene, once Phase C4 wires it up) creates the
 *               `SuppressionManager`, publishes it via
 *               `setActiveSuppressionManager(mgr)` so the
 *               `mech_pylon_vent_armor` creep trait can query mute state
 *               without scene context, and renders the pylons. Phase C2
 *               does NOT change GameScene — this aspect bundle isn't
 *               yet routed in production; legacy GameScene branches still
 *               own the install. The aspect's contract is exercised in
 *               isolation via `MechPylonsRuntime.test.ts`.
 *
 *   Intercept — `onCellClick(col, row)` consumes the click and starts
 *               a channel when the cell is a pylon. Reads the active
 *               SuppressionManager via the existing module-level
 *               `getActiveSuppressionManager()` singleton so the aspect
 *               doesn't carry its own manager handle — same path the
 *               creep trait uses, so the legacy and aspect-based
 *               codepaths share infrastructure.
 *
 * `opts.now` and `opts.log` are injected so the aspect is testable
 * without a Phaser scene. C4 will pass scene-bound implementations
 * (`scene.time.now`, `scene.eventLog.gameMessage`) when wiring through
 * `MissionRunner.startV2`.
 */
import type { RuntimeAspects, SetupAspect, InterceptAspect } from '../campaign/types';
import type { SuppressionPylonSpec } from '../../data/Maps';
import { getActiveSuppressionManager } from '../suppression/ActiveSuppressionManager';

export interface MechPylonsRuntimeOpts {
  /** Current scene time in ms. Defaults to `Date.now()`. C4 passes
   *  `() => scene.time.now` so channel start/end follow scene-time
   *  (which honours pause / time-scale changes), not wall-clock. */
  now?: () => number;
  /** Player-facing message sink. Defaults to a no-op so tests don't
   *  depend on a real event log. C4 passes
   *  `(msg) => scene.eventLog.gameMessage(msg)`. */
  log?: (msg: string) => void;
}

export function mechPylonsRuntime(
  pylons: SuppressionPylonSpec[],
  opts: MechPylonsRuntimeOpts = {},
): RuntimeAspects {
  const now = opts.now ?? (() => Date.now());
  const log = opts.log ?? (() => { /* no-op */ });

  const setup: SetupAspect = {
    install(world) {
      world.installSuppressionPylons(pylons);
    },
  };

  const intercept: InterceptAspect = {
    onCellClick(col, row) {
      const mgr = getActiveSuppressionManager();
      if (!mgr) return false;
      const pylon = mgr.pylonAt(col, row);
      if (!pylon) return false;
      const result = mgr.startChannelAt(col, row, now());
      if (result === 'started') log('Channeling suppression pylon…');
      else if (result === 'already_muted') log('Pylon already muted.');
      // Consume the click regardless of channel outcome — the legacy
      // handler `return`s after the pylon branch in either case
      // (started / already_muted / cooldown), so dropping back to
      // tower-place logic would diverge from current behaviour.
      return true;
    },
  };

  return { setup, intercept };
}
