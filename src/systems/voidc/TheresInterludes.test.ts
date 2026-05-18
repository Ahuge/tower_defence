/**
 * Tests for TheresInterludes — M6 vanishing lifecycle gates.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  THERIS_GOODBYE_MISSION_IDX,
  THERIS_OVERLAY_WAVE,
  THERIS_OVERLAY_TEXT,
  THERIS_FAREWELL_NOTE,
  shouldShowMidMissionOverlay,
  triggerFarewellInterlude,
  shouldRenderAtCounterfactualTable,
  getStatus,
  _setStatusForTest,
} from './TheresInterludes';
import { resetSnakeEyesState } from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('TheresInterludes — constants', () => {
  it('M6 is idx 5', () => {
    expect(THERIS_GOODBYE_MISSION_IDX).toBe(5);
  });
  it('Overlay text is plan-doc verbatim', () => {
    expect(THERIS_OVERLAY_TEXT).toBe('Theris drew the King of Coins. She won.');
  });
  it('Farewell note is plan-doc verbatim', () => {
    expect(THERIS_FAREWELL_NOTE).toBe('I cashed out, Ardax. You should too.');
  });
  it('Overlay wave is positive', () => {
    expect(THERIS_OVERLAY_WAVE).toBeGreaterThan(0);
  });
});

describe('TheresInterludes — shouldShowMidMissionOverlay', () => {
  it('fires only on M6', () => {
    expect(shouldShowMidMissionOverlay(0)).toBe(false);
    expect(shouldShowMidMissionOverlay(4)).toBe(false);
    expect(shouldShowMidMissionOverlay(THERIS_GOODBYE_MISSION_IDX)).toBe(true);
    expect(shouldShowMidMissionOverlay(6)).toBe(false);
  });

  it('does NOT fire on M6 replays after Theris has cashed out', () => {
    _setStatusForTest('cashed_out');
    expect(shouldShowMidMissionOverlay(THERIS_GOODBYE_MISSION_IDX)).toBe(false);
  });
});

describe('TheresInterludes — triggerFarewellInterlude', () => {
  it('returns the note text + flips status on M6 first win', () => {
    expect(getStatus()).toBe('with_ardax');
    const note = triggerFarewellInterlude(THERIS_GOODBYE_MISSION_IDX);
    expect(note).toBe(THERIS_FAREWELL_NOTE);
    expect(getStatus()).toBe('cashed_out');
  });

  it('is idempotent — second call returns null', () => {
    triggerFarewellInterlude(THERIS_GOODBYE_MISSION_IDX);
    expect(triggerFarewellInterlude(THERIS_GOODBYE_MISSION_IDX)).toBeNull();
    expect(getStatus()).toBe('cashed_out');
  });

  it('returns null on non-M6 missions even if status would otherwise allow it', () => {
    expect(triggerFarewellInterlude(0)).toBeNull();
    expect(triggerFarewellInterlude(4)).toBeNull();
    expect(triggerFarewellInterlude(9)).toBeNull();
    expect(getStatus()).toBe('with_ardax'); // unchanged
  });
});

describe('TheresInterludes — shouldRenderAtCounterfactualTable', () => {
  it('false on non-M10 missions', () => {
    for (const idx of [0, 5, 6, 7, 8]) {
      expect(shouldRenderAtCounterfactualTable(idx)).toBe(false);
    }
  });

  it('false on M10 if Theris is still with Ardax (defensive)', () => {
    expect(shouldRenderAtCounterfactualTable(9)).toBe(false);
  });

  it('true on M10 after Theris has cashed out', () => {
    _setStatusForTest('cashed_out');
    expect(shouldRenderAtCounterfactualTable(9)).toBe(true);
  });
});
