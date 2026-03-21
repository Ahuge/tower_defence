import { GRID_ROWS, TILE_SIZE } from '../config';
import { MatchMode } from '../data/WaveDefinitions';
import { ResponsiveManager } from './ResponsiveManager';

export interface LayoutConfig {
  gridRows: number;
  gridOffsetY: number;  // pixels — arena height above the grid
  arenaHeight: number;
  totalHeight: number;   // arenaHeight + gridRows * TILE_SIZE
}

/** Returns layout dimensions for a given match mode */
export function getLayout(mode: MatchMode): LayoutConfig {
  const isPhone = ResponsiveManager.isPhone();

  if (mode === 'hero_defense') {
    const gridRows = isPhone ? 8 : 12;
    const arenaHeight = isPhone ? 200 : 400;
    return {
      gridRows,
      gridOffsetY: arenaHeight,
      arenaHeight,
      totalHeight: arenaHeight + gridRows * TILE_SIZE,
    };
  }

  // Standard / Sprint / Marathon / Battle / Circle
  const gridRows = isPhone ? 16 : GRID_ROWS;
  return {
    gridRows,
    gridOffsetY: 0,
    arenaHeight: 0,
    totalHeight: gridRows * TILE_SIZE,
  };
}
