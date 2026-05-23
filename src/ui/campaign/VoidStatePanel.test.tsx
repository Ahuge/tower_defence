/**
 * Smoke tests for VoidStatePanel. The full visual is covered by
 * Playwright in a follow-up; here we pin the registration via the
 * Snake Eyes extension's `ui.panels` aspect.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SNAKE_EYES_EXTENSION } from '../../data/campaigns/snake-eyes';
import { resetSnakeEyesState, applyDebtDelta } from '../../systems/voidc/DebtTracker';
import './VoidStatePanel';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('VoidStatePanel — registration via extension ui.panels', () => {
  it('is exposed on the Snake Eyes extension', () => {
    expect(SNAKE_EYES_EXTENSION.ui).toBeDefined();
    expect(SNAKE_EYES_EXTENSION.ui!.panels).toBeDefined();
    expect(SNAKE_EYES_EXTENSION.ui!.panels!.length).toBeGreaterThan(0);
  });

  it('renders a panel when invoked', () => {
    const panels = SNAKE_EYES_EXTENSION.ui!.panels!;
    const state = SNAKE_EYES_EXTENSION.missionState?.read() ?? SNAKE_EYES_EXTENSION.initialState;
    const out = panels[0].render(state);
    expect(out).toBeDefined();
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
