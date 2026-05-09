/**
 * ChannelSystem core spec — start, tick, complete, interrupt, stats,
 * scene-binding lifecycle.
 *
 * Phaser scenes are mocked minimally (events.once + time.delayedCall +
 * add.graphics) — the system only needs those affordances.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelSystem } from './ChannelSystem';
import { ChannelEffects } from './ChannelEffects';

class FakeScene {
  events = {
    handlers: new Map<string, Array<() => void>>(),
    once(event: string, fn: () => void) {
      const list = this.handlers.get(event) ?? [];
      list.push(fn);
      this.handlers.set(event, list);
    },
    fire(event: string) {
      const list = this.handlers.get(event) ?? [];
      for (const fn of list) fn();
      this.handlers.delete(event);
    },
  };
  time = {
    pending: [] as Array<{ delay: number; fn: () => void }>,
    delayedCall(delay: number, fn: () => void) {
      this.pending.push({ delay, fn });
    },
    flush() {
      const list = this.pending.slice();
      this.pending = [];
      for (const p of list) p.fn();
    },
  };
  add = {
    graphics() {
      return { lineStyle() {}, strokeCircle() {}, destroy() {} };
    },
  };
  tweens = { add() {} };
}

let scene: FakeScene;

beforeEach(() => {
  scene = new FakeScene();
  ChannelEffects.__reset();
  ChannelEffects.register('test_effect', () => {});
});

describe('ChannelSystem', () => {
  it('forScene returns the same instance for repeated calls', () => {
    const a = ChannelSystem.forScene(scene as any);
    const b = ChannelSystem.forScene(scene as any);
    expect(a).toBe(b);
  });

  it('peek returns null until forScene is called', () => {
    expect(ChannelSystem.peek(scene as any)).toBe(null);
    ChannelSystem.forScene(scene as any);
    expect(ChannelSystem.peek(scene as any)).not.toBe(null);
  });

  it('start registers an active channel and increments stats', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const caster = { id: 'creep_1', x: 100, y: 100, alive: true };
    const id = sys.start(caster, 'test_effect', 4);
    expect(id).toBeTruthy();
    expect(sys.listActive()).toHaveLength(1);
    expect(sys.getStats().started).toBe(1);
    expect(sys.activeChannelForCaster(caster)?.id).toBe(id);
  });

  it('tick advances elapsed and triggers completion at duration', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const caster = { id: 'creep_1', x: 0, y: 0, alive: true };
    const id = sys.start(caster, 'test_effect', 1.0);
    sys.tick(id, 600);
    let chan = sys.listActive().find(c => c.id === id)!;
    expect(chan.elapsed).toBeCloseTo(0.6);
    expect(chan.completed).toBe(false);
    sys.tick(id, 500);
    chan = sys.listActive().find(c => c.id === id)!;
    expect(chan.completed).toBe(true);
    expect(sys.getStats().completed).toBe(1);
  });

  it('interrupt cancels an active channel and increments stats', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const caster = { id: 'creep_1', x: 0, y: 0, alive: true };
    const id = sys.start(caster, 'test_effect', 4);
    sys.interrupt(id, 'damage');
    const chan = sys.listActive().find(c => c.id === id)!;
    expect(chan.interrupted).toBe(true);
    expect(sys.getStats().interrupted).toBe(1);
  });

  it('interrupt is idempotent (re-call does not double-count)', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const id = sys.start({ id: 'c', x: 0, y: 0, alive: true }, 'test_effect', 4);
    sys.interrupt(id, 'damage');
    sys.interrupt(id, 'damage');
    expect(sys.getStats().interrupted).toBe(1);
  });

  it('completed channel cannot be retroactively interrupted', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const id = sys.start({ id: 'c', x: 0, y: 0, alive: true }, 'test_effect', 0.5);
    sys.tick(id, 600);
    sys.interrupt(id, 'damage');
    expect(sys.getStats().completed).toBe(1);
    expect(sys.getStats().interrupted).toBe(0);
  });

  it('tick after completion is a no-op', () => {
    const sys = ChannelSystem.forScene(scene as any);
    const id = sys.start({ id: 'c', x: 0, y: 0, alive: true }, 'test_effect', 0.5);
    sys.tick(id, 600);
    sys.tick(id, 1000);
    expect(sys.getStats().completed).toBe(1);
  });

  it('completion dispatches the registered effect', () => {
    let fired = false;
    ChannelEffects.register('fired_test', () => { fired = true; });
    const sys = ChannelSystem.forScene(scene as any);
    const id = sys.start({ id: 'c', x: 0, y: 0, alive: true }, 'fired_test', 0.1);
    sys.tick(id, 200);
    expect(fired).toBe(true);
  });

  it('subscribe is fired on add and remove (after delayedCall flush)', () => {
    const sys = ChannelSystem.forScene(scene as any);
    let count = 0;
    sys.subscribe(() => count++);
    const id = sys.start({ id: 'c', x: 0, y: 0, alive: true }, 'test_effect', 1);
    expect(count).toBe(1);
    sys.interrupt(id, 'damage');
    expect(count).toBe(2);
    scene.time.flush();
    expect(count).toBe(3); // remove fires too
  });

  it('shutdown event removes the scene binding', () => {
    ChannelSystem.forScene(scene as any);
    expect(ChannelSystem.peek(scene as any)).not.toBe(null);
    scene.events.fire('shutdown');
    expect(ChannelSystem.peek(scene as any)).toBe(null);
  });
});
