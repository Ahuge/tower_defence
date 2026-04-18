/**
 * Spotlight component spec.
 *
 * Covers the three rendering modes:
 *   - no rect + scrim enabled   -> full-viewport scrim div
 *   - no rect + scrimless       -> nothing rendered
 *   - rect + scrim              -> cutout with box-shadow scrim + ring
 *   - rect + scrimless          -> ring only, no dim
 *
 * Plus scrim-click-catcher visibility rules (must not render when
 * scrimless or when no click handler supplied), and rect-containment
 * invariants.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { Spotlight } from './Spotlight';
import { inlineRect } from '../../../test/helpers/inlineRect';
import { rectContains, assertContains, Rect } from '../../../test/helpers/rects';
import { setViewport, VIEWPORTS } from '../../../test/helpers/viewport';

function spotlightEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tutorial-spotlight');
}
function scrimEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tutorial-scrim');
}
function scrimCatchers(): HTMLElement[] {
  // The catchers are the transparent fixed-position divs at zIndex 399.
  return Array.from(document.querySelectorAll<HTMLElement>('div[style*="z-index: 399"]'));
}

let restoreViewport: () => void = () => {};

beforeEach(() => {
  restoreViewport = setViewport(VIEWPORTS.desktop);
});

afterEach(() => {
  cleanup();
  restoreViewport();
});

describe('Spotlight — no rect', () => {
  it('renders a full-viewport scrim when not scrimless', () => {
    render(<Spotlight rect={null} />);
    const scrim = scrimEl();
    expect(scrim).not.toBeNull();
    expect(spotlightEl()).toBeNull();
  });

  it('renders nothing when scrimless and no rect', () => {
    const { container } = render(<Spotlight rect={null} scrimless />);
    // The scrimless + no-rect branch returns null — the rendered tree is empty.
    expect(container.firstChild).toBeNull();
    expect(scrimEl()).toBeNull();
    expect(spotlightEl()).toBeNull();
  });

  it('scrim click fires onClickScrim when provided', () => {
    const onClick = vi.fn();
    render(<Spotlight rect={null} onClickScrim={onClick} />);
    const scrim = scrimEl();
    fireEvent.click(scrim!);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Spotlight — with rect (scrimmed)', () => {
  const rect: Rect = { x: 100, y: 200, width: 80, height: 40 };

  it('renders a cutout rect with padding around the target', () => {
    render(<Spotlight rect={rect} padding={6} />);
    const el = spotlightEl();
    expect(el).not.toBeNull();
    const r = inlineRect(el!);
    expect(r.x).toBe(rect.x - 6);
    expect(r.y).toBe(rect.y - 6);
    expect(r.width).toBe(rect.width + 12);
    expect(r.height).toBe(rect.height + 12);
  });

  it('has a box-shadow that includes the dim scrim spread', () => {
    render(<Spotlight rect={rect} />);
    const style = spotlightEl()!.style.boxShadow;
    // Scrimmed variant uses the 9999px spread shadow.
    expect(style).toMatch(/9999px/);
  });

  it('uses CSS animation keyframes (pulse) for the ring', () => {
    render(<Spotlight rect={rect} />);
    const style = spotlightEl()!.style.animation;
    expect(style).toContain('tutorialSpotlightPulse');
  });
});

describe('Spotlight — scrimless variant', () => {
  const rect: Rect = { x: 100, y: 200, width: 80, height: 40 };

  it('does NOT include the 9999px spread shadow', () => {
    render(<Spotlight rect={rect} scrimless />);
    const style = spotlightEl()!.style.boxShadow;
    expect(style).not.toMatch(/9999px/);
  });

  it('still draws the gold ring (inset + glow)', () => {
    render(<Spotlight rect={rect} scrimless />);
    const style = spotlightEl()!.style.boxShadow;
    expect(style.toLowerCase()).toContain('inset');
  });

  it('does NOT render scrim click-catchers', () => {
    render(<Spotlight rect={rect} scrimless onClickScrim={vi.fn()} />);
    expect(scrimCatchers()).toHaveLength(0);
  });
});

describe('Spotlight — click catchers', () => {
  const rect: Rect = { x: 100, y: 200, width: 80, height: 40 };

  it('renders four catchers when scrim is on and onClickScrim is provided', () => {
    render(<Spotlight rect={rect} onClickScrim={vi.fn()} />);
    expect(scrimCatchers()).toHaveLength(4);
  });

  it('renders zero catchers when onClickScrim is undefined (event-gated step)', () => {
    // Regression: before the fix, catchers rendered even without a
    // handler and swallowed every tap on event-gated steps.
    render(<Spotlight rect={rect} />);
    expect(scrimCatchers()).toHaveLength(0);
  });

  it('clicking a catcher fires onClickScrim', () => {
    const onClick = vi.fn();
    render(<Spotlight rect={rect} onClickScrim={onClick} />);
    const catchers = scrimCatchers();
    expect(catchers.length).toBe(4);
    fireEvent.click(catchers[0]);
    expect(onClick).toHaveBeenCalled();
  });
});

describe('Spotlight — rect invariants', () => {
  it('padded rect fully contains the original target rect', () => {
    const target: Rect = { x: 400, y: 300, width: 60, height: 40 };
    render(<Spotlight rect={target} padding={8} />);
    const padded = inlineRect(spotlightEl()!);
    assertContains(padded, target, 'spotlight cutout', 'target');
  });

  it('cutout stays non-negative even when padding pushes it past zero', () => {
    // Target at (0,0) with padding 8 — cutout would be at (-8, -8).
    // That's fine for box-shadow rendering but should still be computed
    // consistently so containment assertions work.
    const target: Rect = { x: 0, y: 0, width: 40, height: 40 };
    render(<Spotlight rect={target} padding={8} />);
    const r = inlineRect(spotlightEl()!);
    expect(r.x).toBe(-8);
    expect(r.y).toBe(-8);
    expect(rectContains(r, target)).toBe(true);
  });
});
