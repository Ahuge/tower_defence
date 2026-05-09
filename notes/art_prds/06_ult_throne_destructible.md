# Art PRD — Archmage Throne + Destructible Structure system (M10 + future campaigns)

## Context
The current `arcane_ult_throne` tower (the M10 finale's win-target) renders as a generic Arcane Nova-shaped tower — same palette as the player's towers, same 1-cell footprint. It should feel like a BOSS structure: large, central, imposing. This PRD also lays the groundwork for **destructible structures** as a reusable system across future faction campaigns (Mech siege engines, Nature elder trees, Void rift gates) — every campaign's finale will likely need a hero-vs-structure setpiece.

Match the existing in-game pixel-art style — see `public/assets/terrain/structures/struct_arcane_crystal_nexus.png` for the multi-tile Arcane structure vocabulary. 28 × 28 tile-aligned, NEAREST filter, 1 px outlines, faction palette discipline.

## Scope decision: footprint size

**Recommendation: 3 × 3 footprint.**

Tradeoffs evaluated:
| Size | Cells | Pros | Cons |
|---|---|---|---|
| 2 × 2 | 4 | Same as Summoning Circle — symmetric. | Doesn't read as "boss / climax target". Throne should dwarf the player's circles. |
| **3 × 3** | **9** | **Imposing — physically larger than any other structure on the map. Hero must approach and stay stationary at the perimeter for ~30s of focused combat. Center pixel reads as the "throne".** | More authoring work. Larger occluded grid area. |
| 4 × 4 | 16 | Maximum impact. | Crowds the M10 map's left half; less room for the surrounding tower lattice. |

3 × 3 sweet spot — visually larger than the player's 2 × 2 circles (so the duel scale reads), still fits comfortably inside the corridor.

The destructible-structure framework can support arbitrary `widthCells × heightCells` so future campaigns can pick 2×2 / 3×3 / 4×4 / 4×6 etc. without engine changes.

## Slot
The Archmage Throne — boss structure at `(2, midRow)` in `arcane_throne_finale`. Player wins M10 by destroying it (along with all other CPU towers). Currently a 1-cell `arcane_ult_throne` tower; this PRD upgrades it to a 3 × 3 destructible structure with 5 damage states.

## Where it lives
- **Path on disk**: `public/assets/arena/struct_arcane_archmage_throne.png` — single sheet.
- **Engine consumer**: new `DestructibleStructure` entity (`src/entities/DestructibleStructure.ts`) parallel to `Tower`. Stored on a new `MapDefinition.destructibleStructures` field. The existing `arcane_ult_throne` Tower disappears; the throne becomes a structure with HP, damage states, win-target flag, and phase-mechanic hooks (the existing `_ultPhase50/25/10Fired` flags migrate from Tower to DestructibleStructure).

## Sheet layout
Match `struct_arcane_crystal_nexus.png`'s vertical-stacked-frames convention:

- **Tile size**: 28 × 28 px.
- **Per-frame size**: **84 × 84 px** (3 cols × 3 rows × 28 px).
- **Frame count**: **5 damage states** (matches the Hero Defense base PRD — same pattern). 100 / 75 / 50 / 25 / 0.
- **Sheet dimensions**: **84 × 420 px** — 5 frames stacked VERTICALLY.
- **Frame order** (top → bottom):
  - Frame 0: 100% HP — pristine. Throne intact, archmage seated, energy halo, all crystals lit.
  - Frame 1: 75% HP — first damage. Two crystals fractured, energy halo dimmed slightly, small crack on the throne base.
  - Frame 2: 50% HP — visible structural damage. Half crystals out, large crack across the dais, archmage robes torn (or use posture: leaning slightly), one of the supporting pillars chipped.
  - Frame 3: 25% HP — heavy. Major fractures, crystals all dark/broken, archmage hunched, embers / smoke wisps, dais tilted ~5°.
  - Frame 4: 0% HP / dying — pre-collapse. Throne broken, archmage form fading/dissolved, central crystal core exposed and sparking. Last visible state before the engine destroys the structure.
- **Anchor**: bottom-center. Throne sits on the ground in the player's view; vertical extent reads as toweering above creep-scale.
- **Transparency**: full alpha PNG. Throne silhouette opaque; halo / energy effects use additive-style alpha pixels.

## Visual identity
- **Silhouette**: a tiered stone dais at the base, two flanking obelisks with embedded crystals, a central seated archmage figure, a golden halo / arcane glow around the head.
- **Pillars/obelisks**: 3 cells wide on the bottom row × 3 cells tall (the full 3 × 3 footprint). Most of the height is the seated archmage form + halo.
- **Crystals**: 4–6 violet crystal accents arranged around the silhouette — the "fractures" in damage frames target these progressively.
- **Halo**: a 1-pixel-thick arc above the archmage's head. Reduces in radius / brightness across damage frames.
- **Throne / dais**: stone-and-gold tiered base. 3 layers of receding stone steps. Damage progression cracks the steps from outside in.
- **Boss frame** (frame 0) carries an extra 1–2 cells of authored atmospheric flourish OUTSIDE the 3 × 3 footprint — faint magical particles, hovering rune fragments — that fade out over damage frames. Sheet area accommodates this; engine alignment uses the bottom-center anchor of the 3×3 footprint, so atmospheric overhang above doesn't overlap nearby grid cells.

## Color palette
Pull from `src/data/Factions.ts` arcane:
- `primaryColor: 0x6644ff` (violet) — crystals, halo, energy.
- `secondaryColor: 0x9988ff` — highlights.
- Throne stone: `#2a1d3f` shadow → `#4a3870` mid → `#6e5a98` light (deeper than the conduit/circle stone palette so the throne reads as more authoritative).
- Gold accents on the dais tiers: `#a87830` shadow → `#d8a040` body → `#f8d068` highlight.
- Archmage robes: `#4a2070` shadow → `#7040a0` mid → `#a070d0` highlight.
- Halo: `#ffe8a0` core, `#ffd060` mid, alpha-blended into the violet glow.
- Outline: 1 px `#0e0820` — darker than other arcane structures to anchor the throne visually.

## Pixel art rules
- 1 px outline, no AA.
- 3-color palette per detail blob.
- Damage states reuse the silhouette — no redraws between frames. Frame 1 = frame 0 with crystal-fracture pixels added; frame 4 = frame 0 with most of the upper silhouette gone + central core exposed.
- Halo dims by reducing its alpha-blended brightness, not by changing color.
- Archmage figure stays seated across frames 0–2; "leaning forward" pose at frame 3; "dissolving" wisps at frame 4.

## What NOT to draw
- No HP bar / numbers (engine renders separately).
- No damage numbers / ability VFX (those overlay separately).
- No connecting magic beams to player towers.
- No animated frames within a damage state — just the 5 discrete state transitions.

## Frame transitions
- 0 → 1: cosmetic cracks. "First hit on the boss." Halo barely affected.
- 1 → 2: visible mid-damage. "Chipping at it." Halo dimmed to 50%.
- 2 → 3: clearly worn. "Almost there." Halo down to 20%, embers visible. This is also the 25% HP phase trigger (Ult summons reinforcements).
- 3 → 4: pre-collapse. "One more hit." Halo extinguished, crystals dark, archmage form indistinct.

---

## Destructible Structure framework (reusable)

The engine framework that backs the throne should be reusable for any future campaign's boss structure. Spec:

### Schema additions (minimal)

```ts
// src/data/Maps.ts
export interface DestructibleStructurePlacement {
  id: string;                    // e.g. 'arcane_archmage_throne'
  col: number;                   // top-left col
  row: number;                   // top-left row
  hp: number;                    // total HP
  isMissionWinTarget?: boolean;  // M10: kill this to win
  phaseHooks?: {
    /** Phase HP fractions (e.g. [0.5, 0.25, 0.1]) and a string id
     *  the controller dispatches via FinaleEffects.dispatch(id). */
    [fraction: string]: string;
  };
}
export interface MapDefinition {
  // ...
  destructibleStructures?: DestructibleStructurePlacement[];
}

// src/data/DestructibleStructures.ts (new file)
export interface DestructibleStructureDef {
  id: string;
  widthCells: number;     // footprint
  heightCells: number;
  textureKey: string;     // spritesheet
  damageFrames: number;   // 5 by convention
  defaultHp: number;      // fallback when placement doesn't override
}
export const DESTRUCTIBLE_STRUCTURES: Record<string, DestructibleStructureDef> = {
  arcane_archmage_throne: {
    id: 'arcane_archmage_throne',
    widthCells: 3, heightCells: 3,
    textureKey: 'struct_arcane_archmage_throne',
    damageFrames: 5,
    defaultHp: 5000,
  },
  // Future: mech_war_furnace { 4 × 3, 6000 hp }, nature_elder_tree { 3 × 4, 4500 hp }, ...
};
```

### Entity (parallels Tower / SummoningCircle)

```ts
// src/entities/DestructibleStructure.ts
export class DestructibleStructure {
  col: number; row: number;
  def: DestructibleStructureDef;
  hp: number; maxHp: number;
  sprite: Phaser.GameObjects.Sprite;
  destructible = true;
  isMissionWinTarget = false;
  phaseHooks: Record<string, string> = {};
  private _phasesFired = new Set<string>();
  constructor(scene, col, row, def, hp, hooks);
  takeDamage(amount: number): boolean;  // returns true on killing blow
  draw();                                // pick frame index = floor(damageFrames * (1 - hp/maxHp))
  checkPhaseHooks(): string | null;      // returns next phase id to dispatch, if any
  destroy();
}
```

### Hero attack adapter

The hero already has `clickedTowerTarget: Tower | null` and `attackTower(tower)`. Migrate to a `Damageable` interface that BOTH `Tower` and `DestructibleStructure` satisfy, so the hero can attack either. (`src/systems/finale/Damageable.ts` is referenced in the original M10 plan as a future create-file; this PRD finally requires it.)

### CPU-tower target

CPU defender towers (the small Tower-class cabal towers) already use `Tower.findTarget`. Add destructible structures as additional valid targets via the same Chebyshev / range check. (Not blocking for M10 — towers don't shoot the throne.)

### Win condition

`FinaleController.checkWin()` now requires:
- All non-mission-win-target Tower-class destructibles destroyed, AND
- All `isMissionWinTarget` DestructibleStructures destroyed.

Keeps the existing "kill all CPU towers" semantics. The throne becomes the named win-target via `isMissionWinTarget: true` instead of the `Tower.isUlt` flag.

### Migration path for M10

1. Author spritesheet + register `arcane_archmage_throne` in `DESTRUCTIBLE_STRUCTURES`.
2. Move M10 map's Throne entry from `destructibleTowers` to `destructibleStructures`.
3. Move phase hooks (50/25/10% HP triggers) from `Tower._ultPhaseNNFired` to `DestructibleStructure.phaseHooks` config.
4. Delete the temporary `arcane_ult_throne` `TowerType` registration once the structure replaces it.

Reusable for: every future campaign finale (Mech / Nature / Void / etc), boss-rush archetypes, base-defense game-mode finals.

## Reference / mood
- `struct_arcane_crystal_nexus.png` (~140×560, 4-frame anim) — closest existing analog for arcane multi-tile + multi-state structures.
- `struct_psionic_brain_vat.png` (3 × 5, 3-frame anim) — for "boss-feeling" larger structure silhouette.
- Game references: Final Fantasy boss arena thrones, Diablo II act bosses (Mephisto throne), Castlevania boss rooms.

## Sprite gen / hand-author tradeoff
Hand-author. The Throne is the campaign's climax setpiece — procedural gen would feel cheap. Budget ~2 days of pixel-artist time for the 5-frame sheet.
