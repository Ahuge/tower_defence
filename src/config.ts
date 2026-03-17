export const TILE_SIZE = 32;
export const GRID_COLS = 25;
export const GRID_ROWS = 20;
export const GAME_WIDTH = GRID_COLS * TILE_SIZE;
export const GAME_HEIGHT = GRID_ROWS * TILE_SIZE;

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
