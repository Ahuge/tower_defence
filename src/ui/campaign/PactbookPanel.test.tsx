/**
 * Smoke tests for PactbookPanel — lifecycle + accessibility contracts.
 * Component now uses preact hooks (useRef / useEffect / useCallback)
 * for keyboard handling, so tests must run through @testing-library/preact's
 * render() rather than calling the function directly.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
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

describe('PactbookPanel — information design', () => {
  it('renders Divergence delta + paydown preview on each card', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]); // tier-1 only
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const text = container.textContent ?? '';
    // Tier 1 → +1 DIV, paydown 100 + 50 = 150g (PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE*1)
    expect(text).toContain('+1 DIV');
    expect(text).toContain('≈ −150g');
  });

  it('paydown preview scales with tier', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [0, 0, 1]); // tier-3 only
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const text = container.textContent ?? '';
    // Tier 3 → +3 DIV, paydown 100 + 150 = 250g
    expect(text).toContain('+3 DIV');
    expect(text).toContain('≈ −250g');
  });

  it("aria-label spells out the divergence + paydown for screen readers", () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const card = container.querySelector('.snake-eyes-wager-card');
    const label = card?.getAttribute('aria-label') ?? '';
    expect(label).toContain('1 Divergence');
    expect(label).toContain('150 gold');
  });
});

describe('PactbookPanel — keyboard shortcuts', () => {
  // Accept-path now runs a 500ms acknowledgment pulse before onResolved
  // fires. Use fake timers to advance through the pulse synchronously.
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('"1" key fires onResolved with the first card after the pulse', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(result).toBeNull(); // mid-pulse, not yet fired
    act(() => { vi.advanceTimersByTime(500); });
    expect(result).toMatchObject({ kind: 'accepted' });
  });

  it('"2" picks the second card after the pulse', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    type Captured = { kind: string; wager?: { id: string } };
    let result: Captured | null = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => { result = r as Captured; }} />);
    const second = pb.getDrawn()[1];
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    act(() => { vi.advanceTimersByTime(500); });
    const r = result as Captured | null;
    expect(r?.kind).toBe('accepted');
    expect(r?.wager?.id).toBe(second.id);
  });

  it('"D" key declines all (no pulse on decline path)', () => {
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

  it('mid-acknowledgment key presses are ignored (cannot re-pick)', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    let calls = 0;
    render(<PactbookPanel pactbook={pb} onResolved={() => calls++} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    // Mid-pulse — second press should be ignored.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(calls).toBe(1); // only the first accept fires
  });

  it('a digit beyond the drawn count is a no-op', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(1, [1, 0, 0]); // single card draw (Debt-pressure scenario)
    let result: unknown = null;
    render(<PactbookPanel pactbook={pb} onResolved={r => (result = r)} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(result).toBeNull();
    // The "1" still works (after the pulse).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result).toMatchObject({ kind: 'accepted' });
  });
});

describe('PactbookPanel — motion polish', () => {
  it('cards mount with the is-dealing-in CSS class for the stagger animation', () => {
    const pb = new Pactbook({ rng: () => 0.5 });
    pb.draw(3, [1, 0, 0]);
    const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
    const cards = container.querySelectorAll('.snake-eyes-wager-card');
    cards.forEach((c, i) => {
      expect(c.className).toContain('is-dealing-in');
      expect(c.className).toContain(`deal-${i}`);
    });
  });

  it('selected card gets is-acknowledging class during the pulse', () => {
    vi.useFakeTimers();
    try {
      const pb = new Pactbook({ rng: () => 0.5 });
      pb.draw(3, [1, 0, 0]);
      const { container } = render(<PactbookPanel pactbook={pb} onResolved={() => {}} />);
      // Wrap dispatch in act() so preact's setState updates flush
      // synchronously before we querySelector.
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
      });
      const cards = container.querySelectorAll('.snake-eyes-wager-card');
      expect(cards[1].className).toContain('is-acknowledging');
      expect(cards[0].className).not.toContain('is-acknowledging');
      expect(cards[2].className).not.toContain('is-acknowledging');
    } finally {
      vi.useRealTimers();
    }
  });
});
