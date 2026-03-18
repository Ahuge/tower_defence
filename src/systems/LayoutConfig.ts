import { GRID_ROWS, TILE_SIZE } from '../config';
import { MatchMode } from '../data/WaveDefinitions';

export interface LayoutConfig {
  gridRows: number;
  gridOffsetY: number;  // pixels — arena height above the grid
  arenaHeight: number;
  totalHeight: number;   // arenaHeight + gridRows * TILE_SIZE
}

/** Returns layout dimensions for a given match mode */
export function getLayout(mode: MatchMode): LayoutConfig {
  if (mode === 'hero_defense') {
    const gridRows = 12;
    const arenaHeight = 400;
    return {
      gridRows,
      gridOffsetY: arenaHeight,
      arenaHeight,
      totalHeight: arenaHeight + gridRows * TILE_SIZE,
    };
  }

  // Standard / Sprint / Marathon / Battle — full 26-row grid, no arena
  return {
    gridRows: GRID_ROWS,
    gridOffsetY: 0,
    arenaHeight: 0,
    totalHeight: GRID_ROWS * TILE_SIZE,
  };
}
