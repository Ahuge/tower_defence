/**
 * Tests for PlaceAndApproveSetting — preference persistence + the
 * platform-default fallback.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRawPreference,
  isPlaceAndApproveEnabled,
  setPreference,
  _resetForTest,
} from './PlaceAndApproveSetting';
import { ResponsiveManager } from '../ResponsiveManager';

beforeEach(() => {
  _resetForTest();
});

describe('PlaceAndApproveSetting — fresh state', () => {
  it('raw preference is null when unset', () => {
    expect(getRawPreference()).toBeNull();
  });

  it('effective enabled state matches platform default (phone)', () => {
    vi.spyOn(ResponsiveManager, 'isPhone').mockReturnValue(true);
    expect(isPlaceAndApproveEnabled()).toBe(true);
  });

  it('effective enabled state matches platform default (desktop)', () => {
    vi.spyOn(ResponsiveManager, 'isPhone').mockReturnValue(false);
    expect(isPlaceAndApproveEnabled()).toBe(false);
  });
});

describe('PlaceAndApproveSetting — explicit preference', () => {
  it("'on' overrides desktop default to enabled", () => {
    vi.spyOn(ResponsiveManager, 'isPhone').mockReturnValue(false);
    setPreference('on');
    expect(isPlaceAndApproveEnabled()).toBe(true);
    expect(getRawPreference()).toBe('on');
  });

  it("'off' overrides phone default to disabled", () => {
    vi.spyOn(ResponsiveManager, 'isPhone').mockReturnValue(true);
    setPreference('off');
    expect(isPlaceAndApproveEnabled()).toBe(false);
    expect(getRawPreference()).toBe('off');
  });

  it('null clears to platform default', () => {
    vi.spyOn(ResponsiveManager, 'isPhone').mockReturnValue(true);
    setPreference('on');
    setPreference(null);
    expect(getRawPreference()).toBeNull();
    expect(isPlaceAndApproveEnabled()).toBe(true); // phone default
  });

  it('preference round-trips through localStorage', () => {
    setPreference('on');
    // Fresh read should see the persisted value.
    expect(getRawPreference()).toBe('on');
  });
});

describe('PlaceAndApproveSetting — localStorage failure modes', () => {
  it('treats a corrupted/unknown value as missing', () => {
    try { localStorage.setItem('td_place_and_approve', 'sometimes'); } catch { /* swallow */ }
    expect(getRawPreference()).toBeNull();
  });
});
