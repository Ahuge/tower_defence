/**
 * Centralized UI scaling constants for all layout modes.
 * One source of truth for font sizes, spacing, button sizes, etc.
 *
 * Phone canvas is ~1008px displayed on ~400px screen = ~40% physical size.
 * Scale factor 2.5x makes canvas text → readable physical text.
 */
import { ResponsiveManager } from './ResponsiveManager';

const SCALE = 2.5; // phone canvas → physical multiplier

interface ScaleValues {
  // Font sizes (as CSS strings)
  fontTiny: string;
  fontSmall: string;
  fontBody: string;
  fontHeading: string;
  fontTitle: string;
  fontHuge: string;

  // Spacing
  rowHeight: number;
  rowHeightTight: number;
  sectionGap: number;
  padding: number;
  paddingSmall: number;

  // Buttons
  btnSize: number;
  btnPadding: number;
  btnFontSize: string;

  // Cards / Menus
  cardGap: number;
  mapBtnW: number;       // map button width
  mapBtnH: number;       // map button height
  mapRowH: number;       // row height in map grid
  diffBtnW: number;      // difficulty button width
  diffBtnH: number;      // difficulty button height
  modeBtnH: number;      // mode card height
  factionCardW: number;  // faction card width
  factionCardH: number;  // faction card height
  factionCols: number;   // columns in faction grid

  // Touch targets
  minTouchTarget: number;
}

const DESKTOP: ScaleValues = {
  fontTiny: '9px',
  fontSmall: '11px',
  fontBody: '13px',
  fontHeading: '16px',
  fontTitle: '24px',
  fontHuge: '36px',

  rowHeight: 16,
  rowHeightTight: 13,
  sectionGap: 8,
  padding: 10,
  paddingSmall: 6,

  btnSize: 52,
  btnPadding: 10,
  btnFontSize: '12px',

  cardGap: 10,
  mapBtnW: 140,
  mapBtnH: 40,
  mapRowH: 48,
  diffBtnW: 90,
  diffBtnH: 28,
  modeBtnH: 56,
  factionCardW: 140,
  factionCardH: 280,
  factionCols: 6,

  minTouchTarget: 24,
};

const PHONE: ScaleValues = {
  fontTiny: '22px',
  fontSmall: '26px',
  fontBody: '30px',
  fontHeading: '38px',
  fontTitle: '56px',
  fontHuge: '80px',

  rowHeight: 36,
  rowHeightTight: 28,
  sectionGap: 24,
  padding: 16,
  paddingSmall: 10,

  btnSize: 80,
  btnPadding: 8,
  btnFontSize: '28px',

  cardGap: 12,
  mapBtnW: 190,
  mapBtnH: 55,
  mapRowH: 65,
  diffBtnW: 150,
  diffBtnH: 55,
  modeBtnH: 100,
  factionCardW: 220,
  factionCardH: 240,
  factionCols: 3,

  minTouchTarget: 60,
};

class UIScaleClass {
  get current(): ScaleValues {
    return ResponsiveManager.isPhone() ? PHONE : DESKTOP;
  }

  get isPhone(): boolean { return ResponsiveManager.isPhone(); }

  /** Scale a desktop font size for the current layout */
  font(desktopPx: number): string {
    return `${Math.round(desktopPx * (this.isPhone ? SCALE : 1))}px`;
  }

  /** Scale a desktop font size, but capped for constrained areas (status bars, labels) */
  fontCapped(desktopPx: number, maxPhonePx: number): string {
    if (!this.isPhone) return `${desktopPx}px`;
    return `${Math.min(Math.round(desktopPx * SCALE), maxPhonePx)}px`;
  }

  /** Scale a desktop spacing value */
  space(desktopPx: number): number {
    return this.isPhone ? Math.round(desktopPx * 2) : desktopPx;
  }

  /** Y position helper — scales vertical offsets for phone layout */
  y(desktopY: number): number {
    return this.isPhone ? Math.round(desktopY * 1.6) : desktopY;
  }
}

export const UIScale = new UIScaleClass();
