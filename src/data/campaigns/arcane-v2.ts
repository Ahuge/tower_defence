/**
 * Arcane Campaign — The Reckoning. Aspect refactor (Phase D1).
 *
 * Player POV: the Coalition — a peoples' army with a salvaged tower kit
 * (Arrow + Cannon + Wall progressing into Sniper / Frost / Root / Mana
 * Drain / Meteor / Nova over the campaign). Antagonist: the Arcane
 * archmages who launched the first invasion.
 *
 * Mirror of the legacy `ARCANE_CAMPAIGN` in `./arcane.ts`. Both
 * coexist during Phase D; production paths still flow through the
 * legacy until D1c flips routing for Arcane. Phase F deletes the
 * legacy.
 *
 * Per-mission summary:
 *   M1, M2  — pre-placed Frost towers (`kind: 'pre_placed'`).
 *   M3..M9  — plain (no campaign-specific payload).
 *   M10     — final_arcane finale (`kind: 'finale'`).
 */

import type { CampaignExtension, MissionEntry, PrePlacedTowerSpec } from '../../systems/campaign/types';
import { ARCANE_TEXTS } from './texts/arcane.texts';
import { arcanePrePlacedRuntime } from '../../systems/arcane/ArcanePrePlacedRuntime';
import { arcaneFinaleRuntime } from '../../systems/arcane/ArcaneFinaleRuntime';
import { registerCampaign } from '../../systems/campaign/CampaignRegistry';

const T = ARCANE_TEXTS;

// ─── State + cfg types ───────────────────────────────────────────
// Arcane has no cross-mission state. The discriminated cfg keeps
// pre-placed-tower missions and the M10 finale typed end-to-end.

export type ArcaneState = Record<string, never>;
const INITIAL_STATE: ArcaneState = {};

export interface ArcaneFinaleRules {
  heroId: 'arcanist' | 'engineer' | 'forge_mage' | 'shadow_blade';
  heroStartingLevel?: number;
  heroRespawnSeconds?: number;
  chargeRatePerDrain: number;
  cpuTowerHpDefault?: number;
  cpuTowerOwnerIndex?: number;
  towerKillReward?: { gold?: number; xp?: number; ultGold?: number; ultXp?: number };
}

export type ArcaneMissionCfg =
  | { kind: 'plain' }
  | { kind: 'pre_placed'; towers: PrePlacedTowerSpec[] }
  | { kind: 'finale'; finale: ArcaneFinaleRules };

// ─── Mission list ────────────────────────────────────────────────
// Each entry resolves the legacy archetype + per-mission overrides
// into the new shape (`core` discriminated by Base Mode, `campaign`
// payload typed by ArcaneMissionCfg). All ten missions use the
// `coalition` tower kit; campaign-wide via `defaultPlayerFaction`.

const MISSIONS: MissionEntry<ArcaneMissionCfg, ArcaneState>[] = [
  {
    id: 'first_sigil',
    idx: 0,
    name: T.missions.first_sigil.name,
    story: T.missions.first_sigil.story,
    core: {
      mode: 'standard',
      mapId: 'arcane_outskirts',
      difficulty: 'easy',
      waveCount: 8,
      restrictions: { allowedTowerIds: ['arrow', 'cannon', 'coalition_wall'] },
      waveScript: [
        { wave: 1, groups: [{ creepType: 'standard', count: 6, hpScale: 28, speedScale: 1 }], spawnInterval: 600, isBoss: false },
        { wave: 2, groups: [{ creepType: 'standard', count: 8, hpScale: 36, speedScale: 1 }], spawnInterval: 550, isBoss: false },
        { wave: 3, groups: [
          { creepType: 'standard', count: 6, hpScale: 44, speedScale: 1 },
          { creepType: 'arcane_sigil', count: 1, hpScale: 60, speedScale: 1 },
        ], spawnInterval: 500, isBoss: false },
        { wave: 4, groups: [{ creepType: 'fast', count: 8, hpScale: 32, speedScale: 1 }], spawnInterval: 400, isBoss: false },
        { wave: 5, groups: [{ creepType: 'standard', count: 10, hpScale: 60, speedScale: 1 }], spawnInterval: 450, isBoss: false },
        { wave: 6, groups: [
          { creepType: 'standard', count: 8, hpScale: 70, speedScale: 1 },
          { creepType: 'arcane_sigil', count: 1, hpScale: 90, speedScale: 1 },
        ], spawnInterval: 400, isBoss: false },
        { wave: 7, groups: [{ creepType: 'armored', count: 6, hpScale: 110, speedScale: 1 }], spawnInterval: 500, isBoss: false },
        { wave: 8, groups: [{ creepType: 'boss', count: 1, hpScale: 350, speedScale: 1 }], spawnInterval: 0, isBoss: true },
      ],
    },
    campaign: { kind: 'pre_placed', towers: [{ towerId: 'arcane_frost', col: 5, row: 12 }] },
    objectives: {
      star2: { label: T.missions.first_sigil.objectives.star2, predicate: (r) => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 1 },
      star3: { label: T.missions.first_sigil.objectives.star3, predicate: (r) => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
    },
  },

  {
    id: 'the_library',
    idx: 1,
    name: T.missions.the_library.name,
    story: T.missions.the_library.story,
    core: {
      mode: 'standard',
      mapId: 'serpentine',
      difficulty: 'normal',
      waveCount: 12,
      restrictions: { allowedTowerIds: ['arrow', 'cannon', 'coalition_wall', 'sniper'] },
      waveScript: [
        { wave: 1, groups: [{ creepType: 'standard', count: 6, hpScale: 30, speedScale: 1 }], spawnInterval: 600, isBoss: false },
        { wave: 2, groups: [{ creepType: 'standard', count: 8, hpScale: 40, speedScale: 1 }], spawnInterval: 550, isBoss: false },
        { wave: 3, groups: [
          { creepType: 'standard', count: 6, hpScale: 50, speedScale: 1 },
          { creepType: 'arcane_scribe', count: 2, hpScale: 70, speedScale: 1 },
        ], spawnInterval: 500, isBoss: false },
        { wave: 4, groups: [{ creepType: 'fast', count: 10, hpScale: 50, speedScale: 1 }], spawnInterval: 400, isBoss: false },
        { wave: 5, groups: [{ creepType: 'standard', count: 12, hpScale: 70, speedScale: 1 }], spawnInterval: 450, isBoss: false },
        { wave: 6, groups: [
          { creepType: 'standard', count: 8, hpScale: 80, speedScale: 1 },
          { creepType: 'arcane_scribe', count: 2, hpScale: 100, speedScale: 1 },
        ], spawnInterval: 450, isBoss: false },
        { wave: 7, groups: [{ creepType: 'armored', count: 8, hpScale: 130, speedScale: 1 }], spawnInterval: 500, isBoss: false },
        { wave: 8, groups: [{ creepType: 'standard', count: 14, hpScale: 110, speedScale: 1 }], spawnInterval: 400, isBoss: false },
        { wave: 9, groups: [
          { creepType: 'standard', count: 8, hpScale: 130, speedScale: 1 },
          { creepType: 'arcane_scribe', count: 2, hpScale: 150, speedScale: 1 },
        ], spawnInterval: 400, isBoss: false },
        { wave: 10, groups: [{ creepType: 'fast', count: 14, hpScale: 130, speedScale: 1 }], spawnInterval: 350, isBoss: false },
        { wave: 11, groups: [{ creepType: 'armored', count: 10, hpScale: 200, speedScale: 1 }], spawnInterval: 500, isBoss: false },
        { wave: 12, groups: [
          { creepType: 'boss', count: 1, hpScale: 600, speedScale: 1 },
          { creepType: 'arcane_scribe', count: 3, hpScale: 200, speedScale: 1 },
        ], spawnInterval: 600, isBoss: true },
      ],
    },
    campaign: {
      kind: 'pre_placed',
      towers: [
        { towerId: 'arcane_frost', col: 3, row: 4 },
        { towerId: 'arcane_frost', col: 32, row: 18 },
      ],
    },
    objectives: {
      star2: { label: T.missions.the_library.objectives.star2, predicate: (r) => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 3 },
      star3: { label: T.missions.the_library.objectives.star3, predicate: (r) => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
    },
  },

  {
    id: 'ritual_circle',
    idx: 2,
    name: T.missions.ritual_circle.name,
    story: T.missions.ritual_circle.story,
    core: {
      mode: 'standard',
      mapId: 'arcane_pass',
      difficulty: 'normal',
      waveCount: 6,
      goldStart: 75,
      restrictions: { allowedTowerIds: ['arrow', 'cannon', 'coalition_wall', 'sniper', 'arcane_frost'] },
      waveScript: [
        { wave: 1, groups: [{ creepType: 'standard', count: 8, hpScale: 60, speedScale: 1 }], spawnInterval: 600, isBoss: false },
        { wave: 2, groups: [
          { creepType: 'standard', count: 8, hpScale: 80, speedScale: 1 },
          { creepType: 'fast', count: 6, hpScale: 60, speedScale: 1 },
        ], spawnInterval: 500, isBoss: false },
        { wave: 3, groups: [
          { creepType: 'fast', count: 10, hpScale: 90, speedScale: 1 },
          { creepType: 'arcane_archmage_necro', count: 1, hpScale: 110, speedScale: 1 },
        ], spawnInterval: 500, isBoss: false },
        { wave: 4, groups: [
          { creepType: 'armored', count: 8, hpScale: 130, speedScale: 1 },
          { creepType: 'arcane_archmage_storm', count: 1, hpScale: 100, speedScale: 1 },
        ], spawnInterval: 480, isBoss: false },
        { wave: 5, groups: [
          { creepType: 'standard', count: 10, hpScale: 90, speedScale: 1 },
          { creepType: 'arcane_archmage_meteor', count: 1, hpScale: 80, speedScale: 1 },
        ], spawnInterval: 450, isBoss: false },
        { wave: 6, groups: [
          { creepType: 'arcane_archmage_meteor', count: 1, hpScale: 130, speedScale: 1 },
          { creepType: 'arcane_archmage_storm', count: 1, hpScale: 130, speedScale: 1 },
          { creepType: 'arcane_archmage_necro', count: 1, hpScale: 130, speedScale: 1 },
        ], spawnInterval: 1500, isBoss: true },
      ],
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.ritual_circle.objectives.star2, predicate: (r) => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 3 },
      star3: { label: T.missions.ritual_circle.objectives.star3, predicate: (r) => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
    },
  },

  {
    id: 'spire_siege',
    idx: 3,
    name: T.missions.spire_siege.name,
    story: T.missions.spire_siege.story,
    core: {
      mode: 'standard',
      mapId: 'base_arena',
      difficulty: 'normal',
      waveCount: 15,
      restrictions: { allowedTowerIds: ['arrow', 'cannon', 'coalition_wall', 'sniper', 'arcane_frost', 'coalition_root'] },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.spire_siege.objectives.star2, predicate: (r) => r.livesRemaining === r.livesStart },
      star3: { label: T.missions.spire_siege.objectives.star3, predicate: (r) => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
    },
  },

  {
    id: 'crystal_warlords',
    idx: 4,
    name: T.missions.crystal_warlords.name,
    story: T.missions.crystal_warlords.story,
    core: {
      mode: 'standard',
      mapId: 'crossroads',
      difficulty: 'hard',
      waveCount: 5,
      restrictions: { allowedTowerIds: ['arcane_bolt', 'cannon', 'coalition_wall', 'sniper', 'arcane_frost', 'coalition_root'] },
      waveScript: [
        { wave: 1, groups: [
          { creepType: 'standard', count: 4, hpScale: 50, speedScale: 1 },
          { creepType: 'warlord_stalwart', count: 1, hpScale: 70, speedScale: 1 },
        ], spawnInterval: 800, isBoss: false },
        { wave: 2, groups: [
          { creepType: 'fast', count: 4, hpScale: 50, speedScale: 1 },
          { creepType: 'warlord_healer', count: 1, hpScale: 110, speedScale: 1 },
        ], spawnInterval: 800, isBoss: false },
        { wave: 3, groups: [
          { creepType: 'armored', count: 4, hpScale: 80, speedScale: 1 },
          { creepType: 'warlord_champion', count: 1, hpScale: 130, speedScale: 1 },
        ], spawnInterval: 800, isBoss: false },
        { wave: 4, groups: [
          { creepType: 'standard', count: 5, hpScale: 90, speedScale: 1 },
          { creepType: 'warlord_tactician', count: 1, hpScale: 130, speedScale: 1 },
        ], spawnInterval: 800, isBoss: false },
        { wave: 5, groups: [
          { creepType: 'warlord_captain', count: 1, hpScale: 180, speedScale: 1 },
        ], spawnInterval: 0, isBoss: true },
      ],
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.crystal_warlords.objectives.star2, predicate: (r) => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
      star3: { label: T.missions.crystal_warlords.objectives.star3, predicate: (r) => r.livesRemaining === r.livesStart },
    },
  },

  {
    id: 'forced_march',
    idx: 5,
    name: T.missions.forced_march.name,
    story: T.missions.forced_march.story,
    core: {
      mode: 'standard',
      mapId: 'arcane_pass',
      difficulty: 'normal',
      waveCount: 20,
      goldStart: 600,
      autoChainWaves: 5,
      killGoldMult: 0.5,
      restrictions: { allowedTowerIds: ['arcane_bolt', 'arcane_storm', 'coalition_wall', 'sniper', 'arcane_frost', 'coalition_root'] },
      // Generator function matches the legacy procedurally-generated script.
      waveScript: ((): MissionEntry<ArcaneMissionCfg, ArcaneState>['core']['waveScript'] => {
        const w = [];
        for (let i = 1; i <= 20; i++) {
          const isBoss = i === 20;
          const hp = Math.round(35 + i * 14 + i * i * 0.6);
          if (isBoss) {
            w.push({
              wave: 20,
              groups: [
                { creepType: 'boss', count: 1, hpScale: 320, speedScale: 1 },
                { creepType: 'standard', count: 18, hpScale: hp * 0.7, speedScale: 1 },
              ],
              spawnInterval: 180,
              isBoss: true,
            });
            continue;
          }
          const groups: { creepType: string; count: number; hpScale: number; speedScale: number }[] = [];
          const phase = Math.floor((i - 1) / 4);
          if (phase === 0) {
            groups.push({ creepType: 'standard', count: 18, hpScale: hp, speedScale: 1 });
          } else if (phase === 1) {
            groups.push({ creepType: 'standard', count: 14, hpScale: hp, speedScale: 1 });
            groups.push({ creepType: 'fast', count: 10, hpScale: hp * 0.7, speedScale: 1 });
          } else if (phase === 2) {
            groups.push({ creepType: 'armored', count: 10, hpScale: hp * 1.4, speedScale: 1 });
            groups.push({ creepType: 'standard', count: 14, hpScale: hp, speedScale: 1 });
          } else if (phase === 3) {
            groups.push({ creepType: 'fast', count: 14, hpScale: hp * 0.8, speedScale: 1 });
            groups.push({ creepType: 'armored', count: 10, hpScale: hp * 1.3, speedScale: 1 });
          } else {
            groups.push({ creepType: 'standard', count: 16, hpScale: hp, speedScale: 1 });
            groups.push({ creepType: 'armored', count: 10, hpScale: hp * 1.5, speedScale: 1 });
            groups.push({ creepType: 'fast', count: 10, hpScale: hp * 0.9, speedScale: 1 });
          }
          w.push({ wave: i, groups, spawnInterval: 200, isBoss: false });
        }
        return w;
      })(),
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.forced_march.objectives.star2, predicate: (r) => r.won && r.durationMs < 12 * 60 * 1000 },
      star3: { label: T.missions.forced_march.objectives.star3, predicate: (r) => r.won && r.durationMs < 9 * 60 * 1000 },
    },
  },

  {
    id: 'starved_winter',
    idx: 6,
    name: T.missions.starved_winter.name,
    story: T.missions.starved_winter.story,
    // Frugal-archetype defaults fold into core: goldStartMult 0.5,
    // maxTowers 6 — same pattern as Mech M7.
    core: {
      mode: 'standard',
      mapId: 'islands',
      difficulty: 'normal',
      waveCount: 15,
      goldStartMult: 0.5,
      restrictions: {
        allowedTowerIds: ['arcane_bolt', 'arcane_storm', 'coalition_wall', 'arcane_focus', 'arcane_frost', 'coalition_root'],
        maxTowers: 6,
      },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.starved_winter.objectives.star2, predicate: (r) => r.won && r.towerCount <= 5 },
      star3: { label: T.missions.starved_winter.objectives.star3, predicate: (r) => r.livesRemaining === r.livesStart },
    },
  },

  {
    id: 'breach_relay',
    idx: 7,
    name: T.missions.breach_relay.name,
    story: T.missions.breach_relay.story,
    core: {
      mode: 'attacker',
      mapId: 'attacker_assault',
      difficulty: 'normal',
      waveCount: 10,
      restrictions: { allowedTowerIds: ['arcane_bolt', 'arcane_storm', 'coalition_wall', 'arcane_focus', 'arcane_frost', 'coalition_root'] },
      attackerEssencePerWave: 60,
      attackerEssenceGrowthPerWave: 10,
      attackerEssenceCarryoverMult: 2,
      attackerCampMax: 2,
      attackerCampCost: 50,
      attackerCampIncome: 15,
      attackerPaletteFaction: 'coalition',
      attackerLeakThreshold: 12,
      attackerDefenderDifficulty: 'hard',
      attackerPrepOrder: [
        'sustained_fire', 'anti_heavy', 'anti_light', 'anti_medium', 'anti_air',
        'anti_heavy', 'sustained_fire', 'anti_light', 'anti_heavy', 'sustained_fire',
      ],
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.breach_relay.objectives.star2, predicate: (r) => r.won && r.wave <= 6 },
      star3: { label: T.missions.breach_relay.objectives.star3, predicate: (r) => r.won && r.wave <= 4 },
    },
  },

  {
    id: 'allied_circle',
    idx: 8,
    name: T.missions.allied_circle.name,
    story: T.missions.allied_circle.story,
    core: {
      mode: 'circle_coop',
      mapId: 'circle_2p',
      difficulty: 'normal',
      waveCount: 15,
      coopCreepCountMult: 2.5,
      restrictions: { allowedTowerIds: ['arcane_bolt', 'arcane_storm', 'coalition_wall', 'arcane_focus', 'arcane_frost', 'arcane_drain', 'arcane_meteor'] },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.allied_circle.objectives.star2, predicate: (r) => r.won && (r.livesStart - r.livesRemaining) <= 5 },
      star3: { label: T.missions.allied_circle.objectives.star3, predicate: (r) => r.won && r.livesRemaining === r.livesStart },
    },
  },

  {
    id: 'reckoning',
    idx: 9,
    name: T.missions.reckoning.name,
    story: T.missions.reckoning.story,
    core: {
      mode: 'standard',
      mapId: 'arcane_throne_finale',
      difficulty: 'hard',
      waveCount: 999,
      restrictions: {
        allowedTowerIds: [
          'arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus',
          'arcane_drain', 'arcane_meteor', 'arcane_nova',
          'arcane_conduit',
        ],
        noWalls: true,
      },
    },
    campaign: {
      kind: 'finale',
      finale: {
        heroId: 'arcanist',
        heroStartingLevel: 3,
        heroRespawnSeconds: 20,
        chargeRatePerDrain: 0.00156,
        cpuTowerHpDefault: 600,
        towerKillReward: { gold: 50, xp: 50, ultGold: 500, ultXp: 250 },
      },
    },
    objectives: {
      star2: { label: T.missions.reckoning.objectives.star2, predicate: (r) => r.won && r.durationMs < 25 * 60 * 1000 },
      star3: { label: T.missions.reckoning.objectives.star3, predicate: (r) => r.won && (r.custom.heroDeaths ?? 99) === 0 },
    },
  },
];

// ─── Extension ───────────────────────────────────────────────────

export const ARCANE_EXTENSION: CampaignExtension<ArcaneState, ArcaneMissionCfg> = {
  factionId: 'arcane',
  name: T.campaign.name,
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  initialState: INITIAL_STATE,
  defaultMapThemeOverride: 'arcane_crystal',
  defaultPlayerFaction: 'coalition',
  missions: MISSIONS,
  buildRuntime: (_ctx, mission) => {
    if (mission.campaign.kind === 'pre_placed') {
      return arcanePrePlacedRuntime(mission.campaign.towers);
    }
    if (mission.campaign.kind === 'finale') {
      return arcaneFinaleRuntime(mission.campaign.finale);
    }
    return {};
  },
};

// Phase D1c: register the Arcane extension at module load so
// `MissionRunner.start` can feature-detect and route via `startV2`.
registerCampaign(ARCANE_EXTENSION);
