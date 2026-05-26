/**
 * ActionSpace — round-trip, sizing, and mask invariants.
 *
 * Coverage: encode/decode symmetry, action-space size matches the
 * spec, skip is always legal, mask shape matches ACTION_SPACE_SIZE,
 * legalMask never returns all-false during a full match smoke run.
 */
import { describe, it, expect } from 'vitest';
import { Match } from '../../../headless/Match';
import { MatchConfig } from '../../../headless/types';
import {
  ACTION_SPACE_SIZE,
  ActionSpaceDecision,
  PLACE_BASE,
  UPGRADE_BASE,
  SELL_BASE,
  SKIP_INDEX,
  decodeAction,
  encodeAction,
  legalMask,
} from './ActionSpace';
import { NUM_TOWER_SLOTS, getFactionTowerIds } from './FactionVocab';

const FACTIONS = ['arcane', 'mechanical'] as const;

function cfg(faction: typeof FACTIONS[number], seed = 1001): MatchConfig {
  return {
    faction,
    difficulty: 'normal',
    mapId: 'plains',
    brainId: 'balanced',
    matchMode: 'standard',
    waveCount: 5,
    seed,
  };
}

describe('ActionSpace sizing', () => {
  it('ACTION_SPACE_SIZE matches the spec (9361)', () => {
    expect(ACTION_SPACE_SIZE).toBe(9361);
  });

  it('region bases are contiguous and correct', () => {
    expect(PLACE_BASE).toBe(0);
    expect(UPGRADE_BASE).toBe(7488);
    expect(SELL_BASE).toBe(8424);
    expect(SKIP_INDEX).toBe(9360);
  });
});

describe('ActionSpace round-trip', () => {
  for (const faction of FACTIONS) {
    it(`${faction}: encode→decode→encode is identity for every legal place index`, () => {
      const towerCount = getFactionTowerIds(faction).length;
      // Only iterate slots that this faction actually has — the
      // others throw on decode by design (mask would gate them in
      // production).
      for (let slot = 0; slot < towerCount; slot++) {
        for (let cell = 0; cell < 936; cell++) {
          const idx = slot * 936 + cell;
          const d = decodeAction(idx, faction);
          expect(d.kind).toBe('place');
          const back = encodeAction(d, faction);
          expect(back).toBe(idx);
        }
      }
    });

    it(`${faction}: upgrade region round-trips`, () => {
      for (let cell = 0; cell < 936; cell++) {
        const idx = UPGRADE_BASE + cell;
        const d = decodeAction(idx, faction);
        expect(d.kind).toBe('upgrade');
        expect(encodeAction(d, faction)).toBe(idx);
      }
    });

    it(`${faction}: sell region round-trips`, () => {
      for (let cell = 0; cell < 936; cell++) {
        const idx = SELL_BASE + cell;
        const d = decodeAction(idx, faction);
        expect(d.kind).toBe('sell');
        expect(encodeAction(d, faction)).toBe(idx);
      }
    });

    it(`${faction}: skip round-trips`, () => {
      const d = decodeAction(SKIP_INDEX, faction);
      expect(d.kind).toBe('skip');
      expect(encodeAction(d, faction)).toBe(SKIP_INDEX);
    });
  }

  it('throws on out-of-range index', () => {
    expect(() => decodeAction(-1, 'arcane')).toThrow();
    expect(() => decodeAction(ACTION_SPACE_SIZE, 'arcane')).toThrow();
  });

  it('encode of a tower not in faction throws', () => {
    const d: ActionSpaceDecision = { kind: 'place', col: 0, row: 0, towerId: 'mech_titan' };
    expect(() => encodeAction(d, 'arcane')).toThrow();
  });

  it('decode of empty-slot place for a short-pool faction throws', () => {
    // Arcane has 7 towers; slot 7 is unreachable for it.
    expect(() => decodeAction(7 * 936, 'arcane')).toThrow();
  });
});

describe('ActionSpace.legalMask', () => {
  for (const faction of FACTIONS) {
    it(`${faction}: skip is always legal, mask length matches`, () => {
      const match = new Match(cfg(faction));
      const ctx = match.observe();
      const mask = legalMask(ctx);
      expect(mask.length).toBe(ACTION_SPACE_SIZE);
      expect(mask[SKIP_INDEX]).toBe(1);
    });

    it(`${faction}: mask never goes all-false during a full match smoke`, async () => {
      const match = new Match(cfg(faction, 2001));
      let stepsChecked = 0;
      // Check mask before any step (initial state should be
      // between-waves with placeable towers).
      let mask = legalMask(match.observe());
      let anyLegal = mask.some(b => b !== 0);
      expect(anyLegal, 'initial state').toBe(true);

      while (!match.isDone() && stepsChecked < 200) {
        match.step();
        if (match.isDone()) break;
        mask = legalMask(match.observe());
        anyLegal = mask.some(b => b !== 0);
        expect(anyLegal, `step ${stepsChecked}`).toBe(true);
        stepsChecked++;
      }
      expect(stepsChecked).toBeGreaterThan(0);
    });

    it(`${faction}: place mask is only set between waves`, () => {
      const match = new Match(cfg(faction));
      // Initial state is between-waves.
      let ctx = match.observe();
      let mask = legalMask(ctx);
      const placeBetween = (() => {
        for (let i = PLACE_BASE; i < UPGRADE_BASE; i++) if (mask[i]) return true;
        return false;
      })();
      expect(placeBetween, 'between-waves should allow place').toBe(true);

      // Step until we're in-wave (BalancedBrain skips after spending,
      // wave fires immediately). Hard-fail if we can't get there
      // quickly — a silent skip would mask a real regression.
      let safety = 200;
      while (match.observe().betweenWaves && !match.isDone() && safety > 0) {
        match.step();
        safety--;
      }
      expect(match.isDone(), 'match should not finish before reaching in-wave').toBe(false);
      expect(match.observe().betweenWaves, 'should reach in-wave state').toBe(false);

      ctx = match.observe();
      mask = legalMask(ctx);
      let placeIn = false;
      for (let i = PLACE_BASE; i < UPGRADE_BASE; i++) if (mask[i]) { placeIn = true; break; }
      expect(placeIn, 'in-wave should not allow place').toBe(false);
    });
  }

  it('place mask reflects exactly the candidate cells for slot 0', () => {
    const match = new Match(cfg('arcane'));
    const ctx = match.observe();
    const mask = legalMask(ctx);
    // Build the cell set from candidateCells.
    const allowedCells = new Set(ctx.candidateCells.map(c => c.row * 36 + c.col));
    // Affordable? Slot 0 is the cheapest Arcane tower; starting
    // gold (100) should always be enough.
    const slot0Base = PLACE_BASE + 0 * 936;
    for (let cell = 0; cell < 936; cell++) {
      const want = allowedCells.has(cell) ? 1 : 0;
      expect(mask[slot0Base + cell], `cell ${cell}`).toBe(want);
    }
  });
});
