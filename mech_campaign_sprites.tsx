// @ts-nocheck
/**
 * mech_campaign_sprites.tsx — one-off sprites for the Mechanical campaign.
 *
 * Same shape as arcane_campaign_sprites.tsx (palette imports, draw helpers,
 * default-export React component for the sprite-preview pipeline).
 *
 * Contents (order matches mech-campaign-sprites-plan.md):
 *   - Workshop (M10) — Industrial forge. 32×32, 1 frame.
 *   - Raider (M10) — Player-trained saboteur. 24×24, 5 frames (1 idle + 4 walk).
 *   - Generator (M10) — Destructible CPU power node. 32×32, 4 HP frames.
 *   - Suppression Pylon — Voss's anti-arcane device. 32×32, 8 frames.
 *   - Voss's Throne (M10) — Win-condition boss structure. 84×84, 5 HP frames.
 */
import { useRef, useEffect, useState } from 'react';
import { C_base as MechBase, C_tower as MechTower } from './mechanical_sprites';

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

function lerpHex(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexRgb(c1);
  const [r2, g2, b2] = hexRgb(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}
function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// ============================================================
// WORKSHOP — player barracks / forge where Raiders are built
// ============================================================
const WS_W = 32;
const WS_H = 32;
const WS_FRAMES = 1;

const WS_SHAD   = MechBase.DKBRN;
const WS_DKSTL  = MechBase.DKSTL;
const WS_STL    = MechBase.STEEL;
const WS_LTSTL  = MechBase.LTSTL;
const WS_WTSTL  = MechBase.WTSTL;
const WS_DKBRZ  = MechBase.DKBRZ;
const WS_BRZ    = MechBase.BRONZE;
const WS_LTBRZ  = MechBase.LTBRZ;
const WS_RIVET  = MechBase.RIVET;
const WS_GEAR   = MechBase.GEAR;
const WS_DKGEAR = MechBase.DKGEAR;
const WS_LTGEAR = MechBase.LTGEAR;
const WS_FORG   = MechTower.FORG;
const WS_LFORG  = MechTower.LFORG;
const WS_ORANGE = MechTower.ORANGE;
const WS_SMOKE  = MechBase.SMOKE;

function _drawWorkshopSheet(ctx: CanvasRenderingContext2D) {
  rect(ctx, 4, 29, 24, 2, WS_SHAD);
  rect(ctx, 5, 28, 22, 1, WS_SHAD);
  rect(ctx, 5, 26, 22, 2, WS_DKSTL);
  rect(ctx, 6, 26, 20, 1, WS_STL);
  rect(ctx, 7, 25, 18, 1, WS_LTSTL);
  rect(ctx, 7, 23, 18, 2, WS_DKSTL);
  rect(ctx, 8, 23, 16, 1, WS_STL);
  rect(ctx, 9, 21, 14, 2, WS_DKSTL);
  rect(ctx, 10, 21, 12, 1, WS_STL);
  rect(ctx, 5, 27, 22, 1, WS_DKBRZ);
  rect(ctx, 6, 27, 20, 1, WS_BRZ);
  for (const [x, y] of [[6,25],[25,25],[7,26],[24,26],[6,27],[25,27]]) {
    px(ctx, x, y, WS_RIVET);
  }
  rect(ctx, 8, 7, 16, 14, WS_DKSTL);
  rect(ctx, 9, 7, 14, 14, WS_STL);
  rect(ctx, 10, 7, 12, 14, WS_LTSTL);
  for (const [x, y] of [[8,7],[23,7],[8,13],[23,13],[8,19],[23,19]]) {
    px(ctx, x, y, WS_RIVET);
  }
  rect(ctx, 7, 7, 18, 1, WS_DKBRZ);
  rect(ctx, 8, 6, 16, 1, WS_BRZ);
  rect(ctx, 9, 6, 14, 1, WS_LTBRZ);
  rect(ctx, 13, 2, 6, 5, WS_DKSTL);
  rect(ctx, 14, 2, 4, 5, WS_STL);
  rect(ctx, 15, 2, 2, 5, WS_LTSTL);
  rect(ctx, 12, 2, 8, 1, WS_BRZ);
  rect(ctx, 13, 1, 6, 1, WS_LTBRZ);
  rect(ctx, 14, 0, 4, 1, WS_BRZ);
  for (const [x, y] of [[13,0],[17,0]]) px(ctx, x, y, WS_SMOKE);
  for (const [x, y] of [
    [14,9],[18,9],[14,11],[18,11],[13,10],[19,10],[14,10],[15,10],[17,10],[18,10],
    [15,9],[16,9],[17,9],[15,11],[16,11],[17,11],[16,8],[16,12],[12,10],[20,10],
  ]) {
    px(ctx, x, y, (y === 8 || y === 12 || x === 12 || x === 20) ? WS_LTGEAR : WS_GEAR);
  }
  px(ctx, 16, 10, WS_SHAD);
  px(ctx, 15, 10, WS_DKGEAR);
  px(ctx, 17, 10, WS_DKGEAR);
  for (let i = 0; i < 4; i++) px(ctx, 12 + i, 12 + i, WS_BRZ);
  for (let i = 0; i < 4; i++) px(ctx, 20 - i, 12 + i, WS_BRZ);
  rect(ctx, 14, 15, 3, 2, WS_DKSTL);
  px(ctx, 15, 15, WS_STL);
  rect(ctx, 15, 15, 3, 2, WS_DKSTL);
  px(ctx, 17, 15, WS_STL);
  px(ctx, 14, 15, WS_LTSTL);
  px(ctx, 17, 15, WS_LTSTL);
  rect(ctx, 12, 16, 8, 4, WS_SHAD);
  rect(ctx, 12, 15, 8, 1, WS_DKSTL);
  rect(ctx, 12, 16, 1, 4, WS_DKSTL);
  rect(ctx, 19, 16, 1, 4, WS_DKSTL);
  rect(ctx, 12, 20, 8, 1, WS_STL);
  rect(ctx, 13, 17, 6, 2, WS_LFORG);
  rect(ctx, 14, 18, 4, 1, WS_FORG);
  rect(ctx, 15, 17, 2, 1, '#ffaa44');
  px(ctx, 16, 18, '#ffaa44');
  px(ctx, 13, 16, WS_ORANGE);
  px(ctx, 18, 16, WS_ORANGE);
  px(ctx, 14, 15, withAlpha(WS_FORG, 0.5));
  px(ctx, 18, 15, withAlpha(WS_FORG, 0.5));
  rect(ctx, 13, 21, 6, 1, WS_WTSTL);
  rect(ctx, 14, 20, 4, 1, WS_LTSTL);
  rect(ctx, 14, 22, 4, 1, WS_DKSTL);
  rect(ctx, 13, 23, 6, 1, WS_STL);
  px(ctx, 12, 21, WS_LTSTL);
  px(ctx, 12, 22, WS_STL);
  px(ctx, 19, 21, WS_LTSTL);
  px(ctx, 19, 22, WS_STL);
}

// ============================================================
// RAIDER — player-trained mobile unit (M10)
// ============================================================
// 24×24, 5 frames stacked vertically (1 idle + 4 walk). Forward-facing,
// warm bronze cloak/ hood so they read as PLAYER units distinct from CPU
// defenders. Heavy boots, satchel, cog motif on belt.

const R_W = 24;
const R_H = 24;
const R_FRAMES = 5;

function _drawRaiderSheet(ctx: CanvasRenderingContext2D) {
  for (let f = 0; f < R_FRAMES; f++) {
    const oy = f * R_H;
    const leg = f === 1 ? -1 : f === 3 ? 1 : 0;
    const sway = f === 0 ? 0 : f % 2 === 0 ? 0 : -1;

    // Shadow
    rect(ctx, 9, oy + 21, 6, 2, MechBase.DKBRN);

    // Boots
    rect(ctx, 9 + leg, oy + 18, 3, 3, MechBase.DKBRN);
    px(ctx, 10 + leg, oy + 18, MechBase.BRWN);
    rect(ctx, 12 - leg, oy + 18, 3, 3, MechBase.DKBRN);
    px(ctx, 13 - leg, oy + 18, MechBase.BRWN);
    // Boot highlight
    px(ctx, 9 + leg, oy + 18, MechBase.STEEL);
    px(ctx, 12 - leg, oy + 18, MechBase.STEEL);

    // Legs (dark steel)
    rect(ctx, 10 + leg, oy + 13, 2, 5, MechBase.DKSTL);
    rect(ctx, 10 + leg, oy + 13, 1, 5, MechBase.STEEL);
    rect(ctx, 12 - leg, oy + 13, 2, 5, MechBase.DKSTL);
    rect(ctx, 13 - leg, oy + 13, 1, 5, MechBase.STEEL);
    // Dark crotch
    px(ctx, 11, oy + 13, MechBase.DKBRN);

    // Cloak hem (hangs over legs)
    rect(ctx, 8, oy + 11, 8, 2, MechTower.DKTBRN);
    rect(ctx, 9, oy + 11, 6, 2, MechTower.TBRN);
    rect(ctx, 8, oy + 12, 8, 1, MechBase.DKBRN);

    // Belt with cog
    rect(ctx, 8, oy + 10, 8, 1, MechBase.DKBRN);
    px(ctx, 11, oy + 10, MechBase.GEAR);
    px(ctx, 12, oy + 10, MechBase.GEAR);
    px(ctx, 11, oy + 9, MechBase.DKGEAR);
    px(ctx, 12, oy + 9, MechBase.DKGEAR);

    // Cloak body (warm bronze — player-colour)
    rect(ctx, 8, oy + 5, 8, 5, MechTower.DKTBRN);
    rect(ctx, 9, oy + 5, 6, 5, MechTower.TBRN);
    rect(ctx, 8, oy + 5, 1, 5, MechTower.LTTBRN);

    // Satchel (right hip)
    rect(ctx, 16, oy + 6, 3, 4, MechBase.DKBRZ);
    rect(ctx, 17, oy + 6, 1, 4, MechBase.BRONZE);
    px(ctx, 15, oy + 6, MechBase.DKBRN);
    px(ctx, 16, oy + 10, MechBase.DKBRZ);

    // Shoulders
    rect(ctx, 7, oy + 4, 10, 1, MechTower.DKTBRN);
    rect(ctx, 8, oy + 4, 8, 1, MechTower.TBRN);

    // Hood
    rect(ctx, 9, oy + 1, 6, 3, MechTower.DKTBRN);
    rect(ctx, 9, oy + 1, 5, 3, MechTower.TBRN);
    // Hood tip
    px(ctx, 11, oy + 0, MechTower.LTTBRN);
    px(ctx, 12, oy + 0, MechTower.LTTBRN);
    // Hood outline
    px(ctx, 9, oy + 1, MechTower.LTTBRN);
    px(ctx, 14, oy + 1, MechTower.LTTBRN);

    // Face shadow
    rect(ctx, 10, oy + 2, 4, 2, '#0e0a14');
    // Glowing eyes (bright on idle, dim on walk)
    if (f === 0) {
      px(ctx, 10, oy + 2, '#ffcc44');
      px(ctx, 13, oy + 2, '#ffcc44');
    } else {
      px(ctx, 10, oy + 2, withAlpha('#ffcc44', 0.3));
      px(ctx, 13, oy + 2, withAlpha('#ffcc44', 0.3));
    }
  }
}

// ============================================================
// GENERATOR — destructible CPU power node (M10)
// ============================================================
// 32×32, 4 frames (100/66/33/0% HP). Coiled power cell tower with
// arcing forge-orange electricity. Status light changes as HP drops.
// At 0% the central coil collapses.

const G_W = 32;
const G_H = 32;
const G_FRAMES = 4;

function _drawGeneratorSheet(ctx: CanvasRenderingContext2D) {
  // dmg 0..1 interpolated from frame index
  const dmgLerps = [0, 0.33, 0.66, 1.0];
  for (let f = 0; f < G_FRAMES; f++) {
    const oy = f * G_H;
    const dmg = dmgLerps[f];
    const powered = dmg < 0.9;
    const coilH = powered ? 5 : 3;
    const coilDk = dmg < 0.33 ? MechTower.FORG : dmg < 0.66 ? MechTower.DKORG : MechBase.DKSTL;
    const coilMd = dmg < 0.33 ? MechTower.LFORG : dmg < 0.66 ? MechTower.ORANGE : MechBase.STEEL;

    // Ground shadow
    rect(ctx, 5, oy + 30, 22, 2, MechBase.DKBRN);

    // Base platform
    rect(ctx, 5, oy + 26, 22, 4, MechBase.DKSTL);
    rect(ctx, 6, oy + 26, 20, 3, MechBase.STEEL);
    rect(ctx, 7, oy + 26, 18, 2, MechBase.LTSTL);
    rect(ctx, 5, oy + 28, 22, 1, MechBase.DKBRZ);
    // Base rivets
    for (const [x, y] of [[6,27],[25,27],[6,29],[25,29]]) {
      px(ctx, x, y, MechBase.RIVET);
    }

    // 3 stacked coils at center
    const coilX = 13;
    const coilW = 6;
    for (let ci = 0; ci < 3; ci++) {
      const cY = oy + 9 + ci * 7;
      const h = ci === 1 ? coilH : Math.min(coilH, 4);
      // Coil body
      rect(ctx, coilX, cY, coilW, h, MechBase.DKSTL);
      rect(ctx, coilX + 1, cY, coilW - 2, h, coilMd);
      rect(ctx, coilX + 1, cY, 1, h, coilDk);
      // Coil windings (horizontal bands)
      if (powered) {
        for (let wy = cY + 1; wy < cY + h - 1; wy += 2) {
          rect(ctx, coilX - 1, wy, coilW + 2, 1, coilMd);
        }
      }
      // Coil glow fade
      if (!powered && ci === 1) {
        rect(ctx, coilX, cY, coilW, h, MechBase.DKSTL);
      }
    }

    // Arcing electricity between coils (full HP only)
    if (dmg < 0.35) {
      for (const [ax, ay] of [[14, oy+13],[17, oy+13],[13, oy+20],[18, oy+20]]) {
        px(ctx, ax, ay, MechTower.SPARK);
        px(ctx, ax - 1, ay + 1, MechTower.LTSPARK);
        px(ctx, ax + 1, ay - 1, MechTower.LTSPARK);
      }
      // Vertical arc
      px(ctx, 16, oy + 13, MechTower.SPARK);
      px(ctx, 15, oy + 14, MechTower.WSPARK);
      px(ctx, 16, oy + 15, MechTower.SPARK);
      px(ctx, 17, oy + 16, MechTower.LTSPARK);
      px(ctx, 16, oy + 17, MechTower.WSPARK);
    }
    // Dim arcs at 66%
    if (dmg >= 0.35 && dmg < 0.66) {
      px(ctx, 15, oy + 13, MechTower.TYELW);
      px(ctx, 17, oy + 15, MechTower.DKORG);
      px(ctx, 14, oy + 19, MechTower.DKORG);
    }

    // Main coil stem (collapses at 0%)
    if (powered) {
      rect(ctx, 15, oy + 8, 2, 17, MechBase.DKSTL);
      rect(ctx, 15, oy + 8, 1, 17, MechBase.STEEL);
    } else {
      // Collapsed / snapped stem
      rect(ctx, 15, oy + 8, 2, 8, MechBase.DKSTL);
      rect(ctx, 14, oy + 16, 4, 1, MechBase.DKBRN);
      rect(ctx, 16, oy + 16, 3, 1, MechBase.DKSTL);
      px(ctx, 17, oy + 17, MechBase.DKSTL);
    }

    // Top electrode sphere
    if (powered) {
      const sr = dmg < 0.33 ? 3 : 2;
      fillCircle(ctx, 16, oy + 7, sr, dmg < 0.33 ? MechTower.ORANGE : MechTower.DKORG);
      fillCircle(ctx, 16, oy + 7, sr - 1, dmg < 0.33 ? MechTower.LTORG : MechTower.TYELW);
      px(ctx, 16, oy + 7 - sr, MechTower.SPARK);
    } else {
      px(ctx, 16, oy + 7, MechBase.DKSTL);
      px(ctx, 15, oy + 6, MechBase.RIVET);
    }

    // Status light (left side)
    const lightCol = dmg < 0.33 ? MechTower.FORG : dmg < 0.66 ? MechTower.TYELW : dmg < 0.9 ? MechTower.RED : MechBase.DKBRN;
    px(ctx, 10, oy + 12, lightCol);
    px(ctx, 10, oy + 13, lightCol);
    px(ctx, 9, oy + 12, withAlpha(lightCol, 0.5));

    // Side vents
    px(ctx, 10, oy + 16, MechBase.RIVET);
    px(ctx, 21, oy + 16, MechBase.RIVET);
    px(ctx, 10, oy + 20, MechBase.RIVET);
    px(ctx, 21, oy + 20, MechBase.RIVET);

    // Smoke at full HP
    if (dmg < 0.15) {
      px(ctx, 15, oy + 3, MechBase.SMOKE);
      px(ctx, 17, oy + 2, MechBase.LTSMK);
      px(ctx, 14, oy + 1, MechBase.SMOKE);
    }
    // Damage cracks
    if (dmg >= 0.66) {
      px(ctx, 12, oy + 18, MechBase.DKBRN);
      px(ctx, 19, oy + 14, MechBase.DKBRN);
    }
    if (dmg >= 0.9) {
      px(ctx, 12, oy + 22, MechBase.DKBRN);
      px(ctx, 14, oy + 24, MechBase.DKBRN);
      px(ctx, 20, oy + 21, MechBase.DKBRN);
    }
  }
}

// ============================================================
// SUPPRESSION PYLON — Voss's anti-arcane device
// ============================================================
// 32×32, 8 frames vertically stacked:
//   F0-F3: Active pulse breath (brightness cycle)
//   F4-F5: Channeling (cracks in crystal, sparks at base)
//   F6-F7: Muted (dim / dormant flicker)

const P_W = 32;
const P_H = 32;
const P_FRAMES = 8;

// Suppression-violet palette (not in MechBase — defined locally)
const V_DK   = '#220033';
const V_MD   = '#440066';
const V_LT   = '#7733aa';
const V_HI   = '#aa66dd';
const V_GLOW = '#cc88ff';
const V_PALE = '#ddaaff';

function _drawPylonSheet(ctx: CanvasRenderingContext2D) {
  for (let f = 0; f < P_FRAMES; f++) {
    const oy = f * P_H;
    const isActive = f < 4;
    const isChanneling = f >= 4 && f < 6;
    const isMuted = f >= 6;

    // Pulse brightness: F0 dim, F1 mid, F2 bright, F3 mid (then repeat pattern)
    const pulsePhase = [0.35, 0.65, 1.0, 0.65, 0.5, 0.3, 0.15, 0.1][f];

    // Ground shadow + cabling
    rect(ctx, 6, oy + 30, 20, 2, MechBase.DKBRN);
    // Cables snaking from base
    if (!isMuted) {
      rect(ctx, 8, oy + 28, 3, 2, MechBase.DKSTL);
      rect(ctx, 21, oy + 28, 3, 2, MechBase.DKSTL);
      rect(ctx, 7, oy + 29, 2, 1, MechBase.STEEL);
      rect(ctx, 23, oy + 29, 2, 1, MechBase.STEEL);
    }

    // Tripod base
    // Left leg
    rect(ctx, 8, oy + 22, 3, 6, MechBase.DKSTL);
    rect(ctx, 9, oy + 22, 1, 6, MechBase.STEEL);
    // Right leg
    rect(ctx, 21, oy + 22, 3, 6, MechBase.DKSTL);
    rect(ctx, 22, oy + 22, 1, 6, MechBase.STEEL);
    // Center leg (rear)
    rect(ctx, 14, oy + 24, 4, 4, MechBase.DKSTL);
    rect(ctx, 15, oy + 24, 2, 4, MechBase.STEEL);

    // Brazier head (the housing)
    const headY = oy + 15;
    const activeCol = isMuted ? V_DK : isChanneling ? V_MD : V_MD;
    rect(ctx, 11, headY, 10, 7, MechBase.DKSTL);
    rect(ctx, 12, headY, 8, 7, activeCol);
    rect(ctx, 12, headY, 7, 7, isActive ? V_LT : isMuted ? V_DK : V_MD);
    // Rim
    rect(ctx, 10, headY, 12, 1, MechBase.DKBRZ);
    rect(ctx, 11, headY, 10, 1, MechBase.BRONZE);
    // Base rivets
    px(ctx, 12, headY + 6, MechBase.RIVET);
    px(ctx, 19, headY + 6, MechBase.RIVET);

    // Floating crystal (octahedron shape)
    const cryY = oy + 7;
    if (!isMuted) {
      // Crystal body — diamond shape
      const cryW = isChanneling ? 3 : 4;
      for (let dy = 0; dy < 7; dy++) {
        const hw = dy < 3 ? dy : 6 - dy;
        if (hw > cryW) continue;
        const yy = cryY + dy;
        const col = dy < 2 ? V_HI : dy < 4 ? V_LT : dy < 5 ? V_MD : V_DK;
        rect(ctx, 16 - hw, yy, hw * 2 + 1, 1, col);
      }
      // Bright apex
      px(ctx, 16, cryY, V_PALE);
      if (isActive) px(ctx, 16, cryY - 1, V_GLOW);
      // Crystal glow aura
      if (isActive && pulsePhase > 0.6) {
        for (let dx = -1; dx <= 1; dx += 2) {
          for (let dy = 1; dy <= 3; dy++) {
            px(ctx, 16 + dx * (dy + 1), cryY + dy, withAlpha(V_GLOW, pulsePhase * 0.4));
          }
        }
      }
      // Channeling cracks
      if (isChanneling) {
        px(ctx, 15, cryY + 2, MechTower.SPARK);
        px(ctx, 17, cryY + 4, MechTower.LTSPARK);
        px(ctx, 16, cryY + 3, MechBase.DKBRN);
        px(ctx, 14, cryY + 3, MechTower.TYELW);
        // Base sparks
        px(ctx, 13, headY + 1, MechTower.SPARK);
        px(ctx, 19, headY + 2, MechTower.LTSPARK);
        px(ctx, 11, headY + 3, MechTower.ORANGE);
      }
    } else {
      // Muted: dim shard
      px(ctx, 16, cryY + 1, V_DK);
      px(ctx, 15, cryY + 2, V_DK);
      px(ctx, 16, cryY + 2, '#111122');
      px(ctx, 17, cryY + 2, V_DK);
      px(ctx, 15, cryY + 3, V_DK);
      px(ctx, 16, cryY + 3, '#111122');
      px(ctx, 17, cryY + 3, V_DK);
      px(ctx, 16, cryY + 4, V_DK);
      // Subtle flicker
      if (f === 7) px(ctx, 16, cryY + 2, withAlpha(V_MD, 0.3));
    }

    // Field emission ring at base of crystal (active only)
    if (isActive && pulsePhase > 0.5) {
      const ringR = Math.floor(3 + pulsePhase * 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rx = Math.round(16 + Math.cos(a) * ringR);
        const ry = Math.round(cryY + 6 + Math.sin(a) * 1);
        px(ctx, rx, ry, withAlpha(V_GLOW, pulsePhase * 0.5));
      }
    }
  }
}

// ============================================================
// VOSS'S THRONE — M10 win-condition boss structure
// ============================================================
// 84×84 per frame × 5 damage states (100/75/50/25/0% HP).
// Two flanking iron obelisks, riveted steel canopy, Voss seated
// on a tiered iron dais. Suppression-violet glow while invulnerable.
// Damage progression: iron buckles, rivets pop, steam vents,
// final frame is a charred husk.

const TH_W = 84;
const TH_H = 84;
const TH_FRAMES = 5;

// Throne palette — industrial greys, bronze, violet glow
const T_STL_DK  = '#444455';
const T_STL_MD  = '#666677';
const T_STL_LT  = '#888899';
const T_STL_HI  = '#aaaabb';
const T_BRZ_DK  = '#885522';
const T_BRZ_MD  = '#aa7744';
const T_BRZ_HI  = '#cc9955';
const T_OUTLINE = '#1a1a22';
const T_GOLD_DK = '#997744';
const T_GOLD_MD = '#bb9944';
const T_GOLD_HI = '#ddbb66';
const T_V_DK    = '#220044';
const T_V_MD    = '#552288';
const T_V_LT    = '#8844bb';
const T_V_GLOW  = '#bb66ee';
const T_V_PALE  = '#ddaaff';
const T_ROBE_DK = '#333344';
const T_ROBE_MD = '#555566';
const T_ROBE_HI = '#777788';
const T_FLAME   = '#ff6622';
const T_SMOKE   = '#554444';

function damageT(frameIdx: number): number {
  return frameIdx / (TH_FRAMES - 1);
}

function block3D(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dk: string, md: string, lt: string, hi: string,
  outline = T_OUTLINE,
) {
  rect(ctx, x, y, w, h, dk);
  rect(ctx, x, y, w, 1, md);
  rect(ctx, x + 1, y, w - 2, 1, hi);
  rect(ctx, x, y + 1, 1, h - 1, md);
  rect(ctx, x + 1, y + 1, 1, h - 2, lt);
  rect(ctx, x + w - 1, y + 1, 1, h - 2, outline);
  rect(ctx, x + w - 2, y + 2, 1, h - 3, dk);
  rect(ctx, x + 1, y + h - 1, w - 1, 1, outline);
  rect(ctx, x + 1, y + h - 2, w - 2, 1, dk);
}

function goldBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dim = false) {
  if (h < 1) return;
  const top = dim ? T_GOLD_MD : T_GOLD_HI;
  const mid = dim ? T_GOLD_DK : T_GOLD_MD;
  const bot = dim ? '#775533' : T_GOLD_DK;
  rect(ctx, x, y, w, h, mid);
  rect(ctx, x, y, w, 1, top);
  if (h > 1) rect(ctx, x, y + h - 1, w, 1, bot);
  if (w > 2 && h > 1) { rect(ctx, x + 1, y + 1, 1, h - 2, top); rect(ctx, x + w - 1, y + 1, 1, h - 2, bot); }
}

function drawObelisk(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, h: number,
  dmg: number, fractureFrac: number,
) {
  const W = 6;
  const broken = dmg >= 0.85;
  const fractured = dmg >= fractureFrac && !broken;
  const cropTop = broken ? Math.floor(h * 0.35) : 0;
  const sDk = dmg < 0.6 ? T_STL_DK : '#333344';
  const sHi = dmg < 0.3 ? T_STL_HI : T_STL_LT;
  const sLt = dmg < 0.5 ? T_STL_LT : T_STL_MD;

  // Body
  rect(ctx, sx, sy + cropTop, W, h - cropTop, sDk);
  rect(ctx, sx, sy + cropTop, W, 1, sHi);
  rect(ctx, sx, sy + cropTop, 1, h - cropTop, sLt);
  rect(ctx, sx + 1, sy + cropTop, 1, h - cropTop - 2, sHi);
  rect(ctx, sx + 2, sy + cropTop + 1, W - 4, h - cropTop - 2, sLt);
  rect(ctx, sx + W - 2, sy + cropTop + 1, 1, h - cropTop - 1, sDk);
  rect(ctx, sx + W - 1, sy + cropTop, 1, h - cropTop, T_OUTLINE);
  rect(ctx, sx, sy + h - 1, W, 1, T_OUTLINE);

  // Pointed cap
  if (!broken) {
    const capY = sy - 4;
    if (!fractured) {
      px(ctx, sx + 2, capY, T_BRZ_HI);
      px(ctx, sx + 3, capY, T_GOLD_HI);
      px(ctx, sx + 2, capY + 1, T_GOLD_HI);
      px(ctx, sx + 3, capY + 1, T_STL_HI);
      px(ctx, sx + 1, capY + 2, T_STL_MD);
      px(ctx, sx + 4, capY + 2, T_STL_DK);
      rect(ctx, sx + 2, capY + 2, 2, 2, T_BRZ_MD);
      px(ctx, sx + 1, capY + 3, T_BRZ_DK);
    } else {
      rect(ctx, sx + 1, capY + 1, 4, 3, T_STL_DK);
      px(ctx, sx + 2, capY + 1, T_STL_MD);
    }
  }

  // Gold bands
  for (const by of [sy + 8, sy + 16, sy + 24]) {
    if (by < sy + cropTop) continue;
    rect(ctx, sx, by, W, 1, T_OUTLINE);
    rect(ctx, sx + 1, by, W - 2, 1, dmg < 0.5 ? T_GOLD_MD : T_GOLD_DK);
  }

  // Base trim
  goldBand(ctx, sx - 1, sy + h - 4, W + 2, 2, dmg >= 0.7);
  rect(ctx, sx - 1, sy + h - 1, W + 2, 1, T_OUTLINE);

  // Fractures
  if (fractured) {
    rect(ctx, sx, sy + Math.floor(h * 0.5), W, 1, T_OUTLINE);
    rect(ctx, sx + 2, sy + Math.floor(h * 0.65), 1, 2, T_OUTLINE);
  }
  if (broken) {
    px(ctx, sx + 1, sy + cropTop, T_OUTLINE);
    px(ctx, sx + 3, sy + cropTop - 1, T_OUTLINE);
  }

  // Rivet strip down the front
  const rivetCol = dmg < 0.5 ? MechBase.RIVET : MechBase.DKRIV;
  for (let ry = sy + 4; ry < sy + h - 2; ry += 6) {
    if (ry < sy + cropTop) continue;
    px(ctx, sx + 1, ry, rivetCol);
    px(ctx, sx + 4, ry, rivetCol);
  }
}

function drawVossFigure(
  ctx: CanvasRenderingContext2D, mX: number, mY: number, dmg: number,
) {
  if (dmg >= 1.0) return;

  const robeH = 14;
  const robeDk = dmg < 0.85 ? T_ROBE_DK : T_STL_DK;
  const robeMd = dmg < 0.6 ? T_ROBE_MD : T_ROBE_DK;
  const robeHi = dmg < 0.3 ? T_ROBE_HI : T_ROBE_MD;

  // Trapezoidal robe
  for (let i = 0; i < robeH; i++) {
    const w = 8 + Math.floor(i * 0.5);
    rect(ctx, mX - Math.floor(w / 2), mY + i, w, 1,
      i < 5 ? robeDk : i < 10 ? robeMd : robeHi);
  }
  // Robe outline
  for (let i = 0; i < robeH; i++) {
    const w = 8 + Math.floor(i * 0.5);
    px(ctx, mX - Math.floor(w / 2), mY + i, T_OUTLINE);
    px(ctx, mX - Math.floor(w / 2) + w - 1, mY + i, T_OUTLINE);
  }

  // Armoured torso
  rect(ctx, mX - 4, mY - 8, 8, 8, T_STL_DK);
  rect(ctx, mX - 3, mY - 8, 6, 8, T_STL_MD);
  rect(ctx, mX - 3, mY - 8, 1, 8, T_STL_LT);
  // Chest emblem — suppression-violet crystal
  if (dmg < 0.5) {
    px(ctx, mX - 1, mY - 5, T_V_LT);
    px(ctx, mX, mY - 5, T_V_GLOW);
    px(ctx, mX + 1, mY - 5, T_V_LT);
    px(ctx, mX, mY - 6, T_V_PALE);
    px(ctx, mX, mY - 4, T_V_MD);
  }
  // Shoulder plates
  if (dmg < 0.85) {
    rect(ctx, mX - 6, mY - 8, 2, 3, T_BRZ_DK);
    rect(ctx, mX + 4, mY - 8, 2, 3, T_BRZ_DK);
    px(ctx, mX - 6, mY - 8, T_BRZ_HI);
    px(ctx, mX + 5, mY - 8, T_BRZ_HI);
  }

  // Head / helmet
  if (dmg < 0.85) {
    rect(ctx, mX - 3, mY - 13, 6, 5, T_STL_DK);
    rect(ctx, mX - 2, mY - 13, 4, 5, T_STL_MD);
    rect(ctx, mX - 2, mY - 13, 1, 5, T_STL_LT);
    // Helmet crest
    px(ctx, mX, mY - 14, T_BRZ_MD);
    px(ctx, mX - 1, mY - 14, T_BRZ_DK);
    px(ctx, mX + 1, mY - 14, T_BRZ_DK);
    // Visor
    rect(ctx, mX - 2, mY - 10, 4, 2, '#0a0a12');
    // Glowing visor eyes
    if (dmg < 0.5) {
      px(ctx, mX - 1, mY - 10, T_V_GLOW);
      px(ctx, mX + 1, mY - 10, T_V_GLOW);
    }
  }

  // Hands on armrest controls
  if (dmg < 0.7) {
    px(ctx, mX - 5, mY - 2, T_GOLD_MD);
    px(ctx, mX + 5, mY - 2, T_GOLD_MD);
    // Control panels
    rect(ctx, mX - 6, mY - 1, 2, 2, T_STL_DK);
    rect(ctx, mX + 4, mY - 1, 2, 2, T_STL_DK);
    if (dmg < 0.3) {
      px(ctx, mX - 5, mY - 1, T_V_LT);
      px(ctx, mX + 5, mY - 1, T_V_LT);
    }
  }
}

function drawThroneEmbers(ctx: CanvasRenderingContext2D, ox: number, cyBottom: number, dmg: number) {
  if (dmg < 0.5) return;
  const count = Math.floor((dmg - 0.5) * 20);
  for (let i = 0; i < count; i++) {
    const ex = ox + 14 + ((i * 13) % (TH_W - 28));
    const ey = cyBottom - 14 - ((i * 7) % 28);
    px(ctx, ex, ey, i % 3 === 0 ? T_FLAME : i % 2 === 0 ? MechTower.DKORG : T_SMOKE);
  }
}

function drawSteamVent(ctx: CanvasRenderingContext2D, sx: number, sy: number, dmg: number) {
  if (dmg > 0.9) return;
  const intensity = dmg < 0.35 ? 3 : dmg < 0.66 ? 2 : 1;
  for (let i = 0; i < intensity; i++) {
    const dx = Math.round(Math.sin(i * 1.5) * 1.5);
    px(ctx, sx + dx, sy - i, i < 1 ? MechBase.LTSMK : MechBase.SMOKE);
  }
}

function drawThrone(ctx: CanvasRenderingContext2D, ox: number, oy: number, frameIdx: number) {
  const cx = ox + TH_W / 2;
  const cyB = oy + TH_H - 2;
  const dmg = damageT(frameIdx);

  // ——— DAIS (3-tier iron platform) ———
  // Bottom tier
  block3D(ctx, ox + 6, cyB - 8, TH_W - 12, 8, T_STL_DK, T_STL_MD, T_STL_LT, T_STL_HI);
  goldBand(ctx, ox + 6, cyB - 8, TH_W - 12, 1, dmg >= 0.5);
  // Mid tier
  block3D(ctx, ox + 14, cyB - 14, TH_W - 28, 6, T_BRZ_DK, T_BRZ_MD, T_BRZ_HI, T_BRZ_HI);
  // Top tier (dais platform)
  block3D(ctx, ox + 26, cyB - 20, TH_W - 52, 6, T_STL_DK, T_STL_MD, T_STL_LT, T_STL_HI);
  goldBand(ctx, ox + 26, cyB - 20, TH_W - 52, 1, dmg >= 0.5);

  // Damage cracks on dais
  if (dmg >= 0.5) {
    rect(ctx, ox + 20, cyB - 8, 1, 8, T_OUTLINE);
    rect(ctx, ox + 60, cyB - 8, 1, 8, T_OUTLINE);
  }
  if (dmg >= 0.75) {
    rect(ctx, ox + 30, cyB - 14, 1, 6, T_OUTLINE);
    rect(ctx, ox + 50, cyB - 20, 4, 1, T_OUTLINE);
  }

  // ——— FLANKING OBELISKS ———
  drawObelisk(ctx, ox + 10, cyB - 62, 42, dmg, 0.35);
  drawObelisk(ctx, ox + 68, cyB - 62, 42, dmg >= 0.75 ? Math.min(dmg + 0.15, 1) : dmg, 0.5);

  // ——— PIPES & CABLES running up obelisks ———
  if (dmg < 0.75) {
    // Left pipe
    rect(ctx, ox + 8, cyB - 58, 2, 36, T_STL_DK);
    rect(ctx, ox + 9, cyB - 58, 1, 36, T_STL_MD);
    // Right pipe
    rect(ctx, ox + 74, cyB - 58, 2, 36, T_STL_DK);
    rect(ctx, ox + 74, cyB - 58, 1, 36, T_STL_MD);
    // Pipe joints
    for (let jy = cyB - 50; jy < cyB - 10; jy += 12) {
      rect(ctx, ox + 7, jy, 4, 1, T_BRZ_MD);
      rect(ctx, ox + 73, jy, 4, 1, T_BRZ_MD);
    }
    // Steam from pipes
    drawSteamVent(ctx, ox + 9, cyB - 60, dmg);
    drawSteamVent(ctx, ox + 75, cyB - 60, dmg);
  }

  // ——— STEEL CANOPY ———
  const canopyY = cyB - 64;
  const lintelW = 58;
  const lintelX = cx - lintelW / 2;
  const peakH = 12;
  const partial = dmg >= 0.7 && dmg < 0.85;
  const collapsed = dmg >= 0.85;

  if (!collapsed) {
    // Lintel (horizontal beam connecting obelisks)
    if (partial) {
      const breakX = lintelX + Math.floor(lintelW * 0.6);
      rect(ctx, lintelX, canopyY, breakX - lintelX, 3, T_STL_DK);
      rect(ctx, lintelX, canopyY, breakX - lintelX, 1, T_BRZ_DK);
      px(ctx, breakX, canopyY + 1, T_OUTLINE);
      const stubX = lintelX + lintelW - 6;
      rect(ctx, stubX, canopyY, 6, 3, T_STL_DK);
      px(ctx, stubX - 1, canopyY + 1, T_OUTLINE);
    } else {
      rect(ctx, lintelX, canopyY, lintelW, 3, T_STL_DK);
      rect(ctx, lintelX, canopyY, lintelW, 1, dmg < 0.5 ? T_BRZ_MD : T_GOLD_DK);
      rect(ctx, lintelX, canopyY + 2, lintelW, 1, T_OUTLINE);
    }

    // Peaked canopy roof
    for (let i = 0; i < peakH; i++) {
      const w = lintelW - i * 3;
      if (w <= 0) break;
      const sxx = cx - Math.floor(w / 2);
      const y = canopyY - i - 1;
      if (partial) {
        const halfW = Math.floor(w / 2);
        rect(ctx, sxx, y, halfW, 1, i < 2 ? T_STL_DK : i < 5 ? T_STL_MD : T_STL_LT);
        px(ctx, sxx, y, T_OUTLINE);
        if (i < peakH - 2) px(ctx, sxx + halfW, y, T_OUTLINE);
      } else {
        rect(ctx, sxx, y, w, 1, i < 2 ? T_STL_DK : i < 5 ? T_STL_MD : T_STL_LT);
        px(ctx, sxx, y, T_OUTLINE);
        px(ctx, sxx + w - 1, y, T_OUTLINE);
        if (w > 4) px(ctx, sxx + 2, y, T_STL_HI);
      }
    }

    // Canopy rivets
    if (!partial) {
      for (let rx = lintelX + 4; rx < lintelX + lintelW - 4; rx += 8) {
        px(ctx, rx, canopyY + 1, MechBase.RIVET);
      }
    }

    // Suppression-violet glow under canopy (while invulnerable / active)
    if (dmg < 0.35) {
      for (let i = 0; i < 6; i++) {
        const gx = cx - 6 + i * 2;
        px(ctx, gx, canopyY + 2, withAlpha(T_V_GLOW, 0.4));
        px(ctx, gx, canopyY + 3, withAlpha(T_V_LT, 0.3));
      }
      // Central crystal hanging from canopy
      px(ctx, cx, canopyY + 3, T_V_PALE);
      px(ctx, cx - 1, canopyY + 4, T_V_GLOW);
      px(ctx, cx + 1, canopyY + 4, T_V_GLOW);
      px(ctx, cx, canopyY + 5, T_V_LT);
    }
  } else {
    // Collapsed: debris
    rect(ctx, ox + 20, cyB - 20, 6, 2, T_STL_DK);
    rect(ctx, ox + 36, cyB - 18, 4, 2, T_STL_DK);
    rect(ctx, ox + 52, cyB - 22, 6, 1, T_STL_DK);
    px(ctx, ox + 30, cyB - 24, T_OUTLINE);
    px(ctx, ox + 58, cyB - 26, T_OUTLINE);
  }

  // ——— THRONE BACK (within canopy alcove) ———
  if (dmg < 0.85) {
    const tbX = ox + 30, tbY = cyB - 44, tbW = 24, tbH = 24;
    const heavyDmg = dmg >= 0.7;
    if (heavyDmg) {
      const cropY = tbY + 10;
      block3D(ctx, tbX, cropY, tbW, tbH - 10, T_STL_DK, T_STL_MD, T_STL_LT, T_STL_HI);
      goldBand(ctx, tbX, cropY, 2, tbH - 10, true);
      goldBand(ctx, tbX + tbW - 2, cropY, 2, tbH - 10, true);
    } else {
      block3D(ctx, tbX, tbY, tbW, tbH, T_STL_DK, T_STL_MD, T_STL_LT, T_STL_HI);
      goldBand(ctx, tbX, tbY, 2, tbH, dmg >= 0.5);
      goldBand(ctx, tbX + tbW - 2, tbY, 2, tbH, dmg >= 0.5);
      if (dmg >= 0.5) rect(ctx, tbX + 6, tbY + 4, 1, 12, T_OUTLINE);
    }
  }

  // ——— VOSS (seated figure) ———
  drawVossFigure(ctx, cx, cyB - 28, dmg);

  // ——— EMBERS ———
  drawThroneEmbers(ctx, ox, cyB, dmg);

  // ——— FRAME 0 GLOW ———
  if (frameIdx === 0) {
    for (let i = 0; i < 6; i++) {
      px(ctx, cx, cyB - 76 - i, withAlpha(T_V_GLOW, 0.5));
      px(ctx, cx - 1, cyB - 76 - i, withAlpha(T_V_LT, 0.3));
      px(ctx, cx + 1, cyB - 76 - i, withAlpha(T_V_LT, 0.3));
    }
  }
}

// ============================================================
// SHEET EXPORT FUNCTIONS
// ============================================================

export function drawWorkshopSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, WS_W, WS_H * WS_FRAMES);
  _drawWorkshopSheet(ctx);
  return { cols: 1, rows: WS_FRAMES, w: WS_W, h: WS_H };
}

export function drawRaiderSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, R_W, R_H * R_FRAMES);
  _drawRaiderSheet(ctx);
  return { cols: 1, rows: R_FRAMES, w: R_W, h: R_H };
}

export function drawGeneratorSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, G_W, G_H * G_FRAMES);
  _drawGeneratorSheet(ctx);
  return { cols: 1, rows: G_FRAMES, w: G_W, h: G_H };
}

export function drawPylonSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, P_W, P_H * P_FRAMES);
  _drawPylonSheet(ctx);
  return { cols: 1, rows: P_FRAMES, w: P_W, h: P_H };
}

export function drawThroneSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, TH_W, TH_H * TH_FRAMES);
  for (let i = 0; i < TH_FRAMES; i++) {
    drawThrone(ctx, 0, i * TH_H, i);
  }
  return { cols: 1, rows: TH_FRAMES, w: TH_W, h: TH_H };
}

// ============================================================
// REACT COMPONENT — preview + download
// ============================================================

export default function MechCampaignSprites() {
  const wsRef = useRef<HTMLCanvasElement>(null);
  const wsPv = useRef<HTMLCanvasElement>(null);
  const rdRef = useRef<HTMLCanvasElement>(null);
  const rdPv = useRef<HTMLCanvasElement>(null);
  const gnRef = useRef<HTMLCanvasElement>(null);
  const gnPv = useRef<HTMLCanvasElement>(null);
  const pyRef = useRef<HTMLCanvasElement>(null);
  const pyPv = useRef<HTMLCanvasElement>(null);
  const thRef = useRef<HTMLCanvasElement>(null);
  const thPv = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const renderSheet = (
    ref: React.RefObject<HTMLCanvasElement>,
    pvRef: React.RefObject<HTMLCanvasElement>,
    draw: (ctx: CanvasRenderingContext2D) => { cols: number; rows: number; w: number; h: number },
    info: { w: number; h: number; frames: number },
    scale: number,
    label: string,
  ) => {
    const c = ref.current!;
    c.width = info.w;
    c.height = info.h * info.frames;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    draw(ctx);

    const pv = pvRef.current!;
    const labelH = 14;
    pv.width = info.w * scale + 80;
    pv.height = (info.h * scale + labelH) * info.frames + 10;
    const pCtx = pv.getContext('2d')!;
    pCtx.imageSmoothingEnabled = false;
    pCtx.fillStyle = '#07050c';
    pCtx.fillRect(0, 0, pv.width, pv.height);
    for (let i = 0; i < info.frames; i++) {
      const by = i * (info.h * scale + labelH) + 5;
      pCtx.fillStyle = '#bb9944';
      pCtx.font = 'bold 10px monospace';
      pCtx.fillText(`${label} F${i}`, 4, by + (info.h * scale) / 2 + 4);
      pCtx.save();
      pCtx.translate(80, by);
      pCtx.scale(scale, scale);
      pCtx.drawImage(c, 0, i * info.h, info.w, info.h, 0, 0, info.w, info.h);
      pCtx.restore();
      pCtx.strokeStyle = '#1a1a2a';
      pCtx.strokeRect(80, by, info.w * scale, info.h * scale);
    }
  };

  useEffect(() => {
    renderSheet(wsRef, wsPv, drawWorkshopSheet, { w: WS_W, h: WS_H, frames: WS_FRAMES }, 8, 'Workshop');
    renderSheet(rdRef, rdPv, drawRaiderSheet, { w: R_W, h: R_H, frames: R_FRAMES }, 8, 'Raider');
    renderSheet(gnRef, gnPv, drawGeneratorSheet, { w: G_W, h: G_H, frames: G_FRAMES }, 8, 'Generator');
    renderSheet(pyRef, pyPv, drawPylonSheet, { w: P_W, h: P_H, frames: P_FRAMES }, 8, 'Pylon');
    renderSheet(thRef, thPv, drawThroneSheet, { w: TH_W, h: TH_H, frames: TH_FRAMES }, 3, 'Throne');
    setReady(true);
  }, []);

  const dl = (ref: React.RefObject<HTMLCanvasElement>, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  const section = (
    title: string,
    ref: React.RefObject<HTMLCanvasElement>,
    pvRef: React.RefObject<HTMLCanvasElement>,
    filename: string,
    w: number, h: number, frames: number,
    accent: string,
  ) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <h3 style={{ color: accent, margin: 0, fontSize: 14 }}>{title}</h3>
        {ready && (
          <button
            onClick={dl(ref, filename)}
            style={{
              background: accent, color: '#fff', border: 'none', padding: '4px 12px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download {filename}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <canvas ref={pvRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
        <canvas
          ref={ref}
          data-label={filename.replace('.png', '')}
          data-frame-size={`${w}x${h}`}
          style={{
            imageRendering: 'pixelated',
            width: w * 4,
            border: '1px solid #1a1a2a',
          }}
        />
      </div>
      <div style={{ color: '#665588', fontSize: 9, marginTop: 4 }}>
        {w}×{h} · {frames} frame{frames > 1 ? 's' : ''} · {filename}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#07050c', minHeight: '100vh', padding: 16, fontFamily: 'monospace' }}>
      <h2 style={{ color: '#bb9944', margin: '0 0 16px', fontSize: 16 }}>
        MECH CAMPAIGN SPRITES
      </h2>
      {section('Workshop (Raider Forge)', wsRef, wsPv, 'struct_workshop.png', WS_W, WS_H, WS_FRAMES, '#cc8833')}
      {section('Raider (Walk Cycle)', rdRef, rdPv, 'raider.png', R_W, R_H, R_FRAMES, '#aa7744')}
      {section('Generator (HP States)', gnRef, gnPv, 'struct_generator.png', G_W, G_H, G_FRAMES, '#ff6622')}
      {section('Suppression Pylon', pyRef, pyPv, 'struct_suppression_pylon.png', P_W, P_H, P_FRAMES, '#aa66dd')}
      {section("Voss's Throne", thRef, thPv, 'struct_voss_throne.png', TH_W, TH_H, TH_FRAMES, '#8844bb')}
    </div>
  );
}
