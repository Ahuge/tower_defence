/**
 * Grid math round-trip — gridX/gridY and pixelToCol/pixelToRow.
 *
 * Small file, small contract, but these helpers are called hundreds
 * of times per frame (tower placement, creep positioning, tutorial
 * spotlight targeting). A silent off-by-one from someone "tidying up"
 * the offset handling would break every one of those sites.
 */
import { describe, it, expect } from 'vitest';
import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridX, gridY, gridLeftX, pixelToCol, pixelToRow, getGridOffsetX, getGridOffsetY } from '../config';

describe('gridX / pixelToCol round-trip', () => {
  it('gridX(col) returns the cell centre', () => {
    // Cell 0 runs from x=offset to x=offset+TILE_SIZE.
    // Centre is offset + TILE_SIZE/2.
    expect(gridX(0)).toBe(getGridOffsetX() + TILE_SIZE / 2);
  });

  it('gridLeftX(col) returns the cell left edge', () => {
    expect(gridLeftX(0)).toBe(getGridOffsetX());
    expect(gridLeftX(5)).toBe(getGridOffsetX() + 5 * TILE_SIZE);
  });

  it('pixelToCol(gridX(col)) round-trips for every valid col', () => {
    for (let c = 0; c < GRID_COLS; c++) {
      expect(pixelToCol(gridX(c)), `col ${c}`).toBe(c);
    }
  });

  it('pixelToCol at the left edge of the cell returns the cell col', () => {
    expect(pixelToCol(gridLeftX(7))).toBe(7);
  });

  it('pixelToCol just before the right edge of the cell still returns the same col', () => {
    expect(pixelToCol(gridLeftX(7) + TILE_SIZE - 0.001)).toBe(7);
  });

  it('pixelToCol at the next cell left edge returns the next col', () => {
    expect(pixelToCol(gridLeftX(8))).toBe(8);
  });
});

describe('gridY / pixelToRow round-trip', () => {
  it('gridY(row) returns the cell centre', () => {
    expect(gridY(0)).toBe(getGridOffsetY() + TILE_SIZE / 2);
  });

  it('pixelToRow(gridY(row)) round-trips for every valid row', () => {
    for (let r = 0; r < GRID_ROWS; r++) {
      expect(pixelToRow(gridY(r)), `row ${r}`).toBe(r);
    }
  });
});

describe('gridX boundaries', () => {
  it('consecutive cols are exactly TILE_SIZE apart', () => {
    for (let c = 0; c < GRID_COLS - 1; c++) {
      expect(gridX(c + 1) - gridX(c)).toBe(TILE_SIZE);
    }
  });
});
