/**
 * MissionRunner — orchestrates a single campaign mission run.
 *
 * Lifecycle:
 *   1. CampaignLobby calls `MissionRunner.start(campaignDef, missionIdx)`.
 *   2. Runner builds a `MissionContext`, threads it into `GameScene.init`
 *      via a registry slot the scene reads on boot, and shows the
 *      pre-mission story modal (handled by the lobby; runner just
 *      starts the scene).
 *   3. GameScene runs as normal with mission overrides applied (lives,
 *      gold, waveCount, restrictions). On game-end, the scene fires
 *      the `gameOver` / `gameWon` EventBus events and emits the
 *      `game_end` analytics event.
 *   4. The runner snapshots the result into a `MissionResult`,
 *      evaluates the mission's star objectives, and calls
 *      `PlayerProfile.recordMissionResult` to persist stars.
 *   5. The lobby re-mounts on its own (via UIBridge.show); the runner
 *      doesn't navigate. Calling code reads stars via PlayerProfile.
 *
 * Plan 10 ships the framework only — the actual stars-saving and
 * lobby-re-mount paths are stubbed where they touch deferred features
 * (PlayerProfile.recordMissionResult lives in Plan 10 too; the
 * objective evaluation is real).
 */

import type { CampaignDef, MissionDef, MissionOverrides, MissionResult, StarCount } from '../../data/campaigns/CampaignDef';
import { getArchetype, isArchetypeStub } from '../../data/campaigns/MissionArchetypes';
import { UIBridge } from '../../ui/UIBridge';
import { Analytics } from '../AnalyticsClient';
import { PlayerProfile } from '../profile/PlayerProfile';
import { CampaignState } from '../campaign/CampaignState';
import { ParametricStory } from '../campaign/ParametricStory';

/** Subset of MissionDef that GameScene actually reads. Distinct from
 *  the full def so the runtime contract is small and stable. */
export interface MissionContext {
  campaignFactionId: string;
  missionId: string;
  missionIdx: number;
  archetypeId: string;
  restrictions: NonNullable<MissionDef['overrides']['restrictions']>;
  /** Predicate-bearing objective spec; runner evaluates them at game-end. */
  objectives: MissionDef['objectives'];
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
    const merged = { ...archetype.defaults, ...dynamic, ...mission.overrides };

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
      objectives: mission.objectives,
    };

    // Default the player faction to Arcane when the mission doesn't
    // specify one — Arcane is the free root, every player has it
    // unlocked, and without a faction GameScene falls back to the
    // generic Arrow/Cannon/Sniper/Frost-Trap pool which doesn't
    // match the campaign's design intent. Future iteration: a
    // pre-mission picker letting the player choose any of their
    // playable factions, defaulting to Arcane.
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
      missionMapThemeOverride: merged.mapThemeOverride ?? campaign.defaultMapThemeOverride,
      missionAutoChainWaves: merged.autoChainWaves,
      missionKillGoldMult: merged.killGoldMult,
      missionAttackerEssencePerWave: merged.attackerEssencePerWave,
      missionAttackerPaletteFaction: merged.attackerPaletteFaction,
      missionAttackerLeakThreshold: merged.attackerLeakThreshold,
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
    // its first star (mission idx 9 going from 0/3 → 1+/3).
    if (result.won && mission.idx === session.campaign.missions.length - 1) {
      Analytics.track('campaign_completed', {
        campaignFactionId: session.campaign.factionId,
        totalStars: PlayerProfile.getCampaignTotalStars(session.campaign.factionId),
      });
    }

    this.active = null;
    return stars;
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
