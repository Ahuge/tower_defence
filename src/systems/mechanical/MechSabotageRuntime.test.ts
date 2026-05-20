/**
 * MechSabotageRuntime — aspect-level tests.
 *
 * Phase C4 grew the runtime to a real Setup body that forwards to the
 * host's `installMechSabotage(rules)` (lives on GameScene). Lifecycle
 * methods remain present-but-empty — the host still owns the
 * controller's per-frame tick and shutdown teardown.
 */
import { describe, it, expect } from 'vitest';
import { mechSabotageRuntime } from './MechSabotageRuntime';
import { MECHANICAL_EXTENSION } from '../../data/campaigns/mechanical';
import type { WorldMutator } from '../campaign/types';

function makeFakeMutator(): WorldMutator & { calls: string[]; sabotageArg: unknown } {
  const state = { calls: [] as string[], sabotageArg: null as unknown };
  return {
    installPrePlacedTowers: () => { state.calls.push('installPrePlacedTowers'); },
    installSuppressionPylons: () => { state.calls.push('installSuppressionPylons'); },
    installSummoningCircles: () => { state.calls.push('installSummoningCircles'); },
    installDestructibleTowers: () => { state.calls.push('installDestructibleTowers'); },
    installWorkshop: () => { state.calls.push('installWorkshop'); },
    installMechSabotage: (r) => { state.calls.push('installMechSabotage'); state.sabotageArg = r; },
    installArcaneFinale: () => { state.calls.push('installArcaneFinale'); },
    installGreenwardRules: () => { state.calls.push('installGreenwardRules'); },
    applyRuinCells: () => { state.calls.push('applyRuinCells'); },
    registerActionIntercept: () => ({ release: () => undefined }),
    setSendPathOverride: () => { state.calls.push('setSendPathOverride'); },
    get calls() { return state.calls; },
    get sabotageArg() { return state.sabotageArg; },
  };
}

describe('mechSabotageRuntime — Setup aspect', () => {
  it('returns only a Setup aspect — host owns SabotageController lifecycle', () => {
    const aspects = mechSabotageRuntime({ cpuTowerHpDefault: 600, cpuTowerOwnerIndex: 99 });
    expect(aspects.setup).toBeDefined();
    expect(aspects.lifecycle).toBeUndefined();
    expect(aspects.gameplay).toBeUndefined();
    expect(aspects.intercept).toBeUndefined();
  });

  it('Setup.install forwards rules through WorldMutator.installMechSabotage', () => {
    const world = makeFakeMutator();
    const rules = { cpuTowerHpDefault: 600, cpuTowerOwnerIndex: 99 };
    const { setup } = mechSabotageRuntime(rules);
    setup!.install(world);
    expect(world.calls).toContain('installMechSabotage');
    expect(world.sabotageArg).toEqual(rules);
  });

  it('Setup.install does not touch other host helpers', () => {
    const world = makeFakeMutator();
    const { setup } = mechSabotageRuntime({});
    setup!.install(world);
    expect(world.calls).toEqual(['installMechSabotage']);
  });
});

describe('MECHANICAL_EXTENSION.buildRuntime — sabotage dispatch', () => {
  const ctx = { factionId: 'mechanical' as const, missionIdx: 9, state: {} };

  it('M10 the_overthrow: dispatches to mechSabotageRuntime — setup present', () => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[9]);
    expect(aspects.setup).toBeDefined();
    expect(aspects.lifecycle).toBeUndefined();
  });
});
