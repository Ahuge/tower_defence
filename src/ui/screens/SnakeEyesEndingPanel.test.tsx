/**
 * Smoke tests for SnakeEyesEndingPanel — verifies the ending renders
 * the composed epilogue + the three card-flip elements.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
import { SnakeEyesEndingPanel } from './SnakeEyesEndingPanel';
import { resetSnakeEyesState, getSnakeEyesState, setSnakeEyesState } from '../../systems/voidc/DebtTracker';
import { EPILOGUE_FRAGMENTS } from '../../systems/voidc/EpilogueComposer';

beforeEach(() => {
  resetSnakeEyesState();
});

afterEach(() => cleanup());

describe('SnakeEyesEndingPanel', () => {
  it('renders the section testid', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    expect(container.querySelector('[data-testid="snake-eyes-ending"]')).not.toBeNull();
  });

  it('renders the title "THE COUNTERFACTUAL\'S MIRROR"', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    expect(container.textContent).toContain("THE COUNTERFACTUAL'S MIRROR");
  });

  it('renders the composed epilogue from current state', () => {
    setSnakeEyesState({
      ...getSnakeEyesState(),
      debt: 0,
      lastMissionDivergence: 9,
      theresStatus: 'cashed_out',
      pactbookTally: {
        acceptedT1: 0, acceptedT2: 0, acceptedT3: 4,
        declined: 0, succeeded: 4, failed: 0,
      },
    });
    const { container } = render(<SnakeEyesEndingPanel />);
    expect(container.textContent).toContain(EPILOGUE_FRAGMENTS.debt.settled);
    expect(container.textContent).toContain(EPILOGUE_FRAGMENTS.divergence.high);
    expect(container.textContent).toContain(EPILOGUE_FRAGMENTS.theris.cashed_out);
    expect(container.textContent).toContain(EPILOGUE_FRAGMENTS.tally.t3);
  });

  it('renders an explicit epilogue override when supplied', () => {
    const { container } = render(<SnakeEyesEndingPanel epilogue="One last hand." />);
    expect(container.textContent).toContain('One last hand.');
  });

  it('renders three flip cards with the snake-eyes-and-six dice glyphs', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    const text = container.textContent ?? '';
    // Cards 0+1 are both ⚀ (snake eyes); card 2 is ⚅ (six).
    // Chosen via 3-versions blind-compare — the campaign title made
    // diegetic at the climactic frame.
    expect(text).toContain('⚀');
    expect(text).toContain('⚅');
    // Sanity: at least 2 snake-eye pips for the "snake eyes" pair.
    const matches = text.match(/⚀/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SnakeEyesEndingPanel — animation timing', () => {
  // Pin the actual flip schedule + body fade. Uses fake timers so
  // the test runs synchronously without sleeping. If the reveal
  // delays drift (e.g. someone refactors the constants), this fails
  // loudly.

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function flipped(container: Element, idx: 0 | 1 | 2): boolean {
    const card = container.querySelector(`[data-testid="flip-card-${idx}"]`);
    return card?.getAttribute('data-flipped') === 'true';
  }

  function bodyShown(container: Element): boolean {
    const body = container.querySelector('[data-testid="snake-eyes-epilogue-body"]');
    return body?.getAttribute('data-shown') === 'true';
  }

  it('all three cards start un-flipped at t=0', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    expect(flipped(container, 0)).toBe(false);
    expect(flipped(container, 1)).toBe(false);
    expect(flipped(container, 2)).toBe(false);
  });

  it('card 0 flips at 400ms; cards 1+2 still face-down', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(flipped(container, 0)).toBe(true);
    expect(flipped(container, 1)).toBe(false);
    expect(flipped(container, 2)).toBe(false);
  });

  it('card 1 flips at 900ms', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    act(() => { vi.advanceTimersByTime(900); });
    expect(flipped(container, 0)).toBe(true);
    expect(flipped(container, 1)).toBe(true);
    expect(flipped(container, 2)).toBe(false);
  });

  it('card 2 flips at 1400ms', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    act(() => { vi.advanceTimersByTime(1400); });
    expect(flipped(container, 0)).toBe(true);
    expect(flipped(container, 1)).toBe(true);
    expect(flipped(container, 2)).toBe(true);
  });

  it('epilogue body is hidden before 1900ms', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    expect(bodyShown(container)).toBe(false);
    act(() => { vi.advanceTimersByTime(1800); });
    expect(bodyShown(container)).toBe(false);
  });

  it('epilogue body fades in at 1900ms', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    act(() => { vi.advanceTimersByTime(1900); });
    expect(bodyShown(container)).toBe(true);
  });
});
