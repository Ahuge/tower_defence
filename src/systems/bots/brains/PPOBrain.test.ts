/**
 * PPOBrain — fallback path + input shaping tests.
 *
 * With no committed `models/ppo-policy.onnx` in the dev tree, every
 * `decide()` falls back to BalancedBrain. That's the path we test
 * here. The async ONNX-inference path (`decideAsync()`) is exercised
 * by BC step 5 validation once a real model is written by the
 * Python trainer.
 *
 * Coverage:
 *   - PPOBrain instantiates via the registry without crashing.
 *   - With no model present, full matches run end-to-end and
 *     produce match outcomes identical to BalancedBrain on the
 *     same seed (fallback fidelity).
 *   - `buildModelInput` produces the expected [N=1, 39, 26, 36]
 *     tensor with globals tiled across each spatial plane.
 *   - Match.attachMatch hook fires (PPOBrain.match is set).
 */
import { describe, it, expect } from 'vitest';
import { Match } from '../../../headless/Match';
import { MatchConfig } from '../../../headless/types';
import { runMatch } from '../../../headless/HeadlessMatch';
import { BRAIN_REGISTRY } from '../BotBrain';
import './PPOBrain';                   // register 'ppo'
import './BalancedBrain';              // register 'balanced' as fallback
import { buildModelInput, PPOBrain } from './PPOBrain';
import { fromMatch } from '../learning/ObsTensor';
import { GRID_COLS, GRID_ROWS } from '../../../config';
import { OBS_CHANNELS, OBS_GLOBALS } from '../learning/ObsTensor';

function cfg(faction: 'arcane' | 'mechanical', seed = 1001, brainId = 'ppo'): MatchConfig {
  return {
    faction,
    difficulty: 'normal',
    mapId: 'plains',
    brainId,
    matchMode: 'standard',
    waveCount: 5,
    seed,
  };
}

describe('PPOBrain registry', () => {
  it('registers under brain id "ppo"', () => {
    expect(BRAIN_REGISTRY['ppo']).toBeDefined();
    const b = BRAIN_REGISTRY['ppo']();
    expect(b.name).toBe('PPO');
  });
});

describe('PPOBrain Match.attachMatch hook', () => {
  it('PPOBrain.match is set after Match construction', () => {
    const match = new Match(cfg('arcane'));
    // Reach in to verify attachMatch fired.
    const brain = (match as unknown as { brain: PPOBrain }).brain;
    expect(brain).toBeInstanceOf(PPOBrain);
    expect(brain.match).toBe(match);
  });
});

describe('PPOBrain fallback behavior (no model file)', () => {
  it('arcane match completes end-to-end without crashing', async () => {
    const r = await runMatch(cfg('arcane'));
    expect(r.outcome).not.toBe('error');
    expect(r.error).toBeUndefined();
  });

  it('mechanical match completes end-to-end without crashing', async () => {
    const r = await runMatch(cfg('mechanical'));
    expect(r.outcome).not.toBe('error');
    expect(r.error).toBeUndefined();
  });

  it('PPOBrain match outcome matches BalancedBrain on the same seed (fallback fidelity)', async () => {
    // Without a model file, PPOBrain.decide should hand off to
    // BalancedBrain. With identical seeds + factions, the two
    // matches should produce identical tick-level state. (RNG
    // state is per-Match via the save/restore pattern, so this
    // works in parallel too.)
    for (const faction of ['arcane', 'mechanical'] as const) {
      const ppoResult = await runMatch(cfg(faction, 2001, 'ppo'));
      const balResult = await runMatch(cfg(faction, 2001, 'balanced'));
      expect(ppoResult.outcome, `${faction} outcome`).toBe(balResult.outcome);
      expect(ppoResult.waveReached, `${faction} waveReached`).toBe(balResult.waveReached);
      expect(ppoResult.livesRemaining, `${faction} lives`).toBe(balResult.livesRemaining);
      expect(ppoResult.buildHash, `${faction} buildHash`).toBe(balResult.buildHash);
    }
  });
});

describe('PPOBrain.buildModelInput', () => {
  it('produces NCHW tensor of expected size (1 × 39 × 26 × 36)', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    const input = buildModelInput(obs.grid, obs.globals);
    expect(input.length).toBe((OBS_CHANNELS + OBS_GLOBALS) * GRID_ROWS * GRID_COLS);
  });

  it('first 14 channels equal the grid tensor verbatim', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    const input = buildModelInput(obs.grid, obs.globals);
    for (let i = 0; i < obs.grid.length; i++) {
      expect(input[i]).toBe(obs.grid[i]);
    }
  });

  it('global channels (14..38) are tiled across each spatial plane', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    const input = buildModelInput(obs.grid, obs.globals);
    const planeSize = GRID_ROWS * GRID_COLS;
    for (let g = 0; g < OBS_GLOBALS; g++) {
      const v = obs.globals[g];
      const base = (OBS_CHANNELS + g) * planeSize;
      // Sample 8 spots across the plane.
      for (let s = 0; s < planeSize; s += Math.floor(planeSize / 8)) {
        expect(input[base + s], `globals[${g}] at plane offset ${s}`).toBe(v);
      }
    }
  });

  it('obs+input encode is fast enough for a per-decision budget (<5ms)', () => {
    // Latency benchmark: ObsTensor.fromMatch + buildModelInput is
    // the only Node-side cost on each decide() before ONNX. PRD
    // target is <50ms per decision total; we want this prep step
    // well under 10% of that budget.
    const match = new Match(cfg('arcane'));
    // Warm up (JIT cache hot).
    fromMatch(match);
    const t0 = Date.now();
    const ITER = 200;
    for (let i = 0; i < ITER; i++) {
      const obs = fromMatch(match);
      buildModelInput(obs.grid, obs.globals);
    }
    const perCall = (Date.now() - t0) / ITER;
    expect(perCall, `obs+input prep took ${perCall.toFixed(2)}ms (target <5ms)`).toBeLessThan(5);
  });
});
