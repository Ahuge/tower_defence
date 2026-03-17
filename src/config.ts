export const TILE_SIZE = 40;
export const GRID_COLS = 25;
export const GRID_ROWS = 18;
export const GAME_WIDTH = GRID_COLS * TILE_SIZE;
export const GAME_HEIGHT = GRID_ROWS * TILE_SIZE;

// Sidebar
export const SIDEBAR_WIDTH = 360;
export const GRID_OFFSET_X = SIDEBAR_WIDTH;
export const CANVAS_WIDTH = SIDEBAR_WIDTH + GAME_WIDTH;

// Grid-pixel conversion helpers
export function gridX(col: number): number {
  return col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X;
}

export function gridLeftX(col: number): number {
  return col * TILE_SIZE + GRID_OFFSET_X;
}

export function gridY(row: number): number {
  return row * TILE_SIZE + TILE_SIZE / 2;
}

export function pixelToCol(x: number): number {
  return Math.floor((x - GRID_OFFSET_X) / TILE_SIZE);
}

export function pixelToRow(y: number): number {
  return Math.floor(y / TILE_SIZE);
}

// Colors
export const COLOR_GROUND = 0x2d2d2d;
export const COLOR_GRID_LINE = 0x3a3a3a;
export const COLOR_CREEP = 0xff4444;
export const COLOR_PATH = 0x444444;
export const COLOR_ENTRY = 0x44ff44;
export const COLOR_EXIT = 0xff4444;
export const COLOR_HOVER_VALID = 0x44ff44;
export const COLOR_HOVER_INVALID = 0xff4444;
export const COLOR_PROJECTILE = 0xffff44;

// Gameplay
export const CREEP_BASE_SPEED = 80; // pixels per second
export const STARTING_GOLD = 100;
export const STARTING_LIVES = 20;
export const KILL_GOLD = 5;
export const WAVE_CLEAR_BONUS = 25;
