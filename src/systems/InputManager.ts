import * as Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, pixelToCol, pixelToRow, getGridCols } from '../config';
import { EventBus } from './EventBus';
import { CameraController } from './CameraController';

export interface GridCoord {
  col: number;
  row: number;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10; // pixels
const DEBUG_INPUT = new URLSearchParams(window.location.search).has('debug');

export class InputManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private hoverCallback: ((col: number, row: number) => void) | null = null;
  private clickCallback: ((col: number, row: number) => void) | null = null;
  private clickMissCallback: (() => void) | null = null;
  private rightClickCallback: ((col: number, row: number) => void) | null = null;
  private spaceCallback: (() => void) | null = null;
  private rawClickCallback: ((x: number, y: number) => void) | null = null;
  private gridRows: number = GRID_ROWS;
  private cameraCtrl: CameraController | null = null;
  private sidebarVisibleCheck: (() => boolean) | null = null;

  // Long-press state for touch
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;
  private longPressStartX = 0;
  private longPressStartY = 0;

  // On-screen debug overlay (phone touch diagnosis)
  private debugEl: HTMLElement | null = null;
  private debugLines: string[] = [];

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;

    if (DEBUG_INPUT) {
      this.debugEl = document.createElement('div');
      Object.assign(this.debugEl.style, {
        position: 'fixed', top: '0', right: '0', zIndex: '9999',
        background: 'rgba(0,0,0,0.85)', color: '#0f0', fontSize: '11px',
        fontFamily: 'monospace', padding: '4px 6px', maxWidth: '50vw',
        pointerEvents: 'none', whiteSpace: 'pre-wrap', lineHeight: '1.3',
      });
      document.body.appendChild(this.debugEl);
    }

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Skip if sidebar overlay is open
      if (this.sidebarVisibleCheck?.()) return;
      // Skip hover if camera is panning or pinching
      if (this.cameraCtrl?.wasPan || this.cameraCtrl?.pinching) return;

      // Cancel long-press if finger moved too far
      if (pointer.isDown && this.longPressTimer) {
        const dx = pointer.x - this.longPressStartX;
        const dy = pointer.y - this.longPressStartY;
        if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
          this.cancelLongPress();
        }
      }

      const hoverCoord = this.pointerToGrid(pointer);
      if (hoverCoord && this.hoverCallback) {
        this.hoverCallback(hoverCoord.col, hoverCoord.row);
      }
    });

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dbg(`DN s=${pointer.x|0},${pointer.y|0} touch=${pointer.wasTouch} cam=${pointer.camera?.name ?? '?'}`);

      // Skip if sidebar overlay is open
      if (this.sidebarVisibleCheck?.()) return;

      // Start long-press detection for touch
      if (pointer.wasTouch) {
        this.startLongPress(pointer);
      }

      // Desktop right-click: handle immediately (sell tower)
      if (!pointer.wasTouch && pointer.rightButtonDown()) {
        const coord = this.pointerToGrid(pointer);
        if (coord && this.rightClickCallback) {
          this.rightClickCallback(coord.col, coord.row);
        }
      }
    });

    // Handle left-click and touch on pointerup (after pan detection)
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.cancelLongPress();

      if (this.sidebarVisibleCheck?.()) { this.dbg('BLOCK sidebar'); return; }
      if (this.longPressFired) { this.dbg('BLOCK longPress'); return; }
      if (this.cameraCtrl?.wasPan) { this.dbg('BLOCK wasPan'); return; }

      // Only handle left button / touch
      const isLeftOrTouch = pointer.button === 0 || pointer.wasTouch;
      if (!isLeftOrTouch) { this.dbg('BLOCK !left/touch'); return; }

      // Always use main camera for world coordinates (pointer.worldX may
      // reference the UI camera — see pointerToWorld for details).
      const { x: wx, y: wy } = this.pointerToWorld(pointer);

      if (this.rawClickCallback) {
        this.rawClickCallback(wx, wy);
      }

      const coord = this.pointerToGrid(pointer);
      const cam = this.scene.cameras.main;
      this.dbg(`UP s=${pointer.x|0},${pointer.y|0} w=${wx|0},${wy|0} g=${coord ? `${coord.col},${coord.row}` : 'null'} z=${cam.zoom.toFixed(1)} pCam=${pointer.camera?.name ?? '?'}`);

      // Trigger hover so build preview shows
      if (coord && this.hoverCallback) {
        this.hoverCallback(coord.col, coord.row);
      }
      if (coord && this.clickCallback) {
        this.clickCallback(coord.col, coord.row);
      } else if (!coord && this.clickMissCallback) {
        this.clickMissCallback();
      }
    });

    scene.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // When mouse re-enters the canvas after clicking outside (e.g., DOM UI),
    // Phaser's pointer position goes stale until a new click. Force a hover
    // update from the native event so the build placement marker reappears.
    // Mouse only — touch devices don't have this "re-enter" problem and the
    // custom coordinate conversion can conflict with Phaser's touch handling.
    scene.game.canvas.addEventListener('pointerenter', (e: PointerEvent) => {
      if (!this.hoverCallback || e.pointerType === 'touch') return;
      // Convert page coordinates → Phaser canvas → world (accounting for camera)
      const rect = scene.game.canvas.getBoundingClientRect();
      const scaleX = scene.game.scale.width / rect.width;
      const scaleY = scene.game.scale.height / rect.height;
      let wx = (e.clientX - rect.left) * scaleX;
      let wy = (e.clientY - rect.top) * scaleY;
      // Apply camera transform if zoomed/panned
      const cam = scene.cameras?.main;
      if (cam) {
        wx = (wx / cam.zoom) + cam.scrollX;
        wy = (wy / cam.zoom) + cam.scrollY;
      }
      const col = pixelToCol(wx);
      const row = pixelToRow(wy);
      if (col >= 0 && col < getGridCols() && row >= 0 && row < this.gridRows) {
        this.hoverCallback(col, row);
      }
    });

    scene.input.keyboard!.on('keydown-SPACE', () => {
      if (this.spaceCallback) this.spaceCallback();
    });
  }

  private startLongPress(pointer: Phaser.Input.Pointer): void {
    this.cancelLongPress();
    this.longPressFired = false;
    this.longPressStartX = pointer.x;
    this.longPressStartY = pointer.y;
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.longPressTimer = null;
      // Treat as right-click
      const coord = this.pointerToGrid(pointer);
      if (coord && this.rightClickCallback) {
        this.rightClickCallback(coord.col, coord.row);
      }
    }, LONG_PRESS_MS);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** Push a debug line to the on-screen overlay (max 8 lines, newest on top) */
  dbg(msg: string): void {
    if (!DEBUG_INPUT || !this.debugEl) return;
    this.debugLines.unshift(msg);
    if (this.debugLines.length > 8) this.debugLines.length = 8;
    this.debugEl.textContent = this.debugLines.join('\n');
  }

  onHover(cb: (col: number, row: number) => void): void {
    this.hoverCallback = cb;
  }

  onClick(cb: (col: number, row: number) => void): void {
    this.clickCallback = cb;
  }

  /** Called when left-click is outside the grid (sidebar, etc.) */
  onClickMiss(cb: () => void): void {
    this.clickMissCallback = cb;
  }

  onRightClick(cb: (col: number, row: number) => void): void {
    this.rightClickCallback = cb;
  }

  onSpace(cb: () => void): void {
    this.spaceCallback = cb;
  }

  /** Raw pixel-level click handler (for arena, before grid conversion) */
  onRawClick(cb: (x: number, y: number) => void): void {
    this.rawClickCallback = cb;
  }

  onKey(key: string, cb: () => void): void {
    this.scene.input.keyboard!.on(`keydown-${key}`, cb);
  }

  /** Set grid rows for hero defense (reduced grid) */
  setGridRows(rows: number): void {
    this.gridRows = rows;
  }

  /** Link camera controller for pan-suppression */
  setCameraController(ctrl: CameraController): void {
    this.cameraCtrl = ctrl;
  }

  /** Set a callback to check if sidebar is visible (blocks game input) */
  setSidebarCheck(check: () => boolean): void {
    this.sidebarVisibleCheck = check;
  }

  /** Convert pointer screen position to world coordinates using the MAIN camera.
   *  Avoids relying on pointer.worldX which may reference the UI camera
   *  (Phaser sets pointer.camera to the last camera iterated during hitTest). */
  private pointerToWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const wp = cam.getWorldPoint(pointer.x, pointer.y);
    return { x: wp.x, y: wp.y };
  }

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridCoord | null {
    const { x: wx, y: wy } = this.pointerToWorld(pointer);
    const col = pixelToCol(wx);
    const row = pixelToRow(wy);
    if (col < 0 || col >= getGridCols() || row < 0 || row >= this.gridRows) return null;
    return { col, row };
  }
}
