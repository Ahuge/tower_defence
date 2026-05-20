/**
 * MissionRunner — analytics shape regression suite.
 *
 * The v2 routing (`startV2`) stores a synthesized `archetypeId` on the
 * active session so `finalize` / `abort` can emit it on analytics
 * without reading `mission.archetype` (which doesn't exist on the v2
 * `MissionEntry` shape). Locking the shape via direct assertion on
 * spied `Analytics.track` calls — a previous regression shipped
 * `archetypeId: undefined` for every v2 mission and went unnoticed
 * because no test exercised the analytics payload.
 *
 * Out of scope: every finalize side-effect (PlayerProfile persistence,
 * GameOver routing). Those are covered by the e2e suite. This file
 * focuses on the analytics contract that no integration test verifies.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MissionRunner } from './MissionRunner';
import { Analytics } from '../AnalyticsClient';
import { UIBridge } from '../../ui/UIBridge';
import { PlayerProfile } from '../profile/PlayerProfile';
import type { CampaignExtension } from '../campaign/types';
import type { MissionResult } from '../../data/campaigns/CampaignDef';

const FAKE_EXT: CampaignExtension<Record<string, never>, { kind: 'plain' }> = {
  factionId: 'mechanical',
  name: 'Test',
  intro: '',
  outro: '',
  initialState: {},
  missions: [
    {
      id: 'm1',
      idx: 0,
      name: 'Mission 1',
      story: '',
      objectives: {},
      core: { mode: 'standard', mapId: 'plains', waveCount: 5, difficulty: 'easy' },
      campaign: { kind: 'plain' },
    },
  ],
  buildRuntime: () => ({}),
};

const FAKE_RESULT: MissionResult = {
  won: true,
  wave: 5,
  durationMs: 60_000,
  livesRemaining: 20,
  livesStart: 20,
  goldRemaining: 100,
  goldEarned: 500,
  towerCount: 3,
  perfectRun: true,
  custom: {},
};

describe('MissionRunner — v2 analytics shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Suppress side effects — `startV2` calls `UIBridge.startScene` to
    // boot GameScene, and `finalize` calls `PlayerProfile.recordMissionResult`
    // (writes localStorage). Stub both; we only assert on Analytics.
    vi.spyOn(UIBridge, 'startScene').mockImplementation(() => {});
    vi.spyOn(PlayerProfile, 'recordMissionResult').mockImplementation(() => {});
    vi.spyOn(PlayerProfile, 'getMissionStars').mockReturnValue(0);
    vi.spyOn(PlayerProfile, 'getCampaignTotalStars').mockReturnValue(0);
  });

  it('startV2 emits mission_started with archetypeId="v2:standard"', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockImplementation(() => {});
    MissionRunner.startV2(FAKE_EXT, 0);
    const startCall = trackSpy.mock.calls.find(([name]) => name === 'mission_started');
    expect(startCall, 'mission_started not tracked').toBeDefined();
    expect(startCall![1]).toMatchObject({
      campaignFactionId: 'mechanical',
      missionIdx: 0,
      archetypeId: 'v2:standard',
    });
    MissionRunner.abort(); // teardown
  });

  it('finalize after startV2 emits mission_completed with the same archetypeId (not undefined)', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockImplementation(() => {});
    MissionRunner.startV2(FAKE_EXT, 0);
    trackSpy.mockClear();
    MissionRunner.finalize(FAKE_RESULT);
    const completedCall = trackSpy.mock.calls.find(([name]) => name === 'mission_completed');
    expect(completedCall, 'mission_completed not tracked').toBeDefined();
    expect(completedCall![1]).toMatchObject({
      campaignFactionId: 'mechanical',
      missionIdx: 0,
      archetypeId: 'v2:standard',
      stars: 1,
    });
    // The regression we're locking out: archetypeId was undefined
    // before the active-session archetypeId capture landed.
    expect((completedCall![1] as { archetypeId: unknown }).archetypeId).not.toBeUndefined();
  });

  it('finalize after a lost mission emits mission_failed with the archetypeId, not undefined', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockImplementation(() => {});
    MissionRunner.startV2(FAKE_EXT, 0);
    trackSpy.mockClear();
    MissionRunner.finalize({ ...FAKE_RESULT, won: false, wave: 3 });
    const failedCall = trackSpy.mock.calls.find(([name]) => name === 'mission_failed');
    expect(failedCall, 'mission_failed not tracked').toBeDefined();
    expect(failedCall![1]).toMatchObject({
      campaignFactionId: 'mechanical',
      missionIdx: 0,
      archetypeId: 'v2:standard',
      atWave: 3,
    });
    expect((failedCall![1] as { archetypeId: unknown }).archetypeId).not.toBeUndefined();
  });

  it('abort after startV2 emits mission_failed with the archetypeId, not undefined', () => {
    const trackSpy = vi.spyOn(Analytics, 'track').mockImplementation(() => {});
    MissionRunner.startV2(FAKE_EXT, 0);
    trackSpy.mockClear();
    MissionRunner.abort();
    const failedCall = trackSpy.mock.calls.find(([name]) => name === 'mission_failed');
    expect(failedCall, 'mission_failed not tracked').toBeDefined();
    expect(failedCall![1]).toMatchObject({
      campaignFactionId: 'mechanical',
      missionIdx: 0,
      archetypeId: 'v2:standard',
      atWave: 0,
    });
    expect((failedCall![1] as { archetypeId: unknown }).archetypeId).not.toBeUndefined();
  });

  it('mission base mode flows through to the analytics archetypeId (attacker → v2:attacker)', () => {
    const attackerExt: CampaignExtension<Record<string, never>, { kind: 'plain' }> = {
      ...FAKE_EXT,
      missions: [
        {
          ...FAKE_EXT.missions[0],
          core: { mode: 'attacker', mapId: 'attacker_assault', waveCount: 10, difficulty: 'normal' },
        },
      ],
    };
    const trackSpy = vi.spyOn(Analytics, 'track').mockImplementation(() => {});
    MissionRunner.startV2(attackerExt, 0);
    const startCall = trackSpy.mock.calls.find(([name]) => name === 'mission_started');
    expect(startCall![1]).toMatchObject({ archetypeId: 'v2:attacker' });
    MissionRunner.abort();
  });
});
