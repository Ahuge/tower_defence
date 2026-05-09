/**
 * Mechanical Campaign — second campaign, ships in tier-1 progression.
 *
 * Player fights AGAINST the Mechanical faction across 10 missions.
 * Mechanical is a tier-1 unlock (1000 Shards in the faction tree, parent
 * of Military and Cypherpunk) — completing this campaign unlocks playing
 * AS Mechanical without a Shards spend, OR rewards Cores for players who
 * already paid Shards.
 *
 * v1 lineup leans on the new Plan 11/12/13 archetypes proper:
 *   Mission 4 = Base Defense  (factory under attack from every side)
 *   Mission 8 = Attacker      (we strike their assembly line)
 *   Mission 3 = Heist         (steal back captured ordnance)
 * Plus Boss Rush, Speedrun, Frugal, Hero-vs-Boss, Final Showdown.
 *
 * Story tone: terse-industrial military report style. Where Arcane reads
 * medieval-fantasy, Mechanical reads grimdark warhammer / war-machine.
 * Smoke, gear, oil, iron. The player is the human resistance pushing
 * back the machine column.
 *
 * Bespoke mech-tileset maps will land in a follow-up; v1 uses the
 * existing shared maps (plains, crossroads, serpentine, etc.) plus the
 * archetype-default maps for Base Defense / Attacker / Heist.
 */

import type { CampaignDef } from './CampaignDef';

export const MECHANICAL_CAMPAIGN: CampaignDef = {
  factionId: 'mechanical',
  name: 'Iron Cascade',
  intro:
    "Their factories woke up. A column of smoke now stains the western horizon every morning. " +
    "Crawler-scouts probe our perimeter; the heavy walkers will follow. Ten engagements stand " +
    "between us and silencing the assembly line. We do not negotiate with machines.",
  outro:
    "The core foundry burns. Their walkers stand silent on the assembly floor, unfinished. " +
    "Steel is just steel again. You commanded the line that broke the cascade — the rest of " +
    "the engineering corps owes you their next coil of cable. New trees will grow on the slag.",
  missions: [
    // 1 — Standard intro with basic kit restriction
    {
      id: 'perimeter_breach',
      idx: 0,
      name: 'Perimeter Breach',
      story:
        "Crawler scouts. Light and fast. Your sergeant says they're the welcome mat — there'll be " +
        "heavies behind. We have basic kit at the listening post: bolt, frost, a wall, nothing fancy. " +
        "Hold them off the wire and prove the post is worth resupplying.",
      archetype: 'restriction',
      overrides: {
        mapId: 'plains',
        difficulty: 'easy',
        waveCount: 10,
        restrictions: {
          allowedTowerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'mech_wall'],
        },
      },
      objectives: {
        star2: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: 'Win with under 8 towers placed', predicate: r => r.towerCount <= 8 },
      },
    },

    // 2 — Standard 15 with terrain choke + winding map
    {
      id: 'supply_road',
      idx: 1,
      name: 'Supply Road',
      story:
        "Their column moves on a single road through the canyon. We hold the chokepoint or the " +
        "front-line goes hungry. Fifteen waves. Their armor scales fast — shred it before the road " +
        "opens up onto the plain.",
      archetype: 'standard',
      overrides: {
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: 'Win with 70% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.7) },
        star3: { label: 'Finish in under 9 minutes', predicate: r => r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 3 — Heist (Plan 13): steal back captured ordnance
    {
      id: 'depot_raid',
      idx: 2,
      name: 'The Depot Raid',
      story:
        "Last week they overran a forward depot and dragged off a year of our ordnance. The crates " +
        "are stacked in a steel hangar; the column is moving them out tonight. Stop the convoy. " +
        "Whatever leaves with them, we don't get back.",
      archetype: 'heist',
      overrides: {
        mapId: 'heist_vault',
        difficulty: 'normal',
        waveCount: 10,
      },
      objectives: {
        star2: {
          label: 'Win without buying any sends',
          predicate: r => r.won && (r.custom.sendsBought as number ?? 0) === 0,
        },
        star3: { label: 'Win with 80% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
      },
    },

    // 4 — Base Defense (Plan 11): factory under all-sides assault
    {
      id: 'foundry_siege',
      idx: 3,
      name: 'Foundry Siege',
      story:
        "Word came back wrong. The column we were chasing was a feint — their walkers circled and " +
        "are converging on our own foundry from every direction. The forge is the war. If it falls " +
        "we have no rifles tomorrow. Hold every approach.",
      archetype: 'base_defense',
      overrides: {
        mapId: 'base_arena',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: 'Win with 80% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
      },
    },

    // 5 — Boss Rush — convoy of heavy walkers
    {
      id: 'iron_convoy',
      idx: 4,
      name: 'Iron Convoy',
      story:
        "Five of their flagship walkers broke from the main column. Each one is a fortress on tracks " +
        "— heavy plating, anti-air, and a chassis cannon that ranges past anything we have at the " +
        "front. No rank-and-file. Just five killings, in order. Burst them down before they range up.",
      archetype: 'boss_rush',
      overrides: {
        mapId: 'crossroads',
        difficulty: 'hard',
        waveCount: 5,
      },
      objectives: {
        star2: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: 'Finish in under 7 minutes', predicate: r => r.won && r.durationMs < 7 * 60 * 1000 },
      },
    },

    // 6 — Speedrun — strike before they mobilize
    {
      id: 'first_light',
      idx: 5,
      name: 'First Light',
      story:
        "Intelligence says they need 18 hours to fully mobilize the assembly line at the rail yard. " +
        "Two divisions of theirs are in transit. Hit them in the open — twenty waves' worth of armor " +
        "in motion — before they dig in. Speed is the order of the day.",
      archetype: 'speedrun',
      overrides: {
        mapId: 'fortress',
        difficulty: 'normal',
        waveCount: 20,
      },
      objectives: {
        star2: { label: 'Finish in under 12 minutes', predicate: r => r.won && r.durationMs < 12 * 60 * 1000 },
        star3: { label: 'Finish in under 9 minutes', predicate: r => r.won && r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 7 — Frugal — supplies were lost in mission 3 if you didn't 3-star
    {
      id: 'rationed_steel',
      idx: 6,
      name: 'Rationed Steel',
      story:
        "Ammunition, brass, even the wire is running out. Half the gold, six emplacements — that's " +
        "the allocation. The forge is melting silverware to keep us in shells. Make every placement " +
        "earn its weight in the metal it cost to build.",
      archetype: 'frugal',
      overrides: {
        mapId: 'islands',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: 'Win using only 5 towers', predicate: r => r.won && r.towerCount <= 5 },
        star3: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
      },
    },

    // 8 — Attacker (Plan 12): we strike their assembly line
    {
      id: 'assembly_strike',
      idx: 7,
      name: 'Assembly Strike',
      story:
        "Their line is fortified. Towers, walls, kill-corridors — they built the place to grind us. " +
        "We don't have the artillery to soften it. We have raiders, and the line has one route through. " +
        "Get enough of our column past their guns and the assembly stops.",
      archetype: 'attacker',
      overrides: {
        mapId: 'attacker_assault',
        difficulty: 'normal',
        waveCount: 10,
      },
      objectives: {
        star2: {
          label: 'Break through with 8+ raiders',
          predicate: r => r.won && (r.custom.attackerLeaks as number ?? 0) >= 8,
        },
        star3: {
          label: 'Break through with 12+ raiders',
          predicate: r => r.won && (r.custom.attackerLeaks as number ?? 0) >= 12,
        },
      },
    },

    // 9 — Hero vs Boss — rival mech ace
    {
      id: 'ace_duel',
      idx: 8,
      name: 'The Ace',
      story:
        "Their best pilot stepped out of his walker and onto the field. Coordinates included. " +
        "Five waves of guard, then him. We sent the Engineer — if anyone can read a war-machine in " +
        "single combat it's her. Win this and we know how their command chain breaks.",
      archetype: 'hero_vs_boss',
      overrides: {
        mapId: 'hero_plains',
        difficulty: 'normal',
        waveCount: 5,
        heroId: 'engineer',
      },
      objectives: {
        star2: {
          label: 'Hero never falls below 50% HP',
          predicate: r => r.won && (r.custom.heroHpMin as number ?? 1) >= 0.5,
        },
        star3: { label: 'Clear all 5 waves in under 6 minutes', predicate: r => r.won && r.durationMs < 6 * 60 * 1000 },
      },
    },

    // 10 — Final Showdown — the core foundry
    {
      id: 'cascade_terminus',
      idx: 9,
      name: 'Cascade Terminus',
      story:
        "Their core foundry. Thirty waves of the deepest reserve they have. Walkers off the line, " +
        "still smoking from forging. The engineering corps says if we cut power to the core, the " +
        "whole cascade goes with it — no more crawlers, no more walkers, no more line. " +
        "End it tonight or we do this again next year, with worse odds.",
      archetype: 'final_showdown',
      overrides: {
        mapId: 'spiral',
        difficulty: 'hard',
        waveCount: 30,
      },
      objectives: {
        star2: { label: 'Win with at least 10 lives remaining', predicate: r => r.livesRemaining >= 10 },
        star3: { label: 'Win without using a continue', predicate: r => r.won && r.perfectRun },
      },
    },
  ],
};
