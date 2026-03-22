import { SIDEBAR_WIDTH, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';

const TABLET_BREAKPOINT = 1200;
const PHONE_BREAKPOINT = 600;

export type LayoutMode = 'desktop' | 'tablet' | 'phone';

type LayoutChangeCallback = (mode: LayoutMode) => void;

/** Phone grid: fewer columns so the canvas is smaller and scales better */
const PHONE_GRID_COLS = 20;

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

  /** Grid columns: reduced on phone for a smaller canvas */
  gridCols(): number {
    return this._mode === 'phone' ? PHONE_GRID_COLS : 36;
  }

  /** Game area width (grid only, no sidebar) */
  gameWidth(): number {
    return this.gridCols() * TILE_SIZE;
  }

  /** Grid offset X: on desktop the sidebar is inline, on tablet/phone grid uses full width */
  gridOffsetX(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH : 0;
  }

  /** Canvas width: desktop includes inline sidebar, tablet/phone is just the game area */
  canvasWidth(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH + GAME_WIDTH : this.gameWidth();
  }

  /** Full canvas height including status bar and tower select bar */
  canvasHeight(): number {
    return GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
  }

  onLayoutChange(cb: LayoutChangeCallback): void {
    this._listeners.push(cb);
  }

  removeLayoutChangeListener(cb: LayoutChangeCallback): void {
    this._listeners = this._listeners.filter(l => l !== cb);
  }
}

export const ResponsiveManager = new ResponsiveManagerClass();
