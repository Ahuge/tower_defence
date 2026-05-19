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

import type { CampaignDef, MissionDef, MissionOverrides, MissionResult, StarCount } from '../../data/campaigns/CampaignDef';
import type { FactionId } from '../../data/Factions';
import { getArchetype, isArchetypeStub } from '../../data/campaigns/MissionArchetypes';
import { UIBridge } from '../../ui/UIBridge';
import { Analytics } from '../AnalyticsClient';
import { PlayerProfile } from '../profile/PlayerProfile';
import { CampaignState } from '../campaign/CampaignState';
import { ParametricStory } from '../campaign/ParametricStory';
// Phase B (aspect refactor): startV2 path. Feature-detected via
// `'buildRuntime' in ext`. Legacy `start` keeps working until Phase E.
import type { CampaignExtension, MissionEntry, CampaignCtx } from '../campaign/types';

/** Subset of MissionDef that GameScene actually reads. Distinct from
 *  the full def so the runtime contract is small and stable. */
export interface MissionContext {
  campaignFactionId: FactionId;
  missionId: string;
  missionIdx: number;
  archetypeId: string;
  restrictions: NonNullable<MissionDef['overrides']['restrictions']>;
}

class MissionRunnerClass {
  /** The mission currently being played, if any. Null between runs. */
  private active: { campaign: CampaignDef; mission: MissionDef; startedAt: number } | null = null;

  /** Start a mission. Returns true if the launch succeeded. */
  start(campaign: CampaignDef, missionIdx: number): boolean {
    const mission = campaign.missions[missionIdx];
    if (!mission) {
      console.warn(`[MissionRunner] no mission at idx ${missionIdx} in campaign ${campaign.factionId}`);
      return false;
    }
    if (isArchetypeStub(mission.archetype)) {
      console.warn(`[MissionRunner] archetype "${mission.archetype}" is a stub — mission ${mission.id} cannot launch yet`);
      return false;
    }
    const archetype = getArchetype(mission.archetype);

    // v2: read campaign state and let the mission compute additional
    // overrides on top of static config. v1 missions skip this branch
    // because dynamicOverrides is undefined and initialState is null.
    let dynamic: Partial<MissionOverrides> = {};
    if (mission.dynamicOverrides && campaign.initialState !== undefined) {
      const state = CampaignState.get(campaign.factionId, campaign.initialState);
      try {
        dynamic = mission.dynamicOverrides(state) ?? {};
      } catch (err) {
        console.warn(`[MissionRunner] dynamicOverrides threw for ${mission.id}:`, err);
      }
    }
    // Merge order (lowest-to-highest priority): archetype defaults <
    // campaign-wide knobs < dynamic overrides < per-mission overrides.
    // Campaign knobs sit between archetype defaults and per-mission
    // so a mission can still override (e.g. Hero Duel mission inside
    // the Mech campaign could pick a non-default faction).
    const campaignDefaults: Partial<typeof mission.overrides> = {};
    if (campaign.defaultPlayerFaction !== undefined) {
      campaignDefaults.faction = campaign.defaultPlayerFaction;
    }
    if (campaign.defaultMapThemeOverride !== undefined) {
      campaignDefaults.mapThemeOverride = campaign.defaultMapThemeOverride;
    }
    const merged = { ...archetype.defaults, ...campaignDefaults, ...dynamic, ...mission.overrides };

    this.active = { campaign, mission, startedAt: Date.now() };
    Analytics.track('mission_started', {
      campaignFactionId: campaign.factionId,
      missionIdx: mission.idx,
      archetypeId: mission.archetype,
    });

    const context: MissionContext = {
      campaignFactionId: campaign.factionId,
      missionId: mission.id,
      missionIdx: mission.idx,
      archetypeId: mission.archetype,
      restrictions: merged.restrictions ?? {},
    };

    // Final fallback when neither the mission nor the campaign sets a
    // faction — defaults to Arcane (the free root, always unlocked).
    // Without it, GameScene would fall through to the generic
    // Arrow/Cannon/Sniper/Frost-Trap pool, which never matches a
    // campaign's design intent.
    UIBridge.startScene('GameScene', {
      mode: archetype.baseMode,
      faction: merged.faction ?? 'arcane',
      map: merged.mapId,
      difficulty: merged.difficulty ?? 'normal',
      modifier: merged.modifier ?? null,
      heroId: merged.heroId ?? null,
      creepFaction: merged.creepFaction ?? campaign.factionId,
      waveCount: merged.waveCount,
      missionContext: context,
      // GameScene reads these on init() to apply mission-style overrides.
      missionGoldStart: merged.goldStart,
      missionGoldStartMult: merged.goldStartMult,
      missionLives: merged.lives,
      missionWaveScript: merged.waveScript,
      missionPrePlacedTowers: merged.prePlacedTowers,
      missionMapThemeOverride: merged.mapThemeOverride,
      missionAutoChainWaves: merged.autoChainWaves,
      missionKillGoldMult: merged.killGoldMult,
      missionAttackerEssencePerWave: merged.attackerEssencePerWave,
      missionAttackerPaletteFaction: merged.attackerPaletteFaction,
      missionAttackerLeakThreshold: merged.attackerLeakThreshold,
      missionAttackerDefenderDifficulty: merged.attackerDefenderDifficulty,
      missionAttackerPrepOrder: merged.attackerPrepOrder,
      missionAttackerEssenceGrowthPerWave: merged.attackerEssenceGrowthPerWave,
      missionAttackerEssenceCarryoverMult: merged.attackerEssenceCarryoverMult,
      missionAttackerCampMax: merged.attackerCampMax,
      missionAttackerCampCost: merged.attackerCampCost,
      missionAttackerCampIncome: merged.attackerCampIncome,
      missionCoopCreepCountMult: merged.coopCreepCountMult,
      missionFinaleRules: merged.finaleRules,
      missionSabotageRules: merged.sabotageRules,
      missionSuppressionPylons: merged.suppressionPylons,
      missionGreenwardRules: merged.greenwardRules,
      // LoadingScreen briefing — show the mission name + story text
      // there, and gate dismissal on a "Begin" button so the player
      // can read the brief without time pressure.
      loadingMissionTitle: mission.name,
      loadingMissionStory: ParametricStory.resolve(mission.story, {
        state: campaign.initialState !== undefined
          ? CampaignState.get(campaign.factionId, campaign.initialState)
          : null,
        lastResult: null,
      }),
      loadingRequiresContinue: true,
    });
    return true;
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
    const priorStars = PlayerProfile.getMissionStars(session.campaign.factionId, mission.idx);
    let stars: StarCount = 0;
    if (result.won) {
      stars = 1;
      const star2 = mission.objectives.star2;
      const star3 = mission.objectives.star3;
      if (star2 && star2.predicate(result)) stars = 2;
      if (stars === 2 && star3 && star3.predicate(result)) stars = 3;
    }

    PlayerProfile.recordMissionResult(session.campaign.factionId, mission.idx, stars);

    // v2: write to campaign state. Runs after stars are recorded so
    // failure analytics still emit even if the updater throws.
    if (mission.stateUpdater && session.campaign.initialState !== undefined) {
      try {
        const prev = CampaignState.get(session.campaign.factionId, session.campaign.initialState);
        const next = mission.stateUpdater(result, prev);
        if (next && typeof next === 'object') {
          CampaignState.set(session.campaign.factionId, next);
        }
      } catch (err) {
        console.warn(`[MissionRunner] stateUpdater threw for ${mission.id}:`, err);
      }
    }

    if (result.won) {
      Analytics.track('mission_completed', {
        campaignFactionId: session.campaign.factionId,
        missionIdx: mission.idx,
        archetypeId: mission.archetype,
        stars,
        elapsedMs: result.durationMs,
      });
    } else {
      Analytics.track('mission_failed', {
        campaignFactionId: session.campaign.factionId,
        missionIdx: mission.idx,
        archetypeId: mission.archetype,
        atWave: result.wave,
      });
    }

    // Detect campaign completion — when the final mission just earned
    // its first star (priorStars 0 → stars >= 1). Without the prior-
    // stars guard, replays of the final mission would re-fire the
    // analytics every time and inflate the campaign-clear count.
    if (result.won
      && mission.idx === session.campaign.missions.length - 1
      && priorStars === 0) {
      Analytics.track('campaign_completed', {
        campaignFactionId: session.campaign.factionId,
        totalStars: PlayerProfile.getCampaignTotalStars(session.campaign.factionId),
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
    const state = ext.missionState
      ? ext.missionState.read()
      : ext.initialState;
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
    const runtime = ext.buildRuntime(ctx, mission);

    // The active session uses the legacy `CampaignDef` / `MissionDef`
    // shape for finalize compatibility during Phase B. Phase E folds
    // this so `active` carries the new `CampaignExtension`.
    Analytics.track('mission_started', {
      campaignFactionId: ext.factionId,
      missionIdx: mission.idx,
      archetypeId: `v2:${mission.core.mode}`,
    });

    // Story resolution — UISurface.parametricStory takes precedence
    // when present; otherwise fall back to the literal entry.story.
    const story = ext.ui?.parametricStory
      ? ext.ui.parametricStory(mission as MissionEntry<unknown, TState>, { state, lastResult: null })
      : ParametricStory.resolve(mission.story, { state, lastResult: null });

    UIBridge.startScene('GameScene', {
      mode: mission.core.mode,
      faction: mission.core.faction ?? ext.defaultPlayerFaction ?? 'arcane',
      map: mission.core.mapId,
      difficulty: mission.core.difficulty ?? 'normal',
      modifier: mission.core.modifier ?? null,
      heroId: mission.core.mode === 'hero_defense' ? mission.core.heroId : null,
      creepFaction: mission.core.creepFaction ?? ext.factionId,
      waveCount: mission.core.waveCount,
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

  getActive(): { campaign: CampaignDef; mission: MissionDef } | null {
    if (!this.active) return null;
    return { campaign: this.active.campaign, mission: this.active.mission };
  }

  /** Bail out without finalizing — used when the player quits to
   *  menu mid-mission. No stars awarded, no analytics emitted. */
  abort(): void {
    if (!this.active) return;
    Analytics.track('mission_failed', {
      campaignFactionId: this.active.campaign.factionId,
      missionIdx: this.active.mission.idx,
      archetypeId: this.active.mission.archetype,
      atWave: 0,
    });
    this.active = null;
  }
}

export const MissionRunner = new MissionRunnerClass();
