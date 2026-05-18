/**
 * Mechanical Campaign — Iron Cascade.
 *
 * Player POV: Master Vael, an Arcane archmage of the Eastern Spire.
 * Antagonist: Lord-Architect Voss — a human tyrant who has built an
 * industrial war-machine empire and is moving to outlaw and erase
 * arcane magic. Vael fights with the Arcane tower kit throughout —
 * `defaultPlayerFaction: 'arcane'` on the campaign def applies to
 * every mission, no per-mission override needed.
 *
 * Story arc — three acts:
 *   Act I  (M1–M3): Defend the spire's outer holdings while messengers
 *                   warn the rest of the order. Recover stolen tomes.
 *   Act II (M4–M7): The Spire falls in M4 — Vael flees with the codex.
 *                   Pursue Voss's column across his frontier; ration
 *                   what was salvaged.
 *   Act III(M8–M10): Strike at Voss's industrial heart. Beat his Ace,
 *                   then storm his foundry-throne.
 *
 * Voss's signature device — Suppression Pylons — appears across M2,
 * M5, M6, M8 as a recurring hazard that stalls Vael's towers until
 * the player channels them. The pylons in M10 are the Throne itself.
 */

import type { CampaignDef } from './CampaignDef';
import { MECHANICAL_TEXTS } from './texts/mechanical.texts';
import {
  buildPassColumn,
  buildSpireFalls,
  buildRailYardAssault,
} from './MechWaveScripts';

const T = MECHANICAL_TEXTS;

export const MECHANICAL_CAMPAIGN: CampaignDef = {
  factionId: 'mechanical',
  name: T.campaign.name,
  defaultMapThemeOverride: 'factory',
  defaultPlayerFaction: 'arcane',
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  missions: [
    // ─── Act I — Defend ───────────────────────────────────────

    // 1 — Listening post. Basic Arcane kit only; Voss's scouts probe.
    // Narrative: "fast riders and light walkers sent to cut our
    // warning lines." Wave script delivers exactly that — scouts
    // early, light walkers mid, mixed late.
    {
      id: 'perimeter_breach',
      idx: 0,
      name: T.missions.perimeter_breach.name,
      story: T.missions.perimeter_breach.story,
      archetype: 'restriction',
      overrides: {
        mapId: 'plains',
        difficulty: 'easy',
        waveCount: 10,
        restrictions: {
          allowedTowerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus'],
        },
        waveScript: [
          { wave: 1, isBoss: false, spawnInterval: 700,
            groups: [
              { creepType: 'mech_scout',        count: 6, hpScale: 20, speedScale: 1 },
            ] },
          { wave: 2, isBoss: false, spawnInterval: 650,
            groups: [
              { creepType: 'mech_scout',        count: 8, hpScale: 24, speedScale: 1 },
            ] },
          { wave: 3, isBoss: false, spawnInterval: 600,
            groups: [
              { creepType: 'mech_scout',        count: 6, hpScale: 28, speedScale: 1 },
              { creepType: 'mech_light_walker', count: 2, hpScale: 28, speedScale: 1 },
            ] },
          { wave: 4, isBoss: false, spawnInterval: 550,
            groups: [
              { creepType: 'mech_scout',        count: 5, hpScale: 32, speedScale: 1 },
              { creepType: 'mech_light_walker', count: 4, hpScale: 32, speedScale: 1 },
            ] },
          { wave: 5, isBoss: false, spawnInterval: 500,
            groups: [
              { creepType: 'mech_light_walker', count: 7, hpScale: 38, speedScale: 1 },
            ] },
          { wave: 6, isBoss: false, spawnInterval: 480,
            groups: [
              { creepType: 'mech_scout',        count: 6, hpScale: 42, speedScale: 1 },
              { creepType: 'mech_light_walker', count: 5, hpScale: 42, speedScale: 1 },
            ] },
          { wave: 7, isBoss: false, spawnInterval: 450,
            groups: [
              { creepType: 'mech_light_walker', count: 8, hpScale: 48, speedScale: 1 },
              { creepType: 'mech_scout',        count: 4, hpScale: 48, speedScale: 1 },
            ] },
          { wave: 8, isBoss: false, spawnInterval: 420,
            groups: [
              { creepType: 'mech_light_walker', count: 6, hpScale: 54, speedScale: 1 },
              { creepType: 'mech_scout',        count: 8, hpScale: 54, speedScale: 1 },
            ] },
          { wave: 9, isBoss: false, spawnInterval: 400,
            groups: [
              { creepType: 'mech_light_walker', count: 8, hpScale: 60, speedScale: 1 },
              { creepType: 'mech_scout',        count: 6, hpScale: 60, speedScale: 1 },
            ] },
          { wave: 10, isBoss: false, spawnInterval: 380,
            groups: [
              { creepType: 'mech_light_walker', count: 10, hpScale: 70, speedScale: 1 },
              { creepType: 'mech_scout',        count: 8,  hpScale: 70, speedScale: 1 },
            ] },
        ],
      },
      objectives: {
        star2: { label: T.missions.perimeter_breach.objectives.star2, predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: T.missions.perimeter_breach.objectives.star3, predicate: r => r.towerCount <= 8 },
      },
    },

    // 2 — Canyon road. First encounter with a Suppression Pylon.
    // Narrative: "Voss's advance column reached the canyon roads."
    // Wave script delivers a literal advance column — scouts open
    // the road, skiff escorts press through the suppression fields,
    // light walkers form the main body, armored walkers anchor the
    // tail. The column compresses across 15 waves.
    {
      id: 'the_pass',
      idx: 1,
      name: T.missions.the_pass.name,
      story: T.missions.the_pass.story,
      archetype: 'standard',
      overrides: {
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 15,
        // Three pylons cover the three open corridors of serpentine
        // (top, middle, bottom). Forces the player to either spread
        // through suppression fields or channel them — a maze in one
        // safe corner is no longer viable.
        suppressionPylons: [
          { col: 12, row: 3,  radius: 4 },
          { col: 18, row: 12, radius: 5 },
          { col: 24, row: 22, radius: 4 },
        ],
        waveScript: buildPassColumn(),
      },
      objectives: {
        star2: { label: T.missions.the_pass.objectives.star2, predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.7) },
        star3: { label: T.missions.the_pass.objectives.star3, predicate: r => r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 3 — Heist. Voss's couriers carry stolen Arcane tomes east.
    {
      id: 'the_cipher',
      idx: 2,
      name: T.missions.the_cipher.name,
      story: T.missions.the_cipher.story,
      archetype: 'heist',
      overrides: {
        mapId: 'heist_vault',
        difficulty: 'normal',
        waveCount: 10,
      },
      objectives: {
        star2: {
          label: T.missions.the_cipher.objectives.star2,
          predicate: r => r.won && (r.custom.sendsBought as number ?? 0) === 0,
        },
        star3: { label: T.missions.the_cipher.objectives.star3, predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
      },
    },

    // ─── Act II — Strike Out ──────────────────────────────────

    // 4 — The Spire falls. The inciting loss that drives the rest.
    // Narrative: "Walkers press from every approach." Walker-heavy
    // waves on the 4-edge base_defense arena. See buildSpireFalls.
    {
      id: 'spire_falls',
      idx: 3,
      name: T.missions.spire_falls.name,
      story: T.missions.spire_falls.story,
      archetype: 'base_defense',
      overrides: {
        mapId: 'base_arena',
        difficulty: 'normal',
        waveCount: 15,
        waveScript: buildSpireFalls(),
      },
      objectives: {
        star2: { label: T.missions.spire_falls.objectives.star2, predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: T.missions.spire_falls.objectives.star3, predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
      },
    },

    // 5 — Iron Convoy. Five flagship walkers; pylons cover the road.
    // Narrative: "armor vents briefly whenever the Suppression
    // Pylons cycle. Burst the walkers down during the gaps."
    // The flagship_walker creep carries the mech_pylon_vent_armor
    // trait (commit 2) — takes 60% bonus damage while a player-
    // channeled pylon is muted.
    {
      id: 'iron_convoy',
      idx: 4,
      name: T.missions.iron_convoy.name,
      story: T.missions.iron_convoy.story,
      archetype: 'boss_rush',
      overrides: {
        mapId: 'crossroads',
        difficulty: 'hard',
        waveCount: 5,
        suppressionPylons: [
          { col: 12, row: 10, radius: 4 },
          { col: 22, row: 14, radius: 4 },
        ],
        // Five flagship-walker waves with escalating escort. Each
        // wave is ONE flagship as the boss + a growing support
        // column. The vent-armor mechanic gates damage on
        // pylon-muted windows, so the player learns to alternate
        // channel timing with focused burst on the boss.
        waveScript: [
          { wave: 1, isBoss: true, spawnInterval: 0,
            groups: [
              { creepType: 'mech_flagship_walker', count: 1, hpScale: 80, speedScale: 1 },
            ] },
          { wave: 2, isBoss: true, spawnInterval: 350,
            groups: [
              { creepType: 'mech_flagship_walker', count: 1, hpScale: 95, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 2, hpScale: 95, speedScale: 1 },
            ] },
          { wave: 3, isBoss: true, spawnInterval: 280,
            groups: [
              { creepType: 'mech_flagship_walker', count: 1, hpScale: 115, speedScale: 1 },
              { creepType: 'mech_skiff',           count: 4, hpScale: 115, speedScale: 1 },
            ] },
          { wave: 4, isBoss: true, spawnInterval: 280,
            groups: [
              { creepType: 'mech_flagship_walker', count: 1, hpScale: 140, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 2, hpScale: 140, speedScale: 1 },
              { creepType: 'mech_skiff',           count: 4, hpScale: 140, speedScale: 1 },
            ] },
          { wave: 5, isBoss: true, spawnInterval: 240,
            groups: [
              { creepType: 'mech_flagship_walker', count: 1, hpScale: 170, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 3, hpScale: 170, speedScale: 1 },
              { creepType: 'mech_skiff',           count: 6, hpScale: 170, speedScale: 1 },
            ] },
        ],
      },
      objectives: {
        star2: { label: T.missions.iron_convoy.objectives.star2, predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: T.missions.iron_convoy.objectives.star3, predicate: r => r.won && r.durationMs < 7 * 60 * 1000 },
      },
    },

    // 6 — Speedrun. Strike Voss's rail yard before he mobilises.
    {
      id: 'first_light',
      idx: 5,
      name: T.missions.first_light.name,
      story: T.missions.first_light.story,
      archetype: 'speedrun',
      overrides: {
        mapId: 'fortress',
        difficulty: 'normal',
        waveCount: 20,
        suppressionPylons: [
          { col: 8, row: 8, radius: 4 },
          { col: 18, row: 14, radius: 4 },
          { col: 28, row: 10, radius: 4 },
        ],
        // Rail-yard waves — 20 tight intervals; scout/skiff swarms
        // with walker frames rolling off the assembly mid-mission.
        // See buildRailYardAssault for the curve.
        waveScript: buildRailYardAssault(),
      },
      objectives: {
        star2: { label: T.missions.first_light.objectives.star2, predicate: r => r.won && r.durationMs < 12 * 60 * 1000 },
        star3: { label: T.missions.first_light.objectives.star3, predicate: r => r.won && r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 7 — Frugal. Aftermath of the spire's fall: half the resources.
    {
      id: 'rationed_mana',
      idx: 6,
      name: T.missions.rationed_mana.name,
      story: T.missions.rationed_mana.story,
      archetype: 'frugal',
      overrides: {
        mapId: 'islands',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: T.missions.rationed_mana.objectives.star2, predicate: r => r.won && r.towerCount <= 5 },
        star3: { label: T.missions.rationed_mana.objectives.star3, predicate: r => r.livesRemaining === r.livesStart },
      },
    },

    // ─── Act III — Their Country ──────────────────────────────

    // 8 — Attacker. Player commands raiders to break Voss's assembly.
    {
      id: 'saboteur_vanguard',
      idx: 7,
      name: T.missions.saboteur_vanguard.name,
      story: T.missions.saboteur_vanguard.story,
      archetype: 'attacker',
      overrides: {
        mapId: 'attacker_assault',
        difficulty: 'normal',
        waveCount: 10,
        suppressionPylons: [
          { col: 14, row: 8, radius: 4 },
          { col: 14, row: 18, radius: 4 },
        ],
      },
      objectives: {
        star2: {
          label: T.missions.saboteur_vanguard.objectives.star2,
          predicate: r => r.won && (r.custom.attackerLeaks as number ?? 0) >= 8,
        },
        star3: {
          label: T.missions.saboteur_vanguard.objectives.star3,
          predicate: r => r.won && (r.custom.attackerLeaks as number ?? 0) >= 12,
        },
      },
    },

    // 9 — Hero vs Boss. Voss's general — his "voice in the field."
    // Narrative: the Engineer asked for this fight. She helped build
    // early walker frames before deserting and knows how to break
    // one in single combat. The mission delivers the Ace as a named
    // boss (mech_ace_pilot) with escalating walker support across
    // 5 waves — phases of the duel, not generic boss-rush.
    {
      id: 'the_ace',
      idx: 8,
      name: T.missions.the_ace.name,
      story: T.missions.the_ace.story,
      archetype: 'hero_vs_boss',
      overrides: {
        mapId: 'hero_plains',
        difficulty: 'normal',
        waveCount: 5,
        heroId: 'engineer',
        // Five-phase duel. The Ace shows up every wave (he's the
        // mission's antagonist). Wave 1 is the Ace alone — the
        // Engineer's introduction shot. Subsequent waves layer in
        // walker frames the Engineer specifically claims expertise
        // against. hpScale climbs so the Ace stays a credible
        // threat as the player's hero levels up.
        waveScript: [
          { wave: 1, isBoss: true, spawnInterval: 0,
            groups: [
              { creepType: 'mech_ace_pilot',       count: 1, hpScale: 90,  speedScale: 1 },
            ] },
          { wave: 2, isBoss: true, spawnInterval: 400,
            groups: [
              { creepType: 'mech_ace_pilot',       count: 1, hpScale: 105, speedScale: 1 },
              { creepType: 'mech_light_walker',    count: 2, hpScale: 105, speedScale: 1 },
            ] },
          { wave: 3, isBoss: true, spawnInterval: 400,
            groups: [
              { creepType: 'mech_ace_pilot',       count: 1, hpScale: 125, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 2, hpScale: 125, speedScale: 1 },
            ] },
          { wave: 4, isBoss: true, spawnInterval: 320,
            groups: [
              { creepType: 'mech_ace_pilot',       count: 1, hpScale: 145, speedScale: 1 },
              { creepType: 'mech_light_walker',    count: 3, hpScale: 145, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 1, hpScale: 145, speedScale: 1 },
            ] },
          { wave: 5, isBoss: true, spawnInterval: 280,
            groups: [
              { creepType: 'mech_ace_pilot',       count: 1, hpScale: 175, speedScale: 1 },
              { creepType: 'mech_armored_walker',  count: 2, hpScale: 175, speedScale: 1 },
              { creepType: 'mech_light_walker',    count: 2, hpScale: 175, speedScale: 1 },
            ] },
        ],
      },
      objectives: {
        star2: {
          label: T.missions.the_ace.objectives.star2,
          predicate: r => r.won && (r.custom.heroHpMin as number ?? 1) >= 0.5,
        },
        star3: { label: T.missions.the_ace.objectives.star3, predicate: r => r.won && r.durationMs < 6 * 60 * 1000 },
      },
    },

    // 10 — The Overthrow. SabotageController owns the climax.
    {
      id: 'the_overthrow',
      idx: 9,
      name: T.missions.the_overthrow.name,
      story: T.missions.the_overthrow.story,
      archetype: 'final_sabotage',
      overrides: {
        mapId: 'mech_throne_finale',
        difficulty: 'hard',
        waveCount: 999,
        sabotageRules: {
          cpuTowerHpDefault: 600,
          cpuTowerOwnerIndex: 99,
        },
      },
      objectives: {
        star2: { label: T.missions.the_overthrow.objectives.star2, predicate: r => r.won && r.durationMs < 25 * 60 * 1000 },
        star3: { label: T.missions.the_overthrow.objectives.star3, predicate: r => r.won && r.livesRemaining === r.livesStart },
      },
    },
  ],
};
