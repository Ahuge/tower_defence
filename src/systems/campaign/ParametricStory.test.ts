/**
 * ParametricStory resolver spec — both literal-string (v1) and
 * function (v2) forms must round-trip cleanly.
 */
import { describe, it, expect } from 'vitest';
import { ParametricStory } from './ParametricStory';
import type { MissionResult } from '../../data/campaigns/CampaignDef';

interface MechState { ore: number; ingots: number }

const NULL_RESULT: MissionResult | null = null;
const STATE: MechState = { ore: 47, ingots: 12 };

describe('ParametricStory.resolve', () => {
  it('passes through a literal string unchanged', () => {
    const out = ParametricStory.resolve('Hold the line.', { state: STATE, lastResult: NULL_RESULT });
    expect(out).toBe('Hold the line.');
  });

  it('invokes a function story with state', () => {
    const story = ({ state }: { state: MechState }) => `Ore reserve: ${state.ore}.`;
    const out = ParametricStory.resolve(story, { state: STATE, lastResult: NULL_RESULT });
    expect(out).toBe('Ore reserve: 47.');
  });

  it('passes lastResult through to function stories', () => {
    const story = ({ lastResult }: { lastResult: MissionResult | null }) =>
      lastResult?.won ? 'Victory.' : 'Hold.';
    const won: MissionResult = {
      won: true, wave: 15, durationMs: 600_000, livesRemaining: 20, livesStart: 20,
      goldRemaining: 200, goldEarned: 1500, towerCount: 12, perfectRun: true, custom: {},
    };
    expect(ParametricStory.resolve(story, { state: STATE, lastResult: won })).toBe('Victory.');
    expect(ParametricStory.resolve(story, { state: STATE, lastResult: null })).toBe('Hold.');
  });

  it('catches resolver throws and returns empty string', () => {
    const broken = (() => { throw new Error('boom'); }) as unknown as (ctx: unknown) => string;
    const out = ParametricStory.resolve(broken, { state: STATE, lastResult: NULL_RESULT });
    expect(out).toBe('');
  });
});
