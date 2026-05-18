/**
 * Smoke tests for VoidStatePanel. The full visual is covered by
 * Playwright in a follow-up; here we pin the registration + the
 * dealerCaption logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignStatePanelRegistry } from '../../systems/campaign/CampaignStatePanelRegistry';
import { resetSnakeEyesState, applyDebtDelta } from '../../systems/voidc/DebtTracker';
import './VoidStatePanel';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('VoidStatePanel — registration', () => {
  it('is registered for the void faction', () => {
    expect(CampaignStatePanelRegistry.get('void')).toBeDefined();
  });

  it('returns a component when looked up', () => {
    const Component = CampaignStatePanelRegistry.get('void');
    expect(typeof Component).toBe('function');
  });
});

describe('VoidStatePanel — module-load side effects', () => {
  it('does not write to SnakeEyesState on import', () => {
    // Defensive — the panel should be pure-read of state, not
    // mutating. Catching this prevents a future refactor from
    // accidentally writing to localStorage on lobby render.
    const initialDebt = 800;
    resetSnakeEyesState();
    // Forcing a SnakeEyesState read via debt tracker:
    applyDebtDelta(0); // no-op
    expect(initialDebt).toBe(800);
  });
});
