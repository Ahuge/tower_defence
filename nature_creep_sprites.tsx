import { useRef, useEffect, useState, useCallback } from "react";

// ===== NATURE CREEP PALETTE =====
const C = {
  BARK: '#553311',
  DKBARK: '#3a2208',
  LTBARK: '#775533',
  LEAF: '#44aa44',
  DKLEAF: '#226622',
  BTLEAF: '#66cc66',
  MOSS: '#338833',
  AMBER: '#ccaa44',
  PETAL: '#ff88aa',
  POLLEN: '#ffdd44',
  ROOT: '#664422',
  EARTH: '#443322',
  VINE: '#339933',
  MUSH: '#aa6644',
  SPORE: '#aabb55',
  WHITE: '#ffffff',
  // Extra shading
  MIDBARK: '#664422',
  HIBARK: '#886644',
  DKEARTH: '#332211',
  LTLEAF: '#88dd88',
  SHADOW: '#221100',
  GLOW: '#88ee88',
  EYE: '#ffcc00',
  EYEHI: '#ffee88',
  // Boss accent colors
  SAP: '#ddaa22',     // golden sap
  DKSAP: '#aa7711',   // dark sap
  NEST: '#885544',    // bird nest brown
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
const PX = 2, GRID = 32, CELL = GRID * PX; // 64x64 pixel cells
const COLS = 16; // 16 creep types
const ROWS = 7;  // walk0-3, death0-2
const SHEET_W = COLS * CELL; // 1024
const SHEET_H = ROWS * CELL; // 448

const CREEP_NAMES = [
  'Standard', 'Fast', 'Armored', 'Swarm', 'Healer', 'Boss',
  'Group', 'Splitter', 'Shielded', 'Evasive', 'Regenerator', 'Flying',
  'Mage Iron', 'Mage Haste', 'Mage Mist', 'Mage Heal'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== CREEP DRAW FUNCTIONS =====
// Each function: (ctx, offset, frame) where frame 0-3=walk, 4-6=death

// 0: Treant Sapling (Standard) - Small walking tree, branch-arms, leaf crown
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Leaf crown (bushy top)
    b(11, by, 10, 2, C.LEAF); b(12, by, 8, 1, C.BTLEAF);
    b(10, by + 2, 12, 3, C.LEAF);
    b(10, by + 2, 2, 3, C.BTLEAF); b(20, by + 3, 2, 2, C.DKLEAF);
    p(9, by + 3, C.BTLEAF); p(22, by + 3, C.DKLEAF);
    // Leaf highlights
    p(13, by, C.BTLEAF); p(16, by + 1, C.GLOW); p(18, by + 2, C.BTLEAF);
    p(11, by + 3, C.GLOW); p(14, by + 4, C.BTLEAF);
    // Face in trunk
    b(13, by + 5, 6, 4, C.BARK);
    b(13, by + 5, 6, 1, C.LTBARK); p(13, by + 5, C.HIBARK);
    b(18, by + 7, 1, 2, C.DKBARK);
    // Eyes
    b(14, by + 6, 2, 1, C.EYE); p(14, by + 6, C.EYEHI);
    b(17, by + 6, 2, 1, C.EYE); p(17, by + 6, C.EYEHI);
    // Mouth
    p(15, by + 8, C.DKBARK); p(16, by + 8, C.DKBARK);
    // Trunk body
    b(12, by + 9, 8, 6, C.BARK);
    b(12, by + 9, 2, 6, C.LTBARK); b(13, by + 9, 1, 4, C.HIBARK);
    b(18, by + 9, 2, 6, C.DKBARK);
    // Bark texture
    p(14, by + 10, C.MIDBARK); p(16, by + 11, C.DKBARK); p(15, by + 13, C.MIDBARK);
    // Branch arms
    b(9, by + 10, 3, 2, C.BARK); b(9, by + 10, 1, 2, C.LTBARK);
    b(7, by + 9, 2, 2, C.BARK); p(7, by + 9, C.LTBARK);
    p(6, by + 8, C.LEAF); p(7, by + 8, C.BTLEAF); // leaf tip
    b(20, by + 10, 3, 2, C.BARK); b(22, by + 10, 1, 2, C.DKBARK);
    b(23, by + 9, 2, 2, C.DKBARK);
    p(24, by + 8, C.LEAF); p(25, by + 8, C.DKLEAF); // leaf tip
    // Root legs
    b(11 + lOff, by + 15, 4, 5, C.ROOT);
    b(11 + lOff, by + 15, 1, 5, C.LTBARK); b(14 + lOff, by + 15, 1, 5, C.DKBARK);
    b(17 + rOff, by + 15, 4, 5, C.ROOT);
    b(20 + rOff, by + 15, 1, 5, C.DKBARK);
    // Feet roots
    b(10 + lOff, by + 20, 5, 2, C.ROOT); b(10 + lOff, by + 20, 2, 1, C.LTBARK);
    b(17 + rOff, by + 20, 5, 2, C.ROOT); b(21 + rOff, by + 20, 1, 1, C.DKBARK);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 1: Forest Spider (Fast) - 8-legged top-down spider, earthy green/brown, web detail
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const by = 9;
    // Abdomen (larger rear section, top-down)
    b(13, by + 5, 6, 7, C.MOSS); b(12, by + 6, 8, 5, C.MOSS);
    b(13, by + 5, 2, 7, C.BTLEAF); b(18, by + 6, 2, 5, C.DKLEAF);
    // Abdomen markings (leaf pattern)
    p(15, by + 7, C.BTLEAF); p(16, by + 7, C.BTLEAF);
    p(14, by + 9, C.LEAF); p(17, by + 9, C.LEAF);
    p(15, by + 10, C.GLOW); // central glow
    // Cephalothorax (front section)
    b(14, by + 2, 4, 4, C.BARK); b(13, by + 3, 6, 2, C.BARK);
    b(14, by + 2, 2, 2, C.LTBARK); b(17, by + 4, 1, 1, C.DKBARK);
    // Eyes (8 eyes in two rows, top-down)
    p(14, by + 2, C.EYE); p(17, by + 2, C.EYE);
    p(13, by + 3, C.EYE); p(18, by + 3, C.EYE);
    p(15, by + 2, C.EYEHI); p(16, by + 2, C.EYEHI); // small center pair
    p(14, by + 3, C.EYEHI); p(17, by + 3, C.EYEHI); // inner pair
    // Fangs/mandibles
    p(15, by + 1, C.DKBARK); p(16, by + 1, C.DKBARK);
    // 8 Legs radiating outward (top-down, non-directional)
    // Front-left pair
    b(11 + legA, by + 2, 2, 1, C.BARK); p(9 + legA, by + 1, C.DKBARK); p(7 + legA, by, C.ROOT);
    b(12 + legB, by + 4, 1, 1, C.BARK); p(10 + legB, by + 3, C.DKBARK); p(8 + legB, by + 2, C.ROOT);
    // Front-right pair
    b(19 + legB, by + 2, 2, 1, C.BARK); p(21 + legB, by + 1, C.DKBARK); p(23 + legB, by, C.ROOT);
    b(19 + legA, by + 4, 1, 1, C.BARK); p(21 + legA, by + 3, C.DKBARK); p(23 + legA, by + 2, C.ROOT);
    // Rear-left pair
    b(11 + legB, by + 8, 1, 1, C.BARK); p(9 + legB, by + 9, C.DKBARK); p(7 + legB, by + 10, C.ROOT);
    b(12 + legA, by + 10, 1, 1, C.BARK); p(10 + legA, by + 11, C.DKBARK); p(8 + legA, by + 12, C.ROOT);
    // Rear-right pair
    b(20 + legA, by + 8, 1, 1, C.BARK); p(22 + legA, by + 9, C.DKBARK); p(24 + legA, by + 10, C.ROOT);
    b(19 + legB, by + 10, 1, 1, C.BARK); p(21 + legB, by + 11, C.DKBARK); p(23 + legB, by + 12, C.ROOT);
    // Web silk trail behind
    p(15, by + 13, C.WHITE); p(16, by + 14, C.LTLEAF);
    if (f % 2 === 0) { p(14, by + 14, C.WHITE); p(17, by + 15, C.LTLEAF); }
    else { p(17, by + 13, C.WHITE); p(14, by + 15, C.LTLEAF); }
    // Small bee pixel ambient
    p(6 + legA, by + 1, C.POLLEN); p(25 + legB, by + 11, C.POLLEN);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 2: Bark Golem (Armored) - Walking tree stump with flat top, bark rings, root-feet
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Flat stump top (cross-section with visible rings)
    b(8, by, 16, 3, C.LTBARK); b(9, by, 14, 1, C.HIBARK);
    b(8, by, 1, 3, C.HIBARK); b(23, by + 1, 1, 2, C.DKBARK);
    // Tree rings on top surface (concentric)
    b(11, by + 1, 10, 1, C.BARK); // outer ring
    b(13, by + 1, 6, 1, C.MIDBARK); // middle ring
    b(15, by + 1, 2, 1, C.AMBER); // heart/core ring (golden sap)
    p(15, by + 1, C.POLLEN); // sap glow center
    // Ring on second row
    b(10, by + 2, 12, 1, C.BARK);
    b(12, by + 2, 8, 1, C.MIDBARK);
    b(14, by + 2, 4, 1, C.AMBER);
    // Moss on stump top edge
    p(9, by, C.MOSS); p(12, by, C.BTLEAF); p(19, by, C.MOSS); p(22, by, C.LEAF);
    // Stump body (cylindrical bark, wider at base)
    b(7, by + 3, 18, 5, C.BARK);
    b(6, by + 8, 20, 6, C.BARK);
    b(7, by + 14, 18, 3, C.BARK);
    // Bark texture shading
    b(6, by + 3, 2, 14, C.LTBARK); b(7, by + 4, 1, 12, C.HIBARK);
    b(24, by + 3, 2, 14, C.DKBARK); b(25, by + 5, 1, 10, C.SHADOW);
    // Vertical bark furrows (deep grooves)
    b(11, by + 4, 1, 12, C.DKBARK); b(16, by + 3, 1, 13, C.DKBARK);
    b(21, by + 4, 1, 12, C.DKBARK);
    // Horizontal bark band lines
    b(8, by + 7, 16, 1, C.DKBARK);
    b(8, by + 11, 16, 1, C.DKBARK);
    // Knot holes / face
    b(12, by + 5, 2, 2, C.EYE); p(13, by + 5, C.EYEHI);
    b(18, by + 5, 2, 2, C.EYE); p(19, by + 5, C.EYEHI);
    b(14, by + 8, 4, 2, C.SHADOW); b(15, by + 8, 2, 1, C.DKBARK); // mouth knot
    // Moss patches on bark
    b(9, by + 6, 2, 2, C.MOSS); p(9, by + 6, C.BTLEAF);
    b(22, by + 9, 2, 2, C.MOSS); p(23, by + 9, C.BTLEAF);
    b(13, by + 12, 2, 1, C.MOSS); p(13, by + 12, C.LEAF);
    // Amber sap drip
    p(15, by + 9, C.AMBER); p(15, by + 10, C.POLLEN);
    // Root-feet (thick, gnarled roots)
    b(8 + lOff, by + 17, 5, 5, C.ROOT);
    b(8 + lOff, by + 17, 2, 5, C.LTBARK); b(12 + lOff, by + 17, 1, 5, C.DKBARK);
    b(19 + rOff, by + 17, 5, 5, C.ROOT);
    b(23 + rOff, by + 17, 1, 5, C.DKBARK);
    // Root tendrils at feet
    b(7 + lOff, by + 22, 7, 2, C.ROOT); b(7 + lOff, by + 22, 2, 1, C.LTBARK);
    p(6 + lOff, by + 23, C.ROOT); p(14 + lOff, by + 23, C.ROOT);
    b(18 + rOff, by + 22, 7, 2, C.ROOT); b(24 + rOff, by + 22, 1, 1, C.SHADOW);
    p(17 + rOff, by + 23, C.ROOT); p(25 + rOff, by + 23, C.ROOT);
    // Small bee pixel on stump
    p(22, by + 4, C.POLLEN); p(23, by + 3, C.POLLEN);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 3: Spore Puff (Swarm) - Tiny floating mushroom spore
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Mushroom cap shape
    b(bx + 1, by, 6, 2, C.MUSH);
    b(bx, by + 2, 8, 3, C.MUSH);
    b(bx, by + 2, 2, 3, C.LTBARK); b(bx + 6, by + 3, 2, 2, C.DKBARK);
    // Cap spots
    p(bx + 2, by + 1, C.SPORE); p(bx + 5, by + 2, C.SPORE);
    p(bx + 3, by + 3, C.AMBER);
    // Tiny eyes
    b(bx + 2, by + 4, 1, 1, C.EYE); b(bx + 5, by + 4, 1, 1, C.EYE);
    // Small stem
    b(bx + 3, by + 5, 2, 2, C.LTBARK);
    p(bx + 3, by + 5, C.HIBARK); p(bx + 4, by + 6, C.DKBARK);
    // Spore particles
    p(bx - 1, by + 1, C.SPORE); p(bx + 8, by + 3, C.SPORE);
    p(bx + 1, by - 1, C.POLLEN);
    if (f % 2 === 0) { p(bx + 7, by, C.POLLEN); p(bx - 2, by + 4, C.SPORE); }
    else { p(bx - 1, by + 5, C.POLLEN); p(bx + 9, by + 1, C.SPORE); }
  } else {
    drawDeathNature(p, b, f - 4, 16, 15);
  }
}

// 4: Bloom Dryad (Healer) - Flower-headed figure, petal skirt, pollen particles, buzzing bee
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const by = 4 + bob;
    const pulse = f === 0 || f === 2;
    // Flower petals around head (more detail, layered)
    b(14, by - 2, 4, 1, C.PETAL); // top petal extra
    b(14, by - 1, 4, 1, C.PETAL); p(15, by - 1, C.WHITE);
    b(12, by, 2, 3, C.PETAL); p(12, by, C.WHITE); // left petal
    b(18, by, 2, 3, C.PETAL); p(19, by + 1, C.PETAL); // right petal
    p(11, by + 1, C.PETAL); p(20, by + 1, C.PETAL);
    b(11, by - 1, 2, 1, C.PETAL); b(19, by - 1, 2, 1, C.PETAL); // diagonal petals
    b(14, by + 4, 4, 1, C.PETAL); p(15, by + 4, C.WHITE); // bottom petal
    // Flower center (face)
    b(13, by + 1, 6, 3, C.POLLEN);
    b(13, by + 1, 6, 1, C.WHITE); p(13, by + 1, C.AMBER);
    // Eyes
    b(14, by + 2, 2, 1, C.DKLEAF); p(14, by + 2, C.LEAF);
    b(17, by + 2, 2, 1, C.DKLEAF); p(17, by + 2, C.LEAF);
    // Pollen particles floating (more, animated)
    p(15, by - 2, pulse ? C.POLLEN : C.WHITE); p(16, by - 3, pulse ? C.WHITE : C.POLLEN);
    p(10, by, C.POLLEN); p(21, by + 2, C.POLLEN);
    p(9, by - 1, pulse ? C.POLLEN : C.AMBER); p(22, by - 1, pulse ? C.AMBER : C.POLLEN);
    // Buzzing bee (shifts position per frame)
    const beePos = [[7, by - 2], [8, by - 1], [6, by - 1], [9, by - 2]][f];
    p(beePos[0], beePos[1], C.POLLEN); p(beePos[0] + 1, beePos[1], C.DKBARK); // bee body
    p(beePos[0], beePos[1] - 1, C.WHITE); // bee wing
    // Green body
    b(13, by + 5, 6, 4, C.LEAF);
    b(13, by + 5, 2, 4, C.BTLEAF); b(18, by + 6, 1, 3, C.DKLEAF);
    // Small flower buds on body
    p(14, by + 6, C.PETAL); p(17, by + 7, C.PETAL);
    // Petal skirt (wider, more detailed)
    b(10, by + 9, 12, 3, C.PETAL);
    b(10, by + 9, 3, 3, C.PETAL); b(19, by + 10, 3, 2, C.PETAL);
    // Skirt highlights and petal veins
    p(11, by + 9, C.WHITE); p(14, by + 10, C.WHITE); p(17, by + 10, C.WHITE);
    p(12, by + 10, C.PETAL); p(19, by + 9, C.PETAL);
    b(11, by + 12, 10, 2, C.LEAF);
    b(11, by + 12, 2, 2, C.BTLEAF); b(19, by + 13, 2, 1, C.DKLEAF);
    // Vine arms
    b(10, by + 6, 3, 2, C.VINE); p(10, by + 6, C.BTLEAF);
    b(9, by + 7, 2, 2, C.VINE); p(8, by + 8, C.LEAF);
    b(19, by + 6, 3, 2, C.VINE); p(21, by + 7, C.DKLEAF);
    b(22, by + 7, 2, 2, C.DKLEAF);
    // Heal sparkles + pollen from hands
    const px_ = [7, 5, 8, 6][f];
    p(px_, by + 7, C.POLLEN); p(px_ + 1, by + 6, C.GLOW);
    p(px_ - 1, by + 8, pulse ? C.POLLEN : C.GLOW); // extra pollen
    p(24, by + 7, C.POLLEN); p(23, by + 6, C.GLOW);
    p(25, by + 8, pulse ? C.GLOW : C.POLLEN);
    // Falling pollen particles around feet
    p(11, by + 15, pulse ? C.POLLEN : C.AMBER); p(20, by + 14, pulse ? C.AMBER : C.POLLEN);
    p(15, by + 16, pulse ? C.POLLEN : C.WHITE);
    // Legs
    b(13, by + 14, 3, 4, C.VINE);
    b(16, by + 14, 3, 4, C.VINE); b(18, by + 14, 1, 4, C.DKLEAF);
    // Feet
    b(12, by + 18, 4, 2, C.ROOT); b(16, by + 18, 4, 2, C.ROOT);
  } else {
    drawDeathNature(p, b, f - 4, 16, 13);
  }
}

// 5: Ancient Oak (Boss) - Massive gnarled tree, face in trunk, hanging moss/vines, branch-arms with leaves, root-feet, bird nest, golden sap
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 0 + bob;
    const leafSway = [0, 1, 0, -1][f];

    // === MASSIVE LEAF CANOPY (wide, multi-layered) ===
    // Top layer
    b(10, by - 2, 12, 2, C.LEAF); b(11, by - 2, 10, 1, C.BTLEAF);
    p(9, by - 1, C.BTLEAF); p(22, by - 1, C.DKLEAF);
    // Middle layer (widest)
    b(5, by, 22, 3, C.LEAF);
    b(5, by, 4, 3, C.BTLEAF); b(24, by + 1, 3, 2, C.DKLEAF);
    p(4, by + 1, C.BTLEAF); p(27, by + 1, C.DKLEAF);
    // Lower canopy fringe
    b(4, by + 3, 24, 3, C.LEAF);
    b(4, by + 3, 3, 3, C.BTLEAF); b(25, by + 4, 3, 2, C.DKLEAF);
    p(3, by + 4, C.LEAF); p(28, by + 4, C.DKLEAF);
    // Leaf detail highlights & glow spots
    p(8, by - 1, C.GLOW); p(13, by - 2, C.GLOW); p(18, by - 1, C.GLOW);
    p(6, by + 1, C.GLOW); p(11, by + 2, C.BTLEAF); p(16, by, C.GLOW); p(21, by + 1, C.BTLEAF);
    p(8, by + 3, C.GLOW); p(14, by + 4, C.BTLEAF); p(20, by + 3, C.GLOW);
    p(24, by + 3, C.DKLEAF); p(5, by + 5, C.BTLEAF); p(26, by + 5, C.DKLEAF);

    // === BIRD NEST (tucked in upper-right canopy) ===
    b(22, by, 3, 2, C.NEST); p(22, by, C.LTBARK); p(24, by + 1, C.DKBARK);
    p(23, by - 1, C.BTLEAF); // egg-like speck
    p(22, by - 1, C.POLLEN);

    // === HANGING MOSS / VINES (swaying per frame) ===
    p(6 + leafSway, by + 5, C.MOSS); p(6 + leafSway, by + 6, C.MOSS); p(7 + leafSway, by + 7, C.DKLEAF);
    p(25 - leafSway, by + 5, C.MOSS); p(25 - leafSway, by + 6, C.DKLEAF);
    p(10 + leafSway, by + 5, C.VINE); p(10 + leafSway, by + 6, C.VINE); p(10 + leafSway, by + 7, C.DKLEAF);
    p(21 - leafSway, by + 5, C.VINE); p(21 - leafSway, by + 6, C.DKLEAF);

    // === MASSIVE TRUNK (fills center, gnarled bark) ===
    b(8, by + 6, 16, 14, C.BARK);
    b(8, by + 6, 3, 14, C.LTBARK); b(9, by + 6, 2, 12, C.HIBARK);
    b(21, by + 6, 3, 14, C.DKBARK); b(22, by + 8, 2, 10, C.SHADOW);
    b(10, by + 6, 12, 2, C.LTBARK); b(11, by + 6, 10, 1, C.HIBARK);

    // Gnarled bark texture (extensive)
    b(12, by + 9, 1, 3, C.DKBARK); b(19, by + 11, 1, 3, C.DKBARK);
    p(14, by + 13, C.MIDBARK); p(11, by + 15, C.DKBARK); p(17, by + 8, C.MIDBARK);
    p(13, by + 16, C.DKBARK); p(20, by + 9, C.MIDBARK); p(15, by + 10, C.DKBARK);
    b(16, by + 14, 1, 2, C.MIDBARK); b(10, by + 12, 1, 2, C.LTBARK);

    // === FACE IN TRUNK (large, ancient, glowing amber eyes) ===
    // Eyes (wide, glowing)
    b(11, by + 8, 4, 3, C.EYE); b(12, by + 8, 2, 1, C.EYEHI);
    p(11, by + 10, C.AMBER); p(14, by + 8, C.SAP);
    b(17, by + 8, 4, 3, C.EYE); b(18, by + 8, 2, 1, C.EYEHI);
    p(17, by + 10, C.AMBER); p(20, by + 8, C.SAP);
    // Heavy brow ridges
    b(10, by + 7, 6, 1, C.DKBARK); b(16, by + 7, 6, 1, C.DKBARK);
    p(10, by + 7, C.SHADOW); p(21, by + 7, C.SHADOW);
    // Nose knot
    b(15, by + 10, 2, 2, C.DKBARK); p(15, by + 10, C.MIDBARK);
    // Mouth (gnarled opening, wide)
    b(12, by + 12, 8, 2, C.SHADOW); b(13, by + 12, 6, 1, C.DKBARK);
    p(13, by + 13, C.DKBARK); p(18, by + 13, C.DKBARK);

    // === GOLDEN SAP LINES (running down trunk) ===
    p(13, by + 14, C.SAP); p(13, by + 15, C.SAP); p(14, by + 16, C.DKSAP);
    p(18, by + 14, C.SAP); p(19, by + 15, C.DKSAP);

    // === AMBER CORE GLOW (heartwood) ===
    b(14, by + 15, 4, 3, C.AMBER); b(15, by + 16, 2, 1, C.POLLEN);
    p(15, by + 15, C.WHITE); p(16, by + 17, C.AMBER);
    p(14, by + 15, C.SAP);

    // === MASSIVE BRANCH ARMS (with leaf clusters at tips) ===
    // Left arm
    b(4, by + 8, 4, 3, C.BARK); b(4, by + 8, 1, 3, C.LTBARK);
    b(2, by + 7, 3, 3, C.BARK); p(2, by + 7, C.LTBARK);
    b(0, by + 6, 3, 2, C.BARK); p(0, by + 6, C.LTBARK);
    // Left leaf cluster
    b(0, by + 4, 3, 2, C.LEAF); p(0, by + 4, C.BTLEAF); p(2, by + 4, C.GLOW);
    p(0, by + 3, C.BTLEAF); p(1, by + 3, C.LEAF);
    // Right arm
    b(24, by + 8, 4, 3, C.BARK); b(27, by + 8, 1, 3, C.DKBARK);
    b(27, by + 7, 3, 3, C.DKBARK);
    b(29, by + 6, 3, 2, C.DKBARK);
    // Right leaf cluster
    b(29, by + 4, 3, 2, C.LEAF); p(31, by + 4, C.DKLEAF); p(29, by + 4, C.BTLEAF);
    p(30, by + 3, C.LEAF); p(31, by + 3, C.DKLEAF);
    // Small branch twig off left arm
    p(1, by + 9, C.BARK); p(0, by + 10, C.MOSS);

    // === ROOT LEGS (thick, spreading, gripping ground) ===
    b(8 + lOff, by + 20, 7, 6, C.ROOT);
    b(8 + lOff, by + 20, 2, 6, C.LTBARK); b(14 + lOff, by + 20, 1, 6, C.DKBARK);
    p(10 + lOff, by + 20, C.MIDBARK);
    b(17 + rOff, by + 20, 7, 6, C.ROOT);
    b(23 + rOff, by + 20, 1, 6, C.DKBARK);
    p(19 + rOff, by + 20, C.MIDBARK);
    // Knee knots (gnarled)
    b(8 + lOff, by + 23, 7, 1, C.DKBARK); p(10 + lOff, by + 23, C.MIDBARK);
    b(17 + rOff, by + 23, 7, 1, C.DKBARK); p(20 + rOff, by + 23, C.MIDBARK);
    // Root feet (wide, spreading, gripping earth)
    b(6 + lOff, by + 26, 10, 3, C.ROOT); b(7 + lOff, by + 26, 8, 2, C.MIDBARK);
    p(6 + lOff, by + 28, C.SHADOW); p(15 + lOff, by + 28, C.SHADOW);
    // Extra root tendrils
    p(5 + lOff, by + 27, C.ROOT); p(4 + lOff, by + 28, C.EARTH);
    b(15 + rOff, by + 26, 10, 3, C.ROOT); b(16 + rOff, by + 26, 8, 2, C.MIDBARK);
    p(15 + rOff, by + 28, C.SHADOW); p(24 + rOff, by + 28, C.SHADOW);
    p(25 + rOff, by + 27, C.ROOT); p(26 + rOff, by + 28, C.EARTH);

    // === GROUND MOSS (at base) ===
    p(8 + lOff, by + 29, C.MOSS); p(12 + lOff, by + 29, C.MOSS);
    p(19 + rOff, by + 29, C.MOSS); p(23 + rOff, by + 29, C.MOSS);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 6: Vine Runners (Group) - Small treant-like figures
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Small leaf top
    b(13, by, 6, 2, C.LEAF); b(14, by, 4, 1, C.BTLEAF);
    p(12, by + 1, C.LEAF); p(19, by + 1, C.DKLEAF);
    // Small head
    b(13, by + 2, 6, 3, C.BARK);
    b(13, by + 2, 2, 3, C.LTBARK); p(18, by + 3, C.DKBARK);
    // Eyes
    p(14, by + 3, C.EYE); p(17, by + 3, C.EYE);
    // Compact body
    b(12, by + 5, 8, 5, C.BARK);
    b(12, by + 5, 2, 5, C.LTBARK); b(19, by + 5, 1, 5, C.DKBARK);
    b(13, by + 5, 6, 1, C.HIBARK);
    // Vine detail
    p(14, by + 7, C.VINE); p(17, by + 8, C.VINE);
    // Small branch arms
    b(10, by + 6, 2, 3, C.BARK); p(10, by + 6, C.LTBARK);
    b(20, by + 6, 2, 3, C.DKBARK);
    // Legs
    b(13 + lOff, by + 10, 3, 4, C.ROOT); b(13 + lOff, by + 10, 1, 4, C.LTBARK);
    b(16 + rOff, by + 10, 3, 4, C.ROOT); b(18 + rOff, by + 10, 1, 4, C.DKBARK);
    // Feet
    b(12 + lOff, by + 14, 4, 2, C.ROOT);
    b(16 + rOff, by + 14, 4, 2, C.ROOT);
  } else {
    drawDeathNature(p, b, f - 4, 16, 15);
  }
}

// 7: Pod Creep (Splitter) - Bulging seed pod with split line
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 6 + bob;
    const bx = wobX;
    // Seed pod body (oval, bulging)
    b(12 + bx, by, 8, 2, C.MOSS);
    b(10 + bx, by + 2, 12, 8, C.MOSS);
    b(11 + bx, by + 10, 10, 3, C.MOSS);
    b(13 + bx, by + 13, 6, 2, C.DKLEAF);
    // Shading
    b(10 + bx, by + 2, 2, 8, C.BTLEAF); b(11 + bx, by + 3, 1, 6, C.LEAF);
    b(20 + bx, by + 2, 2, 8, C.DKLEAF); b(21 + bx, by + 4, 1, 6, C.DKBARK);
    b(12 + bx, by, 8, 1, C.BTLEAF);
    b(13 + bx, by + 13, 6, 1, C.DKLEAF);
    // Visible split line (bright, vertical)
    b(16 + bx, by + 1, 1, 12, C.AMBER);
    p(16 + bx, by, C.POLLEN); p(16 + bx, by + 13, C.POLLEN);
    // Split glow
    p(15 + bx, by + 4, C.POLLEN); p(17 + bx, by + 4, C.POLLEN);
    p(15 + bx, by + 8, C.POLLEN); p(17 + bx, by + 8, C.POLLEN);
    // Texture bumps
    p(13 + bx, by + 3, C.BTLEAF); p(19 + bx, by + 5, C.DKLEAF);
    p(12 + bx, by + 7, C.LEAF); p(18 + bx, by + 9, C.DKLEAF);
    // Small eyes
    b(13 + bx, by + 4, 2, 2, C.EYE); p(13 + bx, by + 4, C.EYEHI);
    b(18 + bx, by + 4, 2, 2, C.EYE); p(18 + bx, by + 4, C.EYEHI);
    // Stubby root-feet
    b(12 + bx, by + 15, 3, 2, C.ROOT);
    b(17 + bx, by + 15, 3, 2, C.ROOT);
    // Leaf sprout on top
    p(15 + bx, by - 1, C.LEAF); p(16 + bx, by - 1, C.BTLEAF);
    p(17 + bx, by - 2, C.BTLEAF);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 8: Thorn Shell (Shielded) - Creature in dense thorn/briar barrier
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Inner body (bark creature)
    b(13, by + 2, 6, 4, C.BARK); b(13, by + 2, 2, 4, C.LTBARK);
    b(18, by + 3, 1, 3, C.DKBARK);
    // Eyes peeking through thorns
    b(14, by + 3, 2, 1, C.EYE); p(14, by + 3, C.EYEHI);
    b(17, by + 3, 2, 1, C.EYE); p(17, by + 3, C.EYEHI);
    // Body
    b(11, by + 6, 10, 7, C.BARK);
    b(11, by + 6, 2, 7, C.LTBARK); b(19, by + 6, 2, 7, C.DKBARK);
    b(12, by + 6, 8, 1, C.HIBARK);
    // Thorn barrier (surrounding ring of spikes)
    // Top thorns
    p(12, by - 1, C.DKLEAF); p(14, by - 2, C.VINE); p(16, by - 1, C.DKLEAF);
    p(18, by - 2, C.VINE); p(20, by - 1, C.DKLEAF);
    // Left thorns
    p(8, by + 3, C.VINE); p(7, by + 5, C.DKLEAF); p(8, by + 7, C.VINE);
    p(7, by + 9, C.DKLEAF); p(8, by + 11, C.VINE);
    b(9, by + 2, 2, 10, C.DKLEAF); b(9, by + 2, 1, 10, C.VINE);
    // Right thorns
    p(23, by + 3, C.VINE); p(24, by + 5, C.DKLEAF); p(23, by + 7, C.VINE);
    p(24, by + 9, C.DKLEAF); p(23, by + 11, C.VINE);
    b(21, by + 2, 2, 10, C.DKLEAF); b(22, by + 2, 1, 10, C.DKBARK);
    // Bottom thorns
    p(12, by + 14, C.VINE); p(15, by + 15, C.DKLEAF); p(18, by + 14, C.VINE);
    b(11, by + 13, 10, 1, C.DKLEAF);
    // Briar texture
    p(10, by + 4, C.MOSS); p(21, by + 6, C.MOSS);
    p(10, by + 8, C.LEAF); p(21, by + 10, C.LEAF);
    // Legs
    b(12 + lOff, by + 14, 3, 5, C.ROOT);
    b(17 + rOff, by + 14, 3, 5, C.ROOT);
    // Feet
    b(11 + lOff, by + 19, 4, 2, C.ROOT);
    b(17 + rOff, by + 19, 4, 2, C.ROOT);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 9: Wisp Moth (Evasive) - Ethereal translucent green, leaf-shaped wings
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 3, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 12 + fx, by = 10 + fy;
    // Moth body (small, slender)
    b(bx + 2, by, 4, 2, C.BTLEAF);
    b(bx + 3, by + 2, 2, 4, C.LEAF);
    b(bx + 3, by + 5, 2, 2, C.DKLEAF);
    // Eyes
    p(bx + 3, by, C.EYE); p(bx + 5, by, C.EYE);
    // Antennae
    p(bx + 2, by - 1, C.GLOW); p(bx + 1, by - 2, C.BTLEAF);
    p(bx + 6, by - 1, C.GLOW); p(bx + 7, by - 2, C.BTLEAF);
    // Left leaf-shaped wing
    b(bx - 3, by + 1, 5, 3, C.LEAF);
    b(bx - 3, by + 1, 2, 3, C.BTLEAF); b(bx + 1, by + 2, 1, 2, C.DKLEAF);
    p(bx - 4, by + 2, C.BTLEAF); p(bx - 3, by, C.GLOW);
    // Wing vein
    p(bx - 1, by + 2, C.BTLEAF); p(bx - 2, by + 3, C.BTLEAF);
    // Right leaf-shaped wing
    b(bx + 6, by + 1, 5, 3, C.LEAF);
    b(bx + 9, by + 1, 2, 3, C.DKLEAF); b(bx + 6, by + 2, 1, 2, C.BTLEAF);
    p(bx + 11, by + 2, C.DKLEAF); p(bx + 10, by, C.LEAF);
    // Wing vein
    p(bx + 8, by + 2, C.DKLEAF); p(bx + 9, by + 3, C.DKLEAF);
    // Glow particles (ethereal)
    if (f === 0 || f === 2) {
      p(bx - 5, by + 1, C.GLOW); p(bx + 12, by + 3, C.GLOW);
      p(bx + 4, by - 3, C.POLLEN);
    }
    if (f === 1 || f === 3) {
      p(bx - 4, by + 4, C.GLOW); p(bx + 11, by, C.GLOW);
      p(bx + 2, by - 3, C.POLLEN);
    }
    // Ghostly afterimage
    if (f === 1 || f === 3) {
      p(bx - 3, by + 3, C.SPORE); p(bx - 4, by + 2, C.SPORE);
    }
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 10: Rootbound (Regen) - Thick creature regrowing bark, trailing roots
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.BARK : C.DKBARK;
    const hiC = bright ? C.LTBARK : C.BARK;
    const mossC = bright ? C.BTLEAF : C.LEAF;
    // Chunky body (regrowing)
    b(12, by, 8, 3, C.BARK); b(12, by, 3, 3, hiC);
    b(10, by + 3, 12, 8, bodyC);
    b(10, by + 3, 2, 8, hiC); b(11, by + 4, 1, 6, C.HIBARK);
    b(20, by + 3, 2, 8, C.DKBARK); b(21, by + 5, 1, 4, C.SHADOW);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.ROOT);
    // Regrowing bark patches (pulsing)
    b(12, by + 4, 3, 2, mossC); p(13, by + 4, C.GLOW);
    b(18, by + 6, 2, 3, mossC); p(19, by + 7, bright ? C.GLOW : C.LEAF);
    b(14, by + 10, 3, 2, mossC);
    // Eyes
    b(13, by + 1, 2, 2, C.EYE); p(13, by + 1, C.EYEHI);
    b(17, by + 1, 2, 2, C.EYE); p(17, by + 1, C.EYEHI);
    // Amber core (pulsing heal)
    b(14, by + 7, 4, 3, C.AMBER); b(15, by + 8, 2, 1, bright ? C.WHITE : C.POLLEN);
    p(15, by + 7, bright ? C.WHITE : C.AMBER);
    // Trailing roots below and behind
    b(8, by + 12, 2, 4, C.ROOT); p(7, by + 14, C.MIDBARK);
    b(22, by + 11, 2, 4, C.ROOT); p(23, by + 13, C.DKBARK);
    p(6, by + 15, C.ROOT); p(24, by + 14, C.ROOT);
    // Root tendrils at bottom
    b(12, by + 17, 2, 2, C.ROOT); p(11, by + 18, C.MIDBARK);
    b(18, by + 17, 2, 2, C.ROOT); p(20, by + 18, C.DKBARK);
    // Bioluminescent spots
    p(11, by + 6, bright ? C.GLOW : C.LEAF);
    p(19, by + 4, bright ? C.GLOW : C.LEAF);
    p(15, by + 12, bright ? C.POLLEN : C.AMBER);
  } else {
    drawDeathNature(p, b, f - 4, 16, 12);
  }
}

// 11: Canopy Owl (Flying) - Green-brown owl, leaf-pattern wings
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Body (horizontal, facing right)
    b(11, by + 5, 10, 4, C.BARK);
    b(11, by + 5, 10, 1, C.LTBARK); b(11, by + 8, 10, 1, C.DKBARK);
    b(9, by + 7, 2, 2, C.BARK); // tail base
    b(7, by + 7, 2, 2, C.DKBARK); // tail tip
    p(6, by + 7, C.LEAF); p(6, by + 8, C.DKLEAF);
    // Feather texture on body
    p(13, by + 6, C.LTBARK); p(16, by + 6, C.MIDBARK); p(18, by + 6, C.LTBARK);
    p(13, by + 8, C.DKBARK); p(16, by + 8, C.DKBARK);
    // Head (round owl face)
    b(20, by + 3, 5, 5, C.BARK); b(20, by + 3, 5, 2, C.LTBARK);
    p(20, by + 3, C.HIBARK);
    // Owl ear tufts
    p(20, by + 2, C.BARK); p(24, by + 2, C.DKBARK);
    p(19, by + 2, C.LEAF); p(25, by + 2, C.DKLEAF);
    // Beak
    b(25, by + 5, 2, 2, C.AMBER); p(26, by + 5, C.POLLEN);
    // Eyes (large owl eyes)
    b(21, by + 4, 2, 2, C.EYE); p(21, by + 4, C.EYEHI);
    b(23, by + 4, 2, 2, C.EYE); p(23, by + 4, C.EYEHI);
    // Facial disc markings
    p(20, by + 5, C.DKBARK); p(24, by + 6, C.DKBARK);
    // Top wing (leaf-patterned)
    b(11, by + 2 + wingY, 8, 2, C.LEAF);
    b(11, by + 2 + wingY, 8, 1, C.BTLEAF);
    b(9, by + 1 + wingY, 4, 1, C.MOSS);
    b(7, by + wingY, 3, 1, C.BTLEAF);
    p(6, by + wingY - 1, C.DKLEAF);
    // Leaf vein on top wing
    p(12, by + 3 + wingY, C.DKLEAF); p(15, by + 3 + wingY, C.DKLEAF);
    p(18, by + 3 + wingY, C.DKLEAF);
    // Bottom wing
    b(11, by + 10 - wingY, 8, 2, C.DKLEAF);
    b(11, by + 11 - wingY, 8, 1, C.DKBARK);
    b(9, by + 11 - wingY, 4, 1, C.DKLEAF);
    b(7, by + 12 - wingY, 3, 1, C.DKBARK);
    // Leaf vein on bottom wing
    p(12, by + 10 - wingY, C.MOSS); p(15, by + 10 - wingY, C.MOSS);
    // Shadow below
    b(13, by + 16, 6, 1, C.DKBARK); b(14, by + 17, 4, 1, C.SHADOW);
    p(15, by + 18, C.SHADOW); p(16, by + 18, C.SHADOW);
  } else {
    drawDeathNature(p, b, f - 4, 16, 12);
  }
}

// Helper: draw nature mage base (robed tree figure with staff)
function drawMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const iron = bodyMod === 'iron';
  const mist = bodyMod === 'mist';
  const bodyC = iron ? C.DKBARK : mist ? C.MOSS : C.BARK;
  const robeC = iron ? C.BARK : mist ? C.LEAF : C.BARK;
  const hoodC = iron ? C.SHADOW : mist ? C.DKLEAF : C.DKBARK;
  const robeHi = iron ? C.LTBARK : mist ? C.BTLEAF : C.LTBARK;
  const robeMid = iron ? C.MIDBARK : mist ? C.MOSS : C.MIDBARK;

  // Hooded head
  b(14, by, 4, 1, C.LTBARK);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.SHADOW);
  // Hood fold detail
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.SHADOW); b(14, by + 3, 4, 1, C.DKBARK);
  // Eyes (glowing)
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Robe body
  b(12, by + 5, 8, 4, robeC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, C.DKBARK);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, C.DKBARK); b(21, by + 10, 1, 3, C.SHADOW);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, C.DKBARK); b(22, by + 14, 1, 3, C.SHADOW);
  b(8, by + 17, 16, 2, hoodC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.SHADOW);
  // Robe hem
  b(8, by + 19, 16, 1, C.SHADOW);
  // Robe vine detail lines
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, C.DKBARK);
  p(11, by + 15, robeMid); p(20, by + 15, C.DKBARK);
  // Staff in right hand
  b(22, by + 1, 2, 16, iron ? C.DKBARK : C.ROOT);
  b(22, by + 1, 1, 16, iron ? C.SHADOW : C.MIDBARK);
  // Staff top (nature gem)
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, C.WHITE);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.WHITE); p(23, by - 3, C.WHITE);
  // Staff wrapping detail
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm (holding out)
  b(9, by + 7 + lOff, 3, 2, robeC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, hoodC);
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.SHADOW);
}

// 12: Ironbark Elder (Iron Mage) - Robed tree figure, dark hardened bark staff
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.AMBER, C.DKBARK, 'iron');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Extra: heavy bark armor plates
    b(12, by + 7, 8, 2, C.DKBARK);
    b(13, by + 7, 6, 1, C.BARK);
    // Shoulder bark plates
    b(10, by + 9, 3, 2, C.BARK); b(10, by + 9, 1, 2, C.LTBARK);
    b(19, by + 9, 3, 2, C.DKBARK);
    // Belt buckle (amber)
    b(14, by + 12, 4, 2, C.BARK); b(15, by + 12, 2, 1, C.AMBER);
    // Hardened bark texture
    p(10, by + 16, C.BARK); p(21, by + 16, C.DKBARK);
    p(13, by + 14, C.MIDBARK); p(18, by + 14, C.SHADOW);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 13: Windbloom Mage (Haste Mage) - Robed figure, swirling leaves
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.BTLEAF, C.LEAF, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Swirling leaf particles behind (speed lines)
    b(5, by + 5, 3, 1, C.LEAF); b(3, by + 5, 2, 1, C.BTLEAF);
    b(4, by + 9, 4, 1, C.BTLEAF); p(2, by + 9, C.LEAF);
    b(5, by + 13, 3, 1, C.LEAF); p(3, by + 13, C.BTLEAF);
    b(6, by + 16, 2, 1, C.LEAF);
    // Swirling leaf shapes
    if (f % 2 === 0) {
      p(2, by + 3, C.BTLEAF); p(1, by + 7, C.LEAF);
      b(3, by + 11, 2, 1, C.GLOW);
    } else {
      p(3, by + 4, C.LEAF); p(2, by + 8, C.BTLEAF);
      b(4, by + 12, 2, 1, C.LEAF);
    }
    // Tiny leaf shapes
    p(1, by + 6, C.SPORE); p(0, by + 10, C.SPORE);
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 14: Fog Weaver (Mist Mage) - Robed figure, mist/pollen cloud
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.POLLEN, C.SPORE, 'mist');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Pollen/mist clouds (multi-pixel)
    b(mx, by + my, 2, 1, C.POLLEN); p(mx + 2, by + my + 1, C.SPORE);
    b(mx + 16, by + my - 2, 2, 1, C.SPORE); p(mx + 18, by + my - 1, C.POLLEN);
    // Additional mist wisps
    b(25, by + 3, 2, 1, C.POLLEN); p(26, by + 4, C.SPORE);
    b(4, by + 15, 3, 1, C.SPORE); p(3, by + 16, C.POLLEN);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.SPORE); p(2, by + 15, C.POLLEN);
      p(27, by + 8, C.SPORE);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.POLLEN); p(5, by + 10, C.SPORE);
    }
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// 15: Grove Tender (Heal Mage) - Robed figure, flowering staff, green growth
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GLOW, C.VINE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff flowering top (blossoms)
    p(22, by - 3, C.PETAL); p(23, by - 3, C.PETAL);
    b(21, by - 1, 4, 1, C.LEAF); p(21, by - 2, C.VINE);
    p(24, by - 2, C.VINE);
    p(22, by - 4, C.PETAL); p(23, by - 4, C.PETAL);
    p(21, by - 3, C.BTLEAF); p(24, by - 3, C.BTLEAF);
    // Heal particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GLOW); p(px_ + 2, by + 4, C.LEAF);
    p(px_ - 1, by + 6, C.GLOW);
    // Growth cross symbol near staff
    b(24, by + 5, 2, 1, C.GLOW);
    b(25, by + 4, 1, 3, C.GLOW);
    p(25, by + 3, C.LEAF); p(25, by + 7, C.LEAF);
    p(23, by + 5, C.LEAF); p(26, by + 5, C.LEAF);
    // Extra heal sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.GLOW); p(8, by + 8, C.LEAF);
    } else {
      p(7, by + 2, C.LEAF); p(5, by + 7, C.GLOW);
    }
  } else {
    drawDeathNature(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION HELPER =====
// Nature death: creature wilts, leaves fall, bark crumbles, scattered leaves/twigs
function drawDeathNature(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Wilting — body cracks, leaves droop
    b(cx - 4, cy - 4, 10, 10, C.BARK);
    b(cx - 3, cy - 5, 8, 2, C.BARK);
    b(cx - 2, cy - 6, 6, 1, C.LTBARK);
    b(cx - 3, cy + 6, 8, 2, C.DKBARK);
    b(cx - 2, cy + 7, 4, 1, C.SHADOW);
    // Shading on wilting silhouette
    b(cx - 4, cy - 4, 2, 10, C.LTBARK);
    b(cx + 4, cy - 2, 2, 8, C.DKBARK);
    // Crack lines through bark
    p(cx, cy - 5, C.AMBER); p(cx + 1, cy - 4, C.POLLEN);
    p(cx + 2, cy - 3, C.AMBER); p(cx + 3, cy - 2, C.POLLEN);
    p(cx - 2, cy - 3, C.POLLEN); p(cx - 3, cy - 2, C.AMBER);
    p(cx - 1, cy, C.POLLEN); p(cx + 3, cy, C.AMBER);
    p(cx - 3, cy + 1, C.AMBER); p(cx + 1, cy + 1, C.POLLEN);
    p(cx, cy + 2, C.AMBER); p(cx - 2, cy + 3, C.POLLEN);
    p(cx + 2, cy + 3, C.POLLEN); p(cx + 4, cy + 2, C.POLLEN);
    p(cx - 4, cy + 2, C.AMBER);
    p(cx + 1, cy + 4, C.POLLEN); p(cx - 1, cy + 5, C.POLLEN);
    // Drooping leaves on top
    p(cx - 2, cy - 6, C.DKLEAF); p(cx + 1, cy - 7, C.LEAF);
    p(cx + 3, cy - 5, C.DKLEAF); p(cx - 3, cy - 5, C.LEAF);
    // Amber glow at center
    b(cx - 1, cy - 1, 3, 3, C.AMBER);
    p(cx, cy, C.POLLEN); p(cx - 1, cy, C.AMBER); p(cx + 1, cy, C.AMBER);
  } else if (deathFrame === 1) {
    // Frame 1: Crumbling apart — bark fragments + scattered leaves
    // Bark fragments in 8 directions
    b(cx - 6, cy - 6, 2, 2, C.BARK); p(cx - 6, cy - 6, C.LTBARK);
    b(cx + 5, cy - 6, 2, 2, C.ROOT); p(cx + 6, cy - 6, C.LTBARK);
    b(cx - 7, cy - 1, 2, 2, C.DKBARK); p(cx - 7, cy - 1, C.BARK);
    b(cx + 6, cy - 1, 2, 2, C.DKBARK); p(cx + 7, cy, C.SHADOW);
    b(cx - 6, cy + 5, 2, 2, C.ROOT);
    b(cx + 5, cy + 5, 2, 2, C.ROOT); p(cx + 6, cy + 6, C.SHADOW);
    b(cx - 1, cy - 7, 2, 2, C.BARK); p(cx, cy - 7, C.LTBARK);
    b(cx - 1, cy + 6, 2, 2, C.DKBARK);
    // Scattered leaves
    p(cx - 4, cy - 4, C.LEAF); p(cx + 4, cy - 3, C.BTLEAF);
    p(cx - 3, cy + 3, C.LEAF); p(cx + 3, cy + 4, C.DKLEAF);
    p(cx - 5, cy, C.BTLEAF); p(cx + 5, cy + 1, C.LEAF);
    // Tiny dust particles
    p(cx - 4, cy - 4, C.SPORE); p(cx + 4, cy - 4, C.SPORE);
    p(cx - 4, cy + 4, C.SPORE); p(cx + 4, cy + 4, C.SPORE);
    // Center flash (amber burst)
    b(cx - 1, cy - 1, 3, 3, C.POLLEN);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Just scattered leaves and twigs on ground
    p(cx - 8, cy + 4, C.LEAF); p(cx + 7, cy + 3, C.BTLEAF);
    p(cx - 5, cy + 5, C.DKLEAF); p(cx + 6, cy + 5, C.LEAF);
    p(cx - 3, cy + 6, C.BTLEAF); p(cx + 4, cy + 6, C.DKLEAF);
    p(cx, cy + 5, C.LEAF); p(cx + 2, cy + 4, C.SPORE);
    // Small twig pieces
    p(cx - 6, cy + 3, C.ROOT); p(cx + 8, cy + 4, C.ROOT);
    p(cx - 2, cy + 5, C.MIDBARK); p(cx + 3, cy + 5, C.MIDBARK);
    // Fading spore dust
    p(cx - 7, cy - 2, C.SPORE); p(cx + 9, cy - 1, C.SPORE);
    p(cx - 1, cy - 4, C.SPORE); p(cx + 2, cy - 3, C.SPORE);
    p(cx - 4, cy + 2, C.SPORE);
  }
}

// ===== DRAW ALL CREEPS =====
const DRAW_FNS = [
  drawStandard, drawFast, drawArmored, drawSwarm, drawHealer, drawBoss,
  drawGroup, drawSplitter, drawShielded, drawEvasive, drawRegenerator, drawFlying,
  drawMageIron, drawMageHaste, drawMageMist, drawMageHeal,
];

function drawAllCreeps(ctx: CanvasRenderingContext2D) {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const frame = row; // 0-3 walk, 4-6 death
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], frame);
    }
  }
}

// ===== COMPONENT =====
export default function NatureCreepSprites() {
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sc = sheetRef.current!;
    sc.width = SHEET_W;
    sc.height = SHEET_H;
    const sctx = sc.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    drawAllCreeps(sctx);

    // Preview canvas (3x scale)
    const pv = previewRef.current!;
    const S = 3;
    const LW = 72; // label width
    const LH = 14; // label height
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a1808';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#44aa44';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a2a1a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#88bb88';
          pc.font = '7px monospace';
          pc.fillText(CREEP_NAMES[cc], bx + 1, by - 2);
        }
      }
    }

    setReady(true);
  }, []);

  const download = useCallback((ref: React.RefObject<HTMLCanvasElement>, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  }, []);

  const [view, setView] = useState<'preview' | 'actual'>('preview');

  return (
    <div style={{ background: '#0a1808', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.LEAF, margin: 0, fontSize: 15 }}>NATURE FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'nature_creeps.png')}
            style={{
              background: C.LEAF, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        {(['preview', 'actual'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? '#1a2a1a' : '#111',
              color: view === v ? C.BTLEAF : '#445566',
              border: `1px solid ${view === v ? '#234' : '#222'}`,
              padding: '4px 8px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 10, textTransform: 'capitalize',
            }}
          >
            {v === 'actual' ? 'Actual Size' : 'Preview (3x)'}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '75vh' }}>
        <canvas
          ref={previewRef}
          data-label="Nature Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Treant Sapling (Standard)","Forest Fox (Fast)","Bark Golem (Armored)","Spore Puff (Swarm)","Bloom Dryad (Healer)","Ancient Oak (Boss)","Vine Runners (Group)","Pod Creep (Splitter)","Thorn Shell (Shielded)","Wisp Moth (Evasive)","Rootbound (Regen)","Canopy Owl (Flying)","Ironbark Elder (Iron)","Windbloom Mage (Haste)","Fog Weaver (Mist)","Grove Tender (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Nature Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Treant Sapling (Standard)","Forest Fox (Fast)","Bark Golem (Armored)","Spore Puff (Swarm)","Bloom Dryad (Healer)","Ancient Oak (Boss)","Vine Runners (Group)","Pod Creep (Splitter)","Thorn Shell (Shielded)","Wisp Moth (Evasive)","Rootbound (Regen)","Canopy Owl (Flying)","Ironbark Elder (Iron)","Windbloom Mage (Haste)","Fog Weaver (Mist)","Grove Tender (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a2a1a',
          }}
        />
      </div>
      <div style={{ color: '#448844', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66bb66' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66bb66' }}>Phaser:</b>{' '}
          <code style={{ color: C.BTLEAF }}>
            {"this.load.spritesheet('nature_creeps','nature_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66bb66' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66bb66' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
