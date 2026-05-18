/**
 * Smoke tests for PactbookPanel — lifecycle + accessibility contracts.
 * Component now uses preact hooks (useRef / useEffect / useCallback)
 * for keyboard handling, so tests must run through @testing-library/preact's
 * render() rather than calling the function directly.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { PactbookPanel } from './PactbookPanel';
import { Pactbook } from '../../systems/voidc/Pactbook';
import { registerTier1WagerEffects } from '../../systems/voidc/wagers/tier1';
import { _resetWagerEffectsForTest } from '../../systems/voidc/WagerEffects';

beforeEach(() => {
  _resetWagerEffectsForTest();
  registerTier1WagerEffects();
});

afterEach(() => cleanup());

describe('PactbookPanel — lifecycle contract', () => {
  it('renders null when no cards drawn', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders null after a Wager has been accepted', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    pb.accept(pb.getDrawn()[0].id);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders null after declineAll', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    pb.declineAll();
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the dialog when cards drawn + unresolved', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('PactbookPanel — accessibility', () => {
  it('renders one button per drawn Wager', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const cards = container.querySelectorAll('.snake-eyes-wager-card');
    expect(cards.length).toBe(3);
  });

  it('each card has an aria-label composing tier + name + summary', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]); // tier 1 only
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const cards = container.querySelectorAll('.snake-eyes-wager-card');
    cards.forEach((c, i) => {
      const label = c.getAttribute('aria-label') ?? '';
      expect(label).toContain('Tier 1');
      expect(label).toContain(`Press ${i + 1}`);
    });
  });

  it('each card has aria-keyshortcuts pointing at the digit key', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const cards = container.querySelectorAll('.snake-eyes-wager-card');
    expect(cards[0].getAttribute('aria-keyshortcuts')).toBe('1');
    expect(cards[1].getAttribute('aria-keyshortcuts')).toBe('2');
    expect(cards[2].getAttribute('aria-keyshortcuts')).toBe('3');
  });

  it('decline button has a screen-reader-friendly aria-label', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const decline = container.querySelector('.snake-eyes-decline-btn');
    expect(decline).not.toBeNull();
    const label = decline?.getAttribute('aria-label') ?? '';
    expect(label).toContain('20 gold');
    expect(label.toLowerCase()).toContain('decline');
  });

  it('dialog has aria-label', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toContain('Pactbook');
  });
});

describe('PactbookPanel — keyboard shortcuts', () => {
  it('"1" key fires onResolved with the first card', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(result).toMatchObject({ kind: 'accepted' });
  });

  it('"2" picks the second card', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    type Captured = { kind: string; wager?: { id: string } };
    let result: Captured | null = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => { result = r as Captured; }} />);
    const second = pb.getDrawn()[1];
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    const r = result as Captured | null;
    expect(r?.kind).toBe('accepted');
    expect(r?.wager?.id).toBe(second.id);
  });

  it('"D" key declines all', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(result).toMatchObject({ kind: 'declined' });
  });

  it('Escape declines all', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(result).toMatchObject({ kind: 'declined' });
  });

  it('keyboard events are ignored once resolved', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    pb.accept(pb.getDrawn()[0].id);
    let calls = 0;
    render(<PactbookPanel pactbook={pb} onResolved={() => calls++} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(calls).toBe(0);
  });

  it('a digit beyond the drawn count is a no-op', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(1, [1, 0, 0]); // single card draw (Debt-pressure scenario)
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(result).toBeNull();
    // The "1" still works.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(result).toMatchObject({ kind: 'accepted' });
  });
});
