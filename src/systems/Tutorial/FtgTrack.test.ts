import { describe, it, expect } from 'vitest';
import { getTrack, getHelpMenuTracks } from './TutorialTracks';

describe('FTG track (Plan 3)', () => {
  it('is registered under id "ftg"', () => {
    const track = getTrack('ftg');
    expect(track).not.toBeNull();
  });

  it('has scrimless: true and Quit skip label (in-game UX)', () => {
    const track = getTrack('ftg')!;
    expect(track.scrimless).toBe(true);
    expect(track.skipLabel).toBe('Quit');
  });

  it('teaches mazing + towers ONLY — no economy/sends/frontier steps', () => {
    const track = getTrack('ftg')!;
    const stepIds = track.steps.map(s => s.id);
    // Spec: no income lesson in FTG (deferred to Plan 4).
    expect(stepIds).not.toContain('income_bonus');
    expect(stepIds).not.toContain('buy_send');
    expect(stepIds).not.toContain('buy_frontier');
    expect(stepIds).not.toContain('frontier_intro');
    expect(stepIds).not.toContain('leyline_nexus_intro');
  });

  it('has the 8 expected scripted beats', () => {
    const track = getTrack('ftg')!;
    expect(track.steps.length).toBeGreaterThanOrEqual(8);
    const stepIds = track.steps.map(s => s.id);
    for (const id of ['welcome', 'pick_bolt', 'place_first', 'mazing', 'pick_bolt_2', 'place_second', 'start_wave_1', 'done']) {
      expect(stepIds).toContain(id);
    }
  });

  it('appears in the help menu list', () => {
    const all = getHelpMenuTracks();
    expect(all.find(t => t.id === 'ftg')).toBeTruthy();
  });
});
