import { SIDEBAR_WIDTH, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { TowerSelectBar } from '../ui/TowerSelectBar';

const TABLET_BREAKPOINT = 1200;

export type LayoutMode = 'desktop' | 'tablet';

type LayoutChangeCallback = (mode: LayoutMode) => void;

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
    return window.innerWidth < TABLET_BREAKPOINT ? 'tablet' : 'desktop';
  }

  get mode(): LayoutMode { return this._mode; }

  isTablet(): boolean { return this._mode === 'tablet'; }

  sidebarInline(): boolean { return this._mode === 'desktop'; }

  /** Grid offset X: on desktop the sidebar is inline, on tablet grid uses full width */
  gridOffsetX(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH : 0;
  }

  /** Canvas width: desktop includes inline sidebar, tablet is just the game area */
  canvasWidth(): number {
    return this._mode === 'desktop' ? SIDEBAR_WIDTH + GAME_WIDTH : GAME_WIDTH;
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
