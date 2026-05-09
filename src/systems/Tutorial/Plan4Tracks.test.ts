/**
 * Smoke tests for Plan 4 content additions: economy + vs-CPU
 * tutorials, JIT lessons, and the expanded faction-brief shape.
 *
 * Goal: catch regressions where a track gets accidentally renamed,
 * unregistered, or mis-shaped without writing big integration tests
 * for each step.
 */
import { describe, it, expect } from 'vitest';
import { getTrack, getHelpMenuTracks } from './TutorialTracks';

const FACTIONS = [
  'arcane', 'mechanical', 'nature', 'void',
  'military', 'aliens', 'cypherpunk', 'infernal',
  'celestial', 'psionic', 'harmonic', 'chaos',
];

describe('Plan 4 — Tutorial 2 (Economy)', () => {
  it('tutorial_economy is registered', () => {
    expect(getTrack('tutorial_economy')).not.toBeNull();
  });

  it('teaches all three income sources (kill, frontier, sends)', () => {
    const t = getTrack('tutorial_economy')!;
    const ids = t.steps.map(s => s.id);
    expect(ids).toContain('kill_gold');
    expect(ids).toContain('buy_frontier');
    expect(ids).toContain('buy_send');
  });

  it('uses the in-game scrimless overlay so the player can watch waves', () => {
    expect(getTrack('tutorial_economy')!.scrimless).toBe(true);
  });
});

describe('Plan 4 — Tutorial 3 (vs CPU)', () => {
  it('tutorial_vs_cpu is registered', () => {
    expect(getTrack('tutorial_vs_cpu')).not.toBeNull();
  });

  it('covers sends-go-to-opponent + opponent minimap + ready vote', () => {
    const t = getTrack('tutorial_vs_cpu')!;
    const ids = t.steps.map(s => s.id);
    expect(ids).toContain('sends_explainer');
    expect(ids).toContain('opponent_minimap');
    expect(ids).toContain('ready_vote');
  });
});

describe('Plan 4 — JIT lessons', () => {
  it('all five JIT tracks are registered', () => {
    for (const c of ['flying', 'regen', 'mage', 'boss', 'leak']) {
      expect(getTrack(`jit_${c}`)).not.toBeNull();
    }
  });

  it('JIT tracks are scrimless single-step popovers', () => {
    for (const c of ['flying', 'regen', 'mage', 'boss', 'leak']) {
      const t = getTrack(`jit_${c}`)!;
      expect(t.scrimless).toBe(true);
      expect(t.steps.length).toBe(1);
    }
  });
});

describe('Plan 4 — Faction briefs (5-line expansion)', () => {
  it('every faction has a registered brief', () => {
    for (const f of FACTIONS) {
      expect(getTrack(`faction:${f}`)).not.toBeNull();
    }
  });

  it('every brief has the 5 expected step ids', () => {
    for (const f of FACTIONS) {
      const t = getTrack(`faction:${f}`)!;
      const ids = t.steps.map(s => s.id);
      expect(ids).toEqual(['identity', 'opener', 'key_tower', 'key_trap', 'win_con']);
    }
  });
});

describe('Plan 4 — Help carousel registry', () => {
  it('FTG / economy / vs-CPU all surface in the help-menu list', () => {
    const all = getHelpMenuTracks();
    const ids = all.map(t => t.id);
    expect(ids).toContain('ftg');
    expect(ids).toContain('tutorial_economy');
    expect(ids).toContain('tutorial_vs_cpu');
  });
});
