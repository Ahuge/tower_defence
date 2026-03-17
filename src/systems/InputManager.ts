import { GRID_COLS, GRID_ROWS, pixelToCol, pixelToRow } from '../config';
import { EventBus } from './EventBus';

export interface GridCoord {
  col: number;
  row: number;
}

export class InputManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private hoverCallback: ((col: number, row: number) => void) | null = null;
  private clickCallback: ((col: number, row: number) => void) | null = null;
  private clickMissCallback: (() => void) | null = null;
  private rightClickCallback: ((col: number, row: number) => void) | null = null;
  private spaceCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, events: EventBus) {
    this.scene = scene;
    this.events = events;

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const coord = this.pointerToGrid(pointer);
      if (coord && this.hoverCallback) {
        this.hoverCallback(coord.col, coord.row);
      }
    });

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const coord = this.pointerToGrid(pointer);
      if (pointer.leftButtonDown()) {
        if (coord && this.clickCallback) {
          this.clickCallback(coord.col, coord.row);
        } else if (!coord && this.clickMissCallback) {
          this.clickMissCallback();
        }
      } else if (pointer.rightButtonDown() && coord && this.rightClickCallback) {
        this.rightClickCallback(coord.col, coord.row);
      }
    });

    scene.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    scene.input.keyboard!.on('keydown-SPACE', () => {
      if (this.spaceCallback) this.spaceCallback();
    });
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

  onKey(key: string, cb: () => void): void {
    this.scene.input.keyboard!.on(`keydown-${key}`, cb);
  }

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridCoord | null {
    const col = pixelToCol(pointer.x);
    const row = pixelToRow(pointer.y);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }
}
