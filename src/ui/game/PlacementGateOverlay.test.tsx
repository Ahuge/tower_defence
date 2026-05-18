/**
 * Smoke tests for PlacementGateOverlay — renders / hides based on
 * GameUIStore.placementGhost; fires commit / cancel callbacks.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { PlacementGateOverlay } from './PlacementGateOverlay';
import { GameUIStore } from '../GameUIStore';

afterEach(() => {
  cleanup();
  GameUIStore.setPlacementGhost(null);
  // Best-effort callback reset between tests.
  GameUIStore.registerCallbacks({});
});

beforeEach(() => {
  // Mount a fake canvas so projectCellToScreen has something to read.
  // 1008 × 720 mirrors the production GAME_WIDTH / GAME_HEIGHT roughly.
  const canvas = document.createElement('canvas');
  canvas.width = 1008;
  canvas.height = 720;
  const root = document.createElement('div');
  root.id = 'game-root';
  root.appendChild(canvas);
  document.body.appendChild(root);
  // Stub getBoundingClientRect so jsdom returns non-zero dims.
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 1008, bottom: 720,
    width: 1008, height: 720, x: 0, y: 0, toJSON: () => ({}),
  });
});

afterEach(() => {
  document.getElementById('game-root')?.remove();
});

describe('PlacementGateOverlay', () => {
  it('renders nothing when no ghost is staged', () => {
    const { container } = render(<PlacementGateOverlay />);
    expect(container.querySelector('[data-testid="placement-gate-overlay"]')).toBeNull();
  });

  it('renders tick + cancel buttons when a ghost is staged', () => {
    GameUIStore.setPlacementGhost({ col: 10, row: 8, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    expect(container.querySelector('[data-testid="placement-gate-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="place-and-approve-commit"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="place-and-approve-cancel"]')).not.toBeNull();
  });

  it('fires onPlacementCommit when the tick is clicked', () => {
    let commits = 0;
    GameUIStore.registerCallbacks({
      onPlacementCommit: () => { commits++; },
    });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const tick = container.querySelector('[data-testid="place-and-approve-commit"]') as HTMLButtonElement;
    fireEvent.click(tick);
    expect(commits).toBe(1);
  });

  it('fires onPlacementCancel when the X is clicked', () => {
    let cancels = 0;
    GameUIStore.registerCallbacks({
      onPlacementCancel: () => { cancels++; },
    });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const cancel = container.querySelector('[data-testid="place-and-approve-cancel"]') as HTMLButtonElement;
    fireEvent.click(cancel);
    expect(cancels).toBe(1);
  });

  it('buttons have screen-reader-friendly aria-labels', () => {
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const commit = container.querySelector('[data-testid="place-and-approve-commit"]');
    const cancel = container.querySelector('[data-testid="place-and-approve-cancel"]');
    expect(commit?.getAttribute('aria-label')).toContain('Confirm');
    expect(cancel?.getAttribute('aria-label')).toContain('Cancel');
  });
});
