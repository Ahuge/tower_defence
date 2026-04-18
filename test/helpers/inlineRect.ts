/**
 * Read an element's positioned rect from its inline `style.left / top /
 * width / height`. jsdom has no layout engine so `getBoundingClientRect`
 * returns zeroes for elements without explicit dimensions — but our
 * tutorial overlay components compute positions in JS and apply them
 * via inline `style` props, so we can recover the intended rect by
 * parsing those styles back out.
 *
 * Fallback: if inline styles are missing, we fall through to
 * getBoundingClientRect.
 */
import type { Rect } from './rects';

function parsePx(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(-?\d+(\.\d+)?)(px)?$/);
  return m ? parseFloat(m[1]) : null;
}

/** Read the rect of an element that was positioned via inline styles
 *  (the pattern used across the tutorial overlay). */
export function inlineRect(el: HTMLElement): Rect {
  const left = parsePx(el.style.left);
  const top = parsePx(el.style.top);
  const width = parsePx(el.style.width) ?? el.offsetWidth ?? 0;
  const height = parsePx(el.style.height) ?? el.offsetHeight ?? 0;
  if (left !== null && top !== null) {
    return { x: left, y: top, width, height };
  }
  const bcr = el.getBoundingClientRect();
  return { x: bcr.left, y: bcr.top, width: bcr.width, height: bcr.height };
}
