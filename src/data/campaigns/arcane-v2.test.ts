/**
 * Arcane campaign — aspect-extension parity vs the legacy shape.
 * Mirrors the Mech parity suite. Phase F deletes when the legacy
 * `arcane.ts` is removed.
 */
import { describe, it, expect } from 'vitest';
import { ARCANE_CAMPAIGN } from './arcane';
import { ARCANE_EXTENSION } from './arcane-v2';

const legacy = ARCANE_CAMPAIGN;
const v2 = ARCANE_EXTENSION;

describe('arcane-v2 — campaign-level parity', () => {
  it('shares factionId, name, intro/outro, theme + player faction defaults', () => {
    expect(v2.factionId).toBe(legacy.factionId);
    expect(v2.name).toBe(legacy.name);
    expect(v2.intro).toBe(legacy.intro);
    expect(v2.outro).toBe(legacy.outro);
    expect(v2.defaultMapThemeOverride).toBe(legacy.defaultMapThemeOverride);
    // v2 introduces defaultPlayerFaction; legacy sets per-mission.
    expect(v2.defaultPlayerFaction).toBe('coalition');
  });

  it('has the same 10 missions in the same order', () => {
    expect(v2.missions).toHaveLength(10);
    expect(legacy.missions).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(v2.missions[i].id).toBe(legacy.missions[i].id);
      expect(v2.missions[i].idx).toBe(legacy.missions[i].idx);
    }
  });
});

describe('arcane-v2 — per-mission core config parity', () => {
  it.each(legacy.missions.map((m, i) => [i, m.id] as const))(
    'M%i %s: mapId + difficulty match',
    (i, _id) => {
      const lm = legacy.missions[i];
      const vm = v2.missions[i];
      expect(vm.core.mapId).toBe(lm.overrides.mapId);
      expect(vm.core.difficulty).toBe(lm.overrides.difficulty ?? 'normal');
    },
  );

  it('M1 first_sigil: standard base mode, restrictions + restrictions tower kit', () => {
    const m = v2.missions[0];
    expect(m.core.mode).toBe('standard');
    expect(m.core.restrictions?.allowedTowerIds).toEqual(['arrow', 'cannon', 'coalition_wall']);
  });

  it('M4 spire_siege: base_defense archetype → standard mode + base_arena map', () => {
    const m = v2.missions[3];
    expect(m.core.mode).toBe('standard');
    expect(m.core.mapId).toBe('base_arena');
  });

  it('M5 crystal_warlords: boss_rush archetype → standard mode + hard difficulty', () => {
    const m = v2.missions[4];
    expect(m.core.mode).toBe('standard');
    expect(m.core.difficulty).toBe('hard');
  });

  it('M6 forced_march: speedrun archetype defaults folded into core (autoChain, killGoldMult, goldStart)', () => {
    const m = v2.missions[5];
    expect(m.core.mode).toBe('standard');
    expect(m.core.autoChainWaves).toBe(5);
    expect(m.core.killGoldMult).toBe(0.5);
    expect(m.core.goldStart).toBe(600);
  });

  it('M7 starved_winter: frugal archetype defaults folded into core (goldStartMult + maxTowers)', () => {
    const m = v2.missions[6];
    expect(m.core.mode).toBe('standard');
    expect(m.core.goldStartMult).toBe(0.5);
    expect(m.core.restrictions?.maxTowers).toBe(6);
  });

  it('M8 breach_relay: attacker base mode + attacker fields populated', () => {
    const m = v2.missions[7];
    expect(m.core.mode).toBe('attacker');
    if (m.core.mode === 'attacker') {
      expect(m.core.attackerEssencePerWave).toBe(60);
      expect(m.core.attackerEssenceGrowthPerWave).toBe(10);
      expect(m.core.attackerLeakThreshold).toBe(12);
      expect(m.core.attackerDefenderDifficulty).toBe('hard');
      expect(m.core.attackerPrepOrder).toHaveLength(10);
    }
  });

  it('M9 allied_circle: circle_coop base mode + 2.5× creep mult', () => {
    const m = v2.missions[8];
    expect(m.core.mode).toBe('circle_coop');
    if (m.core.mode === 'circle_coop') {
      expect(m.core.coopCreepCountMult).toBe(2.5);
    }
  });

  it('M10 reckoning: final_arcane → standard mode + 999 waves + noWalls', () => {
    const m = v2.missions[9];
    expect(m.core.mode).toBe('standard');
    expect(m.core.waveCount).toBe(999);
    expect(m.core.difficulty).toBe('hard');
    expect(m.core.restrictions?.noWalls).toBe(true);
  });
});

describe('arcane-v2 — campaign payload parity', () => {
  it('M1 first_sigil: pre-placed Frost at (5, 12)', () => {
    const m = v2.missions[0];
    expect(m.campaign.kind).toBe('pre_placed');
    if (m.campaign.kind === 'pre_placed') {
      expect(m.campaign.towers).toEqual([{ towerId: 'arcane_frost', col: 5, row: 12 }]);
    }
  });

  it('M2 the_library: two pre-placed Frosts at canyon bends', () => {
    const m = v2.missions[1];
    expect(m.campaign.kind).toBe('pre_placed');
    if (m.campaign.kind === 'pre_placed') {
      expect(m.campaign.towers).toEqual([
        { towerId: 'arcane_frost', col: 3, row: 4 },
        { towerId: 'arcane_frost', col: 32, row: 18 },
      ]);
    }
  });

  it('M10 reckoning: finale rules match legacy (Arcanist hero, 0.00156 charge rate)', () => {
    const m = v2.missions[9];
    expect(m.campaign.kind).toBe('finale');
    if (m.campaign.kind === 'finale') {
      expect(m.campaign.finale.heroId).toBe('arcanist');
      expect(m.campaign.finale.heroStartingLevel).toBe(3);
      expect(m.campaign.finale.chargeRatePerDrain).toBe(0.00156);
      expect(m.campaign.finale.cpuTowerHpDefault).toBe(600);
    }
  });

  it('plain missions (M3..M9) carry { kind: "plain" }', () => {
    for (const i of [2, 3, 4, 5, 6, 7, 8]) {
      expect(v2.missions[i].campaign.kind).toBe('plain');
    }
  });
});

describe('arcane-v2 — buildRuntime dispatch', () => {
  const ctx = { factionId: 'arcane' as const, missionIdx: 0, state: {} };

  it('M1/M2 pre-placed missions return setup aspect', () => {
    for (const i of [0, 1]) {
      const aspects = v2.buildRuntime(ctx, v2.missions[i]);
      expect(aspects.setup).toBeDefined();
    }
  });

  it('M10 finale returns setup + lifecycle', () => {
    const aspects = v2.buildRuntime(ctx, v2.missions[9]);
    expect(aspects.setup).toBeDefined();
    expect(aspects.lifecycle).toBeDefined();
  });

  it.each([[2], [3], [4], [5], [6], [7], [8]] as const)(
    'M%i plain mission returns empty bundle',
    (i) => {
      const aspects = v2.buildRuntime(ctx, v2.missions[i]);
      expect(aspects).toEqual({});
    },
  );
});

describe('arcane-v2 — objective predicates match legacy', () => {
  it.each(legacy.missions.map((m, i) => [i, m.id] as const))(
    'M%i %s — star2/star3 predicates agree on a synthetic result',
    (i, _id) => {
      const lm = legacy.missions[i];
      const vm = v2.missions[i];
      const result = {
        won: true, wave: 8, durationMs: 5 * 60 * 1000,
        livesRemaining: 18, livesStart: 20, goldRemaining: 100, goldEarned: 500,
        towerCount: 4, perfectRun: false,
        custom: {
          channelsInterrupted: 4, channelsCompleted: 0, heroDeaths: 0,
          sendsBought: 0,
        },
      };
      expect(vm.objectives.star2?.predicate(result) ?? false).toBe(lm.objectives.star2?.predicate(result) ?? false);
      expect(vm.objectives.star3?.predicate(result) ?? false).toBe(lm.objectives.star3?.predicate(result) ?? false);
    },
  );
});
