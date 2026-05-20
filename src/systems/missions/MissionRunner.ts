/**
 * MissionRunner — orchestrates a single campaign mission run.
 *
 * Lifecycle:
 *   1. CampaignLobby calls `MissionRunner.start(campaignDef, missionIdx)`.
 *   2. Runner builds a `MissionContext`, threads it into `GameScene.init`
 *      via a registry slot the scene reads on boot. The pre-mission
 *      story modal is owned by the lobby — runner just starts the scene.
 *   3. GameScene runs as normal with mission overrides applied (lives,
 *      gold, waveCount, restrictions). On game-end, the scene fires
 *      the `gameOver` / `gameWon` EventBus events.
 *   4. `finalize(result)` evaluates the mission's star objectives and
 *      calls `PlayerProfile.recordMissionResult` to persist stars.
 *   5. The lobby re-mounts on its own; the runner doesn't navigate.
 */

import type {
  CampaignExtension, MissionEntry, CampaignCtx,
  MissionResult, MissionRestrictions, StarCount,
} from '../campaign/types';
import type { FactionId } from '../../data/Factions';
import { UIBridge } from '../../ui/UIBridge';
import { Analytics } from '../AnalyticsClient';
import { PlayerProfile } from '../profile/PlayerProfile';
import { ParametricStory } from '../campaign/ParametricStory';
import { getCampaignExtension } from '../campaign/CampaignRegistry';

/** Subset of a mission a GameScene-side consumer needs. Kept small so
 *  the runtime contract is stable across the schema evolution. */
export interface MissionContext {
  campaignFactionId: FactionId;
  missionId: string;
  missionIdx: number;
  archetypeId: string;
  restrictions: MissionRestrictions;
}

class MissionRunnerClass {
  /** The mission currently being played, if any. Null between runs.
   *  Phase E4: holds the new-shape `CampaignExtension` + `MissionEntry`
   *  directly — the legacy `CampaignDef` / `MissionDef` cast bridge is
   *  gone now that every campaign is registered as an extension and
   *  `start` redirects to `startV2`. `archetypeId` is captured because
   *  `MissionEntry` has no `archetype` field; finalize / abort emit
   *  the synthesized `v2:${mode}` value on analytics. */
  private active: {
    ext: CampaignExtension<unknown, unknown>;
    mission: MissionEntry<unknown, unknown>;
    archetypeId: string;
    startedAt: number;
  } | null = null;

  /** Start a mission. Returns true if the launch succeeded.
   *
   *  Phase E3: this used to host a 100-line legacy body that read
   *  `mission.archetype`, merged archetype defaults with per-mission
   *  overrides, and threaded 25 fields into `UIBridge.startScene`.
   *  Every campaign now ships as a `CampaignExtension` registered
   *  in `CampaignRegistry`; the legacy body is dead code. This
   *  function is now a registry lookup + `startV2` redirect — every
   *  caller (CampaignLobbyScreen, GameOverScreen, testHook) keeps
   *  passing legacy `CampaignDef` objects, but the dispatch reads
   *  only the factionId.
   *
   *  Returns false if no extension is registered for the faction —
   *  a runtime guard against a future regression where a campaign
   *  module fails to load. */
  start(campaign: { factionId: FactionId }, missionIdx: number): boolean {
    const ext = getCampaignExtension(campaign.factionId);
    if (!ext) {
      console.warn(`[MissionRunner] no CampaignExtension registered for faction ${campaign.factionId} — cannot launch mission ${missionIdx}`);
      return false;
    }
    return this.startV2(ext, missionIdx);
  }

  /** Called by GameScene when a campaign mission ends. The scene knows
   *  it's a mission run because `missionContext` was passed at init.
   *  Runner evaluates objectives, persists stars, and emits analytics. */
  finalize(result: MissionResult): StarCount {
    const session = this.active;
    if (!session) {
      console.warn('[MissionRunner] finalize called with no active mission');
      return 0;
    }
    const mission = session.mission;
    // Snapshot prior stars BEFORE recordMissionResult so we can detect
    // first-completion (drives the once-per-campaign campaign_completed
    // analytics emit at the bottom).
    const priorStars = PlayerProfile.getMissionStars(session.ext.factionId, mission.idx);
    let stars: StarCount = 0;
    if (result.won) {
      stars = 1;
      const star2 = mission.objectives.star2;
      const star3 = mission.objectives.star3;
      if (star2 && star2.predicate(result)) stars = 2;
      if (stars === 2 && star3 && star3.predicate(result)) stars = 3;
    }

    PlayerProfile.recordMissionResult(session.ext.factionId, mission.idx, stars);

    // v2: MissionStateAspect.applyMissionResult — writes cross-mission
    // state at mission-end (e.g. Greenward's Wildwood reserves spend
    // on a Ceremony mission, Snake Eyes' Pactbook debt update).
    // `tickBetweenMissions` runs at the START of the NEXT mission
    // (see startV2). Resolved via the campaign registry: legacy
    // missions don't register an extension so this branch is skipped
    // for them.
    //
    // NOTE: this runs AFTER `recordMissionResult(stars)` above, so a
    // MissionStateAspect impl can't influence stars (its updates are
    // strictly post-stars). If a future campaign wants
    // state-derived star bonuses ("you finished with >50 reserves
    // = bonus star"), the ordering needs to flip — applyMissionResult
    // first, then stars computed from the new state. Phase E item.
    const ext = getCampaignExtension(session.ext.factionId);
    if (ext?.missionState) {
      try {
        const prev = ext.missionState.read();
        const next = ext.missionState.applyMissionResult(prev, result);
        if (next && typeof next === 'object') {
          ext.missionState.write(next);
        }
      } catch (err) {
        console.warn(`[MissionRunner.v2] applyMissionResult threw for ${mission.id}:`, err);
      }
    }

    if (result.won) {
      Analytics.track('mission_completed', {
        campaignFactionId: session.ext.factionId,
        missionIdx: mission.idx,
        archetypeId: session.archetypeId,
        stars,
        elapsedMs: result.durationMs,
      });
    } else {
      Analytics.track('mission_failed', {
        campaignFactionId: session.ext.factionId,
        missionIdx: mission.idx,
        archetypeId: session.archetypeId,
        atWave: result.wave,
      });
    }

    // Detect campaign completion — when the final mission just earned
    // its first star (priorStars 0 → stars >= 1). Without the prior-
    // stars guard, replays of the final mission would re-fire the
    // analytics every time and inflate the campaign-clear count.
    if (result.won
      && mission.idx === session.ext.missions.length - 1
      && priorStars === 0) {
      Analytics.track('campaign_completed', {
        campaignFactionId: session.ext.factionId,
        totalStars: PlayerProfile.getCampaignTotalStars(session.ext.factionId),
      });
    }

    this.active = null;
    return stars;
  }

  /**
   * Phase B (aspect refactor) — alternate launch path for campaigns
   * that have been ported to `CampaignExtension`. Resolves the
   * per-mission RuntimeAspects bundle, applies `MissionState`
   * dynamic overrides if present, and threads the bundle through
   * `UIBridge.startScene` as `campaignRuntime`.
   *
   * Phase B has no callers — every shipped campaign still drives
   * the legacy `start` path above. Phases C/D rewrite each campaign
   * to a `CampaignExtension` and switch the lobby to route through
   * `startV2`. Phase E deletes the legacy `start` body.
   */
  startV2<TState, TCfg>(
    ext: CampaignExtension<TState, TCfg>,
    missionIdx: number,
  ): boolean {
    const baseMission = ext.missions[missionIdx];
    if (!baseMission) {
      console.warn(`[MissionRunner.v2] no mission at idx ${missionIdx} in campaign ${ext.factionId}`);
      return false;
    }
    // Read state (defaults if first run); let MissionState aspect
    // transform the entry. Wholesale rewrite — `applyDynamicOverrides`
    // returns a NEW entry rather than a delta merge.
    //
    // Order: tickBetweenMissions FIRST (writes between-mission state
    // changes like Greenward's Wildwood reserves regen so the new
    // values are visible to applyDynamicOverrides), THEN read the
    // possibly-ticked state and pass it to applyDynamicOverrides.
    let state = ext.missionState
      ? ext.missionState.read()
      : ext.initialState;
    if (ext.missionState?.tickBetweenMissions) {
      try {
        const ticked = ext.missionState.tickBetweenMissions(state);
        if (ticked && typeof ticked === 'object') {
          state = ticked;
          ext.missionState.write(state);
        }
      } catch (err) {
        console.warn(`[MissionRunner.v2] tickBetweenMissions threw for ${baseMission.id}:`, err);
      }
    }
    let mission: MissionEntry<TCfg, TState> = baseMission;
    if (ext.missionState?.applyDynamicOverrides) {
      try {
        mission = ext.missionState.applyDynamicOverrides(state, baseMission);
      } catch (err) {
        console.warn(`[MissionRunner.v2] applyDynamicOverrides threw for ${baseMission.id}:`, err);
      }
    }

    const ctx: CampaignCtx<TState> = {
      factionId: ext.factionId,
      missionIdx: mission.idx,
      state,
    };
    // `buildRuntime` may throw for missions whose runtime isn't yet
    // implemented (e.g. Snake Eyes M10 `final_unimplemented` until
    // the Counterfactual controller lands). Match the legacy stub-
    // refusal UX: warn + refuse the launch.
    let runtime;
    try {
      runtime = ext.buildRuntime(ctx, mission);
    } catch (err) {
      console.warn(`[MissionRunner.v2] buildRuntime threw for ${mission.id} — mission cannot launch:`, err);
      return false;
    }

    const archetypeId = `v2:${mission.core.mode}`;
    this.active = {
      ext: ext as CampaignExtension<unknown, unknown>,
      mission: mission as MissionEntry<unknown, unknown>,
      archetypeId,
      startedAt: Date.now(),
    };

    Analytics.track('mission_started', {
      campaignFactionId: ext.factionId,
      missionIdx: mission.idx,
      archetypeId,
    });

    // Story resolution — UISurface.parametricStory takes precedence
    // when present; otherwise fall back to the literal entry.story.
    const story = ext.ui?.parametricStory
      ? ext.ui.parametricStory(mission as MissionEntry<unknown, TState>, { state, lastResult: null })
      : ParametricStory.resolve(mission.story, { state, lastResult: null });

    // Phase C4: GameScene's post-game finalize block is gated on
    // `this.missionContext` being non-null. Thread one through so v2-
    // routed missions emit their mission_completed analytics + record
    // stars on PlayerProfile + render the post-mission UI the same
    // way legacy missions do. The legacy `MissionRestrictions` field
    // is the merged restriction set off `mission.core.restrictions`.
    const missionContext: MissionContext = {
      campaignFactionId: ext.factionId,
      missionId: mission.id,
      missionIdx: mission.idx,
      archetypeId: `v2:${mission.core.mode}`,
      restrictions: mission.core.restrictions ?? {},
    };

    UIBridge.startScene('GameScene', {
      mode: mission.core.mode,
      faction: mission.core.faction ?? ext.defaultPlayerFaction ?? 'arcane',
      map: mission.core.mapId,
      difficulty: mission.core.difficulty ?? 'normal',
      modifier: mission.core.modifier ?? null,
      heroId: mission.core.mode === 'hero_defense' ? mission.core.heroId : null,
      creepFaction: mission.core.creepFaction ?? ext.factionId,
      waveCount: mission.core.waveCount,
      missionContext,
      // Phase B: only the engine-level Core fields ride the legacy
      // passthrough. Campaign-specific knobs (finaleRules, sabotageRules,
      // etc.) move into the runtime aspect bundle.
      missionGoldStart: mission.core.goldStart,
      missionGoldStartMult: mission.core.goldStartMult,
      missionLives: mission.core.lives,
      missionWaveScript: mission.core.waveScript,
      missionMapThemeOverride: mission.core.mapThemeOverride ?? ext.defaultMapThemeOverride,
      missionAutoChainWaves: mission.core.autoChainWaves,
      missionKillGoldMult: mission.core.killGoldMult,
      ...(mission.core.mode === 'attacker' ? {
        missionAttackerEssencePerWave: mission.core.attackerEssencePerWave,
        missionAttackerPaletteFaction: mission.core.attackerPaletteFaction,
        missionAttackerLeakThreshold: mission.core.attackerLeakThreshold,
        missionAttackerDefenderDifficulty: mission.core.attackerDefenderDifficulty,
        missionAttackerPrepOrder: mission.core.attackerPrepOrder,
        missionAttackerEssenceGrowthPerWave: mission.core.attackerEssenceGrowthPerWave,
        missionAttackerEssenceCarryoverMult: mission.core.attackerEssenceCarryoverMult,
        missionAttackerCampMax: mission.core.attackerCampMax,
        missionAttackerCampCost: mission.core.attackerCampCost,
        missionAttackerCampIncome: mission.core.attackerCampIncome,
      } : {}),
      ...(mission.core.mode === 'circle_coop' ? {
        missionCoopCreepCountMult: mission.core.coopCreepCountMult,
      } : {}),
      // The new path — what makes this `startV2` rather than `start`.
      campaignRuntime: runtime,
      loadingMissionTitle: mission.name,
      loadingMissionStory: story,
      loadingRequiresContinue: true,
    });
    return true;
  }

  /** True while a mission is in flight. Used by GameScene to gate
   *  mission-vs-non-mission code paths. */
  isActive(): boolean {
    return this.active !== null;
  }

  /** Returns the active session's extension + mission, or null. The
   *  only caller (GameScene's post-finalize block) had captured the
   *  result but never used it — calling code re-resolves via the
   *  campaign registry. Kept for compatibility / future use. */
  getActive(): { ext: CampaignExtension<unknown, unknown>; mission: MissionEntry<unknown, unknown> } | null {
    if (!this.active) return null;
    return { ext: this.active.ext, mission: this.active.mission };
  }

  /** Bail out without finalizing — used when the player quits to
   *  menu mid-mission. No stars awarded, no analytics emitted. */
  abort(): void {
    if (!this.active) return;
    Analytics.track('mission_failed', {
      campaignFactionId: this.active.ext.factionId,
      missionIdx: this.active.mission.idx,
      archetypeId: this.active.archetypeId,
      atWave: 0,
    });
    this.active = null;
  }
}

export const MissionRunner = new MissionRunnerClass();
