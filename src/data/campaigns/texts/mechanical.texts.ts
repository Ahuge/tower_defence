/**
 * Mechanical Campaign — narrative text. Edit freely; gameplay logic
 * lives in `mechanical.ts`. The two files are linked by mission `id`.
 *
 * POV: Master Vael, an Arcane archmage of the Eastern Spire.
 * Antagonist: Lord-Architect Voss — human tyrant who has built an
 * industrial war-machine empire and is moving to outlaw arcane magic.
 *
 * Three acts:
 *   Act I  (M1–M3): Defend the spire's outer holdings; recover stolen
 *                   tomes.
 *   Act II (M4–M7): The Spire falls in M4. Pursue Voss's column on
 *                   rationed reserves.
 *   Act III(M8–M10): Strike Voss's industrial heart. Beat his Ace,
 *                   then storm the foundry-throne.
 *
 * Voss's signature device — Suppression Pylons — recurs across M2, M5,
 * M6, M8. The throne itself is the M10 anchor.
 */

import type { CampaignTexts } from './types';

export const MECHANICAL_TEXTS: CampaignTexts = {
  campaign: {
    name: 'Iron Cascade',
    intro:
    "Lord-Architect Voss has outlawed magic.\n" +
        "\n" +
        "A year ago his foundries awakened. Now his criers ride the eastern roads declaring that every spire flying Arcane colours will be burned to the ground.\n" +
        "\n" +
        "Master Vael, the codex is in your keeping.\n" +
        "\n" +
        "One of Voss's own engineers fled the foundries with warnings of what he is building and how little time remains to stop it.\n" +
        "\n" +
        "Hold the frontier while you can. When you cannot, flee east with what remains and find a way to silence the foundries before they erase the old world entirely.",
    outro:
    "The throne shield held until the last generator failed.\n" +
        "\n" +
        "Voss died beneath the roof of his own foundry, and for the first time in a generation the assembly lines answered to no master.\n" +
        "\n" +
        "The codex survived.\n" +
        "\n" +
        "Already, apprentices hang Arcane sigils above the silent factory floors. The old spires are gone, but their magic now lives inside iron, steam, and furnace light.\n" +
        "\n" +
        "The iron burns differently now.\n" +
        "\n" +
        "New spires will rise.",
  },
  missions: {
    // ─── M1 — Listening Post (basic kit) ──────────────────────────
    perimeter_breach: {
      name: 'Listening Post',
      story:
`Voss's scouts reached the eastern road ahead of the main column, fast riders and light walkers sent to cut our warning lines.

We hold the listening post until Yuna's messenger clears the mountain pass with news of the invasion.

Bolt towers, Frost sigils, and a single Stormcaller stand ready. It is not enough for a war.

It will have to be enough tonight.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with under 8 towers placed',
      },
    },

    // ─── M2 — The Pass (first Suppression Pylons) ─────────────────
    the_pass: {
      name: 'The Pass',
      story:
`Voss's advance column reached the canyon roads ahead of schedule.

Three Suppression Pylons now line the pass. Every pulse disrupts nearby Arcane channels, stalling towers and weakening defensive casts across the corridor.

The Engineer believes the pylons can be temporarily disabled between pulses.

Do it when you can.

Hold the pass either way.`,
      objectives: {
        star2: 'Win with 70% lives remaining',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M3 — The Cipher (heist) ──────────────────────────────────
    the_cipher: {
      name: 'The Cipher',
      story:
`Voss's raiders struck one of the Arcane Order's hidden libraries before the fires spread.

The surviving tomes now travel east inside an armored convoy bound for the foundries. Once they arrive, every spell within them becomes fuel for industrial study.

The Engineer warned us this would happen. Voss does not burn knowledge he can weaponize.

We intercept the convoy tonight.

Anything that reaches the foundries strengthens the machines hunting us.`,
      objectives: {
        star2: 'Win without buying any sends',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M4 — Spire Falls (the inciting loss) ─────────────────────
    spire_falls: {
      name: 'Spire Falls',
      story:
`Voss has surrounded the spire.

Walkers press from every approach. Supply lines are gone. The codex waits in the vault beneath the keep.

We are not defending the spire anymore.

We are buying time.

Hold every front long enough for the apprentices to escape with what they can carry. When the gates finally break, take the codex and run east.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M5 — Iron Convoy (boss rush, pylons on the road) ─────────
    iron_convoy: {
      name: 'Iron Convoy',
      story:
`Five of Voss's flagship walkers broke from the main column to pursue us east.

Each one is a fortress of iron and artillery moving on rails.

The Engineer helped design their outer plating before she abandoned the foundries. She says the armor vents briefly whenever the Suppression Pylons cycle.

Two pylons dominate the open ground ahead. Burst the walkers down during the gaps or be overrun.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Finish in under 7 minutes',
      },
    },

    // ─── M6 — First Light (speedrun through a rail yard) ──────────
    first_light: {
      name: 'First Light',
      story:
`Voss's rail yard will complete mobilization by dawn.

If we strike now, the next war column dies before it ever leaves the assembly floor.

Three Suppression Pylons guard the approach lines. Every pulse delays our advance and bleeds precious time from the assault.

The Engineer mapped the rail schedules before she fled the foundries. Her timings give us one chance to hit the yard before the line activates.

Speed is the strategy.`,
      objectives: {
        star2: 'Finish in under 12 minutes',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M7 — Rationed Mana (frugal, half resources) ──────────────
    rationed_mana: {
      name: 'Rationed Mana',
      story:
`The spire's reserves were lost when Voss seized the vaults beneath the keep.

Half the gold. Six emplacements. No reserves behind them.

The old tower formations are gone now. Every sigil must justify the mana spent to sustain it.

Hold with less than we were built for.`,
      objectives: {
        star2: 'Win using only 5 towers',
        star3: 'Win without losing a life',
      },
    },

    // ─── M8 — Saboteur Vanguard (attacker / breach the assembly) ─
    saboteur_vanguard: {
      name: 'Saboteur Vanguard',
      story:
`Voss's assembly line stretches across the valley behind layered kill-corridors and Suppression Pylons.

We do not have the artillery to break it from range.

What we have are Coalition raiders and the Engineer's stolen schematics showing exactly one route through the guns.

Get enough raiders inside the complex and the assembly line stops.`,
      objectives: {
        star2: 'Break through with 8+ raiders',
        star3: 'Break through with 12+ raiders',
      },
    },

    // ─── M9 — The Ace (hero duel vs Voss's pilot) ─────────────────
    the_ace: {
      name: 'The Ace',
      story:
`Voss's ace pilot finally stepped out from behind his war machine.

The Engineer asked for this fight herself.

She helped build the early walker frames before she deserted the foundries, and if anyone alive understands how to break one in single combat, it is her.

Win here and we learn how Voss's command structure survives the battlefield.

Lose, and the Architect learns his machines still own us.`,
      objectives: {
        star2: 'Hero never falls below 50% HP',
        star3: 'Clear all 5 waves in under 6 minutes',
      },
    },

    // ─── M10 — The Overthrow (sabotage finale) ────────────────────
    the_overthrow: {
      name: 'The Overthrow',
      story:
`The foundry-throne stands ahead.

Voss waits behind its shield while every surviving walker and pilot in the region converges on the factory district to defend him.

Four power cores sustain the throne shield. Destroy them, and the Architect becomes mortal.

Train the raiders. Send them deep into the foundry.

End this before the machines regroup.`,
      objectives: {
        star2: 'Win in under 25 minutes',
        star3: 'Win without losing a life',
      },
    },
  },
};
