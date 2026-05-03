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
 * Plan 14 v2: missions 4 (Spire Under Siege) and 8 (Breach the
 * Relay) now use the proper archetypes shipped in Plans 11 and 12.
 * Earlier v1 entries (Open Fortress / The Long Siege) were stand-ins.
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
    // 1 — First Sigil (interrupt). Plan A v2: introduces the channel
    // mechanic. Two Sigils, easy to interrupt; missing one costs a
    // ring of towers. Tutorial mission for the campaign's verb.
    {
      id: 'first_sigil',
      idx: 0,
      name: 'First Sigil',
      story:
        "Their scouts plant glyphs along the eastern path. Each glyph that finishes its sigil clears a ring of stone — " +
        "your towers within reach go to dust. Stop the channel and the ring stays standing. Easy first one. " +
        "There will be harder ones.",
      archetype: 'interrupt',
      overrides: {
        mapId: 'arcane_outskirts',
        difficulty: 'easy',
        waveCount: 8,
        // M1 tutorial: limit the kit so the player can SEE the counter.
        // Frost is the cheap, available interrupt; Bolt is generic DPS;
        // Storm is AoE for the supporting waves. Other towers (Focus,
        // Drain, Meteor, Nova) unlock in later missions.
        restrictions: {
          allowedTowerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm'],
        },
        waveScript: [
          { wave: 1, groups: [{ creepType: 'standard', count: 6, hpScale: 28, speedScale: 1 }], spawnInterval: 600, isBoss: false },
          { wave: 2, groups: [{ creepType: 'standard', count: 8, hpScale: 36, speedScale: 1 }], spawnInterval: 550, isBoss: false },
          { wave: 3, groups: [
            { creepType: 'standard', count: 6, hpScale: 44, speedScale: 1 },
            { creepType: 'arcane_sigil', count: 1, hpScale: 60, speedScale: 1 },
          ], spawnInterval: 500, isBoss: false },
          { wave: 4, groups: [{ creepType: 'fast', count: 8, hpScale: 32, speedScale: 1 }], spawnInterval: 400, isBoss: false },
          { wave: 5, groups: [{ creepType: 'standard', count: 10, hpScale: 60, speedScale: 1 }], spawnInterval: 450, isBoss: false },
          { wave: 6, groups: [
            { creepType: 'standard', count: 8, hpScale: 70, speedScale: 1 },
            { creepType: 'arcane_sigil', count: 1, hpScale: 90, speedScale: 1 },
          ], spawnInterval: 400, isBoss: false },
          { wave: 7, groups: [{ creepType: 'armored', count: 6, hpScale: 110, speedScale: 1 }], spawnInterval: 500, isBoss: false },
          { wave: 8, groups: [{ creepType: 'boss', count: 1, hpScale: 600, speedScale: 1 }], spawnInterval: 0, isBoss: true },
        ],
      },
      objectives: {
        star2: { label: 'Interrupt at least 1 Sigil', predicate: r => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 1 },
        star3: { label: 'No Sigil completed its channel', predicate: r => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
      },
    },

    // 2 — The Library (interrupt). Scribes channel a wave-buff that
    // makes future creeps tougher. Cumulative — leak two scribes and
    // wave 7 is a brick wall. Player learns "kill the casters first."
    {
      id: 'the_library',
      idx: 1,
      name: 'The Library',
      story:
        "They've made the chapter library a forward camp. Their scribes channel from inside it — every uninterrupted " +
        "passage strengthens the next wave's bones. The pattern compounds. Don't let them write more than they have to.",
      archetype: 'interrupt',
      overrides: {
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 12,
        waveScript: [
          { wave: 1, groups: [{ creepType: 'standard', count: 6, hpScale: 30, speedScale: 1 }], spawnInterval: 600, isBoss: false },
          { wave: 2, groups: [{ creepType: 'standard', count: 8, hpScale: 40, speedScale: 1 }], spawnInterval: 550, isBoss: false },
          { wave: 3, groups: [
            { creepType: 'standard', count: 6, hpScale: 50, speedScale: 1 },
            { creepType: 'arcane_scribe', count: 2, hpScale: 70, speedScale: 1 },
          ], spawnInterval: 500, isBoss: false },
          { wave: 4, groups: [{ creepType: 'fast', count: 10, hpScale: 50, speedScale: 1 }], spawnInterval: 400, isBoss: false },
          { wave: 5, groups: [{ creepType: 'standard', count: 12, hpScale: 70, speedScale: 1 }], spawnInterval: 450, isBoss: false },
          { wave: 6, groups: [
            { creepType: 'standard', count: 8, hpScale: 80, speedScale: 1 },
            { creepType: 'arcane_scribe', count: 2, hpScale: 100, speedScale: 1 },
          ], spawnInterval: 450, isBoss: false },
          { wave: 7, groups: [{ creepType: 'armored', count: 8, hpScale: 130, speedScale: 1 }], spawnInterval: 500, isBoss: false },
          { wave: 8, groups: [{ creepType: 'standard', count: 14, hpScale: 110, speedScale: 1 }], spawnInterval: 400, isBoss: false },
          { wave: 9, groups: [
            { creepType: 'standard', count: 8, hpScale: 130, speedScale: 1 },
            { creepType: 'arcane_scribe', count: 2, hpScale: 150, speedScale: 1 },
          ], spawnInterval: 400, isBoss: false },
          { wave: 10, groups: [{ creepType: 'fast', count: 14, hpScale: 130, speedScale: 1 }], spawnInterval: 350, isBoss: false },
          { wave: 11, groups: [{ creepType: 'armored', count: 10, hpScale: 200, speedScale: 1 }], spawnInterval: 500, isBoss: false },
          { wave: 12, groups: [
            { creepType: 'boss', count: 1, hpScale: 1200, speedScale: 1 },
            { creepType: 'arcane_scribe', count: 3, hpScale: 200, speedScale: 1 },
          ], spawnInterval: 600, isBoss: true },
        ],
      },
      objectives: {
        star2: { label: 'Interrupt at least 3 Scribes', predicate: r => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 3 },
        star3: { label: 'No Scribe completed its channel', predicate: r => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0 },
      },
    },

    // 3 — Ritual Circle (interrupt boss-rush). Three named archmages
    // (Meteora / Stormcaller / Necromaster) introduced one per wave;
    // finale wave is all three together. Each is interruptible only by
    // Frost / Mana Drain — same vocabulary as M1 + M2.
    {
      id: 'ritual_circle',
      idx: 2,
      name: 'Ritual Circle',
      story:
        "Three archmages have set the standing stones glowing. They came to channel openly — Meteora calls fire, " +
        "Stormcaller chains lightning across our lines, the Necromaster pulls dead things back across the threshold. " +
        "You'll meet each one, then they'll all step into the ring together. Counter their casts or be erased.",
      archetype: 'interrupt',
      overrides: {
        mapId: 'crossroads',
        difficulty: 'normal',
        waveCount: 5,
        // Full arcane kit unlocked — Frost + Mana Drain are both
        // available; player should be using both by the finale.
        waveScript: [
          // Wave 1 — light fodder, no archmage. Player stockpiles gold,
          // builds Frost coverage in advance of M3's first boss.
          { wave: 1, groups: [
            { creepType: 'standard', count: 8, hpScale: 70, speedScale: 1 },
            { creepType: 'fast', count: 6, hpScale: 50, speedScale: 1 },
          ], spawnInterval: 500, isBoss: false },

          // Wave 2 — Meteora introduced. Heavy fodder + 1 archmage.
          { wave: 2, groups: [
            { creepType: 'standard', count: 10, hpScale: 90, speedScale: 1 },
            { creepType: 'arcane_archmage_meteor', count: 1, hpScale: 80, speedScale: 1 },
          ], spawnInterval: 500, isBoss: false },

          // Wave 3 — Stormcaller. By now player should have ≥2 Frost.
          { wave: 3, groups: [
            { creepType: 'armored', count: 8, hpScale: 130, speedScale: 1 },
            { creepType: 'arcane_archmage_storm', count: 1, hpScale: 100, speedScale: 1 },
          ], spawnInterval: 480, isBoss: false },

          // Wave 4 — Necromaster + a thicker fodder field (his summons
          // pile up on top of the wave's standard creeps).
          { wave: 4, groups: [
            { creepType: 'fast', count: 10, hpScale: 90, speedScale: 1 },
            { creepType: 'arcane_archmage_necro', count: 1, hpScale: 110, speedScale: 1 },
          ], spawnInterval: 450, isBoss: false },

          // Wave 5 — Finale. All three archmages step in together. The
          // wave's existence is the boss — no fodder. Boss-flagged so
          // the wave-end fanfare reads correctly.
          { wave: 5, groups: [
            { creepType: 'arcane_archmage_meteor', count: 1, hpScale: 130, speedScale: 1 },
            { creepType: 'arcane_archmage_storm', count: 1, hpScale: 130, speedScale: 1 },
            { creepType: 'arcane_archmage_necro', count: 1, hpScale: 130, speedScale: 1 },
          ], spawnInterval: 1500, isBoss: true },
        ],
      },
      objectives: {
        // Star 2: at least 3 channels interrupted across the mission.
        // With 4 archmages (waves 2-4) × castCount 2 + 3 archmages × 2
        // in finale = 14 cast attempts. 3 interrupts is the "you
        // engaged with the mechanic" bar.
        star2: {
          label: 'Interrupt at least 3 Archmage channels',
          predicate: r => r.won && ((r.custom.channelsInterrupted as number) ?? 0) >= 3,
        },
        // Star 3: zero cast completions. The flawless run.
        star3: {
          label: 'No Archmage completed any channel',
          predicate: r => r.won && ((r.custom.channelsCompleted as number) ?? 0) === 0,
        },
      },
    },

    // 4 — Base Defense (Plan 11): four columns advance on a central spire
    {
      id: 'spire_siege',
      idx: 3,
      name: 'Spire Under Siege',
      story:
        "Their wizards charted our high command. Meteors fall from every horizon — they have us encircled, " +
        "and four columns advance on the spire at once. No flank to hold. Stop everything that gets close.",
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

    // 8 — Attacker (Plan 12): we send raiders through their fortified relay
    {
      id: 'breach_relay',
      idx: 7,
      name: 'Breach the Relay',
      story:
        "Their meteor relay funnels every spell through one fortified corridor. Their towers are dug in; " +
        "ours are not coming. We send raiders ourselves — get enough through and the relay falls.",
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
