/**
 * Snake Eyes Campaign — The Counterfactual's Mirror. Aspect refactor (Phase D3).
 *
 * Player POV: Ardax, debtor gambler. The campaign's two unique
 * systems (Pactbook, Debt × Divergence) run as standalone global
 * systems (`Pactbook`, `DebtTracker`, etc.) rather than through
 * per-mission config — so the v2 mission entries are mostly plain.
 *
 * **Registration deferred.** Snake Eyes M10 (`counterfactual_mirror`)
 * uses the legacy `final_void` STUB_ARCHETYPE — the Counterfactual
 * three-setpiece controller + Mirror Lane paired-grid runtime are
 * unimplemented (per the campaign plan doc). Registering this
 * extension would route M10 through `startV2`, which lacks the
 * stub-refusal check the legacy `start` enforces — M10 would
 * launch into a broken 999-wave run with no Counterfactual
 * controller.
 *
 * Instead: this file ships the new-shape data + parity test so
 * Phase F's "delete the legacy" doesn't lose anything. When the
 * Counterfactual controller lands, the follow-up commit registers
 * the extension (uncomment the `registerCampaign(...)` call and
 * add the side-effect import to main.ts).
 *
 * In the meantime, legacy `SNAKE_EYES_CAMPAIGN` continues to drive
 * Snake Eyes — M1-M9 via the normal flow, M10 refused at launch.
 */
import type { CampaignExtension, MissionEntry } from '../../systems/campaign/types';
import { SNAKE_EYES_TEXTS } from './texts/snake-eyes.texts';

const T = SNAKE_EYES_TEXTS;

export type SnakeEyesState = Record<string, never>;
const INITIAL_STATE: SnakeEyesState = {};

// All 10 Snake Eyes missions are structurally "plain" — there are
// no per-mission ruin specs / pylon specs / etc. The Pactbook and
// debt systems initialise globally regardless of mission. M10 will
// gain a `{ kind: 'final' }` payload when the Counterfactual
// controller lands and starts needing per-mission config.
export type SnakeEyesMissionCfg =
  | { kind: 'plain' }
  | { kind: 'final_unimplemented' };

const MISSIONS: MissionEntry<SnakeEyesMissionCfg, SnakeEyesState>[] = [
  {
    id: 'last_hand_talavar', idx: 0,
    name: T.missions.last_hand_talavar.name,
    story: T.missions.last_hand_talavar.story,
    core: { mode: 'standard', mapId: 'crossroads', difficulty: 'easy', waveCount: 8 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.last_hand_talavar.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.last_hand_talavar.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'road_west', idx: 1,
    name: T.missions.road_west.name,
    story: T.missions.road_west.story,
    core: { mode: 'standard', mapId: 'plains', difficulty: 'normal', waveCount: 10 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.road_west.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.road_west.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'silvermine_creek', idx: 2,
    name: T.missions.silvermine_creek.name,
    story: T.missions.silvermine_creek.story,
    core: { mode: 'standard', mapId: 'crossroads', difficulty: 'normal', waveCount: 12 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.silvermine_creek.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.silvermine_creek.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'ferrymans_game', idx: 3,
    name: T.missions.ferrymans_game.name,
    story: T.missions.ferrymans_game.story,
    core: { mode: 'standard', mapId: 'crossroads', difficulty: 'normal', waveCount: 12 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.ferrymans_game.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.ferrymans_game.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'wheel_of_cipher', idx: 4,
    name: T.missions.wheel_of_cipher.name,
    story: T.missions.wheel_of_cipher.story,
    // Speedrun archetype defaults: waveCount 20, normal. M5 overrides
    // waveCount to 12 — keep that override.
    core: { mode: 'standard', mapId: 'serpentine', difficulty: 'normal', waveCount: 12 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.wheel_of_cipher.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.wheel_of_cipher.objectives.star3, predicate: (r) => r.won && r.durationMs <= 6 * 60 * 1000 },
    },
  },
  {
    id: 'theris_goodbye', idx: 5,
    name: T.missions.theris_goodbye.name,
    story: T.missions.theris_goodbye.story,
    core: { mode: 'circle_coop', mapId: 'plains', difficulty: 'normal', waveCount: 12 },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.theris_goodbye.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.theris_goodbye.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'mirror_walkers', idx: 6,
    name: T.missions.mirror_walkers.name,
    story: T.missions.mirror_walkers.story,
    core: {
      mode: 'standard', mapId: 'fortress', difficulty: 'normal', waveCount: 14,
      restrictions: { allowedTowerIds: ['void_gambler', 'void_spike', 'void_rift', 'void_oblivion'] },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.mirror_walkers.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.mirror_walkers.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'snake_eyes_proper', idx: 7,
    name: T.missions.snake_eyes_proper.name,
    story: T.missions.snake_eyes_proper.story,
    // Frugal archetype defaults fold in: goldStartMult 0.5, maxTowers 6.
    // Per-mission goldStart 200 overrides the multiplier path.
    core: {
      mode: 'standard', mapId: 'gauntlet', difficulty: 'hard', waveCount: 12,
      goldStart: 200, goldStartMult: 0.5,
      restrictions: { maxTowers: 6 },
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.snake_eyes_proper.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.snake_eyes_proper.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'burning_pactbook', idx: 8,
    name: T.missions.burning_pactbook.name,
    story: T.missions.burning_pactbook.story,
    core: {
      mode: 'attacker', mapId: 'attacker_assault', difficulty: 'normal', waveCount: 10,
      attackerEssencePerWave: 80,
      attackerLeakThreshold: 6,
      attackerPaletteFaction: 'void',
      attackerDefenderDifficulty: 'normal',
    },
    campaign: { kind: 'plain' },
    objectives: {
      star2: { label: T.missions.burning_pactbook.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.burning_pactbook.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
  {
    id: 'counterfactual_mirror', idx: 9,
    name: T.missions.counterfactual_mirror.name,
    story: T.missions.counterfactual_mirror.story,
    core: { mode: 'standard', mapId: 'gauntlet', difficulty: 'hard', waveCount: 999 },
    // `final_unimplemented` — the cfg discriminator preserves the
    // legacy `STUB_ARCHETYPES.final_void` semantics: this mission
    // shouldn't launch through any path until the Counterfactual
    // three-setpiece controller is built. The extension is NOT
    // registered, so M10 stays on the legacy path's stub refusal
    // for now.
    campaign: { kind: 'final_unimplemented' },
    objectives: {
      star2: { label: T.missions.counterfactual_mirror.objectives.star2, predicate: (r) => r.won },
      star3: { label: T.missions.counterfactual_mirror.objectives.star3, predicate: (r) => r.won && r.perfectRun },
    },
  },
];

export const SNAKE_EYES_EXTENSION: CampaignExtension<SnakeEyesState, SnakeEyesMissionCfg> = {
  factionId: 'void',
  name: T.campaign.name,
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  initialState: INITIAL_STATE,
  defaultPlayerFaction: 'void',
  missions: MISSIONS,
  buildRuntime: () => ({}),
};

// INTENTIONALLY UNREGISTERED. See file header — M10's Counterfactual
// controller isn't implemented yet; registering would let M10 launch
// into a broken state. Uncomment when the controller lands:
//
//   registerCampaign(SNAKE_EYES_EXTENSION);
