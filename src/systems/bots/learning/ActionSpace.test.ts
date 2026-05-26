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
  SPATIAL_LOGIT_LEN,
  decodeAction,
  encodeAction,
  legalMask,
  packSpatialLogits,
  sampleAction,
  unpackSpatialLogits,
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

  it('recorded mask byte-equals recomputed mask at the same state', () => {
    // Mask consistency guard — the policy is trained on the mask
    // recorded at decision time. If the runtime mask drifts from
    // the training-time mask, the policy can sample illegal actions
    // at inference. This test asserts the same legalMask() call
    // produces byte-equal results when called twice on the same
    // state.
    const match = new Match(cfg('arcane'));
    const a = legalMask(match.observe());
    const b = legalMask(match.observe());
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i], `mask drift at index ${i}`).toBe(b[i]);
    }
  });

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

describe('Spatial pack/unpack', () => {
  it('packSpatialLogits is exact identity over the spatial region', () => {
    // Use values that round-trip exactly through Float32 storage so
    // strict equality works.
    const spatial = new Float32Array(SPATIAL_LOGIT_LEN);
    for (let i = 0; i < spatial.length; i++) spatial[i] = (i % 256) / 64;  // small, Float32-clean
    const skip = 0.5;  // Float32-exact
    const flat = packSpatialLogits(spatial, skip);
    expect(flat.length).toBe(ACTION_SPACE_SIZE);
    for (let i = 0; i < SPATIAL_LOGIT_LEN; i++) {
      expect(flat[i]).toBe(spatial[i]);
    }
    expect(flat[SKIP_INDEX]).toBe(skip);
  });

  it('unpackSpatialLogits inverts packSpatialLogits', () => {
    const spatial = new Float32Array(SPATIAL_LOGIT_LEN);
    for (let i = 0; i < spatial.length; i++) spatial[i] = Math.sin(i);  // Float32-stored, byte-exact roundtrip
    const skip = -1.25;  // Float32-exact (-10/8)
    const flat = packSpatialLogits(spatial, skip);
    const round = unpackSpatialLogits(flat);
    expect(round.spatial.length).toBe(spatial.length);
    for (let i = 0; i < spatial.length; i++) expect(round.spatial[i]).toBe(spatial[i]);
    expect(round.skipLogit).toBe(skip);
  });

  it('throws on mismatched length inputs', () => {
    expect(() => packSpatialLogits(new Float32Array(100), 0)).toThrow();
    expect(() => unpackSpatialLogits(new Float32Array(100))).toThrow();
  });
});

describe('sampleAction', () => {
  function uniformLogits(): Float32Array {
    return new Float32Array(ACTION_SPACE_SIZE);  // all zeros → uniform after mask
  }
  function maskOnly(indices: number[]): Uint8Array {
    const m = new Uint8Array(ACTION_SPACE_SIZE);
    for (const i of indices) m[i] = 1;
    return m;
  }

  it('argmax (T=0) picks the max-logit among legal actions', () => {
    const logits = uniformLogits();
    logits[100] = 5.0;
    logits[200] = 10.0;  // would win without mask
    const mask = maskOnly([100, 300, SKIP_INDEX]);  // 200 masked off
    expect(sampleAction(logits, mask, 0)).toBe(100);
  });

  it('argmax falls back to SKIP_INDEX when all-masked', () => {
    const logits = uniformLogits();
    const mask = new Uint8Array(ACTION_SPACE_SIZE);  // all 0
    expect(sampleAction(logits, mask, 0)).toBe(SKIP_INDEX);
  });

  it('temperature sampling never returns a masked-off index', () => {
    const logits = uniformLogits();
    const legal = [5, 17, 42, 100, 936, SKIP_INDEX];
    const mask = maskOnly(legal);
    let rngCount = 0;
    const rng = () => { rngCount++; return ((rngCount * 0.31) % 1); };
    for (let i = 0; i < 200; i++) {
      const idx = sampleAction(logits, mask, 1.0, rng);
      expect(legal).toContain(idx);
    }
  });

  it('throws on length mismatch', () => {
    expect(() => sampleAction(new Float32Array(100), new Uint8Array(ACTION_SPACE_SIZE), 1.0)).toThrow();
    expect(() => sampleAction(new Float32Array(ACTION_SPACE_SIZE), new Uint8Array(100), 1.0)).toThrow();
  });
});
