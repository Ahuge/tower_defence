// @ts-nocheck
/**
 * greenward_campaign_creeps.tsx — bespoke procedural sprites for
 * the Greenward inheritor creep set (12 cols × 7 rows = 768×448).
 *
 * The Greenward inheritors are the "named living" who shouldn't be
 * fought but advance anyway — old woman, child, mourner, knight,
 * herald, etc. The narrative weight requires distinct silhouettes
 * so the player can read who they're killing. Without bespoke art
 * they all render as col-0 standard creeps — defeating the campaign's
 * emotional rhythm.
 *
 * Locked-in concepts (3-option compare, user picks):
 *
 *   col  0 inheritor_road_walker   (B) Stick-figure briar (twig limbs, leaf hood)
 *   col  1 inheritor_den_walker    (A) Crouched four-limb stalker
 *   col  2 inheritor_messenger     (A) Lantern-bearer
 *   col  3 inheritor_river_crawler (A) Salamander
 *   col  4 inheritor_civilian      (B) Child-with-bundle
 *   col  5 inheritor_wedding_stone (C) Stone-mourner (hands over face)
 *   col  6 inheritor_old_woman     (C) Reading-figure (seated with book)
 *   col  7 inheritor_cethric       (A) Cross-legged with crow
 *   col  8 inheritor_stone_bride   (A) Mossy-veiled bride
 *   col  9 inheritor_child         (C) Wreath-in-hands child
 *   col 10 inheritor_knight        (A) Plate-knight with empty visor
 *   col 11 inheritor_herald        (A) Silent banner-bearer
 *
 * Notes:
 *   - Several inheritors are *tableau* (seated/still). They still
 *     advance through 4 frames — we animate a subtle sway/breath
 *     rather than a walk cycle. Reads as "haunted advance" not
 *     "running."
 *   - Death animation is a unified "stone-and-petals" — petals
 *     drift, body silhouette sinks. Greenward signature beat.
 *
 * Bakes to `public/assets/creeps/greenward_campaign_creeps.png`.
 */
import { useRef, useEffect, useState } from 'react';

// ===== PALETTE =====
const C = {
  // Stone / bone / pale tones for the mourner/bride/wedding-stone
  STONE_DK:   '#4a4844',
  STONE:      '#807a72',
  STONE_LT:   '#bab2a4',
  STONE_HI:   '#dcd4c4',
  BONE:       '#e8dcc4',
  // Wood / briar / twig
  WOOD_DK:    '#3a2a1a',
  WOOD:       '#6a4a2a',
  WOOD_LT:    '#a07a4a',
  // Foliage
  LEAF_DK:    '#1a4a22',
  LEAF:       '#3a7a3a',
  LEAF_LT:    '#7aaa44',
  MOSS:       '#447a44',
  PETAL:      '#ffaadd',
  PETAL_LT:   '#ffddee',
  // Cloth / robe
  CLOTH_DK:   '#3a3344',
  CLOTH:      '#5a4a66',
  CLOTH_LT:   '#9a8aaa',
  ROBE_DK:    '#442a3a',
  ROBE:       '#7a4466',
  ROBE_HI:    '#aa6688',
  // Metal / armor
  IRON_DK:    '#33333a',
  IRON:       '#6a6a72',
  IRON_HI:    '#aaaaaa',
  STEEL_HI:   '#dcdcdc',
  GOLD:       '#cca844',
  GOLD_LT:    '#ffdd88',
  // Glow / lantern
  FLAME:      '#ffcc44',
  FLAME_HI:   '#ffeebb',
  GLOW:       '#ffaa66',
  // Skin tones (warm)
  SKIN_DK:    '#8a6644',
  SKIN:       '#ccaa88',
  SKIN_LT:    '#ffddbb',
  // Black for outlines / hair / shadow
  BLACK:      '#1a1014',
  SHAD:       '#2a2024',
  RED:        '#aa3344',
  WHITE:      '#ffffff',
  // Greenward signature
  GREEN_DK:   '#0a3a1a',
  GREEN:      '#2a6a3a',
  PALE:       '#ddffdd',
};

// ===== DRAWING HELPERS =====
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
const PX = 2, GRID = 32, CELL = GRID * PX;
const COLS = 12;
const ROWS = 7;
export const SHEET_W = COLS * CELL; // 768
export const SHEET_H = ROWS * CELL; // 448

const CREEP_NAMES = [
  'Road walker (briar)', 'Den walker (stalker)', 'Messenger (lantern)',
  'River crawler (salam)', 'Civilian (child+bundle)', 'Wedding stone (mourner)',
  'Old woman (reading)', 'Cethric (crow)', 'Stone bride (veil)',
  'Child (wreath)', 'Knight (empty visor)', 'Herald (banner)',
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ============================================================
// COL 0: inheritor_road_walker (B) — Bundle of bramble/briar
// ============================================================
// REDRAW (v2). v1 had stick-thin twig limbs that disappeared at
// sprite scale (1-2 pixel limbs ≈ sub-pixel after game shrink).
// v2 reads the figure as a BUNDLE of bramble — thicker body with
// barbs jutting OUTWARD on both sides (silhouette anchors), a leaf
// hood pulled low, glowing eyes, jagged thorny limbs (3-4 wide so
// they survive shrink), and visible leaves clinging to the body.
// Reads as: scarecrow / haunted bramble. Distinct.
function drawRoadWalker(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // ─── LEAF HOOD ─── broad, draped low
    b(10, by, 12, 1, C.LEAF_DK);
    b(9, by + 1, 14, 2, C.LEAF);
    b(10, by + 1, 12, 1, C.LEAF_LT);
    // jagged hood rim — left/right pointed leaves
    p(9, by + 3, C.LEAF_DK); p(8, by + 3, C.LEAF_DK);
    p(22, by + 3, C.LEAF_DK); p(23, by + 3, C.LEAF_DK);
    p(9, by + 4, C.LEAF); p(22, by + 4, C.LEAF);
    // hood interior — black shadow with bright eyes
    b(12, by + 3, 8, 3, C.BLACK);
    p(14, by + 4, C.LEAF_LT); p(17, by + 4, C.LEAF_LT); // glow eyes
    p(14, by + 5, C.GREEN); p(17, by + 5, C.GREEN);
    // jaw line (jagged twig mouth)
    p(15, by + 5, C.WOOD_DK); p(16, by + 5, C.WOOD_DK);

    // ─── TORSO ─── thick bundle of bramble (not stick-thin)
    b(11, by + 6, 10, 8, C.WOOD_DK);
    b(11, by + 6, 10, 1, C.WOOD);
    b(11, by + 13, 10, 1, C.BLACK);
    // diagonal weave/bramble pattern (intentionally visible at scale)
    b(12, by + 7, 8, 1, C.WOOD);
    b(11, by + 9, 10, 1, C.SHAD);
    b(12, by + 11, 8, 1, C.WOOD);
    p(13, by + 8, C.WOOD_LT); p(17, by + 8, C.WOOD_LT);
    p(15, by + 10, C.WOOD_LT); p(18, by + 10, C.WOOD_LT);
    p(13, by + 12, C.WOOD_LT);
    // small leaf clings on the body
    p(12, by + 8, C.LEAF); p(19, by + 9, C.LEAF);
    p(13, by + 11, C.LEAF_DK); p(18, by + 12, C.LEAF_DK);

    // ─── BARBS jutting OUTWARD (silhouette anchors) ──────
    // left side — three barbs
    p(10, by + 7, C.WOOD); p(9, by + 7, C.WOOD_DK);
    p(10, by + 9, C.WOOD); p(9, by + 10, C.WOOD_DK);
    p(10, by + 12, C.WOOD); p(9, by + 12, C.WOOD_DK);
    // right side — three barbs
    p(21, by + 7, C.WOOD); p(22, by + 7, C.WOOD_DK);
    p(21, by + 10, C.WOOD); p(22, by + 11, C.WOOD_DK);
    p(21, by + 13, C.WOOD); p(22, by + 13, C.WOOD_DK);

    // ─── ARMS — thicker (2-wide) with thorny extensions ──
    b(9, by + 8, 2, 5, C.WOOD_DK);
    b(9, by + 8, 1, 5, C.WOOD);
    // thorn-claw ends
    p(8, by + 12, C.WOOD); p(7, by + 13, C.WOOD_DK);
    p(8, by + 13, C.WOOD_DK);
    // right arm
    b(21, by + 8, 2, 5, C.WOOD_DK);
    b(22, by + 8, 1, 5, C.SHAD);
    p(23, by + 12, C.WOOD); p(24, by + 13, C.WOOD_DK);
    p(23, by + 13, C.WOOD_DK);

    // ─── LEGS — thicker (2-wide) with root-tufts ─────────
    b(12 + legA, by + 14, 2, 5, C.WOOD_DK);
    b(12 + legA, by + 14, 1, 5, C.WOOD);
    b(18 + legB, by + 14, 2, 5, C.WOOD_DK);
    b(18 + legB, by + 14, 1, 5, C.WOOD);
    // root tufts at feet
    b(11 + legA, by + 19, 4, 1, C.LEAF_DK);
    b(11 + legA, by + 20, 4, 1, C.LEAF);
    p(11 + legA, by + 20, C.LEAF_DK); p(14 + legA, by + 20, C.LEAF_DK);
    b(17 + legB, by + 19, 4, 1, C.LEAF_DK);
    b(17 + legB, by + 20, 4, 1, C.LEAF);
    p(17 + legB, by + 20, C.LEAF_DK); p(20 + legB, by + 20, C.LEAF_DK);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 1: inheritor_den_walker (A) — Crouched four-limb stalker
// ============================================================
// REDRAW (v2). v1 read as a hunched-blob because the figure was
// drawn all in C.SHAD (one dark color) against the dark background.
// v2 uses lighter shades (CLOTH/SKIN) for the body so the silhouette
// reads, and pushes the forelimbs forward at a clearer 45° angle so
// the four-limb knuckle-walker pose is unmistakable. Glowing eyes
// (still feral) anchor the head position.
function drawDenWalker(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const armSway = [0, 1, 0, -1][f];
    const cy = 14 + bob;

    // ─── ARCHED BACK / HUNCH ─── lighter coloring so it reads
    // Mid-height torso/back curving up to a hump
    b(9, cy, 14, 5, C.CLOTH);
    b(9, cy, 14, 1, C.CLOTH_LT);
    b(9, cy + 4, 14, 1, C.CLOTH_DK);
    b(9, cy, 1, 5, C.CLOTH_LT);
    b(22, cy, 1, 5, C.SHAD);
    // spinal hump (centre raised)
    b(13, cy - 2, 6, 2, C.CLOTH);
    b(13, cy - 2, 6, 1, C.CLOTH_LT);
    b(13, cy - 1, 6, 1, C.CLOTH);
    // matted spine ridge
    p(15, cy - 2, C.WOOD_DK); p(16, cy - 2, C.WOOD_DK);
    p(15, cy - 1, C.WOOD_DK); p(16, cy - 1, C.WOOD_DK);
    // matted fur tufts on shoulders
    p(10, cy, C.WOOD_DK); p(11, cy - 1, C.WOOD_DK);
    p(20, cy, C.WOOD_DK); p(21, cy - 1, C.WOOD_DK);

    // ─── HEAD ─── drops down forward of the body
    b(7, cy + 3, 6, 4, C.SKIN_DK);
    b(7, cy + 3, 6, 1, C.SKIN);
    b(7, cy + 3, 1, 4, C.SKIN);
    // matted hair fringe over the face
    b(7, cy + 3, 6, 1, C.WOOD_DK);
    p(7, cy + 4, C.WOOD_DK); p(12, cy + 4, C.WOOD_DK);
    // Glowing feral eyes — primary head anchor
    p(8, cy + 5, C.LEAF_LT); p(11, cy + 5, C.LEAF_LT);
    p(8, cy + 6, C.GREEN); p(11, cy + 6, C.GREEN);
    // teeth/snarl
    p(9, cy + 6, C.WHITE); p(10, cy + 6, C.WHITE);

    // ─── FORELIMBS ─── thicker (3-wide) at a clear 45° forward
    // Front-left forelimb (extends down-forward)
    b(6 + armSway, cy + 5, 3, 3, C.SKIN_DK);
    b(6 + armSway, cy + 5, 1, 3, C.SKIN);
    b(5 + armSway, cy + 8, 3, 4, C.SKIN_DK);
    // knuckle/hand planted on ground
    b(4 + armSway, cy + 12, 5, 2, C.SHAD);
    b(4 + armSway, cy + 12, 5, 1, C.WOOD_DK);
    // claw points
    p(4 + armSway, cy + 14, C.WOOD_DK);
    p(8 + armSway, cy + 14, C.WOOD_DK);

    // Front-right forelimb (counter-phase, slightly different angle)
    b(13, cy + 5, 3, 3, C.SKIN_DK);
    b(13, cy + 5, 1, 3, C.SKIN);
    b(12 - armSway, cy + 8, 3, 4, C.SKIN_DK);
    b(11 - armSway, cy + 12, 5, 2, C.SHAD);
    b(11 - armSway, cy + 12, 5, 1, C.WOOD_DK);
    p(11 - armSway, cy + 14, C.WOOD_DK);
    p(15 - armSway, cy + 14, C.WOOD_DK);

    // ─── HIND LEGS ─── shorter, crouched
    b(19, cy + 5, 3, 4, C.SKIN_DK);
    b(19, cy + 5, 1, 4, C.SKIN);
    b(18, cy + 9, 4, 3, C.SHAD);
    p(18, cy + 11, C.WOOD_DK); p(21, cy + 11, C.WOOD_DK);
    p(19, cy + 12, C.WOOD_DK); p(21, cy + 12, C.WOOD_DK);

    // ─── RAG TAIL / WAIST WRAP ─── animates with sway
    b(22 - armSway, cy + 1, 2, 5, C.CLOTH_DK);
    p(23 - armSway, cy + 6, C.CLOTH_DK);
    p(24 - armSway, cy + 4, C.CLOTH_DK);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 22);
  }
}

// ============================================================
// COL 2: inheritor_messenger (A) — Lantern-bearer
// ============================================================
// A figure in plain cloak holding a lantern out in front. Lantern
// flickers (animates the flame). Reads as "envoy" — a single small
// figure walking alone with a light.
function drawMessenger(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 6 + bob;
    // Hood
    b(13, by, 6, 2, C.CLOTH_DK);
    b(13, by, 6, 1, C.CLOTH);
    // face shadow
    b(14, by + 2, 4, 2, C.SHAD);
    p(15, by + 3, C.FLAME); p(16, by + 3, C.FLAME); // lantern reflection in eyes
    // Cloak body
    b(12, by + 4, 8, 7, C.CLOTH_DK);
    b(12, by + 4, 1, 7, C.CLOTH);
    b(19, by + 4, 1, 7, C.SHAD);
    // chest brooch
    p(16, by + 6, C.GOLD); p(15, by + 7, C.GOLD);
    // Legs
    b(13 + legA, by + 11, 2, 5, C.CLOTH);
    b(17 + legB, by + 11, 2, 5, C.CLOTH);
    b(13 + legA, by + 15, 2, 1, C.SHAD);
    b(17 + legB, by + 15, 2, 1, C.SHAD);
    // Arm holding lantern out front
    b(10, by + 5, 2, 4, C.CLOTH_DK);
    p(11, by + 5, C.CLOTH);
    // Lantern chain
    p(9, by + 9, C.IRON);
    p(9, by + 10, C.IRON);
    // Lantern body
    b(7, by + 11, 5, 6, C.IRON);
    b(7, by + 11, 5, 1, C.IRON_HI);
    b(7, by + 16, 5, 1, C.IRON_DK);
    // Lantern glass face
    b(8, by + 12, 3, 4, C.SHAD);
    // Flame (animated)
    const flCore = (f % 2 === 0) ? C.FLAME_HI : C.FLAME;
    const flGlow = (f % 2 === 0) ? C.FLAME : C.GLOW;
    b(9, by + 13, 1, 2, flCore);
    p(9, by + 12, flGlow);
    p(8, by + 14, flGlow); p(10, by + 14, flGlow);
    // Light bloom
    p(6, by + 13, flGlow); p(12, by + 13, flGlow);
    p(7, by + 11, flGlow);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 3: inheritor_river_crawler (A) — Salamander
// ============================================================
// Mottled green amphibian, low to the ground, broad head, tail
// curling behind. Reads as "river thing" — the inheritor who chose
// the river.
function drawRiverCrawler(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const swA = [0, 1, 0, -1][f];
    const swB = [0, -1, 0, 1][f];
    const cy = 20 + bob;
    // Tail (curling)
    b(2 + swA, cy + 2, 4, 2, C.GREEN_DK);
    b(2 + swA, cy + 2, 2, 1, C.GREEN);
    p(1 + swA, cy + 2, C.GREEN_DK);
    // Body — broad torso
    b(6, cy, 12, 5, C.GREEN);
    b(6, cy, 12, 1, C.LEAF_LT); // top highlight (wet glisten)
    b(6, cy + 4, 12, 1, C.GREEN_DK);
    // Spotted mottling
    p(8, cy + 1, C.GREEN_DK); p(11, cy + 2, C.GREEN_DK);
    p(14, cy + 1, C.GREEN_DK); p(16, cy + 2, C.GREEN_DK);
    p(9, cy + 3, C.LEAF_LT); p(13, cy + 3, C.LEAF_LT);
    // Head (front)
    b(18, cy - 1, 8, 5, C.GREEN);
    b(18, cy - 1, 8, 1, C.LEAF_LT);
    b(18, cy + 3, 8, 1, C.GREEN_DK);
    // Bulging eye on top of head
    b(20, cy - 2, 2, 2, C.BONE);
    p(20, cy - 2, C.WHITE); p(21, cy - 1, C.BLACK);
    b(23, cy - 2, 2, 2, C.BONE);
    p(23, cy - 2, C.WHITE); p(24, cy - 1, C.BLACK);
    // Mouth slit
    b(22, cy + 2, 4, 1, C.SHAD);
    // Four short legs (sprawled)
    b(7 + swB, cy + 5, 2, 2, C.GREEN_DK);
    b(7 + swB, cy + 6, 3, 1, C.SHAD);
    b(14 + swA, cy + 5, 2, 2, C.GREEN_DK);
    b(14 + swA, cy + 6, 3, 1, C.SHAD);
    // Water drip below
    p(10, cy + 8, C.GLOW); p(16, cy + 8, C.GLOW);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 22);
  }
}

// ============================================================
// COL 4: inheritor_civilian (B) — Child with bundle
// ============================================================
// Small figure carrying a bundle/sack on shoulder. Plain tunic.
// Reads as "ordinary person fleeing/advancing" — the hardest kill.
function drawCivilian(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 8 + bob;
    // Head — small, round
    b(13, by, 6, 5, C.SKIN);
    b(13, by, 6, 1, C.WOOD); // hair
    b(13, by, 1, 5, C.SKIN_DK);
    p(15, by + 2, C.BLACK); p(17, by + 2, C.BLACK); // eyes
    // tousled hair
    p(13, by - 1, C.WOOD_DK); p(15, by - 1, C.WOOD_DK); p(18, by - 1, C.WOOD_DK);
    // Tunic — plain
    b(12, by + 5, 8, 6, C.CLOTH);
    b(12, by + 5, 1, 6, C.CLOTH_LT);
    b(19, by + 5, 1, 6, C.CLOTH_DK);
    // Belt
    b(12, by + 9, 8, 1, C.WOOD);
    // Bundle on shoulder (right side) — animated sway
    const bx = 18 + (f % 2);
    b(bx, by + 2, 5, 5, C.WOOD_LT);
    b(bx, by + 2, 5, 1, C.SKIN_LT);
    // bundle tie
    p(bx + 2, by + 2, C.WOOD); p(bx + 2, by + 6, C.WOOD);
    // string in hand
    p(bx + 1, by + 6, C.WOOD_DK);
    // Arms
    b(11, by + 6, 1, 3, C.SKIN);
    b(20, by + 6, 1, 3, C.SKIN);
    // Legs
    b(13 + legA, by + 11, 2, 5, C.CLOTH_DK);
    b(17 + legB, by + 11, 2, 5, C.CLOTH_DK);
    // Bare feet
    p(13 + legA, by + 16, C.SKIN);
    p(18 + legB, by + 16, C.SKIN);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 5: inheritor_wedding_stone (C) — Stone mourner, elbows out
// ============================================================
// REDRAW (v2). v1 had hands flat on face — at sprite scale the
// hands disappeared and it read as "tall grey monolith." v2 pushes
// ELBOWS OUT WIDE (a triangular "M"-shape silhouette over the
// head) so the "head in hands" pose is unmistakable in pure
// silhouette. The body is darker grey to distinguish from
// stone_bride (col 8, white). Tear-streaks visible down the cheeks.
function drawWeddingStone(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const sway = [0, 0, -1, 0][f];
    const tearF = (f % 2);
    const by = 5 + sway;

    // ─── ELBOWS-OUT ARMS (silhouette anchor) ─────────────
    // Form an "M" over the head — elbows extend out to x=8 and x=23
    // (3+ pixels wider than the body). This is the redraw's key.
    // Upper arms — diagonal from shoulders up & out to elbows
    b(7, by + 2, 3, 3, C.STONE_DK);
    b(7, by + 2, 1, 3, C.STONE);
    p(6, by + 3, C.STONE_DK); p(6, by + 4, C.STONE_DK); // elbow point
    b(22, by + 2, 3, 3, C.STONE_DK);
    b(24, by + 2, 1, 3, C.SHAD);
    p(25, by + 3, C.STONE_DK); p(25, by + 4, C.STONE_DK); // elbow point
    // Forearms — diagonal from elbows down & in to hands
    b(8, by + 5, 3, 3, C.STONE_DK);
    b(8, by + 5, 1, 3, C.STONE);
    b(21, by + 5, 3, 3, C.STONE_DK);
    b(23, by + 5, 1, 3, C.SHAD);
    // sleeve drapery hanging from elbows
    b(6, by + 5, 2, 4, C.STONE_DK);
    b(6, by + 5, 1, 4, C.STONE);
    p(7, by + 9, C.SHAD);
    b(24, by + 5, 2, 4, C.STONE_DK);
    b(25, by + 5, 1, 4, C.SHAD);
    p(24, by + 9, C.SHAD);

    // ─── HANDS — meet at face level, palms facing viewer ─
    // Left hand
    b(10, by + 6, 3, 4, C.STONE_LT);
    b(10, by + 6, 1, 4, C.STONE_HI);
    b(10, by + 9, 3, 1, C.STONE);
    // finger lines (vertical creases)
    p(11, by + 7, C.STONE); p(11, by + 8, C.STONE);
    p(12, by + 7, C.STONE);
    // Right hand
    b(19, by + 6, 3, 4, C.STONE_LT);
    b(21, by + 6, 1, 4, C.STONE);
    b(19, by + 9, 3, 1, C.STONE);
    p(20, by + 7, C.STONE); p(20, by + 8, C.STONE);
    p(19, by + 7, C.STONE_DK);
    // gap between hands (face is here, dark)
    b(13, by + 4, 6, 6, C.BLACK);
    // ONE EYE just visible peeking out (sorrow-anchor)
    p(15, by + 6, C.STONE_LT);
    // tear streaks (animate)
    p(15, by + 7 + tearF, C.STONE_LT);
    p(16, by + 8, C.STONE_LT);
    p(15, by + 9, C.STONE_LT);

    // ─── HOODED CROWN over the hands ─────────────────────
    b(11, by, 10, 3, C.STONE_DK);
    b(11, by, 10, 1, C.STONE);
    b(11, by, 1, 3, C.STONE);
    b(20, by, 1, 3, C.SHAD);
    // hood drapery falling alongside
    p(11, by + 3, C.STONE_DK); p(20, by + 3, C.STONE_DK);
    // cowl peak (pointed top)
    p(15, by - 1, C.STONE_DK); p(16, by - 1, C.STONE_DK);

    // ─── ROBE BODY ─── long, columnar, darker than bride
    b(11, by + 10, 10, 12, C.STONE_DK);
    b(11, by + 10, 10, 1, C.STONE);
    b(11, by + 10, 1, 12, C.STONE);
    b(20, by + 10, 1, 12, C.SHAD);
    // Vertical fold lines (the carved-stone "drapery" beat)
    b(14, by + 11, 1, 11, C.SHAD);
    b(17, by + 11, 1, 11, C.STONE);
    // Sash across the chest (greenward signature element)
    b(11, by + 13, 10, 1, C.MOSS);
    b(12, by + 14, 8, 1, C.GREEN);
    // ─── HEMLINE ── carved stone base
    b(9, by + 22, 14, 2, C.STONE_DK);
    b(9, by + 22, 14, 1, C.STONE);
    p(10, by + 24, C.SHAD); p(21, by + 24, C.SHAD);
    // moss at base
    p(12, by + 22, C.MOSS); p(19, by + 23, C.MOSS);
    p(11, by + 23, C.MOSS); p(20, by + 23, C.MOSS);
    // single pink petal on the hem
    p(15, by + 23, C.PETAL_LT);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// COL 6: inheritor_old_woman (C) — Seated reading-figure
// ============================================================
// Seated cross-legged with an open book on lap. Shawl over
// shoulders. Doesn't "walk" — drifts upright at a glide. The
// tableau-creep that breaks the player's heart.
function drawOldWoman(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const sway = [0, -1, 0, -1][f];
    const pageFlip = (f === 2) ? 1 : 0;
    const by = 6 + sway;
    // Hair bun on top
    b(14, by, 4, 2, C.STONE_LT);
    b(13, by + 1, 6, 1, C.BONE);
    // Head
    b(13, by + 2, 6, 4, C.SKIN_LT);
    b(13, by + 2, 1, 4, C.SKIN);
    // wrinkles + eyes (closed)
    p(14, by + 4, C.SHAD); p(17, by + 4, C.SHAD);
    p(15, by + 5, C.SKIN_DK);
    // Shawl over shoulders
    b(10, by + 5, 12, 4, C.CLOTH_DK);
    b(10, by + 5, 1, 4, C.CLOTH);
    b(11, by + 5, 10, 1, C.CLOTH);
    // shawl fringe
    p(10, by + 9, C.CLOTH); p(21, by + 9, C.CLOTH);
    // Body / lap (seated — wide base)
    b(8, by + 9, 16, 6, C.ROBE_DK);
    b(8, by + 9, 16, 1, C.ROBE);
    b(8, by + 14, 16, 1, C.SHAD);
    b(8, by + 9, 1, 6, C.ROBE);
    b(23, by + 9, 1, 6, C.SHAD);
    // Lap creases
    b(12, by + 11, 1, 4, C.ROBE);
    b(19, by + 11, 1, 4, C.ROBE);
    // Open book on lap
    b(12, by + 10, 8, 3, C.WOOD_LT);
    b(12, by + 10, 8, 1, C.BONE);
    // page spread
    b(13, by + 11, 6, 2, C.BONE);
    b(16, by + 11, 1, 2, C.WOOD); // spine
    // page text (animated flip)
    p(13 + pageFlip, by + 11, C.SHAD); p(15, by + 11, C.SHAD);
    p(17, by + 12, C.SHAD); p(19 - pageFlip, by + 12, C.SHAD);
    // Hands cradling book
    b(11, by + 11, 1, 2, C.SKIN_LT);
    b(20, by + 11, 1, 2, C.SKIN_LT);
    // Folded knees beneath (cross-legged hint)
    b(9, by + 14, 6, 2, C.ROBE);
    b(17, by + 14, 6, 2, C.ROBE);
    p(11, by + 15, C.SHAD); p(20, by + 15, C.SHAD);
    // Petal floating up (tableau drift)
    p(12, by - 1 + (f % 2), C.PETAL);
    p(19, by + (f % 2), C.PETAL_LT);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// COL 7: inheritor_cethric (A) — Cross-legged with crow
// ============================================================
// Hooded named character, seated cross-legged, a crow perches on
// his shoulder. Beard. Drifts upright. The campaign's wise-old-man.
function drawCethric(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const sway = [0, 0, -1, 0][f];
    const crowTilt = (f % 2);
    const by = 5 + sway;
    // Hood (deep, dark)
    b(11, by, 10, 4, C.CLOTH_DK);
    b(11, by, 10, 1, C.SHAD);
    b(11, by, 1, 4, C.CLOTH);
    // Face inside hood
    b(13, by + 2, 6, 4, C.SKIN_DK);
    // beard
    b(13, by + 5, 6, 2, C.STONE_LT);
    b(13, by + 5, 6, 1, C.BONE);
    p(14, by + 7, C.STONE);  p(17, by + 7, C.STONE);
    // eyes glinting
    p(14, by + 4, C.FLAME); p(17, by + 4, C.FLAME);
    // Shoulders / cloak
    b(8, by + 6, 16, 4, C.CLOTH_DK);
    b(8, by + 6, 16, 1, C.CLOTH);
    b(8, by + 6, 1, 4, C.CLOTH);
    b(23, by + 6, 1, 4, C.SHAD);
    // Lap (seated wide)
    b(7, by + 10, 18, 5, C.CLOTH_DK);
    b(7, by + 10, 18, 1, C.CLOTH);
    b(7, by + 14, 18, 1, C.SHAD);
    // Folded knees (cross-legged)
    b(8, by + 14, 8, 3, C.CLOTH);
    b(16, by + 14, 8, 3, C.CLOTH);
    p(10, by + 16, C.SHAD); p(13, by + 16, C.SHAD);
    p(18, by + 16, C.SHAD); p(21, by + 16, C.SHAD);
    // Hands on knees
    b(10, by + 12, 2, 2, C.SKIN_DK);
    b(20, by + 12, 2, 2, C.SKIN_DK);
    // CROW on left shoulder
    // body
    b(8 + crowTilt, by + 4, 4, 3, C.BLACK);
    p(8 + crowTilt, by + 4, C.SHAD);
    // head
    b(7 + crowTilt, by + 3, 2, 2, C.BLACK);
    p(6 + crowTilt, by + 4, C.BLACK); // beak
    // eye
    p(7 + crowTilt, by + 3, C.GOLD);
    // tail
    b(11 + crowTilt, by + 5, 2, 1, C.BLACK);
    // wing twitch
    p(9 + crowTilt, by + 5, C.SHAD);
    p(10 + crowTilt, by + 6, C.SHAD);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// COL 8: inheritor_stone_bride (A) — Mossy-veiled bride
// ============================================================
// Stone figure in long veil, with moss creeping up the gown. The
// veil hangs to mid-chest. Reads as "wedding ceremony interrupted
// forever." White stone, green moss creep.
function drawStoneBride(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const sway = [0, -1, 0, -1][f];
    const veilFlow = (f % 2);
    const by = 3 + sway;
    // REDRAW (v2). v1 looked too similar to wedding_stone in
    // silhouette (both tall pale columns). v2 distinguishes by:
    //   - VEIL FLOWS WIDE to one side (asymmetric — anchors silhouette)
    //   - LARGE bridal bouquet held in front (visible pink/green cluster)
    //   - White-stone palette (vs wedding-stone's grey)
    //   - Veil reaches BELOW the shoulders + drapes outward

    // ─── TIARA / CROWN ─── ring of blossoms
    b(13, by, 6, 1, C.GOLD);
    p(13, by - 1, C.PETAL); p(14, by - 1, C.PETAL_LT);
    p(15, by - 1, C.PETAL); p(16, by - 1, C.PETAL_LT);
    p(17, by - 1, C.PETAL); p(18, by - 1, C.PETAL_LT);
    p(14, by + 1, C.GOLD); p(17, by + 1, C.GOLD);

    // ─── VEIL ─── flows out asymmetrically to one side
    // Crown of the veil over the head
    b(11, by + 1, 10, 4, C.WHITE);
    b(11, by + 1, 10, 1, C.PALE);
    b(11, by + 1, 1, 4, C.PALE);
    b(20, by + 1, 1, 4, C.STONE_HI);
    // VEIL FLOWING TO THE LEFT (asymmetric — silhouette anchor)
    // Drapes out 4-5 pixels wider than the body on the left
    b(6 + veilFlow, by + 4, 5, 7, C.WHITE);
    b(6 + veilFlow, by + 4, 5, 1, C.PALE);
    p(5 + veilFlow, by + 5, C.WHITE);
    p(5 + veilFlow, by + 7, C.WHITE);
    p(5 + veilFlow, by + 9, C.PALE);
    // veil edge feathering
    p(7 + veilFlow, by + 11, C.WHITE);
    p(8 + veilFlow, by + 12, C.PALE);
    p(9 + veilFlow, by + 11, C.WHITE);
    // right side of veil — drapes shorter, gives the asymmetric read
    b(21, by + 4, 3, 5, C.WHITE);
    b(21, by + 4, 3, 1, C.PALE);
    p(24, by + 6, C.PALE);
    p(23, by + 9, C.PALE);

    // ─── FACE inside veil (pale, closed eyes — sorrow-anchor) ─
    b(13, by + 5, 6, 3, C.BONE);
    b(13, by + 5, 6, 1, C.STONE_HI);
    // closed-eye lash lines
    b(14, by + 6, 2, 1, C.STONE_DK);
    b(17, by + 6, 2, 1, C.STONE_DK);
    // a single tear on the cheek (animates)
    p(15, by + 7 + veilFlow, C.PALE);

    // ─── BODICE ─── narrower than the gown skirt
    b(12, by + 8, 8, 4, C.WHITE);
    b(12, by + 8, 8, 1, C.PALE);
    b(12, by + 8, 1, 4, C.PALE);
    b(19, by + 8, 1, 4, C.STONE_HI);
    // corset lacing (vertical centre seam — bridal detail)
    b(15, by + 9, 2, 3, C.GOLD);
    p(15, by + 9, C.GOLD_LT); p(16, by + 11, C.GOLD_LT);
    // lacing cross-strings
    p(14, by + 10, C.GOLD); p(17, by + 10, C.GOLD);

    // ─── HANDS holding a LARGE bouquet in front ──────────
    // hands
    b(11, by + 12, 2, 2, C.STONE_HI);
    b(19, by + 12, 2, 2, C.STONE_HI);
    // BOUQUET — visible cluster of pink/green held front-and-center
    // (the brief's signature differentiator)
    // green leaf base
    b(13, by + 12, 6, 4, C.LEAF_DK);
    b(13, by + 12, 6, 1, C.LEAF);
    b(13, by + 15, 6, 1, C.GREEN_DK);
    // pink blossoms on top of the bouquet
    p(13, by + 11, C.PETAL); p(14, by + 11, C.PETAL_LT);
    p(15, by + 11, C.PETAL); p(16, by + 11, C.PETAL_LT);
    p(17, by + 11, C.PETAL); p(18, by + 11, C.PETAL_LT);
    p(14, by + 12, C.PETAL_LT); p(16, by + 12, C.PETAL_LT);
    p(13, by + 13, C.PETAL); p(18, by + 13, C.PETAL);
    p(15, by + 14, C.PETAL_LT); p(17, by + 14, C.PETAL);
    // ribbon trailing down from bouquet
    b(15, by + 16, 2, 3, C.PETAL);
    p(15, by + 18, C.PETAL_LT); p(16, by + 19, C.PETAL_LT);

    // ─── GOWN SKIRT ─── wider below the bouquet
    b(10, by + 16, 12, 7, C.WHITE);
    b(10, by + 16, 12, 1, C.PALE);
    b(10, by + 16, 1, 7, C.PALE);
    b(21, by + 16, 1, 7, C.STONE_HI);
    // skirt folds (vertical creases — wider gown read)
    b(13, by + 17, 1, 6, C.PALE);
    b(18, by + 17, 1, 6, C.PALE);
    // MOSS creeping up the gown (signature)
    p(10, by + 21, C.MOSS); p(11, by + 22, C.MOSS);
    p(21, by + 21, C.MOSS); p(22, by + 22, C.MOSS);
    p(14, by + 22, C.MOSS); p(17, by + 22, C.MOSS);
    // Hemline
    b(9, by + 23, 14, 1, C.PALE);

    // ─── DRIFTING PETALS around the figure ───────────────
    p(4, by + 6 + veilFlow, C.PETAL);
    p(26, by + 10 - veilFlow, C.PETAL_LT);
    p(7, by + 15, C.PETAL);
    p(25, by + 18, C.PETAL_LT);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// COL 9: inheritor_child (C) — Wreath-in-hands child
// ============================================================
// Small child holding a flower wreath out in front of them with
// both hands. Crown of flowers in hair. Tableau pose (offer).
function drawChildWreath(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const sway = [0, -1, 0, -1][f];
    const wreathSpin = f;
    const by = 8 + sway;
    // Hair / flower crown on head
    b(13, by, 6, 2, C.WOOD);
    b(12, by, 1, 2, C.WOOD_DK);
    b(19, by, 1, 2, C.WOOD_DK);
    // crown blossoms
    p(13, by - 1, C.PETAL); p(15, by - 1, C.PETAL_LT);
    p(17, by - 1, C.PETAL); p(19, by - 1, C.PETAL_LT);
    p(14, by, C.GOLD); p(18, by, C.GOLD);
    // Face — round, small
    b(13, by + 2, 6, 4, C.SKIN_LT);
    p(14, by + 4, C.BLACK); p(17, by + 4, C.BLACK); // big eyes
    p(15, by + 5, C.SHAD); p(16, by + 5, C.SHAD); // tiny mouth
    // Body — small tunic
    b(12, by + 6, 8, 6, C.PALE);
    b(12, by + 6, 1, 6, C.WHITE);
    b(19, by + 6, 1, 6, C.STONE_LT);
    // tunic decoration
    p(15, by + 8, C.LEAF); p(16, by + 8, C.LEAF);
    p(15, by + 10, C.LEAF); p(16, by + 10, C.LEAF);
    // Arms outstretched forward
    b(10, by + 7, 2, 3, C.SKIN);
    b(20, by + 7, 2, 3, C.SKIN);
    // Hands (cradling wreath)
    b(9, by + 10, 2, 2, C.SKIN_LT);
    b(21, by + 10, 2, 2, C.SKIN_LT);
    // WREATH being offered (in front of body)
    // outer ring
    b(11, by + 11, 10, 1, C.LEAF_DK);
    b(11, by + 14, 10, 1, C.LEAF_DK);
    b(11, by + 11, 1, 4, C.LEAF_DK);
    b(20, by + 11, 1, 4, C.LEAF_DK);
    // foliage
    b(12, by + 12, 8, 2, C.LEAF);
    p(13, by + 12, C.LEAF_LT); p(18, by + 13, C.LEAF_LT);
    p(15, by + 13, C.LEAF_LT);
    // Blossoms (animate)
    const pa = (wreathSpin % 2 === 0) ? C.PETAL : C.PETAL_LT;
    const pb_c = (wreathSpin % 2 === 0) ? C.PETAL_LT : C.PETAL;
    p(13, by + 12, pa); p(15, by + 12, pb_c);
    p(17, by + 12, pa); p(19, by + 12, pb_c);
    p(13, by + 14, pb_c); p(18, by + 14, pa);
    p(11, by + 13, pa); p(20, by + 13, pb_c);
    // Legs — short
    b(13, by + 12, 2, 4, C.WOOD);
    b(17, by + 12, 2, 4, C.WOOD);
    // Tiny feet
    p(13, by + 16, C.SHAD); p(18, by + 16, C.SHAD);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 10: inheritor_knight (A) — Plate-knight with empty visor
// ============================================================
// Full plate armor. Visor open showing pitch-black void (no head
// inside). Sword at belt. Reads as "the empty knight" — armor walks
// alone.
function drawKnight(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Helmet — pointed top, visored
    b(12, by, 8, 1, C.IRON_DK);
    b(11, by + 1, 10, 2, C.IRON);
    b(11, by + 1, 10, 1, C.STEEL_HI);
    b(11, by + 1, 1, 2, C.IRON_HI);
    b(20, by + 1, 1, 2, C.IRON_DK);
    // helm crest
    p(15, by - 1, C.RED); p(16, by - 1, C.RED);
    p(15, by - 2, C.GOLD);
    // Visor — open horizontal slit, VOID inside
    b(12, by + 3, 8, 2, C.BLACK);
    b(12, by + 3, 8, 1, C.SHAD);
    // (no eyes — that's the point)
    // Helmet lower (chinguard)
    b(12, by + 5, 8, 2, C.IRON);
    b(12, by + 5, 8, 1, C.IRON_HI);
    b(13, by + 6, 6, 1, C.IRON_DK);
    // Gorget (neck plate)
    b(13, by + 7, 6, 1, C.IRON);
    // Pauldrons (shoulders)
    b(9, by + 8, 4, 3, C.IRON);
    b(9, by + 8, 4, 1, C.IRON_HI);
    b(9, by + 8, 1, 3, C.STEEL_HI);
    b(19, by + 8, 4, 3, C.IRON);
    b(19, by + 8, 4, 1, C.IRON_HI);
    b(22, by + 8, 1, 3, C.IRON_DK);
    // Chest plate
    b(11, by + 8, 10, 6, C.IRON);
    b(11, by + 8, 10, 1, C.IRON_HI);
    b(11, by + 13, 10, 1, C.IRON_DK);
    b(11, by + 8, 1, 6, C.IRON_HI);
    b(20, by + 8, 1, 6, C.IRON_DK);
    // Heraldic emblem (greenward leaf)
    b(14, by + 10, 4, 3, C.GREEN);
    p(15, by + 9, C.LEAF_LT); p(16, by + 9, C.LEAF_LT);
    p(14, by + 11, C.LEAF_DK); p(17, by + 11, C.LEAF_DK);
    // Belt
    b(11, by + 14, 10, 1, C.WOOD_DK);
    p(15, by + 14, C.GOLD); p(16, by + 14, C.GOLD); // buckle
    // Arms — gauntlets
    b(10, by + 11, 1, 4, C.IRON);
    b(21, by + 11, 1, 4, C.IRON_DK);
    b(10, by + 15, 2, 2, C.IRON_HI); // gauntlet fist
    b(21, by + 15, 2, 2, C.IRON_DK);
    // SWORD at belt (hilt visible)
    b(22, by + 11, 1, 6, C.IRON_HI);
    p(23, by + 10, C.GOLD); // pommel
    b(21, by + 12, 3, 1, C.GOLD); // cross-guard
    // Greaves — armor legs
    b(13 + legA, by + 15, 2, 5, C.IRON);
    b(13 + legA, by + 15, 1, 5, C.STEEL_HI);
    b(13 + legA, by + 19, 2, 1, C.IRON_DK);
    b(17 + legB, by + 15, 2, 5, C.IRON);
    b(17 + legB, by + 15, 1, 5, C.STEEL_HI);
    b(17 + legB, by + 19, 2, 1, C.IRON_DK);
    // Boots
    b(12 + legA, by + 20, 4, 2, C.IRON_DK);
    b(16 + legB, by + 20, 4, 2, C.IRON_DK);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 14);
  }
}

// ============================================================
// COL 11: inheritor_herald (A) — Silent banner-bearer
// ============================================================
// Tall figure holding a long pole with a banner unfurled overhead.
// Banner has Greenward leaf sigil. Reads as "ceremonial procession"
// — the inheritor of office.
function drawHerald(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const wave = (f % 2);
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Banner pole (goes from top-left of frame down to figure's hand)
    b(7, by, 1, 18, C.WOOD_DK);
    p(7, by, C.GOLD); // pole finial
    p(7, by - 1, C.GOLD);
    // Banner — unfurled (drapes right of pole, animated wave)
    b(8, by, 14, 8, C.ROBE);
    b(8, by, 14, 1, C.ROBE_HI);
    b(8, by + 7, 14, 1, C.ROBE_DK);
    // banner trim
    b(8, by, 1, 8, C.GOLD);
    b(21, by, 1, 8, C.ROBE_DK);
    // banner edge waves
    p(21 + wave, by + 1, C.ROBE);
    p(21 + wave, by + 3, C.ROBE);
    p(21 + wave, by + 5, C.ROBE);
    p(21 - wave, by + 7, C.ROBE_DK);
    // Banner sigil — green leaf
    b(13, by + 2, 4, 4, C.LEAF_DK);
    p(14, by + 2, C.LEAF_LT); p(15, by + 3, C.LEAF_LT);
    p(13, by + 4, C.LEAF); p(16, by + 4, C.LEAF);
    // pole tassel
    p(7, by + 8, C.GOLD); p(7, by + 9, C.GOLD_LT);
    // FIGURE — tall, regal
    // ceremonial hat (tall)
    b(14, by + 8, 5, 2, C.ROBE_DK);
    b(14, by + 8, 5, 1, C.ROBE);
    p(15, by + 7, C.GOLD); p(17, by + 7, C.GOLD);
    // Face
    b(14, by + 10, 5, 3, C.SKIN);
    p(15, by + 11, C.BLACK); p(17, by + 11, C.BLACK);
    p(16, by + 12, C.SHAD); // closed solemn mouth
    // Robe / chest
    b(12, by + 13, 9, 6, C.ROBE_DK);
    b(12, by + 13, 9, 1, C.ROBE);
    b(12, by + 13, 1, 6, C.ROBE);
    b(20, by + 13, 1, 6, C.ROBE_DK);
    // sash (gold) diagonal
    p(13, by + 14, C.GOLD); p(14, by + 15, C.GOLD);
    p(15, by + 16, C.GOLD); p(16, by + 17, C.GOLD);
    p(17, by + 18, C.GOLD);
    // Right arm gripping pole
    b(8, by + 13, 2, 4, C.ROBE);
    b(7, by + 14, 1, 3, C.SKIN_DK); // hand on pole
    // Left arm at side
    b(20, by + 14, 2, 5, C.ROBE);
    b(21, by + 18, 1, 1, C.SKIN_DK);
    // Legs
    b(13 + legA, by + 19, 2, 5, C.ROBE_DK);
    b(17 + legB, by + 19, 2, 5, C.ROBE_DK);
    // Ceremonial shoes
    b(12 + legA, by + 24, 4, 1, C.WOOD_DK);
    b(16 + legB, by + 24, 4, 1, C.WOOD_DK);
  } else {
    drawDeathStoneAndPetals(p, b, f - 4, 16, 16);
  }
}

// ============================================================
// Shared death — Stone-and-Petals (Greenward signature)
// ============================================================
// Three-stage: silhouette cracks open → stone fragments + petal
// burst → settled stone pile with drifting petals.
function drawDeathStoneAndPetals(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  // REDRAW (v2): added a LARGE 5×5 hero petal that drifts up across
  // all three frames so the death anim reads as "petal release"
  // even at game scale. v1's death frames looked near-identical
  // when small because the petals were 1-pixel specks.

  // ── LARGE HERO PETAL ── starts at chest, rises across frames
  const heroPetalY = cy - 4 - deathFrame * 3; // drifts UP each frame
  const heroPetalX = cx + (deathFrame - 1) * 2; // drifts sideways
  // 5×5 stylised petal — outline + body + highlight
  b(heroPetalX - 2, heroPetalY - 2, 5, 5, C.PETAL);
  b(heroPetalX - 2, heroPetalY - 2, 5, 1, C.PETAL_LT);
  b(heroPetalX - 2, heroPetalY - 2, 1, 5, C.PETAL_LT);
  p(heroPetalX, heroPetalY, C.WHITE);            // bright centre
  p(heroPetalX - 1, heroPetalY - 1, C.PETAL_LT); // inner highlight
  p(heroPetalX + 1, heroPetalY + 1, C.ROBE);     // shadow side
  p(heroPetalX + 2, heroPetalY, C.ROBE_DK);      // edge shadow
  // small companion petal trailing behind
  p(heroPetalX - 3, heroPetalY + 1, C.PETAL);
  p(heroPetalX - 4, heroPetalY + 2, C.PETAL_LT);

  if (deathFrame === 0) {
    // Crack open — pale stone column with cracks
    b(cx - 4, cy - 6, 8, 12, C.STONE_LT);
    b(cx - 4, cy - 6, 8, 1, C.STONE_HI);
    b(cx - 4, cy + 5, 8, 1, C.STONE_DK);
    b(cx - 4, cy - 6, 1, 12, C.STONE_HI);
    b(cx + 3, cy - 6, 1, 12, C.STONE_DK);
    // crack lines (jagged break across face)
    p(cx, cy - 5, C.SHAD); p(cx, cy - 3, C.SHAD); p(cx, cy - 1, C.SHAD);
    p(cx - 1, cy + 1, C.SHAD); p(cx, cy + 3, C.SHAD);
    p(cx + 1, cy + 1, C.SHAD);
    p(cx - 2, cy - 2, C.SHAD); p(cx + 2, cy - 2, C.SHAD);
    p(cx - 1, cy + 4, C.SHAD); p(cx + 1, cy + 4, C.SHAD);
    // first small petals escape
    p(cx - 6, cy - 4, C.PETAL); p(cx + 6, cy - 2, C.PETAL_LT);
    p(cx - 5, cy + 2, C.PETAL_LT);
    p(cx - 8, cy, C.PETAL); p(cx + 7, cy + 4, C.PETAL);
  } else if (deathFrame === 1) {
    // Burst — fragments fly, petals scatter
    b(cx - 6, cy - 6, 3, 3, C.STONE_LT);
    b(cx + 4, cy - 5, 3, 2, C.STONE);
    b(cx - 5, cy + 1, 3, 3, C.STONE);
    b(cx + 4, cy + 2, 3, 3, C.STONE_LT);
    b(cx - 1, cy - 1, 3, 3, C.STONE_HI);
    p(cx - 6, cy - 6, C.STONE_HI); p(cx + 6, cy + 4, C.STONE_DK);
    // extra fragments
    b(cx + 2, cy - 7, 2, 2, C.STONE_LT);
    b(cx - 7, cy + 4, 2, 2, C.STONE);
    // moss flecks from inside
    p(cx, cy, C.MOSS); p(cx - 2, cy + 1, C.MOSS); p(cx + 2, cy - 1, C.MOSS);
    p(cx - 3, cy - 4, C.MOSS); p(cx + 1, cy + 3, C.MOSS);
    // burst of petals (more than v1)
    p(cx - 7, cy, C.PETAL); p(cx + 7, cy, C.PETAL_LT);
    p(cx, cy - 7, C.PETAL_LT); p(cx, cy + 7, C.PETAL);
    p(cx - 5, cy - 5, C.PETAL); p(cx + 5, cy - 5, C.PETAL_LT);
    p(cx - 5, cy + 5, C.PETAL_LT); p(cx + 5, cy + 5, C.PETAL);
    p(cx - 8, cy - 3, C.PETAL); p(cx + 8, cy - 3, C.PETAL_LT);
    p(cx - 8, cy + 3, C.PETAL_LT); p(cx + 8, cy + 3, C.PETAL);
  } else {
    // Settled — low stone pile + drifting petals
    b(cx - 5, cy + 3, 10, 3, C.STONE_DK);
    b(cx - 5, cy + 3, 10, 1, C.STONE);
    p(cx - 4, cy + 2, C.STONE_LT); p(cx + 2, cy + 2, C.STONE_LT);
    // scattered fragments around base
    p(cx - 6, cy + 5, C.STONE);
    p(cx + 6, cy + 5, C.STONE_DK);
    p(cx - 7, cy + 4, C.STONE_DK);
    p(cx + 7, cy + 3, C.STONE);
    // drifting petals (final frame — graceful aftermath)
    p(cx - 4, cy - 6, C.PETAL); p(cx + 5, cy - 5, C.PETAL_LT);
    p(cx - 7, cy - 2, C.PETAL_LT); p(cx + 7, cy - 1, C.PETAL);
    p(cx - 2, cy - 8, C.PETAL); p(cx + 3, cy - 8, C.PETAL_LT);
    p(cx, cy - 10, C.PETAL_LT);
    // moss on the pile
    p(cx - 2, cy + 3, C.MOSS); p(cx + 1, cy + 4, C.MOSS);
    p(cx + 3, cy + 3, C.MOSS); p(cx - 4, cy + 4, C.MOSS);
  }
}

// ===== ROUTING =====
const DRAW_FNS = [
  drawRoadWalker, drawDenWalker, drawMessenger, drawRiverCrawler,
  drawCivilian, drawWeddingStone, drawOldWoman, drawCethric,
  drawStoneBride, drawChildWreath, drawKnight, drawHerald,
];

export function drawGreenwardCampaignCreepSheet(ctx: CanvasRenderingContext2D) {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], row);
    }
  }
}

// ===== COMPONENT (browser preview) =====
export default function GreenwardCampaignCreepSprites() {
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sc = sheetRef.current!;
    sc.width = SHEET_W;
    sc.height = SHEET_H;
    const sctx = sc.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    drawGreenwardCampaignCreepSheet(sctx);

    const pv = previewRef.current!;
    const S = 3, LW = 110, LH = 14;
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 30;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a1408';
    pc.fillRect(0, 0, pv.width, pv.height);
    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = C.LEAF_LT;
      pc.font = 'bold 10px monospace';
      pc.fillText(ROW_NAMES[r], 4, by + CELL * S / 2 + 3);
      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, bx, by, CELL * S, CELL * S);
      }
    }
    pc.fillStyle = C.PALE;
    pc.font = 'bold 9px monospace';
    for (let cc = 0; cc < COLS; cc++) {
      pc.fillText(CREEP_NAMES[cc].slice(0, 20), LW + cc * CELL * S + 4, ROWS * (CELL * S + LH) + 20);
    }
    setReady(true);
  }, []);

  const download = () => {
    const a = document.createElement('a');
    a.download = 'greenward_campaign_creeps.png';
    a.href = sheetRef.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 16, background: '#040a02', minHeight: '100vh', color: C.LEAF_LT }}>
      <h1>Greenward Campaign Creep Sprites</h1>
      <p>12 cols × 7 rows = {SHEET_W}×{SHEET_H} sheet. Bespoke inheritor variants.</p>
      <button onClick={download} disabled={!ready}>Download greenward_campaign_creeps.png</button>
      <canvas ref={sheetRef} style={{ display: 'none' }} />
      <canvas ref={previewRef} style={{ marginTop: 16, border: '1px solid #444' }} />
    </div>
  );
}
