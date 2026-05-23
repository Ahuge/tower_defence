/**
 * SnakeEyesWaveScripts — per-mission wave-script builders for Snake
 * Eyes missions that need bespoke creep composition. Mirrors the
 * pattern in `MechWaveScripts.ts`.
 *
 * M8 is the first Snake Eyes mission with a hand-authored wave
 * script — the default generic-creep generator can't produce the
 * `void_collector` boss-creep that M8's narrative demands ("The
 * Collector came down the road on foot"). Other Snake Eyes missions
 * still use the default standard-mode wave generator; they may grow
 * into this file as the campaign's narrative beats need specific
 * creep types.
 */

import type { WaveDefinition } from '../WaveDefinitions';

/** M8 Snake Eyes — the Collector mission. Frugal-archetype: player
 *  starts with 200g and is capped at 6 towers on the gauntlet map.
 *  12 waves on hard difficulty.
 *
 *  Pacing:
 *    - Waves 1-4 ramp the player into the frugal economy (standard
 *      + fast + armored mix scaled for hard).
 *    - Waves 5-6 squeeze (swarm + armored) while the player should
 *      have 4-5 towers built.
 *    - Wave 7 — the Collector arrives, on foot, with an armored
 *      escort. Killing him (5× gold bounty per CreepTypes.applyDifficulty)
 *      grants a serious economy boost AND cancels next mission's
 *      interest tick. Leaking him means he taxes towers all the way
 *      out — survivable but costly.
 *    - Waves 8-12 escalate normally — post-Collector recovery on
 *      wave 8, then armored / swarm / boss-finale push.
 *
 *  The Collector's per-tick disable behaviour lives in
 *  `CollectorBehavior.ts` and is wired through
 *  `SnakeEyesMissionController.tickCollectors` (per-frame) +
 *  `onCollectorMaybeKilled` (kill) / `onCollectorMaybeReached` (leak)
 *  via the gameplay aspect's onCreepKilled / onCreepReached. */
export function buildSnakeEyesM8Waves(): WaveDefinition[] {
  return [
    { wave: 1,  isBoss: false, spawnInterval: 700,
      groups: [{ creepType: 'standard', count: 8, hpScale: 24, speedScale: 1 }] },
    { wave: 2,  isBoss: false, spawnInterval: 650,
      groups: [
        { creepType: 'standard', count: 10, hpScale: 28, speedScale: 1 },
        { creepType: 'fast',     count: 2,  hpScale: 28, speedScale: 1.05 },
      ] },
    { wave: 3,  isBoss: false, spawnInterval: 600,
      groups: [
        { creepType: 'standard', count: 8, hpScale: 32, speedScale: 1 },
        { creepType: 'fast',     count: 4, hpScale: 32, speedScale: 1.05 },
        { creepType: 'armored',  count: 2, hpScale: 32, speedScale: 0.95 },
      ] },
    { wave: 4,  isBoss: false, spawnInterval: 550,
      groups: [
        { creepType: 'fast',     count: 10, hpScale: 36, speedScale: 1.05 },
        { creepType: 'armored',  count: 4,  hpScale: 36, speedScale: 0.95 },
      ] },
    { wave: 5,  isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'armored', count: 8, hpScale: 44, speedScale: 0.95 },
        { creepType: 'swarm',   count: 6, hpScale: 44, speedScale: 1.1 },
      ] },
    { wave: 6,  isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'swarm',   count: 12, hpScale: 50, speedScale: 1.1 },
        { creepType: 'armored', count: 4,  hpScale: 50, speedScale: 0.95 },
      ] },
    // ─── Wave 7 — The Collector ─────────────────────────────────
    // One Collector, plus an armored escort that holds the player's
    // attention while the Collector lobs disable tokens at towers.
    // Spawn the Collector first (long interval) so the player has a
    // beat to read the situation; escorts follow on the standard
    // interval. CreepTypes.applyDifficulty boosts the Collector's
    // gold bounty to 5× — defeating him is materially valuable for
    // the frugal economy.
    { wave: 7,  isBoss: true,  spawnInterval: 600,
      groups: [
        { creepType: 'void_collector', count: 1, hpScale: 60, speedScale: 1 },
        { creepType: 'armored',        count: 6, hpScale: 56, speedScale: 0.95 },
      ] },
    { wave: 8,  isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'standard', count: 14, hpScale: 64, speedScale: 1 },
        { creepType: 'fast',     count: 6,  hpScale: 64, speedScale: 1.1 },
      ] },
    { wave: 9,  isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'armored',  count: 8, hpScale: 72, speedScale: 0.95 },
        { creepType: 'swarm',    count: 8, hpScale: 72, speedScale: 1.1 },
        { creepType: 'shielded', count: 2, hpScale: 72, speedScale: 1 },
      ] },
    { wave: 10, isBoss: true,  spawnInterval: 0,
      groups: [
        { creepType: 'boss', count: 1, hpScale: 100, speedScale: 1 },
        { creepType: 'fast', count: 6, hpScale: 88,  speedScale: 1.1 },
      ] },
    { wave: 11, isBoss: false, spawnInterval: 380,
      groups: [
        { creepType: 'swarm',   count: 12, hpScale: 92, speedScale: 1.1 },
        { creepType: 'armored', count: 6,  hpScale: 92, speedScale: 0.95 },
        { creepType: 'evasive', count: 2,  hpScale: 92, speedScale: 1 },
      ] },
    { wave: 12, isBoss: true,  spawnInterval: 360,
      groups: [
        { creepType: 'boss',     count: 1,  hpScale: 130, speedScale: 1 },
        { creepType: 'standard', count: 10, hpScale: 108, speedScale: 1 },
        { creepType: 'armored',  count: 4,  hpScale: 108, speedScale: 0.95 },
      ] },
  ];
}
