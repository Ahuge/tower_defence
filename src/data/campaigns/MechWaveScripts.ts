/**
 * MechWaveScripts — per-mission wave-script builders for the Iron
 * Cascade campaign.
 *
 * Extracted from mechanical.ts so the per-mission overrides stay
 * readable. Each builder returns a WaveDefinition[] using the
 * mech_* creep types (CreepTypes.ts).
 *
 * Design goal: the narrative-promised enemy types actually appear
 * in the wave content, in proportions that match the campaign
 * voice. M5 (Iron Convoy) and M9 (The Ace) are inline in
 * mechanical.ts because they're marquee missions worth reading
 * top-to-bottom. M1, M2, M4, M6 — lighter alignment — live here.
 */

import type { WaveDefinition } from '../WaveDefinitions';

/** M2 The Pass — Voss's advance column tightens through 15 canyon
 *  waves. Scouts open the road; skiff escorts press through pylon
 *  suppression; light walkers form the main body; armored walkers
 *  anchor the tail. */
export function buildPassColumn(): WaveDefinition[] {
  return [
    { wave: 1,  isBoss: false, spawnInterval: 600,
      groups: [{ creepType: 'mech_scout', count: 8, hpScale: 28, speedScale: 1 }] },
    { wave: 2,  isBoss: false, spawnInterval: 560,
      groups: [
        { creepType: 'mech_scout',        count: 6, hpScale: 32, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 2, hpScale: 32, speedScale: 1 },
      ] },
    { wave: 3,  isBoss: false, spawnInterval: 520,
      groups: [
        { creepType: 'mech_skiff',        count: 4, hpScale: 38, speedScale: 1 },
        { creepType: 'mech_light_walker', count: 2, hpScale: 38, speedScale: 1 },
      ] },
    { wave: 4,  isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'mech_light_walker', count: 5, hpScale: 44, speedScale: 1 },
        { creepType: 'mech_scout',        count: 4, hpScale: 44, speedScale: 1 },
      ] },
    { wave: 5,  isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'mech_light_walker', count: 7, hpScale: 50, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 4, hpScale: 50, speedScale: 1 },
      ] },
    { wave: 6,  isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'mech_light_walker', count: 6, hpScale: 56, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 1, hpScale: 56, speedScale: 1 },
      ] },
    { wave: 7,  isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'mech_light_walker', count: 8, hpScale: 62, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 4, hpScale: 62, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 1, hpScale: 62, speedScale: 1 },
      ] },
    { wave: 8,  isBoss: false, spawnInterval: 420,
      groups: [
        { creepType: 'mech_light_walker',   count: 8, hpScale: 68, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 68, speedScale: 1 },
      ] },
    { wave: 9,  isBoss: false, spawnInterval: 400,
      groups: [
        { creepType: 'mech_scout',          count: 8, hpScale: 76, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 6, hpScale: 76, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 76, speedScale: 1 },
      ] },
    { wave: 10, isBoss: false, spawnInterval: 380,
      groups: [
        { creepType: 'mech_light_walker',   count: 10, hpScale: 84, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3,  hpScale: 84, speedScale: 1 },
      ] },
    { wave: 11, isBoss: false, spawnInterval: 360,
      groups: [
        { creepType: 'mech_skiff',          count: 6, hpScale: 92, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3, hpScale: 92, speedScale: 1 },
      ] },
    { wave: 12, isBoss: false, spawnInterval: 340,
      groups: [
        { creepType: 'mech_light_walker',   count: 10, hpScale: 100, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4,  hpScale: 100, speedScale: 1 },
      ] },
    { wave: 13, isBoss: false, spawnInterval: 320,
      groups: [
        { creepType: 'mech_scout',          count: 10, hpScale: 110, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4,  hpScale: 110, speedScale: 1 },
      ] },
    { wave: 14, isBoss: false, spawnInterval: 300,
      groups: [
        { creepType: 'mech_light_walker',   count: 12, hpScale: 120, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4,  hpScale: 120, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 6,  hpScale: 120, speedScale: 1 },
      ] },
    { wave: 15, isBoss: true, spawnInterval: 280,
      groups: [
        // Wave 15 capstone — the column's heaviest push.
        { creepType: 'mech_armored_walker', count: 6,  hpScale: 130, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 8,  hpScale: 130, speedScale: 1 },
      ] },
  ];
}

/** M4 Spire Falls — base_defense, walkers press from every approach.
 *  Walker-heavy waves with skiff harass. The narrative loss
 *  mission, so wave content escalates aggressively. */
export function buildSpireFalls(): WaveDefinition[] {
  return [
    { wave: 1,  isBoss: false, spawnInterval: 550,
      groups: [{ creepType: 'mech_light_walker', count: 6, hpScale: 32, speedScale: 1 }] },
    { wave: 2,  isBoss: false, spawnInterval: 520,
      groups: [
        { creepType: 'mech_light_walker', count: 7, hpScale: 38, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 2, hpScale: 38, speedScale: 1 },
      ] },
    { wave: 3,  isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'mech_light_walker', count: 8, hpScale: 44, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 4, hpScale: 44, speedScale: 1 },
      ] },
    { wave: 4,  isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'mech_light_walker',   count: 7, hpScale: 52, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 52, speedScale: 1 },
      ] },
    { wave: 5,  isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'mech_armored_walker', count: 3, hpScale: 60, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 6, hpScale: 60, speedScale: 1 },
      ] },
    { wave: 6,  isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'mech_skiff',          count: 6, hpScale: 68, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3, hpScale: 68, speedScale: 1 },
      ] },
    { wave: 7,  isBoss: false, spawnInterval: 420,
      groups: [
        { creepType: 'mech_light_walker',   count: 8, hpScale: 76, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4, hpScale: 76, speedScale: 1 },
      ] },
    { wave: 8,  isBoss: false, spawnInterval: 400,
      groups: [
        { creepType: 'mech_armored_walker', count: 5, hpScale: 84, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 6, hpScale: 84, speedScale: 1 },
      ] },
    { wave: 9,  isBoss: false, spawnInterval: 380,
      groups: [
        { creepType: 'mech_light_walker',   count: 10, hpScale: 92, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4,  hpScale: 92, speedScale: 1 },
      ] },
    { wave: 10, isBoss: false, spawnInterval: 360,
      groups: [
        { creepType: 'mech_armored_walker', count: 6, hpScale: 100, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 6, hpScale: 100, speedScale: 1 },
      ] },
    { wave: 11, isBoss: false, spawnInterval: 340,
      groups: [
        { creepType: 'mech_skiff',          count: 8, hpScale: 110, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 5, hpScale: 110, speedScale: 1 },
      ] },
    { wave: 12, isBoss: false, spawnInterval: 320,
      groups: [
        { creepType: 'mech_light_walker',   count: 12, hpScale: 120, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 5,  hpScale: 120, speedScale: 1 },
      ] },
    { wave: 13, isBoss: false, spawnInterval: 300,
      groups: [
        { creepType: 'mech_armored_walker', count: 7, hpScale: 130, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 8, hpScale: 130, speedScale: 1 },
      ] },
    { wave: 14, isBoss: false, spawnInterval: 280,
      groups: [
        { creepType: 'mech_light_walker',   count: 14, hpScale: 140, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 6,  hpScale: 140, speedScale: 1 },
      ] },
    { wave: 15, isBoss: true, spawnInterval: 260,
      groups: [
        // Wave 15 — the gate breaks. Heavy armored push.
        { creepType: 'mech_armored_walker', count: 8, hpScale: 150, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 6, hpScale: 150, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 8, hpScale: 150, speedScale: 1 },
      ] },
  ];
}

/** M6 First Light — speedrun strike on the rail yard. Rail-themed
 *  waves: fast scout + skiff swarms with periodic walker frames
 *  rolling off the assembly line. Higher creep density per wave
 *  matches the "rail yard mobilizing" narrative. */
export function buildRailYardAssault(): WaveDefinition[] {
  // 20 waves; spawn intervals stay tight throughout (rail-yard
  // pace) and hpScale ramps moderately so the speedrun stays
  // about routing + Pylon timing, not pure stat checks.
  const waves: WaveDefinition[] = [];
  for (let i = 1; i <= 20; i++) {
    const hp = 26 + i * 6;
    const spawn = Math.max(220, 480 - i * 12);
    const groups: WaveDefinition['groups'] = [];
    // Rail-yard composition: more skiffs + scouts than walkers
    // (the yard is producing light frames; heavies are mid-line).
    groups.push({ creepType: 'mech_scout', count: 4 + Math.floor(i / 3), hpScale: hp, speedScale: 1 });
    groups.push({ creepType: 'mech_skiff', count: 2 + Math.floor(i / 2), hpScale: hp, speedScale: 1 });
    if (i >= 4) {
      groups.push({ creepType: 'mech_light_walker', count: 1 + Math.floor(i / 4), hpScale: hp, speedScale: 1 });
    }
    if (i >= 10) {
      groups.push({ creepType: 'mech_armored_walker', count: 1 + Math.floor((i - 10) / 4), hpScale: hp, speedScale: 1 });
    }
    waves.push({ wave: i, isBoss: i === 20, spawnInterval: spawn, groups });
  }
  return waves;
}
