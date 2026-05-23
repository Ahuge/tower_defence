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

/** M10 Counterfactual's Mirror — the three-setpiece finale.
 *
 *  Wave layout maps to the three setpieces in
 *  CounterfactualMirrorController:
 *
 *    Waves 1-5: Approach — the cathedral-casino's outer hall.
 *      Standard escalating waves. Each clear advances
 *      `controller.advanceApproachWave()`; after 5 clears the stage
 *      flips to 'mirror_lane'.
 *    Waves 6-10: Mirror Lane — single-grid v1 simulation. Player
 *      clears advance the Mirror Lane controller's player side via
 *      `recordPlayerClear`; the simulated Counterfactual side ticks
 *      automatically (GameScene timer drives `recordCounterfactualClear`
 *      based on `getPressureCoefficients`). First to laneLength wins
 *      the lane; player win → stage flips to 'table', loss → mission
 *      lost.
 *    Wave 11: The Table — the Counterfactual boss spawns alone. HP
 *      from `counterfactualBossHp(tally)`; in v1 the wave-script
 *      hpScale gives a meaningful baseline (300) and GameScene
 *      multiplies on spawn for tally-scaled difficulty. Boss kill
 *      flips stage to 'complete' → mission won.
 *    Wave 12: Backstop boss escort (only reached if the player
 *      somehow leaves the wave-11 boss alive long enough to next-
 *      wave through). Standard creeps to keep pressure if the boss
 *      is still up.
 *
 *  waveCount in the mission entry is 999 (endless-until-win-trigger,
 *  matching the Mech sabotage pattern), so the player can't run out
 *  of waves while fighting the boss. */
export function buildSnakeEyesM10Waves(): WaveDefinition[] {
  return [
    // ─── Setpiece 1 — Approach ───────────────────────────────────
    { wave: 1, isBoss: false, spawnInterval: 600,
      groups: [{ creepType: 'standard', count: 8, hpScale: 30, speedScale: 1 }] },
    { wave: 2, isBoss: false, spawnInterval: 560,
      groups: [
        { creepType: 'standard', count: 8, hpScale: 36, speedScale: 1 },
        { creepType: 'fast',     count: 3, hpScale: 36, speedScale: 1.05 },
      ] },
    { wave: 3, isBoss: false, spawnInterval: 520,
      groups: [
        { creepType: 'standard', count: 6, hpScale: 42, speedScale: 1 },
        { creepType: 'armored',  count: 3, hpScale: 42, speedScale: 0.95 },
        { creepType: 'fast',     count: 4, hpScale: 42, speedScale: 1.05 },
      ] },
    { wave: 4, isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'armored', count: 5, hpScale: 50, speedScale: 0.95 },
        { creepType: 'swarm',   count: 6, hpScale: 50, speedScale: 1.1 },
      ] },
    { wave: 5, isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'armored',  count: 6, hpScale: 60, speedScale: 0.95 },
        { creepType: 'shielded', count: 2, hpScale: 60, speedScale: 1 },
        { creepType: 'fast',     count: 6, hpScale: 60, speedScale: 1.05 },
      ] },
    // ─── Setpiece 2 — Mirror Lane ────────────────────────────────
    // Player + Counterfactual race. Player clears feed
    // recordPlayerClear; simulated CF clears tick via GameScene timer.
    { wave: 6, isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'standard', count: 10, hpScale: 70, speedScale: 1 },
        { creepType: 'fast',     count: 5,  hpScale: 70, speedScale: 1.05 },
      ] },
    { wave: 7, isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'armored', count: 6, hpScale: 80, speedScale: 0.95 },
        { creepType: 'swarm',   count: 8, hpScale: 80, speedScale: 1.1 },
      ] },
    { wave: 8, isBoss: false, spawnInterval: 420,
      groups: [
        { creepType: 'fast',     count: 8, hpScale: 90, speedScale: 1.05 },
        { creepType: 'shielded', count: 3, hpScale: 90, speedScale: 1 },
      ] },
    { wave: 9, isBoss: false, spawnInterval: 400,
      groups: [
        { creepType: 'armored', count: 7,  hpScale: 100, speedScale: 0.95 },
        { creepType: 'swarm',   count: 10, hpScale: 100, speedScale: 1.1 },
        { creepType: 'evasive', count: 2,  hpScale: 100, speedScale: 1 },
      ] },
    { wave: 10, isBoss: false, spawnInterval: 380,
      groups: [
        { creepType: 'armored',  count: 8, hpScale: 110, speedScale: 0.95 },
        { creepType: 'shielded', count: 3, hpScale: 110, speedScale: 1 },
        { creepType: 'evasive',  count: 3, hpScale: 110, speedScale: 1 },
      ] },
    // ─── Setpiece 3 — The Table ──────────────────────────────────
    // The Counterfactual boss creep — its own typeId so GameScene's
    // M10 boss-kill detection can narrow on `void_counterfactual`
    // without colliding with the generic `boss` creep used by other
    // waves / campaigns. Wave-script `hpScale` is the v1 baseline;
    // GameScene overrides on spawn from
    // `controller.getM10Controller().getSnapshot().bossHpMax` so
    // lifetime Pactbook tally drives true difficulty (see the
    // M10-polish PRD for the spawn-time override commit).
    { wave: 11, isBoss: true, spawnInterval: 0,
      groups: [
        { creepType: 'void_counterfactual', count: 1, hpScale: 200, speedScale: 0.8 },
      ] },
    // Backstop wave 12 — only reached if the player next-waves past
    // the boss without killing him (e.g. abuse pause flow). Keeps
    // the run from going silent if M10's win-detection misfires.
    { wave: 12, isBoss: true, spawnInterval: 340,
      groups: [
        { creepType: 'void_counterfactual', count: 1,  hpScale: 240, speedScale: 0.8 },
        { creepType: 'armored',             count: 10, hpScale: 130, speedScale: 0.95 },
      ] },
  ];
}
