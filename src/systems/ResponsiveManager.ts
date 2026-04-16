import { SIDEBAR_WIDTH, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, TOWER_BAR_HEIGHT, CONTROL_BAR_HEIGHT } from '../config';

const TABLET_BREAKPOINT = 1200;
const PHONE_BREAKPOINT = 600;

export type LayoutMode = 'desktop' | 'tablet' | 'phone';

type LayoutChangeCallback = (mode: LayoutMode) => void;

// Phone uses same grid dimensions as desktop — maps are designed for 36 cols.
// Phaser Scale.FIT handles the scaling. UI elements are sized for touch.

class ResponsiveManagerClass {
  private _mode: LayoutMode = 'desktop';
  private _listeners: LayoutChangeCallback[] = [];
  private _initialized = false;

  init(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._mode = this.detectMode();
    window.addEventListener('resize', () => {
      const newMode = this.detectMode();
      if (newMode !== this._mode) {
        this._mode = newMode;
        for (const cb of this._listeners) cb(this._mode);
      }
    });
  }

  private detectMode(): LayoutMode {
    const w = window.innerWidth;
    if (w < PHONE_BREAKPOINT) return 'phone';
    if (w < TABLET_BREAKPOINT) return 'tablet';
    return 'desktop';
  }

  get mode(): LayoutMode { return this._mode; }

  isPhone(): boolean { return this._mode === 'phone'; }
  isTablet(): boolean { return this._mode === 'tablet' || this._mode === 'phone'; }

  sidebarInline(): boolean { return this._mode === 'desktop'; }

  /** Grid columns — always 36 (maps require full grid) */
  gridCols(): number {
    return 36;
  }

  /** Game area width (grid only, no sidebar) — always full width */
  gameWidth(): number {
    return GAME_WIDTH;
  }

  /** Grid offset X: on desktop the sidebar is inline, on tablet/phone grid uses full width */
  gridOffsetX(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH : 0;
  }

  /** Canvas width — expanded to fill viewport aspect ratio (no letterboxing).
   *  Minimum: grid + sidebar offset on desktop, or grid on tablet/phone. */
  canvasWidth(): number {
    const minW = this._mode === 'desktop' ? SIDEBAR_WIDTH + GAME_WIDTH : GAME_WIDTH;
    const minH = this._minCanvasHeight();
    // Expand width if viewport is wider than the minimum aspect ratio
    const vpAspect = window.innerWidth / window.innerHeight;
    const targetW = Math.round(minH * vpAspect);
    return Math.max(minW, targetW);
  }

  /** Canvas height — expanded to fill viewport aspect ratio (no letterboxing).
   *  Minimum: grid + UI bars. Phone also includes control bar. */
  canvasHeight(): number {
    const minH = this._minCanvasHeight();
    const cw = this.canvasWidth();
    const vpAspect = window.innerHeight / window.innerWidth;
    const targetH = Math.round(cw * vpAspect);
    return Math.max(minH, targetH);
  }

  /** Minimum canvas height to fit all game content */
  private _minCanvasHeight(): number {
    const base = GAME_HEIGHT + 28 + TOWER_BAR_HEIGHT;
    return this._mode === 'phone' ? base + CONTROL_BAR_HEIGHT : base;
  }

  onLayoutChange(cb: LayoutChangeCallback): void {
    this._listeners.push(cb);
  }

  removeLayoutChangeListener(cb: LayoutChangeCallback): void {
    this._listeners = this._listeners.filter(l => l !== cb);
  }
}

export const ResponsiveManager = new ResponsiveManagerClass();
