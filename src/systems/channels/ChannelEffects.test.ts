/**
 * ChannelEffects spec — registry behavior + the two built-in effects
 * (clear_towers_radius, buff_next_wave_hp) that ship with M1/M2.
 *
 * Built-in effects are auto-registered by importing the module
 * (side-effect). Tests preserve that registration by NOT calling
 * __reset() at the top — only ad-hoc registrations are reset between
 * cases via per-test closures.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelEffects } from './ChannelEffects';

beforeEach(() => {
  // Re-import semantics not available without a fresh module cache;
  // the built-ins remain registered across tests, which is what we
  // want — the tests verify they fire correctly.
});

describe('ChannelEffects registry', () => {
  it('dispatch does nothing when the effect id is unknown', () => {
    expect(() => ChannelEffects.dispatch('does_not_exist', {
      scene: {} as any, caster: {}, meta: {},
    })).not.toThrow();
  });

  it('dispatch catches throws from effects', () => {
    ChannelEffects.register('always_throws', () => { throw new Error('boom'); });
    expect(() => ChannelEffects.dispatch('always_throws', {
      scene: {} as any, caster: {}, meta: {},
    })).not.toThrow();
  });

  it('has() reflects registration state', () => {
    expect(ChannelEffects.has('clear_towers_radius')).toBe(true);
    expect(ChannelEffects.has('buff_next_wave_hp')).toBe(true);
  });
});

describe('ChannelEffects built-in: clear_towers_radius', () => {
  it('marks towers within radius as expired', () => {
    const towers = [
      { x: 0, y: 0, _expired: false },
      { x: 50, y: 0, _expired: false },     // ~50 from caster — inside default 84 radius
      { x: 200, y: 0, _expired: false },    // far — outside
      { x: 70, y: 30, _expired: false },    // ~76 — inside
    ];
    const scene = { towers, add: { graphics: () => null }, tweens: { add: () => {} } };
    const caster = { x: 0, y: 0 };
    ChannelEffects.dispatch('clear_towers_radius', {
      scene: scene as any, caster, meta: {},
    });
    expect(towers[0]._expired).toBe(true);
    expect(towers[1]._expired).toBe(true);
    expect(towers[2]._expired).toBe(false);
    expect(towers[3]._expired).toBe(true);
  });

  it('respects a custom radius from meta', () => {
    const towers = [
      { x: 100, y: 0, _expired: false },
      { x: 200, y: 0, _expired: false },
    ];
    const scene = { towers, add: { graphics: () => null }, tweens: { add: () => {} } };
    ChannelEffects.dispatch('clear_towers_radius', {
      scene: scene as any, caster: { x: 0, y: 0 }, meta: { radius: 150 },
    });
    expect(towers[0]._expired).toBe(true);
    expect(towers[1]._expired).toBe(false);
  });

  it('skips already-expired towers (no double-mark)', () => {
    const towers = [{ x: 0, y: 0, _expired: true }];
    const scene = { towers, add: { graphics: () => null }, tweens: { add: () => {} } };
    ChannelEffects.dispatch('clear_towers_radius', {
      scene: scene as any, caster: { x: 0, y: 0 }, meta: {},
    });
    expect(towers[0]._expired).toBe(true); // unchanged, no throw
  });

  it('handles missing towers array gracefully', () => {
    const scene = { add: { graphics: () => null }, tweens: { add: () => {} } };
    expect(() => ChannelEffects.dispatch('clear_towers_radius', {
      scene: scene as any, caster: { x: 0, y: 0 }, meta: {},
    })).not.toThrow();
  });
});

describe('ChannelEffects built-in: buff_next_wave_hp', () => {
  it('increments _channelHpBuff on the scene', () => {
    const scene: { _channelHpBuff?: number } = {};
    ChannelEffects.dispatch('buff_next_wave_hp', {
      scene: scene as any, caster: {}, meta: {},
    });
    expect(scene._channelHpBuff).toBeCloseTo(0.30);
  });

  it('stacks cumulatively across multiple completions', () => {
    const scene: { _channelHpBuff?: number } = {};
    ChannelEffects.dispatch('buff_next_wave_hp', { scene: scene as any, caster: {}, meta: {} });
    ChannelEffects.dispatch('buff_next_wave_hp', { scene: scene as any, caster: {}, meta: {} });
    ChannelEffects.dispatch('buff_next_wave_hp', { scene: scene as any, caster: {}, meta: {} });
    expect(scene._channelHpBuff).toBeCloseTo(0.90);
  });

  it('respects a custom percent from meta', () => {
    const scene: { _channelHpBuff?: number } = {};
    ChannelEffects.dispatch('buff_next_wave_hp', {
      scene: scene as any, caster: {}, meta: { percent: 0.10 },
    });
    expect(scene._channelHpBuff).toBeCloseTo(0.10);
  });
});
