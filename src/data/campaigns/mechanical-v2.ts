/**
 * Mechanical Campaign — Iron Cascade. Aspect refactor (Phase C1).
 *
 * This is the new-shape `CampaignExtension` mirror of the legacy
 * `MECHANICAL_CAMPAIGN` (in `./mechanical.ts`). Both coexist during
 * Phases C–E: production paths still go through the legacy
 * `MECHANICAL_CAMPAIGN`; the new extension only ships data so the
 * registry boundary types compile and the parity test
 * (`mechanical-v2.test.ts`) can verify nothing drifted.
 *
 * Aspects are added in C2 (Suppression Pylons) and C3 (Sabotage M10).
 * C4 flips the registration and routes Mech through `MissionRunner.startV2`.
 * Phase F deletes the legacy `mechanical.ts` once every consumer has
 * moved over.
 *
 * Why two files: the legacy `MECHANICAL_CAMPAIGN` is still authoritative
 * for runtime — touching it during a refactor risks breaking the
 * shipped Mech narrative. The new extension being its own file means
 * the rollback for any sub-commit (C1, C2, C3) is a single-file
 * revert. Once C4 routes through the new path and Phase F deletes the
 * legacy, this file's path may be renamed back to `mechanical.ts`.
 */

import type { CampaignExtension, MissionEntry, CoreMissionConfig } from '../../systems/campaign/types';
import type { SuppressionPylonSpec } from '../Maps';
import { MECHANICAL_TEXTS } from './texts/mechanical.texts';
import {
  buildPassColumn,
  buildSpireFalls,
  buildRailYardAssault,
} from './MechWaveScripts';
import { mechPylonsRuntime } from '../../systems/mechanical/MechPylonsRuntime';

const T = MECHANICAL_TEXTS;

// ─── Campaign state — Mech has no cross-mission persistent data ──
// Greenward has Wildwood reserves; Snake Eyes has the Pactbook ledger;
// Arcane and Mech have no need for cross-mission state. Use an empty
// record so the generic `TState` stays typed without overhead.

export type MechState = Record<string, never>;
const INITIAL_STATE: MechState = {};

// ─── Per-mission campaign payload ─────────────────────────────────
// Discriminated union — a mission either has Suppression Pylons
// (M2/M5/M6/M8), Sabotage rules (M10), or neither (the rest). The
// discriminant means a mission can't accidentally carry both — the
// legacy runtime `throw` for "both finaleRules and sabotageRules"
// disappears.

export interface MechSabotageRules {
  cpuTowerHpDefault?: number;
  cpuTowerOwnerIndex?: number;
  workshopTrainCost?: number;
  workshopTrainCooldownMs?: number;
}

export type MechMissionCfg =
  | { kind: 'plain' }
  | { kind: 'pylons'; pylons: SuppressionPylonSpec[] }
  | { kind: 'sabotage'; sabotage: MechSabotageRules };

// ─── Mission list ────────────────────────────────────────────────
// Each entry mirrors the corresponding legacy mission's resolved
// config (archetype defaults merged with per-mission overrides).
// The archetype concept collapses entirely in the new model — what
// the legacy called e.g. `archetype: 'restriction'` becomes
// `core.mode: 'standard'` with the restriction set on `core.restrictions`.

const MISSIONS: MissionEntry<MechMissionCfg, MechState>[] = [
  // ─── Act I — Defend ──────────────────────────────────────────

  {
    id: 'perimeter_breach',
    idx: 0,
    name: T.missions.perimeter_breach.name,
    story: T.missions.perimeter_breach.story,
    core: {
      mode: 'standard',
      mapId: 'plains',
      difficulty: 'easy',
      waveCount: 10,
      restrictions: {
        allowedTowerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus'],
      },
      waveScript: [
        { wave: 1, isBoss: false, spawnInterval: 700, groups: [{ creepType: 'mech_scout', count: 6, hpScale: 20, speedScale: 1 }] },
        { wave: 2, isBoss: false, spawnInterval: 650, groups: [{ creepType: 'mech_scout', count: 8, hpScale: 24, speedScale: 1 }] },
        { wave: 3, isBoss: false, spawnInterval: 600, groups: [{ creepType: 'mech_scout', count: 6, hpScale: 28, speedScale: 1 }, { creepType: 'mech_light_walker', count: 2, hpScale: 28, speedScale: 1 }] },
        { wave: 4, isBoss: false, spawnInterval: 550, groups: [{ creepType: 'mech_scout', count: 5, hpScale: 32, speedScale: 1 }, { creepType: 'mech_light_walker', count: 4, hpScale: 32, speedScale: 1 }] },
        { wave: 5, isBoss: false, spawnInterval: 500, groups: [{ creepType: 'mech_light_walker', count: 7, hpScale: 38, speedScale: 1 }] },
        { wave: 6, isBoss: false, spawnInterval: 480, groups: [{ creepType: 'mech_scout', count: 6, hpScale: 42, speedScale: 1 }, { creepType: 'mech_light_walker', count: 5, hpScale: 42, speedScale: 1 }] },
        { wave: 7, isBoss: false, spawnInterval: 450, groups: [{ creepType: 'mech_light_walker', count: 8, hpScale: 48, speedScale: 1 }, { creepType: 'mech_scout', count: 4, hpScale: 48, speedScale: 1 }] },
        { wave: 8, isBoss: false, spawnInterval: 420, groups: [{ creepType: 'mech_light_walker', count: 6, hpScale: 54, speedScale: 1 }, { creepType: 'mech_scout', count: 8, hpScale: 54, speedScale: 1 }] },
        { wave: 9, isBoss: false, spawnInterval: 400, groups: [{ creepType: 'mech_light_walker', count: 8, hpScale: 60, speedScale: 1 }, { creepType: 'mech_scout', count: 6, hpScale: 60, speedScale: 1 }] },
        { wave: 10, isBoss: false, spawnInterval: 380, groups: [{ creepType: 'mech_light_walker', count: 10, hpScale: 70, speedScale: 1 }, { creepType: 'mech_scout', count: 8, hpScale: 70, speedScale: 1 }] },
      ],
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.perimeter_breach.objectives.star2, predicate: (r) => r.livesRemaining === r.livesStart },
      star3: { label: T.missions.perimeter_breach.objectives.star3, predicate: (r) => r.towerCount <= 8 },
    },
  },

  {
    id: 'the_pass',
    idx: 1,
    name: T.missions.the_pass.name,
    story: T.missions.the_pass.story,
    core: {
      mode: 'standard',
      mapId: 'serpentine',
      difficulty: 'normal',
      waveCount: 15,
      waveScript: buildPassColumn(),
    },
    campaign: {
      kind: 'pylons',
      pylons: [
        { col: 12, row: 3, radius: 4 },
        { col: 18, row: 12, radius: 5 },
        { col: 24, row: 22, radius: 4 },
      ],
    },
    objectives: {
      star2: { label: T.missions.the_pass.objectives.star2, predicate: (r) => r.livesRemaining >= Math.ceil(r.livesStart * 0.7) },
      star3: { label: T.missions.the_pass.objectives.star3, predicate: (r) => r.durationMs < 9 * 60 * 1000 },
    },
  },

  {
    id: 'the_cipher',
    idx: 2,
    name: T.missions.the_cipher.name,
    story: T.missions.the_cipher.story,
    core: {
      mode: 'standard',
      mapId: 'heist_vault',
      difficulty: 'normal',
      waveCount: 10,
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: {
        label: T.missions.the_cipher.objectives.star2,
        predicate: (r) => r.won && (r.custom.sendsBought as number ?? 0) === 0,
      },
      star3: { label: T.missions.the_cipher.objectives.star3, predicate: (r) => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
    },
  },

  // ─── Act II — Strike Out ─────────────────────────────────────

  {
    id: 'spire_falls',
    idx: 3,
    name: T.missions.spire_falls.name,
    story: T.missions.spire_falls.story,
    core: {
      mode: 'standard',
      mapId: 'base_arena',
      difficulty: 'normal',
      waveCount: 15,
      waveScript: buildSpireFalls(),
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.spire_falls.objectives.star2, predicate: (r) => r.livesRemaining === r.livesStart },
      star3: { label: T.missions.spire_falls.objectives.star3, predicate: (r) => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
    },
  },

  {
    id: 'iron_convoy',
    idx: 4,
    name: T.missions.iron_convoy.name,
    story: T.missions.iron_convoy.story,
    core: {
      mode: 'standard',
      mapId: 'crossroads',
      difficulty: 'hard',
      waveCount: 5,
      waveScript: [
        { wave: 1, isBoss: true, spawnInterval: 0, groups: [{ creepType: 'mech_flagship_walker', count: 1, hpScale: 80, speedScale: 1 }] },
        { wave: 2, isBoss: true, spawnInterval: 350, groups: [{ creepType: 'mech_flagship_walker', count: 1, hpScale: 95, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 2, hpScale: 95, speedScale: 1 }] },
        { wave: 3, isBoss: true, spawnInterval: 280, groups: [{ creepType: 'mech_flagship_walker', count: 1, hpScale: 115, speedScale: 1 }, { creepType: 'mech_skiff', count: 4, hpScale: 115, speedScale: 1 }] },
        { wave: 4, isBoss: true, spawnInterval: 280, groups: [{ creepType: 'mech_flagship_walker', count: 1, hpScale: 140, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 2, hpScale: 140, speedScale: 1 }, { creepType: 'mech_skiff', count: 4, hpScale: 140, speedScale: 1 }] },
        { wave: 5, isBoss: true, spawnInterval: 240, groups: [{ creepType: 'mech_flagship_walker', count: 1, hpScale: 170, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 3, hpScale: 170, speedScale: 1 }, { creepType: 'mech_skiff', count: 6, hpScale: 170, speedScale: 1 }] },
      ],
    },
    campaign: {
      kind: 'pylons',
      pylons: [
        { col: 12, row: 10, radius: 4 },
        { col: 22, row: 14, radius: 4 },
      ],
    },
    objectives: {
      star2: { label: T.missions.iron_convoy.objectives.star2, predicate: (r) => r.livesRemaining === r.livesStart },
      star3: { label: T.missions.iron_convoy.objectives.star3, predicate: (r) => r.won && r.durationMs < 7 * 60 * 1000 },
    },
  },

  {
    id: 'first_light',
    idx: 5,
    name: T.missions.first_light.name,
    story: T.missions.first_light.story,
    core: {
      mode: 'standard',
      mapId: 'fortress',
      difficulty: 'normal',
      waveCount: 20,
      waveScript: buildRailYardAssault(),
    },
    campaign: {
      kind: 'pylons',
      pylons: [
        { col: 8, row: 8, radius: 4 },
        { col: 18, row: 14, radius: 4 },
        { col: 28, row: 10, radius: 4 },
      ],
    },
    objectives: {
      star2: { label: T.missions.first_light.objectives.star2, predicate: (r) => r.won && r.durationMs < 12 * 60 * 1000 },
      star3: { label: T.missions.first_light.objectives.star3, predicate: (r) => r.won && r.durationMs < 9 * 60 * 1000 },
    },
  },

  {
    id: 'rationed_mana',
    idx: 6,
    name: T.missions.rationed_mana.name,
    story: T.missions.rationed_mana.story,
    // Frugal-archetype defaults fold into core here: goldStartMult 0.5
    // and maxTowers 6 came from `ARCHETYPES.frugal.defaults` in the
    // legacy MissionArchetypes.ts. The new shape has no archetypes;
    // each mission carries its own resolved config.
    core: {
      mode: 'standard',
      mapId: 'islands',
      difficulty: 'normal',
      waveCount: 15,
      goldStartMult: 0.5,
      restrictions: { maxTowers: 6 },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.rationed_mana.objectives.star2, predicate: (r) => r.won && r.towerCount <= 5 },
      star3: { label: T.missions.rationed_mana.objectives.star3, predicate: (r) => r.livesRemaining === r.livesStart },
    },
  },

  // ─── Act III — Their Country ─────────────────────────────────

  {
    id: 'saboteur_vanguard',
    idx: 7,
    name: T.missions.saboteur_vanguard.name,
    story: T.missions.saboteur_vanguard.story,
    core: {
      mode: 'attacker',
      mapId: 'attacker_assault',
      difficulty: 'normal',
      waveCount: 10,
      // Legacy M8 ships without an essence budget — `attackerEssencePerWave`
      // is intentionally undefined here so GameScene falls through to the
      // non-composer attacker path (matches legacy behaviour exactly).
    },
    campaign: {
      kind: 'pylons',
      pylons: [
        { col: 14, row: 8, radius: 4 },
        { col: 14, row: 18, radius: 4 },
      ],
    },
    objectives: {
      star2: {
        label: T.missions.saboteur_vanguard.objectives.star2,
        predicate: (r) => r.won && (r.custom.attackerLeaks as number ?? 0) >= 8,
      },
      star3: {
        label: T.missions.saboteur_vanguard.objectives.star3,
        predicate: (r) => r.won && (r.custom.attackerLeaks as number ?? 0) >= 12,
      },
    },
  },

  {
    id: 'the_ace',
    idx: 8,
    name: T.missions.the_ace.name,
    story: T.missions.the_ace.story,
    core: {
      mode: 'hero_defense',
      mapId: 'hero_plains',
      difficulty: 'normal',
      waveCount: 5,
      heroId: 'engineer',
      waveScript: [
        { wave: 1, isBoss: true, spawnInterval: 0, groups: [{ creepType: 'mech_ace_pilot', count: 1, hpScale: 90, speedScale: 1 }] },
        { wave: 2, isBoss: true, spawnInterval: 400, groups: [{ creepType: 'mech_ace_pilot', count: 1, hpScale: 105, speedScale: 1 }, { creepType: 'mech_light_walker', count: 2, hpScale: 105, speedScale: 1 }] },
        { wave: 3, isBoss: true, spawnInterval: 400, groups: [{ creepType: 'mech_ace_pilot', count: 1, hpScale: 125, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 2, hpScale: 125, speedScale: 1 }] },
        { wave: 4, isBoss: true, spawnInterval: 320, groups: [{ creepType: 'mech_ace_pilot', count: 1, hpScale: 145, speedScale: 1 }, { creepType: 'mech_light_walker', count: 3, hpScale: 145, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 1, hpScale: 145, speedScale: 1 }] },
        { wave: 5, isBoss: true, spawnInterval: 280, groups: [{ creepType: 'mech_ace_pilot', count: 1, hpScale: 175, speedScale: 1 }, { creepType: 'mech_armored_walker', count: 2, hpScale: 175, speedScale: 1 }, { creepType: 'mech_light_walker', count: 2, hpScale: 175, speedScale: 1 }] },
      ],
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: {
        label: T.missions.the_ace.objectives.star2,
        predicate: (r) => r.won && (r.custom.heroHpMin as number ?? 1) >= 0.5,
      },
      star3: { label: T.missions.the_ace.objectives.star3, predicate: (r) => r.won && r.durationMs < 6 * 60 * 1000 },
    },
  },

  {
    id: 'the_overthrow',
    idx: 9,
    name: T.missions.the_overthrow.name,
    story: T.missions.the_overthrow.story,
    core: {
      mode: 'standard',
      mapId: 'mech_throne_finale',
      difficulty: 'hard',
      waveCount: 999,
    },
    campaign: {
      kind: 'sabotage',
      sabotage: {
        cpuTowerHpDefault: 600,
        cpuTowerOwnerIndex: 99,
      },
    },
    objectives: {
      star2: { label: T.missions.the_overthrow.objectives.star2, predicate: (r) => r.won && r.durationMs < 25 * 60 * 1000 },
      star3: { label: T.missions.the_overthrow.objectives.star3, predicate: (r) => r.won && r.livesRemaining === r.livesStart },
    },
  },
];

// ─── Extension ───────────────────────────────────────────────────
// C1 ships data only — `buildRuntime` returns an empty bundle.
// C2 attaches a Suppression Pylons setup+intercept aspect; C3 adds
// the Sabotage M10 lifecycle. C4 registers this extension and routes
// Mech through `MissionRunner.startV2` end-to-end.

export const MECHANICAL_EXTENSION: CampaignExtension<MechState, MechMissionCfg> = {
  factionId: 'mechanical',
  name: T.campaign.name,
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  initialState: INITIAL_STATE,
  defaultMapThemeOverride: 'factory',
  defaultPlayerFaction: 'arcane',
  missions: MISSIONS,
  buildRuntime: (_ctx, mission) => {
    // C2: pylon missions (M2, M5, M6, M8) get the Suppression Pylons
    // aspect bundle. Sabotage M10 lands in C3; plain missions return
    // no aspects (the legacy code path still owns their setup for now,
    // but the empty bundle is a valid no-op once C4 cuts over).
    if (mission.campaign.kind === 'pylons') {
      return mechPylonsRuntime(mission.campaign.pylons);
    }
    return {};
  },
};

// Re-export the CoreMissionConfig type for the parity test — the test
// reads from both this extension and the legacy CampaignDef and needs
// to type-narrow the discriminated core.
export type { CoreMissionConfig };
