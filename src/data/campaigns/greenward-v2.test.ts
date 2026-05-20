/**
 * Greenward campaign — aspect-extension parity vs the legacy shape.
 */
import { describe, it, expect } from 'vitest';
import { GREENWARD_CAMPAIGN } from './greenward';
import { GREENWARD_EXTENSION } from './greenward-v2';

const legacy = GREENWARD_CAMPAIGN;
const v2 = GREENWARD_EXTENSION;

describe('greenward-v2 — campaign-level parity', () => {
  it('matches factionId, name, intro/outro, defaultPlayerFaction', () => {
    expect(v2.factionId).toBe(legacy.factionId);
    expect(v2.name).toBe(legacy.name);
    expect(v2.intro).toBe(legacy.intro);
    expect(v2.outro).toBe(legacy.outro);
    expect(v2.defaultPlayerFaction).toBe(legacy.defaultPlayerFaction);
  });

  it('has the same 10 missions in the same order', () => {
    expect(v2.missions).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(v2.missions[i].id).toBe(legacy.missions[i].id);
      expect(v2.missions[i].idx).toBe(legacy.missions[i].idx);
    }
  });

  it('exposes the MissionStateAspect (cross-mission Wildwood reserves + mode-lean)', () => {
    expect(v2.missionState).toBeDefined();
    expect(v2.missionState!.tickBetweenMissions).toBeDefined();
    expect(v2.missionState!.applyMissionResult).toBeDefined();
  });
});

describe('greenward-v2 — per-mission core config parity', () => {
  it.each(legacy.missions.map((m, i) => [i, m.id] as const))(
    'M%i %s: mapId + waveCount + difficulty match',
    (i, _id) => {
      const lm = legacy.missions[i];
      const vm = v2.missions[i];
      expect(vm.core.mapId).toBe(lm.overrides.mapId);
      expect(vm.core.waveCount).toBe(lm.overrides.waveCount);
      expect(vm.core.difficulty).toBe(lm.overrides.difficulty);
    },
  );

  it('M6 tarrenford: circle_coop archetype → circle_coop mode', () => {
    expect(v2.missions[5].core.mode).toBe('circle_coop');
  });

  it('M7 wedding_stone: frugal archetype defaults folded (goldStartMult + maxTowers)', () => {
    const m = v2.missions[6];
    expect(m.core.goldStartMult).toBe(0.5);
    expect(m.core.restrictions?.maxTowers).toBe(6);
  });

  it('M9 last_garden: attacker base mode', () => {
    expect(v2.missions[8].core.mode).toBe('attacker');
  });
});

describe('greenward-v2 — Consecration ruin parity', () => {
  it.each(legacy.missions.map((m, i) => [i, m.id] as const))(
    'M%i %s: ruins list matches legacy',
    (i, _id) => {
      const lm = legacy.missions[i];
      const vm = v2.missions[i];
      const lruins = lm.overrides.greenwardRules?.ruins ?? [];
      expect(vm.campaign.ruins).toEqual(lruins);
    },
  );

  it('M10 caer_lythen: kind === "final"', () => {
    expect(v2.missions[9].campaign.kind).toBe('final');
  });

  it('M1..M9: kind === "consecration"', () => {
    for (let i = 0; i < 9; i++) {
      expect(v2.missions[i].campaign.kind).toBe('consecration');
    }
  });
});

describe('greenward-v2 — buildRuntime dispatch', () => {
  const ctx = { factionId: 'nature' as const, missionIdx: 0, state: {
    reserves: 100, hasSpent: false, caerWenna: null,
    modeLean: { ceremony: 0, siege: 0, mercy: 0 },
  } };

  it('returns setup + lifecycle aspects for every mission', () => {
    for (let i = 0; i < 10; i++) {
      const aspects = v2.buildRuntime(ctx, v2.missions[i]);
      expect(aspects.setup, `M${i} setup`).toBeDefined();
      expect(aspects.lifecycle, `M${i} lifecycle`).toBeDefined();
    }
  });
});
