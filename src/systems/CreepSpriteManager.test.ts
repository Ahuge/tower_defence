/**
 * Smoke tests for the CreepSpriteManager bespoke-art routing.
 *
 * Pins (per campaign):
 *   - The campaign's id → column map is declared.
 *   - Every campaign creep id has an entry (no fall-back to col 0).
 *   - Columns are distinct within a campaign (no silhouette collisions).
 *   - Columns fit the campaign sheet's width.
 *   - Preloader registers the sheet + the baked PNG is on disk.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync('src/systems/CreepSpriteManager.ts', 'utf-8');

describe('CreepSpriteManager — Greenward bespoke routing', () => {
  const INHERITOR_IDS = [
    'inheritor_road_walker', 'inheritor_den_walker', 'inheritor_messenger',
    'inheritor_river_crawler', 'inheritor_civilian', 'inheritor_wedding_stone',
    'inheritor_old_woman', 'inheritor_cethric', 'inheritor_stone_bride',
    'inheritor_child', 'inheritor_knight', 'inheritor_herald',
  ] as const;

  const block = SRC.match(/GREENWARD_CAMPAIGN_TO_COL[^=]*=\s*\{([^}]+)\}/s)?.[1] ?? '';

  it('GREENWARD_CAMPAIGN_TO_COL is declared', () => {
    expect(block.length, 'map declaration must exist').toBeGreaterThan(0);
  });

  it('every inheritor_* creep id has a column', () => {
    for (const id of INHERITOR_IDS) {
      expect(block, `${id} should appear in GREENWARD_CAMPAIGN_TO_COL`).toMatch(
        new RegExp(`${id}:\\s+\\d+`)
      );
    }
  });

  it('all 12 inheritor columns are distinct (no silhouette collisions)', () => {
    const cols = new Set<string>();
    for (const id of INHERITOR_IDS) {
      const m = block.match(new RegExp(`${id}:\\s+(\\d+)`));
      expect(m, `${id} should be mapped`).not.toBeNull();
      cols.add(m![1]);
    }
    expect(cols.size, '12 ids → 12 distinct columns').toBe(12);
  });

  it('all columns fit the 12-col sheet (0..11)', () => {
    for (const id of INHERITOR_IDS) {
      const m = block.match(new RegExp(`${id}:\\s+(\\d+)`));
      const col = parseInt(m![1], 10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThanOrEqual(11);
    }
  });

  it('preloader registers the campaign sheet', () => {
    expect(SRC).toMatch(/greenward_campaign_creeps\.png/);
  });

  it('campaign sheet asset has been baked', () => {
    const assetPath = join('public', 'assets', 'creeps', 'greenward_campaign_creeps.png');
    expect(
      existsSync(assetPath),
      `${assetPath} must exist — run scripts/render_greenward_campaign_creeps.ts`,
    ).toBe(true);
  });
});

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
      `${assetPath} must exist — run scripts/render_snake_eyes_creep_sprites.ts`,
    ).toBe(true);
  });
});
