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
      "Lord-Architect Voss has outlawed magic. His foundries woke a year ago; his criers now ride " +
      "the eastern roads warning that any spire-keep flying our colours will be put to the torch. " +
      "Master Vael, the codex is in your keeping. Hold while you can. When you cannot, run east " +
      "with what remains, and find the way to silence him.",
    outro:
      "The throne shield held until the last generator went down. Voss died beneath his own roof, " +
      "and the foundries answered to no one for the first time in a generation. The codex is whole. " +
      "Your apprentices have already hung sigils in the rafters above the assembly floor — the iron " +
      "burns differently now. New spires will rise.",
  },
  missions: {
    // ─── M1 — Listening Post (basic kit) ──────────────────────────
    perimeter_breach: {
      name: 'Listening Post',
      story:
`Voss's scouts on the eastern road, light and quick — the welcome mat for the column behind. We hold the listening post until Yuna's rider clears the pass with the warning. Bolt, frost, and a stormcaller — your basic kit. Make every sigil count.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with under 8 towers placed',
      },
    },

    // ─── M2 — The Pass (first Suppression Pylons) ─────────────────
    the_pass: {
      name: 'The Pass',
      story:
`Refugees from Briarroot are coming through the canyon — three abbots, a dozen apprentices, the salvaged glassware. Voss's column is on the road behind them. He has seeded three of his anti-arcane pylons across the canyon — every corridor stalls in pulses. Channel them when you can; hold the line either way.`,
      objectives: {
        star2: 'Win with 70% lives remaining',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M3 — The Cipher (heist) ──────────────────────────────────
    the_cipher: {
      name: 'The Cipher',
      story:
`Voss's couriers raided the Briarroot library before they burned it. The tomes are in a guarded vault now, and tonight a convoy moves them east — out of the order's reach forever. Stop the convoy. Whatever leaves with them, we lose to industrial study and never see again.`,
      objectives: {
        star2: 'Win without buying any sends',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M4 — Spire Falls (the inciting loss) ─────────────────────
    spire_falls: {
      name: 'Spire Falls',
      story:
`Voss has the spire surrounded. Walkers from every approach, no resupply, the codex in the vault below. Hold every direction long enough for the apprentices to flee with what they can carry. We do not win here — we last. When the gates break, you run east with the codex.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Win with 80% lives remaining',
      },
    },

    // ─── M5 — Iron Convoy (boss rush, pylons on the road) ─────────
    iron_convoy: {
      name: 'Iron Convoy',
      story:
`Five of Voss's flagship walkers broke from the column to pursue you east. Each one is a fortress on tracks. Two of his pylons sit on the open ground — burst the walkers down between stalls, or the road eats us.`,
      objectives: {
        star2: 'Win without losing a life',
        star3: 'Finish in under 7 minutes',
      },
    },

    // ─── M6 — First Light (speedrun through a rail yard) ──────────
    first_light: {
      name: 'First Light',
      story:
`Eighteen hours before Voss's rail yard finishes its mobilisation. Hit it now and his next column dies on the assembly floor. Three of his pylons line the approach. Speed is the instruction; pylons interrupt the speed; channel them in stride or accept the timer slipping.`,
      objectives: {
        star2: 'Finish in under 12 minutes',
        star3: 'Finish in under 9 minutes',
      },
    },

    // ─── M7 — Rationed Mana (frugal, half resources) ──────────────
    rationed_mana: {
      name: 'Rationed Mana',
      story:
`The spire's reserves were lost in the basement vault when Voss took the keep. Half the gold, six emplacements, a great deal of pride. Make every sigil earn its place in a kit that does not exist anymore.`,
      objectives: {
        star2: 'Win using only 5 towers',
        star3: 'Win without losing a life',
      },
    },

    // ─── M8 — Saboteur Vanguard (attacker / breach the assembly) ─
    saboteur_vanguard: {
      name: 'Saboteur Vanguard',
      story:
`Voss's assembly line, fortified, kill-corridors, anti-arcane pylons covering every gate. We do not have the artillery to soften it; we have the coalition's raiders, and the line has exactly one route through. Get enough of them past the guns and the assembly stops.`,
      objectives: {
        star2: 'Break through with 8+ raiders',
        star3: 'Break through with 12+ raiders',
      },
    },

    // ─── M9 — The Ace (hero duel vs Voss's pilot) ─────────────────
    the_ace: {
      name: 'The Ace',
      story:
`Voss's pilot stepped out of his walker and onto open ground. We sent the Engineer — if anyone reads a war-machine in single combat, it's her. Win this and we know how Voss's command chain breaks. Lose, and the Architect hears from his own mouth that we're soft.`,
      objectives: {
        star2: 'Hero never falls below 50% HP',
        star3: 'Clear all 5 waves in under 6 minutes',
      },
    },

    // ─── M10 — The Overthrow (sabotage finale) ────────────────────
    the_overthrow: {
      name: 'The Overthrow',
      story:
`His foundry-throne. Voss is on it. Every walker still on the line, every pilot still drawing breath, called home to defend him. The four power cores hold his shield up — drop them and he is mortal. Train your raiders, send them deep, end this.`,
      objectives: {
        star2: 'Win in under 25 minutes',
        star3: 'Win without losing a life',
      },
    },
  },
};
