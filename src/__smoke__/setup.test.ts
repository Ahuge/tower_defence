/**
 * Smoke test for the Vitest harness. Proves the runner loads,
 * jsdom is attached, @testing-library/jest-dom matchers register,
 * and localStorage is isolated per test via the setup hook.
 *
 * Intentionally trivial — if this ever fails the whole test suite
 * is broken.
 */
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs synchronous assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('has jsdom globals', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
    expect(localStorage).toBeDefined();
  });

  it('has jest-dom matchers registered', () => {
    const el = document.createElement('div');
    el.textContent = 'hi';
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('hi');
  });

  it('clears localStorage between tests (part 1)', () => {
    localStorage.setItem('leak', 'should-not-survive');
    expect(localStorage.getItem('leak')).toBe('should-not-survive');
  });

  it('clears localStorage between tests (part 2)', () => {
    // The setup hook should have wiped 'leak' from the previous test.
    expect(localStorage.getItem('leak')).toBeNull();
  });
});
