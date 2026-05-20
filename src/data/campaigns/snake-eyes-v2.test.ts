/**
 * Snake Eyes campaign — aspect-extension parity vs the legacy shape.
 * Phase D3 data port. Registration deferred until Counterfactual M10
 * controller lands.
 */
import { describe, it, expect } from 'vitest';
import { SNAKE_EYES_CAMPAIGN } from './snake-eyes';
import { SNAKE_EYES_EXTENSION } from './snake-eyes-v2';
import { getCampaignExtension } from '../../systems/campaign/CampaignRegistry';

const legacy = SNAKE_EYES_CAMPAIGN;
const v2 = SNAKE_EYES_EXTENSION;

describe('snake-eyes-v2 — campaign-level parity', () => {
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

  it('is intentionally NOT registered (M10 Counterfactual controller unimplemented)', () => {
    // If this fails, someone uncommented the registerCampaign(...) call
    // in snake-eyes-v2.ts without landing the M10 controller. Routing
    // Snake Eyes through startV2 lets M10 launch into a broken state
    // because v2 has no stub-refusal — see file header comment.
    expect(getCampaignExtension('void')).toBeNull();
  });
});

describe('snake-eyes-v2 — per-mission core config parity', () => {
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

  it('M6 theris_goodbye: circle_coop archetype → circle_coop mode', () => {
    expect(v2.missions[5].core.mode).toBe('circle_coop');
  });

  it('M7 mirror_walkers: restrictions include Siphon ban', () => {
    expect(v2.missions[6].core.restrictions?.allowedTowerIds).toEqual(
      ['void_gambler', 'void_spike', 'void_rift', 'void_oblivion'],
    );
  });

  it('M8 snake_eyes_proper: frugal defaults folded (goldStartMult + maxTowers); goldStart override preserved', () => {
    const m = v2.missions[7];
    expect(m.core.goldStart).toBe(200);
    expect(m.core.goldStartMult).toBe(0.5);
    expect(m.core.restrictions?.maxTowers).toBe(6);
  });

  it('M9 burning_pactbook: attacker base mode + Void palette + leak threshold', () => {
    const m = v2.missions[8];
    expect(m.core.mode).toBe('attacker');
    if (m.core.mode === 'attacker') {
      expect(m.core.attackerEssencePerWave).toBe(80);
      expect(m.core.attackerLeakThreshold).toBe(6);
      expect(m.core.attackerPaletteFaction).toBe('void');
    }
  });
});

describe('snake-eyes-v2 — campaign payload', () => {
  it('M1..M9: kind === "plain"', () => {
    for (let i = 0; i < 9; i++) {
      expect(v2.missions[i].campaign.kind).toBe('plain');
    }
  });

  it('M10: kind === "final_unimplemented" (Counterfactual M10 not yet built)', () => {
    expect(v2.missions[9].campaign.kind).toBe('final_unimplemented');
  });
});

describe('snake-eyes-v2 — buildRuntime', () => {
  const ctx = { factionId: 'void' as const, missionIdx: 0, state: {} };

  it('returns an empty aspect bundle for plain missions M1..M9', () => {
    for (let i = 0; i < 9; i++) {
      const aspects = v2.buildRuntime(ctx, v2.missions[i]);
      expect(aspects).toEqual({});
    }
  });

  it('throws for M10 (final_unimplemented) — guards against premature registration', () => {
    // If anyone uncomments `registerCampaign(SNAKE_EYES_EXTENSION)`
    // before landing the Counterfactual controller, `startV2` would
    // launch M10 into a broken 999-wave run. The throw fails loud at
    // mission start instead.
    expect(() => v2.buildRuntime(ctx, v2.missions[9])).toThrow(/M10.*Counterfactual/);
  });
});
