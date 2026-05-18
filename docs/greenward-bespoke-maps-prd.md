# PRD — Greenward Bespoke Map Layouts

**Status:** Active. Branch: `ah/feature/greenward-bespoke-maps` (off `ah/feature/greenward-campaign`; rebases to develop once PR #74 merges).
**Owner:** Alex
**Trigger:** PR #74 shipped the 10 Greenward missions with theme-overridden plains-template maps. Each mission has a Consecration ruin layout that *would* work on a bespoke map, but the actual map shape (paths, blocked cells, entries / exits) is currently `plains` cloned 10×. Each map needs a hand-authored layout matching its mission's narrative beats — the wayshrine at the road's end, the crossroads at the marsh, the wedding pavilion centred on the altar, the three-section cathedral.

---

## Goal

Each of the ten Greenward missions gets a hand-authored map that matches its narrative + supports its Consecration ruin layout. After this PR, each map JSON in `src/data/maps/` (or inline in `Maps.ts`'s MAPS Record) is a deliberate design that reads as the place the mission's story describes.

## Non-goals

- New large-structure sprites (e.g. an actual wayshrine prop) — the existing terrain palettes + ruin-tile overlays carry the visual load.
- Changing Consecration ruin coordinates already set in `greenward.ts` mission overrides — maps are designed *around* those cells.
- Map editor (`/editor.html`) feature additions — we use the existing editor as-is.
- Balance tuning of wave compositions per map — that's PR D (balance pass).

## Authoring workflow

Each map is authored via `/editor.html` and exported as JSON saved to `src/data/maps/greenward/<id>.json`. The existing JSON-map loader (used by gauntlet maps) handles deserialization. Per-map effort estimate appears in the commit-by-commit section below.

**Per-map deliverables (each):**

1. JSON file at `src/data/maps/greenward/<id>.json`.
2. `Maps.ts` MAPS entry switches from the template clone to load via `loadGreenwardMap(id)` helper.
3. One unit test that asserts: entries / exits exist, the mission's Consecration ruin cells are on `noBuild` (not `Blocked`), pathfind from entry to exit succeeds.
4. (Optional) screenshot for the PR description.

## Design guidelines per map

### M1 — `greenward_boundary` (Boundary Stones)
- **Reads as:** a road leaving the Wildwood at sunrise. Forest at the west edge, open road heading east to a stone wayshrine.
- **Entries:** 1 at east edge (creeps approaching from the south kingdoms toward the player's Wildwood).
- **Exits:** 1 at west edge (Wildwood).
- **Ruin cell:** wayshrine at (18, 13). NoBuild.
- **Blocked cells:** sparse forest on the north + south margins to channel a single road.
- **Tutorial layout:** very simple path, lots of buildable space around the shrine.
- **Effort:** ~20 min.

### M2 — `greenward_meadow` (Salt Meadow)
- **Reads as:** open saline field, three small cairns. Sparse, exposed.
- **Entries:** 2 (north + south edges, suggesting Inheritors creeping in from both flanks).
- **Exits:** 1 west.
- **Ruin cells:** cairn_north (14, 8), cairn_south (14, 18), barrow (22, 13). All NoBuild.
- **Blocked cells:** none or minimal — the meadow is OPEN by design (salt killed everything).
- **Restriction:** Bramble + Root only, so the maze must form around minimal blockers.
- **Effort:** ~30 min.

### M3 — `greenward_eadwin` (Eadwin)
- **Reads as:** an inn-village. Buildings at the centre, square in front, inn on the north side.
- **Entries:** 1 east.
- **Exits:** 1 west.
- **Ruin cells:** inn_hearth (18, 10) NoBuild, village_square (14, 15) NoBuild.
- **Blocked cells:** building footprints (rectangular clusters at NE for the inn, central E-W for shop fronts).
- **Path:** weaves between buildings, brushing both ruin cells.
- **Effort:** ~45 min.

### M4 — `greenward_crows` (Road of Crows)
- **Reads as:** marsh crossroads. Two crossing paths.
- **Entries:** 2 (north + south).
- **Exits:** 2 (east + west). Crossroads where they meet.
- **Ruin cells:** crossroads (18, 13) Mercy — Cethric sits here, isolated from any splash placement; eastern_road (26, 13) Ceremony.
- **Blocked cells:** marsh patches (water-themed terrain already handles palette) at irregular intervals; the Cethric cell sits in a "safe pocket" surrounded by NoBuild buffer ring so even close splash placement has to be intentional.
- **Effort:** ~45 min.

### M5 — `greenward_river` (Dry River)
- **Reads as:** river running east-to-west, drying as the mission progresses (palette animation already in place via the `water` theme).
- **Entries:** 1 west (river exits to the Wildwood).
- **Exits:** 1 east (toward the headwater).
- **Ruin cells:** headwater (30, 13) Ceremony, river_west (8, 13) + river_east (18, 13) Siege.
- **Blocked cells:** river banks at top + bottom create a forced linear path.
- **Speedrun:** path is short and direct; the time pressure is the mechanic.
- **Effort:** ~30 min.

### M6 — `greenward_tarrenford` (Tarrenford)
- **Reads as:** a living village. Chapel, well, wheat field. Civilians present.
- **Entries:** 1 north.
- **Exits:** 1 south.
- **Ruin cells:** chapel (14, 8) Ceremony, well (18, 13) Ceremony, wheat_field (22, 18) Ceremony.
- **Blocked cells:** chapel footprint (NE 3×3 cluster), well (single tile), wheat-field rows (south region).
- **Path:** winds through the village, passing each ruin in sequence so the player can plant Blossoms for all three over the mission duration.
- **Effort:** ~60 min.
- **Note:** Civilian creep paths intersect the main wave path. Per-creep type already pinned to non-killable.

### M7 — `greenward_weddingstone` (Wedding-Stone)
- **Reads as:** frozen wedding pavilion. Altar in the centre, party arrayed around it.
- **Entries:** 2 (east + west, the party approaches from both sides).
- **Exits:** 1 north (the cleared path the bride was meant to walk).
- **Ruin cells:** altar (18, 10) Mercy, pavilion (18, 18) Siege. NoBuild.
- **Blocked cells:** pavilion pillars in a circular arrangement, wedding-feast tables at the south edge.
- **Frugal layout:** restricted tower count + reserves squeeze means tight choke points matter.
- **Effort:** ~45 min.

### M8 — `greenward_court` (Stillborn Court)
- **Reads as:** courtyard with three doors. Throne dais at the back. Inheritor host enters from the three doors.
- **Entries:** 3 (three doors at the south edge — boss-rush archetype's signature shape).
- **Exits:** 1 north (toward Caer Lythen).
- **Ruin cells:** court_grounds (14, 13) Siege, the_child (22, 13) Mercy.
- **Blocked cells:** pillared court geometry. Child's path circumnavigates without intersecting splash zones.
- **Boss-rush:** each door spawns one of the three boss types in rotation (Knight / Herald / Child).
- **Effort:** ~60 min.

### M9 — `greenward_lastgarden` (Last Garden)
- **Reads as:** the Inheritor watchtower on the road to Caer Lythen. Player sends creeps from the east toward the watchtower at the west.
- **Entries:** 1 east (Marra sends from here).
- **Exits:** 1 west (the watchtower).
- **Ruin cell:** watchtower (6, 13) Siege.
- **Blocked cells:** Inheritor defender tower placements pre-positioned (the M9 attacker archetype reads these from `mapDef.preplacedTowers`).
- **Attacker layout:** reverses player path direction; the standard attacker_assault map shape adapted.
- **Effort:** ~75 min.

### M10 — `greenward_cathedral` (Caer Lythen, the Sun-Cathedral)
- **Reads as:** three distinct zones — Courtyard (west) / Nave (centre) / Throne (east). Cathedral architecture.
- **Entries:** wave-script driven; each setpiece spawns its own waves.
- **Exits:** 1 west during Courtyard; replaced by 1 east for Throne defense (or static fortress-style entry/exit pattern with phase-specific blockers).
- **Ruin cells:** courtyard (6, 13) Siege, nave (18, 13) Mercy (runtime-mutated), throne (30, 13) Siege.
- **Blocked cells:** cathedral nave pillars in the centre, throne dais at east. Three distinct visual zones.
- **Map size:** larger than standard — 1.5× width if the engine supports it; otherwise dense use of the standard 36×26 grid with three setpiece sub-zones.
- **Effort:** ~120 min.

## Commits

Batched by Act for review tractability. Each commit ships its act's maps + Maps.ts integration + tests.

### Commit 1 — `Bespoke maps: Act I (M1-M3)`
Maps for `greenward_boundary` / `greenward_meadow` / `greenward_eadwin`. Effort: ~1.75 hrs of authoring + 30 min integration / tests.

### Commit 2 — `Bespoke maps: Act II (M4-M7)`
Maps for `greenward_crows` / `greenward_river` / `greenward_tarrenford` / `greenward_weddingstone`. Effort: ~3 hrs authoring + 45 min integration / tests.

### Commit 3 — `Bespoke maps: Act III pre-finale (M8-M9)`
Maps for `greenward_court` / `greenward_lastgarden`. Effort: ~2.25 hrs authoring + 30 min integration / tests.

### Commit 4 — `Bespoke maps: M10 Caer Lythen three-section cathedral`
Map for `greenward_cathedral`. Most ambitious single map in the project. Effort: ~2 hrs authoring + 30 min integration / tests.

## Acceptance per commit

- `npx tsc --noEmit` clean.
- Full unit suite green.
- Per-map test: entries / exits present, ruin cells NoBuild, pathfind from entry to exit succeeds.
- Existing `e2e/greenward-smoke.spec.ts` still passes (the smoke spec doesn't care about map layout, just that M1 + M10 boot).
- (Manual gate) Each map opens cleanly in the dev server + plays at least its first wave without lockup.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Bespoke map design takes longer than estimated | High | Effort estimates are upper-bound — first pass via the editor is what matters. Iterate post-merge. |
| Multi-entry / multi-exit maps confuse the existing pathfind | Medium | M2 (2-entry), M4 (2-entry / 2-exit), M7 (2-entry), M8 (3-entry) — verify against existing multi-entry maps (`base_arena`) for pattern. |
| Ruin cell coordinates conflict with the new layouts | Medium | Author maps around the existing Consecration coords from `greenward.ts`. If a coord is unworkable, update both files in the same commit. |
| M10 three-section layout pushes the engine's grid limits | High | Fallback: dense 36×26 with three sub-zones marked by Blocked-cell barriers. The 1.5× width is aspirational, not required. |

## Safety nets

- Existing `tutorial` and `plains` maps are the simplest layouts; use as scaffolding pattern.
- `base_arena` is the existing reference for multi-entry maps.
- `attacker_assault` is the reference for M9's reverse-path attacker map.
- `arcane_throne_finale` + `mech_throne_finale` are the references for M10's three-zone setpiece layout.

## Effort estimate

4 commits, ~10-12 hrs end-to-end with focused work — heavily front-loaded on the editor side rather than code. The author of this PR is doing map design, not engineering.
