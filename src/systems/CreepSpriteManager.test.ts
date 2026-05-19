/**
 * Smoke tests for the Snake Eyes bespoke-creep routing in
 * CreepSpriteManager. Pins:
 *
 *   1. void_collector has a column in SNAKE_EYES_CAMPAIGN_TO_COL
 *      so the M8 named-boss reads as The Collector rather than a
 *      generic void blob.
 *   2. Preloader registers the campaign sheet.
 *   3. The baked PNG is present on disk where the loader expects it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync('src/systems/CreepSpriteManager.ts', 'utf-8');

describe('CreepSpriteManager — Snake Eyes bespoke routing', () => {
  const block = SRC.match(/SNAKE_EYES_CAMPAIGN_TO_COL[^=]*=\s*\{([^}]+)\}/s)?.[1] ?? '';

  it('SNAKE_EYES_CAMPAIGN_TO_COL is declared', () => {
    expect(block.length).toBeGreaterThan(0);
  });

  it('void_collector maps to a column', () => {
    expect(block).toMatch(/void_collector:\s+\d+/);
  });

  it('void_collector column fits the 1-col sheet (must be 0)', () => {
    const m = block.match(/void_collector:\s+(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1], 10)).toBe(0);
  });

  it('preloader registers the campaign sheet', () => {
    expect(SRC).toMatch(/snake_eyes_creeps\.png/);
  });

  it('campaign sheet asset has been baked', () => {
    const assetPath = join('public', 'assets', 'creeps', 'snake_eyes_creeps.png');
    expect(
      existsSync(assetPath),
      `${assetPath} must exist — run scripts/render_snake_eyes_creep_sprites.ts`
    ).toBe(true);
  });
});
