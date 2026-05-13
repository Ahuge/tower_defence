/**
 * Mechanical Campaign — Iron Cascade.
 *
 * Player POV: Master Vael, an Arcane archmage of the Eastern Spire.
 * Antagonist: Lord-Architect Voss — a human tyrant who has built an
 * industrial war-machine empire and is moving to outlaw and erase
 * arcane magic. Vael fights with the Arcane tower kit throughout —
 * `defaultPlayerFaction: 'arcane'` on the campaign def applies to
 * every mission, no per-mission override needed.
 *
 * Story arc — three acts:
 *   Act I  (M1–M3): Defend the spire's outer holdings while messengers
 *                   warn the rest of the order. Recover stolen tomes.
 *   Act II (M4–M7): The Spire falls in M4 — Vael flees with the codex.
 *                   Pursue Voss's column across his frontier; ration
 *                   what was salvaged.
 *   Act III(M8–M10): Strike at Voss's industrial heart. Beat his Ace,
 *                   then storm his foundry-throne.
 *
 * Voss's signature device — Suppression Pylons — appears across M2,
 * M5, M6, M8 as a recurring hazard that stalls Vael's towers until
 * the player channels them. The pylons in M10 are the Throne itself.
 */

import type { CampaignDef } from './CampaignDef';

export const MECHANICAL_CAMPAIGN: CampaignDef = {
  factionId: 'mechanical',
  name: 'Iron Cascade',
  defaultMapThemeOverride: 'factory',
  defaultPlayerFaction: 'arcane',
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
  missions: [
    // ─── Act I — Defend ───────────────────────────────────────

    // 1 — Listening post. Basic Arcane kit only; Voss's scouts probe.
    {
      id: 'perimeter_breach',
      idx: 0,
      name: 'Listening Post',
      story:
        "Voss's scouts on the eastern road, light and quick — the welcome mat for the column behind. " +
        "We hold the listening post until Yuna's rider clears the pass with the warning. Bolt, frost, " +
        "and a stormcaller — your basic kit. Make every sigil count.",
      archetype: 'restriction',
      overrides: {
        mapId: 'plains',
        difficulty: 'easy',
        waveCount: 10,
        restrictions: {
          allowedTowerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus'],
        },
      },
      objectives: {
        star2: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: 'Win with under 8 towers placed', predicate: r => r.towerCount <= 8 },
      },
    },

    // 2 — Canyon road. First encounter with a Suppression Pylon.
    {
      id: 'the_pass',
      idx: 1,
      name: 'The Pass',
      story:
        "Refugees from Briarroot are coming through the canyon — three abbots, a dozen apprentices, " +
        "the salvaged glassware. Voss's column is on the road behind them. He has seeded three of his " +
        "anti-arcane pylons across the canyon — every corridor stalls in pulses. Channel them when you " +
        "can; hold the line either way.",
      archetype: 'standard',
      overrides: {
        mapId: 'serpentine',
        difficulty: 'normal',
        waveCount: 15,
        // Three pylons cover the three open corridors of serpentine
        // (top, middle, bottom). Forces the player to either spread
        // through suppression fields or channel them — a maze in one
        // safe corner is no longer viable.
        suppressionPylons: [
          { col: 12, row: 3,  radius: 4 },
          { col: 18, row: 12, radius: 5 },
          { col: 24, row: 22, radius: 4 },
        ],
      },
      objectives: {
        star2: { label: 'Win with 70% lives remaining', predicate: r => r.livesRemaining >= Math.ceil(r.livesStart * 0.7) },
        star3: { label: 'Finish in under 9 minutes', predicate: r => r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 3 — Heist. Voss's couriers carry stolen Arcane tomes east.
    {
      id: 'the_cipher',
      idx: 2,
      name: 'The Cipher',
      story:
        "Voss's couriers raided the Briarroot library before they burned it. The tomes are in a " +
        "guarded vault now, and tonight a convoy moves them east — out of the order's reach forever. " +
        "Stop the convoy. Whatever leaves with them, we lose to industrial study and never see again.",
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

    // ─── Act II — Strike Out ──────────────────────────────────

    // 4 — The Spire falls. The inciting loss that drives the rest.
    {
      id: 'spire_falls',
      idx: 3,
      name: 'Spire Falls',
      story:
        "Voss has the spire surrounded. Walkers from every approach, no resupply, the codex in the " +
        "vault below. Hold every direction long enough for the apprentices to flee with what they can " +
        "carry. We do not win here — we last. When the gates break, you run east with the codex.",
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

    // 5 — Iron Convoy. Five flagship walkers; pylons cover the road.
    {
      id: 'iron_convoy',
      idx: 4,
      name: 'Iron Convoy',
      story:
        "Five of Voss's flagship walkers broke from the column to pursue you east. Each one is a " +
        "fortress on tracks. Two of his pylons sit on the open ground — burst the walkers down between " +
        "stalls, or the road eats us.",
      archetype: 'boss_rush',
      overrides: {
        mapId: 'crossroads',
        difficulty: 'hard',
        waveCount: 5,
        suppressionPylons: [
          { col: 12, row: 10, radius: 4 },
          { col: 22, row: 14, radius: 4 },
        ],
      },
      objectives: {
        star2: { label: 'Win without losing a life', predicate: r => r.livesRemaining === r.livesStart },
        star3: { label: 'Finish in under 7 minutes', predicate: r => r.won && r.durationMs < 7 * 60 * 1000 },
      },
    },

    // 6 — Speedrun. Strike Voss's rail yard before he mobilises.
    {
      id: 'first_light',
      idx: 5,
      name: 'First Light',
      story:
        "Eighteen hours before Voss's rail yard finishes its mobilisation. Hit it now and his next " +
        "column dies on the assembly floor. Three of his pylons line the approach. Speed is the " +
        "instruction; pylons interrupt the speed; channel them in stride or accept the timer slipping.",
      archetype: 'speedrun',
      overrides: {
        mapId: 'fortress',
        difficulty: 'normal',
        waveCount: 20,
        suppressionPylons: [
          { col: 8, row: 8, radius: 4 },
          { col: 18, row: 14, radius: 4 },
          { col: 28, row: 10, radius: 4 },
        ],
      },
      objectives: {
        star2: { label: 'Finish in under 12 minutes', predicate: r => r.won && r.durationMs < 12 * 60 * 1000 },
        star3: { label: 'Finish in under 9 minutes', predicate: r => r.won && r.durationMs < 9 * 60 * 1000 },
      },
    },

    // 7 — Frugal. Aftermath of the spire's fall: half the resources.
    {
      id: 'rationed_mana',
      idx: 6,
      name: 'Rationed Mana',
      story:
        "The spire's reserves were lost in the basement vault when Voss took the keep. Half the gold, " +
        "six emplacements, a great deal of pride. Make every sigil earn its place in a kit that does " +
        "not exist anymore.",
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

    // ─── Act III — Their Country ──────────────────────────────

    // 8 — Attacker. Player commands raiders to break Voss's assembly.
    {
      id: 'saboteur_vanguard',
      idx: 7,
      name: 'Saboteur Vanguard',
      story:
        "Voss's assembly line, fortified, kill-corridors, anti-arcane pylons covering every gate. We " +
        "do not have the artillery to soften it; we have the coalition's raiders, and the line has " +
        "exactly one route through. Get enough of them past the guns and the assembly stops.",
      archetype: 'attacker',
      overrides: {
        mapId: 'attacker_assault',
        difficulty: 'normal',
        waveCount: 10,
        suppressionPylons: [
          { col: 14, row: 8, radius: 4 },
          { col: 14, row: 18, radius: 4 },
        ],
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

    // 9 — Hero vs Boss. Voss's general — his "voice in the field."
    {
      id: 'the_ace',
      idx: 8,
      name: 'The Ace',
      story:
        "Voss's pilot stepped out of his walker and onto open ground. We sent the Engineer — " +
        "if anyone reads a war-machine in single combat, it's her. Win this and we know how Voss's " +
        "command chain breaks. Lose, and the Architect hears from his own mouth that we're soft.",
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

    // 10 — The Overthrow. SabotageController owns the climax.
    {
      id: 'the_overthrow',
      idx: 9,
      name: 'The Overthrow',
      story:
        "His foundry-throne. Voss is on it. Every walker still on the line, every pilot still " +
        "drawing breath, called home to defend him. The four power cores hold his shield up — drop " +
        "them and he is mortal. Train your raiders, send them deep, end this.",
      archetype: 'final_sabotage',
      overrides: {
        mapId: 'mech_throne_finale',
        difficulty: 'hard',
        waveCount: 999,
        sabotageRules: {
          cpuTowerHpDefault: 600,
          cpuTowerOwnerIndex: 99,
        },
      },
      objectives: {
        star2: { label: 'Win in under 25 minutes', predicate: r => r.won && r.durationMs < 25 * 60 * 1000 },
        star3: { label: 'Win without losing a life', predicate: r => r.won && r.livesRemaining === r.livesStart },
      },
    },
  ],
};
