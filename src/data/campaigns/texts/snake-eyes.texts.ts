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
      story:
        "The casino town Ardax is leaving. The Dealer hands him three cards: \"On the road, Voidsmith. Pick one.\" First Pact draw. Theris is at his elbow.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Accepted a Wager.',
      },
    },

    road_west: {
      name: 'The Road West',
      story:
        "Bounty hunters on the road. A silhouette walks parallel along the far ridge — Ardax pretends not to look. Theris doesn't pretend.",
      objectives: {
        star2: 'Win the mission.',
        star3: "Won with Debt non-increasing.",
      },
    },

    silvermine_creek: {
      name: 'Silvermine Creek',
      story:
        "A frontier town. The deck draws heavy this mission — three high-risk Wagers. The Dealer is curious how Ardax is going to handle it.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Accepted a high-tier Wager and succeeded.',
      },
    },

    // ─── Act II — The Frontier ────────────────────────────────────

    ferrymans_game: {
      name: "The Ferryman's Game",
      story:
        "River crossing. Tonight Ardax notices that one of his towers has a twin he didn't place. \"Cute.\" He can sell the mirror, but it costs him.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Did not sell the mirror tower.',
      },
    },

    wheel_of_cipher: {
      name: 'Wheel of Cipher',
      story:
        "Casino town, the Wheel spinning all night. Ardax has six minutes. Between waves, the Dealer interjects: \"You're slow tonight, Voidsmith. The boss is watching.\" First mention of who Ardax owes.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Cleared in ≤6 minutes.',
      },
    },

    theris_goodbye: {
      name: "Theris's Goodbye",
      story:
        "Theris is the bot. Mid-mission text overlay: \"Theris drew the King of Coins. She won.\" End-of-mission interlude: the note. Wager-tier draws this mission lean small/medium — Ardax is distracted.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + Theris bot alive at end + Debt paid down.',
      },
    },

    mirror_walkers: {
      name: 'Mirror Walkers',
      story:
        "Ardax's Siphon is \"off the table\" — Pact-locked. A new creep variant — Mirror Walkers — copies your last tower placement at low percent, drops double gold when killed.",
      objectives: {
        star2: 'Win the mission.',
        star3: 'Won + ≥3 Mirror Walkers killed.',
      },
    },

    // ─── Act III — The Mirror ─────────────────────────────────────

    snake_eyes_proper: {
      name: 'Snake Eyes',
      story:
        "The Dealer's enforcer arrives. The Collector — a creep that lobs damage tokens at your towers (not at your lives). Defeat the Collector to cancel next mission's interest.",
      objectives: {
        star2: 'The Collector defeated.',
        star3: 'The Collector defeated + Debt ≤ Debt at mission start.',
      },
    },

    burning_pactbook: {
      name: 'Burning the Pactbook',
      story:
        "Ardax fronts his own ledger. He sends Gambler-tokens, Spike-tokens, Siphon-tokens, Rift-tokens against a defended grid. The defender? The Counterfactual. The mirror is on the other side.",
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
