/**
 * EventBusBridge — wires a campaign's `GameplayAspect` handlers to
 * the runtime `EventBus`.
 *
 * Lifecycle:
 *   - `attach(bus, gameplay)` subscribes every handler that exists
 *     on the aspect to its matching `EventBus` event. Returns a
 *     detach function that unsubscribes all of them.
 *   - The Phase B `GameScene` (Phase C onwards uses a per-mission
 *     `RuntimeAspects` bundle) calls `attach` at scene init and the
 *     returned detach at shutdown. EventBus.clear() at shutdown
 *     would also remove the listeners, but explicit detach keeps
 *     unsubscribes traceable and survives partial-teardown paths.
 *
 * Handler signatures on `GameplayAspect` are intentionally 1:1 with
 * `GameEvents` so this bridge is forward-only — no field reordering
 * or argument synthesis. That keeps it cheap and obvious.
 */
import type { EventBus, GameEvents } from '../EventBus';
import type { GameplayAspect } from './types';

/** Map of GameplayAspect handler name → EventBus event name.
 *  Source of truth for the bridge wiring. */
const EVENT_MAP: ReadonlyArray<[keyof GameplayAspect, keyof GameEvents]> = [
  ['onTowerPlaced',  'towerPlaced'],
  ['onTowerSold',    'towerSold'],
  ['onCreepKilled',  'creepKilled'],
  ['onCreepReached', 'creepReached'],
  ['onCreepSpawned', 'creepSpawned'],
  ['onWaveStarted',  'waveStarted'],
  ['onWaveCleared',  'waveCleared'],
  ['onGoldChanged',  'goldChanged'],
  ['onLivesChanged', 'livesChanged'],
  ['onGameOver',     'gameOver'],
  ['onGameWon',      'gameWon'],
];

/** Subscribe every implemented handler to its matching event. Returns
 *  a detach function that unsubscribes all of them. Idempotent on
 *  detach (calling twice is a no-op). */
export function attachGameplayAspect(bus: EventBus, gameplay: GameplayAspect): () => void {
  const bindings: Array<() => void> = [];
  for (const [handlerKey, eventKey] of EVENT_MAP) {
    const handler = gameplay[handlerKey];
    if (typeof handler !== 'function') continue;
    // Bind to preserve `this` if the aspect class uses it. The cast
    // is safe because EVENT_MAP pairs are statically consistent by
    // construction — TypeScript can't prove the pairing without a
    // mapped-type rewrite, which would obscure the table above.
    const bound = (handler as Function).bind(gameplay) as GameEvents[typeof eventKey];
    bus.on(eventKey, bound);
    bindings.push(() => bus.off(eventKey, bound));
  }
  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    for (const off of bindings) off();
  };
}
