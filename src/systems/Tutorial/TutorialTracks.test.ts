/**
 * Content-level spec for TutorialTracks. These tests don't exercise
 * behaviour — they verify the structural invariants the rest of the
 * tutorial system assumes. Nearly every tutorial bug we've shipped
 * could have been caught here.
 */
import { describe, it, expect } from 'vitest';
import { getHelpMenuTracks, getTrack } from './TutorialTracks';

/** Track ids the manager assumes exist. If any of these ever stop
 *  being registered, TutorialManager calls for them silently no-op
 *  and the user sees nothing. */
const REQUIRED_TRACK_IDS = [
  'basics',
  'tutorial_match',
  'skip_hint',
  'income_standard',
  'income_battle',
  'income_hero',
  'multiplayer',
] as const;

/** Every playable faction needs an auto-primer track, keyed `faction:<id>`. */
const REQUIRED_FACTION_IDS = [
  'arcane', 'mechanical', 'nature', 'void', 'military', 'aliens',
  'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic', 'random',
] as const;

/** Every mode except `standard` (intentionally omitted — the basics tour
 *  already covers it) needs an auto-primer keyed `mode:<id>`. */
const REQUIRED_MODE_IDS = ['endless', 'battle', 'hero_defense', 'gauntlet'] as const;

describe('TutorialTracks registry', () => {
  const all = getHelpMenuTracks();

  it('has at least one track', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it('has unique track ids', () => {
    const ids = all.map(t => t.id);
    const seen = new Set<string>();
    for (const id of ids) {
      expect(seen.has(id), `duplicate track id: ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it.each(REQUIRED_TRACK_IDS)('registers the required track %s', (id) => {
    expect(getTrack(id), `missing required track: ${id}`).not.toBeNull();
  });

  it.each(REQUIRED_FACTION_IDS)('registers a faction primer for %s', (faction) => {
    const track = getTrack(`faction:${faction}`);
    expect(track, `missing faction:${faction}`).not.toBeNull();
  });

  it.each(REQUIRED_MODE_IDS)('registers a mode primer for %s', (mode) => {
    const track = getTrack(`mode:${mode}`);
    expect(track, `missing mode:${mode}`).not.toBeNull();
  });

  it('does NOT register a mode:standard primer (basics covers it)', () => {
    expect(getTrack('mode:standard')).toBeNull();
  });

  it('getTrack returns null for unknown ids', () => {
    expect(getTrack('definitely-not-a-real-track')).toBeNull();
    expect(getTrack('')).toBeNull();
  });
});

describe('TutorialTracks step invariants', () => {
  const all = getHelpMenuTracks();

  it('every track has at least one step', () => {
    for (const t of all) {
      expect(t.steps.length, `track ${t.id} has no steps`).toBeGreaterThan(0);
    }
  });

  it('every track has a non-empty name and summary', () => {
    for (const t of all) {
      expect(t.name, `track ${t.id} missing name`).toBeTruthy();
      expect(t.summary, `track ${t.id} missing summary`).toBeTruthy();
    }
  });

  it('every step has non-empty id / title / body', () => {
    for (const t of all) {
      for (const s of t.steps) {
        expect(s.id, `track ${t.id} step has no id`).toBeTruthy();
        expect(s.title, `track ${t.id} step ${s.id} has no title`).toBeTruthy();
        expect(s.body, `track ${t.id} step ${s.id} has no body`).toBeTruthy();
      }
    }
  });

  it('every step id is unique within its track', () => {
    for (const t of all) {
      const seen = new Set<string>();
      for (const s of t.steps) {
        expect(seen.has(s.id), `duplicate step id '${s.id}' in track ${t.id}`).toBe(false);
        seen.add(s.id);
      }
    }
  });

  it('every step target has a recognised kind', () => {
    const validKinds = new Set(['dom', 'canvas', 'canvas-dynamic', 'screen']);
    for (const t of all) {
      for (const s of t.steps) {
        expect(
          validKinds.has(s.target.kind),
          `track ${t.id} step ${s.id} has invalid target kind: ${s.target.kind}`,
        ).toBe(true);
      }
    }
  });

  it('DOM targets use the data-tutorial-target selector pattern', () => {
    // Catch regressions where someone hardcodes an ID/class selector that
    // silently breaks when the class name changes.
    for (const t of all) {
      for (const s of t.steps) {
        if (s.target.kind !== 'dom') continue;
        expect(
          s.target.selector.includes('data-tutorial-target') ||
            s.target.selector.includes('data-tutorial-tower-id'),
          `track ${t.id} step ${s.id} DOM target does not use a data-tutorial-* selector: ${s.target.selector}`,
        ).toBe(true);
      }
    }
  });

  it('canvas-dynamic targets have a callable compute function', () => {
    for (const t of all) {
      for (const s of t.steps) {
        if (s.target.kind !== 'canvas-dynamic') continue;
        expect(typeof s.target.compute, `track ${t.id} step ${s.id} compute is not a function`).toBe('function');
      }
    }
  });

  it('event-gated steps advanceOn a real GameEvents key', () => {
    const validEvents = new Set([
      'towerPlaced', 'towerSold',
      'creepKilled', 'creepReached',
      'waveStarted', 'waveCleared',
      'goldChanged', 'livesChanged',
      'gameOver', 'gameWon',
      'pathUpdated',
      'sendPurchased', 'frontierPurchased',
      'dockTowerSelected',
    ]);
    for (const t of all) {
      for (const s of t.steps) {
        if (!s.advanceOn || s.advanceOn === 'click') continue;
        expect(
          validEvents.has(s.advanceOn.event),
          `track ${t.id} step ${s.id} advanceOn unknown event: ${s.advanceOn.event}`,
        ).toBe(true);
      }
    }
  });

  it('CTA steps provide a label and a callable action', () => {
    for (const t of all) {
      for (const s of t.steps) {
        if (!s.cta) continue;
        expect(s.cta.label, `track ${t.id} step ${s.id} cta missing label`).toBeTruthy();
        expect(typeof s.cta.action, `track ${t.id} step ${s.id} cta action not a function`).toBe('function');
      }
    }
  });
});

describe('Tutorial match specifics', () => {
  const match = getTrack('tutorial_match')!;

  it('is marked scrimless', () => {
    // If this flips off by accident, the whole match overlay dims the
    // gameplay and the player can't see their own towers / creeps.
    expect(match.scrimless).toBe(true);
  });

  it('overrides the skip label to Quit', () => {
    expect(match.skipLabel).toBe('Quit');
  });

  it('terminates with a CTA step', () => {
    const last = match.steps[match.steps.length - 1];
    expect(last.cta).toBeDefined();
  });
});

describe('skip_hint specifics', () => {
  const hint = getTrack('skip_hint')!;

  it('is a single-step track', () => {
    expect(hint.steps.length).toBe(1);
  });

  it('targets the ? help button', () => {
    const step = hint.steps[0];
    expect(step.target.kind).toBe('dom');
    if (step.target.kind === 'dom') {
      expect(step.target.selector).toContain('tutorials-help-btn');
    }
  });
});
