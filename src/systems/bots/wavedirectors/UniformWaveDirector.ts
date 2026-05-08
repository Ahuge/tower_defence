/**
 * UniformWaveDirector — v4.1/v4.2 baseline.
 *
 * Defers entirely to the existing `getWavesForMode()` static generator.
 * No reactive logic, no observation of placed towers, no faction
 * awareness. The point of this director is regression-cleanliness: when
 * `MatchConfig.waveDirectorId === 'uniform'` (or unset), match behaviour
 * must be byte-identical to current static-wave runs.
 *
 * v4.2: implements `init` + `nextWave` for lazy generation. `init`
 * precomputes the full static list once; `nextWave` returns one entry
 * per call. Equivalent to v4.1's `materializeWaves` for the purposes
 * of regression compatibility.
 */
import { WaveDefinition } from '../../../data/WaveDefinitions';
import { getWavesForMode, generateEndlessWaves } from '../../../data/WaveDefinitions';
import {
  WaveDirectorBrain,
  WaveDirectorMaterializeContext,
  WaveObservation,
  registerWaveDirector,
} from '../WaveDirectorBrain';

export class UniformWaveDirector implements WaveDirectorBrain {
  readonly name = 'uniform';
  private precomputed: WaveDefinition[] = [];
  private mode: 'standard' | 'endless' | 'battle' | 'hero_defense' | 'circle_coop' | 'gauntlet' | 'tutorial' = 'standard';

  init(ctx: WaveDirectorMaterializeContext): void {
    this.mode = ctx.matchMode;
    this.precomputed = getWavesForMode(ctx.matchMode, ctx.waveCount);
  }

  nextWave(obs: WaveObservation): WaveDefinition {
    // 1-indexed → array index.
    const idx = obs.waveIndex - 1;
    if (idx < this.precomputed.length) return this.precomputed[idx];
    // Endless: extend on demand. Mirrors the legacy chunked-append
    // path that HeadlessMatch used pre-v4.2.
    if (this.mode === 'endless') {
      const nextStart = this.precomputed.length + 1;
      this.precomputed.push(...generateEndlessWaves(nextStart, 10));
      return this.precomputed[idx] ?? this.precomputed[this.precomputed.length - 1];
    }
    // Standard / other modes: out-of-bounds shouldn't happen. Return
    // the last wave defensively rather than crashing.
    return this.precomputed[this.precomputed.length - 1];
  }

  /** v4.1 compatibility — same output as init+nextWave-loop. */
  materializeWaves(ctx: WaveDirectorMaterializeContext): WaveDefinition[] {
    return getWavesForMode(ctx.matchMode, ctx.waveCount);
  }
}

registerWaveDirector('uniform', () => new UniformWaveDirector());
