import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../config';
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
      if (!coord) return;
      if (pointer.leftButtonDown() && this.clickCallback) {
        this.clickCallback(coord.col, coord.row);
      } else if (pointer.rightButtonDown() && this.rightClickCallback) {
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
    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }
}
