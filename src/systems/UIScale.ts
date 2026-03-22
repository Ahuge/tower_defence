/**
 * Centralized UI scaling constants for all layout modes.
 * One source of truth for font sizes, spacing, button sizes, etc.
 * Eliminates scattered `isPhone ? X : Y` ternaries across the codebase.
 */
import { ResponsiveManager } from './ResponsiveManager';

interface ScaleValues {
  // Font sizes (as CSS strings)
  fontTiny: string;
  fontSmall: string;
  fontBody: string;
  fontHeading: string;
  fontTitle: string;
  fontHuge: string;

  // Spacing
  rowHeight: number;      // standard text row height
  rowHeightTight: number; // compact rows
  sectionGap: number;     // gap between sections
  padding: number;        // standard padding
  paddingSmall: number;

  // Buttons
  btnSize: number;        // tower bar / control bar button size
  btnPadding: number;     // gap between buttons
  btnFontSize: string;

  // Cards
  cardGap: number;

  // Touch targets
  minTouchTarget: number; // minimum height for tappable rows
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

  minTouchTarget: 24,
};

const PHONE: ScaleValues = {
  fontTiny: '13px',
  fontSmall: '15px',
  fontBody: '17px',
  fontHeading: '21px',
  fontTitle: '30px',
  fontHuge: '42px',

  rowHeight: 24,
  rowHeightTight: 18,
  sectionGap: 12,
  padding: 12,
  paddingSmall: 8,

  btnSize: 62,
  btnPadding: 6,
  btnFontSize: '16px',

  cardGap: 8,

  minTouchTarget: 40,
};

class UIScaleClass {
  get current(): ScaleValues {
    return ResponsiveManager.isPhone() ? PHONE : DESKTOP;
  }

  // Convenience accessors
  get isPhone(): boolean { return ResponsiveManager.isPhone(); }

  // Font helpers that return CSS font size string
  font(desktopPx: number): string {
    const scale = this.isPhone ? 1.4 : 1;
    return `${Math.round(desktopPx * scale)}px`;
  }

  // Spacing helper — scales up on phone
  space(desktopPx: number): number {
    return this.isPhone ? Math.round(desktopPx * 1.3) : desktopPx;
  }
}

export const UIScale = new UIScaleClass();
