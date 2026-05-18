/**
 * Snake Eyes Campaign — Campaign #4. Void faction.
 *
 * Player POV: Ardax, a degenerate gambler who owes the House more
 * than he can pay. Stable cocky tone throughout. Player runs the
 * Void tower kit through 10 missions west, walking toward a table
 * he didn't pick — the Counterfactual's Mirror at M10.
 *
 * Antagonist face: The Counterfactual — the version of Ardax that
 * took the safe bet twenty years ago. Escalates: silhouette (M2) →
 * mirror tower (M4) → Mirror Walker creep variant (M7) → boss (M10).
 *
 * Player tower kit: Void throughout (`defaultPlayerFaction: 'void'`).
 *
 * Two campaign-unique gameplay systems (land in Phase 1-2 of the
 * execution plan; see docs/snake-eyes-campaign-plan.md):
 *
 *   - **The Pactbook** (signature) — 12-card deck. Pre-mission
 *     draw 3, pick 1. Each Wager is a one-mission mutator with
 *     asymmetric risk/reward. Tally persists campaign-wide.
 *
 *   - **Debt × Divergence** (supporting) — Ardax owes the House.
 *     Per-mission interest, leak surcharge, decline penalty. Divergence
 *     (risk-tally from accepted Wagers) multiplies Debt paydown.
 *     Defer paying down → late-mission Dealer pulls levers
 *     (repossess, void Wager slot, bounty wave).
 *
 * Persistent named character (Caer-Wenna-analogue, lighter mechanical
 * hook): Theris — Ardax's partner gambler. Rides with him M1-M5,
 * cashes out M6, appears on the Counterfactual's side at M10.
 *
 * Three acts:
 *   Act I  (M1–M3): The Border — Ardax leaves Talavar.
 *   Act II (M4–M7): The Frontier — debts catching up.
 *   Act III(M8–M10): The Mirror — Ardax sits across from himself.
 *
 * THIS FILE IS THE SKELETON. Phase 1 commit 2 of the execution plan.
 * Per-mission commits in Phase 2 (11/12) replace the placeholder
 * `overrides` blocks with real mission shapes (wave scripts, Pactbook
 * deck overrides, Counterfactual spawn rules, etc.). MapId references
 * use existing real maps as placeholders; bespoke Snake Eyes maps
 * land in a follow-up PR per the plan doc. Star-3 predicates are
 * stand-ins (won + perfectRun) until DebtTracker / DivergenceTracker /
 * Pactbook write real counters into `MissionResult.custom` from
 * commits 3-5 onwards.
 */

import type { CampaignDef } from './CampaignDef';
import { SNAKE_EYES_TEXTS } from './texts/snake-eyes.texts';

const T = SNAKE_EYES_TEXTS;

export const SNAKE_EYES_CAMPAIGN: CampaignDef = {
  factionId: 'void',
  name: T.campaign.name,
  defaultPlayerFaction: 'void',
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  missions: [
    // ─── Act I — The Border ───────────────────────────────────────

    // M1 — tutorial Pact. Ardax leaves Talavar.
    {
      id: 'last_hand_talavar',
      idx: 0,
      name: T.missions.last_hand_talavar.name,
      story: T.missions.last_hand_talavar.story,
      archetype: 'interrupt',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_talavar' map.
        mapId: 'crossroads',
        difficulty: 'easy',
        waveCount: 8,
      },
      objectives: {
        star2: { label: T.missions.last_hand_talavar.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.last_hand_talavar.objectives.star3,
          // Real predicate (accepted a Wager) lands when the Pactbook
          // writes the counter — Phase 1 commit 5.
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M2 — bounty hunters. Counterfactual silhouette introduced.
    {
      id: 'road_west',
      idx: 1,
      name: T.missions.road_west.name,
      story: T.missions.road_west.story,
      archetype: 'interrupt',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_road' map.
        mapId: 'plains',
        difficulty: 'normal',
        waveCount: 10,
      },
      objectives: {
        star2: { label: T.missions.road_west.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.road_west.objectives.star3,
          // Real predicate (Debt non-increasing) — DebtTracker commit 3.
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M3 — frontier town, high-risk Wager draw.
    {
      id: 'silvermine_creek',
      idx: 2,
      name: T.missions.silvermine_creek.name,
      story: T.missions.silvermine_creek.story,
      archetype: 'interrupt',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_creek' map.
        mapId: 'crossroads',
        difficulty: 'normal',
        waveCount: 12,
      },
      objectives: {
        star2: { label: T.missions.silvermine_creek.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.silvermine_creek.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // ─── Act II — The Frontier ────────────────────────────────────

    // M4 — river crossing. Counterfactual mirror tower beat.
    {
      id: 'ferrymans_game',
      idx: 3,
      name: T.missions.ferrymans_game.name,
      story: T.missions.ferrymans_game.story,
      archetype: 'interrupt',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_ferry' map.
        mapId: 'crossroads',
        difficulty: 'normal',
        waveCount: 12,
      },
      objectives: {
        star2: { label: T.missions.ferrymans_game.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.ferrymans_game.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M5 — casino town, speedrun, first Dealer interlude.
    {
      id: 'wheel_of_cipher',
      idx: 4,
      name: T.missions.wheel_of_cipher.name,
      story: T.missions.wheel_of_cipher.story,
      archetype: 'speedrun',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_wheel' map.
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 12,
      },
      objectives: {
        star2: { label: T.missions.wheel_of_cipher.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.wheel_of_cipher.objectives.star3,
          // Real predicate (≤6 minutes) lands with the speedrun
          // archetype's existing duration counter.
          predicate: r => r.won && r.durationMs <= 6 * 60 * 1000,
        },
      },
    },

    // M6 — Theris partners, then vanishes.
    {
      id: 'theris_goodbye',
      idx: 5,
      name: T.missions.theris_goodbye.name,
      story: T.missions.theris_goodbye.story,
      archetype: 'coop_with_bot',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_theris' map.
        mapId: 'plains',
        difficulty: 'normal',
        waveCount: 12,
      },
      objectives: {
        star2: { label: T.missions.theris_goodbye.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.theris_goodbye.objectives.star3,
          // Real predicate (Theris bot alive + Debt paid down) lands
          // when TheresInterludes + DebtTracker write counters.
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M7 — Siphon restriction. Mirror Walker creep variant.
    {
      id: 'mirror_walkers',
      idx: 6,
      name: T.missions.mirror_walkers.name,
      story: T.missions.mirror_walkers.story,
      archetype: 'restriction',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_mirror' map.
        mapId: 'fortress',
        difficulty: 'normal',
        waveCount: 14,
        restrictions: {
          // Siphon off the table — Pact-locked. The other four Void
          // towers are available.
          allowedTowerIds: ['void_gambler', 'void_spike', 'void_rift', 'void_oblivion'],
        },
      },
      objectives: {
        star2: { label: T.missions.mirror_walkers.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.mirror_walkers.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // ─── Act III — The Mirror ─────────────────────────────────────

    // M8 — frugal, Collector boss creep.
    {
      id: 'snake_eyes_proper',
      idx: 7,
      name: T.missions.snake_eyes_proper.name,
      story: T.missions.snake_eyes_proper.story,
      archetype: 'frugal',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_collector' map.
        mapId: 'gauntlet',
        difficulty: 'hard',
        waveCount: 12,
        goldStart: 200, // frugal cap; below the archetype default
      },
      objectives: {
        star2: { label: T.missions.snake_eyes_proper.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.snake_eyes_proper.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M9 — attacker; Ardax sends Void creep tokens.
    {
      id: 'burning_pactbook',
      idx: 8,
      name: T.missions.burning_pactbook.name,
      story: T.missions.burning_pactbook.story,
      archetype: 'attacker',
      overrides: {
        mapId: 'attacker_assault',
        difficulty: 'normal',
        waveCount: 10,
        attackerEssencePerWave: 80,
        attackerLeakThreshold: 6,
        attackerPaletteFaction: 'void',
        attackerDefenderDifficulty: 'normal',
      },
      objectives: {
        star2: { label: T.missions.burning_pactbook.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.burning_pactbook.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M10 — The Counterfactual's Mirror. final_void stub archetype;
    // MissionRunner refuses to launch until commit 17 lands the real
    // three-setpiece controller.
    {
      id: 'counterfactual_mirror',
      idx: 9,
      name: T.missions.counterfactual_mirror.name,
      story: T.missions.counterfactual_mirror.story,
      archetype: 'final_void',
      overrides: {
        // TODO Phase 4 follow-up PR: bespoke 'snake_eyes_finale' map.
        mapId: 'gauntlet',
        difficulty: 'hard',
        waveCount: 999, // controller-terminated
      },
      objectives: {
        star2: { label: T.missions.counterfactual_mirror.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.counterfactual_mirror.objectives.star3,
          predicate: r => r.won && r.perfectRun,
        },
      },
    },
  ],
};
