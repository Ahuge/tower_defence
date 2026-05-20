/**
 * Cross-pin tests for SnakeEyesMissionIds — verifies that the
 * centralized mission-idx constants line up with the actual mission
 * order in snake-eyes.ts. If a future refactor reorders missions
 * without updating the constants, this test fails loudly.
 */
import { describe, it, expect } from 'vitest';
import {
  M1_LAST_HAND_TALAVAR,
  M2_ROAD_WEST,
  M3_SILVERMINE_CREEK,
  M4_FERRYMANS_GAME,
  M5_WHEEL_OF_CIPHER,
  M6_THERIS_GOODBYE,
  M7_MIRROR_WALKERS,
  M8_SNAKE_EYES,
  M9_BURNING_PACTBOOK,
  M10_COUNTERFACTUAL_MIRROR,
} from './SnakeEyesMissionIds';
import { SNAKE_EYES_EXTENSION as SNAKE_EYES_CAMPAIGN } from '../../data/campaigns/snake-eyes';

describe('SnakeEyesMissionIds — alignment with SNAKE_EYES_CAMPAIGN', () => {
  // Each pair: (constant, expected mission id string in snake-eyes.ts).
  const expected: ReadonlyArray<[number, string]> = [
    [M1_LAST_HAND_TALAVAR,      'last_hand_talavar'],
    [M2_ROAD_WEST,              'road_west'],
    [M3_SILVERMINE_CREEK,       'silvermine_creek'],
    [M4_FERRYMANS_GAME,         'ferrymans_game'],
    [M5_WHEEL_OF_CIPHER,        'wheel_of_cipher'],
    [M6_THERIS_GOODBYE,         'theris_goodbye'],
    [M7_MIRROR_WALKERS,         'mirror_walkers'],
    [M8_SNAKE_EYES,             'snake_eyes_proper'],
    [M9_BURNING_PACTBOOK,       'burning_pactbook'],
    [M10_COUNTERFACTUAL_MIRROR, 'counterfactual_mirror'],
  ];

  for (const [idx, expectedId] of expected) {
    it(`idx ${idx} maps to mission "${expectedId}"`, () => {
      const mission = SNAKE_EYES_CAMPAIGN.missions[idx];
      expect(mission).toBeDefined();
      expect(mission.id).toBe(expectedId);
      expect(mission.idx).toBe(idx);
    });
  }

  it('the constants cover all 10 mission idxs without gaps', () => {
    const idxs = new Set(expected.map(([i]) => i));
    expect(idxs.size).toBe(10);
    for (let i = 0; i < 10; i++) expect(idxs.has(i)).toBe(true);
  });
});
