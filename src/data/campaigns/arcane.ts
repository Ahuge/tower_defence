/**
 * Arcane Campaign — first complete campaign, ships in Plan 14 v1.
 *
 * Player fights AGAINST the Arcane faction across 10 missions on
 * Arcane-themed maps. Arcane is the free root faction in the Plan 5
 * tree, so beating this campaign rewards Cores + cosmetics rather
 * than unlocking a new faction — it's the proof-of-concept that
 * validates the campaign system before tier-1 campaigns (Mechanical
 * etc.) ship with real unlock-to-play stakes.
 *
 * v1 lineup uses only the existing-mode archetypes from Plan 10.
 * Missions 4 + 8 in the original design called for Base Defense and
 * Attacker (Plans 11/12); v1 substitutes restriction and standard
 * survival. Plan 14 v2 (Chunk D) retrofits the proper archetypes
 * once Plans 11/12/13 ship.
 *
 * Story tone: terse-mechanical medieval-fantasy report style. Each
 * mission is roughly one stage of a coalition's pushback against
 * Arcane invaders. No internal canon hardcoded — keeps campaigns
 * per-faction self-contained.
 */

import type { CampaignDef } from './CampaignDef';

export const ARCANE_CAMPAIGN: CampaignDef = {
  factionId: 'arcane',
  name: 'Arcane Reckoning',
  intro:
    "The Crystal Caverns spilled their wizards across our borders. Their towers glow at every horizon. " +
    "Hold the line through ten engagements — repel the invasion at every approach to the capital. " +
    "Arcane is already a faction you command; this campaign is a proving ground.",
  outro:
    "Their archmages are spent, their meteors fall on rubble, and the caverns retreat behind their crystal walls. " +
    "You hold the field. Future campaigns will reshape your roster — start by picking the next faction tree branch.",
  missions: [
    // 1 — Soft opener, restriction (first 4 towers only)
    {
      id: 'crystal_outskirts',
      idx: 0,
      name: 'Crystal Outskirts',
      story:
        "Their scouts probe the eastern path. Light skirmishers, easy to read. " +
        "We have basic defences only — no advanced kit until we resupply. " +
        "Hold the line and we earn the inventory back.",
      archetype: 'restriction',
      overrides: {
        mapId: 'arcane_outskirts',
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

    // 2 — Standard 15 with terrain + winding map
    {
      id: 'serpent_pass',
      idx: 1,
      name: 'Serpent Pass',
      story:
        "The river path winds through wizard-worked stone. Visibility is short, the curves are tight. " +
        "Their main force opens with this approach. Build inside the bends — they\'ll do the walking for us.",
      archetype: 'standard',
      overrides: {
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: 'Win with 70% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.7) },
        star3: { label: 'Finish in under 8 minutes', predicate: r => r.durationMs < 8 * 60 * 1000 },
      },
    },

    // 3 — Hero Defense vs Arcane mage NPC boss
    {
      id: 'archmage_duel',
      idx: 2,
      name: 'The Archmage Duel',
      story:
        "Their lead caster stepped onto the field of personal honour. Five waves of guard, " +
        "then the archmage themselves. We sent a Mage of our own. Win this and we know they have hands, " +
        "not just towers.",
      archetype: 'hero_vs_boss',
      overrides: {
        mapId: 'hero_plains',
        difficulty: 'normal',
        waveCount: 5,
        heroId: 'arcanist',
      },
      objectives: {
        star2: {
          label: 'Hero never falls below 50% HP',
          predicate: r => r.won && (r.custom.heroHpMin as number ?? 1) >= 0.5,
        },
        star3: { label: 'Clear all 5 waves in under 6 minutes', predicate: r => r.won && r.durationMs < 6 * 60 * 1000 },
      },
    },

    // 4 — REPLACEMENT for Base Defense: no-walls restriction on a long fortress map
    {
      id: 'open_fortress',
      idx: 3,
      name: 'Open Fortress',
      story:
        "The forge that supplies our walls fell to a meteor strike. We have stone, but no spike — no walls allowed " +
        "this run. The maze must be made of shooters. They\'ll punish a slack defence.",
      archetype: 'restriction',
      overrides: {
        mapId: 'fortress',
        difficulty: 'normal',
        waveCount: 20,
        restrictions: {
          noWalls: true,
        },
      },
      objectives: {
        star2: {
          label: 'Win without buying any sends',
          predicate: r => r.won && (r.custom.sendsBought as number ?? 0) === 0,
        },
        star3: { label: 'Win with at least 50% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.5) },
      },
    },

    // 5 — Boss rush
    {
      id: 'crystal_warlords',
      idx: 4,
      name: 'Crystal Warlords',
      story:
        "Five of their warlords broke from the main host. Each is a boss in their own right — heavy, slow, " +
        "shielded. No regular waves, just this convoy. Burst is the answer; sustain won\'t matter.",
      archetype: 'boss_rush',
      overrides: {
        mapId: 'crossroads',
        difficulty: 'hard',
        waveCount: 5,
      },
      objectives: {
        star2: { label: 'Kill every warlord before it reaches halfway', predicate: () => false /* custom counter */ },
        star3: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
      },
    },

    // 6 — Speedrun
    {
      id: 'forced_march',
      idx: 5,
      name: 'Forced March',
      story:
        "Reinforcements are still days away. We accelerate the engagement and end this approach quickly — " +
        "their stragglers can be routed if we move on the lead column fast. Twenty waves. Fast as you can.",
      archetype: 'speedrun',
      overrides: {
        mapId: 'arcane_pass',
        difficulty: 'normal',
        waveCount: 20,
      },
      objectives: {
        star2: { label: 'Finish in under 12 minutes', predicate: r => r.won && r.durationMs < 12 * 60 * 1000 },
        star3: { label: 'Finish in under 9 minutes', predicate: r => r.won && r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 7 — Frugal
    {
      id: 'starved_winter',
      idx: 6,
      name: 'Starved Winter',
      story:
        "Coffers are empty. Half the gold, six tower slots — make it work. The Arcane march does not stop because " +
        "we ran out of coin. Pick your six and pick well.",
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

    // 8 — REPLACEMENT for Attacker: long-grind survival
    {
      id: 'long_siege',
      idx: 7,
      name: 'The Long Siege',
      story:
        "They won\'t leave. We won\'t leave. Twenty-five waves at the spire. Whoever still stands at the end " +
        "writes the report.",
      archetype: 'standard',
      overrides: {
        mapId: 'spiral',
        difficulty: 'hard',
        waveCount: 25,
      },
      objectives: {
        star2: { label: 'Survive past wave 20', predicate: r => r.wave >= 20 },
        star3: { label: 'Win with 100+ gold banked', predicate: r => r.won && r.goldRemaining >= 100 },
      },
    },

    // 9 — Coop with bot ally
    {
      id: 'allied_circle',
      idx: 8,
      name: 'Allied Circle',
      story:
        "A neighbouring hold sent reinforcements but they\'re green — you train them in the field. " +
        "Two fronts, two defenders. Cover for each other.",
      archetype: 'coop_with_bot',
      overrides: {
        mapId: 'circle_2p',
        difficulty: 'normal',
        waveCount: 15,
      },
      objectives: {
        star2: { label: 'Win without your ally falling below 5 lives', predicate: () => false /* needs co-op tracking */ },
        star3: { label: 'Win with 80% shared lives intact', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.8) },
      },
    },

    // 10 — Final showdown
    {
      id: 'reckoning',
      idx: 9,
      name: 'Reckoning',
      story:
        "Their archmage cabal makes its stand at the spire. Thirty waves, hard difficulty, our home ground. " +
        "If you win this they won\'t come again. If you lose, none of the previous wins mattered. End it.",
      archetype: 'final_showdown',
      overrides: {
        mapId: 'arcane_throne',
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
