/**
 * Smoke tests for the procedural FactionEmblem component. Confirms it
 * renders without crashing for every faction and applies the
 * locked-state silhouette correctly.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { FactionEmblem } from './FactionEmblem';
import { FACTION_ORDER } from '../../data/Factions';

afterEach(() => cleanup());

describe('FactionEmblem', () => {
  it('renders for every faction without crashing', () => {
    for (const id of FACTION_ORDER) {
      const { container } = render(<FactionEmblem faction={id} size={48} />);
      expect(container.querySelector('svg')).toBeTruthy();
      cleanup();
    }
  });

  it('respects size prop', () => {
    const { container } = render(<FactionEmblem faction="arcane" size={120} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('120');
    expect(svg.getAttribute('height')).toBe('120');
  });

  it('locked variant uses muted colors', () => {
    const { container } = render(<FactionEmblem faction="harmonic" locked={true} />);
    const html = container.innerHTML;
    // Locked palette uses #444 / #666 instead of vibrant Harmonic colors.
    expect(html).toContain('#444');
  });
});
