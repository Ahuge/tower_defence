/**
 * Global test setup — runs once per worker before any spec file.
 * Anything here is shared across every test.
 */
import '@testing-library/jest-dom/vitest';
import { beforeEach, afterEach } from 'vitest';

/** Clear localStorage before each test so persistence specs don't leak
 *  state into one another. Cheap and the behaviour of localStorage in
 *  jsdom is per-test-file (shared within a file), so this is what
 *  keeps spec isolation reliable. */
beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
  try { sessionStorage.clear(); } catch { /* noop */ }
});

/** Clean up any DOM that individual tests attached to `document.body`.
 *  @testing-library's render() cleans up its own roots, but tests that
 *  manually portal into body need a reset. */
afterEach(() => {
  document.body.innerHTML = '';
});
