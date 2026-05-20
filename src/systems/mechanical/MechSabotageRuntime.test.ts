/**
 * MechSabotageRuntime — aspect-level tests.
 *
 * Phase C3 stakes out the API surface. The runtime is a placeholder
 * Lifecycle; the meaningful wiring (workshop placement, controller
 * construction, DOM event listeners, shutdown teardown) lands in C4.
 * These specs lock the dispatch contract so the C4 work can replace
 * the lifecycle internals in-place without breaking
 * `MECHANICAL_EXTENSION.buildRuntime` callers.
 */
import { describe, it, expect } from 'vitest';
import { mechSabotageRuntime } from './MechSabotageRuntime';
import { MECHANICAL_EXTENSION } from '../../data/campaigns/mechanical-v2';

describe('mechSabotageRuntime — Phase C3 skeleton', () => {
  it('returns a Lifecycle aspect (Setup + Gameplay added by C4)', () => {
    const aspects = mechSabotageRuntime({ cpuTowerHpDefault: 600, cpuTowerOwnerIndex: 99 });
    expect(aspects.lifecycle).toBeDefined();
    expect(aspects.setup).toBeUndefined();
    expect(aspects.gameplay).toBeUndefined();
    expect(aspects.intercept).toBeUndefined();
  });

  it('Lifecycle.update is a no-op (no per-frame state in C3)', () => {
    const aspects = mechSabotageRuntime({});
    expect(() => aspects.lifecycle!.update(16)).not.toThrow();
  });

  it('Lifecycle.shutdown is a no-op (no listeners registered in C3)', () => {
    const aspects = mechSabotageRuntime({});
    expect(() => aspects.lifecycle!.shutdown()).not.toThrow();
  });

  it('shutdown is idempotent — calling twice does not throw', () => {
    const aspects = mechSabotageRuntime({});
    aspects.lifecycle!.shutdown();
    expect(() => aspects.lifecycle!.shutdown()).not.toThrow();
  });
});

describe('MECHANICAL_EXTENSION.buildRuntime — sabotage dispatch (C3)', () => {
  const ctx = { factionId: 'mechanical' as const, missionIdx: 9, state: {} };

  it('M10 the_overthrow: dispatches to mechSabotageRuntime — lifecycle present', () => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[9]);
    expect(aspects.lifecycle).toBeDefined();
    // C3 surface: no Setup yet (C4 lands the workshop + destructible
    // install via WorldMutator).
    expect(aspects.setup).toBeUndefined();
  });
});
