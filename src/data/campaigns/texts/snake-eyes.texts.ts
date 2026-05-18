/**
 * Snake Eyes Campaign — narrative text. Edit freely; gameplay logic
 * lives in `snake-eyes.ts`. The two files are linked by mission `id`.
 *
 * POV: Ardax — a degenerate gambler who owes the House more than he
 * can pay. Stable cocky tone throughout. First-person past tense
 * permitted; the narrator never breaks character.
 *
 * Antagonist face: The Counterfactual — the version of Ardax that
 * took the safe bet twenty years ago. Walks parallel as a silhouette
 * from M2 onward; arrives in person at the M10 Mirror.
 *
 * Persistent named character: Theris — Ardax's partner gambler. Rides
 * with him M1–M5, "cashes out" at M6 with a note, returns on the
 * Counterfactual's side at M10.
 *
 * Three acts:
 *   Act I  (M1–M3): The Border — Ardax leaves Talavar.
 *   Act II (M4–M7): The Frontier — debts catching up; the Counter-
 *                    factual closes the distance.
 *   Act III(M8–M10): The Mirror — Ardax sits across from himself.
 *
 * Tone: noir antihero voiceover. Contrast against Greenward's
 * reverent terse-medieval register. The mission story stubs in this
 * file are placeholders from the plan doc — Phase 2 commits 11/12
 * replace them with writer-reviewed 3-versions blind-compare prose
 * (per CLAUDE.md). Campaign-level intro/outro have already gone
 * through that pass.
 */

import type { CampaignTexts } from './types';

export const SNAKE_EYES_TEXTS: CampaignTexts = {
  campaign: {
    name: 'Snake Eyes',
    // Campaign-level intro. Three-versions blind-compare landed at
    // commit 2; winner is Option C (Dealer's note + scene) with the
    // subagent's suggested edit applied ('He's already here.').
    intro:
      "*Voidsmith — The accounts have been read. Travel west. Try not to lose her. — The House.*\n" +
      "\n" +
      "Ardax read the note twice. He folded it into his sleeve next to the marked king. He looked at Theris across the table; she was already drawing her coat.\n" +
      "\n" +
      "\"How bad is it,\" she said.\n" +
      "\n" +
      "\"Eight hundred and change.\"\n" +
      "\n" +
      "\"And the other thing?\"\n" +
      "\n" +
      "\"He's already here.\"\n" +
      "\n" +
      "She didn't ask which 'he.' She knew which 'he.' Ardax had been pretending the silhouette on the far ridge wasn't there since he was nineteen. The Counterfactual. The version of him that had taken the safe bet at the first table, twenty years ago, and never owed anyone anything.\n" +
      "\n" +
      "Ardax stood. The chair scraped. The Dealer watched. Ten thousand miles west, the table was already set.",
    // Single-campaign outro placeholder. The real M10 ending is a
    // single illustrated tableau + a personalized epilogue stitched
    // by `EpilogueComposer` from final-state — Phase 4 commit 20.
    // CampaignTexts requires a string outro; this fallback shows
    // only if the composer can't run (defensive default).
    outro:
      "Ardax sat down across from himself. There were cards on the table and a Pactbook open between them. The Dealer was not in the room — the Dealer never is, at the end.\n" +
      "\n" +
      "\"My deal,\" Ardax said.",
  },
  missions: {
    // ─── Act I — The Border ───────────────────────────────────────

    // Mission stories below are PLACEHOLDERS pulled verbatim from
    // docs/snake-eyes-campaign-plan.md mission outlines. Per-mission
    // commits 11/12 replace each with the writer-reviewed 3-versions
    // blind-compare winner.

    last_hand_talavar: {
      name: 'The Last Hand at Talavar',
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft C
      // (Theris-as-mirror dialogue) with the subagent's suggested trim
      // applied to the lamp line.
      story:
        "\"He's dealt you three,\" she said.\n" +
        "\n" +
        "\"I see them.\"\n" +
        "\n" +
        "\"You always think you see them, Ardax. Pick the one that hurts the least.\"\n" +
        "\n" +
        "\"The one that hurts the least is the one he wants me to pick.\"\n" +
        "\n" +
        "Theris laughed — the dry laugh, the one she saved for me. The Dealer didn't move. Behind us, Talavar's last lamp went out. I picked.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Accepted a Wager.',
      },
    },

    road_west: {
      name: 'The Road West',
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft A
      // (Ardax notices the silhouette in private) with the subagent's
      // suggested edit on the "keeping pace" line.
      story:
        "The road got narrow before noon. The hunters were maybe a hill back; I could hear the bell on one of their horses, which meant they wanted me to hear it.\n" +
        "\n" +
        "I'd been walking maybe an hour when I noticed the figure on the far ridge — keeping our pace exactly, which is the part I didn't like. I didn't tell Theris. Theris didn't tell me she'd noticed. We made a kind of pact about that one. Some pacts you don't read aloud.",
      objectives: {
        star2: 'Win the mission.',
        star3: "Won with Debt non-increasing.",
      },
    },

    silvermine_creek: {
      name: 'Silvermine Creek',
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft B
      // (town scene — Ardax's history with Silvermine Creek) with the
      // subagent's suggested verb edit on the widow line.
      story:
        "I'd owed money in this town twice. The first time was for a horse that died on me before I made the next county. The second was for a horse that didn't die — the man it belonged to died instead, and his widow kept the marker and never called it in, which is a worse kind of debt than a paid one.\n" +
        "\n" +
        "Theris said, \"You don't have to stop here.\"\n" +
        "\n" +
        "I did. The Dealer was already laying out three cards on a counter that wasn't his to lay them out on.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Accepted a high-tier Wager and succeeded.',
      },
    },

    // ─── Act II — The Frontier ────────────────────────────────────

    ferrymans_game: {
      name: "The Ferryman's Game",
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft C
      // (internal — the mother's bad-mirror image) with the subagent's
      // edit on the closing trade-off line.
      story:
        "A river is just a long table you can't sit down at. I'd been told I'd cross at the ferry; the ferry was the kind that runs on a man rather than a current.\n" +
        "\n" +
        "I placed a Gambler. The Counterfactual placed his — a half-second later, three tiles over, inverted in colour the way the bad-mirror in my mother's parlour used to invert me. It fired at half rate; that was, I supposed, his idea of fair play.\n" +
        "\n" +
        "I could sell it. He'd watch me sell it. He'd cost me a fistful of coin and a sliver of pride. I considered it for the length of a breath.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Did not sell the mirror tower.',
      },
    },

    wheel_of_cipher: {
      name: 'Wheel of Cipher',
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft A
      // (time-pressure cold open) with the subagent's edit on the
      // wrist line. Note: original draft slipped into third-person;
      // first-person normalized here for consistency with M1-M4.
      story:
        "The Wheel spun and I had six minutes. Six minutes was generous — the Wheel of Cipher took its time when it wanted to, and the men who owned it had decided tonight it wouldn't. I could feel the table reading me through the floor: the dust shifting, the hands at my wrists running warmer than they ought to.\n" +
        "\n" +
        "Then the Dealer's voice, flat in the air beside me: \"You're slow tonight, Voidsmith. The boss is watching.\"\n" +
        "\n" +
        "Boss. So there was one. I'd been wondering.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Cleared in ≤6 minutes.',
      },
    },

    theris_goodbye: {
      name: "Theris's Goodbye",
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft B
      // (Theris reads better than I do) with the subagent's edit
      // ("We always do.") for the closing sting on reread.
      story:
        "Theris reads a table better than I do. She always has. She has never said so, and I have never said so, and what we share at a table is the kind of fluency you don't name.\n" +
        "\n" +
        "Tonight she took my left flank and I took my right and the Dealer dealt to us both for the first time, which Theris took as a courtesy and I took as a warning. \"He's getting bored,\" she said. We played anyway. We always do.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + Theris bot alive at end + Debt paid down.',
      },
    },

    mirror_walkers: {
      name: 'Mirror Walkers',
      // Writer-reviewed via 3-versions blind-compare. Winner: Draft B
      // (Mirror Walkers arrive, gait-recognition image) with the
      // subagent's tighten on the Siphon line.
      story:
        "The first one came around the bend exactly the way I would have come around the bend. Same stride. Same little hitch at the third step that I'd never noticed I had until it was walking back at me. Behind it: more, all of them mine.\n" +
        "\n" +
        "The Dealer had pulled my Siphon, which I might have argued if there'd been anyone to argue to. Theris was the last man who would've shouted at me about that.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + ≥3 Mirror Walkers killed.',
      },
    },

    // ─── Act III — The Mirror ─────────────────────────────────────

    snake_eyes_proper: {
      name: 'Snake Eyes',
      // Writer-reviewed via 3-versions blind-compare. Winner:
      // Draft B (Two hundred coin in my pocket) with the banner
      // line tightened per the subagent's edit.
      story:
        "Two hundred coin in my pocket. That was generous, given the kind of week I'd had, and stingy, given the kind of night I was about to have.\n" +
        "\n" +
        "The Collector came down the road on foot. He didn't speak. He didn't have to — the Dealer had said for him. A tower fell silent on my left flank like a man remembering something embarrassing. I sold nothing. I had nothing to sell.",
      objectives: {
        star2: 'The Collector defeated.',
        star3: 'The Collector defeated + Debt ≤ Debt at mission start.',
      },
    },

    burning_pactbook: {
      name: 'Burning the Pactbook',
      // Writer-reviewed via 3-versions blind-compare. Winner:
      // Draft A (the role reversal opening) with "eight missions"
      // replacing "sixty-some missions" for campaign-continuity.
      story:
        "Tonight I was the road. Tonight I was the hunters. Tonight I was the bell on the horse a hill back.\n" +
        "\n" +
        "I'd been on the other end of the table for eight missions, and the Dealer had finally given me a hand to deal. The Counterfactual was setting his towers up on the far side of the grid the way a man arranges a chessboard he expects to win.\n" +
        "\n" +
        "I sent a wave of Gambler-tokens first. Cheap. Profane. Mine. We'd see how he liked them.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + ≥3 distinct creep-token types sent.',
      },
    },

    counterfactual_mirror: {
      name: "The Counterfactual's Mirror",
      story:
        "Ardax sits down across from himself at a table he didn't pick. The Counterfactual is wearing the coat Ardax was supposed to wear. Theris is at his shoulder. The Dealer is not in the room — the Dealer never is, at the end. There are cards on the table and a Pactbook open between them. \"My deal,\" Ardax says.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + Mirror-Lane setpiece won outright (not drawn).',
      },
    },
  },
};
