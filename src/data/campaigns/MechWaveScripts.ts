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

/** M3 The Cipher — 10-wave heist. Player intercepts Voss's armored
 *  convoy ferrying stolen tomes to the foundries. Scouts open as
 *  forward outriders; skiffs screen the air; mech_armored_walker is
 *  the convoy body; wave 10 plays as the convoy lead arriving in
 *  force. Lore promise "armored convoy bound for the foundries" maps
 *  directly onto the wave composition. */
export function buildArmoredConvoy(): WaveDefinition[] {
  return [
    { wave: 1,  isBoss: false, spawnInterval: 620,
      groups: [{ creepType: 'mech_scout', count: 6, hpScale: 28, speedScale: 1 }] },
    { wave: 2,  isBoss: false, spawnInterval: 580,
      groups: [
        { creepType: 'mech_scout', count: 5, hpScale: 32, speedScale: 1 },
        { creepType: 'mech_skiff', count: 2, hpScale: 32, speedScale: 1 },
      ] },
    { wave: 3,  isBoss: false, spawnInterval: 540,
      groups: [
        { creepType: 'mech_scout',          count: 4, hpScale: 36, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 3, hpScale: 36, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 1, hpScale: 36, speedScale: 1 },
      ] },
    { wave: 4,  isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'mech_skiff',          count: 3, hpScale: 42, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 42, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 2, hpScale: 42, speedScale: 1 },
      ] },
    { wave: 5,  isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'mech_armored_walker', count: 3, hpScale: 50, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 3, hpScale: 50, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 2, hpScale: 50, speedScale: 1 },
      ] },
    { wave: 6,  isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'mech_armored_walker', count: 4, hpScale: 56, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 4, hpScale: 56, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 2, hpScale: 56, speedScale: 1 },
      ] },
    { wave: 7,  isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'mech_armored_walker', count: 5, hpScale: 64, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 3, hpScale: 64, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 3, hpScale: 64, speedScale: 1 },
      ] },
    { wave: 8,  isBoss: false, spawnInterval: 420,
      groups: [
        { creepType: 'mech_armored_walker', count: 5, hpScale: 72, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 4, hpScale: 72, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 3, hpScale: 72, speedScale: 1 },
      ] },
    { wave: 9,  isBoss: false, spawnInterval: 400,
      groups: [
        { creepType: 'mech_armored_walker', count: 6, hpScale: 80, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 4, hpScale: 80, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 3, hpScale: 80, speedScale: 1 },
      ] },
    { wave: 10, isBoss: true,  spawnInterval: 380,
      groups: [
        // Convoy lead arrives — heaviest armored push with light
        // frames running alongside the column.
        { creepType: 'mech_armored_walker', count: 8, hpScale: 90, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 4, hpScale: 90, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 5, hpScale: 90, speedScale: 1 },
      ] },
  ];
}

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

/** M6 First Light — speedrun strike on the rail yard. The yard's
 *  whole purpose is producing walker frames, so walkers are the
 *  main body from wave 1; scouts + skiffs are the perimeter screen
 *  and air cover that rolls alongside them. Armored frames join
 *  mid-line. Bespoke walker art (mech_campaign_creeps cols 2/3)
 *  carries the rail-yard visual story. */
export function buildRailYardAssault(): WaveDefinition[] {
  // 20 waves; spawn intervals stay tight throughout (rail-yard
  // pace) and hpScale ramps moderately so the speedrun stays
  // about routing + Pylon timing, not pure stat checks.
  const waves: WaveDefinition[] = [];
  for (let i = 1; i <= 20; i++) {
    const hp = 26 + i * 6;
    const spawn = Math.max(220, 480 - i * 12);
    const groups: WaveDefinition['groups'] = [];
    // Rail-yard composition: walkers dominate (main product),
    // scouts + skiffs screen the perimeter. Armored heavies
    // start joining at wave 5 once the yard's heavy line spins up.
    groups.push({ creepType: 'mech_light_walker', count: 2 + Math.floor(i / 2), hpScale: hp, speedScale: 1 });
    groups.push({ creepType: 'mech_scout', count: 3 + Math.floor(i / 4), hpScale: hp, speedScale: 1 });
    groups.push({ creepType: 'mech_skiff', count: 2 + Math.floor(i / 3), hpScale: hp, speedScale: 1 });
    if (i >= 5) {
      groups.push({ creepType: 'mech_armored_walker', count: 1 + Math.floor((i - 5) / 3), hpScale: hp, speedScale: 1 });
    }
    waves.push({ wave: i, isBoss: i === 20, spawnInterval: spawn, groups });
  }
  return waves;
}

/** M7 Rationed Mana — 15 waves on the islands map. The player is on
 *  half gold + a 6-tower cap; the wave script intentionally runs
 *  lighter than M2/M4 so the restriction is the challenge, not raw
 *  enemy volume. Iron Cascade voice maintained: scouts open, light
 *  walkers form the body, armored frames join mid-campaign, skiffs
 *  harass the islands' chokepoints. No ace/flagship — those are the
 *  marquee sets for M5 and M9. */
export function buildRationedSiege(): WaveDefinition[] {
  return [
    { wave: 1,  isBoss: false, spawnInterval: 600,
      groups: [{ creepType: 'mech_scout', count: 5, hpScale: 26, speedScale: 1 }] },
    { wave: 2,  isBoss: false, spawnInterval: 580,
      groups: [
        { creepType: 'mech_scout',        count: 4, hpScale: 30, speedScale: 1 },
        { creepType: 'mech_light_walker', count: 2, hpScale: 30, speedScale: 1 },
      ] },
    { wave: 3,  isBoss: false, spawnInterval: 560,
      groups: [
        { creepType: 'mech_light_walker', count: 4, hpScale: 36, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 2, hpScale: 36, speedScale: 1 },
      ] },
    { wave: 4,  isBoss: false, spawnInterval: 540,
      groups: [
        { creepType: 'mech_light_walker', count: 5, hpScale: 42, speedScale: 1 },
        { creepType: 'mech_scout',        count: 3, hpScale: 42, speedScale: 1 },
      ] },
    { wave: 5,  isBoss: false, spawnInterval: 520,
      groups: [
        { creepType: 'mech_light_walker', count: 5, hpScale: 48, speedScale: 1 },
        { creepType: 'mech_skiff',        count: 3, hpScale: 48, speedScale: 1 },
      ] },
    { wave: 6,  isBoss: false, spawnInterval: 500,
      groups: [
        { creepType: 'mech_light_walker',   count: 5, hpScale: 56, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 1, hpScale: 56, speedScale: 1 },
      ] },
    { wave: 7,  isBoss: false, spawnInterval: 480,
      groups: [
        { creepType: 'mech_light_walker',   count: 6, hpScale: 64, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 3, hpScale: 64, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 1, hpScale: 64, speedScale: 1 },
      ] },
    { wave: 8,  isBoss: false, spawnInterval: 460,
      groups: [
        { creepType: 'mech_light_walker',   count: 6, hpScale: 72, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 72, speedScale: 1 },
      ] },
    { wave: 9,  isBoss: false, spawnInterval: 440,
      groups: [
        { creepType: 'mech_scout',          count: 5, hpScale: 80, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 5, hpScale: 80, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 2, hpScale: 80, speedScale: 1 },
      ] },
    { wave: 10, isBoss: false, spawnInterval: 420,
      groups: [
        { creepType: 'mech_light_walker',   count: 7, hpScale: 88, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3, hpScale: 88, speedScale: 1 },
      ] },
    { wave: 11, isBoss: false, spawnInterval: 400,
      groups: [
        { creepType: 'mech_skiff',          count: 4, hpScale: 96, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3, hpScale: 96, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 4, hpScale: 96, speedScale: 1 },
      ] },
    { wave: 12, isBoss: false, spawnInterval: 380,
      groups: [
        { creepType: 'mech_light_walker',   count: 7, hpScale: 104, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 3, hpScale: 104, speedScale: 1 },
      ] },
    { wave: 13, isBoss: false, spawnInterval: 360,
      groups: [
        { creepType: 'mech_armored_walker', count: 4, hpScale: 112, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 5, hpScale: 112, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 4, hpScale: 112, speedScale: 1 },
      ] },
    { wave: 14, isBoss: false, spawnInterval: 340,
      groups: [
        { creepType: 'mech_light_walker',   count: 8, hpScale: 120, speedScale: 1 },
        { creepType: 'mech_armored_walker', count: 4, hpScale: 120, speedScale: 1 },
      ] },
    { wave: 15, isBoss: true,  spawnInterval: 320,
      groups: [
        { creepType: 'mech_armored_walker', count: 5, hpScale: 130, speedScale: 1 },
        { creepType: 'mech_light_walker',   count: 7, hpScale: 130, speedScale: 1 },
        { creepType: 'mech_skiff',          count: 5, hpScale: 130, speedScale: 1 },
      ] },
  ];
}

/** M10 The Overthrow — the foundry-throne finale. Win condition is
 *  throne-down (sabotage finale), not survival, but the lore promises
 *  "every surviving walker and pilot in the region converges on the
 *  factory district to defend him." This wave script delivers that
 *  convergence: light + armored walkers as the backbone, skiff air
 *  harass every wave, scout probes on odd waves, ace pilot interludes
 *  every 5th wave, and flagship capstones every 8th wave. HP scales
 *  steadily across 999 waves; counts cap so late-game waves stay
 *  readable. Mission's `waveCount: 999` magic number means the player
 *  may never exhaust the script — they win by destroying the throne. */
export function buildThroneSiege(): WaveDefinition[] {
  // 999 entries is ~50KB of WaveDefinition objects at module load.
  // The mission win condition is throne-down so the player normally
  // burns through 20-40 of these; the long tail exists to make sure
  // a stalled run never runs out of waves to fight.
  const waves: WaveDefinition[] = [];
  for (let i = 1; i <= 999; i++) {
    const hp = 60 + i * 6;
    const spawn = Math.max(160, 480 - i * 5);
    const groups: WaveDefinition['groups'] = [];

    // Backbone — light walkers (the convergence body).
    groups.push({
      creepType: 'mech_light_walker',
      count: Math.min(12, 4 + Math.floor(i / 2)),
      hpScale: hp, speedScale: 1,
    });

    // Armored anchor — joins from wave 2.
    if (i >= 2) {
      groups.push({
        creepType: 'mech_armored_walker',
        count: Math.min(8, 1 + Math.floor(i / 3)),
        hpScale: hp, speedScale: 1,
      });
    }

    // Skiff air harass — every wave.
    groups.push({
      creepType: 'mech_skiff',
      count: Math.min(8, 2 + Math.floor(i / 4)),
      hpScale: hp, speedScale: 1,
    });

    // Scout probes — odd waves only, so they read as recon pulses
    // between the heavier pushes rather than constant noise.
    if (i % 2 === 1) {
      groups.push({
        creepType: 'mech_scout',
        count: Math.min(8, 2 + Math.floor(i / 4)),
        hpScale: hp, speedScale: 1,
      });
    }

    // Ace pilot interlude — every 5th wave. Voss's surviving aces
    // making their stand around the throne. Stays at 1 until wave 25,
    // then up to 3 at wave 50.
    if (i % 5 === 0) {
      groups.push({
        creepType: 'mech_ace_pilot',
        count: Math.min(3, 1 + Math.floor(i / 25)),
        hpScale: hp, speedScale: 1,
      });
    }

    // Flagship capstone — every 8th wave. The named flagships from
    // M5 reappearing as the heaviest defenders of the foundry.
    if (i % 8 === 0) {
      groups.push({
        creepType: 'mech_flagship_walker',
        count: Math.min(3, 1 + Math.floor(i / 32)),
        hpScale: hp, speedScale: 1,
      });
    }

    waves.push({ wave: i, isBoss: i % 10 === 0, spawnInterval: spawn, groups });
  }
  return waves;
}
