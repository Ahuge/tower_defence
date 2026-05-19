# DESIGN.md — Design Standards

Quality bars and process checklists for design work in this repo. Asset *inventory* (what art is required, where it slots, file specs) lives in `notes/art_prd.md` — this doc is about *how to hit the quality bar* when producing that art.

Sections:

- [Procedural Sprites](#procedural-sprites)

---

## Procedural Sprites

This codebase ships a lot of procedurally-drawn pixel-art (towers, projectiles, creeps, structures, hero variants) via `*_sprites.tsx` files at the repo root. Each is a React component that renders a sheet to a `<canvas>`, with a "Download PNG" button + a headless `scripts/render_*.ts` script that bakes the same sheet for committing under `public/assets/`.

The quality of this art has drifted before. The standards below exist because we shipped a campaign creep sheet (`mech_campaign_creeps.png` v1) where two of six sprites were unreadable at game scale — the brief was met but the *art* wasn't. These standards are how we stop that from happening again.

### The core failure mode

> "I described details that are 3–4 pixels at sprite scale. Sub-silhouette features rarely survive the shrink to in-game size."

Creeps render at **28–40%** scale in-game (see `getCreepSpriteScale()` in `CreepSpriteManager.ts`). Towers, projectiles, and structures shrink less, but they shrink. **A pixel-level detail in the brief becomes a sub-pixel smear on screen.** If a brief says "wedding tiara" and the tiara is 3 pixels wide, it will NOT read at the size the player sees. Push it bigger, or replace it with something silhouette-scale.

### Pre-flight checklist (before writing draw code)

- [ ] **Open the reference sheet.** Open the densest existing sheet in the same neighbourhood (e.g. for a new mech creep variant: `public/assets/creeps/mechanical_creeps.png`). Pick the three densest columns. **That is the density bar, not the brief.** Match it.
- [ ] **Squint-test each brief item.** For every distinguishing detail in the brief, ask: "How many pixels wide is this at 64×64?" If ≤3, it WILL NOT read at game scale. Either upsize it (e.g. veil 6px wide → veil 16px wide) or replace it (e.g. "wreath of moss" → "halo of green leaves").
- [ ] **Silhouette distinctness.** Two creeps in the same set should be distinguishable when reduced to black-only blobs. If two of your concepts both resolve to "tall pale column," merge them or change one's pose/proportions/scale.
- [ ] **Scale anchors.** Note the existing reference sprite's body-height-in-pixels and head-width-in-pixels. Match those proportions unless you're intentionally drawing a "big boss" or "small swarm" variant.

### Post-bake iteration loop (mandatory)

- [ ] Run `node --import tsx scripts/render_<name>.ts` to bake.
- [ ] **Open the baked PNG side-by-side with the reference sheet.** Use a small image viewer or `Read` the PNG file — view it at 1× and at game scale (downscale to ~40%).
- [ ] **Rank the new sprites worst-to-best.** Identify the bottom-of-set.
- [ ] **Redraw the bottom one.** Not a tweak — a real redraw with a different composition.
- [ ] Repeat the rank → redraw loop until the bottom of the new set is at least as readable as the bottom of the reference sheet.
- [ ] **At least one redraw round is required before commit.** A first-pass set will always have at least one weak sprite that's invisible to you until you see it baked.

### Per-sprite acceptance criteria

A sprite "passes" when, viewed at 40% scale (the in-game shrink), all of:

- [ ] The brief's core silhouette read is recognisable in under 2 seconds.
- [ ] At least one walk-cycle frame is *visibly different* from the others (bob alone is not enough — limbs must swing/legs must alternate/wings must beat).
- [ ] At least one element that is *unique to this sprite* (not present on its siblings) is visible. This is the differentiator — it's why this creep isn't col-0 standard.
- [ ] If the brief specified a trait-tied visual (e.g. "red vents = vent-armor trait," "shield bubble = shield trait"), that element is the most visually-prominent feature.
- [ ] Death animation has three clearly-distinguishable phases (initial break → burst → settled). All-frames-look-similar death anims read as noise.

### Palette discipline

- **Use the existing faction palette as the *base*.** Pull colors from the corresponding `<faction>_sprites.tsx` / `<faction>_creep_sprites.tsx` palette object — don't invent new hex codes that drift the faction look.
- **Campaign sheets may push outside the faction palette for narrative reasons** (e.g. Snake Eyes' Collector has a Victorian-banker palette that's correctly more muted than `void_creeps.png`). When you do, document why in the file header.
- **Saturation matches reference.** If `nature_creeps.png` is saturated greens with bright accents, don't ship a Greenward sheet of washed-out greys "because it's mournful" — the contrast against in-game lighting will swallow it.

### Sheet-layout conventions

For new creep sheets:

- **One column per creep type.** Row 0–3 = walk cycle, row 4–6 = death. Frame size 64×64. (Matches `CreepSpriteManager`'s expected layout.)
- **Logical drawing grid is 32×32 at 2× pixel size = 64×64 frame.** See `mk()` helper pattern in any `*_creep_sprites.tsx`.
- **Sheets > 16 columns wide are an anti-pattern.** Split into a separate campaign sheet (which the manager routes to via `*_CAMPAIGN_TO_COL`).
- **Always export `SHEET_W`, `SHEET_H`, and a `drawXxxSheet(ctx)` function** so the headless renderer can import them without re-deriving dims.

### Wiring a new campaign sheet into the game

1. Create `<campaign>_creep_sprites.tsx` at repo root with draw functions + a sheet exporter.
2. Add `scripts/render_<campaign>_creep_sprites.ts` mirroring the existing renderers.
3. Run it to bake into `public/assets/creeps/<campaign>_creeps.png`.
4. In `src/systems/CreepSpriteManager.ts`:
   - Add a `<CAMPAIGN>_CAMPAIGN_TO_COL` map.
   - Add the sheet key constant.
   - Extend `resolveSheet()` to check the new map.
   - Extend `preloadCreepSprites()` + `createCreepAnimations()` to register the sheet.
5. Add a vitest pin (`src/systems/CreepSpriteManager.test.ts` pattern) for the routing map: every id mapped, columns distinct, asset PNG present on disk.

### When you're done

Before opening the PR:

- [ ] Bake one final time.
- [ ] Look at the baked sheet next to the reference sheet at 1× and 40%.
- [ ] If you can't immediately point to which sprite is *the worst* in the new set, you haven't iterated enough. There's always a worst — find it and redraw it.
- [ ] If a sprite in the new set is the worst by a wide margin, that's the redraw target before commit.
