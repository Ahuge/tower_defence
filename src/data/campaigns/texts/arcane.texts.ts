/**
 * Arcane Campaign — narrative text. Edit freely; gameplay logic lives
 * in `arcane.ts`. The two files are linked by mission `id` — adding a
 * mission means adding an entry here AND a def in `arcane.ts`; the TS
 * compiler will flag a missing key when `arcane.ts` references it.
 *
 * Tone: terse-mechanical medieval-fantasy report style. Each story is
 * roughly one stage of a coalition's pushback against Arcane invaders.
 * Stories typically have two paragraphs separated by a blank line —
 * first the situation, then the kit/tool the player gets this mission.
 */

import type { CampaignTexts } from './types';

export const ARCANE_TEXTS: CampaignTexts = {
  campaign: {
    name: 'Arcane Reckoning',
    intro:
      "The Crystal Caverns spilled their wizards across our borders. Their towers glow at every horizon. " +
      "Hold the line through ten engagements — repel the invasion at every approach to the capital. " +
      "Arcane is already a faction you command; this campaign is a proving ground.",
    outro:
      "Their archmages are spent, their meteors fall on rubble, and the caverns retreat behind their crystal walls. " +
      "You hold the field. Future campaigns will reshape your roster — start by picking the next faction tree branch.",
  },
  missions: {
    // ─── M1 — First Sigil (interrupt tutorial) ────────────────────
    first_sigil: {
      name: 'First Sigil',
      story:
`Their scouts plant glyphs along the eastern path. Each glyph that finishes its sigil clears a ring of stone — your towers within reach go to dust. Stop the channel and the ring stays standing. Easy first one. There will be harder ones.

The Coalition Forge has left an Arcane Frost on the field — captured tech, beyond your craft to make more of yet. Build your maze around it; let no Sigil walk past without it speaking.`,
      objectives: {
        star2: 'Interrupt at least 1 Sigil',
        star3: 'No Sigil completed its channel',
      },
    },

    // ─── M2 — The Library (interrupt + wave-buff scribes) ─────────
    the_library: {
      name: 'The Library',
      story:
`They've made the chapter library a forward camp. Their scribes channel from inside it — every uninterrupted passage strengthens the next wave's bones. The pattern compounds. Don't let them write more than they have to.

Coalition reinforcements arrive — a Sniper to extend your reach, and two more Frosts taken at the outskirts. Position them at the serpent's bends; the scribes will not dance around your fire.`,
      objectives: {
        star2: 'Interrupt at least 3 Scribes',
        star3: 'No Scribe completed its channel',
      },
    },

    // ─── M3 — Ritual Circle (three named archmages) ───────────────
    ritual_circle: {
      name: 'Ritual Circle',
      story:
`Three archmages have set the standing stones glowing. They've come to channel openly. The Necromaster pulls dead things back across the threshold first — softer than what's behind him. Then Stormcaller, who chains lightning across our lines. Last comes Meteora, who calls fire down on stone — towers will not survive her cast.

We recovered Frost technology from a captured archmage's notebook. The Coalition Forge can replicate it now — the Frost is yours to deploy. Counter their casts or be erased.`,
      objectives: {
        star2: 'Interrupt at least 3 Archmage channels',
        star3: 'No Archmage completed any channel',
      },
    },

    // ─── M4 — Spire Under Siege (four-column base defence) ────────
    spire_siege: {
      name: 'Spire Under Siege',
      story:
`Their wizards charted our high command. Meteors fall from every horizon — they have us encircled, and four columns advance on the spire at once. No flank to hold. Stop everything that gets close.

An old druid from the deep groves answered our call. She brought iron-thorn crowns — Briarroot — that snare casters mid-spell, the same as Frost. New tool, same purpose.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M5 — Crystal Warlords (boss rush, rage timers) ───────────
    crystal_warlords: {
      name: 'Crystal Warlords',
      story:
`Five of their warlords broke from the main host. Each is a boss in their own right — heavy, slow, shielded. No regular waves, just this convoy. The intelligence is grim: the moment you land a blow on any of them, they will start to rage. You have about half a minute before the rage breaks. Kill them before then or eat the consequences — reinforcements, healing, hastes, swarms.

The Forge finished the Bolt prototype overnight. Coalition Arrows are recalled from every battery — every emplacement now wields Bolt instead. Same stance, sharper teeth.`,
      objectives: {
        star2: 'No Warlord rage went off',
        star3: 'Win without losing a life',
      },
    },

    // ─── M6 — Forced March (auto-chain speedrun) ──────────────────
    forced_march: {
      name: 'Forced March',
      story:
`Reinforcements are still days away. The Forge issued you a war-chest up front — empty it well, because the column will not stop and stragglers pay half what they used to. The next wave begins before the last is done. There is no breath between them.

The cabal's Storm spell is reverse-engineered. The Cannons came home this morning; in their place, Storm drums hammer chained lightning across packed ranks.`,
      objectives: {
        star2: 'Finish in under 12 minutes',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M7 — Starved Winter (frugal kit) ─────────────────────────
    starved_winter: {
      name: 'Starved Winter',
      story:
`Coffers are empty. Half the gold, six tower slots — make it work. The Arcane march does not stop because we ran out of coin. Pick your six and pick well.

The Snipers came down off the walls last week. The Forge replaced them with arcane Focus crystals — long range, single-target, prone to the strongest creep on the field.`,
      objectives: {
        star2: 'Win using only 5 towers',
        star3: 'Win without losing a life',
      },
    },

    // ─── M8 — Breach the Relay (attacker / heist) ─────────────────
    breach_relay: {
      name: 'Breach the Relay',
      story:
`The cabal hoards the meteor schematics behind their lattice. We need that archive — a tower we can't yet build, an answer to the spells they've been throwing at us. Push twelve raiders through and the archive is ours.

Their archmage is on the line in person, building and re-building the maze as our column comes through. She mazes, she upgrades, she calls in Frost and Mana Drain as needed. Don't expect the same fight twice.`,
      objectives: {
        star2: 'Break through in 6 waves or fewer',
        star3: 'Break through in 4 waves or fewer',
      },
    },

    // ─── M9 — Allied Circle (coop with bot ally) ──────────────────
    allied_circle: {
      name: 'Allied Circle',
      story:
`A neighbouring hold sent reinforcements but they're green — you train them in the field. Two fronts, two defenders. Cover for each other.

Briarroot served well, but the druid says the brambles fade in the cabal's anti-magic fields. The Forge has refined her work into Mana Drain — same interrupt, more punch, drains shields off the heaviest. And from the captured archmage's library, Meteor. The drum platforms are ready. Save the cooldown for what matters.`,
      objectives: {
        star2: 'Win losing 5 or fewer shared lives',
        star3: 'Win without losing a single shared life',
      },
    },

    // ─── M10 — The Reckoning (Arcane finale) ──────────────────────
    reckoning: {
      name: 'The Reckoning',
      story:
`The cabal's lattice ringed around their spire — every Arcane tower the Forge ever feared, stacked between us and the throne. The Archmage Throne anchors the back: she's the one we have to break. We don't have the towers to siege a fortress this big.

What we have is the Forge's last gift: TWO summoning circles. Pour Mana Drains around them and the circles charge — at full charge they call the Forge mage herself, the only one of us who ever beat an archmage in a duel. Hold the line while the circles charge. Then she walks west and breaks every tower in her path. Don't let her die in vain.`,
      objectives: {
        star2: 'Win in under 25 minutes',
        star3: 'Win without losing the hero (zero deaths)',
      },
    },
  },
};
