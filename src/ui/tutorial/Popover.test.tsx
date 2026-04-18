/**
 * Popover component spec.
 *
 * The popover's only real logic is placement: given a target rect +
 * requested placement + viewport dimensions, where does the card go?
 * We use rect-overlap assertions from the shared helper so failures
 * print the actual intersection region instead of "expected true to
 * be false".
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/preact';
import { Popover } from './Popover';
import type { Rect } from '../../../test/helpers/rects';
import { assertNoOverlap, rectFullyInsideViewport, rectsOverlap } from '../../../test/helpers/rects';
import { inlineRect } from '../../../test/helpers/inlineRect';
import { setViewport, VIEWPORTS } from '../../../test/helpers/viewport';

/** Popover's inline-styled card sits inside its outermost div. Pull it
 *  out via the `.tutorial-popover` class the component stamps on. */
function popoverEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.tutorial-popover');
  if (!el) throw new Error('Popover did not render');
  return el;
}

function popoverRect(): Rect {
  return inlineRect(popoverEl());
}

const defaultProps = {
  title: 'Step title',
  body: 'Step body content.',
  rect: null as Rect | null,
  placement: 'auto' as const,
  stepIndex: 0,
  totalSteps: 3,
  showNext: true,
  onNext: vi.fn(),
  onSkip: vi.fn(),
};

let restoreViewport: () => void = () => {};

beforeEach(() => {
  restoreViewport = setViewport(VIEWPORTS.desktop);
  defaultProps.onNext = vi.fn();
  defaultProps.onSkip = vi.fn();
});

afterEach(() => {
  cleanup();
  restoreViewport();
});

describe('Popover — content', () => {
  it('renders the title and body', () => {
    render(<Popover {...defaultProps} />);
    expect(screen.getByText('Step title')).toBeInTheDocument();
    expect(screen.getByText('Step body content.')).toBeInTheDocument();
  });

  it('renders the step counter', () => {
    render(<Popover {...defaultProps} stepIndex={2} totalSteps={5} />);
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('defaults the skip label to "Skip"', () => {
    render(<Popover {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('honours a custom skipLabel (used by tutorial match → "Quit")', () => {
    render(<Popover {...defaultProps} skipLabel="Quit" />);
    expect(screen.getByRole('button', { name: 'Quit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  });
});

describe('Popover — buttons', () => {
  it('Skip button calls onSkip', () => {
    const onSkip = vi.fn();
    render(<Popover {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('Next button calls onNext when showNext is true and no CTA', () => {
    const onNext = vi.fn();
    render(<Popover {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('Next button label reads "Done" on the terminal step', () => {
    render(<Popover {...defaultProps} stepIndex={2} totalSteps={3} />);
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('hides the Next button when showNext is false (event-gated step)', () => {
    render(<Popover {...defaultProps} showNext={false} />);
    expect(screen.queryByRole('button', { name: /Next|Done/ })).toBeNull();
  });
});

describe('Popover — CTA (terminal step)', () => {
  it('CTA replaces Next on the terminal step', () => {
    const action = vi.fn();
    render(
      <Popover
        {...defaultProps}
        stepIndex={2}
        totalSteps={3}
        cta={{ label: 'Play Tutorial Match', action }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play Tutorial Match' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Done|Next/ })).toBeNull();
  });

  it('CTA click fires action then onNext (which completes the track)', () => {
    const action = vi.fn();
    const onNext = vi.fn();
    render(
      <Popover
        {...defaultProps}
        stepIndex={2}
        totalSteps={3}
        onNext={onNext}
        cta={{ label: 'Done!', action }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Done!' }));
    expect(action).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('CTA on a non-terminal step does NOT replace Next', () => {
    // A CTA on a middle step should still show Next (terminal replacement
    // only). Our current content only uses CTAs on terminal steps, but
    // the component shouldn't break if it's called otherwise.
    render(
      <Popover
        {...defaultProps}
        stepIndex={0}
        totalSteps={3}
        cta={{ label: 'Whatever', action: () => {} }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    // No CTA button rendered — the component gates on isTerminal.
    expect(screen.queryByRole('button', { name: 'Whatever' })).toBeNull();
  });
});

describe('Popover — placement', () => {
  it('placement "top-banner" anchors near the top of the viewport regardless of rect', () => {
    render(<Popover {...defaultProps} rect={{ x: 500, y: 400, width: 50, height: 50 }} placement="top-banner" />);
    const r = popoverRect();
    expect(r.y).toBeLessThan(100); // within CARD_MARGIN-ish of the top
  });

  it('placement "center" centres the card when rect is missing', () => {
    render(<Popover {...defaultProps} rect={null} placement="center" />);
    const r = popoverRect();
    const centreX = VIEWPORTS.desktop.width / 2;
    // popover's centre should land roughly at viewport centre (width 320).
    expect(Math.abs(r.x + r.width / 2 - centreX)).toBeLessThan(40);
  });

  it('placement "bottom" places the card below the target rect', () => {
    render(
      <Popover
        {...defaultProps}
        rect={{ x: 400, y: 300, width: 100, height: 100 }}
        placement="bottom"
      />,
    );
    const r = popoverRect();
    expect(r.y).toBeGreaterThan(300 + 100); // below the rect's bottom edge
  });

  it('placement "top" places the card above the target rect', () => {
    render(
      <Popover
        {...defaultProps}
        rect={{ x: 400, y: 400, width: 100, height: 100 }}
        placement="top"
      />,
    );
    const r = popoverRect();
    // "top" means popover bottom is above the rect's top.
    expect(r.y).toBeLessThan(400);
  });
});

describe('Popover — overlap invariants', () => {
  it('does NOT overlap the target rect when placement is "bottom"', () => {
    const target = { x: 400, y: 200, width: 100, height: 100 };
    render(<Popover {...defaultProps} rect={target} placement="bottom" />);
    assertNoOverlap(popoverRect(), target, 'popover', 'target');
  });

  it('does NOT overlap the target rect when placement is "top"', () => {
    const target = { x: 400, y: 500, width: 100, height: 100 };
    render(<Popover {...defaultProps} rect={target} placement="top" />);
    assertNoOverlap(popoverRect(), target, 'popover', 'target');
  });

  it('stays fully inside the desktop viewport for a centred target', () => {
    const target = { x: 600, y: 400, width: 40, height: 40 };
    render(<Popover {...defaultProps} rect={target} placement="auto" />);
    const r = popoverRect();
    // Note: jsdom doesn't measure height from inline styles when none
    // is set, so we assume a conservative 180px popover height here —
    // matches the component's own assumption in fitsInViewport.
    const assumed: Rect = { ...r, height: 180 };
    expect(
      rectFullyInsideViewport(assumed, VIEWPORTS.desktop.width, VIEWPORTS.desktop.height, 0),
      `popover leaked out of viewport. rect=${JSON.stringify(assumed)}`,
    ).toBe(true);
  });

  it('on narrow mobile, top-banner placement stays fully visible', () => {
    restoreViewport();
    restoreViewport = setViewport(VIEWPORTS.phone);

    const target = { x: 200, y: 500, width: 40, height: 40 };
    render(<Popover {...defaultProps} rect={target} placement="top-banner" />);
    const r = popoverRect();
    const assumed: Rect = { ...r, height: 180 };
    expect(
      rectFullyInsideViewport(assumed, VIEWPORTS.phone.width, VIEWPORTS.phone.height, 0),
      `top-banner popover leaked off mobile viewport. rect=${JSON.stringify(assumed)}`,
    ).toBe(true);
  });

  it('when preferred placement would overflow, pickAnchor flips to a fitting one', () => {
    restoreViewport();
    restoreViewport = setViewport(VIEWPORTS.phone);

    // Target at the very bottom — "bottom" would push popover off-screen.
    const target = { x: 150, y: VIEWPORTS.phone.height - 60, width: 50, height: 50 };
    render(<Popover {...defaultProps} rect={target} placement="bottom" />);
    const r = popoverRect();
    // Popover top should be above the target, since "bottom" didn't fit.
    expect(r.y).toBeLessThan(target.y);
    // No overlap with the target either.
    assertNoOverlap(r, target, 'flipped popover', 'target');
  });

  it('two overlapping rects would fail assertNoOverlap (meta-check)', () => {
    // Sanity-check the assertion helper inline — if this test were to
    // pass silently (e.g. assertNoOverlap mistakenly did nothing), the
    // popover overlap guarantees above would also silently pass.
    expect(() => {
      assertNoOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 });
    }).toThrow();
    expect(rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
  });
});
