import { SIDEBAR_WIDTH, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';

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

  /** Canvas width: desktop includes inline sidebar, tablet/phone is just the game area */
  canvasWidth(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH + GAME_WIDTH : this.gameWidth();
  }

  /** Full canvas height including status bar, tower select bar, and phone control bar */
  canvasHeight(): number {
    const base = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    return this._mode === 'phone' ? base + 48 : base; // 48 = GameControlBar.BAR_HEIGHT
  }

  onLayoutChange(cb: LayoutChangeCallback): void {
    this._listeners.push(cb);
  }

  removeLayoutChangeListener(cb: LayoutChangeCallback): void {
    this._listeners = this._listeners.filter(l => l !== cb);
  }
}

export const ResponsiveManager = new ResponsiveManagerClass();
