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
// COL 0: mech_scout — Two-wheel mono-strider (motorcycle silhouette)
// ============================================================
// A vertical "Segway-on-wheels" rider: top wheel, frame post, lower
// wheel. Slim rider hunched between. Reads as FAST + thin profile.
function drawScout(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const lean = [0, 0, 1, 0][f];   // forward-lean sway
    const spin = f;                  // wheel rotation phase
    // Top wheel (smaller — handlebar wheel)
    const twy = 4;
    b(13 + lean, twy, 6, 6, C.DKSTEEL);
    b(14 + lean, twy + 1, 4, 4, C.STEEL);
    // wheel spokes — rotate phase
    const sa = (spin) * Math.PI / 2;
    p(16 + lean + Math.round(Math.cos(sa) * 2), twy + 2 + Math.round(Math.sin(sa) * 2), C.LTSTEEL);
    p(16 + lean - Math.round(Math.cos(sa) * 2), twy + 2 - Math.round(Math.sin(sa) * 2), C.LTSTEEL);
    p(16 + lean, twy + 2, C.RIVET);
    // Frame post running top wheel → lower wheel
    b(15 + lean, twy + 6, 2, 12, C.BRASS);
    b(15 + lean, twy + 6, 1, 12, C.HI);
    // Handle / steering forks (jut left-right of top wheel)
    b(11 + lean, twy + 3, 2, 1, C.STEEL); p(11 + lean, twy + 3, C.LTSTEEL);
    b(19 + lean, twy + 3, 2, 1, C.DKSTEEL);
    // Rider — slim, hunched over frame
    // helmet
    b(14, 9, 4, 3, C.BRASS); b(14, 9, 4, 1, C.HI);
    p(15, 10, C.AMBER); p(16, 10, C.AMBER); // visor
    // torso lean
    b(13, 12, 6, 5, C.COPPER);
    b(13, 12, 1, 5, C.HI); b(18, 13, 1, 4, C.DK);
    b(14, 13, 4, 1, C.DKAMBER); // chest band
    // arms gripping handlebars
    b(11, 12, 2, 2, C.BRASS); b(11, 12, 1, 2, C.HI);
    b(19, 12, 2, 2, C.DK);
    // Lower wheel (larger — drive wheel)
    const bwy = 22;
    b(11, bwy, 10, 8, C.DKSTEEL);
    b(12, bwy + 1, 8, 6, C.STEEL);
    b(13, bwy + 2, 6, 4, C.DKSTEEL);
    p(16, bwy + 3, C.RIVET); p(16, bwy + 4, C.RIVET); // hub
    // tread blocks rotate with phase
    const tx0 = 12 + ((spin + 0) % 4);
    const tx1 = 12 + ((spin + 2) % 4);
    p(tx0, bwy, C.VOID); p(tx0 + 4, bwy + 7, C.VOID);
    p(tx1 + 4, bwy, C.VOID); p(tx1, bwy + 7, C.VOID);
    // spokes
    const sb = spin * Math.PI / 2;
    p(16 + Math.round(Math.cos(sb) * 3), bwy + 3 + Math.round(Math.sin(sb) * 2), C.LTSTEEL);
    p(16 - Math.round(Math.cos(sb) * 3), bwy + 3 - Math.round(Math.sin(sb) * 2), C.LTSTEEL);
    // Speed lines off the back (scout = fast)
    p(7, 18, C.AMBER); p(8, 19, C.SPARK); p(6, 20, C.AMBER);
    p(9, 21, C.SPARK);
    // shadow
    b(13, 30, 6, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 16);
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
// COL 5: mech_ace_pilot — Visor + thrusters, hover-step
// ============================================================
// Hero-pilot silhouette. Slim humanoid with a wraparound visor
// helmet, sleek body suit, twin jet thrusters at the hip blasting
// downward. Translucent shield bubble (shield trait). Faster, more
// elegant than the heavy walkers — named-boss read.
function drawAcePilot(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f]; // hover bob
    const cy = 6 + bob;
    // Shield bubble (drawn FIRST, behind body)
    const shieldPulse = (f % 2 === 0) ? C.SHIELD : C.DKSHIELD;
    // ring outline
    b(8, cy + 2, 16, 1, shieldPulse);
    b(7, cy + 3, 1, 14, shieldPulse);
    b(24, cy + 3, 1, 14, shieldPulse);
    b(8, cy + 17, 16, 1, shieldPulse);
    // soft inner glow specks
    p(10, cy + 5, shieldPulse);
    p(22, cy + 14, shieldPulse);

    // Helmet — wraparound visor
    b(12, cy, 8, 6, C.DKSTEEL);
    b(12, cy, 8, 1, C.STEEL);
    b(12, cy, 1, 6, C.STEEL);
    // Visor band — bright cyan reflection across forehead
    b(13, cy + 1, 6, 2, C.GLASS);
    b(13, cy + 1, 6, 1, C.WHITE);
    p(14, cy + 2, C.SHIELD); p(17, cy + 2, C.SHIELD);
    // helmet crest fin
    p(15, cy - 1, C.STEEL); p(16, cy - 1, C.STEEL);
    p(16, cy - 2, C.AMBER);
    // chin guard
    b(13, cy + 4, 6, 1, C.STEEL);
    p(15, cy + 5, C.DKSTEEL); p(16, cy + 5, C.DKSTEEL);

    // Torso — sleek bodysuit with chest emblem
    b(12, cy + 6, 8, 8, C.STEEL);
    b(12, cy + 6, 8, 1, C.LTSTEEL);
    b(12, cy + 6, 1, 8, C.LTSTEEL);
    b(19, cy + 7, 1, 7, C.DKSTEEL);
    b(12, cy + 13, 8, 1, C.DKSTEEL);
    // Chest emblem (ace insignia — diamond + amber pip)
    b(15, cy + 8, 2, 3, C.DKSTEEL);
    p(15, cy + 9, C.AMBER); p(16, cy + 9, C.AMBER);
    p(15, cy + 10, C.WHITE);
    // Shoulder pauldrons
    b(10, cy + 6, 2, 3, C.BRASS);
    b(10, cy + 6, 1, 3, C.HI);
    b(20, cy + 6, 2, 3, C.DK);
    b(21, cy + 7, 1, 2, C.VOID);
    // Arms (close to body, jet-pose)
    b(11, cy + 9, 2, 4, C.STEEL);
    b(19, cy + 9, 2, 4, C.STEEL);
    p(11, cy + 9, C.LTSTEEL); p(20, cy + 9, C.DKSTEEL);
    // Hip / belt
    b(12, cy + 14, 8, 2, C.DKSTEEL);
    b(12, cy + 14, 8, 1, C.STEEL);
    p(15, cy + 15, C.AMBER); p(16, cy + 15, C.AMBER);

    // Twin thrusters — jet pods on either hip (no legs — hovers)
    b(10, cy + 16, 3, 3, C.DKSTEEL);
    b(10, cy + 16, 3, 1, C.STEEL);
    b(19, cy + 16, 3, 3, C.DKSTEEL);
    b(19, cy + 16, 3, 1, C.STEEL);
    // jet flames (animate phase)
    const flame1 = (f % 2 === 0) ? C.AMBER : C.SPARK;
    const flame2 = (f % 2 === 0) ? C.SPARK : C.AMBER;
    b(10, cy + 19, 3, 2, flame1);
    b(11, cy + 21, 1, 2, flame2);
    p(11, cy + 23, C.WHITE);
    b(19, cy + 19, 3, 2, flame1);
    b(20, cy + 21, 1, 2, flame2);
    p(20, cy + 23, C.WHITE);
    // Center exhaust trail (extra panache)
    p(15, cy + 19, flame2); p(16, cy + 19, flame2);
    p(15, cy + 21, flame1); p(16, cy + 21, flame1);
    p(16, cy + 23, C.AMBER);
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
  if (deathFrame === 0) {
    b(cx - 4, cy - 4, 10, 10, C.BRASS);
    b(cx - 3, cy - 5, 8, 2, C.BRASS);
    b(cx - 4, cy - 4, 2, 10, C.HI);
    b(cx + 4, cy - 2, 2, 8, C.DK);
    p(cx, cy - 5, C.SPARK); p(cx + 2, cy - 3, C.SPARK);
    p(cx - 2, cy - 3, C.AMBER); p(cx - 3, cy + 1, C.SPARK);
    p(cx + 3, cy, C.SPARK); p(cx, cy + 2, C.SPARK);
    p(cx - 6, cy - 3, C.SPARK); p(cx + 7, cy - 4, C.SPARK);
    b(cx - 1, cy - 1, 3, 3, C.AMBER);
    p(cx, cy, C.WHITE);
  } else if (deathFrame === 1) {
    b(cx - 6, cy - 6, 3, 2, C.BRASS);
    b(cx + 5, cy - 6, 2, 2, C.STEEL);
    b(cx - 7, cy - 1, 2, 2, C.BRASS);
    b(cx + 6, cy - 1, 2, 3, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.DKSTEEL);
    b(cx + 5, cy + 5, 3, 2, C.BRASS);
    p(cx - 3, cy - 3, C.GEAR); p(cx + 3, cy - 3, C.RIVET);
    p(cx - 4, cy - 4, C.SPARK); p(cx + 4, cy + 4, C.AMBER);
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
  } else {
    p(cx - 2, cy + 2, C.GEAR); p(cx + 1, cy + 3, C.RIVET);
    p(cx, cy + 4, C.RIVET); p(cx + 3, cy + 3, C.DKSTEEL);
    b(cx - 2, cy + 1, 5, 2, C.DKSTEEL);
    b(cx - 1, cy + 1, 3, 1, C.STEEL);
    p(cx - 8, cy - 4, C.SMOKE); p(cx + 9, cy - 5, C.SMOKE);
    p(cx - 6, cy - 7, C.SPARK);
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
