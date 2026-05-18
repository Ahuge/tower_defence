/**
 * Tests for GreenwardFinaleController — the M10 three-setpiece state
 * machine. Covers setpiece sequencing, Nave resolution by lean +
 * Reserves-zero override.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GreenwardMissionController } from './GreenwardMissionController';
import { GreenwardFinaleController, SETPIECE_RUIN_IDS } from './GreenwardFinaleController';
import { resetGreenwardState, deduct, INITIAL_RESERVES } from './WildwoodReserves';
import { recordMission, resetModeLean } from './ModeLeanTracker';

beforeEach(() => {
  resetGreenwardState();
});

function setupM10(): { mission: GreenwardMissionController; finale: GreenwardFinaleController } {
  const mission = new GreenwardMissionController({
    ruins: [
      { id: SETPIECE_RUIN_IDS.courtyard, col: 6,  row: 13, mode: 'siege' },
      { id: SETPIECE_RUIN_IDS.nave,      col: 18, row: 13, mode: 'mercy' }, // placeholder
      { id: SETPIECE_RUIN_IDS.throne,    col: 30, row: 13, mode: 'siege' },
    ],
  }, INITIAL_RESERVES);
  return { mission, finale: new GreenwardFinaleController(mission) };
}

describe('GreenwardFinaleController — initial state', () => {
  it('starts at the Courtyard setpiece', () => {
    const { finale } = setupM10();
    expect(finale.getActiveSetpiece()).toBe('courtyard');
    expect(finale.getResolvedNaveMode()).toBeNull();
  });
});

describe('GreenwardFinaleController — sequencing', () => {
  it('advances Courtyard → Nave on Courtyard claim', () => {
    const { mission, finale } = setupM10();
    // Force-claim the courtyard
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    expect(finale.getActiveSetpiece()).toBe('nave');
  });

  it('advances Nave → Throne on Nave claim', () => {
    const { mission, finale } = setupM10();
    // Claim courtyard first
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    // Now claim the nave (mode is post-resolve; Siege by default with no lean)
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.nave, 2);
    mission.consecration.notifyCreepKilled(2);
    finale.tick();
    expect(finale.getActiveSetpiece()).toBe('throne');
  });

  it('advances Throne → complete on Throne claim', () => {
    const { mission, finale } = setupM10();
    // Claim all three sequentially.
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.nave, 2);
    mission.consecration.notifyCreepKilled(2);
    finale.tick();
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.throne, 3);
    mission.consecration.notifyCreepKilled(3);
    finale.tick();
    expect(finale.getActiveSetpiece()).toBe('complete');
  });
});

describe('GreenwardFinaleController — Nave resolution', () => {
  beforeEach(() => {
    resetModeLean();
  });

  it('resolves to Siege when no lean is reached', () => {
    // Only 2 ceremony / 2 mercy across the M10 mission's snapshot →
    // no campaign lean (threshold is 3). Resolution is Siege.
    const { mission, finale } = setupM10();
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    expect(finale.getResolvedNaveMode()).toBe('siege');
  });

  it('resolves to Ceremony when this-mission ceremony tally hits the threshold', () => {
    // Setup the mission with 3 ceremony ruins claimed before the
    // courtyard advances, then claim the courtyard.
    const mission = new GreenwardMissionController({
      ruins: [
        { id: 'c1', col: 1, row: 1, mode: 'ceremony' },
        { id: 'c2', col: 2, row: 2, mode: 'ceremony' },
        { id: 'c3', col: 3, row: 3, mode: 'ceremony' },
        { id: SETPIECE_RUIN_IDS.courtyard, col: 6,  row: 13, mode: 'siege' },
        { id: SETPIECE_RUIN_IDS.nave,      col: 18, row: 13, mode: 'mercy' },
        { id: SETPIECE_RUIN_IDS.throne,    col: 30, row: 13, mode: 'siege' },
      ],
    }, INITIAL_RESERVES);
    const finale = new GreenwardFinaleController(mission);
    // Force-claim the 3 ceremony ruins via channels.
    for (const id of ['c1', 'c2', 'c3']) {
      mission.consecration.update(0, 10_000, [{ col: mission.consecration.getRuin(id)!.spec.col - 1, row: mission.consecration.getRuin(id)!.spec.row, typeId: 'nature_blossom' }]);
    }
    // Now claim the courtyard
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    expect(finale.getResolvedNaveMode()).toBe('ceremony');
  });

  it('Reserves-zero narrows to Siege regardless of lean', () => {
    // Burn reserves to zero.
    deduct(INITIAL_RESERVES);
    // Build a mission whose snapshot would otherwise resolve to Mercy.
    const mission = new GreenwardMissionController({
      ruins: [
        { id: 'm1', col: 1, row: 1, mode: 'mercy' },
        { id: 'm2', col: 2, row: 2, mode: 'mercy' },
        { id: 'm3', col: 3, row: 3, mode: 'mercy' },
        { id: SETPIECE_RUIN_IDS.courtyard, col: 6,  row: 13, mode: 'siege' },
        { id: SETPIECE_RUIN_IDS.nave,      col: 18, row: 13, mode: 'mercy' },
        { id: SETPIECE_RUIN_IDS.throne,    col: 30, row: 13, mode: 'siege' },
      ],
    }, 0);
    const finale = new GreenwardFinaleController(mission);
    // Claim the 3 mercy ruins (no watchers; auto-claims with zero defenders blocked
    // — bind a defender per ruin then kill).
    for (const id of ['m1', 'm2', 'm3']) {
      mission.consecration.bindDefender(id, parseInt(id.slice(1), 10) * 100);
      mission.consecration.notifyCreepKilled(parseInt(id.slice(1), 10) * 100);
    }
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 999);
    mission.consecration.notifyCreepKilled(999);
    finale.tick();
    // Reserves are at zero → narrow to Siege.
    expect(finale.getResolvedNaveMode()).toBe('siege');
  });
});

describe('GreenwardFinaleController — onComplete callback', () => {
  it('fires exactly once when the throne claims and active reaches "complete"', () => {
    const calls: number[] = [];
    const onComplete = () => { calls.push(Date.now()); };
    const mission = new GreenwardMissionController({
      ruins: [
        { id: SETPIECE_RUIN_IDS.courtyard, col: 6,  row: 13, mode: 'siege' },
        { id: SETPIECE_RUIN_IDS.nave,      col: 18, row: 13, mode: 'mercy' },
        { id: SETPIECE_RUIN_IDS.throne,    col: 30, row: 13, mode: 'siege' },
      ],
    }, INITIAL_RESERVES);
    const finale = new GreenwardFinaleController(mission, onComplete);

    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    expect(calls.length).toBe(0);

    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.nave, 2);
    mission.consecration.notifyCreepKilled(2);
    finale.tick();
    expect(calls.length).toBe(0);

    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.throne, 3);
    mission.consecration.notifyCreepKilled(3);
    finale.tick();
    expect(calls.length).toBe(1);

    // Subsequent ticks do not re-fire.
    finale.tick();
    finale.tick();
    expect(calls.length).toBe(1);
  });
});

describe('GreenwardFinaleController — snapshot', () => {
  it('reports active setpiece + resolved Nave mode', () => {
    const { mission, finale } = setupM10();
    expect(finale.getSnapshot()).toEqual({ active: 'courtyard', resolvedNaveMode: null });
    mission.consecration.bindDefender(SETPIECE_RUIN_IDS.courtyard, 1);
    mission.consecration.notifyCreepKilled(1);
    finale.tick();
    const snap = finale.getSnapshot();
    expect(snap.active).toBe('nave');
    expect(snap.resolvedNaveMode).not.toBeNull();
  });
});
