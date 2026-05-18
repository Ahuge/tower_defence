/**
 * Greenward Campaign — Campaign #3. Nature faction.
 *
 * Player POV: Master Druid Marra Greenward. She argued against the
 * pact to spread the Wildwood south and lost the council vote. Now
 * she is bound to walk it ten settlements south to Caer Lythen, the
 * Sun-Cathedral, and decide what the forest becomes when it arrives.
 *
 * Antagonist class: the Inheritors — things that moved into empty
 * thrones after the southern kingdoms fell. Recurring named figure:
 * The Heron of Eadwin (M3 → M6 → M8 → M10).
 *
 * Player tower kit: Nature throughout (`defaultPlayerFaction:
 * 'nature'`). Mirrors the Iron Cascade convention.
 *
 * Two campaign-unique gameplay systems (land in Phase 2 of the
 * execution plan; see docs/greenward-campaign-plan.md):
 *
 *   - Consecration Modes (Ceremony / Siege / Mercy) — signature
 *     mechanic. Each mission has 1-3 "ruin tiles" claimed in one of
 *     three modes; the campaign-wide tally gates the M10 Nave choice.
 *
 *   - Wildwood Reserves — supporting mechanic. Persistent campaign
 *     resource that depletes mission-to-mission with partial regen.
 *     Late missions feel strained as the Wildwood thins.
 *
 * Caer Wenna tower-grief beat: the player's Elder Treant persists
 * across missions via PersistedTowerState; by M7 she refuses to be
 * re-placed ("the grove cannot spare her again"). Acknowledged in
 * M8's intro.
 *
 * Three acts:
 *   Act I  (M1–M3): The Border — Marra crosses out of the Wildwood.
 *   Act II (M4–M7): The Salt Roads — deeper south. Reserves bite.
 *   Act III(M8–M10): The Sun-Cathedral — the approach and the choice.
 *
 * THIS FILE IS THE SKELETON. Phase 1 commit 2 of the execution plan.
 * Per-mission commits (10-19) replace the mission stubs with real
 * implementations (waveScripts, restrictions, Consecration mode mixes,
 * etc.). The M10 final_greenward archetype is currently a stub —
 * MissionRunner will refuse to launch missions 0-9 at this stage
 * because their `overrides` are minimal placeholder shapes.
 */

import type { CampaignDef } from './CampaignDef';
import { GREENWARD_TEXTS } from './texts/greenward.texts';

const T = GREENWARD_TEXTS;

export const GREENWARD_CAMPAIGN: CampaignDef = {
  factionId: 'nature',
  name: T.campaign.name,
  defaultPlayerFaction: 'nature',
  intro: T.campaign.intro,
  outro: T.campaign.outro,
  missions: [
    // ─── Act I — The Border ───────────────────────────────────────

    // M1 — Tutorial Ceremony. Marra leaves the Wildwood for the
    // first time. Inheritors absent.
    {
      id: 'boundary_stones',
      idx: 0,
      name: T.missions.boundary_stones.name,
      story: T.missions.boundary_stones.story,
      archetype: 'interrupt',
      overrides: {
        mapId: 'greenward_boundary',
        difficulty: 'easy',
        waveCount: 8,
        greenwardRules: {
          ruins: [
            // The wayshrine — the campaign's first Ceremony. Cell
            // chosen at mid-map so the player has lateral space to
            // place the Blossom on either flank.
            { id: 'wayshrine', col: 18, row: 13, mode: 'ceremony' },
          ],
        },
      },
      objectives: {
        star2: { label: T.missions.boundary_stones.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.boundary_stones.objectives.star3,
          // Real predicate (ceremony Blossom unharmed) lands when
          // ConsecrationManager writes the counter — Phase 2 commit 5.
          // For the skeleton, gate on perfect-run as a stand-in.
          predicate: r => r.won && r.perfectRun,
        },
      },
    },

    // M2 — Restriction: Bramble + Root only. Introduces Reserves.
    {
      id: 'salt_meadow',
      idx: 1,
      name: T.missions.salt_meadow.name,
      story: T.missions.salt_meadow.story,
      archetype: 'restriction',
      overrides: {
        mapId: 'greenward_meadow',
        difficulty: 'normal',
        waveCount: 10,
        restrictions: {
          allowedTowerIds: ['nature_bramble', 'nature_root'],
        },
        greenwardRules: {
          ruins: [
            // Two shepherds' cairns spread vertically + one barrow
            // Inheritor-den off-center. Placement makes the three
            // approaches mutually-supporting from a maze in the
            // central corridor.
            { id: 'cairn_north', col: 14, row: 8,  mode: 'ceremony' },
            { id: 'cairn_south', col: 14, row: 18, mode: 'ceremony' },
            { id: 'barrow',      col: 22, row: 13, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: { label: T.missions.salt_meadow.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.salt_meadow.objectives.star3,
          // Real predicate uses r.custom.reservesRemaining once
          // WildwoodReserves system lands (Phase 1 commit 3).
          predicate: r => r.won && (r.custom.reservesRemaining as number ?? 100) >= 70,
        },
      },
    },

    // M3 — First Inheritor encounter. Heron silhouette intro. First
    // Mercy variant (old woman at the inn-hearth).
    {
      id: 'circle_at_eadwin',
      idx: 2,
      name: T.missions.circle_at_eadwin.name,
      story: T.missions.circle_at_eadwin.story,
      archetype: 'interrupt',
      overrides: {
        mapId: 'greenward_eadwin',
        difficulty: 'normal',
        waveCount: 12,
        greenwardRules: {
          ruins: [
            // The inn-hearth — the campaign's first Mercy. The old
            // woman (Watcher) sits at the hearth; the player must
            // not touch her. AoE-warning UI tints any splash tower
            // hovered over this cell.
            { id: 'inn_hearth',     col: 18, row: 10, mode: 'mercy' },
            // The square — Siege through the chanting Road-Walkers.
            { id: 'village_square', col: 14, row: 15, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.circle_at_eadwin.objectives.star2,
          // Real predicate: ruinsClaimed === 2 && watchersUnharmed.
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false),
        },
        star3: {
          label: T.missions.circle_at_eadwin.objectives.star3,
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false)
                              && (r.custom.chantInterruptedFastMs as number ?? Infinity) < 60_000,
        },
      },
    },

    // ─── Act II — The Salt Roads ──────────────────────────────────

    // M4 — Full Mercy mission. Cethric the Crow-Priest is the Watcher.
    {
      id: 'road_of_crows',
      idx: 3,
      name: T.missions.road_of_crows.name,
      story: T.missions.road_of_crows.story,
      archetype: 'interrupt',
      overrides: {
        mapId: 'greenward_crows',
        difficulty: 'normal',
        waveCount: 10,
        greenwardRules: {
          ruins: [
            // Cethric's crossroads — the first full Mercy mission.
            // Splash tower placement near this cell triggers the
            // AoE-warning overlay.
            { id: 'crossroads',  col: 18, row: 13, mode: 'mercy' },
            // Eastern Blossom-Ceremony on the road back to the Wildwood.
            { id: 'eastern_road', col: 26, row: 13, mode: 'ceremony' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.road_of_crows.objectives.star2,
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false),
        },
        star3: {
          label: T.missions.road_of_crows.objectives.star3,
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false)
                              && (r.custom.reservesSpent as number ?? Infinity) <= 80,
        },
      },
    },

    // M5 — Speedrun. The river is going salt as Marra watches.
    {
      id: 'dry_river',
      idx: 4,
      name: T.missions.dry_river.name,
      story: T.missions.dry_river.story,
      archetype: 'speedrun',
      overrides: {
        mapId: 'greenward_river',
        difficulty: 'normal',
        waveCount: 10,
        greenwardRules: {
          ruins: [
            // The headwater — Ceremony with a per-mission timer
            // managed by the mission's controller hook (sets
            // headwaterClaimed=true on completion before the salt
            // timer expires).
            { id: 'headwater', col: 30, row: 13, mode: 'ceremony' },
            // Two Siege ruins downstream — Inheritor-held pools.
            { id: 'river_west', col: 8,  row: 13, mode: 'siege' },
            { id: 'river_east', col: 18, row: 13, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.dry_river.objectives.star2,
          predicate: r => r.won && (r.custom.headwaterClaimed as boolean ?? false),
        },
        star3: {
          label: T.missions.dry_river.objectives.star3,
          predicate: r => r.won && (r.custom.headwaterClaimed as boolean ?? false)
                              && r.durationMs < 6 * 60 * 1000,
        },
      },
    },

    // M6 — Coop with Erion bot-Druid. Civilians; Hennel the Child.
    // Heron escalates from silhouette to perched-watcher.
    {
      id: 'tarrenford',
      idx: 5,
      name: T.missions.tarrenford.name,
      story: T.missions.tarrenford.story,
      archetype: 'coop_with_bot',
      overrides: {
        mapId: 'greenward_tarrenford',
        difficulty: 'normal',
        waveCount: 12,
        greenwardRules: {
          ruins: [
            // The chapel — Hennel hands Marra a flower at the gate.
            { id: 'chapel',      col: 14, row: 8,  mode: 'ceremony' },
            // The old well.
            { id: 'well',        col: 18, row: 13, mode: 'ceremony' },
            // The wheat field at the south edge.
            { id: 'wheat_field', col: 22, row: 18, mode: 'ceremony' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.tarrenford.objectives.star2,
          predicate: r => r.won && (r.custom.ruinsClaimed as number ?? 0) >= 3,
        },
        star3: {
          label: T.missions.tarrenford.objectives.star3,
          predicate: r => r.won && (r.custom.ruinsClaimed as number ?? 0) >= 3
                              && (r.custom.civiliansKilled as number ?? 0) === 0,
        },
      },
    },

    // M7 — Frugal. Caer Wenna refused. Send-saplings option.
    {
      id: 'wedding_stone',
      idx: 6,
      name: T.missions.wedding_stone.name,
      story: T.missions.wedding_stone.story,
      archetype: 'frugal',
      overrides: {
        mapId: 'greenward_weddingstone',
        difficulty: 'hard',
        waveCount: 12,
        greenwardRules: {
          ruins: [
            // The altar — the Stone Bride (Watcher) stands here.
            // Mercy: don't touch her. Her livery identifier (slow
            // walk) is per-creep at spawn time.
            { id: 'altar',    col: 18, row: 10, mode: 'mercy' },
            // The pavilion — Siege the wedding party who circle the bride.
            { id: 'pavilion', col: 18, row: 18, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.wedding_stone.objectives.star2,
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false),
        },
        star3: {
          label: T.missions.wedding_stone.objectives.star3,
          predicate: r => r.won && (r.custom.watcherUnharmed as boolean ?? false)
                              && (r.custom.distinctTowerTypesUsed as number ?? 99) <= 2,
        },
      },
    },

    // ─── Act III — The Sun-Cathedral ──────────────────────────────

    // M8 — Boss rush. Knight / Herald / Child. Child is the Watcher.
    // Heron walks the court behind her. Caer Wenna gone.
    {
      id: 'stillborn_court',
      idx: 7,
      name: T.missions.stillborn_court.name,
      story: T.missions.stillborn_court.story,
      archetype: 'boss_rush',
      overrides: {
        mapId: 'greenward_court',
        difficulty: 'hard',
        waveCount: 8,
        greenwardRules: {
          ruins: [
            // The court grounds — Siege. Auto-claims when Knight +
            // Herald die. The mission's per-spawn hook flips
            // knightKilled / heraldKilled on the GreenwardController.
            { id: 'court_grounds', col: 14, row: 13, mode: 'siege' },
            // The Child's procession — Mercy. The Child Watcher
            // follows the Inheritor host but never fights. Touching
            // her fails star 3.
            { id: 'the_child',     col: 22, row: 13, mode: 'mercy' },
          ],
        },
      },
      objectives: {
        star2: {
          label: T.missions.stillborn_court.objectives.star2,
          predicate: r => r.won && (r.custom.knightKilled as boolean ?? false)
                              && (r.custom.heraldKilled as boolean ?? false),
        },
        star3: {
          label: T.missions.stillborn_court.objectives.star3,
          predicate: r => r.won && (r.custom.knightKilled as boolean ?? false)
                              && (r.custom.heraldKilled as boolean ?? false)
                              && (r.custom.childUnharmed as boolean ?? false),
        },
      },
    },

    // M9 — Attacker. Marra sends Nature creeps to break the watchtower.
    {
      id: 'last_garden',
      idx: 8,
      name: T.missions.last_garden.name,
      story: T.missions.last_garden.story,
      archetype: 'attacker',
      overrides: {
        mapId: 'greenward_lastgarden',
        difficulty: 'hard',
        waveCount: 8,
        greenwardRules: {
          ruins: [
            // The Inheritor watchtower at the western edge of the
            // map. Single Siege ruin — claimed by the attacker creeps
            // breaking through the watchtower's defender towers.
            // distinctCreepUnitsSent counter is bumped by the per-
            // creep send hook for star 3.
            { id: 'watchtower', col: 6, row: 13, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: { label: T.missions.last_garden.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.last_garden.objectives.star3,
          predicate: r => r.won && (r.custom.distinctCreepUnitsSent as number ?? 0) >= 3,
        },
      },
    },

    // M10 — Caer Lythen. Three setpieces (Courtyard / Nave / Throne).
    // Nave gated by campaign mode-lean. final_greenward archetype
    // currently a stub; the full three-setpiece GreenwardFinaleController
    // lands in a follow-up commit. The Consecration rules + per-setpiece
    // ruin layout are wired here so when the controller arrives it
    // reads from this data.
    {
      id: 'caer_lythen',
      idx: 9,
      name: T.missions.caer_lythen.name,
      story: T.missions.caer_lythen.story,
      archetype: 'final_greenward',
      overrides: {
        mapId: 'greenward_cathedral',
        difficulty: 'hard',
        waveCount: 999,
        greenwardRules: {
          ruins: [
            // Setpiece 1 — Courtyard. Always Siege (the outer guard
            // must fall — no choice). Caer Wenna's absence is
            // mechanically punishing here; the wave the player would
            // have walked past with her placed bites without her.
            { id: 'courtyard', col: 6,  row: 13, mode: 'siege' },
            // Setpiece 2 — Nave. The choice. Initial mode is 'mercy'
            // as the placeholder; the GreenwardFinaleController
            // mutates this at runtime based on the player's mode-lean
            // (Ceremony lean → ceremony, Mercy lean → mercy, else →
            // siege fallback. Reserves-zero in the Courtyard also
            // narrows to siege regardless).
            { id: 'nave',      col: 18, row: 13, mode: 'mercy' },
            // Setpiece 3 — Throne. Fixed Siege after the Nave's
            // consequence (defense against the world's reaction).
            { id: 'throne',    col: 30, row: 13, mode: 'siege' },
          ],
        },
      },
      objectives: {
        star2: { label: T.missions.caer_lythen.objectives.star2, predicate: r => r.won },
        star3: {
          label: T.missions.caer_lythen.objectives.star3,
          predicate: r => r.won && (r.custom.naveCommittedNonSiege as boolean ?? false),
        },
      },
    },
  ],
};
