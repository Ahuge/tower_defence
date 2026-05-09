/**
 * FactionEmblem smoke tests.
 *
 * Component renders the bespoke PNG by default with a procedural SVG
 * fallback when the image fails to load (or for chaos / random which
 * don't ship with bespoke art). These tests cover both branches.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { FactionEmblem } from './FactionEmblem';
import { FACTION_ORDER } from '../../data/Factions';

afterEach(() => cleanup());

describe('FactionEmblem — WebP-first render', () => {
  it('renders an <img> for real factions (WebP-backed)', () => {
    for (const id of FACTION_ORDER) {
      if (id === 'chaos' || id === 'random') continue;
      const { container } = render(<FactionEmblem faction={id} size={48} />);
      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img!.getAttribute('src')).toContain(`assets/${id}/${id}_emblem.webp`);
      cleanup();
    }
  });

  it('respects the size prop on the <img>', () => {
    const { container } = render(<FactionEmblem faction="arcane" size={120} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('120');
    expect(img.getAttribute('height')).toBe('120');
  });

  it('locked variant applies a CSS desaturation filter to the <img>', () => {
    const { container } = render(<FactionEmblem faction="harmonic" locked={true} />);
    const img = container.querySelector('img')!;
    const style = img.getAttribute('style') ?? '';
    expect(style).toContain('grayscale');
  });
});

describe('FactionEmblem — procedural SVG fallback', () => {
  it('chaos and random fall back to the procedural SVG (no bespoke art ships for them)', () => {
    for (const id of ['chaos', 'random'] as const) {
      const { container } = render(<FactionEmblem faction={id} size={48} />);
      // Meta entries skip the <img> path entirely → SVG renders.
      expect(container.querySelector('svg')).toBeTruthy();
      expect(container.querySelector('img')).toBeNull();
      cleanup();
    }
  });
});
