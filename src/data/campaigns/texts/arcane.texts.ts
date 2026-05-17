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
      "The Arcane Cabal emerged from the Crystal Caverns without warning. Their spell towers burn across the frontier, and every battle pushes them closer to the capital.\n" +
        "\n" +
        "The Coalition cannot match their magic directly. Instead, the Forge has begun tearing apart captured Arcane weapons and rebuilding them for our own armies. The Forgemaster believes every spell they cast can be turned against them.\n" +
        "\n" +
        "Hold the line through ten engagements. Survive long enough, and their magic will become ours.",
    outro:
    "The Cabal retreats behind the crystal walls of the caverns. Their relay lattice is shattered, their archmages scattered, their meteor fire silenced.\n" +
        "\n" +
        "But the Coalition that survived this war is not the one that entered it.\n" +
        "\n" +
        "Forge towers now stand where steel once held the line. Arcane crystals burn beside Coalition banners. The weapons we feared became the weapons that carried us through the siege.\n" +
        "\n" +
        "The Forgemaster calls it adaptation.\n" +
        "\n" +
        "Others call it the beginning of something else.\n" +
        "\n" +
        "The frontier holds for now.",
  },
  missions: {
    // ─── M1 — First Sigil (interrupt tutorial) ────────────────────
    first_sigil: {
      name: 'First Sigil',
      story:
`Cabal scouts are planting sigils along the eastern road. Once a sigil completes its channel, everything around it collapses, towers and stone alike.

Stop the channel before the rune completes.

The Coalition Forge recovered a damaged Arcane Frost tower from an earlier skirmish. We cannot build more yet, but its slowing magic may be enough to stop the sigils before they trigger.`,
      objectives: {
        star2: 'Interrupt at least 1 Sigil',
        star3: 'No Sigil completed its channel',
      },
    },

    // ─── M2 — The Library (interrupt + wave-buff scribes) ─────────
    the_library: {
      name: 'The Library',
      story:
`The Cabal seized the chapter library and turned it into a ritual post. Their scribes are recording battle chants between waves, strengthening every force that follows.

The longer they write uninterrupted, the stronger the enemy becomes.

Coalition reinforcements have arrived: a Sniper team for long-range pressure, and two additional Frost towers recovered near the outskirts. Maze around them carefully the scribes rely on distance to survive.`,
      objectives: {
        star2: 'Interrupt at least 3 Scribes',
        star3: 'No Scribe completed its channel',
      },
    },

    // ─── M3 — Ritual Circle (three named archmages) ───────────────
    ritual_circle: {
      name: 'Ritual Circle',
      story:
`Three archmages have begun an open ritual at the standing stones.

The Necromancer arrives first, raising fallen enemies back into the fight. Then comes the Stormcaller, chaining lightning across clustered defenses. Last comes the Starcaller, whose meteor strikes can destroy entire tower lines in seconds.

The Forgemaster finally cracked the Frost Spire schematics. For the first time, we can deploy Arcane towers ourselves.

Interrupt their casting or lose the field.`,
      objectives: {
        star2: 'Interrupt at least 3 Archmage channels',
        star3: 'No Archmage completed any channel',
      },
    },

    // ─── M4 — Spire Under Siege (four-column base defence) ────────
    spire_siege: {
      name: 'Spire Under Siege',
      story:
`The Cabal found our command center.

Meteor fire rains from every direction while four assault columns close in at once. Their relay lattice now stretches across the entire frontier. Every surviving spire feeds targeting data into the next strike.

There is no safe flank anymore. Only the walls you build.

The Forge deployed a new anti-caster weapon overnight: Runebreaker restraints. Buried launchers fire hooked arcane chains that bind spellcasters mid-channel, interrupting their rituals before completion.

Different weapon. Same purpose. Stop the casts before they land.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M5 — Crystal Warlords (boss rush, rage timers) ───────────
    crystal_warlords: {
      name: 'Crystal Warlords',
      story:
`Five Cabal warlords have broken from the main invasion force.

No lesser troops. No screening lines. Just the convoy.

Intelligence warns that once wounded, each warlord enters a brief Arcane frenzy. If they survive long enough, they will trigger devastating reinforcements, healing surges, haste rituals, swarm calls, and worse.

Bring them down quickly.

Overnight, the Forge completed the Bolt platform prototype. Standard Arrow emplacements are being retired across the front in its favor. Coalition steel is disappearing from the battlefield one tower at a time.`,
      objectives: {
        star2: 'No Warlord rage went off',
        star3: 'Win without losing a life',
      },
    },

    // ─── M6 — Forced March (auto-chain speedrun) ──────────────────
    forced_march: {
      name: 'Forced March',
      story:
`Reinforcements are still days away.

The Forge has emptied its reserves into your hands. Make sure you spend wisely. The enemy column will not slow, and stragglers yield only scraps of salvage.

Waves now overlap. There will be no pause between assaults.

The Cabal's lightning rituals have finally been reverse-engineered. By order of the Forgemaster, Cannon batteries are being dismantled and replaced with Storm platforms capable of chaining Arcane strikes through dense formations.`,
      objectives: {
        star2: 'Finish in under 12 minutes',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M7 — Starved Winter (frugal kit) ─────────────────────────
    starved_winter: {
      name: 'Starved Winter',
      story:
`Winter came early. The treasury did not survive it.

Supplies are rationed. Tower capacity is limited. Every placement must count.

The Cabal advance anyway.

Sniper detachments have been withdrawn from the walls and replaced with Arcane Focus crystals — long-range towers that lock onto the strongest enemy in sight.

Six towers. Half the gold. Hold anyway.

Some veterans no longer call this a Coalition army. The Forge no longer argues with them.`,
      objectives: {
        star2: 'Win using only 5 towers',
        star3: 'Win without losing a life',
      },
    },

    // ─── M8 — Breach the Relay (attacker / heist) ─────────────────
    breach_relay: {
      name: 'Breach the Relay',
      story:
`Deep behind the front line lies the Cabal relay lattice, the network coordinating their meteor strikes across the war.

Inside is the archive we need: the schematics for their meteor towers.

Push twelve raiders through the defenses and the archive is ours.

Their presiding archmage commands the battlefield directly, rebuilding defenses as fast as we break them. Expect shifting mazes, emergency Frost deployments, and Mana Drain traps throughout the assault.

The Forgemaster believes that if we seize the archive, the Cabal will lose their final advantage.

This battle will not stay predictable for long.`,
      objectives: {
        star2: 'Break through in 6 waves or fewer',
        star3: 'Break through in 4 waves or fewer',
      },
    },

    // ─── M9 — Allied Circle (coop with bot ally) ──────────────────
    allied_circle: {
      name: 'Allied Circle',
      story:
`A neighboring hold has finally sent reinforcements, but their defenders are inexperienced.

Two fronts must hold together. Support each other or both lines collapse.

Runebreaker restraints performed well across the frontier, but the Cabal adapted quickly. In response, the Forge refined the design into Mana Drain, a stronger interrupt capable of stripping Arcane shielding from elite targets.

And from the captured relay archive, our greatest prize yet:

Meteor platforms are now operational.

Save their charge for the moments that matter.`,
      objectives: {
        star2: 'Win losing 5 or fewer shared lives',
        star3: 'Win without losing a single shared life',
      },
    },

    // ─── M10 — The Reckoning (Arcane finale) ──────────────────────
    reckoning: {
      name: 'The Reckoning',
      story:
`The Cabal's final fortress surrounds the crystal spire at the heart of their lattice.

Every Arcane weapon we once feared stands between us and the ruling Archmage.

We cannot break a fortress like this through siege alone.

So the Forge prepared one final gamble.

Two summoning circles have been deployed at the front. Feed them with Mana Drain energy and they will call forth Forgemaster Serelyn, the only Coalition mage ever to defeat an archmage in single combat.

Hold the line until the ritual completes.

Then let her finish what the Coalition started.`,
      objectives: {
        star2: 'Win in under 25 minutes',
        star3: 'Win without losing the hero (zero deaths)',
      },
    },
  },
};
