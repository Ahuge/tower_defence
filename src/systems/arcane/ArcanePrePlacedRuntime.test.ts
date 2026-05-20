import { describe, it, expect } from 'vitest';
import { arcanePrePlacedRuntime } from './ArcanePrePlacedRuntime';
import type { WorldMutator, PrePlacedTowerSpec } from '../campaign/types';

function makeFakeMutator(): WorldMutator & { calls: string[]; towersArg: PrePlacedTowerSpec[] | null } {
  const state = { calls: [] as string[], towersArg: null as PrePlacedTowerSpec[] | null };
  return {
    installPrePlacedTowers: (towers) => { state.calls.push('installPrePlacedTowers'); state.towersArg = towers; },
    installSuppressionPylons: () => { state.calls.push('installSuppressionPylons'); },
    installSummoningCircles: () => { state.calls.push('installSummoningCircles'); },
    installDestructibleTowers: () => { state.calls.push('installDestructibleTowers'); },
    installWorkshop: () => { state.calls.push('installWorkshop'); },
    installMechSabotage: () => { state.calls.push('installMechSabotage'); },
    installArcaneFinale: () => { state.calls.push('installArcaneFinale'); },
    installGreenwardRules: () => { state.calls.push('installGreenwardRules'); },
    applyRuinCells: () => { state.calls.push('applyRuinCells'); },
    registerActionIntercept: () => ({ release: () => undefined }),
    setSendPathOverride: () => { state.calls.push('setSendPathOverride'); },
    get calls() { return state.calls; },
    get towersArg() { return state.towersArg; },
  };
}

describe('arcanePrePlacedRuntime — Setup aspect', () => {
  it('forwards tower specs to WorldMutator.installPrePlacedTowers', () => {
    const towers: PrePlacedTowerSpec[] = [
      { towerId: 'arcane_frost', col: 5, row: 12 },
      { towerId: 'arcane_frost', col: 32, row: 18 },
    ];
    const world = makeFakeMutator();
    const { setup } = arcanePrePlacedRuntime(towers);
    setup!.install(world);
    expect(world.calls).toEqual(['installPrePlacedTowers']);
    expect(world.towersArg).toEqual(towers);
  });
});
