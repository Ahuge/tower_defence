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
import { registerCampaign } from '../campaign/CampaignRegistry';
import type { CampaignExtension, MissionStateAspect, MissionEntry } from '../campaign/types';
import type { FactionId } from '../../data/Factions';
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
      archetypeId: 'standard',
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

// ─── MissionStateAspect wiring (D0) ─────────────────────────────
// Phase D0 hooks `MissionStateAspect.applyMissionResult` into
// `MissionRunner.finalize` (writes at mission-end) and
// `tickBetweenMissions` into `MissionRunner.startV2` (writes
// between-mission state changes BEFORE applyDynamicOverrides reads
// it). The test extension uses a unique factionId so registry
// pollution from other test files can't leak in.

interface StateExtCounters {
  applyMissionResultCalls: number;
  tickBetweenMissionsCalls: number;
  writes: number;
}

function makeStateExt(): {
  ext: CampaignExtension<{ counter: number }, { kind: 'plain' }>;
  counters: StateExtCounters;
  state: { counter: number };
} {
  const counters: StateExtCounters = {
    applyMissionResultCalls: 0,
    tickBetweenMissionsCalls: 0,
    writes: 0,
  };
  const liveState = { counter: 0 };
  const missionState: MissionStateAspect<{ counter: number }, { kind: 'plain' }> = {
    defaults: { counter: 0 },
    read: () => liveState,
    write: (next) => {
      counters.writes += 1;
      liveState.counter = next.counter;
    },
    applyDynamicOverrides: (_state, entry) => entry,
    applyMissionResult: (state, _result) => {
      counters.applyMissionResultCalls += 1;
      return { counter: state.counter + 100 };
    },
    tickBetweenMissions: (state) => {
      counters.tickBetweenMissionsCalls += 1;
      return { counter: state.counter + 10 };
    },
  };
  // Use a faction id that isn't likely to collide with a registered
  // production campaign. Casting to FactionId — registry stores
  // unknown so the cast is safe at runtime.
  const ext: CampaignExtension<{ counter: number }, { kind: 'plain' }> = {
    factionId: '__test_state' as unknown as FactionId,
    name: 'State Test',
    intro: '',
    outro: '',
    initialState: { counter: 0 },
    missions: [
      {
        id: 'm1', idx: 0, archetypeId: 'standard', name: 'M1', story: '', objectives: {},
        core: { mode: 'standard', mapId: 'plains', waveCount: 5, difficulty: 'easy' },
        campaign: { kind: 'plain' },
      } as MissionEntry<{ kind: 'plain' }, { counter: number }>,
    ],
    missionState,
    buildRuntime: () => ({}),
  };
  return { ext, counters, state: liveState };
}

describe('MissionRunner — MissionStateAspect wiring (D0)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(UIBridge, 'startScene').mockImplementation(() => {});
    vi.spyOn(PlayerProfile, 'recordMissionResult').mockImplementation(() => {});
    vi.spyOn(PlayerProfile, 'getMissionStars').mockReturnValue(0);
    vi.spyOn(PlayerProfile, 'getCampaignTotalStars').mockReturnValue(0);
    vi.spyOn(Analytics, 'track').mockImplementation(() => {});
  });

  it('startV2 calls tickBetweenMissions before applyDynamicOverrides', () => {
    const { ext, counters, state } = makeStateExt();
    // Pre-seed state so the tick is observable.
    state.counter = 5;
    MissionRunner.startV2(ext, 0);
    expect(counters.tickBetweenMissionsCalls).toBe(1);
    // Tick added 10 (5 + 10 = 15); persisted via write().
    expect(state.counter).toBe(15);
    expect(counters.writes).toBeGreaterThanOrEqual(1);
    MissionRunner.abort();
  });

  it('finalize calls applyMissionResult on the registered extension', () => {
    const { ext, counters, state } = makeStateExt();
    registerCampaign(ext);
    MissionRunner.startV2(ext, 0);
    const beforeFinalize = counters.applyMissionResultCalls;
    MissionRunner.finalize(FAKE_RESULT);
    expect(counters.applyMissionResultCalls).toBe(beforeFinalize + 1);
    // applyMissionResult adds 100; state should reflect that.
    // Starting state was 0, tick brought it to 10, then applyMissionResult: 10 + 100 = 110.
    expect(state.counter).toBe(110);
  });

  it('campaigns without missionState aspect do not throw at finalize (Mech-style)', () => {
    // FAKE_EXT has no missionState; finalize must skip the v2 hook
    // and complete cleanly.
    MissionRunner.startV2(FAKE_EXT, 0);
    expect(() => MissionRunner.finalize(FAKE_RESULT)).not.toThrow();
  });

  it('tickBetweenMissions throwing does not block the mission launch', () => {
    const { ext } = makeStateExt();
    if (ext.missionState) {
      ext.missionState.tickBetweenMissions = () => { throw new Error('boom'); };
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(MissionRunner.startV2(ext, 0)).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    MissionRunner.abort();
  });

  it('applyMissionResult throwing does not block stars from being recorded', () => {
    const recordSpy = vi.spyOn(PlayerProfile, 'recordMissionResult');
    const { ext } = makeStateExt();
    if (ext.missionState) {
      ext.missionState.applyMissionResult = () => { throw new Error('boom'); };
    }
    registerCampaign(ext);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    MissionRunner.startV2(ext, 0);
    MissionRunner.finalize(FAKE_RESULT);
    // Stars persisted even though state aspect threw.
    expect(recordSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
