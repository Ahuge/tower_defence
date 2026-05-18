/**
 * Greenward Campaign — narrative text. Edit freely; gameplay logic
 * lives in `greenward.ts`. The two files are linked by mission `id`.
 *
 * POV: Marra Greenward, the Druid who argued against the pact to
 * spread the Wildwood south and lost the vote. Now bound to execute
 * the pact.
 *
 * Antagonist class: The Inheritors — things that moved into empty
 * thrones after the southern kingdoms fell.
 *
 * Recurring named figure: The Heron of Eadwin — silhouette glimpsed
 * from M3 onward; never close until M10.
 *
 * Three acts:
 *   Act I  (M1–M3): The Border — Marra crosses out of the Wildwood.
 *   Act II (M4–M7): The Salt Roads — deeper south; the cost of the
 *                   road begins to bite. Caer Wenna dies between
 *                   M7 and M8.
 *   Act III(M8–M10): The Sun-Cathedral — approach to Caer Lythen
 *                    and the Nave-choice that decides what the
 *                    forest becomes.
 *
 * Tone: terse-narrative medieval-fantasy. Match Arcane Reckoning
 * and Iron Cascade register.
 *
 * All prose locked from the writer-reviewed plan
 * (docs/greenward-campaign-plan.md). Edit only with a writer pass.
 */

import type { CampaignTexts } from './types';

export const GREENWARD_TEXTS: CampaignTexts = {
  campaign: {
    name: 'The Greenward',
    intro:
      "Marra Greenward argued against the pact and lost the vote. Now she is the one bound to execute it.\n" +
      "\n" +
      "The kingdoms south of the Wildwood are dying — their fields salt, their cities still, their queens silent. The forest will spread south. Stone will learn to root. The promise is a kindness and a terror both. The cities the Wildwood was promised are not empty: the Inheritors moved in when the queens fell. Some hold a banner. Some hold a worse thing entirely.\n" +
      "\n" +
      "Walk the road south, settlement by settlement, until Caer Lythen — and decide, at its overgrown threshold, what the forest will be when it arrives.",
    outro:
      "The forest holds.\n" +
      "\n" +
      "The grain at the cathedral threshold is two hundred winters deep. The Wildwood she left behind is thinner than it was — and Caer Wenna is one of its silences — but the pact is executed. The kingdoms south have learned to root.\n" +
      "\n" +
      "What the forest is now, Marra has chosen.",
  },
  missions: {
    // ─── M1 — The Boundary Stones (Ceremony tutorial) ───────────────
    boundary_stones: {
      name: 'The Boundary Stones',
      story:
`Marra Greenward steps over the boundary stones at sunrise. The Council's pact ripples through the ground as she crosses — every root from here to Caer Lythen feels her foot fall. The first ruin is a wayshrine where pilgrims once left grain for travellers; the grain is still there, untouched, two hundred winters deep.

Place a Blossom by the shrine and hold the channel through the first wave of road-walkers. The grain will know.`,
      objectives: {
        star2: 'Claim the wayshrine',
        star3: 'Blossom took no damage during the channel',
      },
    },

    // ─── M2 — The Salt Meadow (restriction; Bramble + Root) ─────────
    salt_meadow: {
      name: 'The Salt Meadow',
      story:
`The meadow turned saline four summers back. Nothing planted here will live more than a season; nothing already grown can be dug up.

Marra has Bramble and Root only — she cannot spare more from the Wildwood for a field this dead. Three ruins: two old shepherds' cairns to be sung over, and one barrow where a Road-Walker has made a den.`,
      objectives: {
        star2: 'Claim all three ruins',
        star3: '≥70% Wildwood Reserves remaining',
      },
    },

    // ─── M3 — The Circle at Eadwin (Heron silhouette intro) ─────────
    circle_at_eadwin: {
      name: 'The Circle at Eadwin',
      story:
`Eadwin was an inn-village. The hearth still burns; the old innkeeper still sits at it. She does not look up when Marra arrives.

The Road-Walkers in the square are not so quiet — they form a circle, hand-in-hand, and chant a name Marra does not know. Above the inn, a heron stands on the chimney. It does not move.

Claim the inn-hearth without touching the old woman; claim the square by force.`,
      objectives: {
        star2: 'Both ruins claimed + Watcher unharmed',
        star3: 'Star 2 + chant interrupted within first 60 seconds',
      },
    },

    // ─── M4 — The Road of Crows (full Mercy mission; Cethric) ───────
    road_of_crows: {
      name: 'The Road of Crows',
      story:
`The crow road runs north-south through marshland. A hooded crow-priest — call him Cethric — sits cross-legged at the meeting of two paths; he has been there for years. He does not turn his head.

The Inheritors that approach him are messengers. They bring him nothing, take nothing, and leave when they are done. Marra must let them leave.

Place a Blossom at the eastern road; hold the channel; do not let so much as a splash touch the priest.`,
      objectives: {
        star2: 'Cethric unharmed',
        star3: 'Star 2 + Reserves spent ≤ 80',
      },
    },

    // ─── M5 — The Dry River (speedrun) ──────────────────────────────
    dry_river: {
      name: 'The Dry River',
      story:
`The river is going salt as Marra watches. By the time the sun touches the high stones it will be brine, and every grove drinking from it downstream will brown in their season.

The headwater is a four-pool ladder upstream — she has minutes, not hours, to sing it clean. Two ruins lie between her and it, Inheritor-held; she has no time to be quiet about either.`,
      objectives: {
        star2: 'Headwater Ceremony completed',
        star3: 'Star 2 + mission ≤ 6 minutes',
      },
    },

    // ─── M6 — Tarrenford (coop with Erion; Hennel; Heron escalation) ─
    tarrenford: {
      name: 'Tarrenford',
      story:
`Tarrenford has a wheat field, a chapel, and one old well. Forty-seven people still live here. They asked the grove to come. Hennel — five years old, the priest's daughter — meets Marra at the gate and hands her a flower.

Erion of the Inner Council walks with Marra today. He was the only Druid who voted yes that Marra still speaks to.

The three ceremonies are slow because they are gentle; the chapel, the well, the wheat field, each a song. The Heron of Eadwin watches from the chapel roof.`,
      objectives: {
        star2: 'All three ruins claimed',
        star3: 'Star 2 + no civilian deaths',
      },
    },

    // ─── M7 — Wedding-Stone (frugal; Caer Wenna refused; send-saplings) ─
    wedding_stone: {
      name: 'Wedding-Stone',
      story:
`A wedding turned to stone forty winters ago. The bride still stands at the altar; her veil is moss now. Around her, the wedding party — all stone, all walking. Marra cannot tell from above which is the bride.

The Reserves will not stretch to Caer Wenna today — she has grown old, and the grove cannot spare her again. Make what you can with brambles and patience.

She had argued for the long road. This is the long road.`,
      objectives: {
        star2: 'The bride (Watcher) unharmed',
        star3: 'Star 2 + ≤ 2 distinct tower types used',
      },
    },

    // ─── M8 — The Stillborn Court (boss rush; Heron walks; Wenna gone) ─
    stillborn_court: {
      name: 'The Stillborn Court',
      story:
`The eastern slope where Wenna stood is quiet now.

Three courtiers cycle through the court grounds: the Knight who never blooded a sword, the Herald who never spoke an announcement, and the Child who never aged a day. The Knight and Herald are killed. The Child is not. She follows the Inheritor host without ever fighting; she watches Marra.

The Heron of Eadwin walks the court behind her. He does not stand on roofs anymore.

The grounds consecrate themselves when the Knight and Herald fall — but only if the Child remains.`,
      objectives: {
        star2: 'Knight and Herald killed',
        star3: 'Star 2 + Child takes no damage from any source',
      },
    },

    // ─── M9 — The Last Garden (attacker; Marra commits) ─────────────
    last_garden: {
      name: 'The Last Garden',
      story:
`The watchtower on the Caer Lythen road is built of grove-wood. Marra has walked past it nine times.

Today she stops, turns, and opens the Wildwood the other way — saplings, vipers, brambles pulled out of the soil and walked forward in their own roots.

The forest does not defend today.`,
      objectives: {
        star2: 'Win',
        star3: 'Win + ≥ 3 different Nature creep-units sent',
      },
    },

    // ─── M10 — Caer Lythen, the Sun-Cathedral (three setpieces) ─────
    caer_lythen: {
      name: 'Caer Lythen, the Sun-Cathedral',
      story:
`Marra Greenward stands at the cathedral gate at dusk. The grain at the cathedral threshold is two hundred winters deep — and there is a Tarrenford courier at the postern, with a letter still warm.

The Sun-Cathedral was meant to face east, but its façade has turned toward the Wildwood across all those winters.

Inside, the Heron of Eadwin waits at the altar. He has been waiting for her since Eadwin. He has not been waiting alone.`,
      objectives: {
        star2: 'Win',
        star3: 'Star 2 + Nave committed to Ceremony or Mercy (no Siege fallback)',
      },
    },
  },
};
