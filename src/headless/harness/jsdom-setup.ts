/**
 * Minimum browser shim for the harness — makes Phaser happy when
 * the match runs outside vitest (which otherwise sets up jsdom).
 *
 * Phaser's feature-detection code touches `window`, `document` and a
 * 2d canvas at import time, which throws `ReferenceError: window is
 * not defined` in plain Node. This module installs a tiny hand-rolled
 * DOM on `globalThis` so Phaser's detection path returns its fallback
 * values and the headless match runs.
 *
 * Why not jsdom?
 *   jsdom is ~10 MB across ~700 files plus its dependency tree. On a
 *   repo checked out on a slow filesystem (WSL /mnt/d, network share,
 *   Windows DrvFs) importing it takes 25-45 s *per process* — and the
 *   RL sweep spawns one process per worker per iteration. The shim
 *   below imports in ~1 ms and is enough for Phaser's import-time
 *   feature detection and the headless game code (which never renders).
 *
 * Escape hatch: set TD_HEADLESS_DOM=jsdom to load the real jsdom
 * instead (useful if a future headless script needs a real DOM API).
 *
 * Only runs in plain-Node contexts (detected via the absence of
 * `globalThis.window`) so importing this from a vitest test stays
 * a no-op.
 */
import { createRequire } from 'node:module';

type Any = any;

/** A 2d context stub: property writes and drawing calls are no-ops.
 *  `getImageData` returns a zeroed 1x1 buffer, which is all Phaser's
 *  feature detection reads. */
function make2dContext(canvas: Any): Any {
  const data = new Uint8ClampedArray(4);
  return {
    canvas,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'inherit',
    imageSmoothingEnabled: true,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    drawImage() {},
    putImageData() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    arcTo() {},
    ellipse() {},
    rect() {},
    fill() {},
    stroke() {},
    clip() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {},
    setTransform() {},
    resetTransform() {},
    setLineDash() {},
    getLineDash() {
      return [];
    },
    measureText() {
      return {
        width: 0,
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 0,
      };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createPattern() {
      return {};
    },
    createImageData() {
      return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
    },
    getImageData() {
      return { data, width: 1, height: 1 };
    },
    isPointInPath() {
      return false;
    },
    isPointInStroke() {
      return false;
    },
  };
}

function makeElement(tagName: string): Any {
  const element: Any = {
    tagName: String(tagName || 'div').toUpperCase(),
    nodeName: String(tagName || 'div').toUpperCase(),
    nodeType: 1,
    style: {},
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {
        return false;
      },
      contains() {
        return false;
      },
    },
    children: [],
    childNodes: [],
    parentNode: null,
    width: 1,
    height: 1,
    clientWidth: 1,
    clientHeight: 1,
    offsetWidth: 1,
    offsetHeight: 1,
    setAttribute() {},
    getAttribute() {
      return null;
    },
    hasAttribute() {
      return false;
    },
    removeAttribute() {},
    appendChild(child: Any) {
      element.children.push(child);
      return child;
    },
    removeChild() {},
    insertBefore(child: Any) {
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
    getBoundingClientRect() {
      return { x: 0, y: 0, left: 0, top: 0, right: 1, bottom: 1, width: 1, height: 1 };
    },
    getContext(type: string) {
      return type === '2d' ? make2dContext(element) : null;
    },
    toDataURL() {
      return 'data:,';
    },
    focus() {},
    blur() {},
    click() {},
  };
  return element;
}

class FakeImage {
  width = 1;
  height = 1;
  naturalWidth = 1;
  naturalHeight = 1;
  complete = false;
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    this.complete = true;
    // Phaser's blend-mode probe assigns onload before src and expects
    // the load to complete; fire it synchronously.
    if (this.onload) this.onload();
  }
  get src(): string {
    return this._src;
  }
  addEventListener() {}
  removeEventListener() {}
}

class FakeAudio {
  src = '';
  volume = 1;
  loop = false;
  paused = true;
  play() {
    return Promise.resolve();
  }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
}

function makeLocalStorage(): Any {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
  };
}

/** Install the minimal DOM if we're in a plain-Node context. */
function installShim(): void {
  const g = globalThis as Any;
  const document: Any = {
    createElement: (tag: string) => makeElement(tag),
    createElementNS: (_ns: string, tag: string) => makeElement(tag),
    createTextNode: () => ({}),
    documentElement: makeElement('html'),
    body: makeElement('body'),
    head: makeElement('head'),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    fonts: { add() {}, ready: Promise.resolve() },
  };
  document.defaultView = null;

  const win: Any = {
    document,
    navigator: {
      userAgent: 'node',
      platform: 'linux',
      maxTouchPoints: 0,
      language: 'en',
      languages: ['en'],
    },
    location: {
      href: 'http://localhost/',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: '',
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true;
    },
    matchMedia: () => ({
      matches: false,
      media: '',
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    outerWidth: 1024,
    outerHeight: 768,
    scrollX: 0,
    scrollY: 0,
    requestAnimationFrame: (cb: (t: number) => void) =>
      setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id: Any) => clearTimeout(id),
    performance: { now: () => Date.now() },
    localStorage: makeLocalStorage(),
    sessionStorage: makeLocalStorage(),
    HTMLElement: class {},
    HTMLCanvasElement: class {},
    HTMLImageElement: FakeImage,
    HTMLVideoElement: class {},
    HTMLAudioElement: FakeAudio,
    Element: class {},
    Node: class {},
    Image: FakeImage,
    Audio: FakeAudio,
    OffscreenCanvas: class {
      getContext(type: string) {
        return type === '2d' ? make2dContext(this) : null;
      }
    },
    Path2D: class {},
    DOMParser: class {
      parseFromString() {
        return document;
      }
    },
    XMLHttpRequest: class {},
    WebGLRenderingContext: class {},
    WebGL2RenderingContext: class {},
    CanvasRenderingContext2D: class {},
  };
  document.defaultView = win;

  // Copy every non-existing property from the fake window onto
  // globalThis, exactly like the old jsdom setup did. Stays defensive:
  // Node 24 makes some globals getter-only (navigator, fetch) —
  // defineProperty works around the TypeError from direct assignment.
  for (const key of Object.getOwnPropertyNames(win)) {
    if (g[key] !== undefined) continue;
    try {
      g[key] = win[key];
    } catch {
      try {
        Object.defineProperty(g, key, {
          value: win[key],
          writable: true,
          configurable: true,
          enumerable: false,
        });
      } catch {
        /* some props are genuinely sealed — skip */
      }
    }
  }
  // The window + document references themselves need to exist even
  // if Node already has a `navigator`-like placeholder.
  Object.defineProperty(g, 'window', {
    value: win,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(g, 'document', {
    value: document,
    writable: true,
    configurable: true,
  });
  // Bare globals used by game modules at import time. The copy loop
  // above already sets these, but be explicit so a future Node global
  // (e.g. a read-only `localStorage`) can't silently shadow them.
  if (g.localStorage === undefined) g.localStorage = win.localStorage;
  if (g.sessionStorage === undefined) g.sessionStorage = win.sessionStorage;
}

function installJsdom(): void {
  // Loaded lazily via createRequire so the default (shim) path never
  // pays jsdom's startup cost — see the file header.
  const require = createRequire(import.meta.url);
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: false,
  });
  const win = dom.window as Any;
  const g = globalThis as Any;
  for (const key of Object.getOwnPropertyNames(win)) {
    if (g[key] !== undefined) continue;
    try {
      g[key] = win[key];
    } catch {
      try {
        Object.defineProperty(g, key, {
          value: win[key],
          writable: true,
          configurable: true,
          enumerable: false,
        });
      } catch {
        /* skip */
      }
    }
  }
  Object.defineProperty(g, 'window', {
    value: win,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(g, 'document', {
    value: win.document,
    writable: true,
    configurable: true,
  });
}

if (typeof (globalThis as Any).window === 'undefined') {
  if (process.env.TD_HEADLESS_DOM === 'jsdom') {
    installJsdom();
  } else {
    installShim();
  }
}
