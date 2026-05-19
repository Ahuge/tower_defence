/**
 * EventBusBridge — auto-subscribe / auto-unsubscribe semantics.
 *
 * Pins:
 *   - Implemented handlers fire on the matching EventBus event.
 *   - Unimplemented handlers do not subscribe (no double-fire risk
 *     if multiple aspects share a bus).
 *   - The detach return unsubscribes everything.
 *   - Detach is idempotent.
 */
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../EventBus';
import { attachGameplayAspect } from './EventBusBridge';
import type { GameplayAspect } from './types';

describe('attachGameplayAspect', () => {
  it('forwards an implemented handler to the matching event', () => {
    const bus = new EventBus();
    const onTowerPlaced = vi.fn();
    const aspect: GameplayAspect = { onTowerPlaced };
    attachGameplayAspect(bus, aspect);
    bus.emit('towerPlaced', 3, 4, 'arcane_frost');
    expect(onTowerPlaced).toHaveBeenCalledWith(3, 4, 'arcane_frost');
  });

  it('subscribes only handlers that are implemented', () => {
    const bus = new EventBus();
    const onWaveStarted = vi.fn();
    const aspect: GameplayAspect = { onWaveStarted };
    attachGameplayAspect(bus, aspect);
    // Emitting an event the aspect does not handle is a no-op — no
    // throw, no spy call.
    bus.emit('gameWon');
    expect(onWaveStarted).not.toHaveBeenCalled();
    bus.emit('waveStarted', 7);
    expect(onWaveStarted).toHaveBeenCalledWith(7);
  });

  it('detach unsubscribes every binding', () => {
    const bus = new EventBus();
    const onWaveStarted = vi.fn();
    const onCreepKilled = vi.fn();
    const aspect: GameplayAspect = { onWaveStarted, onCreepKilled };
    const detach = attachGameplayAspect(bus, aspect);
    bus.emit('waveStarted', 1);
    bus.emit('creepKilled', 42, 10);
    expect(onWaveStarted).toHaveBeenCalledTimes(1);
    expect(onCreepKilled).toHaveBeenCalledTimes(1);
    detach();
    bus.emit('waveStarted', 2);
    bus.emit('creepKilled', 99, 5);
    expect(onWaveStarted).toHaveBeenCalledTimes(1);
    expect(onCreepKilled).toHaveBeenCalledTimes(1);
  });

  it('detach is idempotent (safe to call twice)', () => {
    const bus = new EventBus();
    const onGameOver = vi.fn();
    const detach = attachGameplayAspect(bus, { onGameOver });
    detach();
    detach();
    bus.emit('gameOver');
    expect(onGameOver).not.toHaveBeenCalled();
  });

  it('binds with the aspect as `this` so class-based aspects work', () => {
    const bus = new EventBus();
    class Tally {
      total = 0;
      onCreepKilled(_id: number, gold: number) { this.total += gold; }
    }
    const t = new Tally();
    attachGameplayAspect(bus, t);
    bus.emit('creepKilled', 1, 10);
    bus.emit('creepKilled', 2, 15);
    expect(t.total).toBe(25);
  });
});
