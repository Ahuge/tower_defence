/**
 * Priority-queue timer that stands in for Phaser's `scene.time`.
 *
 * Callbacks registered via `delayedCall` / `addEvent` don't fire on
 * wall-clock time — they fire when the headless match advances its
 * `tick(delta)` past their scheduled sim time. This is what lets a
 * match run at 100× realtime: we pick a delta (e.g. 32 ms per step
 * at 30 FPS sim rate) and call `tick(delta)` as fast as the CPU will
 * let us.
 *
 * Phaser surface coverage:
 *   - `time.now`  → monotonic millisecond counter (readable; used by
 *                   Hero's attack-cooldown check).
 *   - `time.delayedCall(ms, fn)` → one-shot timer, returns a handle
 *     with `.destroy()`.
 *   - `time.addEvent({ delay, repeat, callback })` → repeating timer
 *     that fires (repeat+1) times at `delay`-ms intervals. Handle's
 *     `.destroy()` stops it early.
 *
 * Intentionally narrow — we don't cover `loop`, `paused`, `scale`
 * etc. Nothing in the game code that runs under headless uses them.
 */
export interface TimerHandle {
  destroy(): void;
}

interface TimerEntry {
  fireAt: number;
  interval: number;   // 0 for one-shot
  remainingFires: number;
  callback: () => void;
  destroyed: boolean;
}

export class SimClock {
  now: number = 0;
  private queue: TimerEntry[] = [];

  delayedCall(ms: number, callback: () => void): TimerHandle {
    const entry: TimerEntry = {
      fireAt: this.now + ms,
      interval: 0,
      remainingFires: 1,
      callback,
      destroyed: false,
    };
    this.queue.push(entry);
    return { destroy: () => { entry.destroyed = true; } };
  }

  addEvent(opts: { delay: number; repeat?: number; callback: () => void }): TimerHandle {
    const repeat = opts.repeat ?? 0;
    const entry: TimerEntry = {
      fireAt: this.now + opts.delay,
      interval: opts.delay,
      remainingFires: repeat + 1,
      callback: opts.callback,
      destroyed: false,
    };
    this.queue.push(entry);
    return { destroy: () => { entry.destroyed = true; } };
  }

  /** Advance sim time by `delta` ms. Fires every registered timer
   *  whose `fireAt` is now in the past. Callbacks may register more
   *  timers; those with a future `fireAt` won't fire this tick
   *  because the loop iterates the current queue length.
   *
   *  Firing order within a single tick is insertion order — good
   *  enough for the visual-effect timers that are the main users. */
  tick(delta: number): void {
    this.now += delta;
    const n = this.queue.length;
    for (let i = 0; i < n; i++) {
      const e = this.queue[i];
      while (!e.destroyed && e.remainingFires > 0 && e.fireAt <= this.now) {
        e.callback();
        e.remainingFires--;
        if (e.remainingFires > 0 && e.interval > 0) {
          e.fireAt += e.interval;
        } else {
          e.destroyed = true;
        }
      }
    }
    // Compact — drop destroyed / exhausted entries.
    this.queue = this.queue.filter(e => !e.destroyed);
  }
}
