import { useRef, useEffect, useState, useCallback } from "react";

// ===== INFERNAL CREEP PALETTE =====
const C = {
  SKIN: '#aa3322',
  DKSKIN: '#772211',
  BSKIN: '#cc4433',
  FIRE: '#ff6600',
  BFIRE: '#ffaa44',
  DKFIRE: '#cc4400',
  EMBER: '#ff4422',
  HORN: '#443322',
  DKHORN: '#221100',
  FTIP: '#ffdd44',
  ASH: '#444444',
  SMOKE: '#666666',
  HELL: '#551100',
  MAGMA: '#ff3300',
  BRIM: '#885522',
  EYE: '#ffee00',
  // Extra shading
  MID: '#993322',
  LSKIN: '#bb4433',
  DKASH: '#333333',
  WHITE: '#ffffff',
  GFIRE: '#88ff44', // green hellfire for soulfire warlock
  DKGFIRE: '#449922',
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
  'Imp', 'Hell Hound', 'Pit Fiend', 'Ember Sprite', 'Infernal Priest', 'Demon Lord',
  'Legion Squad', 'Magma Blob', 'Flame Ward', 'Shade Demon', 'Phoenix Spawn', 'Bat Demon',
  'Ashskin Warlock', 'Blaze Warlock', 'Smoke Warlock', 'Soulfire Warlock'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== CREEP DRAW FUNCTIONS =====

// 0: Imp (Standard) - small red demon with stubby horns and tail
function drawImp(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 6 + bob;
    // Horns
    p(12, by - 2, C.HORN); p(11, by - 1, C.HORN); p(12, by - 1, C.DKHORN);
    p(19, by - 2, C.HORN); p(20, by - 1, C.HORN); p(19, by - 1, C.DKHORN);
    // Head
    b(12, by, 8, 5, C.SKIN); b(13, by, 6, 2, C.BSKIN); p(12, by, C.LSKIN);
    b(19, by + 3, 1, 2, C.DKSKIN);
    // Eyes
    b(13, by + 2, 2, 2, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.EYE); p(18, by + 2, C.WHITE);
    // Mouth
    b(14, by + 4, 4, 1, C.DKHORN);
    // Neck
    b(13, by + 5, 6, 1, C.DKSKIN);
    // Torso
    b(11, by + 6, 10, 7, C.SKIN);
    b(11, by + 6, 2, 7, C.BSKIN); b(19, by + 6, 2, 7, C.DKSKIN);
    b(12, by + 6, 8, 1, C.LSKIN);
    // Chest detail
    p(15, by + 8, C.DKSKIN); p(16, by + 8, C.DKSKIN);
    b(12, by + 12, 8, 1, C.DKSKIN);
    // Arms
    b(9, by + 7, 2, 5, C.SKIN); p(9, by + 7, C.BSKIN);
    b(21, by + 7, 2, 5, C.DKSKIN);
    // Claws
    p(8, by + 12, C.HORN); p(9, by + 12, C.SKIN);
    p(22, by + 12, C.HORN); p(21, by + 12, C.DKSKIN);
    // Legs
    b(12 + lOff, by + 13, 3, 5, C.SKIN); b(12 + lOff, by + 13, 1, 5, C.BSKIN);
    b(17 + rOff, by + 13, 3, 5, C.SKIN); b(19 + rOff, by + 13, 1, 5, C.DKSKIN);
    // Feet
    b(11 + lOff, by + 18, 4, 2, C.DKSKIN); b(11 + lOff, by + 18, 2, 1, C.SKIN);
    b(17 + rOff, by + 18, 4, 2, C.DKSKIN);
    // Tail
    b(21, by + 11, 2, 1, C.SKIN); b(23, by + 10, 2, 1, C.SKIN);
    p(25, by + 9, C.SKIN); p(26, by + 8, C.DKSKIN);
    p(27, by + 7, C.EMBER); // tail tip
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 1: Hell Hound (Fast) - four-legged fire dog
function drawHellHound(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 1, 0][f];
    const legOff = [0, 2, 0, -2][f];
    const by = 10 + bob;
    // Body (horizontal)
    b(8, by + 2, 16, 6, C.SKIN); b(8, by + 2, 16, 2, C.BSKIN);
    b(8, by + 6, 16, 2, C.DKSKIN);
    // Head
    b(22, by, 6, 5, C.SKIN); b(22, by, 6, 2, C.BSKIN);
    p(22, by, C.LSKIN);
    // Snout
    b(27, by + 2, 3, 3, C.BSKIN); b(29, by + 3, 1, 1, C.DKHORN);
    // Eyes
    b(24, by + 1, 2, 1, C.EYE); p(24, by + 1, C.WHITE);
    // Ears
    p(23, by - 1, C.SKIN); p(26, by - 1, C.SKIN);
    p(23, by - 2, C.DKSKIN); p(26, by - 2, C.DKSKIN);
    // Front legs
    b(20 + legOff, by + 8, 2, 5, C.SKIN); b(23, by + 8, 2, 5, C.DKSKIN);
    b(19 + legOff, by + 13, 3, 2, C.DKSKIN);
    b(22, by + 13, 3, 2, C.DKSKIN);
    // Back legs
    b(9 - legOff, by + 8, 2, 5, C.SKIN); b(12, by + 8, 2, 5, C.DKSKIN);
    b(8 - legOff, by + 13, 3, 2, C.DKSKIN);
    b(11, by + 13, 3, 2, C.DKSKIN);
    // Burning paws
    p(20 + legOff, by + 13, C.FIRE); p(23, by + 13, C.FIRE);
    p(9 - legOff, by + 13, C.FIRE); p(12, by + 13, C.FIRE);
    // Tail (fire)
    b(5, by + 2, 3, 2, C.SKIN); b(3, by + 1, 2, 2, C.FIRE);
    p(2, by, C.BFIRE); p(1, by - 1, C.FTIP);
    // Fire trail
    const trail = [0, 1, 2, 1][f];
    p(4, by - 1 + trail, C.FIRE); p(2, by - 2 + trail, C.BFIRE);
    p(6, by + 1, C.EMBER);
    // Back flame
    b(13, by, 4, 2, C.FIRE); b(14, by - 1, 2, 1, C.BFIRE);
    p(15, by - 2, C.FTIP);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 2: Pit Fiend (Armored) - massive armored demon
function drawPitFiend(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Horns (big)
    b(10, by - 2, 2, 3, C.HORN); p(9, by - 3, C.HORN); p(10, by - 3, C.DKHORN);
    b(20, by - 2, 2, 3, C.HORN); p(21, by - 3, C.HORN); p(22, by - 3, C.DKHORN);
    // Head
    b(10, by + 1, 12, 5, C.SKIN); b(11, by + 1, 10, 2, C.BSKIN);
    b(10, by + 1, 2, 5, C.LSKIN); b(20, by + 3, 2, 3, C.DKSKIN);
    // Eyes
    b(12, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
    b(18, by + 3, 2, 2, C.EYE); p(19, by + 3, C.WHITE);
    // Armored plating
    b(7, by + 6, 18, 12, C.DKSKIN);
    b(7, by + 6, 3, 12, C.BSKIN); b(8, by + 6, 2, 10, C.MID);
    b(22, by + 6, 3, 12, C.HELL); b(23, by + 8, 2, 8, C.DKHORN);
    // Chest plate lines
    b(9, by + 6, 14, 2, C.BSKIN); b(10, by + 6, 12, 1, C.LSKIN);
    b(9, by + 10, 14, 1, C.HELL);
    b(9, by + 14, 14, 1, C.HELL);
    // Plate rivets
    p(9, by + 8, C.FIRE); p(22, by + 8, C.FIRE);
    p(9, by + 12, C.FIRE); p(22, by + 12, C.FIRE);
    // Core glow
    b(14, by + 9, 4, 3, C.FIRE); b(15, by + 10, 2, 1, C.BFIRE);
    p(15, by + 9, C.FTIP); p(16, by + 11, C.DKFIRE);
    // Arms
    b(4, by + 8, 3, 7, C.SKIN); b(4, by + 8, 1, 7, C.BSKIN);
    b(25, by + 8, 3, 7, C.DKSKIN); b(27, by + 10, 1, 4, C.HELL);
    // Fists
    b(4, by + 15, 3, 2, C.SKIN); p(4, by + 15, C.BSKIN);
    b(25, by + 15, 3, 2, C.DKSKIN);
    // Legs
    b(9 + lOff, by + 18, 5, 6, C.DKSKIN);
    b(9 + lOff, by + 18, 2, 6, C.BSKIN);
    b(18 + rOff, by + 18, 5, 6, C.DKSKIN);
    b(22 + rOff, by + 18, 1, 6, C.HELL);
    // Feet
    b(8 + lOff, by + 24, 6, 2, C.HELL); b(8 + lOff, by + 24, 3, 1, C.DKSKIN);
    b(17 + rOff, by + 24, 6, 2, C.HELL);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 3: Ember Sprite (Swarm) - tiny floating flame wisp
function drawEmberSprite(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 1][f];
    const jy = [0, -1, 1, -2][f];
    const bx = 13 + jx, by = 11 + jy;
    // Flame body
    p(bx + 2, by - 2, C.FTIP);
    b(bx + 1, by - 1, 3, 1, C.BFIRE);
    b(bx, by, 5, 2, C.FIRE);
    b(bx + 1, by + 2, 3, 2, C.DKFIRE);
    b(bx + 2, by + 4, 2, 1, C.EMBER);
    p(bx + 2, by + 5, C.DKFIRE);
    // Inner glow
    b(bx + 1, by, 3, 2, C.BFIRE);
    p(bx + 2, by, C.FTIP); p(bx + 2, by + 1, C.WHITE);
    // Eyes
    p(bx + 1, by + 1, C.EYE); p(bx + 3, by + 1, C.EYE);
    // Flicker sparks
    p(bx - 1, by + 1, C.EMBER); p(bx + 5, by, C.EMBER);
    if (f % 2 === 0) {
      p(bx + 4, by - 1, C.BFIRE); p(bx - 1, by + 3, C.DKFIRE);
    } else {
      p(bx, by - 2, C.BFIRE); p(bx + 5, by + 2, C.DKFIRE);
    }
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 15);
  }
}

// 4: Infernal Priest (Healer) - hooded demon with fire-staff
function drawInfernalPriest(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Hood
    b(14, by, 4, 1, C.DKSKIN);
    b(13, by + 1, 6, 1, C.DKSKIN); b(14, by + 1, 4, 1, C.MID);
    b(12, by + 2, 8, 3, C.DKSKIN);
    b(12, by + 2, 2, 3, C.MID); b(19, by + 3, 1, 2, C.HELL);
    // Hood fold
    p(14, by + 2, C.SKIN); p(17, by + 2, C.SKIN);
    // Face shadow
    b(13, by + 3, 6, 2, C.HELL); b(14, by + 3, 4, 1, C.DKHORN);
    // Eyes
    b(14, by + 4, 2, 1, C.FIRE); p(14, by + 4, C.EYE);
    b(17, by + 4, 2, 1, C.FIRE); p(17, by + 4, C.EYE);
    // Robe body
    b(12, by + 5, 8, 4, C.DKSKIN);
    b(12, by + 5, 2, 4, C.MID); b(19, by + 5, 1, 4, C.HELL);
    b(10, by + 9, 12, 4, C.SKIN);
    b(10, by + 9, 2, 4, C.BSKIN); b(20, by + 9, 2, 4, C.DKSKIN);
    b(9, by + 13, 14, 4, C.SKIN);
    b(9, by + 13, 2, 4, C.BSKIN); b(21, by + 13, 2, 4, C.DKSKIN);
    b(8, by + 17, 16, 2, C.DKSKIN);
    b(8, by + 19, 16, 1, C.HELL);
    // Robe detail
    p(14, by + 9, C.FIRE); p(15, by + 10, C.FIRE);
    p(16, by + 11, C.FIRE); p(16, by + 12, C.FIRE);
    // Robe folds
    p(12, by + 12, C.MID); p(19, by + 12, C.HELL);
    // Staff
    b(22, by + 1, 2, 16, C.HORN);
    b(22, by + 1, 1, 16, C.DKHORN);
    // Staff top fire
    b(21, by - 1, 4, 2, C.FIRE); b(22, by - 1, 2, 1, C.BFIRE);
    p(22, by - 3, C.FTIP); p(23, by - 3, C.BFIRE);
    p(22, by - 2, C.BFIRE); p(23, by - 2, C.FIRE);
    // Staff wrapping
    p(22, by + 5, C.FIRE); p(22, by + 9, C.FIRE); p(22, by + 13, C.FIRE);
    // Left arm
    b(9, by + 7 + lOff, 3, 2, C.SKIN); b(9, by + 7 + lOff, 1, 2, C.BSKIN);
    // Feet
    b(11 + lOff, by + 19, 3, 2, C.SKIN); b(11 + lOff, by + 20, 3, 1, C.DKSKIN);
    b(18 + rOff, by + 19, 3, 2, C.DKSKIN);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 5: Demon Lord (Boss) - huge horned demon with folded wings, crown of fire
function drawDemonLord(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    // Crown of fire
    p(12, by - 3, C.FTIP); b(13, by - 2, 2, 2, C.BFIRE);
    p(16, by - 4, C.FTIP); b(15, by - 3, 2, 2, C.FIRE);
    p(19, by - 3, C.FTIP); b(19, by - 2, 2, 2, C.BFIRE);
    p(22, by - 2, C.FIRE);
    // Horns (massive)
    b(8, by - 2, 2, 4, C.HORN); p(7, by - 3, C.HORN); p(7, by - 4, C.DKHORN);
    b(22, by - 2, 2, 4, C.HORN); p(23, by - 3, C.HORN); p(24, by - 4, C.DKHORN);
    // Head
    b(9, by + 1, 14, 5, C.SKIN);
    b(9, by + 1, 14, 2, C.BSKIN); b(10, by + 1, 12, 1, C.LSKIN);
    b(9, by + 1, 2, 5, C.LSKIN);
    b(21, by + 3, 2, 3, C.DKSKIN);
    // Eyes
    b(11, by + 3, 3, 2, C.EYE); b(12, by + 3, 1, 1, C.WHITE); p(11, by + 4, C.FTIP);
    b(18, by + 3, 3, 2, C.EYE); b(19, by + 3, 1, 1, C.WHITE); p(18, by + 4, C.FTIP);
    // Brow
    b(10, by + 2, 12, 1, C.DKSKIN);
    // Mouth
    b(13, by + 5, 6, 1, C.HELL);
    // Folded wings behind shoulders
    b(3, by + 5, 5, 8, C.DKSKIN); b(3, by + 5, 2, 8, C.SKIN); p(3, by + 5, C.MID);
    b(24, by + 5, 5, 8, C.DKSKIN); b(27, by + 5, 2, 8, C.HELL);
    // Wing tips
    p(2, by + 4, C.SKIN); p(1, by + 3, C.DKSKIN);
    p(29, by + 4, C.DKSKIN); p(30, by + 3, C.HELL);
    // Neck
    b(12, by + 6, 8, 2, C.DKSKIN);
    // Massive torso
    b(7, by + 8, 18, 10, C.SKIN);
    b(7, by + 8, 3, 10, C.BSKIN); b(8, by + 8, 2, 8, C.MID);
    b(22, by + 8, 3, 10, C.DKSKIN); b(23, by + 10, 2, 6, C.HELL);
    b(9, by + 8, 14, 2, C.BSKIN); b(10, by + 8, 12, 1, C.LSKIN);
    // Fire core in chest
    b(13, by + 11, 6, 4, C.FIRE); b(14, by + 12, 4, 2, C.BFIRE);
    p(15, by + 12, C.FTIP); p(16, by + 13, C.FTIP);
    p(15, by + 11, C.WHITE); p(17, by + 14, C.DKFIRE);
    // Chest detail
    b(10, by + 12, 3, 1, C.MID); b(19, by + 12, 3, 1, C.DKSKIN);
    b(9, by + 16, 14, 2, C.DKSKIN); b(10, by + 16, 12, 1, C.HELL);
    p(13, by + 16, C.FIRE); p(18, by + 16, C.FIRE);
    // Arms
    b(4, by + 9, 3, 7, C.SKIN); b(4, by + 9, 1, 7, C.BSKIN);
    b(3, by + 11, 1, 4, C.SKIN); p(2, by + 13, C.BSKIN);
    b(25, by + 9, 3, 7, C.DKSKIN); b(27, by + 11, 1, 4, C.HELL);
    // Fists
    b(2, by + 16, 3, 3, C.SKIN); p(2, by + 16, C.BSKIN); p(4, by + 18, C.DKSKIN);
    b(27, by + 16, 3, 3, C.DKSKIN); p(29, by + 18, C.HELL);
    // Legs
    b(9 + lOff, by + 18, 5, 7, C.SKIN);
    b(9 + lOff, by + 18, 2, 7, C.BSKIN); b(13 + lOff, by + 18, 1, 7, C.DKSKIN);
    b(18 + rOff, by + 18, 5, 7, C.SKIN);
    b(22 + rOff, by + 18, 1, 7, C.DKSKIN);
    // Knee guards
    b(9 + lOff, by + 22, 5, 1, C.DKSKIN); p(10 + lOff, by + 22, C.FIRE);
    b(18 + rOff, by + 22, 5, 1, C.DKSKIN); p(21 + rOff, by + 22, C.FIRE);
    // Feet
    b(7 + lOff, by + 25, 7, 3, C.DKSKIN); b(8 + lOff, by + 25, 5, 2, C.SKIN);
    b(17 + rOff, by + 25, 7, 3, C.DKSKIN); b(18 + rOff, by + 25, 5, 2, C.SKIN);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 6: Legion Squad (Group) - small imp-sized in formation
function drawLegionSquad(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Smaller imp body
    b(13, by, 6, 4, C.SKIN); b(14, by, 4, 1, C.BSKIN); p(13, by, C.LSKIN);
    // Horns
    p(13, by - 1, C.HORN); p(18, by - 1, C.HORN);
    // Eyes
    b(14, by + 2, 2, 1, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 1, C.EYE); p(17, by + 2, C.WHITE);
    // Torso
    b(11, by + 4, 10, 6, C.SKIN);
    b(11, by + 4, 2, 6, C.BSKIN); b(19, by + 4, 2, 6, C.DKSKIN);
    b(12, by + 4, 8, 1, C.LSKIN);
    // Core
    b(15, by + 6, 2, 2, C.FIRE); p(15, by + 6, C.BFIRE);
    // Arms
    b(9, by + 5, 2, 4, C.SKIN); p(9, by + 5, C.BSKIN);
    b(21, by + 5, 2, 4, C.DKSKIN);
    // Legs
    b(12 + lOff, by + 10, 3, 4, C.SKIN); b(12 + lOff, by + 10, 1, 4, C.BSKIN);
    b(17 + rOff, by + 10, 3, 4, C.SKIN); b(19 + rOff, by + 10, 1, 4, C.DKSKIN);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.DKSKIN);
    b(17 + rOff, by + 14, 4, 2, C.DKSKIN);
    // Tail
    b(21, by + 9, 2, 1, C.SKIN); p(23, by + 8, C.EMBER);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 15);
  }
}

// 7: Magma Blob (Splitter) - molten rock with cooling cracks
function drawMagmaBlob(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 6 + bob;
    const bx = wobX;
    // Blob body (irregular)
    b(11 + bx, by, 10, 3, C.DKSKIN);
    b(9 + bx, by + 3, 14, 6, C.DKSKIN);
    b(10 + bx, by + 9, 12, 4, C.HELL);
    b(12 + bx, by + 13, 8, 2, C.HELL);
    // Lava cracks (bright lines)
    b(13 + bx, by + 1, 1, 2, C.MAGMA); p(14 + bx, by + 2, C.FIRE);
    b(17 + bx, by + 2, 1, 2, C.MAGMA); p(18 + bx, by + 3, C.FIRE);
    b(11 + bx, by + 5, 1, 3, C.FIRE); p(12 + bx, by + 7, C.MAGMA);
    b(19 + bx, by + 4, 1, 3, C.FIRE); p(20 + bx, by + 6, C.MAGMA);
    p(14 + bx, by + 6, C.BFIRE); p(16 + bx, by + 8, C.BFIRE);
    p(13 + bx, by + 10, C.FIRE); p(18 + bx, by + 10, C.FIRE);
    // Glowing core
    b(14 + bx, by + 4, 4, 3, C.FIRE); b(15 + bx, by + 5, 2, 1, C.BFIRE);
    p(15 + bx, by + 4, C.FTIP); p(16 + bx, by + 6, C.DKFIRE);
    // Eyes in lava
    b(12 + bx, by + 3, 2, 2, C.EYE); p(13 + bx, by + 3, C.WHITE);
    b(18 + bx, by + 3, 2, 2, C.EYE); p(19 + bx, by + 3, C.WHITE);
    // Cooling crust
    b(9 + bx, by + 3, 2, 3, C.ASH); b(21 + bx, by + 3, 2, 3, C.ASH);
    p(11 + bx, by, C.ASH); p(20 + bx, by, C.ASH);
    // Dripping lava
    p(12 + bx, by + 14, C.FIRE); p(18 + bx, by + 14, C.DKFIRE);
    p(15 + bx, by + 15, C.MAGMA);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 8: Flame Ward (Shielded) - spinning fire barrier
function drawFlameWard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Demon body (same as imp but slightly larger)
    b(12, by, 8, 5, C.SKIN); b(13, by, 6, 2, C.BSKIN);
    p(12, by, C.LSKIN); b(19, by + 3, 1, 2, C.DKSKIN);
    // Horns
    p(12, by - 1, C.HORN); p(19, by - 1, C.HORN);
    // Eyes
    b(13, by + 2, 2, 2, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.EYE); p(18, by + 2, C.WHITE);
    // Torso
    b(10, by + 6, 12, 8, C.SKIN);
    b(10, by + 6, 2, 8, C.BSKIN); b(20, by + 6, 2, 8, C.DKSKIN);
    b(11, by + 6, 10, 1, C.LSKIN);
    b(14, by + 8, 4, 3, C.FIRE); b(15, by + 9, 2, 1, C.BFIRE);
    p(15, by + 8, C.FTIP);
    // Arms
    b(8, by + 7, 2, 5, C.SKIN); p(8, by + 7, C.BSKIN);
    b(22, by + 7, 2, 5, C.DKSKIN);
    // Legs
    b(11 + lOff, by + 14, 4, 5, C.SKIN);
    b(17 + rOff, by + 14, 4, 5, C.SKIN);
    b(10 + lOff, by + 19, 5, 2, C.DKSKIN);
    b(17 + rOff, by + 19, 5, 2, C.DKSKIN);
    // Spinning fire barrier ring
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.FTIP); p(rx + 1, ry, C.BFIRE); p(rx - 1, ry, C.BFIRE);
      } else if (i % 3 === 0) {
        p(rx, ry, C.FIRE); p(rx, ry + 1, C.DKFIRE);
      } else {
        p(rx, ry, i % 2 === 0 ? C.FIRE : C.DKFIRE);
      }
    }
    // Cardinal flame bursts
    b(3, by + 7, 2, 2, C.FIRE); p(3, by + 7, C.BFIRE);
    b(27, by + 7, 2, 2, C.FIRE); p(28, by + 8, C.BFIRE);
    b(15, by - 3, 2, 2, C.FIRE); p(15, by - 3, C.FTIP);
    b(15, by + 20, 2, 2, C.DKFIRE); p(16, by + 21, C.FIRE);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 9: Shade Demon (Evasive) - shadow-form flickering dark red
function drawShadeDemon(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Shadow demon shape (semi-transparent, flickering)
    b(bx + 3, by, 4, 1, C.DKSKIN);
    // Horns
    p(bx + 3, by - 1, C.HELL); p(bx + 6, by - 1, C.HELL);
    if (f !== 1) b(bx + 2, by + 1, 6, 3, C.HELL);
    else { p(bx + 2, by + 1, C.HELL); p(bx + 5, by + 2, C.DKSKIN); p(bx + 7, by + 1, C.HELL); }
    if (f !== 2) b(bx, by + 4, 10, 4, C.HELL);
    else { b(bx, by + 4, 3, 4, C.HELL); p(bx + 5, by + 5, C.DKSKIN); b(bx + 7, by + 4, 3, 4, C.HELL); }
    b(bx + 1, by + 8, 8, 3, C.HELL);
    if (f !== 3) b(bx + 2, by + 11, 6, 2, C.HELL);
    else { p(bx + 2, by + 11, C.HELL); p(bx + 5, by + 11, C.HELL); p(bx + 7, by + 11, C.HELL); }
    // Shading
    b(bx, by + 4, 2, 4, C.DKSKIN); b(bx + 8, by + 5, 2, 3, C.DKHORN);
    // Eyes (glowing embers)
    b(bx + 3, by + 3, 2, 1, C.EMBER); p(bx + 3, by + 3, C.EYE);
    b(bx + 6, by + 3, 2, 1, C.EMBER); p(bx + 6, by + 3, C.EYE);
    // Core flicker
    b(bx + 4, by + 5, 2, 2, C.EMBER);
    p(bx + 4, by + 5, C.FIRE); p(bx + 5, by + 6, C.FIRE);
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 4, by + 4, 2, 3, C.DKHORN); p(bx - 5, by + 5, C.HELL);
    }
    if (f === 2) {
      b(bx + 12, by + 4, 2, 3, C.DKHORN); p(bx + 13, by + 5, C.HELL);
    }
    // Smoke particles
    if (f === 0) { p(bx - 2, by + 2, C.SMOKE); p(bx + 11, by + 8, C.SMOKE); }
    if (f === 3) { p(bx + 11, by + 2, C.ASH); p(bx - 2, by + 8, C.ASH); }
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 13);
  }
}

// 10: Phoenix Spawn (Regen) - fire bird reforming from embers
function drawPhoenixSpawn(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.FIRE : C.DKFIRE;
    const hiC = bright ? C.FTIP : C.BFIRE;
    const coreC = bright ? C.WHITE : C.FTIP;
    const midC = bright ? C.BFIRE : C.DKFIRE;
    // Bird body
    b(14, by, 4, 2, C.FIRE); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 3, bodyC);
    b(13, by + 14, 6, 2, C.DKFIRE);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, midC);
    b(20, by + 5, 2, 6, C.DKFIRE); b(21, by + 7, 1, 4, C.HELL);
    // Beak
    b(15, by - 1, 2, 1, hiC); p(17, by, C.BFIRE);
    // Eyes
    b(13, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.EYE); p(17, by + 3, C.WHITE);
    // Pulsing fire core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.FTIP : C.FIRE);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    // Wing stubs
    b(8, by + 6, 2, 3, C.FIRE); p(7, by + 7, hiC);
    b(22, by + 6, 2, 3, C.DKFIRE); p(23, by + 7, C.HELL);
    // Ember trails below
    p(12, by + 14, C.EMBER); p(19, by + 14, C.EMBER);
    p(14, by + 16, bright ? C.BFIRE : C.DKFIRE);
    p(17, by + 16, bright ? C.FIRE : C.HELL);
    // Reforming embers floating up
    p(9, by + 4, bright ? C.FTIP : C.EMBER);
    p(22, by + 3, bright ? C.FTIP : C.EMBER);
    p(15, by + 16, bright ? C.EMBER : C.DKFIRE);
    // Bioluminescent spots
    p(11, by + 7, bright ? C.WHITE : C.FIRE);
    p(19, by + 7, bright ? C.WHITE : C.FIRE);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 11);
  }
}

// 11: Bat Demon (Flying) - winged demon with leathery wings
function drawBatDemon(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Body (horizontal)
    b(11, by + 5, 10, 4, C.SKIN);
    b(11, by + 5, 10, 1, C.BSKIN); b(11, by + 8, 10, 1, C.DKSKIN);
    // Head
    b(19, by + 4, 4, 4, C.SKIN); b(19, by + 4, 4, 1, C.BSKIN); p(19, by + 4, C.LSKIN);
    // Ears
    p(20, by + 3, C.SKIN); p(22, by + 3, C.SKIN);
    p(20, by + 2, C.DKSKIN); p(22, by + 2, C.DKSKIN);
    // Snout
    b(23, by + 5, 2, 2, C.BSKIN); p(24, by + 6, C.DKSKIN);
    // Eye
    b(21, by + 4, 2, 1, C.EYE); p(21, by + 4, C.WHITE);
    // Fangs
    p(23, by + 7, C.WHITE); p(24, by + 7, C.WHITE);
    // Tail
    b(9, by + 7, 2, 2, C.SKIN); b(7, by + 7, 2, 1, C.DKSKIN);
    p(6, by + 6, C.DKSKIN); p(5, by + 6, C.SKIN);
    // Top wing (leathery)
    b(11, by + 2 + wingY, 7, 2, C.DKSKIN);
    b(11, by + 2 + wingY, 7, 1, C.SKIN);
    b(9, by + 1 + wingY, 4, 1, C.SKIN);
    b(7, by + wingY, 3, 1, C.DKSKIN);
    p(6, by + wingY - 1, C.SKIN);
    // Wing membrane detail
    p(12, by + 3 + wingY, C.HELL); p(15, by + 3 + wingY, C.HELL);
    p(9, by + 2 + wingY, C.DKSKIN);
    // Bottom wing
    b(11, by + 10 - wingY, 7, 2, C.HELL);
    b(11, by + 11 - wingY, 7, 1, C.DKHORN);
    b(9, by + 11 - wingY, 4, 1, C.DKSKIN);
    b(7, by + 12 - wingY, 3, 1, C.HELL);
    // Wing claw tips
    p(6, by + wingY - 1, C.HORN); p(6, by + 12 - wingY, C.HORN);
    // Body detail
    p(13, by + 6, C.MID); p(17, by + 6, C.MID);
    // Shadow
    b(13, by + 16, 5, 1, C.DKSKIN); b(14, by + 17, 3, 1, C.HELL);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 12);
  }
}

// Helper: draw warlock base (robed demon with staff)
function drawWarlockBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const isSmoky = bodyMod === 'smoke';
  const isAshy = bodyMod === 'ash';
  const bodyC = isSmoky ? C.SMOKE : isAshy ? C.ASH : C.DKSKIN;
  const robeC = isSmoky ? C.SMOKE : isAshy ? C.DKASH : C.SKIN;
  const hoodC = isSmoky ? C.DKASH : isAshy ? C.ASH : C.HELL;
  const robeHi = isSmoky ? C.SMOKE : isAshy ? C.SMOKE : C.BSKIN;
  const robeMid = isSmoky ? C.ASH : isAshy ? C.DKASH : C.MID;

  // Hooded head
  b(14, by, 4, 1, C.DKSKIN);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.HELL);
  // Hood fold
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.DKHORN); b(14, by + 3, 4, 1, C.HELL);
  // Eyes
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.EYE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.EYE);
  // Robe body
  b(12, by + 5, 8, 4, robeC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, C.HELL);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, C.HELL); b(21, by + 10, 1, 3, C.DKHORN);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, C.HELL); b(22, by + 14, 1, 3, C.DKHORN);
  b(8, by + 17, 16, 2, hoodC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.DKHORN);
  // Robe hem
  b(8, by + 19, 16, 1, C.DKHORN);
  // Robe detail lines
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, C.HELL);
  p(11, by + 15, robeMid); p(20, by + 15, C.HELL);
  // Staff
  b(22, by + 1, 2, 16, isAshy ? C.ASH : C.HORN);
  b(22, by + 1, 1, 16, isAshy ? C.DKASH : C.DKHORN);
  // Staff top
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, accentC);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.FTIP); p(23, by - 3, C.FTIP);
  // Staff wrapping
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm
  b(9, by + 7 + lOff, 3, 2, robeC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, hoodC);
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.DKHORN);
}

// 12: Ashskin Warlock (Iron) - robed ashy gray heavy
function drawAshskinWarlock(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawWarlockBase(p, b, f, C.SMOKE, C.ASH, 'ash');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Heavy armor plates
    b(12, by + 7, 8, 2, C.ASH);
    b(13, by + 7, 6, 1, C.SMOKE);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.SMOKE); b(10, by + 9, 1, 2, C.SMOKE);
    b(19, by + 9, 3, 2, C.DKASH);
    // Belt
    b(14, by + 12, 4, 2, C.SMOKE); b(15, by + 12, 2, 1, C.ASH);
    // Armored hem
    p(10, by + 16, C.SMOKE); p(21, by + 16, C.DKASH);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 13: Blaze Warlock (Haste) - fire trails burning faster
function drawBlazeWarlock(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawWarlockBase(p, b, f, C.FIRE, C.BFIRE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Fire trails behind
    b(5, by + 5, 3, 1, C.FIRE); b(3, by + 5, 2, 1, C.BFIRE);
    b(4, by + 9, 4, 1, C.BFIRE); p(2, by + 9, C.FIRE);
    b(5, by + 13, 3, 1, C.FIRE); p(3, by + 13, C.BFIRE);
    b(6, by + 16, 2, 1, C.DKFIRE);
    // Extra fire on even frames
    if (f % 2 === 0) {
      p(2, by + 3, C.BFIRE); p(1, by + 7, C.FIRE);
      b(3, by + 11, 2, 1, C.BFIRE);
    } else {
      p(3, by + 4, C.FIRE); p(2, by + 8, C.BFIRE);
      b(4, by + 12, 2, 1, C.DKFIRE);
    }
    // Ember particles
    p(1, by + 6, C.EMBER); p(0, by + 10, C.EMBER);
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 14: Smoke Warlock (Mist) - thick black smoke shroud
function drawSmokeWarlock(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawWarlockBase(p, b, f, C.SMOKE, C.ASH, 'smoke');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Smoke clouds
    b(mx, by + my, 2, 1, C.SMOKE); p(mx + 2, by + my + 1, C.ASH);
    b(mx + 16, by + my - 2, 2, 1, C.ASH); p(mx + 18, by + my - 1, C.SMOKE);
    // Additional smoke wisps
    b(25, by + 3, 2, 1, C.SMOKE); p(26, by + 4, C.ASH);
    b(4, by + 15, 3, 1, C.ASH); p(3, by + 16, C.SMOKE);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.ASH); p(2, by + 15, C.SMOKE);
      p(27, by + 8, C.ASH);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.SMOKE); p(5, by + 10, C.ASH);
    }
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// 15: Soulfire Warlock (Heal) - green hellfire healing
function drawSoulfireWarlock(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawWarlockBase(p, b, f, C.GFIRE, C.DKGFIRE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Green hellfire staff glow
    p(22, by - 3, C.GFIRE); p(23, by - 3, C.GFIRE);
    b(21, by - 1, 4, 1, C.GFIRE); p(21, by - 2, C.DKGFIRE);
    p(24, by - 2, C.DKGFIRE);
    // Green fire particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GFIRE); p(px_ + 2, by + 4, C.DKGFIRE);
    p(px_ - 1, by + 6, C.GFIRE);
    // Skull symbol near staff
    b(24, by + 5, 2, 1, C.GFIRE);
    b(25, by + 4, 1, 3, C.GFIRE);
    p(25, by + 3, C.DKGFIRE); p(25, by + 7, C.DKGFIRE);
    p(23, by + 5, C.DKGFIRE); p(26, by + 5, C.DKGFIRE);
    // Extra green sparks
    if (f % 2 === 0) {
      p(6, by + 3, C.GFIRE); p(8, by + 8, C.DKGFIRE);
    } else {
      p(7, by + 2, C.DKGFIRE); p(5, by + 7, C.GFIRE);
    }
  } else {
    drawDeathInfernal(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION HELPER =====
function drawDeathInfernal(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Erupts in flames
    b(cx - 4, cy - 4, 10, 10, C.SKIN);
    b(cx - 3, cy - 5, 8, 2, C.SKIN);
    b(cx - 2, cy - 6, 6, 1, C.BSKIN);
    b(cx - 3, cy + 6, 8, 2, C.DKSKIN);
    b(cx - 2, cy + 7, 4, 1, C.HELL);
    // Shading
    b(cx - 4, cy - 4, 2, 10, C.BSKIN);
    b(cx + 4, cy - 2, 2, 8, C.DKSKIN);
    // Flame cracks
    p(cx, cy - 5, C.FTIP); p(cx + 1, cy - 4, C.FIRE);
    p(cx + 2, cy - 3, C.FTIP); p(cx + 3, cy - 2, C.FIRE);
    p(cx - 2, cy - 3, C.FIRE); p(cx - 3, cy - 2, C.BFIRE);
    p(cx - 1, cy, C.FIRE); p(cx + 3, cy, C.FTIP);
    p(cx - 3, cy + 1, C.BFIRE); p(cx + 1, cy + 1, C.FIRE);
    p(cx, cy + 2, C.FTIP); p(cx - 2, cy + 3, C.FIRE);
    p(cx + 2, cy + 3, C.FIRE); p(cx + 4, cy + 2, C.BFIRE);
    p(cx - 4, cy + 2, C.FTIP);
    p(cx + 1, cy + 4, C.FIRE); p(cx - 1, cy + 5, C.FIRE);
    // Fire center
    b(cx - 1, cy - 1, 3, 3, C.BFIRE);
    p(cx, cy, C.FTIP); p(cx - 1, cy, C.FIRE); p(cx + 1, cy, C.FIRE);
  } else if (deathFrame === 1) {
    // Ash scatters with embers
    b(cx - 6, cy - 6, 2, 2, C.FIRE); p(cx - 6, cy - 6, C.BFIRE);
    b(cx + 5, cy - 6, 2, 2, C.EMBER); p(cx + 6, cy - 6, C.BFIRE);
    b(cx - 7, cy - 1, 2, 2, C.ASH); p(cx - 7, cy - 1, C.SMOKE);
    b(cx + 6, cy - 1, 2, 2, C.ASH); p(cx + 7, cy, C.SMOKE);
    b(cx - 6, cy + 5, 2, 2, C.DKFIRE);
    b(cx + 5, cy + 5, 2, 2, C.DKFIRE); p(cx + 6, cy + 6, C.HELL);
    b(cx - 1, cy - 7, 2, 2, C.FIRE); p(cx, cy - 7, C.BFIRE);
    b(cx - 1, cy + 6, 2, 2, C.ASH);
    // Inner fragments
    p(cx - 3, cy - 3, C.EMBER); p(cx + 3, cy - 3, C.EMBER);
    p(cx - 3, cy + 3, C.DKFIRE); p(cx + 3, cy + 3, C.DKFIRE);
    p(cx - 2, cy - 1, C.FIRE); p(cx + 2, cy + 1, C.FIRE);
    // Ash particles
    p(cx - 4, cy - 4, C.ASH); p(cx + 4, cy - 4, C.ASH);
    p(cx - 4, cy + 4, C.SMOKE); p(cx + 4, cy + 4, C.SMOKE);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.FTIP);
    p(cx, cy, C.WHITE);
  } else {
    // Smoldering remains - ash and fading embers
    p(cx - 8, cy - 4, C.ASH); p(cx + 9, cy - 5, C.ASH);
    p(cx - 5, cy + 7, C.SMOKE); p(cx + 6, cy + 8, C.SMOKE);
    p(cx, cy - 9, C.ASH); p(cx + 2, cy + 9, C.SMOKE);
    p(cx + 2, cy, C.ASH); p(cx - 9, cy + 2, C.SMOKE);
    // Fading specks
    p(cx - 6, cy - 7, C.SMOKE); p(cx + 7, cy - 7, C.SMOKE);
    p(cx - 7, cy + 5, C.ASH); p(cx + 8, cy + 6, C.ASH);
    p(cx - 3, cy - 6, C.SMOKE); p(cx + 4, cy - 8, C.ASH);
    p(cx - 1, cy + 6, C.HELL);
  }
}

// ===== DRAW ALL CREEPS =====
const DRAW_FNS = [
  drawImp, drawHellHound, drawPitFiend, drawEmberSprite, drawInfernalPriest, drawDemonLord,
  drawLegionSquad, drawMagmaBlob, drawFlameWard, drawShadeDemon, drawPhoenixSpawn, drawBatDemon,
  drawAshskinWarlock, drawBlazeWarlock, drawSmokeWarlock, drawSoulfireWarlock,
];

function drawAllCreeps(ctx: CanvasRenderingContext2D) {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const frame = row;
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], frame);
    }
  }
}

// ===== COMPONENT =====
export default function InfernalCreepSprites() {
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
    const LW = 72;
    const LH = 14;
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#1a0a08';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#ff6600';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#2a1a0a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#bb6633';
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
    <div style={{ background: '#1a0a08', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.FIRE, margin: 0, fontSize: 15 }}>INFERNAL FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'infernal_creeps.png')}
            style={{
              background: C.FIRE, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#2a1a0a' : '#111',
              color: view === v ? C.BFIRE : '#445566',
              border: `1px solid ${view === v ? '#443' : '#222'}`,
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
          data-label="Infernal Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Imp (Standard)","Hell Hound (Fast)","Pit Fiend (Armored)","Ember Sprite (Swarm)","Infernal Priest (Healer)","Demon Lord (Boss)","Legion Squad (Group)","Magma Blob (Splitter)","Flame Ward (Shielded)","Shade Demon (Evasive)","Phoenix Spawn (Regen)","Bat Demon (Flying)","Ashskin Warlock (Iron)","Blaze Warlock (Haste)","Smoke Warlock (Mist)","Soulfire Warlock (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Infernal Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Imp (Standard)","Hell Hound (Fast)","Pit Fiend (Armored)","Ember Sprite (Swarm)","Infernal Priest (Healer)","Demon Lord (Boss)","Legion Squad (Group)","Magma Blob (Splitter)","Flame Ward (Shielded)","Shade Demon (Evasive)","Phoenix Spawn (Regen)","Bat Demon (Flying)","Ashskin Warlock (Iron)","Blaze Warlock (Haste)","Smoke Warlock (Mist)","Soulfire Warlock (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #2a1a0a',
          }}
        />
      </div>
      <div style={{ color: '#884422', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bb6633' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bb6633' }}>Phaser:</b>{' '}
          <code style={{ color: C.BFIRE }}>
            {"this.load.spritesheet('infernal_creeps','infernal_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bb6633' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bb6633' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
