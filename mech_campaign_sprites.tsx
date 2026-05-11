// @ts-nocheck
/**
 * mech_campaign_sprites.tsx — one-off sprites for the Mechanical campaign.
 *
 * Same shape as arcane_campaign_sprites.tsx (palette imports, draw helpers,
 * default-export React component for the sprite-preview pipeline).
 *
 * Contents (built incrementally — order matches mech-campaign-sprites-plan.md):
 *   - Workshop (M10) — Arcane summoning altar where Vael conjures the
 *     Raider squad. Violet stone + gold runes. Single static frame, 32×32.
 *     Bakes to `assets/arena/struct_workshop.png`.
 *
 *   - Suppression Pylon (M2/M5/M6/M8 + M10) — Voss's industrial anti-
 *     arcane apparatus. Brass tripod + smokestack + chamber with a
 *     captured violet heart. 8-frame sheet, 32×32 each. Frames 0-3
 *     are the active pulse loop, 4-5 are channeling, 6-7 are muted.
 *     Bakes to `assets/arena/struct_suppression_pylon.png`.
 *   - Generator (M10) — Voss's power-cell tower. Cluster of 4 on the
 *     M10 map; each gates a tower cluster (cascade-kills its linked
 *     towers on death) and the throne shield. 4 damage frames, 32×32
 *     each. Inert HP bag — doesn't fire. Bakes to
 *     `assets/arena/struct_generator.png`.
 *   - Raider (M10) — Vael's apprentice. Player-trained mobile unit
 *     that walks across the map and sabotages Voss's foundry.
 *     Inspired by the existing arcane_creep mage variants — hooded,
 *     violet robe, golden chest rune, glowing wand. 4-frame walk
 *     cycle at 32×32. Bakes to `assets/arena/raider.png`.
 *
 *   Forthcoming: Voss's Throne (Mech 3×3 boss structure).
 */
import { useRef, useEffect, useState } from 'react';
import { C_base as ArcBase } from './arcane_sprites';

// ===== HELPERS =====
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ============================================================
// WORKSHOP — Vael's summoning altar (M10)
// ============================================================
// 32×32 single frame. Octagonal stone dais with a peaked roof on
// two flanking pillars; a glowing arcane rune hangs in the alcove
// between the pillars. Reads as "place where apprentices are
// conjured into being." Arcane palette throughout — violet stone,
// gold rune accent, lavender highlight.

const WS_W = 32;
const WS_H = 32;
const WS_FRAMES = 1;

// Palette aliases for legibility.
const WS_SHAD       = ArcBase.SHAD;        // #110022 — outline / deepest shadow
const WS_STONE_DK   = ArcBase.DVIO;        // #220044 — base stone shadow
const WS_STONE_MD   = ArcBase.DKVIO;       // #331166 — stone mid-tone
const WS_STONE_LT   = ArcBase.MDVIO;       // #442288 — stone highlight
const WS_RUNE_GOLD  = '#ffcc44';
const WS_RUNE_HI    = '#ffee99';
const WS_VIOLET     = ArcBase.BRVIO;       // #6644ff — magic glow
const WS_LAV        = ArcBase.LAV;         // #cc88ff — bright lavender
const WS_PLLAV      = ArcBase.PLLAV;       // #eeccff — palest lavender highlight

function drawWorkshopSheet(ctx: CanvasRenderingContext2D) {
  // ─── DAIS (bottom octagonal base, rows 24-30) ────────────
  // Wide bottom row, narrower upper rows — fakes octagonal shape.
  rect(ctx, 6, 30, 20, 1, WS_SHAD);              // ground shadow
  rect(ctx, 5, 28, 22, 2, WS_STONE_DK);          // dais base ring
  rect(ctx, 6, 27, 20, 1, WS_STONE_MD);          // dais step
  rect(ctx, 7, 26, 18, 1, WS_STONE_LT);          // dais top edge highlight
  rect(ctx, 7, 25, 18, 1, WS_STONE_MD);          // dais top
  // Dais detail — repeating notches for "carved stone" feel.
  for (let x = 8; x < 25; x += 3) {
    px(ctx, x, 27, WS_SHAD);
    px(ctx, x, 29, WS_SHAD);
  }
  // Front step into alcove.
  rect(ctx, 12, 24, 8, 1, WS_STONE_MD);
  rect(ctx, 13, 23, 6, 1, WS_STONE_LT);

  // ─── PILLARS (left + right, rows 8-24) ───────────────────
  // Left pillar.
  rect(ctx, 6, 8, 4, 17, WS_STONE_DK);           // shadow
  rect(ctx, 7, 8, 2, 17, WS_STONE_MD);           // mid
  rect(ctx, 7, 8, 1, 17, WS_STONE_LT);           // left-edge highlight
  rect(ctx, 6, 9, 1, 15, WS_SHAD);               // outline
  // Right pillar (mirror).
  rect(ctx, 22, 8, 4, 17, WS_STONE_DK);
  rect(ctx, 23, 8, 2, 17, WS_STONE_MD);
  rect(ctx, 24, 8, 1, 17, WS_STONE_LT);
  rect(ctx, 25, 9, 1, 15, WS_SHAD);
  // Pillar caps (carved tops).
  rect(ctx, 5, 7, 6, 1, WS_STONE_LT);
  rect(ctx, 21, 7, 6, 1, WS_STONE_LT);
  rect(ctx, 5, 8, 6, 1, WS_STONE_MD);
  rect(ctx, 21, 8, 6, 1, WS_STONE_MD);

  // ─── ROOF / CANOPY (peaked arch, rows 1-7) ──────────────
  // Spans across both pillars, peaked apex in the centre.
  rect(ctx, 6, 6, 20, 1, WS_STONE_DK);           // canopy underside shadow
  rect(ctx, 7, 5, 18, 1, WS_STONE_MD);           // canopy main
  rect(ctx, 8, 4, 16, 1, WS_STONE_LT);           // canopy top edge
  // Peak: triangle rising from centre.
  rect(ctx, 14, 3, 4, 1, WS_STONE_MD);
  rect(ctx, 15, 2, 2, 1, WS_STONE_LT);
  px(ctx, 15, 1, WS_STONE_MD);
  px(ctx, 16, 1, WS_STONE_DK);
  // Peak apex finial — small gold rune to crown the structure.
  px(ctx, 15, 0, WS_RUNE_GOLD);
  px(ctx, 16, 0, WS_RUNE_GOLD);

  // ─── ALCOVE INTERIOR (the dark space behind the rune) ────
  // Recess between pillars, casts shadow.
  rect(ctx, 11, 9, 10, 14, WS_SHAD);
  rect(ctx, 11, 9, 1, 14, WS_STONE_DK);          // inner-left edge
  rect(ctx, 20, 9, 1, 14, WS_STONE_DK);          // inner-right edge
  // Subtle violet inner glow lining the alcove.
  rect(ctx, 12, 10, 8, 1, withAlpha(WS_VIOLET, 0.35));
  rect(ctx, 12, 22, 8, 1, withAlpha(WS_VIOLET, 0.35));

  // ─── RUNE — central glowing sigil ────────────────────────
  // The rune is a hovering hexagonal sigil — gold core with violet
  // diffusion ring. Player reads it as "things spawn from here."
  const rcx = 16, rcy = 15;
  // Outer violet glow (3 concentric brightness rings).
  for (let r = 5; r >= 1; r--) {
    const intensity = (6 - r) / 6; // 0.17 → 0.83
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === r) {
          px(ctx, rcx + dx, rcy + dy, withAlpha(WS_LAV, intensity * 0.5));
        }
      }
    }
  }
  // Hex outline (gold).
  px(ctx, rcx,     rcy - 3, WS_RUNE_GOLD);
  px(ctx, rcx - 1, rcy - 2, WS_RUNE_GOLD); px(ctx, rcx + 1, rcy - 2, WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy - 1, WS_RUNE_GOLD); px(ctx, rcx + 2, rcy - 1, WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy,     WS_RUNE_GOLD); px(ctx, rcx + 2, rcy,     WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy + 1, WS_RUNE_GOLD); px(ctx, rcx + 2, rcy + 1, WS_RUNE_GOLD);
  px(ctx, rcx - 1, rcy + 2, WS_RUNE_GOLD); px(ctx, rcx + 1, rcy + 2, WS_RUNE_GOLD);
  px(ctx, rcx,     rcy + 3, WS_RUNE_GOLD);
  // Hex core (brighter highlight).
  rect(ctx, rcx - 1, rcy - 1, 3, 3, WS_RUNE_HI);
  px(ctx, rcx, rcy, '#ffffff');

  // ─── ORBITING GLYPH PARTICLES ────────────────────────────
  // Three pale lavender dots floating around the rune — atmosphere.
  px(ctx, 10, 12, WS_PLLAV);
  px(ctx, 22, 17, WS_PLLAV);
  px(ctx, 12, 20, WS_PLLAV);
}

// ============================================================
// SUPPRESSION PYLON — Voss's anti-arcane apparatus
// ============================================================
// 32×32 × 8 frames stacked vertically. Industrial brass tripod
// supporting a smokestack column + reactor chamber that cradles a
// captured violet heart. Frames split into three states the
// SuppressionRender consumer picks by:
//   F0..F3  active pulse loop (dim → bright → dim → mid)
//   F4..F5  channeling (player counter — cracked aperture + sparks)
//   F6..F7  muted (dormant; dim heart, cold coils)
// The outer field circle + clockwise channel-progress arc stay as
// Phaser gfx overlays in SuppressionRender — the sprite is the
// device itself.

const SP_W = 32;
const SP_H = 32;
const SP_FRAMES = 8;

const SP_SHAD       = '#0a0808';                 // outline / deepest shadow
const SP_BRASS_DK   = MechBase.DKBRZ;            // #995522 — pipe shadow
const SP_BRASS_MD   = MechBase.BRONZE;           // #cc8833 — pipe mid
const SP_BRASS_LT   = MechBase.LTBRZ;            // #ddaa55 — pipe highlight
const SP_BRASS_HI   = MechBase.TAN;              // #eebb66 — brightest brass
const SP_IRON_DK    = MechBase.DKSTL;            // #666666 — iron shadow
const SP_IRON_MD    = MechBase.STEEL;            // #888888 — iron mid
const SP_IRON_LT    = MechBase.LTSTL;            // #aaaaaa — iron highlight
const SP_RIVET      = MechBase.RIVET;            // #555555 — bolt heads
const SP_SMOKE_DK   = MechBase.SMOKE;            // #665555
const SP_SMOKE_LT   = MechBase.LTSMK;            // #887777
const SP_HEART_DK   = '#221038';                 // captured-violet deep
const SP_HEART_MD   = '#5530a8';
const SP_HEART_BR   = '#9966ff';
const SP_HEART_HI   = '#dccaff';
const SP_HEART_PL   = '#ffffff';                 // brightest pulse
const SP_SPARK      = MechTower.SPARK;           // #ffff88 — channeling sparks
const SP_CRACK      = '#ffeeaa';                 // crack-line highlight

/** Draws the shared tripod + smokestack + reactor frame. State-
 *  specific bits (heart brightness, smoke, sparks) layer on top
 *  per-frame. `yOff` is the vertical offset into the sheet. */
function drawPylonChassis(ctx: CanvasRenderingContext2D, yOff: number) {
  // ─── TRIPOD BASE (rows 26-30) ─────────────────────────────
  // Three angled legs splayed to the corners.
  // Left leg.
  rect(ctx, 4, yOff + 28, 4, 2, SP_BRASS_DK);
  rect(ctx, 5, yOff + 27, 3, 1, SP_BRASS_MD);
  rect(ctx, 6, yOff + 26, 2, 1, SP_BRASS_LT);
  rect(ctx, 7, yOff + 24, 2, 2, SP_BRASS_DK);
  rect(ctx, 8, yOff + 23, 1, 1, SP_BRASS_MD);
  // Right leg.
  rect(ctx, 24, yOff + 28, 4, 2, SP_BRASS_DK);
  rect(ctx, 24, yOff + 27, 3, 1, SP_BRASS_MD);
  rect(ctx, 24, yOff + 26, 2, 1, SP_BRASS_LT);
  rect(ctx, 23, yOff + 24, 2, 2, SP_BRASS_DK);
  rect(ctx, 23, yOff + 23, 1, 1, SP_BRASS_MD);
  // Centre foot.
  rect(ctx, 13, yOff + 30, 6, 1, SP_SHAD);
  rect(ctx, 12, yOff + 28, 8, 2, SP_BRASS_DK);
  rect(ctx, 13, yOff + 27, 6, 1, SP_BRASS_MD);
  rect(ctx, 13, yOff + 26, 6, 1, SP_BRASS_LT);
  // Bolt heads on the centre foot.
  px(ctx, 13, yOff + 28, SP_RIVET);
  px(ctx, 18, yOff + 28, SP_RIVET);

  // ─── CENTRAL PIPE (rows 18-26) ────────────────────────────
  // Vertical brass tube connecting base to reactor.
  rect(ctx, 13, yOff + 18, 6, 8, SP_BRASS_DK);          // shadow
  rect(ctx, 14, yOff + 18, 4, 8, SP_BRASS_MD);          // mid
  rect(ctx, 14, yOff + 18, 1, 8, SP_BRASS_LT);          // left-edge highlight
  rect(ctx, 17, yOff + 18, 1, 8, SP_BRASS_DK);          // right-edge shadow
  // Pipe rings.
  rect(ctx, 12, yOff + 21, 8, 1, SP_BRASS_DK);
  rect(ctx, 13, yOff + 21, 6, 1, SP_BRASS_LT);
  rect(ctx, 12, yOff + 24, 8, 1, SP_BRASS_DK);
  rect(ctx, 13, yOff + 24, 6, 1, SP_BRASS_LT);

  // ─── REACTOR CHAMBER (rows 8-18) ──────────────────────────
  // Bulbous iron housing that cradles the captured violet heart.
  // Bottom-flare collar.
  rect(ctx, 10, yOff + 17, 12, 1, SP_IRON_DK);
  rect(ctx, 11, yOff + 16, 10, 1, SP_IRON_MD);
  // Main chamber body.
  rect(ctx, 10, yOff + 9, 12, 7, SP_IRON_DK);
  rect(ctx, 11, yOff + 9, 10, 7, SP_IRON_MD);
  rect(ctx, 11, yOff + 9, 1, 7, SP_IRON_LT);            // left highlight
  rect(ctx, 20, yOff + 9, 1, 7, SP_IRON_DK);            // right shadow
  rect(ctx, 11, yOff + 9, 10, 1, SP_IRON_LT);           // top highlight
  // Rivets around the chamber.
  px(ctx, 11, yOff + 10, SP_RIVET);
  px(ctx, 20, yOff + 10, SP_RIVET);
  px(ctx, 11, yOff + 14, SP_RIVET);
  px(ctx, 20, yOff + 14, SP_RIVET);
  // Aperture frame — diamond cut in the chamber face that exposes
  // the heart. Iron bevel on the outside, heart fills the inside.
  rect(ctx, 13, yOff + 10, 6, 5, SP_SHAD);              // recess
  rect(ctx, 13, yOff + 10, 1, 5, SP_IRON_DK);
  rect(ctx, 18, yOff + 10, 1, 5, SP_IRON_DK);
  rect(ctx, 14, yOff + 9,  4, 1, SP_IRON_DK);
  rect(ctx, 14, yOff + 15, 4, 1, SP_IRON_DK);

  // ─── SMOKESTACK CAP (rows 3-8) ────────────────────────────
  // Top of the chamber tapers into a stack.
  rect(ctx, 12, yOff + 7,  8, 2, SP_IRON_DK);
  rect(ctx, 13, yOff + 7,  6, 1, SP_IRON_MD);
  rect(ctx, 14, yOff + 5,  4, 3, SP_BRASS_DK);
  rect(ctx, 15, yOff + 5,  2, 3, SP_BRASS_MD);
  rect(ctx, 13, yOff + 4,  6, 1, SP_BRASS_HI);          // collar
  rect(ctx, 14, yOff + 3,  4, 1, SP_BRASS_DK);
}

/** Fills the heart aperture (cols 14-17, rows 10-14 inside chassis). */
function drawPylonHeart(ctx: CanvasRenderingContext2D, yOff: number, brightness: number) {
  // brightness 0..1 → dim to bright. We pick a colour palette by
  // bucket so each frame reads as a clean step.
  let core: string, mid: string, halo: string;
  if (brightness < 0.15) {
    core = SP_HEART_DK; mid = SP_HEART_DK; halo = SP_HEART_DK;
  } else if (brightness < 0.4) {
    core = SP_HEART_MD; mid = SP_HEART_DK; halo = SP_HEART_DK;
  } else if (brightness < 0.7) {
    core = SP_HEART_BR; mid = SP_HEART_MD; halo = SP_HEART_DK;
  } else if (brightness < 0.95) {
    core = SP_HEART_HI; mid = SP_HEART_BR; halo = SP_HEART_MD;
  } else {
    core = SP_HEART_PL; mid = SP_HEART_HI; halo = SP_HEART_BR;
  }
  // Fill aperture with banded brightness.
  rect(ctx, 14, yOff + 10, 4, 5, halo);
  rect(ctx, 14, yOff + 11, 4, 3, mid);
  rect(ctx, 15, yOff + 12, 2, 1, core);
  // Outer halo bleeding past the aperture edges (only when bright).
  if (brightness >= 0.4) {
    rect(ctx, 13, yOff + 11, 1, 3, withAlpha(halo, 0.45));
    rect(ctx, 18, yOff + 11, 1, 3, withAlpha(halo, 0.45));
    px(ctx, 14, yOff + 9,  withAlpha(halo, 0.35));
    px(ctx, 17, yOff + 9,  withAlpha(halo, 0.35));
    px(ctx, 14, yOff + 15, withAlpha(halo, 0.35));
    px(ctx, 17, yOff + 15, withAlpha(halo, 0.35));
  }
}

/** Smoke wisps off the stack — only meaningful when the heart is
 *  energetic enough to drive the convection. */
function drawPylonSmoke(ctx: CanvasRenderingContext2D, yOff: number, intensity: number) {
  if (intensity <= 0) return;
  px(ctx, 15, yOff + 2, withAlpha(SP_SMOKE_LT, intensity));
  px(ctx, 16, yOff + 1, withAlpha(SP_SMOKE_DK, intensity));
  if (intensity >= 0.5) {
    px(ctx, 14, yOff + 0, withAlpha(SP_SMOKE_LT, intensity * 0.6));
    px(ctx, 17, yOff + 2, withAlpha(SP_SMOKE_DK, intensity));
  }
}

/** Channeling-state overlay: cracks across the aperture + sparks
 *  at the base of the heart. */
function drawPylonChannelOverlay(ctx: CanvasRenderingContext2D, yOff: number, advancement: number) {
  // Cracks — diagonal lines across the iron aperture frame.
  px(ctx, 13, yOff + 11, SP_CRACK);
  px(ctx, 14, yOff + 12, SP_CRACK);
  px(ctx, 18, yOff + 13, SP_CRACK);
  if (advancement >= 0.5) {
    px(ctx, 12, yOff + 10, SP_CRACK);
    px(ctx, 19, yOff + 14, SP_CRACK);
    px(ctx, 15, yOff + 9,  SP_CRACK);
  }
  // Sparks erupting upward from the heart base.
  px(ctx, 15, yOff + 16, SP_SPARK);
  px(ctx, 17, yOff + 16, SP_SPARK);
  if (advancement >= 0.5) {
    px(ctx, 14, yOff + 17, SP_SPARK);
    px(ctx, 18, yOff + 17, SP_SPARK);
  }
}

function drawSuppressionPylonSheet(ctx: CanvasRenderingContext2D) {
  // Heart brightness + smoke per frame. Active pulse runs 4 frames
  // with a classic bright-dim-bright sinusoid. Channeling holds the
  // mid brightness so the cracks read against a visible heart.
  // Muted is cold — heart all but dead.
  const heartByFrame = [0.55, 0.85, 1.0, 0.85, 0.6, 0.4, 0.15, 0.1];
  const smokeByFrame = [0.4, 0.7, 1.0, 0.6, 0.5, 0.4, 0,   0];

  for (let f = 0; f < SP_FRAMES; f++) {
    const yOff = f * SP_H;
    drawPylonChassis(ctx, yOff);
    drawPylonHeart(ctx, yOff, heartByFrame[f]);
    drawPylonSmoke(ctx, yOff, smokeByFrame[f]);
    if (f === 4 || f === 5) {
      const adv = f === 4 ? 0.4 : 0.8;
      drawPylonChannelOverlay(ctx, yOff, adv);
    }
  }
}

// ============================================================
// GENERATOR — Voss's power cell (M10)
// ============================================================
// 32×32 × 4 frames stacked vertically (100/66/33/0% HP). Iron base
// ring + three stacked coil-rings rising up the central post; an
// arcing forge-orange current runs between them at full HP and dies
// out as damage progresses. Status indicator on the side cycles
// green → amber → red → black. Inert HP bag in gameplay — the
// sprite tells the story but the device doesn't fire.

const GN_W = 32;
const GN_H = 32;
const GN_FRAMES = 4;

const GN_SHAD       = '#0a0808';
const GN_IRON_DK    = MechBase.DKSTL;            // #666666
const GN_IRON_MD    = MechBase.STEEL;            // #888888
const GN_IRON_LT    = MechBase.LTSTL;            // #aaaaaa
const GN_BRASS_DK   = MechBase.DKBRZ;
const GN_BRASS_MD   = MechBase.BRONZE;
const GN_BRASS_LT   = MechBase.LTBRZ;
const GN_BRASS_HI   = MechBase.TAN;
const GN_RIVET      = MechBase.RIVET;
const GN_ARC_DK     = MechTower.DFORG;           // #cc3300
const GN_ARC_MD     = MechTower.FORG;            // #ff4400
const GN_ARC_HI     = MechTower.LFORG;           // #ff6622
const GN_ARC_WT     = '#ffeebb';                 // arc core
const GN_STAT_GR    = '#44dd66';
const GN_STAT_AM    = '#ddaa44';
const GN_STAT_RD    = '#dd4444';
const GN_STAT_OFF   = '#222222';
const GN_SMOKE_DK   = MechBase.SMOKE;
const GN_SMOKE_LT   = MechBase.LTSMK;

interface GeneratorState {
  /** 0..3 = coils still standing (intact upward).  */
  coilsAlive: number;
  /** 0..1 — arc brightness. 0 = dead, 1 = pristine. */
  arcStrength: number;
  /** Status indicator colour. */
  statusColor: string;
  /** Smoke wisp intensity. */
  smoke: number;
}

const GENERATOR_STATES: GeneratorState[] = [
  { coilsAlive: 3, arcStrength: 1.0, statusColor: GN_STAT_GR,  smoke: 0.4 }, // 100% HP
  { coilsAlive: 2, arcStrength: 0.6, statusColor: GN_STAT_AM,  smoke: 0.7 }, // 66%
  { coilsAlive: 1, arcStrength: 0.3, statusColor: GN_STAT_RD,  smoke: 1.0 }, // 33%
  { coilsAlive: 0, arcStrength: 0,   statusColor: GN_STAT_OFF, smoke: 0   }, // 0%  (dead)
];

function drawGeneratorChassis(ctx: CanvasRenderingContext2D, yOff: number) {
  // ─── BASE RING (rows 24-30) ───────────────────────────────
  rect(ctx, 5, yOff + 30, 22, 1, GN_SHAD);              // ground shadow
  rect(ctx, 4, yOff + 28, 24, 2, GN_IRON_DK);           // base ring shadow
  rect(ctx, 5, yOff + 27, 22, 1, GN_IRON_MD);           // base step
  rect(ctx, 6, yOff + 26, 20, 1, GN_IRON_LT);           // top edge highlight
  rect(ctx, 6, yOff + 25, 20, 1, GN_IRON_MD);           // base top
  // Brass collar on the base.
  rect(ctx, 9, yOff + 24, 14, 1, GN_BRASS_DK);
  rect(ctx, 10, yOff + 23, 12, 1, GN_BRASS_MD);
  rect(ctx, 11, yOff + 22, 10, 1, GN_BRASS_LT);
  // Bolts on the base ring corners.
  for (const x of [5, 11, 20, 26]) {
    px(ctx, x, yOff + 28, GN_RIVET);
  }

  // ─── SIDE STRUTS (rows 7-22) ──────────────────────────────
  // Brass vertical rails running up the sides.
  rect(ctx, 8, yOff + 8, 1, 14, GN_BRASS_DK);
  rect(ctx, 9, yOff + 7, 1, 15, GN_BRASS_MD);
  rect(ctx, 22, yOff + 7, 1, 15, GN_BRASS_MD);
  rect(ctx, 23, yOff + 8, 1, 14, GN_BRASS_DK);
  // Cross-braces.
  rect(ctx, 9, yOff + 13, 14, 1, GN_BRASS_DK);
  rect(ctx, 9, yOff + 18, 14, 1, GN_BRASS_DK);
  px(ctx, 10, yOff + 13, GN_BRASS_HI);
  px(ctx, 21, yOff + 13, GN_BRASS_HI);
}

/** Draw one coil ring centred at (cx, cy). The ring is a chunky
 *  horizontal disc with a darker rim. */
function drawCoil(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  rect(ctx, cx - 4, cy,     8, 1, GN_IRON_DK);          // top rim shadow
  rect(ctx, cx - 5, cy + 1, 10, 1, GN_IRON_DK);
  rect(ctx, cx - 5, cy + 2, 10, 1, GN_IRON_MD);         // body
  rect(ctx, cx - 5, cy + 3, 10, 1, GN_IRON_LT);         // highlight band
  rect(ctx, cx - 4, cy + 4, 8, 1, GN_IRON_MD);
  rect(ctx, cx - 4, cy + 5, 8, 1, GN_SHAD);             // bottom rim shadow
  // Side bolts.
  px(ctx, cx - 5, cy + 2, GN_RIVET);
  px(ctx, cx + 4, cy + 2, GN_RIVET);
}

function drawGeneratorCoils(ctx: CanvasRenderingContext2D, yOff: number, coilsAlive: number) {
  // Coil positions (rows 7, 13, 19 — bottom to top: 0, 1, 2).
  const positions = [
    { cx: 16, cy: yOff + 19 }, // bottom coil
    { cx: 16, cy: yOff + 13 }, // middle coil
    { cx: 16, cy: yOff + 7  }, // top coil
  ];
  for (let i = 0; i < coilsAlive; i++) {
    drawCoil(ctx, positions[i].cx, positions[i].cy);
  }
  // Wreckage where coils have fallen out — broken rim fragments on
  // the floor + bent struts above.
  for (let i = coilsAlive; i < 3; i++) {
    if (i === 2) {
      // Top coil broken: bent strut tops.
      px(ctx, 9,  yOff + 7, GN_IRON_DK);
      px(ctx, 22, yOff + 7, GN_IRON_DK);
      px(ctx, 10, yOff + 6, GN_BRASS_DK);
    } else if (i === 1) {
      // Middle coil broken: stub fragments.
      px(ctx, 13, yOff + 14, GN_IRON_DK);
      px(ctx, 18, yOff + 14, GN_IRON_DK);
    } else if (i === 0) {
      // Bottom coil broken: collapsed column.
      rect(ctx, 13, yOff + 20, 6, 1, GN_SHAD);
      rect(ctx, 14, yOff + 21, 4, 1, GN_IRON_DK);
    }
  }
}

function drawGeneratorArc(ctx: CanvasRenderingContext2D, yOff: number, strength: number) {
  if (strength <= 0) return;
  // Vertical arc running through the centre. Thicker + brighter at
  // higher strength.
  // Outermost glow band.
  for (let y = yOff + 8; y <= yOff + 22; y++) {
    px(ctx, 15, y, withAlpha(GN_ARC_DK, 0.5 * strength));
    px(ctx, 17, y, withAlpha(GN_ARC_DK, 0.5 * strength));
  }
  // Mid band.
  for (let y = yOff + 9; y <= yOff + 21; y++) {
    px(ctx, 16, y, withAlpha(GN_ARC_HI, strength));
  }
  // White-hot core at high strength only.
  if (strength >= 0.6) {
    px(ctx, 16, yOff + 10, GN_ARC_WT);
    px(ctx, 16, yOff + 16, GN_ARC_WT);
    px(ctx, 16, yOff + 20, GN_ARC_WT);
  }
  // Branch arcs (small horizontal flickers) at full strength.
  if (strength >= 0.85) {
    px(ctx, 14, yOff + 11, GN_ARC_MD);
    px(ctx, 18, yOff + 17, GN_ARC_MD);
    px(ctx, 13, yOff + 14, GN_ARC_HI);
    px(ctx, 19, yOff + 19, GN_ARC_HI);
  }
}

function drawGeneratorStatus(ctx: CanvasRenderingContext2D, yOff: number, color: string) {
  // Status indicator on the right strut.
  px(ctx, 24, yOff + 22, GN_SHAD);
  px(ctx, 25, yOff + 22, color);
  px(ctx, 26, yOff + 22, GN_SHAD);
  px(ctx, 25, yOff + 21, withAlpha(color, 0.5));
}

function drawGeneratorSmoke(ctx: CanvasRenderingContext2D, yOff: number, intensity: number) {
  if (intensity <= 0) return;
  px(ctx, 16, yOff + 5,  withAlpha(GN_SMOKE_LT, intensity));
  px(ctx, 15, yOff + 3,  withAlpha(GN_SMOKE_DK, intensity * 0.85));
  if (intensity >= 0.6) {
    px(ctx, 17, yOff + 2, withAlpha(GN_SMOKE_LT, intensity * 0.7));
    px(ctx, 14, yOff + 1, withAlpha(GN_SMOKE_DK, intensity * 0.5));
  }
}

function drawGeneratorSheet(ctx: CanvasRenderingContext2D) {
  for (let f = 0; f < GN_FRAMES; f++) {
    const yOff = f * GN_H;
    const state = GENERATOR_STATES[f];
    drawGeneratorChassis(ctx, yOff);
    drawGeneratorCoils(ctx, yOff, state.coilsAlive);
    drawGeneratorArc(ctx, yOff, state.arcStrength);
    drawGeneratorStatus(ctx, yOff, state.statusColor);
    drawGeneratorSmoke(ctx, yOff, state.smoke);
  }
}

// ============================================================
// RAIDER — Vael's apprentice (M10 player unit)
// ============================================================
// 32×32 × 4-frame walk cycle stacked vertically. Hooded apprentice
// silhouette inspired by the existing arcane_creep_sprites Mage
// variants — same violet robe + glowing-rune language, scaled to a
// player-unit size. Faces south (down-screen) by convention; the
// in-engine sprite rotates to track the manual target.

const RD_W = 32;
const RD_H = 32;
const RD_FRAMES = 4;

const RD_VOID       = ArcBase.VOID;
const RD_SHAD       = ArcBase.SHAD;
const RD_ROBE_DK    = ArcBase.DVIO;
const RD_ROBE_MD    = ArcBase.DKVIO;
const RD_ROBE_LT    = ArcBase.MDVIO;
const RD_ROBE_HI    = ArcBase.BRVIO;
const RD_RUNE       = '#ffcc44';
const RD_RUNE_HI    = '#ffee99';
const RD_LAV        = ArcBase.LAV;
const RD_PLLAV      = ArcBase.PLLAV;
const RD_WAND       = '#aa8866';
const RD_WAND_DK    = '#664422';
const RD_WHITE      = '#ffffff';

function drawRaiderFrame(ctx: CanvasRenderingContext2D, yOff: number, f: number) {
  // Per-frame bob + leg/arm swing offsets. Classic 4-step cycle:
  // f0 + f2 are "planted" frames; f1 swings left lead, f3 swings
  // right lead.
  const bob = [0, -1, 0, 1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = yOff + 4 + bob;

  // ─── DROP SHADOW (always at sprite floor) ───────────────
  rect(ctx, 11, yOff + 30, 10, 1, withAlpha(RD_VOID, 0.55));

  // ─── HOOD ────────────────────────────────────────────────
  // Triangular apex narrowing to the brow.
  px(ctx, 16, by, RD_ROBE_LT);
  rect(ctx, 15, by + 1, 3, 1, RD_ROBE_DK);
  px(ctx, 15, by + 1, RD_ROBE_LT);
  rect(ctx, 14, by + 2, 5, 1, RD_ROBE_MD);
  px(ctx, 14, by + 2, RD_ROBE_LT);
  rect(ctx, 13, by + 3, 7, 2, RD_ROBE_MD);
  rect(ctx, 13, by + 3, 1, 2, RD_ROBE_LT);     // left-edge highlight
  rect(ctx, 19, by + 3, 1, 2, RD_ROBE_DK);     // right-edge shadow
  // Fold detail.
  px(ctx, 15, by + 3, RD_ROBE_HI);
  px(ctx, 17, by + 3, RD_ROBE_HI);

  // ─── FACE SHADOW + GLOWING EYES ──────────────────────────
  rect(ctx, 14, by + 5, 5, 2, RD_VOID);
  px(ctx, 14, by + 5, RD_ROBE_DK);
  px(ctx, 18, by + 5, RD_ROBE_DK);
  // Eyes — golden rune-gold, brighter inner pixel.
  px(ctx, 14, by + 6, RD_RUNE);
  px(ctx, 17, by + 6, RD_RUNE);
  px(ctx, 15, by + 6, RD_RUNE_HI);
  px(ctx, 18, by + 6, RD_RUNE_HI);

  // ─── ROBE BODY (cascade wider toward the feet) ───────────
  // Upper torso (just below the hood).
  rect(ctx, 12, by + 7, 8, 3, RD_ROBE_MD);
  rect(ctx, 12, by + 7, 1, 3, RD_ROBE_LT);     // left highlight
  rect(ctx, 19, by + 7, 1, 3, RD_ROBE_DK);     // right shadow
  // Mid-body — wider.
  rect(ctx, 11, by + 10, 10, 4, RD_ROBE_DK);
  rect(ctx, 11, by + 10, 1, 4, RD_ROBE_LT);
  rect(ctx, 20, by + 10, 1, 4, RD_VOID);
  // Lower-body — widest section approaching the hem.
  rect(ctx, 10, by + 14, 12, 4, RD_ROBE_DK);
  rect(ctx, 10, by + 14, 2, 4, RD_ROBE_MD);
  rect(ctx, 11, by + 14, 1, 4, RD_ROBE_LT);
  rect(ctx, 20, by + 14, 2, 4, RD_VOID);
  // Hem — deep shadow at the very bottom.
  rect(ctx, 10, by + 18, 12, 1, RD_VOID);

  // ─── CHEST RUNE — golden sigil on the robe ───────────────
  px(ctx, 15, by + 10, RD_RUNE);
  px(ctx, 16, by + 10, RD_RUNE);
  px(ctx, 16, by + 11, RD_RUNE_HI);
  px(ctx, 15, by + 12, RD_RUNE);
  px(ctx, 16, by + 12, RD_RUNE);

  // ─── WAND (held in the right hand, gem top) ──────────────
  // Shaft running along the right side.
  rect(ctx, 22, by + 4, 1, 9, RD_WAND);
  rect(ctx, 23, by + 4, 1, 9, RD_WAND_DK);
  // Wand grip wrap (binding lines).
  px(ctx, 22, by + 7, RD_WAND_DK);
  px(ctx, 22, by + 10, RD_WAND_DK);
  // Gem tip — violet orb with white core.
  px(ctx, 21, by + 2, RD_ROBE_HI);
  px(ctx, 22, by + 2, RD_LAV);
  px(ctx, 23, by + 2, RD_LAV);
  px(ctx, 24, by + 2, RD_ROBE_HI);
  px(ctx, 22, by + 1, RD_WHITE);
  px(ctx, 23, by + 1, RD_PLLAV);
  px(ctx, 22, by + 3, RD_ROBE_HI);
  px(ctx, 23, by + 3, RD_LAV);
  // Faint magical glow around the gem.
  px(ctx, 21, by + 1, withAlpha(RD_LAV, 0.4));
  px(ctx, 24, by + 1, withAlpha(RD_LAV, 0.4));

  // ─── LEFT ARM (extended outward in conjuring pose) ───────
  rect(ctx, 8 + lOff, by + 9, 3, 2, RD_ROBE_MD);
  rect(ctx, 8 + lOff, by + 9, 1, 2, RD_ROBE_LT);
  // Wisp at the fingertip — pale spell motif.
  px(ctx, 7 + lOff, by + 10, RD_PLLAV);

  // ─── FEET (swap with lOff/rOff per frame for walk anim) ──
  rect(ctx, 12 + lOff, by + 19, 3, 2, RD_ROBE_DK);
  px(ctx, 12 + lOff, by + 19, RD_ROBE_MD);
  rect(ctx, 17 + rOff, by + 19, 3, 2, RD_VOID);
  px(ctx, 19 + rOff, by + 19, RD_ROBE_DK);

  // ─── ORBITING SPARKLE (faint, atmospheric) ───────────────
  // Single floating pixel cycles position per frame.
  const sparkX = [9, 24, 22, 8][f];
  const sparkY = [yOff + 12, yOff + 9, yOff + 22, yOff + 17][f];
  px(ctx, sparkX, sparkY, RD_PLLAV);
}

function drawRaiderSheet(ctx: CanvasRenderingContext2D) {
  for (let f = 0; f < RD_FRAMES; f++) {
    drawRaiderFrame(ctx, f * RD_H, f);
  }
}

// ============================================================
// REACT COMPONENT — preview + download
// ============================================================

export default function MechCampaignSprites() {
  const wsRef = useRef<HTMLCanvasElement>(null);
  const wsPv = useRef<HTMLCanvasElement>(null);
  const spRef = useRef<HTMLCanvasElement>(null);
  const spPv = useRef<HTMLCanvasElement>(null);
  const gnRef = useRef<HTMLCanvasElement>(null);
  const gnPv = useRef<HTMLCanvasElement>(null);
  const rdRef = useRef<HTMLCanvasElement>(null);
  const rdPv = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ----- Workshop sheet (single 32×32 frame) -----
    const ws = wsRef.current!;
    ws.width = WS_W;
    ws.height = WS_H * WS_FRAMES;
    const wCtx = ws.getContext('2d')!;
    wCtx.imageSmoothingEnabled = false;
    drawWorkshopSheet(wCtx);

    const pv = wsPv.current!;
    const scale = 8;
    pv.width = WS_W * scale + 80;
    pv.height = WS_H * scale + 20;
    const pCtx = pv.getContext('2d')!;
    pCtx.imageSmoothingEnabled = false;
    pCtx.fillStyle = '#07050c';
    pCtx.fillRect(0, 0, pv.width, pv.height);
    pCtx.fillStyle = WS_LAV;
    pCtx.font = 'bold 11px monospace';
    pCtx.fillText('Workshop', 4, pv.height / 2 + 4);
    pCtx.save();
    pCtx.translate(80, 10);
    pCtx.scale(scale, scale);
    pCtx.drawImage(ws, 0, 0, WS_W, WS_H, 0, 0, WS_W, WS_H);
    pCtx.restore();
    pCtx.strokeStyle = '#1a1a2a';
    pCtx.strokeRect(80, 10, WS_W * scale, WS_H * scale);

    // ----- Suppression Pylon sheet (32×256, 8 frames stacked) -----
    const sp = spRef.current!;
    sp.width = SP_W;
    sp.height = SP_H * SP_FRAMES;
    const sCtx = sp.getContext('2d')!;
    sCtx.imageSmoothingEnabled = false;
    drawSuppressionPylonSheet(sCtx);

    const spv = spPv.current!;
    const spScale = 5;
    const labelH = 14;
    spv.width = SP_W * spScale + 110;
    spv.height = (SP_H * spScale + labelH) * SP_FRAMES + 10;
    const sPCtx = spv.getContext('2d')!;
    sPCtx.imageSmoothingEnabled = false;
    sPCtx.fillStyle = '#07050c';
    sPCtx.fillRect(0, 0, spv.width, spv.height);
    const frameLabels = ['Active 0', 'Active 1', 'Active 2', 'Active 3', 'Channel A', 'Channel B', 'Muted A', 'Muted B'];
    for (let i = 0; i < SP_FRAMES; i++) {
      const by = i * (SP_H * spScale + labelH) + 5;
      sPCtx.fillStyle = SP_HEART_BR;
      sPCtx.font = 'bold 10px monospace';
      sPCtx.fillText(`F${i} ${frameLabels[i]}`, 4, by + (SP_H * spScale) / 2 + 4);
      sPCtx.save();
      sPCtx.translate(110, by);
      sPCtx.scale(spScale, spScale);
      sPCtx.drawImage(sp, 0, i * SP_H, SP_W, SP_H, 0, 0, SP_W, SP_H);
      sPCtx.restore();
      sPCtx.strokeStyle = '#1a1a2a';
      sPCtx.strokeRect(110, by, SP_W * spScale, SP_H * spScale);
    }

    // ----- Generator sheet (32×128, 4 damage frames) -----
    const gn = gnRef.current!;
    gn.width = GN_W;
    gn.height = GN_H * GN_FRAMES;
    const gCtx = gn.getContext('2d')!;
    gCtx.imageSmoothingEnabled = false;
    drawGeneratorSheet(gCtx);

    const gpv = gnPv.current!;
    const gScale = 6;
    gpv.width = GN_W * gScale + 110;
    gpv.height = (GN_H * gScale + labelH) * GN_FRAMES + 10;
    const gPCtx = gpv.getContext('2d')!;
    gPCtx.imageSmoothingEnabled = false;
    gPCtx.fillStyle = '#07050c';
    gPCtx.fillRect(0, 0, gpv.width, gpv.height);
    const hpLabels = ['100% HP', '66% HP', '33% HP', '0% HP'];
    for (let i = 0; i < GN_FRAMES; i++) {
      const by = i * (GN_H * gScale + labelH) + 5;
      gPCtx.fillStyle = GN_BRASS_LT;
      gPCtx.font = 'bold 10px monospace';
      gPCtx.fillText(`F${i} ${hpLabels[i]}`, 4, by + (GN_H * gScale) / 2 + 4);
      gPCtx.save();
      gPCtx.translate(110, by);
      gPCtx.scale(gScale, gScale);
      gPCtx.drawImage(gn, 0, i * GN_H, GN_W, GN_H, 0, 0, GN_W, GN_H);
      gPCtx.restore();
      gPCtx.strokeStyle = '#1a1a2a';
      gPCtx.strokeRect(110, by, GN_W * gScale, GN_H * gScale);
    }

    // ----- Raider sheet (32×128, 4-frame walk cycle) -----
    const rd = rdRef.current!;
    rd.width = RD_W;
    rd.height = RD_H * RD_FRAMES;
    const rCtx = rd.getContext('2d')!;
    rCtx.imageSmoothingEnabled = false;
    drawRaiderSheet(rCtx);

    const rpv = rdPv.current!;
    const rScale = 6;
    rpv.width = RD_W * rScale + 110;
    rpv.height = (RD_H * rScale + labelH) * RD_FRAMES + 10;
    const rPCtx = rpv.getContext('2d')!;
    rPCtx.imageSmoothingEnabled = false;
    rPCtx.fillStyle = '#07050c';
    rPCtx.fillRect(0, 0, rpv.width, rpv.height);
    const walkLabels = ['Plant', 'L lead', 'Plant', 'R lead'];
    for (let i = 0; i < RD_FRAMES; i++) {
      const by = i * (RD_H * rScale + labelH) + 5;
      rPCtx.fillStyle = RD_LAV;
      rPCtx.font = 'bold 10px monospace';
      rPCtx.fillText(`F${i} ${walkLabels[i]}`, 4, by + (RD_H * rScale) / 2 + 4);
      rPCtx.save();
      rPCtx.translate(110, by);
      rPCtx.scale(rScale, rScale);
      rPCtx.drawImage(rd, 0, i * RD_H, RD_W, RD_H, 0, 0, RD_W, RD_H);
      rPCtx.restore();
      rPCtx.strokeStyle = '#1a1a2a';
      rPCtx.strokeRect(110, by, RD_W * rScale, RD_H * rScale);
    }

    setReady(true);
  }, []);

  const dl = (ref: React.RefObject<HTMLCanvasElement>, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ background: '#07050c', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: WS_LAV, margin: 0, fontSize: 15 }}>
          MECH CAMPAIGN — Workshop (Vael's Summoning Altar)
        </h2>
        {ready && (
          <button
            onClick={dl(wsRef as React.RefObject<HTMLCanvasElement>, 'struct_workshop.png')}
            style={{
              background: WS_VIOLET, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Workshop PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: WS_LAV, fontSize: 11, marginBottom: 4 }}>raw sheet (32×32)</div>
          <canvas
            ref={wsRef}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <div>
          <div style={{ color: WS_LAV, fontSize: 11, marginBottom: 4 }}>preview (8×)</div>
          <canvas
            ref={wsPv}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: SP_HEART_BR, margin: 0, fontSize: 15 }}>
          MECH CAMPAIGN — Suppression Pylon (Voss's Industrial Apparatus)
        </h2>
        {ready && (
          <button
            onClick={dl(spRef as React.RefObject<HTMLCanvasElement>, 'struct_suppression_pylon.png')}
            style={{
              background: SP_BRASS_MD, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Suppression Pylon PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <div>
          <div style={{ color: SP_HEART_BR, fontSize: 11, marginBottom: 4 }}>raw sheet (32×256, 8 frames)</div>
          <canvas
            ref={spRef}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <div>
          <div style={{ color: SP_HEART_BR, fontSize: 11, marginBottom: 4 }}>preview (5×)</div>
          <canvas
            ref={spPv}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: GN_BRASS_LT, margin: 0, fontSize: 15 }}>
          MECH CAMPAIGN — Generator (Voss's Power Cell)
        </h2>
        {ready && (
          <button
            onClick={dl(gnRef as React.RefObject<HTMLCanvasElement>, 'struct_generator.png')}
            style={{
              background: GN_ARC_MD, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Generator PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <div>
          <div style={{ color: GN_BRASS_LT, fontSize: 11, marginBottom: 4 }}>raw sheet (32×128, 4 frames)</div>
          <canvas
            ref={gnRef}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <div>
          <div style={{ color: GN_BRASS_LT, fontSize: 11, marginBottom: 4 }}>preview (6×)</div>
          <canvas
            ref={gnPv}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: RD_LAV, margin: 0, fontSize: 15 }}>
          MECH CAMPAIGN — Raider (Vael's Apprentice)
        </h2>
        {ready && (
          <button
            onClick={dl(rdRef as React.RefObject<HTMLCanvasElement>, 'raider.png')}
            style={{
              background: RD_ROBE_HI, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Raider PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <div>
          <div style={{ color: RD_LAV, fontSize: 11, marginBottom: 4 }}>raw sheet (32×128, 4 frames)</div>
          <canvas
            ref={rdRef}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <div>
          <div style={{ color: RD_LAV, fontSize: 11, marginBottom: 4 }}>preview (6×)</div>
          <canvas
            ref={rdPv}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
