// @ts-nocheck
/**
 * mech_campaign_creeps.tsx — bespoke procedural sprites for the
 * Mechanical campaign creep variants (6 cols × 7 rows = 384×448).
 *
 * Replaces the col-aliasing in CreepSpriteManager so the new
 * mech_* creeps each get their own silhouette (the original bug:
 * "how does the player know they're different?" — all six fell
 * back to col 0). Locked-in concepts (from the 3-option compare):
 *
 *   col 0  mech_scout            (B) — Two-wheel mono-strider
 *   col 1  mech_skiff            (A) — Hover-disc, twin pilots
 *   col 2  mech_light_walker     (B) — Tripod AT-ST walker
 *   col 3  mech_armored_walker   (A) — Four-leg siege walker
 *   col 4  mech_flagship_walker  (A) — Six-leg railcar w/ vent glow
 *   col 5  mech_ace_pilot        (C) — Visor + thruster jet-pilot
 *
 * Mirrors mechanical_creep_sprites.tsx layout. Each draw fn takes
 * (ctx, [ox, oy], frame): frames 0-3 are walk, frames 4-6 are
 * death. 32×32 logical grid, 2× pixel scale → 64×64 frame cells.
 * Bakes to `public/assets/creeps/mech_campaign_creeps.png`.
 */
import { useRef, useEffect, useState } from 'react';

// ===== PALETTE (shared with mechanical_creep_sprites.tsx for visual cohesion) =====
const C = {
  BRASS: '#8a7a44', DK: '#5a4a22', HI: '#bbaa66',
  STEEL: '#888888', DKSTEEL: '#555555', LTSTEEL: '#aaaaaa',
  AMBER: '#ffaa44', DKAMBER: '#cc8822', COPPER: '#aa6633',
  RIVET: '#666666', SMOKE: '#aaaaaa', PIPE: '#777744',
  GLASS: '#aaccdd', MID: '#7a6a34', LBRASS: '#9a8a54',
  VOID: '#3a2a12', WHITE: '#ffffff',
  RED: '#ff4444', VENT_RED: '#ff3322', VENT_GLOW: '#ffaa66',
  GOLD: '#ccaa44', GOLD_LT: '#ffdd88',
  GEAR: '#777766', DKGEAR: '#555544',
  ORANGE: '#ff8833', SHIELD: '#88ccff', DKSHIELD: '#4488bb',
  SPARK: '#ffdd88', WARN: '#ff2222',
};

// ===== DRAWING HELPER =====
const mk = (c: CanvasRenderingContext2D, o: number[], gw: number, gh: number, ps: number) => {
  const p = (x: number, y: number, cl: string) => {
    if (!cl || x < 0 || x >= gw || y < 0 || y >= gh) return;
    c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, ps, ps);
  };
  const b = (x: number, y: number, w: number, h: number, cl: string) => {
    if (!cl) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, w * ps, h * ps);
  };
  return { p, b };
};

// ===== CONSTANTS =====
const PX = 2, GRID = 32, CELL = GRID * PX; // 64×64 cells
const COLS = 6;
const ROWS = 7;
export const SHEET_W = COLS * CELL; // 384
export const SHEET_H = ROWS * CELL; // 448

const CREEP_NAMES = [
  'Scout (mono-strider)',
  'Skiff (hover, twin pilot)',
  'Light Walker (tripod)',
  'Armored Walker (4-leg)',
  'Flagship (6-leg + vent)',
  'Ace Pilot (visor/jet)',
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ============================================================
// COL 0: mech_scout — Horizontal speeder bike
// ============================================================
// REDRAW (v2). v1 was a vertical "stack-of-circles" that didn't
// read as a bike at sprite scale. New composition: low-slung
// horizontal speeder. Big drive wheel in back, small skid wheel
// forward, long handlebars, rider crouched flat over the body.
// Reads FAST and HORIZONTAL — fills the full frame width and
// silhouettes against an empty road.
function drawScout(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const lean = [0, -1, 0, -1][f];  // bob (suspension cycle)
    const spin = f;                   // wheel rotation phase
    const speedF = [0, 1, 2, 1][f];  // speed-line offset cycle

    // ─── REAR DRIVE WHEEL (large, on the right) ───────────
    const rwx = 21, rwy = 18 + lean;
    b(rwx, rwy, 8, 8, C.DKSTEEL);
    b(rwx + 1, rwy + 1, 6, 6, C.STEEL);
    b(rwx + 2, rwy + 2, 4, 4, C.DKSTEEL);
    // hub + bolt
    b(rwx + 3, rwy + 3, 2, 2, C.RIVET);
    p(rwx + 3, rwy + 3, C.LTSTEEL);
    // tread blocks (rotate around perimeter)
    const tBlocks = [[0, 3], [3, 0], [6, 3], [3, 6]];
    const tShift = spin % 4;
    for (let i = 0; i < tBlocks.length; i++) {
      const [tx, ty] = tBlocks[(i + tShift) % 4];
      p(rwx + tx, rwy + ty, C.VOID);
      if (i === 0) p(rwx + tx, rwy + ty + 1, C.VOID);
    }
    // spokes — rotating
    const sb = spin * Math.PI / 2;
    p(rwx + 4 + Math.round(Math.cos(sb) * 3), rwy + 4 + Math.round(Math.sin(sb) * 3), C.LTSTEEL);
    p(rwx + 4 - Math.round(Math.cos(sb) * 3), rwy + 4 - Math.round(Math.sin(sb) * 3), C.LTSTEEL);

    // ─── FRONT SKID WHEEL (small, on the left) ────────────
    const fwx = 4, fwy = 22 + lean;
    b(fwx, fwy, 5, 5, C.DKSTEEL);
    b(fwx + 1, fwy + 1, 3, 3, C.STEEL);
    p(fwx + 2, fwy + 2, C.RIVET);
    // spokes
    p(fwx + 2 + Math.round(Math.cos(sb) * 1), fwy + 2 + Math.round(Math.sin(sb) * 1), C.LTSTEEL);

    // ─── CHASSIS — long horizontal beam ───────────────────
    const chy = 16 + lean;
    // main frame plate
    b(7, chy, 18, 4, C.BRASS);
    b(7, chy, 18, 1, C.LBRASS);          // top highlight
    b(7, chy + 3, 18, 1, C.DK);          // underside shadow
    b(7, chy, 1, 4, C.HI);
    b(24, chy, 1, 4, C.DK);
    // engine cowling (mid-bulge, more detail)
    b(13, chy - 2, 8, 2, C.COPPER);
    b(13, chy - 2, 8, 1, C.HI);
    // exhaust ports — animated glow
    const ePulse = (f % 2 === 0) ? C.AMBER : C.SPARK;
    p(7, chy + 2, ePulse); p(6, chy + 2, C.GLOW);
    p(5, chy + 2, C.SMOKE); p(4, chy + 1, C.SMOKE);
    // engine vent lines
    p(15, chy - 1, C.DKAMBER); p(17, chy - 1, C.DKAMBER); p(19, chy - 1, C.DKAMBER);
    // engine intake
    b(14, chy + 1, 6, 2, C.DKSTEEL);
    p(15, chy + 1, C.AMBER); p(18, chy + 1, C.AMBER);
    // rivets along beam
    p(9, chy, C.RIVET); p(12, chy + 3, C.RIVET);
    p(20, chy, C.RIVET); p(23, chy + 3, C.RIVET);

    // ─── HANDLEBAR (extends forward) ──────────────────────
    // long forward stem
    b(2, chy + 1, 5, 1, C.STEEL);
    p(2, chy, C.LTSTEEL);
    // grip
    b(1, chy - 1, 2, 3, C.DKSTEEL);
    p(1, chy - 1, C.STEEL);
    // brake lever
    p(3, chy - 1, C.STEEL); p(4, chy - 2, C.STEEL);

    // ─── RIDER — crouched flat over the bike ──────────────
    const ry = chy - 4;
    // helmet (aerodynamic, forward-tilted)
    b(11, ry, 6, 4, C.BRASS);
    b(11, ry, 6, 1, C.HI);
    b(11, ry, 1, 4, C.LBRASS);
    b(16, ry + 1, 1, 3, C.DK);
    // forward-pointing visor band (the rider is looking FORWARD)
    b(10, ry + 1, 4, 2, C.DKSTEEL);
    b(10, ry + 2, 4, 1, C.AMBER);
    p(10, ry + 2, C.SPARK); p(11, ry + 2, C.WHITE);
    // helmet rear fin (aerodynamic)
    p(17, ry, C.HI); p(18, ry + 1, C.DK);
    // torso — leaning forward
    b(13, ry + 4, 6, 4, C.COPPER);
    b(13, ry + 4, 1, 4, C.HI);
    b(18, ry + 4, 1, 4, C.DK);
    // racing stripe down the back
    b(14, ry + 4, 1, 4, C.AMBER);
    b(15, ry + 5, 1, 2, C.SPARK);
    // shoulder/arm reaching forward to handlebar
    b(9, ry + 4, 4, 2, C.COPPER);
    b(9, ry + 4, 4, 1, C.HI);
    b(6, ry + 5, 3, 2, C.COPPER);
    p(5, ry + 5, C.COPPER); // hand on grip
    // rear arm (closer, slightly bent at engine)
    b(18, ry + 5, 3, 2, C.DK);
    // legs tucked along the chassis
    b(19, ry + 8, 3, 3, C.COPPER);
    b(19, ry + 8, 1, 3, C.HI);
    b(20, ry + 11, 2, 2, C.DKAMBER);

    // ─── MOTION — speed lines (very prominent) ────────────
    // long horizontal streaks trailing behind the bike
    b(1 - speedF, chy, 4, 1, C.AMBER);
    b(2 - speedF, chy + 2, 3, 1, C.SPARK);
    p(0, chy + 4, C.SMOKE);
    // exhaust plume
    p(9 + speedF, rwy + 8, C.SMOKE); p(11 + speedF, rwy + 7, C.SMOKE);
    p(6 + speedF, rwy + 6, C.SMOKE);
    // dust kicked up by wheels
    p(rwx - 1, rwy + 9, C.SMOKE);
    p(fwx + 5, fwy + 5, C.SMOKE);
    // shadow under bike
    b(5, 30, 22, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 18);
  }
}

// ============================================================
// COL 1: mech_skiff — Hover-disc w/ twin pilots
// ============================================================
// Wide low oval hover-platform, two helmeted heads peek above. Soft
// blue glow underneath = hover-thrust. Reads GROUPED (two pilots),
// LOW-PROFILE (no legs), faster than walkers.
function drawSkiff(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f]; // hover bob
    const cy = 14 + bob;
    // Disc top edge
    b(8, cy, 16, 1, C.HI);
    b(7, cy + 1, 18, 1, C.BRASS);
    // Disc body
    b(6, cy + 2, 20, 4, C.BRASS);
    b(6, cy + 2, 20, 1, C.LBRASS); // top highlight
    b(6, cy + 5, 20, 1, C.DK);     // bottom shadow
    // Disc rim
    b(5, cy + 3, 1, 2, C.MID);
    b(26, cy + 3, 1, 2, C.DK);
    // Twin pilots — small helmeted heads sticking up
    // Left pilot
    b(11, cy - 4, 4, 4, C.STEEL);
    b(11, cy - 4, 4, 1, C.LTSTEEL);
    b(12, cy - 2, 2, 2, C.GLASS); // visor
    p(12, cy - 2, C.WHITE);
    // Right pilot
    b(17, cy - 4, 4, 4, C.STEEL);
    b(17, cy - 4, 4, 1, C.LTSTEEL);
    b(18, cy - 2, 2, 2, C.GLASS);
    p(18, cy - 2, C.WHITE);
    // Antenna tips
    p(13, cy - 5, C.AMBER); p(19, cy - 5, C.AMBER);
    // Coupling between pilots (rail/grab handle)
    b(15, cy - 2, 2, 1, C.RIVET);
    // Underbelly (slightly recessed)
    b(8, cy + 6, 16, 1, C.VOID);
    // Hover glow plume — animated phase
    const glow1 = f % 2 === 0 ? C.SHIELD : C.DKSHIELD;
    const glow2 = f % 2 === 0 ? C.DKSHIELD : C.SHIELD;
    b(9, cy + 7, 14, 1, glow1);
    b(10, cy + 8, 12, 1, glow2);
    b(12, cy + 9, 8, 1, glow1);
    p(13, cy + 10, glow2); p(18, cy + 10, glow2);
    p(15, cy + 10, C.WHITE); p(16, cy + 10, C.WHITE);
    // Drifting dust on the ground
    p(8 + f, 28, C.SMOKE); p(22 - f, 28, C.SMOKE);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 2: mech_light_walker — Tripod AT-ST walker
// ============================================================
// Boxy cabin on three articulated legs (front-center + two rear).
// Reads as WORKHORSE — standard infantry, mid-armored, walks slow.
function drawLightWalker(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];  // front leg sway
    const legB = [0, -1, 0, 1][f];  // back legs counter-sway
    const by = 4 + bob;
    // Cabin — boxy, sloped front
    b(11, by, 10, 8, C.BRASS);
    b(11, by, 10, 1, C.HI);
    b(11, by, 1, 8, C.HI);
    b(20, by + 1, 1, 7, C.DK);
    b(11, by + 7, 10, 1, C.DK);
    // Sloped windshield
    b(12, by + 1, 8, 1, C.LBRASS);
    b(13, by + 2, 6, 3, C.DKSTEEL);
    b(14, by + 3, 4, 1, C.GLASS); // viewport
    p(14, by + 3, C.AMBER); p(17, by + 3, C.AMBER); // pilot's eyes
    // Side panels — rivets
    p(11, by + 4, C.RIVET); p(20, by + 4, C.RIVET);
    p(11, by + 6, C.RIVET); p(20, by + 6, C.RIVET);
    // Top antenna/aerial
    p(15, by - 1, C.STEEL); p(15, by - 2, C.AMBER);
    // Hip block (where legs attach)
    b(12, by + 8, 8, 2, C.DKSTEEL);
    b(12, by + 8, 8, 1, C.STEEL);
    // FRONT-CENTER leg (tripod's "kicker")
    const fx = 15 + legA;
    b(fx, by + 10, 2, 6, C.STEEL);
    b(fx, by + 10, 1, 6, C.LTSTEEL);
    // knee
    b(fx - 1, by + 16, 4, 1, C.DKSTEEL);
    // shin → foot
    b(fx + legA, by + 17, 2, 5, C.STEEL);
    b(fx + legA - 1, by + 22, 4, 2, C.DKSTEEL);
    p(fx + legA, by + 23, C.VOID);
    // REAR-LEFT leg
    const rlx = 11 + legB;
    b(rlx, by + 10, 2, 6, C.BRASS);
    b(rlx, by + 10, 1, 6, C.HI);
    b(rlx - 1, by + 16, 4, 1, C.DK);
    b(rlx, by + 17, 2, 5, C.BRASS);
    b(rlx - 1, by + 22, 4, 2, C.DKSTEEL);
    // REAR-RIGHT leg
    const rrx = 19 - legB;
    b(rrx, by + 10, 2, 6, C.BRASS);
    b(rrx, by + 10, 1, 6, C.DK);
    b(rrx - 1, by + 16, 4, 1, C.DK);
    b(rrx, by + 17, 2, 5, C.BRASS);
    b(rrx - 1, by + 22, 4, 2, C.DKSTEEL);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 3: mech_armored_walker — Four-leg siege walker
// ============================================================
// Stocky quadruped with thick armor plates over the body. Heavy
// rivets, low-slung "tank-on-legs" silhouette. Reads HEAVY +
// SLOW (the four-leg gait suggests planted, stable, hard to flank).
function drawArmoredWalker(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f]; // slow heavy bob (only one frame dips)
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 8 + bob;
    // Main armored body — wide, low
    b(6, by, 20, 9, C.STEEL);
    b(6, by, 20, 1, C.LTSTEEL); // top highlight
    b(6, by + 8, 20, 1, C.DKSTEEL);
    b(6, by, 1, 9, C.LTSTEEL);
    b(25, by, 1, 9, C.DKSTEEL);
    // Armor plates — front, mid, rear (layered look)
    b(7, by + 1, 6, 4, C.DKSTEEL);
    b(7, by + 1, 6, 1, C.STEEL);
    b(13, by + 1, 6, 4, C.DKSTEEL);
    b(13, by + 1, 6, 1, C.STEEL);
    b(19, by + 1, 6, 4, C.DKSTEEL);
    b(19, by + 1, 6, 1, C.STEEL);
    // Center turret / cupola
    b(13, by - 3, 6, 4, C.BRASS);
    b(13, by - 3, 6, 1, C.HI);
    b(13, by - 3, 1, 4, C.HI);
    b(18, by - 2, 1, 3, C.DK);
    // Turret viewport
    b(14, by - 1, 4, 1, C.AMBER);
    p(15, by - 1, C.WHITE);
    // Turret antenna
    p(16, by - 4, C.STEEL); p(16, by - 5, C.AMBER);
    // Heavy rivets on side plates
    for (let rx = 8; rx < 25; rx += 3) {
      p(rx, by + 2, C.RIVET); p(rx, by + 6, C.RIVET);
    }
    // Hip joints
    b(7, by + 9, 4, 1, C.DKSTEEL);
    b(13, by + 9, 6, 1, C.DKSTEEL);
    b(21, by + 9, 4, 1, C.DKSTEEL);
    // FOUR LEGS — front-left, front-right, rear-left, rear-right
    // Thick, planted stance.
    function leg(lx: number, off: number, accentDark: boolean) {
      const col = accentDark ? C.DKSTEEL : C.STEEL;
      const hi = accentDark ? C.STEEL : C.LTSTEEL;
      b(lx, by + 10, 3, 5, col);
      b(lx, by + 10, 1, 5, hi);
      // knee
      b(lx - 1, by + 15, 5, 1, C.RIVET);
      // shin
      b(lx + off, by + 16, 3, 5, col);
      b(lx + off, by + 16, 1, 5, hi);
      // foot
      b(lx + off - 1, by + 21, 5, 2, C.VOID);
      b(lx + off, by + 21, 3, 1, C.DKSTEEL);
    }
    leg(7, legA, false);
    leg(12, legB, true);
    leg(17, legA, true);
    leg(22, legB, false);
  } else {
    drawDeathMech(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// COL 4: mech_flagship_walker — Six-leg railcar walker w/ red vent
// ============================================================
// Very wide horizontal "railcar" hull on six legs (3 per side). Red
// vent slits glow on the hull side — these are the gameplay's
// `mech_pylon_vent_armor` feature: visually broadcast the trait.
// While Pylons are alive, vents *visually* glow brighter (we just
// keep them lit at base intensity in the sprite; trait does the
// armor math). Boss-tier scale.
function drawFlagship(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const legC = [0, 0, 1, 0][f];
    const by = 4 + bob;

    // Wide railcar hull (28 wide × 9 tall — fills near-edge to edge)
    b(2, by, 28, 10, C.BRASS);
    b(2, by, 28, 1, C.LBRASS);
    b(2, by + 9, 28, 1, C.DK);
    b(2, by, 1, 10, C.HI);
    b(29, by, 1, 10, C.DK);
    // Hull panel seams
    b(10, by + 1, 1, 8, C.MID);
    b(20, by + 1, 1, 8, C.MID);
    // Top deck — central command tower
    b(13, by - 4, 6, 4, C.STEEL);
    b(13, by - 4, 6, 1, C.LTSTEEL);
    b(13, by - 4, 1, 4, C.LTSTEEL);
    b(18, by - 3, 1, 3, C.DKSTEEL);
    // Tower viewport
    b(14, by - 2, 4, 1, C.AMBER);
    p(15, by - 2, C.WHITE); p(16, by - 2, C.WHITE);
    // Tower spire + flagship aerial
    p(15, by - 5, C.RIVET); p(15, by - 6, C.RED);
    p(16, by - 5, C.RIVET); p(16, by - 7, C.WARN);
    // Twin stack vents on hull top (steamy flagship feel)
    b(5, by - 2, 2, 2, C.DKSTEEL);
    b(5, by - 2, 2, 1, C.STEEL);
    p(5, by - 3, C.SMOKE); p(6, by - 4, C.SMOKE);
    b(25, by - 2, 2, 2, C.DKSTEEL);
    b(25, by - 2, 2, 1, C.STEEL);
    p(26, by - 3, C.SMOKE); p(25, by - 4, C.SMOKE);
    // SIDE VENT SLITS — the visual cue for the vent-armor trait.
    // Three glowing red horizontal slits across the hull side.
    // Animate slightly: brighter on odd frames so they pulse.
    const ventLit = (f % 2 === 0) ? C.VENT_RED : C.VENT_GLOW;
    const ventDim = (f % 2 === 0) ? C.VENT_GLOW : C.VENT_RED;
    // Left vent
    b(4, by + 5, 4, 1, ventLit);
    b(4, by + 6, 4, 1, ventDim);
    p(5, by + 7, C.VENT_RED);
    // Mid vent
    b(13, by + 5, 6, 1, ventLit);
    b(13, by + 6, 6, 1, ventDim);
    p(15, by + 7, C.VENT_RED); p(17, by + 7, C.VENT_RED);
    // Right vent
    b(24, by + 5, 4, 1, ventLit);
    b(24, by + 6, 4, 1, ventDim);
    p(26, by + 7, C.VENT_RED);
    // Hull rivets
    for (let rx = 3; rx < 30; rx += 3) {
      p(rx, by + 1, C.RIVET); p(rx, by + 8, C.RIVET);
    }
    // Hip rail (legs attach here)
    b(2, by + 10, 28, 1, C.DKSTEEL);

    // SIX LEGS — three per side. Front, mid, rear. Counter-phased.
    function leg6(lx: number, off: number) {
      b(lx, by + 11, 2, 5, C.STEEL);
      b(lx, by + 11, 1, 5, C.LTSTEEL);
      b(lx - 1, by + 16, 4, 1, C.RIVET);
      b(lx + off, by + 17, 2, 4, C.STEEL);
      b(lx + off, by + 17, 1, 4, C.LTSTEEL);
      b(lx + off - 1, by + 21, 4, 2, C.VOID);
      b(lx + off, by + 21, 2, 1, C.DKSTEEL);
    }
    leg6(4, legA);
    leg6(10, legB);
    leg6(15, legC);
    leg6(20, legA);
    leg6(24, legB);
    leg6(27, legC);
    // Ground shadow
    b(3, 30, 26, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 18);
  }
}

// ============================================================
// COL 5: mech_ace_pilot — Heroic jet-ace
// ============================================================
// REDRAW (v2). v1 was a small generic robot with a halo. New
// composition pushes the named-boss read with:
//   - Larger 6×6 chest emblem (gold ace insignia "1" pip) — visible
//     even at 40% game scale, the signature feature
//   - Flowing scarf streaming behind on every walk frame
//   - Asymmetric pose: extended forward arm holding a sidearm/baton,
//     read as "leader giving an order"
//   - Helmet with extended crest fin (more silhouette)
//   - Cape billowing from shoulders + dynamic flame plume below
// Reads as HERO + FAST. Distinct silhouette: tall + crest + scarf
// tail trailing left + thruster plume below.
function drawAcePilot(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f]; // hover bob
    const scarfWave = [0, 1, 2, 1][f]; // scarf cycle
    const cy = 4 + bob;

    // ─── SHIELD BUBBLE (drawn behind everything) ─────────
    const shieldPulse = (f % 2 === 0) ? C.SHIELD : C.DKSHIELD;
    // upper arc
    b(9, cy + 2, 14, 1, shieldPulse);
    p(8, cy + 3, shieldPulse); p(23, cy + 3, shieldPulse);
    // sides
    b(7, cy + 4, 1, 14, shieldPulse);
    b(24, cy + 4, 1, 14, shieldPulse);
    // lower arc
    p(8, cy + 18, shieldPulse); p(23, cy + 18, shieldPulse);
    b(9, cy + 19, 14, 1, shieldPulse);
    // hex-grid energy specks
    p(11, cy + 6, shieldPulse); p(20, cy + 8, shieldPulse);
    p(9, cy + 13, shieldPulse); p(22, cy + 15, shieldPulse);

    // ─── CAPE / SCARF — behind the body, flowing back ────
    // Long scarf tail trailing to the left (back of stride)
    const sx = 6 - scarfWave;
    b(sx, cy + 8, 4, 2, C.RED);
    b(sx, cy + 8, 4, 1, C.GOLD_LT);
    p(sx - 1, cy + 9, C.RED);
    p(sx + scarfWave, cy + 10, C.RED);
    p(sx + 1, cy + 11, C.RED);
    // shoulder cape
    b(10, cy + 7, 3, 6, C.RED);
    b(10, cy + 7, 3, 1, C.VENT_GLOW);
    p(10, cy + 12, C.RED);

    // ─── HELMET — with prominent crest fin ───────────────
    b(12, cy, 8, 6, C.DKSTEEL);
    b(12, cy, 8, 1, C.STEEL);
    b(12, cy, 1, 6, C.LTSTEEL);
    b(19, cy + 1, 1, 5, C.VOID);
    // Crest fin (extends 3 pixels up — silhouette anchor)
    b(15, cy - 3, 2, 1, C.GOLD);
    b(15, cy - 2, 2, 1, C.GOLD_LT);
    b(15, cy - 1, 2, 1, C.AMBER);
    p(14, cy - 1, C.AMBER); p(17, cy - 1, C.AMBER);
    // Visor band — bright wraparound
    b(13, cy + 2, 6, 2, C.GLASS);
    b(13, cy + 2, 6, 1, C.WHITE);
    p(14, cy + 3, C.SHIELD); p(15, cy + 3, C.WHITE);
    p(17, cy + 3, C.SHIELD); p(18, cy + 3, C.WHITE);
    // jaw guard
    b(13, cy + 4, 6, 1, C.STEEL);
    b(14, cy + 5, 4, 1, C.DKSTEEL);

    // ─── TORSO — sleek with LARGE ace emblem ─────────────
    b(12, cy + 6, 8, 8, C.STEEL);
    b(12, cy + 6, 8, 1, C.LTSTEEL);
    b(12, cy + 6, 1, 8, C.LTSTEEL);
    b(19, cy + 7, 1, 7, C.DKSTEEL);
    b(12, cy + 13, 8, 1, C.DKSTEEL);
    // LARGE chest emblem — 6×6 with gold-ringed dark-center "1" pip
    // (the signature feature — must read at 40% scale)
    b(13, cy + 7, 6, 6, C.DKSTEEL);
    b(13, cy + 7, 6, 1, C.GOLD);
    b(13, cy + 12, 6, 1, C.GOLD);
    b(13, cy + 7, 1, 6, C.GOLD);
    b(18, cy + 7, 1, 6, C.GOLD);
    // central single-pip (snake-eye "1" — campaign tie + ace nod)
    b(15, cy + 9, 2, 2, C.AMBER);
    p(15, cy + 9, C.GOLD_LT); p(16, cy + 10, C.WHITE);
    // gleam highlight (animated)
    if (f % 2 === 0) p(13, cy + 8, C.GOLD_LT);
    else p(18, cy + 11, C.GOLD_LT);

    // ─── PAULDRONS — sharper, more heroic ────────────────
    b(9, cy + 6, 3, 4, C.GOLD);
    b(9, cy + 6, 3, 1, C.GOLD_LT);
    b(9, cy + 6, 1, 4, C.WHITE);
    p(11, cy + 9, C.DKAMBER);
    b(20, cy + 6, 3, 4, C.GOLD);
    b(20, cy + 6, 3, 1, C.GOLD_LT);
    b(22, cy + 7, 1, 3, C.COPPER);
    // pauldron spikes (signature jagged edge)
    p(8, cy + 6, C.GOLD); p(8, cy + 7, C.GOLD_LT);
    p(23, cy + 6, C.GOLD); p(23, cy + 7, C.GOLD_LT);

    // ─── ARMS — extended forward pose ────────────────────
    // Left arm extended forward (giving an order)
    b(8, cy + 10, 2, 3, C.STEEL);
    b(8, cy + 10, 1, 3, C.LTSTEEL);
    b(6, cy + 12, 3, 2, C.STEEL);
    // sidearm/baton in hand
    b(3, cy + 12, 4, 2, C.DKSTEEL);
    b(3, cy + 12, 4, 1, C.STEEL);
    p(2, cy + 13, C.DKSTEEL);
    // muzzle glow
    p(2, cy + 12, (f % 2 === 0) ? C.AMBER : C.SPARK);
    // Right arm at side (closer to body)
    b(20, cy + 10, 2, 3, C.STEEL);
    p(21, cy + 12, C.DKSTEEL);

    // ─── HIP / BELT (gold trim) ──────────────────────────
    b(12, cy + 14, 8, 2, C.DKSTEEL);
    b(12, cy + 14, 8, 1, C.GOLD);
    b(15, cy + 14, 2, 2, C.GOLD_LT); // buckle
    p(15, cy + 15, C.AMBER);

    // ─── THRUSTER PODS (more prominent than v1) ──────────
    b(10, cy + 16, 4, 3, C.DKSTEEL);
    b(10, cy + 16, 4, 1, C.STEEL);
    b(11, cy + 17, 2, 1, C.AMBER); // intake glow
    b(18, cy + 16, 4, 3, C.DKSTEEL);
    b(18, cy + 16, 4, 1, C.STEEL);
    b(19, cy + 17, 2, 1, C.AMBER);

    // ─── LARGE jet flame plumes ──────────────────────────
    const flame1 = (f % 2 === 0) ? C.VENT_GLOW : C.AMBER;
    const flame2 = (f % 2 === 0) ? C.AMBER : C.SPARK;
    // Left plume
    b(10, cy + 19, 4, 2, C.AMBER);
    b(11, cy + 21, 2, 2, flame1);
    b(11, cy + 23, 2, 1, flame2);
    p(12, cy + 25, C.WHITE);
    // Right plume
    b(18, cy + 19, 4, 2, C.AMBER);
    b(19, cy + 21, 2, 2, flame1);
    b(19, cy + 23, 2, 1, flame2);
    p(20, cy + 25, C.WHITE);
    // Centre exhaust trail (between plumes)
    p(15, cy + 19, flame2); p(16, cy + 19, flame2);
    p(15, cy + 21, flame1); p(16, cy + 21, flame1);
    p(15, cy + 23, flame2); p(16, cy + 24, C.AMBER);
  } else {
    drawDeathMech(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// Shared death animation (mirrors mechanical_creep_sprites.tsx)
// ============================================================
function drawDeathMech(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  // REDRAW (v2): expanded from the slim original into a denser
  // 3-stage debris field matching the density of
  // `mechanical_creep_sprites.tsx`'s drawDeathMech.
  if (deathFrame === 0) {
    // Frame 0: sparks fly, body breaking apart
    b(cx - 4, cy - 4, 10, 10, C.BRASS);
    b(cx - 3, cy - 5, 8, 2, C.BRASS);
    b(cx - 2, cy - 6, 6, 1, C.HI);
    b(cx - 3, cy + 6, 8, 2, C.DK);
    b(cx - 2, cy + 7, 4, 1, C.VOID);
    // shading
    b(cx - 4, cy - 4, 2, 10, C.HI);
    b(cx + 4, cy - 2, 2, 8, C.DK);
    // crack / break lines fanning out
    p(cx, cy - 5, C.SPARK); p(cx + 1, cy - 4, C.AMBER);
    p(cx + 2, cy - 3, C.SPARK); p(cx + 3, cy - 2, C.AMBER);
    p(cx - 2, cy - 3, C.AMBER); p(cx - 3, cy - 2, C.SPARK);
    p(cx - 1, cy, C.AMBER); p(cx + 3, cy, C.SPARK);
    p(cx - 3, cy + 1, C.SPARK); p(cx + 1, cy + 1, C.AMBER);
    p(cx, cy + 2, C.SPARK); p(cx - 2, cy + 3, C.AMBER);
    p(cx + 2, cy + 3, C.AMBER); p(cx + 4, cy + 2, C.AMBER);
    // sparks flying outward
    p(cx - 6, cy - 3, C.SPARK); p(cx + 7, cy - 4, C.SPARK);
    p(cx - 5, cy + 5, C.AMBER); p(cx + 6, cy + 4, C.AMBER);
    p(cx - 7, cy + 1, C.SPARK); p(cx + 8, cy + 1, C.SPARK);
    // glow at centre
    b(cx - 1, cy - 1, 3, 3, C.AMBER);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.SPARK); p(cx + 1, cy, C.SPARK);
  } else if (deathFrame === 1) {
    // Frame 1: parts flying apart, big debris field
    // large fragments around perimeter
    b(cx - 6, cy - 6, 3, 2, C.BRASS); p(cx - 6, cy - 6, C.HI);
    b(cx + 5, cy - 6, 2, 2, C.STEEL); p(cx + 6, cy - 6, C.LTSTEEL);
    b(cx - 7, cy - 1, 2, 2, C.BRASS); p(cx - 7, cy - 1, C.HI);
    b(cx + 6, cy - 1, 2, 3, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.DKSTEEL);
    b(cx + 5, cy + 5, 3, 2, C.BRASS); p(cx + 7, cy + 6, C.DK);
    b(cx - 1, cy - 7, 2, 2, C.STEEL); p(cx, cy - 7, C.LTSTEEL);
    b(cx - 1, cy + 6, 2, 2, C.DK);
    // gears + screws scattered
    p(cx - 3, cy - 3, C.GEAR); p(cx + 3, cy - 3, C.RIVET);
    p(cx - 3, cy + 3, C.RIVET); p(cx + 3, cy + 3, C.GEAR);
    p(cx - 2, cy - 1, C.COPPER); p(cx + 2, cy + 1, C.COPPER);
    p(cx - 4, cy, C.GEAR); p(cx + 4, cy, C.GEAR);
    // sparks
    p(cx - 4, cy - 4, C.SPARK); p(cx + 4, cy - 4, C.SPARK);
    p(cx - 4, cy + 4, C.AMBER); p(cx + 4, cy + 4, C.AMBER);
    p(cx - 8, cy + 2, C.SPARK); p(cx + 9, cy + 2, C.SPARK);
    // centre flash
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: settled pile of gears, dust fading
    // scattered tiny debris
    p(cx - 2, cy + 2, C.GEAR); p(cx + 1, cy + 3, C.RIVET);
    p(cx - 1, cy + 3, C.DKSTEEL); p(cx + 2, cy + 2, C.GEAR);
    p(cx, cy + 4, C.RIVET); p(cx + 3, cy + 3, C.DKSTEEL);
    p(cx - 3, cy + 3, C.RIVET);
    // small pile at centre bottom
    b(cx - 2, cy + 1, 5, 2, C.DKSTEEL);
    b(cx - 1, cy + 1, 3, 1, C.STEEL);
    p(cx, cy + 1, C.RIVET); p(cx + 1, cy + 2, C.GEAR);
    // wider scattered fragments
    p(cx - 5, cy + 4, C.BRASS); p(cx + 5, cy + 4, C.DKSTEEL);
    p(cx - 6, cy + 2, C.GEAR);
    // fading dust around the pile
    p(cx - 8, cy - 4, C.SMOKE); p(cx + 9, cy - 5, C.SMOKE);
    p(cx - 5, cy + 7, C.SMOKE); p(cx + 6, cy + 8, C.SMOKE);
    p(cx, cy - 9, C.SMOKE); p(cx + 2, cy + 9, C.SMOKE);
    p(cx - 4, cy - 7, C.SMOKE);
    // last spark embers
    p(cx - 6, cy - 7, C.SPARK); p(cx + 7, cy - 7, C.DKAMBER);
    p(cx - 2, cy - 5, C.AMBER);
  }
}

// ===== ROUTING =====
const DRAW_FNS = [drawScout, drawSkiff, drawLightWalker, drawArmoredWalker, drawFlagship, drawAcePilot];

export function drawMechCampaignCreepSheet(ctx: CanvasRenderingContext2D) {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], row);
    }
  }
}

export const MECH_CAMPAIGN_CREEP_SHEET_DIMS = { W: SHEET_W, H: 1, FRAMES: SHEET_H };

// ===== COMPONENT (browser preview) =====
export default function MechCampaignCreepSprites() {
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sc = sheetRef.current!;
    sc.width = SHEET_W;
    sc.height = SHEET_H;
    const sctx = sc.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    drawMechCampaignCreepSheet(sctx);

    // Preview at 3× with labels
    const pv = previewRef.current!;
    const S = 3, LW = 100, LH = 14;
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#1a1408';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = C.AMBER;
      pc.font = 'bold 10px monospace';
      pc.fillText(ROW_NAMES[r], 4, by + CELL * S / 2 + 3);
      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, bx, by, CELL * S, CELL * S);
      }
    }
    // Column labels
    pc.fillStyle = C.HI;
    pc.font = 'bold 9px monospace';
    for (let cc = 0; cc < COLS; cc++) {
      pc.save();
      pc.translate(LW + cc * CELL * S + CELL * S / 2, ROWS * (CELL * S + LH) + 8);
      pc.fillText(CREEP_NAMES[cc], -40, 0);
      pc.restore();
    }
    setReady(true);
  }, []);

  const download = () => {
    const a = document.createElement('a');
    a.download = 'mech_campaign_creeps.png';
    a.href = sheetRef.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 16, background: '#0a0805', minHeight: '100vh', color: C.AMBER }}>
      <h1>Mech Campaign Creep Sprites</h1>
      <p>6 cols × 7 rows = {SHEET_W}×{SHEET_H} sheet. Each col is a bespoke campaign creep variant.</p>
      <button onClick={download} disabled={!ready}>Download mech_campaign_creeps.png</button>
      <canvas ref={sheetRef} style={{ display: 'none' }} />
      <canvas ref={previewRef} style={{ marginTop: 16, border: '1px solid #444' }} />
    </div>
  );
}
