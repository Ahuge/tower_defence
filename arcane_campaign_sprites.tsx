// @ts-nocheck
/**
 * arcane_campaign_sprites.tsx — one-off Arcane campaign sprites.
 *
 * Lives next to arcane_sprites.tsx and follows the same patterns (palette
 * import, draw helpers, default-export React component for the sprite-preview
 * pipeline). Reserved for assets that:
 *   - belong to a single mission / campaign moment (M10 finale today, future
 *     bosses / one-shot structures tomorrow), and
 *   - are NOT towers / projectiles / heroes (those go in arcane_sprites.tsx).
 *
 * Current contents:
 *   - Summoning Circle (M10 PRD 04) — "Polished Henge" variant. Octagonal
 *     stone dais, 6 chunky violet crystal pillars in a hex around the
 *     perimeter, radial floor spokes, central mana-well core, 10 charge
 *     animation frames. Sheet bakes to `assets/arena/struct_summoning_circle.png`.
 *   - Archmage Throne (M10 PRD 06) — "Cathedral Canopy" variant. 3×3
 *     destructible boss structure. Two flanking obelisks support a peaked
 *     stone canopy / baldachin spanning across the top, with the
 *     archmage seated within an architectural alcove on a tiered dais.
 *     5 damage frames (100/75/50/25/0% HP). Sheet bakes to
 *     `assets/arena/struct_arcane_archmage_throne.png`.
 */
import { useRef, useEffect, useState } from 'react';
import { C_base, C_tower } from './arcane_sprites';

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
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lerpHex(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexRgb(c1);
  const [r2, g2, b2] = hexRgb(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}
function fillPoly(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string, outline?: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + 0.5, pts[0][1] + 0.5);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + 0.5, pts[i][1] + 0.5);
  ctx.closePath();
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ===== PALETTE =====
// Stone shades and violet energy — pulled from arcane_sprites palette where
// possible so the circle matches the existing kit.
const SC_VOID         = C_base.VOID;        // #0a0016 — never used (transparent bg)
const SC_SHAD         = C_base.SHAD;        // #110022 — outline / deepest shadow
const SC_STONE_DK     = '#2a1f44';
const SC_STONE_MD     = C_base.DKVIO;       // #331166
const SC_STONE_LT     = C_base.MDVIO;       // #442288
const SC_STONE_HI     = '#5a4080';
const SC_VIOLET_DK    = C_base.DVIO;        // #220044
const SC_VIOLET_MD    = C_base.BRVIO;       // #6644ff
const SC_VIOLET_LT    = C_base.LTVIO;       // #9988ff
const SC_VIOLET_PL    = C_base.PLLAV;       // #eeccff
const SC_LAV          = C_base.LAV;         // #cc88ff
const SC_WHITE        = '#ffffff';

const SC_W = 56;
const SC_H = 56;
const SC_FRAMES = 10;

// ===== SHARED PILLAR OF LIGHT =====

function drawPillar(ctx: CanvasRenderingContext2D, charge: number, cx: number, topY: number, maxHeight: number) {
  if (charge < 0.5) return;
  const progress = (charge - 0.5) / 0.5;
  const pillarH = Math.floor(maxHeight * progress);
  const width = Math.max(1, Math.floor(progress * 6));
  const fullCharge = charge >= 0.95;
  const fadeFloor = fullCharge ? 0.7 : 0.5;
  for (let dy = 0; dy < pillarH; dy++) {
    const y = topY - dy;
    const intensity = 1.0 - (dy / Math.max(1, pillarH)) * (1.0 - fadeFloor);
    for (let dx = -width; dx <= width; dx++) {
      const t = Math.abs(dx) / Math.max(1, width);
      let color: string;
      if (t <= 0.33) {
        color = withAlpha(fullCharge ? SC_WHITE : SC_VIOLET_PL, intensity);
      } else if (t <= 0.66) {
        color = withAlpha(SC_VIOLET_PL, 0.86 * intensity);
      } else {
        color = withAlpha(SC_VIOLET_LT, 0.63 * intensity * (1 - t));
      }
      px(ctx, cx + dx, y, color);
    }
  }
}

// ============================================================
// SHARED HENGE BASE — used by all 3 variants below
// Octagonal stone dais + clockwise-lit hex of pillars at perimeter.
// ============================================================

/** Octagonal stone dais with 4 depth rings. Returns the dais radius for
 *  positioning pillars. */
function drawHengeDais(ctx: CanvasRenderingContext2D, cx: number, cy: number, daisR: number) {
  const ringPoly = (r: number, color: string, outline?: string) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      pts.push([Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]);
    }
    fillPoly(ctx, pts, color, outline);
  };
  ringPoly(daisR, SC_STONE_DK, SC_SHAD);
  ringPoly(daisR - 3, SC_STONE_MD);
  ringPoly(daisR - 6, SC_STONE_LT);
  ringPoly(daisR - 10, SC_STONE_HI);
}

/** A single chunky faceted pillar centered at px0,py0 with the given footprint
 *  (w wide × h tall). Reused by A1 and A3. */
function drawHengePillar(
  ctx: CanvasRenderingContext2D, px0: number, py0: number, w: number, h: number,
  lit: boolean, intensity: number,
) {
  const dk = lit ? lerpHex(SC_VIOLET_DK, SC_VIOLET_MD, intensity) : SC_STONE_DK;
  const md = lit ? lerpHex(SC_VIOLET_MD, SC_VIOLET_LT, intensity) : SC_STONE_MD;
  const lt = lit ? lerpHex(SC_VIOLET_LT, SC_VIOLET_PL, intensity) : SC_STONE_LT;
  const tip = lit ? lerpHex(SC_VIOLET_PL, SC_WHITE, intensity) : SC_STONE_HI;
  // Body — main rectangle
  rect(ctx, px0 - Math.floor(w / 2), py0 - h + 1, w, h, dk);
  // Left bright column (full height except top/bottom 1px)
  rect(ctx, px0 - Math.floor(w / 2), py0 - h + 2, 1, h - 2, md);
  // Center bright column for lit pillars
  if (w >= 3) rect(ctx, px0 - Math.floor(w / 2) + 1, py0 - h + 2, 1, h - 2, lt);
  // Right shadow column (already dk by default)
  // Crystalline pointed tip
  px(ctx, px0, py0 - h, tip);
  px(ctx, px0 - 1, py0 - h + 1, md);
  px(ctx, px0 + 1, py0 - h + 1, dk);
  // Faceted band at mid-height
  const bandY = py0 - Math.floor(h / 2);
  for (let dx = -Math.floor(w / 2); dx < Math.ceil(w / 2); dx++) {
    px(ctx, px0 + dx, bandY, dx === -Math.floor(w / 2) ? md : dx === Math.ceil(w / 2) - 1 ? SC_SHAD : dk);
  }
  // Base shadow
  px(ctx, px0 - Math.floor(w / 2) - 1, py0, SC_SHAD);
  px(ctx, px0 + Math.ceil(w / 2), py0, SC_SHAD);
  // Glow sparkle when fully lit
  if (lit && intensity > 0.6) {
    px(ctx, px0, py0 - h - 1, SC_VIOLET_PL);
  }
}

// ============================================================
// VARIANT A1 — "POLISHED HENGE"
// Original A's hex layout, but with chunkier 4-wide pillars, radial
// floor spokes connecting center → each pillar (engraved runes), and
// brighter inter-pillar arc sparkles.
// ============================================================

function drawSC_A1(ctx: CanvasRenderingContext2D, ox: number, oy: number, frameIdx: number) {
  const cx = ox + SC_W / 2;
  const cy = oy + SC_H / 2 + 4;
  const charge = frameIdx / (SC_FRAMES - 1);
  const daisR = 17;

  drawHengeDais(ctx, cx, cy, daisR);

  // Radial floor spokes (engraved rune lines from center to each pillar)
  const PILLAR_COUNT = 6;
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const ang = (i * Math.PI * 2) / PILLAR_COUNT - Math.PI / 2;
    const litThreshold = i / PILLAR_COUNT;
    const lit = charge > litThreshold * 0.85;
    const intensity = lit ? Math.min(1, (charge - litThreshold * 0.85) / 0.18) : 0;
    const spokeCol = lit ? lerpHex(SC_VIOLET_DK, SC_VIOLET_LT, intensity) : SC_STONE_DK;
    // Spoke as 4 dim pixels along the radial line
    for (let r = 3; r < daisR - 3; r += 2) {
      const sx = Math.round(cx + Math.cos(ang) * r);
      const sy = Math.round(cy + Math.sin(ang) * r);
      px(ctx, sx, sy, spokeCol);
    }
  }

  // Six chunky pillars in hex
  for (let i = 0; i < PILLAR_COUNT; i++) {
    const ang = (i * Math.PI * 2) / PILLAR_COUNT - Math.PI / 2;
    const baseR = daisR - 2;
    const px0 = Math.round(cx + Math.cos(ang) * baseR);
    const py0 = Math.round(cy + Math.sin(ang) * baseR);
    const litThreshold = i / PILLAR_COUNT;
    const lit = charge > litThreshold * 0.85;
    const intensity = lit ? Math.min(1, (charge - litThreshold * 0.85) / 0.18) : 0;
    drawHengePillar(ctx, px0, py0, 4, 9, lit, intensity);
  }

  // Central runic mana well — small octahedron core that grows with charge
  drawHengeCore(ctx, cx, cy, charge);

  // Inter-pillar arc sparkles
  if (charge >= 0.75) {
    const arcs = Math.floor((charge - 0.75) / 0.025);
    for (let i = 0; i < PILLAR_COUNT && i < arcs; i++) {
      const a1 = (i * Math.PI * 2) / PILLAR_COUNT - Math.PI / 2;
      const a2 = ((i + 1) * Math.PI * 2) / PILLAR_COUNT - Math.PI / 2;
      const r = daisR + 1;
      const mx = Math.round((cx + Math.cos(a1) * r + cx + Math.cos(a2) * r) / 2);
      const my = Math.round((cy + Math.sin(a1) * r + cy + Math.sin(a2) * r) / 2);
      px(ctx, mx, my, SC_VIOLET_PL);
      if (charge >= 0.92) {
        px(ctx, mx, my - 1, SC_WHITE);
        px(ctx, mx - 1, my, SC_VIOLET_LT);
        px(ctx, mx + 1, my, SC_VIOLET_LT);
      }
    }
  }

  drawPillar(ctx, charge, cx, cy - 14, 32);
}

/** Central mana-well core shared by A1/A2/A3. */
function drawHengeCore(ctx: CanvasRenderingContext2D, cx: number, cy: number, charge: number) {
  if (charge >= 0.4) {
    const coreSize = Math.floor(2 + charge * 2);
    const corePts: [number, number][] = [
      [cx, cy - coreSize], [cx + coreSize, cy], [cx, cy + coreSize], [cx - coreSize, cy],
    ];
    const t = Math.min(1, (charge - 0.4) / 0.6);
    fillPoly(ctx, corePts, lerpHex(SC_VIOLET_MD, SC_WHITE, t), lerpHex(SC_VIOLET_DK, SC_VIOLET_LT, t));
    if (charge >= 0.7) px(ctx, cx, cy, SC_WHITE);
    if (charge >= 0.95) {
      px(ctx, cx - 1, cy, SC_VIOLET_PL);
      px(ctx, cx + 1, cy, SC_VIOLET_PL);
      px(ctx, cx, cy - 1, SC_VIOLET_PL);
      px(ctx, cx, cy + 1, SC_VIOLET_PL);
    }
  } else {
    px(ctx, cx, cy - 1, SC_STONE_DK);
    px(ctx, cx, cy + 1, SC_STONE_DK);
    px(ctx, cx - 1, cy, SC_STONE_DK);
    px(ctx, cx + 1, cy, SC_STONE_DK);
  }
}

// ============================================================
// ARCHMAGE THRONE (M10 PRD 06) — destructible boss structure
// 84×84 per frame × 5 damage states stacked vertically (84×420 sheet).
// Frame 0 = pristine 100% HP, frame 4 = pre-collapse 0% HP.
// CURRENTLY IN COMPARE MODE — three variant silhouettes side-by-side.
// ============================================================

const TH_W = 84;
const TH_H = 84;
const TH_FRAMES = 5;

// Throne-specific palette (deeper than circle/conduit so it reads as more
// authoritative — matches PRD 06 spec).
const TH_STONE_DK   = '#2a1d3f';
const TH_STONE_MD   = '#4a3870';
const TH_STONE_LT   = '#6e5a98';
const TH_STONE_HI   = '#9a82c0';   // bright top-edge highlight (3D)
const TH_GOLD_DK    = '#a87830';
const TH_GOLD_MD    = '#d8a040';
const TH_GOLD_HI    = '#f8d068';
const TH_ROBE_DK    = '#4a2070';
const TH_ROBE_MD    = '#7040a0';
const TH_ROBE_HI    = '#a070d0';
const TH_HALO_CORE  = '#ffe8a0';
const TH_HALO_MID   = '#ffd060';
const TH_OUTLINE    = '#0e0820';

// Damage progression: how broken the throne is at frame f∈[0..4]. Returns
// 0 (pristine) → 1 (destroyed). Used to mute colors, hide elements.
function damageT(frameIdx: number): number {
  return frameIdx / (TH_FRAMES - 1);
}

// Halo brightness multiplier per frame: 1.0 / 0.85 / 0.5 / 0.2 / 0
const TH_HALO_LEVEL = [1.0, 0.85, 0.5, 0.2, 0.0];

// Helper: filled circle fill (used for halos, dais discs)
function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// ============================================================
// SHARED THRONE HELPERS
// ============================================================

/** Beefy obelisk — 6 wide × variable tall. Faceted 3D stone with crystal
 *  cap and gold base. Light source upper-left: left column bright, right
 *  column shadow + outline. */
function drawBeefyObelisk(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, h: number,
  dmg: number, fractureFrac: number,
) {
  const W = 6;
  const dmgFracture = dmg >= fractureFrac;
  const dmgBroken = dmg >= 0.85;
  const cropTop = dmgBroken ? Math.floor(h * 0.4) : 0;
  const sFill = dmg < 0.6 ? TH_STONE_DK : '#1a1228';
  const sHi   = dmg < 0.3 ? TH_STONE_HI : TH_STONE_LT;
  const sLt   = dmg < 0.5 ? TH_STONE_LT : TH_STONE_MD;
  const sMd   = TH_STONE_MD;
  // 3D body
  rect(ctx, sx, sy + cropTop, W, h - cropTop, sFill);
  // Top edge highlight (across the top of the body)
  rect(ctx, sx, sy + cropTop, W, 1, sMd);
  rect(ctx, sx + 1, sy + cropTop, W - 2, 1, sHi);
  // Left-face highlight column (light source upper-left)
  rect(ctx, sx, sy + cropTop + 1, 1, h - cropTop - 1, sMd);
  rect(ctx, sx + 1, sy + cropTop + 1, 1, h - cropTop - 2, sHi);
  // Inner mid-tone column
  rect(ctx, sx + 2, sy + cropTop + 1, W - 4, h - cropTop - 2, sLt);
  // Right shadow column + outline
  rect(ctx, sx + W - 2, sy + cropTop + 1, 1, h - cropTop - 1, sFill);
  rect(ctx, sx + W - 1, sy + cropTop, 1, h - cropTop, TH_OUTLINE);
  // Bottom outline
  rect(ctx, sx, sy + h - 1, W, 1, TH_OUTLINE);

  // Pointed crystal cap (faceted diamond, 3D-shaded)
  if (!dmgBroken) {
    const capY = sy - 5;
    if (!dmgFracture) {
      // Bright tip
      px(ctx, sx + 2, capY, TH_HALO_CORE);
      px(ctx, sx + 3, capY, C_base.PLLAV);
      // Upper-left bright facet
      px(ctx, sx + 1, capY + 1, C_base.PLLAV);
      px(ctx, sx + 2, capY + 1, TH_HALO_CORE);
      px(ctx, sx + 3, capY + 1, C_base.LTVIO);
      px(ctx, sx + 4, capY + 1, C_base.MDVIO);
      // Mid band
      px(ctx, sx + 1, capY + 2, C_base.MDVIO);
      px(ctx, sx + 2, capY + 2, C_base.LTVIO);
      px(ctx, sx + 3, capY + 2, C_base.MDVIO);
      px(ctx, sx + 4, capY + 2, C_base.DVIO);
      // Base (sits on obelisk top)
      rect(ctx, sx + 1, capY + 3, 4, 2, C_base.DKVIO);
      px(ctx, sx + 1, capY + 3, C_base.MDVIO);
      px(ctx, sx, capY + 3, TH_OUTLINE);
      px(ctx, sx + 5, capY + 3, TH_OUTLINE);
      // Cap highlight glow above tip
      px(ctx, sx + 2, capY - 1, C_base.PLLAV);
      px(ctx, sx + 3, capY - 1, C_base.LTVIO);
    } else {
      // Cracked / dim cap
      rect(ctx, sx + 1, capY + 1, 4, 4, TH_STONE_DK);
      rect(ctx, sx + 2, capY + 1, 2, 1, TH_STONE_MD);
      px(ctx, sx + 5, capY + 1, TH_OUTLINE);
      px(ctx, sx + 5, capY + 2, TH_OUTLINE);
    }
  }
  // Embedded crystal accents — 4 small diamonds down the front face
  const accentYs = [sy + 6, sy + 14, sy + 22, sy + 30];
  accentYs.forEach((cy, i) => {
    if (cy < sy + cropTop) return;
    const broken = dmg >= 0.35 + i * 0.13;
    if (!broken) {
      // Top tip / left bright / mid / right shadow
      px(ctx, sx + 2, cy - 1, dmg < 0.3 ? C_base.PLLAV : C_base.LTVIO);
      px(ctx, sx + 1, cy, C_base.MDVIO);
      px(ctx, sx + 2, cy, dmg < 0.3 ? TH_HALO_CORE : C_base.PLLAV);
      px(ctx, sx + 3, cy, dmg < 0.3 ? C_base.LTVIO : C_base.MDVIO);
      px(ctx, sx + 2, cy + 1, C_base.DKVIO);
    } else {
      px(ctx, sx + 2, cy, TH_OUTLINE);
      px(ctx, sx + 1, cy, TH_STONE_DK);
      px(ctx, sx + 3, cy, TH_STONE_DK);
    }
  });
  // Horizontal facet bands — gold-rimmed rune carvings at thirds
  for (const bandY of [sy + 10, sy + 18, sy + 26]) {
    if (bandY < sy + cropTop) continue;
    rect(ctx, sx, bandY, W, 1, TH_OUTLINE);
    rect(ctx, sx + 1, bandY, W - 2, 1, dmg < 0.5 ? TH_GOLD_MD : TH_GOLD_DK);
    rect(ctx, sx + 2, bandY, W - 4, 1, dmg < 0.5 ? TH_GOLD_HI : TH_GOLD_MD);
  }
  // Gold band base — bevelled
  goldBand(ctx, sx - 1, sy + h - 4, W + 2, 3, dmg >= 0.7);
  rect(ctx, sx - 1, sy + h - 1, W + 2, 1, TH_OUTLINE);

  // Big fracture cracks
  if (dmgFracture && !dmgBroken) {
    rect(ctx, sx, sy + Math.floor(h * 0.55), W, 1, TH_OUTLINE);
    px(ctx, sx + 2, sy + Math.floor(h * 0.7), TH_OUTLINE);
    px(ctx, sx + 3, sy + Math.floor(h * 0.6), TH_OUTLINE);
  }
  if (dmgBroken) {
    px(ctx, sx + 1, sy + cropTop, TH_OUTLINE);
    px(ctx, sx + 3, sy + cropTop - 1, TH_OUTLINE);
    px(ctx, sx + 4, sy + cropTop, TH_OUTLINE);
  }
}

/** Generic seated archmage figure with hood, robe, halo. Size scales via
 *  the `scale` param (1 = compact, 1.4 = bulked). Returns the head Y
 *  position for halo placement. */
function drawArchmage(
  ctx: CanvasRenderingContext2D, mX: number, mY: number, scale: number,
  frameIdx: number, opts: { armrests?: boolean } = {},
): { headY: number } {
  const dmg = damageT(frameIdx);
  const robeH = Math.floor(14 * scale);
  const robeWBase = Math.floor(6 * scale);
  const robeDk = dmg < 0.85 ? TH_ROBE_DK : TH_STONE_DK;
  const robeMd = dmg < 0.6 ? TH_ROBE_MD : TH_ROBE_DK;
  const robeHi = dmg < 0.3 ? TH_ROBE_HI : TH_ROBE_MD;

  if (dmg >= 1.0) return { headY: mY - Math.floor(4 * scale) };

  // Trapezoidal robe (wider at bottom)
  for (let i = 0; i < robeH; i++) {
    const w = Math.round(robeWBase + i * 0.6 * scale);
    rect(ctx, mX - Math.floor(w / 2), mY + i, w, 1,
      i < robeH * 0.3 ? robeDk : i < robeH * 0.65 ? robeMd : robeHi);
  }
  // Robe outline
  for (let i = 0; i < robeH; i++) {
    const w = Math.round(robeWBase + i * 0.6 * scale);
    px(ctx, mX - Math.floor(w / 2), mY + i, TH_OUTLINE);
    px(ctx, mX - Math.floor(w / 2) + w - 1, mY + i, TH_OUTLINE);
  }
  // Robe sash (gold center stripe)
  if (dmg < 0.7 && scale > 1.1) {
    rect(ctx, mX - 1, mY + Math.floor(robeH * 0.3), 2, Math.floor(robeH * 0.5), TH_GOLD_MD);
    px(ctx, mX, mY + Math.floor(robeH * 0.3), TH_GOLD_HI);
  }
  // Hands clasped
  if (dmg < 0.85) {
    const handY = mY + Math.floor(robeH * 0.5);
    px(ctx, mX - 1, handY, TH_GOLD_HI);
    px(ctx, mX, handY, TH_GOLD_MD);
    px(ctx, mX + 1, handY, TH_GOLD_HI);
    if (scale > 1.1) px(ctx, mX, handY + 1, TH_GOLD_MD);
  }
  // Armrests (T1a-only flag)
  if (opts.armrests && dmg < 0.85) {
    const armY = mY + Math.floor(robeH * 0.4);
    const armW = Math.floor(robeWBase * 0.7);
    // Left armrest
    rect(ctx, mX - Math.floor(robeWBase / 2) - armW, armY, armW, 2, TH_STONE_DK);
    rect(ctx, mX - Math.floor(robeWBase / 2) - armW, armY, armW, 1, dmg < 0.5 ? TH_GOLD_MD : TH_GOLD_DK);
    px(ctx, mX - Math.floor(robeWBase / 2) - armW, armY + 1, TH_OUTLINE);
    // Right armrest
    rect(ctx, mX + Math.ceil(robeWBase / 2), armY, armW, 2, TH_STONE_DK);
    rect(ctx, mX + Math.ceil(robeWBase / 2), armY, armW, 1, dmg < 0.5 ? TH_GOLD_MD : TH_GOLD_DK);
    px(ctx, mX + Math.ceil(robeWBase / 2) + armW - 1, armY + 1, TH_OUTLINE);
  }

  // Hood/head
  const headW = Math.floor(8 * scale);
  const headH = Math.floor(5 * scale);
  const hY = mY - headH + 1;
  const headY = hY;
  if (dmg < 0.85) {
    rect(ctx, mX - Math.floor(headW / 2), hY, headW, headH, robeDk);
    rect(ctx, mX - Math.floor(headW / 2) + 1, hY + 1, headW - 2, headH - 2, robeMd);
    // Hood point
    px(ctx, mX, hY - 1, robeMd);
    px(ctx, mX - 1, hY, robeMd);
    px(ctx, mX + 1, hY, robeMd);
    // Outline (top)
    px(ctx, mX - Math.floor(headW / 2), hY, TH_OUTLINE);
    px(ctx, mX + Math.floor(headW / 2) - (headW % 2 ? 0 : 1), hY, TH_OUTLINE);
    // Face void
    rect(ctx, mX - Math.floor((headW - 4) / 2), hY + 2, headW - 4, Math.max(2, headH - 3), '#0a0010');
    // Glowing eyes
    if (dmg < 0.5) {
      px(ctx, mX - 1, hY + 2, TH_HALO_MID);
      px(ctx, mX + 1, hY + 2, TH_HALO_MID);
    } else if (dmg < 0.85) {
      px(ctx, mX - 1, hY + 2, TH_ROBE_HI);
      px(ctx, mX + 1, hY + 2, TH_ROBE_HI);
    }
  } else {
    // Dissolving wisps
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 3 + (i % 2);
      px(ctx, Math.round(mX + Math.cos(a) * r), Math.round(hY + 2 + Math.sin(a) * r), C_base.MDVIO);
    }
  }

  // Halo
  const haloLevel = TH_HALO_LEVEL[frameIdx];
  if (haloLevel > 0) {
    const haloR = Math.floor((7 * scale) * (0.6 + 0.4 * haloLevel));
    const haloCx = mX, haloCy = hY - Math.floor(3 * scale);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI - Math.PI;
      const x = Math.round(haloCx + Math.cos(a) * haloR);
      const y = Math.round(haloCy + Math.sin(a) * haloR);
      const col = haloLevel > 0.7 ? TH_HALO_CORE : haloLevel > 0.3 ? TH_HALO_MID : TH_GOLD_DK;
      px(ctx, x, y, col);
    }
    if (haloLevel > 0.5) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI - Math.PI;
        const x = Math.round(haloCx + Math.cos(a) * (haloR - 2));
        const y = Math.round(haloCy + Math.sin(a) * (haloR - 2));
        px(ctx, x, y, withAlpha(TH_HALO_MID, 0.6));
      }
    }
  }

  return { headY };
}

/** 3D stone block — establishes a clear light direction from upper-left.
 *  Bright top edge + left highlight column, dark right shadow + bottom outline.
 *  Used by every variant's tier/throne-back/canopy elements for consistent
 *  3D depth. Returns the inner rect bounds for further detailing. */
function block3D(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  shades: { dk: string; md: string; lt: string; hi: string },
  outline = TH_OUTLINE,
) {
  // Body fill
  rect(ctx, x, y, w, h, shades.dk);
  // Top face — brightest stripe
  rect(ctx, x, y, w, 1, shades.md);
  rect(ctx, x + 1, y, w - 2, 1, shades.hi);
  // Left highlight column (1px from upper-left light source)
  rect(ctx, x, y + 1, 1, h - 1, shades.md);
  // Inner mid-tone fill
  rect(ctx, x + 1, y + 1, w - 2, h - 2, shades.md);
  rect(ctx, x + 2, y + 1, w - 4, 1, shades.lt);
  // Right shadow column
  rect(ctx, x + w - 1, y + 1, 1, h - 2, outline);
  rect(ctx, x + w - 2, y + 2, 1, h - 3, shades.dk);
  // Bottom shadow
  rect(ctx, x + 1, y + h - 1, w - 1, 1, outline);
  rect(ctx, x + 1, y + h - 2, w - 2, 1, shades.dk);
}

/** Bevelled gold trim band — bright top, mid body, dark bottom. */
function goldBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dim = false) {
  if (h < 1) return;
  const top = dim ? TH_GOLD_MD : TH_GOLD_HI;
  const mid = dim ? TH_GOLD_DK : TH_GOLD_MD;
  const bot = dim ? '#7a5820' : TH_GOLD_DK;
  rect(ctx, x, y, w, h, mid);
  rect(ctx, x, y, w, 1, top);
  if (h > 1) rect(ctx, x, y + h - 1, w, 1, bot);
  if (w > 2 && h > 1) rect(ctx, x + 1, y + 1, 1, h - 2, top);
  if (w > 2 && h > 1) rect(ctx, x + w - 1, y + 1, 1, h - 2, bot);
}

/** Faceted crystal — top tip, bright upper face, mid body, shadow bottom.
 *  Establishes 3D reading on every diamond/crystal with a clear light dir. */
function crystal3D(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number, dim = 0,
) {
  // Use damage `dim` 0..1 to mute colors (fully bright at 0, washed at 0.6+)
  const tip = dim < 0.3 ? TH_HALO_CORE : dim < 0.6 ? C_base.PLLAV : C_base.LTVIO;
  const hi = dim < 0.3 ? C_base.PLLAV : dim < 0.6 ? C_base.LTVIO : C_base.MDVIO;
  const md = dim < 0.3 ? C_base.LTVIO : dim < 0.6 ? C_base.MDVIO : C_base.BRVIO;
  const dk = dim < 0.3 ? C_base.MDVIO : C_base.DKVIO;
  // Filled diamond + 3D facet shading
  for (let i = 0; i < half * 2 + 1; i++) {
    const hw = i <= half ? i : 2 * half - i;
    if (hw < 0) continue;
    const yy = cy - half + i;
    // Body
    rect(ctx, cx - hw, yy, hw * 2 + 1, 1,
      i < half * 0.4 ? hi : i < half * 0.9 ? md : dk);
    // Bright left facet (the 3D-ness)
    if (hw >= 1) px(ctx, cx - hw, yy, i < half ? tip : md);
    // Right shadow facet
    if (hw >= 1) px(ctx, cx + hw, yy, dk);
  }
  // Top apex highlight
  px(ctx, cx, cy - half, tip);
  // Bottom outline
  px(ctx, cx, cy + half, TH_OUTLINE);
}

/** Generic embers VFX overlay for frames 3+. */
function drawThroneEmbers(
  ctx: CanvasRenderingContext2D, ox: number, cyBottom: number,
  dmg: number, count: number,
) {
  if (dmg < 0.5) return;
  const emberCount = Math.floor((dmg - 0.5) * count);
  for (let i = 0; i < emberCount; i++) {
    const ex = ox + 14 + ((i * 13) % (TH_W - 28));
    const ey = cyBottom - 14 - ((i * 7) % 32);
    px(ctx, ex, ey, i % 3 === 0 ? '#ff8844' : i % 2 === 0 ? '#cc4422' : '#883311');
  }
}

// ============================================================
// VARIANT T1a — "BULKED THRONE"
// Same composition as the original T1 but every element scaled up:
// chunkier 6-wide obelisks (38 tall), wider throne back with peaked
// pediment cap, bigger archmage figure with armrests, 4-tier dais.
// ============================================================

// stripped T1a
function drawThrone_T1b(ctx: CanvasRenderingContext2D, ox: number, oy: number, frameIdx: number) {
  const cx = ox + TH_W / 2;
  const cyBottom = oy + TH_H - 2;
  const dmg = damageT(frameIdx);

  // ===== Single-tier wide stone dais (3D) =====
  block3D(ctx, ox + 4, cyBottom - 6, TH_W - 8, 6, {
    dk: TH_STONE_DK, md: TH_STONE_MD, lt: TH_STONE_LT, hi: TH_STONE_HI,
  });
  goldBand(ctx, ox + 4, cyBottom - 6, TH_W - 8, 1, dmg >= 0.5);
  // Raised step on top of the wide dais (3D)
  block3D(ctx, ox + 16, cyBottom - 10, TH_W - 32, 4, {
    dk: TH_STONE_DK, md: TH_STONE_MD, lt: TH_STONE_LT, hi: TH_STONE_HI,
  });
  goldBand(ctx, ox + 16, cyBottom - 10, TH_W - 32, 1, dmg >= 0.5);
  // Damage
  if (dmg >= 0.5) {
    rect(ctx, ox + 24, cyBottom - 6, 1, 6, TH_OUTLINE);
    rect(ctx, ox + 56, cyBottom - 6, 1, 6, TH_OUTLINE);
  }
  if (dmg >= 0.75) {
    rect(ctx, ox + 30, cyBottom - 10, 6, 1, TH_OUTLINE);
    rect(ctx, ox + 44, cyBottom - 10, 1, 4, TH_OUTLINE);
  }

  // ===== Beefy flanking obelisks (taller — they support the canopy) =====
  // Right obelisk fractures earlier so frame 3 has more visible decay.
  drawBeefyObelisk(ctx, ox + 8,  cyBottom - 56, 46, dmg, 0.35);
  drawBeefyObelisk(ctx, ox + 70, cyBottom - 56, 46, dmg >= 0.75 ? Math.max(dmg, 0.86) : dmg, 0.5);

  // ===== Peaked CANOPY connecting the obelisks (CENTERED on cx) =====
  // Lintel base — symmetric around cx (ox + TH_W/2). 60px wide spans from
  // ox+12 (left obelisk top) to ox+72 (right obelisk top).
  const canopyY = cyBottom - 58;
  const lintelW = 60;
  const lintelX = cx - lintelW / 2;
  const peakH = 14;
  const partial = dmg >= 0.7 && dmg < 0.85;   // intermediate destruction (frame 3)
  const collapsed = dmg >= 0.85;               // full collapse (frame 4)

  if (!collapsed) {
    // Lintel
    if (partial) {
      // Partial lintel — chunk knocked out of right side, sagging hangers
      const breakX = lintelX + Math.floor(lintelW * 0.62);
      // Left section intact
      rect(ctx, lintelX, canopyY, breakX - lintelX, 4, TH_STONE_DK);
      rect(ctx, lintelX, canopyY, breakX - lintelX, 1, TH_GOLD_DK);
      rect(ctx, lintelX + 1, canopyY, breakX - lintelX - 2, 1, TH_GOLD_MD);
      rect(ctx, lintelX, canopyY + 3, breakX - lintelX, 1, TH_OUTLINE);
      // Jagged break edge
      px(ctx, breakX, canopyY + 1, TH_OUTLINE);
      px(ctx, breakX + 1, canopyY + 2, TH_OUTLINE);
      px(ctx, breakX, canopyY + 3, TH_OUTLINE);
      // Right stub still attached to right obelisk
      const stubX = lintelX + lintelW - 8;
      rect(ctx, stubX, canopyY, 8, 4, TH_STONE_DK);
      rect(ctx, stubX, canopyY, 8, 1, TH_GOLD_DK);
      rect(ctx, stubX, canopyY + 3, 8, 1, TH_OUTLINE);
      px(ctx, stubX - 1, canopyY + 1, TH_OUTLINE);
      px(ctx, stubX - 1, canopyY + 2, TH_OUTLINE);
      // Falling debris in the gap
      px(ctx, breakX + 3, canopyY + 6, TH_STONE_MD);
      px(ctx, breakX + 5, canopyY + 8, TH_STONE_DK);
      px(ctx, breakX + 4, canopyY + 11, TH_STONE_DK);
    } else {
      // Intact lintel
      rect(ctx, lintelX, canopyY, lintelW, 4, TH_STONE_DK);
      rect(ctx, lintelX, canopyY, lintelW, 1, TH_GOLD_DK);
      rect(ctx, lintelX + 1, canopyY, lintelW - 2, 1, dmg < 0.5 ? TH_GOLD_HI : TH_GOLD_MD);
      rect(ctx, lintelX, canopyY + 3, lintelW, 1, TH_OUTLINE);
    }

    // Peaked roof above — centered on cx, shrinking symmetrically.
    // At partial damage state, the right half of the roof is missing.
    for (let i = 0; i < peakH; i++) {
      const w = lintelW - i * 2;
      if (w <= 0) break;
      const sxx = cx - Math.floor(w / 2);
      const y = canopyY - i - 1;
      if (partial) {
        // Only render the LEFT half (right half collapsed)
        const halfW = Math.floor(w / 2);
        rect(ctx, sxx, y, halfW, 1, i < 2 ? TH_STONE_DK : i < 6 ? TH_STONE_MD : TH_STONE_LT);
        px(ctx, sxx, y, TH_OUTLINE);
        // Jagged break edge along the centerline
        if (i < peakH - 2) {
          px(ctx, sxx + halfW - 1, y, TH_OUTLINE);
          if (i % 2 === 0) px(ctx, sxx + halfW, y, TH_STONE_DK);
        }
      } else {
        rect(ctx, sxx, y, w, 1, i < 2 ? TH_STONE_DK : i < 6 ? TH_STONE_MD : TH_STONE_LT);
        // Top edge highlight (3D: bright ridge)
        if (w > 2) {
          px(ctx, sxx + 1, y, i < 2 ? TH_STONE_MD : i < 6 ? TH_STONE_LT : TH_STONE_HI);
        }
        px(ctx, sxx, y, TH_OUTLINE);
        px(ctx, sxx + w - 1, y, TH_OUTLINE);
      }
    }

    // Roof apex finial (gold + small crystal) — only on intact roof
    if (!partial && dmg < 0.7) {
      px(ctx, cx, canopyY - peakH - 1, dmg < 0.3 ? TH_HALO_CORE : TH_GOLD_HI);
      px(ctx, cx, canopyY - peakH - 2, dmg < 0.3 ? C_base.PLLAV : TH_GOLD_MD);
      px(ctx, cx - 1, canopyY - peakH - 1, TH_GOLD_DK);
      px(ctx, cx + 1, canopyY - peakH - 1, TH_GOLD_DK);
    }
    // Decorative roof crystals (3 along the slope, both sides)
    [3, 6, 9].forEach((iy, j) => {
      const broken = dmg >= 0.45 + j * 0.13;
      const w = lintelW - iy * 2;
      const sxxL = cx - Math.floor(w / 2) + 2;
      const sxxR = cx + Math.floor(w / 2) - 3;
      const yy = canopyY - iy - 1;
      // In partial damage, right-side crystals all gone (right half collapsed)
      if (!broken) {
        px(ctx, sxxL, yy, dmg < 0.25 ? C_base.LTVIO : C_base.MDVIO);
        if (!partial) {
          px(ctx, sxxR, yy, dmg < 0.25 ? C_base.LTVIO : C_base.MDVIO);
        }
      }
    });
  } else {
    // Frame 4 — full collapse. Both obelisks have stumps; lintel gone;
    // debris scattered across the dais.
    px(ctx, lintelX + 2, canopyY, TH_OUTLINE);
    px(ctx, lintelX + lintelW - 3, canopyY, TH_OUTLINE);
    rect(ctx, ox + 22, cyBottom - 12, 5, 2, TH_STONE_DK);
    rect(ctx, ox + 22, cyBottom - 12, 5, 1, TH_STONE_MD);
    rect(ctx, ox + 38, cyBottom - 11, 6, 1, TH_STONE_DK);
    rect(ctx, ox + 50, cyBottom - 13, 4, 2, TH_STONE_DK);
    rect(ctx, ox + 50, cyBottom - 13, 4, 1, TH_STONE_MD);
    px(ctx, ox + 32, cyBottom - 14, TH_OUTLINE);
    px(ctx, ox + 56, cyBottom - 15, TH_OUTLINE);
  }

  // ===== Throne back (within canopy alcove) — 3D =====
  // dmg < 0.7: full throne back. dmg 0.7..0.85: top half cracked off
  // (frame 3 partial-destruction state). dmg >= 0.85: gone entirely.
  if (dmg < 0.85) {
    const tbX = ox + 28, tbY = cyBottom - 38, tbW = 28, tbH = 28;
    const heavyDmg = dmg >= 0.7;
    if (heavyDmg) {
      // Cropped throne back — top 12px gone, jagged break edge
      const cropY = tbY + 12;
      block3D(ctx, tbX, cropY, tbW, tbH - 12, {
        dk: TH_STONE_DK, md: TH_STONE_MD, lt: TH_STONE_LT, hi: TH_STONE_HI,
      });
      goldBand(ctx, tbX, cropY, 2, tbH - 12, true);
      goldBand(ctx, tbX + tbW - 2, cropY, 2, tbH - 12, true);
      // Jagged top edge of the broken stub
      for (let x = 0; x < tbW; x++) {
        if ((x + tbY) % 3 === 0) px(ctx, tbX + x, cropY - 1, TH_STONE_DK);
        if ((x * 2 + tbY) % 5 === 0) px(ctx, tbX + x, cropY, TH_OUTLINE);
      }
      // Cracks running down the stub
      rect(ctx, tbX + 6, cropY, 1, tbH - 12, TH_OUTLINE);
      rect(ctx, tbX + tbW - 8, cropY + 2, 1, tbH - 14, TH_OUTLINE);
      // No crystal (it shattered with the top)
    } else {
      block3D(ctx, tbX, tbY, tbW, tbH, {
        dk: TH_STONE_DK, md: TH_STONE_MD, lt: TH_STONE_LT, hi: TH_STONE_HI,
      });
      goldBand(ctx, tbX, tbY, 2, tbH, dmg >= 0.5);
      goldBand(ctx, tbX + tbW - 2, tbY, 2, tbH, dmg >= 0.5);
      // Throne crystal — 3D-faceted
      if (dmg < 0.6) {
        const cgX = tbX + tbW / 2, cgY = tbY + 9;
        crystal3D(ctx, cgX, cgY, 3, dmg);
      }
      // Damage cracks
      if (dmg >= 0.5) rect(ctx, tbX + 4, tbY + 4, 1, 14, TH_OUTLINE);
    }
  }

  // ===== Mage (medium) =====
  drawArchmage(ctx, cx, cyBottom - 28, 1.2, frameIdx);

  // Frame 0 atmosphere — magic light pouring from canopy peak
  if (frameIdx === 0) {
    for (let i = 0; i < 5; i++) px(ctx, cx, cyBottom - 70 - i, TH_HALO_CORE);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      px(ctx, Math.round(cx + Math.cos(a + Math.PI) * 28), Math.round(cyBottom - 55 + Math.sin(a + Math.PI) * 20),
        i % 2 ? C_base.LAV : C_base.PLLAV);
    }
  }

  drawThroneEmbers(ctx, ox, cyBottom, dmg, 16);
}

// ============================================================
// VARIANT T1c — "STEP PYRAMID THRONE"
// 5-step gold-trimmed pyramid dais with the throne perched at the apex.
// Smaller flanking obelisks at the base. Monumental upward-reading silhouette.
// ============================================================

// stripped T1c
/** Render the canonical Archmage Throne sheet — single 84×420 column,
 *  5 damage frames stacked vertically. The export pipeline grabs this. */
export function drawArchmageThroneSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, TH_W, TH_H * TH_FRAMES);
  for (let i = 0; i < TH_FRAMES; i++) {
    drawThrone_T1b(ctx, 0, i * TH_H, i);
  }
  return { cols: 1, rows: TH_FRAMES, w: TH_W, h: TH_H };
}

// ============================================================
// SHEET RENDERER
// ============================================================

/** Render the canonical Summoning Circle sheet — single 56×560 column,
 *  10 frames stacked vertically. The export pipeline grabs this canvas. */
export function drawSummoningCircleSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, SC_W, SC_H * SC_FRAMES);
  for (let i = 0; i < SC_FRAMES; i++) {
    drawSC_A1(ctx, 0, i * SC_H, i);
  }
  return { cols: 1, rows: SC_FRAMES, w: SC_W, h: SC_H };
}

// ===== REACT COMPONENT =====

export default function ArcaneCampaignSprites() {
  const scRef = useRef<HTMLCanvasElement>(null);
  const scPv = useRef<HTMLCanvasElement>(null);
  const thRef = useRef<HTMLCanvasElement>(null);
  const thPv = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ----- Summoning Circle sheet (single column 56×560) -----
    const sc = scRef.current!;
    sc.width = SC_W;
    sc.height = SC_H * SC_FRAMES;
    const sCtx = sc.getContext('2d')!;
    sCtx.imageSmoothingEnabled = false;
    drawSummoningCircleSheet(sCtx);

    const pv = scPv.current!;
    const scale = 4;
    const labelH = 14;
    pv.width = SC_W * scale + 80;
    pv.height = (SC_H * scale + labelH) * SC_FRAMES + 10;
    const pCtx = pv.getContext('2d')!;
    pCtx.imageSmoothingEnabled = false;
    pCtx.fillStyle = '#07050c';
    pCtx.fillRect(0, 0, pv.width, pv.height);
    for (let i = 0; i < SC_FRAMES; i++) {
      const by = i * (SC_H * scale + labelH) + 5;
      pCtx.fillStyle = '#9988ff';
      pCtx.font = 'bold 10px monospace';
      pCtx.fillText(`F${i} (${Math.round((i / (SC_FRAMES - 1)) * 100)}%)`, 4, by + (SC_H * scale) / 2 + 4);
      pCtx.save();
      pCtx.translate(80, by);
      pCtx.scale(scale, scale);
      pCtx.drawImage(sc, 0, i * SC_H, SC_W, SC_H, 0, 0, SC_W, SC_H);
      pCtx.restore();
      pCtx.strokeStyle = '#1a1a2a';
      pCtx.strokeRect(80, by, SC_W * scale, SC_H * scale);
    }

    // ----- Archmage Throne sheet (single column 84×420) -----
    const th = thRef.current!;
    th.width = TH_W;
    th.height = TH_H * TH_FRAMES;
    const tCtx = th.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;
    drawArchmageThroneSheet(tCtx);

    const tpv = thPv.current!;
    const tScale = 3;
    tpv.width = TH_W * tScale + 100;
    tpv.height = (TH_H * tScale + labelH) * TH_FRAMES + 12;
    const tpCtx = tpv.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#07050c';
    tpCtx.fillRect(0, 0, tpv.width, tpv.height);
    const dmgPercent = ['100%', '75%', '50%', '25%', '0%'];
    for (let i = 0; i < TH_FRAMES; i++) {
      const by = i * (TH_H * tScale + labelH) + 5;
      tpCtx.fillStyle = '#9988ff';
      tpCtx.font = 'bold 10px monospace';
      tpCtx.fillText(`F${i} (${dmgPercent[i]} HP)`, 4, by + (TH_H * tScale) / 2 + 4);
      tpCtx.save();
      tpCtx.translate(100, by);
      tpCtx.scale(tScale, tScale);
      tpCtx.drawImage(th, 0, i * TH_H, TH_W, TH_H, 0, 0, TH_W, TH_H);
      tpCtx.restore();
      tpCtx.strokeStyle = '#1a1a2a';
      tpCtx.strokeRect(100, by, TH_W * tScale, TH_H * tScale);
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
        <h2 style={{ color: SC_VIOLET_MD, margin: 0, fontSize: 15 }}>
          ARCANE CAMPAIGN — Summoning Circle (Polished Henge)
        </h2>
        {ready && (
          <button
            onClick={dl(scRef as React.RefObject<HTMLCanvasElement>, 'struct_summoning_circle.png')}
            style={{
              background: SC_VIOLET_MD, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Summoning Circle PNG
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh' }}>
        <canvas
          ref={scPv as React.RefObject<HTMLCanvasElement>}
          data-label="Arcane Campaign Summoning Circle (Preview)"
          style={{ display: 'block', maxWidth: '100%' }}
        />
        <canvas
          ref={scRef as React.RefObject<HTMLCanvasElement>}
          data-label="Arcane Campaign Summoning Circle"
          data-frame-size={`${SC_W}x${SC_H}`}
          style={{
            imageRendering: 'pixelated',
            width: SC_W * 4,
            border: '1px solid #1a1a2a',
            marginTop: 10,
          }}
        />
        <h3 style={{ color: SC_VIOLET_MD, marginTop: 24, fontSize: 14 }}>
          Archmage Throne (Cathedral Canopy)
        </h3>
        <canvas
          ref={thPv as React.RefObject<HTMLCanvasElement>}
          data-label="Arcane Campaign Archmage Throne (Preview)"
          style={{ display: 'block', maxWidth: '100%' }}
        />
        <canvas
          ref={thRef as React.RefObject<HTMLCanvasElement>}
          data-label="Arcane Campaign Archmage Throne"
          data-frame-size={`${TH_W}x${TH_H}`}
          style={{
            imageRendering: 'pixelated',
            width: TH_W * 4,
            border: '1px solid #1a1a2a',
            marginTop: 10,
          }}
        />
      </div>
      <div style={{ color: '#665588', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#9988ff' }}>Circle:</b> {SC_W}×{SC_H * SC_FRAMES}px · {SC_W}×{SC_H} cells · {SC_FRAMES} frames
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#9988ff' }}>Throne (compare):</b> {TH_W * 3}×{TH_H * TH_FRAMES}px · 3 variants × {TH_FRAMES} damage frames
        </p>
      </div>
    </div>
  );
}
