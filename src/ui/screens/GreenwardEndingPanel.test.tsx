/**
 * GreenwardEndingPanel smoke tests. Verifies the panel renders the
 * correct title / tableau frame / outro for each resolved Nave mode
 * and falls back to Siege when the mode is missing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { GreenwardEndingPanel } from './GreenwardEndingPanel';
import { GREENWARD_M10_ENDINGS } from '../../data/campaigns/texts/greenward.texts';

afterEach(() => cleanup());

describe('GreenwardEndingPanel — per-mode render', () => {
  it('renders the Ceremony title + outro for resolvedMode="ceremony"', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="ceremony" />);
    expect(container.textContent).toContain(GREENWARD_M10_ENDINGS.ceremony.title);
    expect(container.textContent).toContain('Marra sang the long song');
  });

  it('renders the Mercy title + outro for resolvedMode="mercy"', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="mercy" />);
    expect(container.textContent).toContain(GREENWARD_M10_ENDINGS.mercy.title);
    expect(container.textContent).toContain('Marra did not take the cathedral');
  });

  it('renders the Siege title + outro for resolvedMode="siege"', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="siege" />);
    expect(container.textContent).toContain(GREENWARD_M10_ENDINGS.siege.title);
    expect(container.textContent).toContain('Marra brought the forest entire');
  });
});

describe('GreenwardEndingPanel — tableau frame offset', () => {
  // The background-position pulls the right frame out of the vertical
  // sheet (3 frames × 96px each, scaled 3× in the DOM).
  it('Ceremony picks frame 0 (background-position y = 0)', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="ceremony" />);
    const tableau = container.querySelector('[role="img"]')!;
    const style = tableau.getAttribute('style') ?? '';
    expect(style).toContain('background-position: 0px 0px');
  });

  it('Mercy picks frame 1', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="mercy" />);
    const tableau = container.querySelector('[role="img"]')!;
    const style = tableau.getAttribute('style') ?? '';
    // -1 * 96 * 3 = -288px
    expect(style).toContain('background-position: 0px -288px');
  });

  it('Siege picks frame 2', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="siege" />);
    const tableau = container.querySelector('[role="img"]')!;
    const style = tableau.getAttribute('style') ?? '';
    // -2 * 96 * 3 = -576px
    expect(style).toContain('background-position: 0px -576px');
  });
});

describe('GreenwardEndingPanel — fallback', () => {
  it('null resolvedMode falls back to Siege (narrative-safe default)', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode={null} />);
    expect(container.textContent).toContain(GREENWARD_M10_ENDINGS.siege.title);
  });

  it('undefined resolvedMode also falls back to Siege', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode={undefined} />);
    expect(container.textContent).toContain(GREENWARD_M10_ENDINGS.siege.title);
  });

  it('data-resolved-mode attribute reflects the resolved mode (for e2e selectors)', () => {
    const { container } = render(<GreenwardEndingPanel resolvedMode="mercy" />);
    const panel = container.querySelector('[data-testid="greenward-ending"]')!;
    expect(panel.getAttribute('data-resolved-mode')).toBe('mercy');
  });
});
