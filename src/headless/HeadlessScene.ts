/**
 * HeadlessScene — a `Phaser.Scene`-shaped stub that exposes just
 * enough surface area for Tower / Creep / TowerManager / bot code
 * to run outside a browser. Everything rendering-related (graphics,
 * sprites, text, tweens, anims, textures) no-ops. Everything timing-
 * related routes through `SimClock` so callbacks fire on sim time.
 *
 * The `Phaser.Scene` type is asserted because the real class has
 * dozens of members we don't use and can't feasibly stub — TS
 * structural typing lets us pass this wherever `Phaser.Scene` is
 * expected, and the compiler won't catch missing members accessed
 * via `(scene as any)`. The audit I ran before writing this
 * confirmed that nothing in the target match loop reaches for
 * fields we haven't stubbed.
 */
import * as Phaser from 'phaser';
import { SimClock } from './SimClock';

/** Callable-proxy chaining stub.
 *
 *  Phaser display objects mix **callable methods** (`.fillStyle()`),
 *  **chained method calls** (`.setDepth(5).setPosition(10,10)`), and
 *  **property access** (`.texture.setFilter(...)`). A pure object
 *  proxy breaks on the third pattern — accessing `.texture` returns
 *  a no-op function, and the next `.setFilter` call throws.
 *
 *  This stub is backed by a function (so it's callable) wrapped in
 *  a Proxy (so property access returns the same proxy). Result:
 *  every shape of access chains cleanly to a no-op and never
 *  throws, regardless of how deep the Phaser API tree goes. */
function makeChainingStub(label: string = 'stub'): any {
  const state: Record<string | symbol, any> = { __label: label };
  const base: any = function () { return proxy; };
  const proxy: any = new Proxy(base, {
    get(_target, prop) {
      if (prop === 'visible') return state.visible ?? true;
      if (prop === 'alpha') return state.alpha ?? 1;
      if (prop === 'x') return state.x ?? 0;
      if (prop === 'y') return state.y ?? 0;
      if (prop === 'rotation') return state.rotation ?? 0;
      if (prop === 'scene') return state.scene ?? undefined;
      if (prop === 'active') return state.active ?? true;
      if (prop === 'destroyed') return state.destroyed ?? false;
      if (prop in state) return state[prop];
      // Fallback: return the proxy itself. Works for both method
      // calls (`.setDepth(5)` is `proxy(5)` which returns proxy)
      // and property reads (`.texture.setFilter()` chains through).
      return proxy;
    },
    set(_target, prop, value) {
      state[prop] = value;
      return true;
    },
    apply() {
      return proxy;
    },
  });
  return proxy;
}

export class HeadlessScene {
  readonly sim: SimClock = new SimClock();

  /** `scene.add.*` factory — returns chaining stubs. */
  add = {
    graphics: () => makeChainingStub('graphics'),
    sprite: () => makeChainingStub('sprite'),
    text: () => makeChainingStub('text'),
    image: () => makeChainingStub('image'),
    container: (_x?: number, _y?: number) => {
      const c = makeChainingStub('container');
      // Container's `add(...)` takes children; just no-op and chain.
      return c;
    },
    rectangle: () => makeChainingStub('rectangle'),
    circle: () => makeChainingStub('circle'),
    existing: (obj: any) => obj,
  };

  /** Timer surface — backed by SimClock. */
  time = {
    get now(): number { return headlessTime.get(this)?.now ?? 0; },
    delayedCall: (ms: number, fn: () => void) => this.sim.delayedCall(ms, fn),
    addEvent: (opts: { delay: number; repeat?: number; callback: () => void }) => this.sim.addEvent(opts),
  };

  /** Tweens — no-op factory. Real tweens are purely cosmetic. */
  tweens = {
    add: (_opts: any) => makeChainingStub('tween'),
    create: (_opts: any) => makeChainingStub('tween'),
  };

  /** Animations registry — we never play sprite anims in headless. */
  anims = {
    exists: (_key: string) => false,
    create: (_opts: any) => null,
    play: (_key: string) => null,
  };

  /** Texture cache — always empty; sprite-creation code paths that
   *  require a loaded texture should bail early (see `createTowerSprite`
   *  in `SpriteManager.ts` which returns null when `textures.exists`
   *  is false). */
  textures = {
    exists: (_key: string) => false,
    get: (_key: string) => null,
    setFilter: () => {},
  };

  /** Loader surface — headless never loads assets. Match setup calls
   *  `preloadSprites` which bails harmlessly on each missing texture. */
  load = {
    spritesheet: () => {},
    image: () => {},
    audio: () => {},
  };

  /** Camera controller's update path expects cameras.main — return
   *  a chaining stub so .setZoom / .setScroll / .fadeOut etc. no-op. */
  cameras = {
    main: makeChainingStub('camera'),
  };

  /** Phaser registry — game code stashes the VersusManager /
   *  CircleManager here. We expose a real Map so get/set work. */
  registry = {
    _store: new Map<string, any>(),
    get(key: string) { return this._store.get(key); },
    set(key: string, value: any) { this._store.set(key, value); },
  };

  /** Scene-level event emitter (not to be confused with game-level
   *  EventBus). Gameplay code never hits this in the headless path;
   *  kept as a stub for defensive type compatibility. */
  events = {
    on: (_e: string, _fn: any) => {},
    off: (_e: string, _fn?: any) => {},
    emit: (_e: string, ..._args: any[]) => {},
    once: (_e: string, _fn: any) => {},
  };

  /** Advance sim time by `delta` ms — fires due timers then lets the
   *  caller run their own per-tick game logic. */
  tick(delta: number): void {
    headlessTime.set(this.time, this.sim);
    this.sim.tick(delta);
  }

  /** Cast to `Phaser.Scene` for the many game-code call sites that
   *  type their scene parameter strictly. Structural typing means
   *  only the members we actually use are ever accessed — the rest
   *  of Phaser.Scene's surface is never read. */
  asScene(): Phaser.Scene {
    return this as unknown as Phaser.Scene;
  }
}

// WeakMap keyed by our time-surface object so the `now` getter can
// resolve to the right SimClock without `this`-binding gymnastics.
const headlessTime = new WeakMap<object, SimClock>();
