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
import { registerCampaign } from '../../systems/campaign/CampaignRegistry';
import {
  DEFAULT_SNAKE_EYES_STATE,
  type SnakeEyesState,
} from '../../systems/voidc/DebtTracker';
import { h } from 'preact';
import { snakeEyesMissionStateAspect } from '../../systems/voidc/SnakeEyesMissionStateAspect';
import {
  SnakeEyesMissionController,
  getActiveSnakeEyesController,
} from '../../systems/voidc/SnakeEyesMissionController';
import { VoidStatePanel } from '../../ui/campaign/VoidStatePanel';
import { getSnakeEyesState } from '../../systems/voidc/DebtTracker';
import {
  buildSnakeEyesM8Waves,
  buildSnakeEyesM10Waves,
} from './SnakeEyesWaveScripts';

const T = SNAKE_EYES_TEXTS;

// Re-export the canonical state type from DebtTracker so legacy
// consumers importing `SnakeEyesState` from this file still resolve.
// The previous declaration `Record<string, never>` was wrong — it
// contradicted the DebtTracker's typed `SnakeEyesState` interface
// and would have clobbered the persistent state slot if the extension
// had ever written through `ext.initialState`.
export type { SnakeEyesState };

// All 10 Snake Eyes missions are structurally "plain" — there are
// no per-mission ruin specs / pylon specs / etc. The Pactbook and
// debt systems initialise globally regardless of mission. M10 will
// gain a `{ kind: 'final' }` payload when the Counterfactual
// controller lands and starts needing per-mission config.
export type SnakeEyesMissionCfg =
  | { kind: 'plain' }
  | { kind: 'final' }
  // Kept in the union for any in-flight migration that pinned to the
  // throw-on-launch behaviour. M10 now ships as `kind: 'final'`
  // (CounterfactualMirrorController wired). Remove once no fixtures
  // reference this discriminator.
  | { kind: 'final_unimplemented' };

const MISSIONS: MissionEntry<SnakeEyesMissionCfg, SnakeEyesState>[] = [
  {
    id: 'last_hand_talavar', idx: 0,
    archetypeId: 'interrupt',
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
    archetypeId: 'interrupt',
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
    archetypeId: 'interrupt',
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
    archetypeId: 'interrupt',
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
    archetypeId: 'speedrun',
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
    archetypeId: 'coop_with_bot',
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
    archetypeId: 'restriction',
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
    archetypeId: 'frugal',
    name: T.missions.snake_eyes_proper.name,
    story: T.missions.snake_eyes_proper.story,
    // Frugal archetype defaults fold in: goldStartMult 0.5, maxTowers 6.
    // Per-mission goldStart 200 overrides the multiplier path.
    // Custom wave script puts the Collector boss on wave 7 — the
    // default generator can't produce `void_collector`. See
    // SnakeEyesWaveScripts.ts for the per-wave composition rationale.
    core: {
      mode: 'standard', mapId: 'gauntlet', difficulty: 'hard', waveCount: 12,
      goldStart: 200, goldStartMult: 0.5,
      restrictions: { maxTowers: 6 },
      waveScript: buildSnakeEyesM8Waves(),
    },
    campaign: { kind: 'plain' },
    // Star predicates read DebtTracker state directly because
    // `markCollectorDefeated(missionIdx)` writes `collectorDefeatedAt`
    // synchronously during gameplay (in CollectorBehavior.onDefeated
    // → SnakeEyesMissionController.onCollectorMaybeKilled). The flag
    // is intact at finalize time — it doesn't get consumed until the
    // NEXT mission's applyMissionStart. The hardcoded `=== 7` matches
    // this entry's idx (snake_eyes_proper is M8 in 1-indexed, idx 7
    // in 0-indexed).
    objectives: {
      star2: {
        label: T.missions.snake_eyes_proper.objectives.star2,
        predicate: (r) => r.won && getSnakeEyesState().collectorDefeatedAt === 7,
      },
      star3: {
        label: T.missions.snake_eyes_proper.objectives.star3,
        // Star-2 condition + Debt didn't grow this mission. The
        // pre-mission Debt snapshot is captured in the controller's
        // ctor (after tickBetweenMissions applied the interest tick)
        // and read via getActiveSnakeEyesController. Safe at finalize
        // — predicates run before the next mission's controller
        // construction clears the active runtime.
        predicate: (r) => {
          if (!r.won) return false;
          if (getSnakeEyesState().collectorDefeatedAt !== 7) return false;
          const ctrl = getActiveSnakeEyesController();
          if (!ctrl) return false;
          return getSnakeEyesState().debt <= ctrl.getDebtAtStart();
        },
      },
    },
  },
  {
    id: 'burning_pactbook', idx: 8,
    archetypeId: 'attacker',
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
    archetypeId: 'final_void',
    name: T.missions.counterfactual_mirror.name,
    story: T.missions.counterfactual_mirror.story,
    // M10 finale — three setpieces (Approach / Mirror Lane / The
    // Table) driven by CounterfactualMirrorController. Win condition
    // is bossKilled, not wave-clear-N. waveCount 999 mirrors the
    // Mech sabotage finale's "endless until win-trigger" pattern.
    // GameScene's instanceof Snake Eyes block detects controller.isWon
    // / isLost per frame and fires the corresponding game-over.
    core: {
      mode: 'standard',
      mapId: 'gauntlet',
      difficulty: 'hard',
      waveCount: 999,
      waveScript: buildSnakeEyesM10Waves(),
    },
    campaign: { kind: 'final' },
    objectives: {
      star2: {
        label: T.missions.counterfactual_mirror.objectives.star2,
        predicate: (r) => r.won,
      },
      star3: {
        // Star 3 — Mirror Lane won outright (laneGap >= 2 per
        // CounterfactualMirrorController.mirrorLaneWonOutright).
        // Reads directly from the active controller (typed accessor;
        // pattern symmetric with M8 star-3). The controller is still
        // alive at finalize time — MissionRunner.finalize doesn't
        // clear it until after stars are computed. No GameScene IIFE
        // / MissionResult.custom contract needed (deleted in the same
        // commit; the field was orphaned with this refactor).
        label: T.missions.counterfactual_mirror.objectives.star3,
        predicate: (r) => {
          if (!r.won) return false;
          const ctrl = getActiveSnakeEyesController();
          return ctrl?.getM10Controller()?.mirrorLaneWonOutright() === true;
        },
      },
    },
  },
];

export const SNAKE_EYES_EXTENSION: CampaignExtension<SnakeEyesState, SnakeEyesMissionCfg> = {
  factionId: 'void',
  name: T.campaign.name,
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  initialState: DEFAULT_SNAKE_EYES_STATE,
  defaultPlayerFaction: 'void',
  missions: MISSIONS,
  missionState: snakeEyesMissionStateAspect,
  // Per-extension UI surface. The lobby reads `ui.panels` and renders
  // VoidStatePanel above the mission list. Replaces the prior
  // CampaignStatePanelRegistry side-effect-import path. `state` is
  // currently unused by the panel (it reads via getSnakeEyesState
  // module getter); the typed channel exists for future panels that
  // want pure state-as-props.
  ui: {
    panels: [
      {
        id: 'debt-meter',
        render: (_state) => h(VoidStatePanel, { factionId: 'void' }),
      },
    ],
  },
  buildRuntime: (ctx, mission) => {
    // Defensive: any leftover `final_unimplemented` from a stale
    // fixture lands here as an explicit refusal. The production M10
    // entry now ships as `kind: 'final'` and constructs the
    // CounterfactualMirrorController below — this throw guards a
    // future regression where the discriminator gets pinned back
    // mid-merge.
    if (mission.campaign.kind === 'final_unimplemented') {
      throw new Error(
        `[Snake Eyes] M10 (${mission.id}) marked final_unimplemented — ` +
        `the cfg discriminator should be 'final' now. See snake-eyes.ts.`,
      );
    }
    // Construct the per-mission controller. Owns the Pactbook + leak
    // counter + wager-resolution logic + Wager-effect dispatch +
    // (M10 only) the wrapped CounterfactualMirrorController.
    // Returned as the `lifecycle` aspect so MissionRunner stores it
    // on `active.runtime.lifecycle`; `LoadingScreen` reaches it via
    // `getActiveSnakeEyesController()`; the gameplay aspect closure-
    // captures it for the per-event hooks below; the missionState
    // aspect reads it via the same typed accessor in `applyMissionResult`.
    const isM10 = mission.campaign.kind === 'final';
    const controller = new SnakeEyesMissionController({
      missionIdx: ctx.missionIdx,
      isM10,
    });
    return {
      lifecycle: controller,
      gameplay: {
        onCreepReached(creepId: number) {
          controller.recordLeak();
          // Collector reached the exit → silent removal from the
          // active-Collector map (leaking the Collector is NOT a
          // defeat; no markCollectorDefeated). The controller's
          // onCollectorMaybeReached is a cheap no-op when the id
          // isn't in the map, so we can call it for every creep.
          controller.onCollectorMaybeReached(creepId);
        },
        onCreepKilled(creepId: number) {
          // Collector kill detection — same pattern as reached.
          // Behavior.onDefeated calls markCollectorDefeated which
          // writes state.collectorDefeatedAt; M8 star predicates
          // read that synchronously at finalize.
          controller.onCollectorMaybeKilled(creepId);
        },
        // Wave-cleared Wager hook (Phase 3): snapshot leak count at
        // wave start so the cleared hook can derive the `leaked` flag.
        // These don't need scene access — the controller owns the
        // counter + flag bag.
        onWaveStarted(waveNum: number) {
          controller.onWaveStartedHook(waveNum);
        },
        onWaveCleared(waveNum: number) {
          controller.onWaveClearedHook(waveNum);
          // M10 setpiece advancement — Approach wave clear advances
          // the stage; Mirror Lane wave clear records on the player
          // side of the lane race. No-op on M1-M9 (controller's M10
          // sub-controller is null).
          controller.m10OnWaveCleared(waveNum);
        },
      },
    };
    // Per-tower trait injection + Wager onMissionStart side effects
    // live in GameScene (need scene-side handles to TowerManager +
    // EconomyManager) — see the SnakeEyesMissionController instanceof
    // branch in GameScene.create after the runtime install.
  },
};

// Phase E1: Snake Eyes registers like the other 3 campaigns. M1-M9
// flow through the aspect path. M10 is guarded by the `buildRuntime`
// throw on `kind: 'final_unimplemented'` — `startV2` catches the
// throw, warns, and refuses the launch (same UX as the legacy stub
// refusal). Once the Counterfactual controller lands, M10's payload
// flips from `final_unimplemented` to a real `{ kind: 'final', ... }`
// and the throw disappears.
registerCampaign(SNAKE_EYES_EXTENSION);
