/**
 * StarRating — small ★/☆ readout used by mission cards (campaign
 * lobby) and the post-mission GameOver result screen.
 *
 * Filled stars use --gold; empty use --text-dim. The component itself
 * is layout-agnostic: callers control margin / font-size / minWidth
 * via wrapping or by passing `style`.
 */
import type { JSX } from 'preact';

export function StarRating({
  stars,
  max = 3,
  className,
  style,
}: {
  stars: number;
  max?: number;
  className?: string;
  style?: JSX.CSSProperties;
}) {
  const clamped = Math.max(0, Math.min(max, stars));
  const filled = '★'.repeat(clamped);
  const empty = '☆'.repeat(max - clamped);
  const color = clamped >= 1 ? 'var(--gold)' : 'var(--text-dim)';
  return (
    <span class={className} style={{ color, ...style }}>
      {filled}{empty}
    </span>
  );
}
