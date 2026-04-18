/**
 * Test-only ambient types.
 *
 * `@testing-library/jest-dom/vitest` extends Vitest's `Assertion` with
 * matchers like `toBeInTheDocument` / `toHaveTextContent`. This
 * triple-slash reference pulls those type augmentations in so specs
 * can use them without `@ts-ignore` comments.
 */
/// <reference types="@testing-library/jest-dom/vitest" />
/// <reference types="vitest/globals" />
