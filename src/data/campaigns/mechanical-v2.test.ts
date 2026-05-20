/**
 * Mechanical campaign — aspect-extension parity vs the legacy shape.
 *
 * Phase C1 ships data only. This suite locks the new MECHANICAL_EXTENSION
 * against the still-authoritative MECHANICAL_CAMPAIGN so a future edit
 * to one half (e.g. rebalancing a wave script in the legacy) can't
 * silently drift the two apart.
 *
 * Each spec asserts on one piece of the parity contract — mission count,
 * map ids, wave-script structure, pylon placements, sabotage rules,
 * hero / restrictions / archetype-default folding. When Phase F deletes
 * the legacy, this file goes too.
 */
import { describe, it, expect } from 'vitest';
import { MECHANICAL_CAMPAIGN } from './mechanical';
import { MECHANICAL_EXTENSION } from './mechanical-v2';

const legacy = MECHANICAL_CAMPAIGN;
const v2 = MECHANICAL_EXTENSION;

describe('mechanical-v2 — campaign-level parity with legacy', () => {
  it('shares factionId, name, intro/outro, theme + player faction defaults', () => {
    expect(v2.factionId).toBe(legacy.factionId);
    expect(v2.name).toBe(legacy.name);
    expect(v2.intro).toBe(legacy.intro);
    expect(v2.outro).toBe(legacy.outro);
    expect(v2.defaultMapThemeOverride).toBe(legacy.defaultMapThemeOverride);
    expect(v2.defaultPlayerFaction).toBe(legacy.defaultPlayerFaction);
  });

  it('has the same number of missions in the same order', () => {
    expect(v2.missions).toHaveLength(legacy.missions.length);
    for (let i = 0; i < legacy.missions.length; i++) {
      expect(v2.missions[i].id).toBe(legacy.missions[i].id);
      expect(v2.missions[i].idx).toBe(legacy.missions[i].idx);
    }
  });
});

describe('mechanical-v2 — per-mission core config parity', () => {
  it.each(
    legacy.missions.map((m, i) => [i, m.id] as const),
  )('M%i %s: mapId + waveCount + difficulty match', (i, _id) => {
    const lm = legacy.missions[i];
    const vm = v2.missions[i];
    expect(vm.core.mapId).toBe(lm.overrides.mapId);
    expect(vm.core.waveCount).toBe(lm.overrides.waveCount);
    expect(vm.core.difficulty).toBe(lm.overrides.difficulty ?? 'normal');
  });

  it('M1 perimeter_breach: restriction archetype → standard mode + allowedTowerIds folded into core', () => {
    const m = v2.missions[0];
    expect(m.core.mode).toBe('standard');
    expect(m.core.restrictions?.allowedTowerIds).toEqual(
      legacy.missions[0].overrides.restrictions?.allowedTowerIds,
    );
  });

  it('M3 the_cipher: heist archetype → standard mode (map topology lives on mapId only)', () => {
    expect(v2.missions[2].core.mode).toBe('standard');
    expect(v2.missions[2].core.mapId).toBe('heist_vault');
  });

  it('M4 spire_falls: base_defense archetype → standard mode + base_arena map', () => {
    expect(v2.missions[3].core.mode).toBe('standard');
    expect(v2.missions[3].core.mapId).toBe('base_arena');
  });

  it('M7 rationed_mana: frugal archetype defaults folded into core (goldStartMult + maxTowers)', () => {
    const m = v2.missions[6];
    expect(m.core.mode).toBe('standard');
    expect(m.core.goldStartMult).toBe(0.5);
    expect(m.core.restrictions?.maxTowers).toBe(6);
  });

  it('M8 saboteur_vanguard: attacker base mode preserved; no essence budget (legacy parity)', () => {
    const m = v2.missions[7];
    expect(m.core.mode).toBe('attacker');
    if (m.core.mode === 'attacker') {
      expect(m.core.attackerEssencePerWave).toBeUndefined();
    }
  });

  it('M9 the_ace: hero_defense base mode + engineer hero', () => {
    const m = v2.missions[8];
    expect(m.core.mode).toBe('hero_defense');
    if (m.core.mode === 'hero_defense') {
      expect(m.core.heroId).toBe('engineer');
    }
  });

  it('M10 the_overthrow: final_sabotage archetype → standard mode + waveCount 999', () => {
    const m = v2.missions[9];
    expect(m.core.mode).toBe('standard');
    expect(m.core.waveCount).toBe(999);
    expect(m.core.difficulty).toBe('hard');
  });
});

describe('mechanical-v2 — campaign payload parity (pylons + sabotage)', () => {
  it('M2 the_pass: 3 suppression pylons match legacy positions and radii', () => {
    const m = v2.missions[1];
    expect(m.campaign.kind).toBe('pylons');
    if (m.campaign.kind === 'pylons') {
      expect(m.campaign.pylons).toEqual(legacy.missions[1].overrides.suppressionPylons);
    }
  });

  it('M5 iron_convoy: 2 pylons match legacy positions and radii', () => {
    const m = v2.missions[4];
    expect(m.campaign.kind).toBe('pylons');
    if (m.campaign.kind === 'pylons') {
      expect(m.campaign.pylons).toEqual(legacy.missions[4].overrides.suppressionPylons);
    }
  });

  it('M6 first_light: 3 pylons match legacy positions and radii', () => {
    const m = v2.missions[5];
    expect(m.campaign.kind).toBe('pylons');
    if (m.campaign.kind === 'pylons') {
      expect(m.campaign.pylons).toEqual(legacy.missions[5].overrides.suppressionPylons);
    }
  });

  it('M8 saboteur_vanguard: 2 pylons match legacy positions and radii', () => {
    const m = v2.missions[7];
    expect(m.campaign.kind).toBe('pylons');
    if (m.campaign.kind === 'pylons') {
      expect(m.campaign.pylons).toEqual(legacy.missions[7].overrides.suppressionPylons);
    }
  });

  it('M10 the_overthrow: sabotage rules match legacy', () => {
    const m = v2.missions[9];
    expect(m.campaign.kind).toBe('sabotage');
    if (m.campaign.kind === 'sabotage') {
      expect(m.campaign.sabotage).toEqual(legacy.missions[9].overrides.sabotageRules);
    }
  });

  it('non-pylon, non-sabotage missions carry { kind: "plain" }', () => {
    for (const i of [0, 2, 3, 6, 8]) {
      expect(v2.missions[i].campaign.kind).toBe('plain');
    }
  });
});

describe('mechanical-v2 — wave script parity', () => {
  // Each legacy mission either has an inline waveScript array or
  // builds one via a helper. The new shape carries the resolved
  // array directly; lengths must match and the first wave's payload
  // must match (full deep-equal would re-spec the entire script —
  // these spot-checks catch drift without coupling to wave-by-wave layout).
  it.each([
    [0, 'perimeter_breach', 10],
    [1, 'the_pass', 15],
    [3, 'spire_falls', 15],
    [4, 'iron_convoy', 5],
    [5, 'first_light', 20],
    [8, 'the_ace', 5],
  ] as const)('M%i %s: wave script length = %i and wave 1 matches legacy', (idx, _id, expectedLen) => {
    const lws = legacy.missions[idx].overrides.waveScript;
    const vws = v2.missions[idx].core.waveScript;
    expect(vws).toBeDefined();
    expect(vws).toHaveLength(expectedLen);
    expect(lws).toHaveLength(expectedLen);
    if (vws && lws) {
      expect(vws[0]).toEqual(lws[0]);
    }
  });
});

describe('mechanical-v2 — objective predicates behave identically', () => {
  // Apply each star predicate to a synthetic MissionResult and verify
  // the new and legacy predicates agree for both pass and fail inputs.
  // Predicates that read `r.custom.*` are still touched because we
  // populate the expected key.
  it.each(legacy.missions.map((m, i) => [i, m.id] as const))(
    'M%i %s — star2/star3 predicates produce identical answers on a synthetic result',
    (i, _id) => {
      const lm = legacy.missions[i];
      const vm = v2.missions[i];
      // Stress every result field the Mech predicates touch.
      const result = {
        won: true,
        wave: 10,
        durationMs: 5 * 60 * 1000,
        livesRemaining: 18,
        livesStart: 20,
        goldRemaining: 100,
        goldEarned: 500,
        towerCount: 4,
        perfectRun: false,
        custom: {
          sendsBought: 0,
          attackerLeaks: 10,
          heroHpMin: 0.8,
        },
      };
      const passLegacy2 = lm.objectives.star2?.predicate(result) ?? false;
      const passV2_2 = vm.objectives.star2?.predicate(result) ?? false;
      expect(passV2_2).toBe(passLegacy2);
      const passLegacy3 = lm.objectives.star3?.predicate(result) ?? false;
      const passV2_3 = vm.objectives.star3?.predicate(result) ?? false;
      expect(passV2_3).toBe(passLegacy3);
    },
  );
});

describe('mechanical-v2 — buildRuntime contract', () => {
  it('buildRuntime returns an empty aspect bundle in C1 (aspects land in C2/C3)', () => {
    const m = v2.missions[1]; // the_pass — should later get the pylons setup aspect
    const aspects = v2.buildRuntime({ factionId: 'mechanical', missionIdx: 1, state: {} }, m);
    expect(aspects).toEqual({});
  });
});
