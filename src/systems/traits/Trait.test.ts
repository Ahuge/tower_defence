/**
 * Tests for the v2 Tower-side trait pipeline extensions:
 * damage veto, damage modifier, onTakeDamage, onKill, onSpawn,
 * onDespawn, overlayDraw.
 *
 * These resolvers are consumed by Tower.takeDamage and Tower.drawTower
 * (commit 3+ in the refactor). Existing hit-side resolvers
 * (delivery / damageModifier / fireRate / etc.) are unchanged and
 * already exercised by existing tests indirectly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerDamageVeto,
  registerDamageModifier,
  registerOnTakeDamage,
  registerOnKill,
  registerOnSpawn,
  registerOnDespawn,
  registerOverlayDraw,
  resolveDamageVeto,
  resolveTowerDamageModifiers,
  resolveOnTakeDamage,
  resolveOnKill,
  resolveOnSpawn,
  resolveOnDespawn,
  resolveOverlayDraw,
  type Trait,
} from './Trait';

// The trait registries are module-level singletons — re-registering
// over the same id replaces the handler, so each test uses a unique
// prefix to avoid bleeding across describes.

describe('Trait pipeline v2 — damage veto', () => {
  it('returns false when no trait registers a veto', () => {
    const traits: Trait[] = [{ id: 'veto_test_none' }];
    expect(resolveDamageVeto(traits, 100, 'hero', {})).toBe(false);
  });

  it('OR semantics: any handler returning true vetoes', () => {
    registerDamageVeto('veto_test_no', () => false);
    registerDamageVeto('veto_test_yes', () => true);
    const traits: Trait[] = [{ id: 'veto_test_no' }, { id: 'veto_test_yes' }];
    expect(resolveDamageVeto(traits, 100, 'hero', {})).toBe(true);
  });

  it('short-circuits on first true (later handlers do not run)', () => {
    const later = vi.fn(() => false);
    registerDamageVeto('veto_first_yes', () => true);
    registerDamageVeto('veto_later', later);
    const traits: Trait[] = [{ id: 'veto_first_yes' }, { id: 'veto_later' }];
    resolveDamageVeto(traits, 100, 'hero', {});
    expect(later).not.toHaveBeenCalled();
  });

  it('passes amount, source, and tower through to the handler', () => {
    const fn = vi.fn(() => false);
    registerDamageVeto('veto_args', fn);
    const tower = { id: 'mock-tower' };
    resolveDamageVeto([{ id: 'veto_args' }], 42, 'raider', tower);
    expect(fn).toHaveBeenCalledWith({ id: 'veto_args' }, 42, 'raider', tower);
  });
});

describe('Trait pipeline v2 — damage modifier chain', () => {
  it('returns the input amount when no modifier traits match', () => {
    expect(resolveTowerDamageModifiers([{ id: 'mod_test_none' }], 100, 'hero', {})).toBe(100);
  });

  it('chains modifiers in trait-list order', () => {
    registerDamageModifier('mod_half', (_t, a) => a / 2);
    registerDamageModifier('mod_plus_10', (_t, a) => a + 10);
    // [half, plus_10]: 100 → 50 → 60
    expect(resolveTowerDamageModifiers(
      [{ id: 'mod_half' }, { id: 'mod_plus_10' }], 100, 'hero', {},
    )).toBe(60);
    // [plus_10, half]: 100 → 110 → 55
    expect(resolveTowerDamageModifiers(
      [{ id: 'mod_plus_10' }, { id: 'mod_half' }], 100, 'hero', {},
    )).toBe(55);
  });
});

describe('Trait pipeline v2 — onTakeDamage / onKill side-effects', () => {
  beforeEach(() => {
    // Re-register fresh spies each test so call counts don't leak.
  });

  it('onTakeDamage fires every matching handler', () => {
    const a = vi.fn();
    const b = vi.fn();
    registerOnTakeDamage('otd_a', a);
    registerOnTakeDamage('otd_b', b);
    resolveOnTakeDamage([{ id: 'otd_a' }, { id: 'otd_b' }], 25, 'hero', {});
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('onKill fires once per matching trait', () => {
    const fn = vi.fn();
    registerOnKill('kill_test', fn);
    resolveOnKill([{ id: 'kill_test' }], 'send', {});
    expect(fn).toHaveBeenCalledExactlyOnceWith({ id: 'kill_test' }, 'send', {});
  });

  it('resolvers skip traits with no registered handler', () => {
    // Should be a no-op (no throw, no call) when the trait id isn't
    // registered anywhere — happens routinely for hit-time-only traits.
    expect(() => resolveOnTakeDamage([{ id: 'no_handler' }], 10, 'hero', {})).not.toThrow();
    expect(() => resolveOnKill([{ id: 'no_handler' }], 'hero', {})).not.toThrow();
  });
});

describe('Trait pipeline v2 — spawn / despawn lifecycle', () => {
  it('onSpawn + onDespawn fire each matching handler exactly once', () => {
    const spawn = vi.fn();
    const despawn = vi.fn();
    registerOnSpawn('lc_test', spawn);
    registerOnDespawn('lc_test', despawn);
    const tower = { id: 'tower-x' };
    resolveOnSpawn([{ id: 'lc_test' }], tower);
    resolveOnDespawn([{ id: 'lc_test' }], tower);
    expect(spawn).toHaveBeenCalledExactlyOnceWith({ id: 'lc_test' }, tower);
    expect(despawn).toHaveBeenCalledExactlyOnceWith({ id: 'lc_test' }, tower);
  });
});

describe('Trait pipeline v2 — overlayDraw', () => {
  it('runs each registered overlay drawer in trait order', () => {
    const order: string[] = [];
    registerOverlayDraw('ov_first', () => order.push('first'));
    registerOverlayDraw('ov_second', () => order.push('second'));
    resolveOverlayDraw([{ id: 'ov_first' }, { id: 'ov_second' }], {}, {}, {});
    expect(order).toEqual(['first', 'second']);
  });

  it('passes tower / graphics / scene through unchanged', () => {
    const fn = vi.fn();
    registerOverlayDraw('ov_args', fn);
    const tower = { id: 't' };
    const graphics = { id: 'g' };
    const scene = { id: 's' };
    resolveOverlayDraw([{ id: 'ov_args' }], tower, graphics, scene);
    expect(fn).toHaveBeenCalledWith({ id: 'ov_args' }, tower, graphics, scene);
  });
});
