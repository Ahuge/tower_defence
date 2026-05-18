/**
 * Smoke tests for SnakeEyesEndingPanel — verifies the ending renders
 * the composed epilogue + the three card-flip elements.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
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

  it('renders three flip cards labelled ME / vs / HIM', () => {
    const { container } = render(<SnakeEyesEndingPanel />);
    const text = container.textContent ?? '';
    expect(text).toContain('ME');
    expect(text).toContain('vs');
    expect(text).toContain('HIM');
  });
});
