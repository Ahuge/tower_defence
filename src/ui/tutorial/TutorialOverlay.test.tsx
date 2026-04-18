/**
 * TutorialOverlay integration spec — wires useTutorial + Spotlight +
 * Popover together. Drives the overlay by mocking useTutorial /
 * TutorialManager / resolveTarget so specs can set up an "active
 * track + step" state and verify what the overlay does with it.
 *
 * The overlap + viewport assertions here are the tier-3 payoff: with
 * a known step target rect, we confirm popover placement doesn't
 * collide with the spotlight and stays inside the viewport.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/preact';

// ─── Module mocks ──────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  active: null as any,
  resolvedRect: null as { x: number; y: number; width: number; height: number } | null,
  next: vi.fn(),
  skip: vi.fn(),
}));

vi.mock('./useTutorial', () => ({
  useTutorial: () => mocks.active,
}));

vi.mock('../../systems/Tutorial/TutorialTargets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../systems/Tutorial/TutorialTargets')>();
  return {
    ...actual,
    resolveTarget: () => mocks.resolvedRect,
  };
});

vi.mock('../../systems/Tutorial/TutorialManager', () => ({
  TutorialManager: {
    next: mocks.next,
    skip: mocks.skip,
  },
}));

import { TutorialOverlay } from './TutorialOverlay';
import { setViewport, VIEWPORTS } from '../../../test/helpers/viewport';
import { assertNoOverlap, rectFullyInsideViewport, Rect } from '../../../test/helpers/rects';
import { inlineRect } from '../../../test/helpers/inlineRect';

function makeActive(opts: {
  trackId?: string;
  scrimless?: boolean;
  skipLabel?: string;
  stepId?: string;
  advanceOn?: any;
  placement?: any;
  cta?: any;
  target?: any;
  totalSteps?: number;
  stepIndex?: number;
}): void {
  const step = {
    id: opts.stepId ?? 'step',
    title: 'Title',
    body: 'Body',
    target: opts.target ?? { kind: 'screen' },
    placement: opts.placement,
    advanceOn: opts.advanceOn,
    cta: opts.cta,
  };
  const totalSteps = opts.totalSteps ?? 3;
  const stepIndex = opts.stepIndex ?? 0;
  mocks.active = {
    track: {
      id: opts.trackId ?? 'basics',
      scrimless: opts.scrimless,
      skipLabel: opts.skipLabel,
      steps: Array.from({ length: totalSteps }, (_, i) => (i === stepIndex ? step : { ...step, id: `step${i}` })),
    },
    stepIndex,
    step,
  };
}

let restoreViewport: () => void = () => {};

beforeEach(() => {
  mocks.active = null;
  mocks.resolvedRect = null;
  mocks.next.mockReset();
  mocks.skip.mockReset();
  restoreViewport = setViewport(VIEWPORTS.desktop);
});

afterEach(() => {
  cleanup();
  restoreViewport();
});

function popoverEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.tutorial-popover');
  if (!el) throw new Error('popover did not render');
  return el;
}
function spotlightEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tutorial-spotlight');
}

describe('TutorialOverlay — visibility', () => {
  it('renders nothing when no active track', () => {
    mocks.active = null;
    const { container } = render(<TutorialOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Spotlight + Popover when active', () => {
    makeActive({});
    render(<TutorialOverlay />);
    expect(popoverEl()).toBeInTheDocument();
    // No rect -> scrim (scrimmed variant) renders.
    expect(document.querySelector('.tutorial-scrim')).toBeInTheDocument();
  });
});

describe('TutorialOverlay — button wiring', () => {
  it('Skip button calls TutorialManager.skip', () => {
    makeActive({});
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(mocks.skip).toHaveBeenCalledOnce();
  });

  it('Next button calls TutorialManager.next', () => {
    makeActive({});
    render(<TutorialOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mocks.next).toHaveBeenCalledOnce();
  });

  it('event-gated steps hide Next (no scrim advance either)', () => {
    makeActive({ advanceOn: { event: 'towerPlaced' } });
    render(<TutorialOverlay />);
    expect(screen.queryByRole('button', { name: /Next|Done/ })).toBeNull();
  });
});

describe('TutorialOverlay — track-level flags', () => {
  it('scrimless track drops the scrim div on rect-less steps', () => {
    makeActive({ scrimless: true });
    mocks.resolvedRect = null;
    const { container } = render(<TutorialOverlay />);
    // Scrimless + no rect = Spotlight renders null, so only the popover
    // shows up (as a fragment at the top-level).
    expect(document.querySelector('.tutorial-scrim')).toBeNull();
    expect(container.querySelector('.tutorial-popover')).toBeInTheDocument();
  });

  it('scrimless track uses a box-shadow without the spread scrim when a rect exists', () => {
    makeActive({
      scrimless: true,
      target: { kind: 'canvas', x: 0, y: 0, width: 40, height: 40 },
    });
    mocks.resolvedRect = { x: 100, y: 100, width: 40, height: 40 };
    render(<TutorialOverlay />);
    const style = spotlightEl()!.style.boxShadow;
    expect(style).not.toMatch(/9999px/);
  });

  it('custom skipLabel ("Quit") propagates to the Popover', () => {
    makeActive({ skipLabel: 'Quit' });
    render(<TutorialOverlay />);
    expect(screen.getByRole('button', { name: 'Quit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  });
});

describe('TutorialOverlay — scrim click advance', () => {
  it('click-style steps advance when the scrim is clicked', () => {
    makeActive({});
    render(<TutorialOverlay />);
    // Rect is null so the scrim is the full-viewport div.
    const scrim = document.querySelector<HTMLElement>('.tutorial-scrim')!;
    fireEvent.click(scrim);
    expect(mocks.next).toHaveBeenCalled();
  });

  it('event-gated steps do NOT advance on scrim click', () => {
    makeActive({ advanceOn: { event: 'waveStarted' } });
    render(<TutorialOverlay />);
    const scrim = document.querySelector<HTMLElement>('.tutorial-scrim')!;
    fireEvent.click(scrim);
    expect(mocks.next).not.toHaveBeenCalled();
  });
});

describe('TutorialOverlay — popover / spotlight overlap invariants', () => {
  it('popover does NOT overlap the spotlight for placement=bottom', () => {
    makeActive({
      target: { kind: 'canvas', x: 0, y: 0, width: 60, height: 60 },
      placement: 'bottom',
    });
    mocks.resolvedRect = { x: 400, y: 200, width: 120, height: 60 };
    render(<TutorialOverlay />);

    const spotlight = inlineRect(spotlightEl()!);
    const popover = inlineRect(popoverEl());
    assertNoOverlap(popover, spotlight, 'popover', 'spotlight');
  });

  it('popover does NOT overlap the spotlight for placement=top', () => {
    makeActive({
      target: { kind: 'canvas', x: 0, y: 0, width: 60, height: 60 },
      placement: 'top',
    });
    mocks.resolvedRect = { x: 400, y: 500, width: 120, height: 60 };
    render(<TutorialOverlay />);

    assertNoOverlap(inlineRect(popoverEl()), inlineRect(spotlightEl()!), 'popover', 'spotlight');
  });

  it('top-banner placement does not overlap a centred spotlight', () => {
    // Mobile: top-banner popover at top of screen; spotlight in the
    // middle of the board. Should be clearly separated.
    restoreViewport();
    restoreViewport = setViewport(VIEWPORTS.phone);

    makeActive({
      target: { kind: 'canvas', x: 0, y: 0, width: 60, height: 60 },
      placement: 'top-banner',
    });
    mocks.resolvedRect = { x: 150, y: 450, width: 80, height: 60 };
    render(<TutorialOverlay />);

    assertNoOverlap(inlineRect(popoverEl()), inlineRect(spotlightEl()!), 'top-banner popover', 'spotlight');
  });

  it('popover stays (approximately) inside the viewport on desktop', () => {
    makeActive({
      target: { kind: 'canvas', x: 0, y: 0, width: 60, height: 60 },
      placement: 'auto',
    });
    mocks.resolvedRect = { x: 400, y: 200, width: 120, height: 60 };
    render(<TutorialOverlay />);

    const r = inlineRect(popoverEl());
    const assumed: Rect = { ...r, height: 180 };
    expect(
      rectFullyInsideViewport(assumed, VIEWPORTS.desktop.width, VIEWPORTS.desktop.height, 0),
      `popover leaked off viewport: ${JSON.stringify(assumed)}`,
    ).toBe(true);
  });

  it('spotlight ring is at least partially inside the viewport', () => {
    makeActive({
      target: { kind: 'canvas', x: 0, y: 0, width: 60, height: 60 },
    });
    mocks.resolvedRect = { x: 100, y: 100, width: 60, height: 60 };
    render(<TutorialOverlay />);
    const r = inlineRect(spotlightEl()!);
    // At least one pixel inside (0..vw, 0..vh).
    expect(r.x).toBeLessThan(VIEWPORTS.desktop.width);
    expect(r.y).toBeLessThan(VIEWPORTS.desktop.height);
    expect(r.x + r.width).toBeGreaterThan(0);
    expect(r.y + r.height).toBeGreaterThan(0);
  });
});
