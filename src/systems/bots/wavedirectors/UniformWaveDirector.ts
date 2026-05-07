/**
 * UniformWaveDirector — v4.1 baseline.
 *
 * Defers entirely to the existing `getWavesForMode()` static generator.
 * No reactive logic, no observation of placed towers, no faction
 * awareness. The point of this director is regression-cleanliness: when
 * `MatchConfig.waveDirectorId === 'uniform'` (or unset), match behaviour
 * must be byte-identical to current static-wave runs.
 *
 * Smarter directors (CounterPick, AdversarialSearch) will register
 * separately under their own ids in v4.2+.
 */
import { WaveDefinition } from '../../../data/WaveDefinitions';
import { getWavesForMode } from '../../../data/WaveDefinitions';
import { WaveDirectorBrain, WaveDirectorMaterializeContext, registerWaveDirector } from '../WaveDirectorBrain';

export class UniformWaveDirector implements WaveDirectorBrain {
  readonly name = 'uniform';

  materializeWaves(ctx: WaveDirectorMaterializeContext): WaveDefinition[] {
    return getWavesForMode(ctx.matchMode, ctx.waveCount);
  }
}

registerWaveDirector('uniform', () => new UniformWaveDirector());
