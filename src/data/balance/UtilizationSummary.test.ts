import { describe, it, expect } from 'vitest';
import { summarizeUtilization, formatUtilization } from './UtilizationSummary';

describe('summarizeUtilization', () => {
  it('returns zero report for empty input', () => {
    const r = summarizeUtilization([]);
    expect(r.totalMatches).toBe(0);
    expect(r.totalPlacements).toBe(0);
    expect(r.byId).toEqual([]);
    expect(r.flaggedLow).toEqual([]);
  });

  it('aggregates totals across matches', () => {
    const r = summarizeUtilization([
      { void_gambler: 10, void_spike: 2 },
      { void_gambler: 8, void_siphon: 3 },
      { void_gambler: 12 },
    ]);
    expect(r.totalMatches).toBe(3);
    expect(r.totalPlacements).toBe(35);
    const gambler = r.byId.find(s => s.id === 'void_gambler');
    expect(gambler).toBeDefined();
    expect(gambler!.totalPlacements).toBe(30);
    expect(gambler!.utilization).toBe(1.0);  // in all 3 matches
    expect(gambler!.avgPlacements).toBe(10);
    expect(gambler!.shareOfPlay).toBeCloseTo(30 / 35);
  });

  it('flags towers below threshold', () => {
    const r = summarizeUtilization([
      { void_gambler: 5, void_spike: 1 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
      { void_gambler: 5 },
    ], 0.10);
    // Spike appears in 1/10 = 10% — at the threshold; flagged_low is < threshold,
    // so 0.10 == 0.10 is NOT flagged. Spike at 0.10 isn't < 0.10.
    expect(r.flaggedLow).not.toContain('void_spike');
    // Now drop spike below threshold (0/10 wouldn't appear at all). Test
    // the "appears below threshold" case with a 5% utilization tower.
    const r2 = summarizeUtilization([
      ...Array.from({ length: 19 }, () => ({ void_gambler: 5 })),
      { void_gambler: 5, void_spike: 1 },  // spike in 1/20 = 5%
    ], 0.10);
    expect(r2.flaggedLow).toContain('void_spike');
  });

  it('shareOfPlay sums to 1.0 across all towers', () => {
    const r = summarizeUtilization([
      { a: 3, b: 7 },
      { a: 5, c: 5 },
    ]);
    const sum = r.byId.reduce((s, x) => s + x.shareOfPlay, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('sorts byId by shareOfPlay desc', () => {
    const r = summarizeUtilization([
      { a: 1, b: 10, c: 5 },
    ]);
    expect(r.byId.map(s => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('includes never-placed roster towers as zero entries when rosterIds provided', () => {
    const r = summarizeUtilization(
      [{ void_gambler: 5 }, { void_gambler: 5 }],
      0.10,
      ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion'],
    );
    expect(r.byId.length).toBe(5);  // all 5 roster towers represented
    const siphon = r.byId.find(s => s.id === 'void_siphon');
    expect(siphon).toBeDefined();
    expect(siphon!.utilization).toBe(0);
    expect(siphon!.totalPlacements).toBe(0);
    expect(siphon!.shareOfPlay).toBe(0);
    // Never-placed towers should be flagged.
    expect(r.flaggedLow).toContain('void_siphon');
    expect(r.flaggedLow).toContain('void_rift');
    expect(r.flaggedLow).toContain('void_oblivion');
  });

  it('formatUtilization produces non-empty multiline string', () => {
    const r = summarizeUtilization([
      { void_gambler: 10, void_spike: 2 },
    ]);
    const formatted = formatUtilization(r);
    expect(formatted).toContain('utilization');
    expect(formatted).toContain('void_gambler');
    expect(formatted.split('\n').length).toBeGreaterThan(3);
  });
});
