import { GRID_COLS, GRID_ROWS, pixelToCol, pixelToRow, getGridCols } from '../config';
import { EventBus } from './EventBus';
import { CameraController } from './CameraController';

export interface GridCoord {
  col: number;
  row: number;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10; // pixels

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

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;

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

      const coord = this.pointerToGrid(pointer);
      if (coord && this.hoverCallback) {
        this.hoverCallback(coord.col, coord.row);
      }
    });

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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

      if (this.sidebarVisibleCheck?.()) return;
      if (this.longPressFired) return; // was a long-press (right-click)
      if (this.cameraCtrl?.wasPan) return; // was a pan gesture

      // Only handle left button / touch
      const isLeftOrTouch = pointer.button === 0 || pointer.wasTouch;
      if (!isLeftOrTouch) return;

      const wx = pointer.worldX ?? pointer.x;
      const wy = pointer.worldY ?? pointer.y;

      if (this.rawClickCallback) {
        this.rawClickCallback(wx, wy);
      }

      const coord = this.pointerToGrid(pointer);
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

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridCoord | null {
    // Use worldX/worldY to account for camera zoom/scroll
    const wx = pointer.worldX ?? pointer.x;
    const wy = pointer.worldY ?? pointer.y;
    const col = pixelToCol(wx);
    const row = pixelToRow(wy);
    if (col < 0 || col >= getGridCols() || row < 0 || row >= this.gridRows) return null;
    return { col, row };
  }
}
