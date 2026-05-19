/**
 * WorldMutator — concrete implementation of the `WorldMutator`
 * interface from `types.ts`.
 *
 * The mutator is the bridge between `SetupAspect.install(world)` and
 * the engine. Each helper:
 *   1. Forwards the spec to a `WorldHost` callback (the methods
 *      GameScene exposes for one-shot setup operations).
 *   2. Records an `undo` lambda in `mutations[]` so `shutdown()` can
 *      roll back cleanly when the scene tears down or fast-restarts.
 *
 * The `WorldHost` interface is narrow on purpose — only the methods
 * Setup aspects actually call. Phase C grows it as each campaign's
 * Setup needs land. Helpers whose host method isn't implemented yet
 * are no-ops in Phase B; Phase C wires them as it ports each
 * campaign. The shape of the API (`install*`, `setSendPathOverride`,
 * `registerActionIntercept`) is stable from Phase B onward.
 */
import type {
  WorldMutator,
  PrePlacedTowerSpec,
  SummoningCircleSpec,
  WorkshopSpec,
  DestructibleTowerSpec,
  ActionInterceptHandle,
} from './types';
import type { SuppressionPylonSpec } from '../../data/Maps';

/**
 * Narrow protocol that the engine satisfies — currently `GameScene`.
 * Each method is optional in Phase B; aspect helpers no-op when their
 * host method is absent. Phase C lifts mandatory ones to required as
 * each campaign needs them.
 */
export interface WorldHost {
  installPrePlacedTowers?(towers: PrePlacedTowerSpec[]): void;
  installSuppressionPylons?(pylons: SuppressionPylonSpec[]): void;
  installSummoningCircles?(circles: SummoningCircleSpec[]): void;
  installDestructibleTowers?(towers: DestructibleTowerSpec[]): void;
  installWorkshop?(spec: WorkshopSpec): void;
  applyRuinCells?(cells: Array<{ col: number; row: number; mode?: string }>): void;
  registerActionIntercept?(
    cell: { col: number; row: number },
    handler: () => boolean,
  ): ActionInterceptHandle;
  setSendPathOverride?(spec: {
    entries?: Array<{ col: number; row: number }>;
    exits?: Array<{ col: number; row: number }>;
  }): void;
  // Undo hooks — Phase C adds matching `remove*` methods so each
  // `install*` mutation can be cleanly rolled back at shutdown.
  removePrePlacedTowers?(towers: PrePlacedTowerSpec[]): void;
  removeSuppressionPylons?(): void;
  removeSummoningCircles?(): void;
  removeDestructibleTowers?(): void;
  removeWorkshop?(): void;
  clearRuinCells?(): void;
  clearSendPathOverride?(): void;
}

/**
 * Concrete `WorldMutator`. One instance per mission; `shutdown()`
 * undoes every mutation in reverse order.
 */
export class WorldMutatorImpl implements WorldMutator {
  /** Stack of undo callbacks. LIFO so order-sensitive teardowns
   *  (e.g. send-path-override must lift before pylons remove) work. */
  private mutations: Array<() => void> = [];

  constructor(private host: WorldHost) {}

  installPrePlacedTowers(towers: PrePlacedTowerSpec[]): void {
    if (towers.length === 0) return;
    this.host.installPrePlacedTowers?.(towers);
    this.mutations.push(() => this.host.removePrePlacedTowers?.(towers));
  }

  installSuppressionPylons(pylons: SuppressionPylonSpec[]): void {
    if (pylons.length === 0) return;
    this.host.installSuppressionPylons?.(pylons);
    this.mutations.push(() => this.host.removeSuppressionPylons?.());
  }

  installSummoningCircles(circles: SummoningCircleSpec[]): void {
    if (circles.length === 0) return;
    this.host.installSummoningCircles?.(circles);
    this.mutations.push(() => this.host.removeSummoningCircles?.());
  }

  installDestructibleTowers(towers: DestructibleTowerSpec[]): void {
    if (towers.length === 0) return;
    this.host.installDestructibleTowers?.(towers);
    this.mutations.push(() => this.host.removeDestructibleTowers?.());
  }

  installWorkshop(spec: WorkshopSpec): void {
    this.host.installWorkshop?.(spec);
    this.mutations.push(() => this.host.removeWorkshop?.());
  }

  applyRuinCells(cells: Array<{ col: number; row: number; mode?: string }>): void {
    if (cells.length === 0) return;
    this.host.applyRuinCells?.(cells);
    this.mutations.push(() => this.host.clearRuinCells?.());
  }

  registerActionIntercept(
    cell: { col: number; row: number },
    handler: () => boolean,
  ): ActionInterceptHandle {
    const handle = this.host.registerActionIntercept?.(cell, handler) ?? {
      release: () => { /* no-op when host doesn't support intercepts */ },
    };
    this.mutations.push(() => handle.release());
    // Wrap so the caller's release() also pops the entry; otherwise
    // shutdown would call release twice (harmless but noisy). We
    // leave the bookkeeping to shutdown for simplicity — handle's
    // release() is idempotent by contract.
    return handle;
  }

  setSendPathOverride(spec: {
    entries?: Array<{ col: number; row: number }>;
    exits?: Array<{ col: number; row: number }>;
  }): void {
    this.host.setSendPathOverride?.(spec);
    this.mutations.push(() => this.host.clearSendPathOverride?.());
  }

  /** Run every recorded undo in reverse. Safe to call multiple times. */
  shutdown(): void {
    while (this.mutations.length > 0) {
      const undo = this.mutations.pop();
      try { undo?.(); } catch (err) {
        console.warn('[WorldMutator] undo threw during shutdown:', err);
      }
    }
  }
}
