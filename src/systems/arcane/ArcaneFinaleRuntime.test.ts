import { describe, it, expect } from 'vitest';
import { arcaneFinaleRuntime } from './ArcaneFinaleRuntime';
import type { WorldMutator } from '../campaign/types';
import type { ArcaneFinaleRules } from '../../data/campaigns/arcane';

function makeFakeMutator(): WorldMutator & { calls: string[]; finaleArg: unknown } {
  const state = { calls: [] as string[], finaleArg: null as unknown };
  return {
    installPrePlacedTowers: () => { state.calls.push('installPrePlacedTowers'); },
    installSuppressionPylons: () => { state.calls.push('installSuppressionPylons'); },
    installSummoningCircles: () => { state.calls.push('installSummoningCircles'); },
    installDestructibleTowers: () => { state.calls.push('installDestructibleTowers'); },
    installWorkshop: () => { state.calls.push('installWorkshop'); },
    installMechSabotage: () => { state.calls.push('installMechSabotage'); },
    installArcaneFinale: (r) => { state.calls.push('installArcaneFinale'); state.finaleArg = r; },
    installGreenwardRules: () => { state.calls.push('installGreenwardRules'); },
    applyRuinCells: () => { state.calls.push('applyRuinCells'); },
    registerActionIntercept: () => ({ release: () => undefined }),
    setSendPathOverride: () => { state.calls.push('setSendPathOverride'); },
    get calls() { return state.calls; },
    get finaleArg() { return state.finaleArg; },
  };
}

const RULES: ArcaneFinaleRules = {
  heroId: 'arcanist',
  heroStartingLevel: 3,
  heroRespawnSeconds: 20,
  chargeRatePerDrain: 0.00156,
  cpuTowerHpDefault: 600,
  towerKillReward: { gold: 50, xp: 50, ultGold: 500, ultXp: 250 },
};

describe('arcaneFinaleRuntime', () => {
  it('returns Setup + Lifecycle aspects', () => {
    const aspects = arcaneFinaleRuntime(RULES);
    expect(aspects.setup).toBeDefined();
    expect(aspects.lifecycle).toBeDefined();
  });

  it('Setup forwards rules through WorldMutator.installArcaneFinale', () => {
    const world = makeFakeMutator();
    const { setup } = arcaneFinaleRuntime(RULES);
    setup!.install(world);
    expect(world.calls).toContain('installArcaneFinale');
    expect(world.finaleArg).toEqual(RULES);
  });

  it('Lifecycle update + shutdown are no-ops (host owns the controller today)', () => {
    const aspects = arcaneFinaleRuntime(RULES);
    expect(() => aspects.lifecycle!.update(16)).not.toThrow();
    expect(() => aspects.lifecycle!.shutdown()).not.toThrow();
  });
});
