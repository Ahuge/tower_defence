/**
 * Greenward Campaign — The Long Walk. Aspect refactor (Phase D2).
 *
 * Player POV: Master Druid Marra Greenward. The first campaign that
 * uses the `MissionStateAspect` — Wildwood Reserves regen across
 * missions and the campaign-wide Consecration mode-lean tally
 * persist via `GreenwardMissionStateAspect`.
 *
 * Mirror of the legacy `GREENWARD_CAMPAIGN` in `./greenward.ts`.
 * Phase F deletes the legacy.
 *
 * Per-mission scope: every Greenward mission carries Consecration
 * ruins via `kind: 'consecration'` (M1–M9) or `kind: 'final'` (M10,
 * the three-setpiece Caer Lythen finale).
 */
import { h } from 'preact';
import type { CampaignExtension, MissionEntry } from '../../systems/campaign/types';
import type { RuinSpec } from '../../systems/greenward/ConsecrationManager';
import { GREENWARD_TEXTS } from './texts/greenward.texts';
import { greenwardRuntime } from '../../systems/greenward/GreenwardRuntime';
import { greenwardMissionStateAspect } from '../../systems/greenward/GreenwardMissionStateAspect';
import { DEFAULT_GREENWARD_STATE, type GreenwardState } from '../../systems/greenward/WildwoodReserves';
import { registerCampaign } from '../../systems/campaign/CampaignRegistry';
import { GreenwardStatePanel } from '../../ui/campaign/GreenwardStatePanel';

const T = GREENWARD_TEXTS;

export type GreenwardMissionCfg =
  | { kind: 'consecration'; ruins: RuinSpec[] }
  | { kind: 'final'; ruins: RuinSpec[] };

const MISSIONS: MissionEntry<GreenwardMissionCfg, GreenwardState>[] = [
  {
    id: 'boundary_stones', idx: 0,
    archetypeId: 'interrupt',
    name: T.missions.boundary_stones.name,
    story: T.missions.boundary_stones.story,
    core: { mode: 'standard', mapId: 'greenward_boundary', difficulty: 'easy', waveCount: 8 },
    campaign: { kind: 'consecration', ruins: [{ id: 'wayshrine', col: 18, row: 13, mode: 'ceremony' }] },
    objectives: {
      star2: { label: T.missions.boundary_stones.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.boundary_stones.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'salt_meadow', idx: 1,
    archetypeId: 'restriction',
    name: T.missions.salt_meadow.name,
    story: T.missions.salt_meadow.story,
    core: {
      mode: 'standard', mapId: 'greenward_meadow', difficulty: 'normal', waveCount: 10,
      restrictions: { allowedTowerIds: ['nature_bramble', 'nature_root'] },
    },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'cairn_north', col: 14, row: 8,  mode: 'ceremony' },
        { id: 'cairn_south', col: 14, row: 18, mode: 'ceremony' },
        { id: 'barrow',      col: 22, row: 13, mode: 'siege' },
      ],
    },
    objectives: {
      star2: { label: T.missions.salt_meadow.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.salt_meadow.objectives.star3, predicate: (r) => r.won && (r.custom.reservesRemaining as number ?? 100) >= 70 },
    },
  },
  {
    id: 'circle_at_eadwin', idx: 2,
    archetypeId: 'interrupt',
    name: T.missions.circle_at_eadwin.name,
    story: T.missions.circle_at_eadwin.story,
    core: { mode: 'standard', mapId: 'greenward_eadwin', difficulty: 'normal', waveCount: 12 },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'inn_hearth',     col: 18, row: 10, mode: 'mercy' },
        { id: 'village_square', col: 14, row: 15, mode: 'siege' },
      ],
    },
    objectives: {
      star2: { label: T.missions.circle_at_eadwin.objectives.star2, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) },
      star3: { label: T.missions.circle_at_eadwin.objectives.star3, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) && (r.custom.chantInterruptedFastMs as number ?? Infinity) < 60_000 },
    },
  },
  {
    id: 'road_of_crows', idx: 3,
    archetypeId: 'interrupt',
    name: T.missions.road_of_crows.name,
    story: T.missions.road_of_crows.story,
    core: { mode: 'standard', mapId: 'greenward_crows', difficulty: 'normal', waveCount: 10 },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'crossroads',   col: 18, row: 13, mode: 'mercy' },
        { id: 'eastern_road', col: 26, row: 13, mode: 'ceremony' },
      ],
    },
    objectives: {
      star2: { label: T.missions.road_of_crows.objectives.star2, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) },
      star3: { label: T.missions.road_of_crows.objectives.star3, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) && (r.custom.reservesSpent as number ?? Infinity) <= 80 },
    },
  },
  {
    id: 'dry_river', idx: 4,
    archetypeId: 'speedrun',
    name: T.missions.dry_river.name,
    story: T.missions.dry_river.story,
    core: { mode: 'standard', mapId: 'greenward_river', difficulty: 'normal', waveCount: 10 },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'headwater',  col: 30, row: 13, mode: 'ceremony' },
        { id: 'river_west', col: 8,  row: 13, mode: 'siege' },
        { id: 'river_east', col: 18, row: 13, mode: 'siege' },
      ],
    },
    objectives: {
      star2: { label: T.missions.dry_river.objectives.star2, predicate: (r) => r.won && (r.custom.headwaterClaimed as boolean ?? false) },
      star3: { label: T.missions.dry_river.objectives.star3, predicate: (r) => r.won && (r.custom.headwaterClaimed as boolean ?? false) && r.durationMs < 6 * 60 * 1000 },
    },
  },
  {
    id: 'tarrenford', idx: 5,
    archetypeId: 'coop_with_bot',
    name: T.missions.tarrenford.name,
    story: T.missions.tarrenford.story,
    core: { mode: 'circle_coop', mapId: 'greenward_tarrenford', difficulty: 'normal', waveCount: 12 },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'chapel',      col: 14, row: 8,  mode: 'ceremony' },
        { id: 'well',        col: 18, row: 13, mode: 'ceremony' },
        { id: 'wheat_field', col: 22, row: 18, mode: 'ceremony' },
      ],
    },
    objectives: {
      star2: { label: T.missions.tarrenford.objectives.star2, predicate: (r) => r.won && (r.custom.ruinsClaimed as number ?? 0) >= 3 },
      star3: { label: T.missions.tarrenford.objectives.star3, predicate: (r) => r.won && (r.custom.ruinsClaimed as number ?? 0) >= 3 && (r.custom.civiliansKilled as number ?? 0) === 0 },
    },
  },
  {
    id: 'wedding_stone', idx: 6,
    archetypeId: 'frugal',
    name: T.missions.wedding_stone.name,
    story: T.missions.wedding_stone.story,
    // Frugal archetype defaults: goldStartMult 0.5 + maxTowers 6.
    core: {
      mode: 'standard', mapId: 'greenward_weddingstone', difficulty: 'hard', waveCount: 12,
      goldStartMult: 0.5,
      restrictions: { maxTowers: 6 },
    },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'altar',    col: 18, row: 10, mode: 'mercy' },
        { id: 'pavilion', col: 18, row: 18, mode: 'siege' },
      ],
    },
    objectives: {
      star2: { label: T.missions.wedding_stone.objectives.star2, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) },
      star3: { label: T.missions.wedding_stone.objectives.star3, predicate: (r) => r.won && (r.custom.watcherUnharmed as boolean ?? false) && (r.custom.distinctTowerTypesUsed as number ?? 99) <= 2 },
    },
  },
  {
    id: 'stillborn_court', idx: 7,
    archetypeId: 'boss_rush',
    name: T.missions.stillborn_court.name,
    story: T.missions.stillborn_court.story,
    core: { mode: 'standard', mapId: 'greenward_court', difficulty: 'hard', waveCount: 8 },
    campaign: {
      kind: 'consecration',
      ruins: [
        { id: 'court_grounds', col: 14, row: 13, mode: 'siege' },
        { id: 'the_child',     col: 22, row: 13, mode: 'mercy' },
      ],
    },
    objectives: {
      star2: { label: T.missions.stillborn_court.objectives.star2, predicate: (r) => r.won && (r.custom.knightKilled as boolean ?? false) && (r.custom.heraldKilled as boolean ?? false) },
      star3: { label: T.missions.stillborn_court.objectives.star3, predicate: (r) => r.won && (r.custom.knightKilled as boolean ?? false) && (r.custom.heraldKilled as boolean ?? false) && (r.custom.childUnharmed as boolean ?? false) },
    },
  },
  {
    id: 'last_garden', idx: 8,
    archetypeId: 'attacker',
    name: T.missions.last_garden.name,
    story: T.missions.last_garden.story,
    // Attacker archetype default mapId is 'attacker_assault' but
    // Greenward M9 overrides to its own map.
    core: {
      mode: 'attacker', mapId: 'greenward_lastgarden', difficulty: 'hard', waveCount: 8,
    },
    campaign: {
      kind: 'consecration',
      ruins: [{ id: 'watchtower', col: 6, row: 13, mode: 'siege' }],
    },
    objectives: {
      star2: { label: T.missions.last_garden.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.last_garden.objectives.star3, predicate: (r) => r.won && (r.custom.distinctCreepUnitsSent as number ?? 0) >= 3 },
    },
  },
  {
    id: 'caer_lythen', idx: 9,
    archetypeId: 'final_greenward',
    name: T.missions.caer_lythen.name,
    story: T.missions.caer_lythen.story,
    core: { mode: 'standard', mapId: 'greenward_cathedral', difficulty: 'hard', waveCount: 999 },
    campaign: {
      kind: 'final',
      ruins: [
        { id: 'courtyard', col: 6,  row: 13, mode: 'siege' },
        { id: 'nave',      col: 18, row: 13, mode: 'mercy' },
        { id: 'throne',    col: 30, row: 13, mode: 'siege' },
      ],
    },
    objectives: {
      star2: { label: T.missions.caer_lythen.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.caer_lythen.objectives.star3, predicate: (r) => r.won && (r.custom.naveCommittedNonSiege as boolean ?? false) },
    },
  },
];

export const GREENWARD_EXTENSION: CampaignExtension<GreenwardState, GreenwardMissionCfg> = {
  factionId: 'nature',
  name: T.campaign.name,
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  initialState: DEFAULT_GREENWARD_STATE,
  defaultPlayerFaction: 'nature',
  missions: MISSIONS,
  missionState: greenwardMissionStateAspect,
  // Per-extension UI surface — the campaign lobby reads `ui.panels`
  // and renders each panel's component above the mission list.
  // Replaces the prior CampaignStatePanelRegistry side-effect-import
  // pattern. The `state` argument the lobby passes is currently ignored
  // by GreenwardStatePanel (which reads via the existing module-level
  // getters in WildwoodReserves / ModeLeanTracker / PersistedTowerState);
  // the typed channel exists for future panels that want pure
  // state-as-props.
  ui: {
    panels: [
      {
        id: 'wildwood-reserves',
        render: (_state) => h(GreenwardStatePanel, { factionId: 'nature' }),
      },
    ],
  },
  buildRuntime: (_ctx, mission) => {
    return greenwardRuntime({
      rules: { ruins: mission.campaign.ruins },
      isFinale: mission.campaign.kind === 'final',
    });
  },
};

registerCampaign(GREENWARD_EXTENSION);
