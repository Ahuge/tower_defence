// @ts-nocheck
import { useRef, useEffect, useState } from "react";

// ===== PALETTES =====
export const MIL = {
  OLIVE:'#556b2f', DKOLV:'#3b4a20', SAGE:'#8fbc8f', LTSAGE:'#a8d8a8',
  GUN:'#778899', DKGUN:'#556677', LTGUN:'#99aabb',
  SKIN:'#d4a574', DKSKIN:'#b8895a',
  BOOT:'#3a2a1a', BELT:'#4a3a2a',
  GOLD:'#ffcc44', DKGOLD:'#bb9922',
  BLACK:'#1a1a1a', DKARM:'#445544',
  FLASH:'#ffff88', WHITE:'#ffffff',
  BERET:'#882222', DKBER:'#661111',
  CAPE:'#445533', DKCAPE:'#334422',
};
export const ALN = {
  LIME:'#88ff44', DKLIME:'#55cc22', LTLIME:'#bbff88',
  CHITIN:'#445522', DKCHI:'#334411', LTCHI:'#667744',
  DARK:'#112200', EYE:'#ff4444', DKEYE:'#cc2222',
  MAND:'#99dd33',
};
export const INF = {
  RED:'#ff4422', DKRED:'#cc2200', LTRED:'#ff7755',
  ORANGE:'#ff8844', DKORA:'#cc6622', LTORA:'#ffbb77',
  DARK:'#220000', HORN:'#884400', DKHORN:'#663300',
  GLOW:'#ffcc00', FLASH:'#ffffff', YELLOW:'#ffee44',
  SMOKE:'#444444', DKSMOKE:'#222222',
};
export const NAT = {
  // Young → ancient progression: pale sage → forest → near-black
  SAGE:'#88bb66', MOSS:'#558844', GREEN:'#33aa44', DKGRN:'#226633',
  FOREST:'#1a4422', DARK:'#113311',
  BARK:'#664422', DKBARK:'#3a2211', LTBARK:'#aa7744',
  THORN:'#558833', DKTHRN:'#334422', LTTHRN:'#88cc55',
  SPORE:'#88cc44', TOXIC:'#aaee33', VENOM:'#66dd33',
  EYE:'#ffaa44', GLOW:'#ffcc00', HOT:'#ffee66',
  PINK:'#ee55aa', WHITE:'#ffffff', SHADOW:'#0a1808',
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

const PX = 2, GR = 16, CELL = GR * PX; // 32px cells

// ===== 1. RIFLEMAN =====
export function drawRifleman(ctx: CanvasRenderingContext2D, level: number = 1) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;

      // Helmet — L2+: upgraded helmet with visor ridge
      if (row === 0) {
        b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.SAGE);
        p(cx - 2, 1 + bob, W.DKOLV); p(cx + 1, 1 + bob, W.DKOLV);
        if (level >= 2) { p(cx - 2, 2 + bob, W.GUN); p(cx + 1, 2 + bob, W.GUN); } // visor
        if (level >= 4) { p(cx - 2, 0 + bob, W.DKOLV); p(cx + 1, 0 + bob, W.DKOLV); } // taller helmet
        b(cx - 1, 3 + bob, 3, 2, W.SKIN); p(cx - 1, 4 + bob, W.DKSKIN);
        p(cx, 3 + bob, W.DKSKIN);
      } else if (row === 1) {
        b(cx - 1, 1 + bob, 3, 3, W.OLIVE); b(cx, 1 + bob, 2, 2, W.SAGE);
        p(cx - 1, 1 + bob, W.DKOLV);
        if (level >= 2) { p(cx + 1, 2 + bob, W.GUN); } // visor
        b(cx, 3 + bob, 2, 2, W.SKIN); p(cx + 1, 3 + bob, W.DKSKIN);
      } else {
        b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.DKOLV);
        p(cx - 2, 2 + bob, W.DKOLV); p(cx + 1, 2 + bob, W.DKOLV);
        b(cx - 1, 3 + bob, 3, 2, W.DKSKIN);
      }

      // Torso — L3+: vest/armor plating
      b(cx - 2, 5 + bob, 4, 4, W.OLIVE); b(cx - 1, 5 + bob, 2, 3, W.SAGE);
      if (level >= 3) { p(cx - 2, 5 + bob, W.DKARM); p(cx + 1, 5 + bob, W.DKARM); p(cx - 2, 6 + bob, W.DKARM); p(cx + 1, 6 + bob, W.DKARM); } // armor vest
      if (level >= 5) { b(cx - 2, 5 + bob, 4, 2, W.DKARM); b(cx - 1, 5 + bob, 2, 1, W.GUN); } // full plate
      p(cx - 2, 8 + bob, W.BELT); p(cx + 1, 8 + bob, W.BELT);
      b(cx - 1, 8 + bob, 2, 1, W.BELT);

      // Rifle — L2+: scope on rifle
      if (row === 0) {
        p(cx - 3, 5 + bob, W.GUN); p(cx - 2, 6 + bob, W.DKGUN);
        p(cx + 2, 7 + bob, W.GUN); p(cx + 3, 8 + bob, W.DKGUN);
        if (level >= 2) { p(cx + 3, 6 + bob, W.LTGUN); } // scope
      } else if (row === 1) {
        p(cx + 2, 5 + bob, W.GUN); p(cx + 2, 6 + bob, W.DKGUN);
        p(cx + 2, 7 + bob, W.GUN); p(cx + 3, 5 + bob, W.LTGUN);
        if (level >= 2) { p(cx + 3, 4 + bob, W.LTGUN); } // scope
      } else {
        p(cx + 1, 3 + bob, W.GUN); p(cx + 1, 4 + bob, W.DKGUN);
        p(cx + 1, 5 + bob, W.GUN); p(cx + 1, 6 + bob, W.GUN);
      }

      // Arms
      if (row !== 2) {
        p(cx - 3, 6 + bob, W.SAGE); p(cx + 2, 6 + bob, W.SAGE);
      } else {
        p(cx - 3, 6 + bob, W.OLIVE); p(cx + 2, 6 + bob, W.OLIVE);
      }

      // Legs
      b(cx - 2 + lOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx + rOff, 9 + bob, 2, 4, W.OLIVE);
      p(cx - 2 + lOff, 12 + bob, W.DKOLV); p(cx + rOff, 12 + bob, W.DKOLV);
      b(cx - 2 + lOff, 13 + bob, 2, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 2, 1, W.BOOT);

    } else {
      const bob = col === 2 ? 1 : 0;

      // Helmet
      b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.SAGE);
      p(cx - 2, 1 + bob, W.DKOLV); p(cx + 1, 1 + bob, W.DKOLV);
      if (level >= 2) { p(cx - 2, 2 + bob, W.GUN); p(cx + 1, 2 + bob, W.GUN); }
      if (level >= 4) { p(cx - 2, 0 + bob, W.DKOLV); p(cx + 1, 0 + bob, W.DKOLV); }
      b(cx - 1, 3 + bob, 3, 2, W.SKIN); p(cx, 3 + bob, W.DKSKIN);

      // Torso
      b(cx - 2, 5 + bob, 4, 4, W.OLIVE); b(cx - 1, 5 + bob, 2, 3, W.SAGE);
      if (level >= 3) { p(cx - 2, 5 + bob, W.DKARM); p(cx + 1, 5 + bob, W.DKARM); p(cx - 2, 6 + bob, W.DKARM); p(cx + 1, 6 + bob, W.DKARM); }
      if (level >= 5) { b(cx - 2, 5 + bob, 4, 2, W.DKARM); b(cx - 1, 5 + bob, 2, 1, W.GUN); }
      b(cx - 1, 8 + bob, 2, 1, W.BELT);

      // Rifle position per frame — L2+: scope visible
      if (col === 0) {
        p(cx + 2, 3, W.GUN); p(cx + 2, 4, W.GUN); p(cx + 2, 5, W.DKGUN);
        p(cx + 3, 2, W.GUN); p(cx + 3, 1, W.LTGUN);
        if (level >= 2) { p(cx + 3, 0, W.LTGUN); } // scope
      } else if (col === 1) {
        p(cx + 2, 3, W.GUN); p(cx + 3, 3, W.GUN); p(cx + 4, 3, W.DKGUN);
        p(cx + 5, 3, W.LTGUN);
        if (level >= 2) { p(cx + 5, 2, W.LTGUN); } // scope
        p(cx + 6, 2, W.FLASH); p(cx + 6, 3, W.FLASH); p(cx + 6, 4, W.FLASH);
        p(cx + 7, 3, W.WHITE);
      } else if (col === 2) {
        p(cx + 1, 4 + bob, W.GUN); p(cx + 1, 5 + bob, W.GUN);
        p(cx + 2, 3 + bob, W.DKGUN); p(cx + 2, 4 + bob, W.GUN);
        p(cx + 3, 4 + bob, W.LTGUN);
      } else {
        p(cx + 2, 5, W.GUN); p(cx + 2, 6, W.DKGUN); p(cx + 2, 7, W.GUN);
        p(cx + 3, 5, W.LTGUN);
      }

      // Arms
      p(cx - 3, 6 + bob, W.SAGE); p(cx + 2, 5 + bob, W.SAGE);

      // Legs
      b(cx - 2, 9 + bob, 2, 4, W.OLIVE); b(cx, 9 + bob, 2, 4, W.OLIVE);
      b(cx - 2, 13 + bob, 2, 1, W.BOOT); b(cx, 13 + bob, 2, 1, W.BOOT);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 2. BRAWLER =====
export function drawBrawler(ctx: CanvasRenderingContext2D, level: number = 1) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;
      const lean = 1; // forward lean

      // Beret — L2+: headband
      if (row === 0) {
        b(cx - 2, 1 + bob, 5, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        if (level >= 2) { b(cx - 2, 2 + bob, 5, 1, W.DKBER); } // headband
        b(cx - 1, 2 + bob, 3, 2, W.SKIN); p(cx, 3 + bob, W.DKSKIN);
        p(cx - 1, 2 + bob, W.DKSKIN); p(cx + 1, 2 + bob, W.DKSKIN);
      } else if (row === 1) {
        b(cx - 1, 1 + bob, 4, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        if (level >= 2) { b(cx - 1, 2 + bob, 4, 1, W.DKBER); }
        b(cx, 2 + bob, 2, 2, W.SKIN); p(cx + 1, 3 + bob, W.DKSKIN);
      } else {
        b(cx - 2, 1 + bob, 5, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        if (level >= 2) { b(cx - 2, 2 + bob, 5, 1, W.DKBER); }
        b(cx - 1, 2 + bob, 3, 2, W.DKSKIN);
      }

      // Muscular torso (wider) — L3+: shoulder pads
      b(cx - 3, 4 + bob, 6, 5, W.OLIVE); b(cx - 2, 4 + bob, 4, 4, W.SAGE);
      p(cx - 3, 4 + bob, W.DKOLV); p(cx + 2, 4 + bob, W.DKOLV);
      if (level >= 3) { p(cx - 4, 4 + bob, W.DKARM); p(cx + 3, 4 + bob, W.DKARM); p(cx - 4, 5 + bob, W.DKARM); p(cx + 3, 5 + bob, W.DKARM); } // shoulder pads
      if (level >= 5) { b(cx - 3, 4 + bob, 6, 2, W.DKARM); b(cx - 2, 4 + bob, 4, 1, W.GUN); } // full armor
      b(cx - 2, 8 + bob, 4, 1, W.BELT);

      // Arms swinging — L2+: knuckle guards on fists
      const armSwF = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const armSwB = -armSwF;
      p(cx - 4, 5 + bob + armSwF, W.SAGE); p(cx - 4, 6 + bob + armSwF, W.SKIN);
      p(cx + 3, 5 + bob + armSwB, W.SAGE); p(cx + 3, 6 + bob + armSwB, W.SKIN);
      if (level >= 2) { p(cx - 4, 6 + bob + armSwF, W.GUN); p(cx + 3, 6 + bob + armSwB, W.GUN); } // knuckle guards

      // Legs (heavy steps)
      b(cx - 2 + lOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx + rOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx - 2 + lOff, 13 + bob, 2, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 2, 1, W.BOOT);

    } else {
      // ATTACK: col0=wind up, col1=strike, col2=follow through, col3=recover
      // Beret — L2+: headband
      b(cx - 2, 1, 5, 2, W.BERET); p(cx + 2, 1, W.DKBER);
      if (level >= 2) { b(cx - 2, 2, 5, 1, W.DKBER); }
      b(cx - 1, 2, 3, 2, W.SKIN); p(cx, 3, W.DKSKIN);

      // Torso — L3+: shoulder pads, L5+: full armor
      b(cx - 3, 4, 6, 5, W.OLIVE); b(cx - 2, 4, 4, 4, W.SAGE);
      if (level >= 3) { p(cx - 4, 4, W.DKARM); p(cx + 3, 4, W.DKARM); p(cx - 4, 5, W.DKARM); p(cx + 3, 5, W.DKARM); }
      if (level >= 5) { b(cx - 3, 4, 6, 2, W.DKARM); b(cx - 2, 4, 4, 1, W.GUN); }
      b(cx - 2, 8, 4, 1, W.BELT);

      // Fist positions — L2+: knuckle guards (GUN colored fists)
      const fistCol = level >= 2 ? W.GUN : W.SKIN;
      if (col === 0) { // wind up — fist pulled back
        p(cx - 4, 4, W.SAGE); p(cx - 5, 4, fistCol); p(cx - 5, 5, fistCol);
        p(cx + 3, 6, W.SAGE);
      } else if (col === 1) { // strike — fist forward
        p(cx + 3, 5, W.SAGE); p(cx + 4, 5, fistCol); p(cx + 5, 5, fistCol);
        p(cx + 6, 4, W.FLASH); p(cx + 6, 5, W.FLASH); p(cx + 6, 6, W.FLASH); // impact
        p(cx - 4, 6, W.SAGE);
      } else if (col === 2) { // follow through
        p(cx + 3, 6, W.SAGE); p(cx + 4, 6, fistCol); p(cx + 5, 7, fistCol);
        p(cx - 4, 5, W.SAGE);
      } else { // recover
        p(cx - 4, 5, W.SAGE); p(cx - 4, 6, fistCol);
        p(cx + 3, 5, W.SAGE); p(cx + 3, 6, fistCol);
      }

      // Legs
      b(cx - 2, 9, 2, 4, W.OLIVE); b(cx, 9, 2, 4, W.OLIVE);
      b(cx - 2, 13, 2, 1, W.BOOT); b(cx, 13, 2, 1, W.BOOT);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 3. HEAVY GUNNER =====
export function drawHeavy(ctx: CanvasRenderingContext2D, level: number = 1) {
  // TANK — chunky armored vehicle, not a soldier
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;
    const treadAnim = col % 2; // alternate tread segments

    // Tank hull dimensions scale with level
    const hullW = 10 + Math.min(level - 1, 2) * 2;
    const hullH = 5 + Math.min(level - 1, 2);
    const hx = cx - Math.floor(hullW / 2);
    const hy = 6;

    // Treads
    const ty = hy + hullH;
    b(hx - 1, ty, hullW + 2, 3, W.DKGUN);
    for (let i = 0; i < hullW + 1; i += 2) p(hx - 1 + i + treadAnim, ty + 1, W.GUN);
    p(hx - 1, ty, W.GUN); p(hx + hullW, ty, W.GUN);
    p(hx - 1, ty + 2, W.GUN); p(hx + hullW, ty + 2, W.GUN);

    // Hull
    b(hx, hy, hullW, hullH, W.DKARM);
    b(hx + 1, hy, hullW - 2, hullH - 1, W.OLIVE);
    p(hx + 2, hy + 1, W.DKGUN); p(hx + hullW - 3, hy + 1, W.DKGUN);
    if (level >= 2) { b(hx, hy, hullW, 1, W.DKGUN); }
    if (level >= 3) { p(hx - 1, hy + 1, W.DKARM); p(hx + hullW, hy + 1, W.DKARM); p(hx - 1, hy + 2, W.DKARM); p(hx + hullW, hy + 2, W.DKARM); }

    // Turret
    const tW = 6 + Math.min(level - 1, 2);
    const tH = 3;
    const ttx = cx - Math.floor(tW / 2);
    const tty = hy - tH + 1;
    b(ttx, tty, tW, tH, W.DKARM); b(ttx + 1, tty, tW - 2, tH - 1, W.GUN);
    p(cx, tty, W.LTGUN);

    // Barrel — direction based on row
    const bLen = 4 + Math.min(level - 1, 2);
    if (row === 0) { b(cx - 1, hy + hullH - 1, 2, bLen, W.GUN); p(cx - 1, hy + hullH + bLen - 2, W.DKGUN); p(cx, hy + hullH + bLen - 2, W.DKGUN); }
    else if (row === 1) { b(cx + Math.floor(tW / 2), tty + 1, bLen, 2, W.GUN); p(cx + Math.floor(tW / 2) + bLen - 1, tty + 1, W.DKGUN); }
    else if (row === 2) { b(cx - 1, tty - bLen + 1, 2, bLen, W.GUN); p(cx - 1, tty - bLen + 1, W.DKGUN); p(cx, tty - bLen + 1, W.DKGUN); }
    else {
      // Attack row: firing right
      b(cx + Math.floor(tW / 2), tty + 1, bLen, 2, W.GUN);
      const mz = cx + Math.floor(tW / 2) + bLen;
      if (col === 1 || col === 2) { p(mz, tty, W.FLASH); p(mz + 1, tty + 1, W.WHITE); p(mz, tty + 2, W.FLASH); p(mz + 1, tty, W.FLASH); p(mz + 1, tty + 2, W.FLASH); }
      if (col === 3) { p(mz, tty + 1, W.GUN); p(mz + 1, tty, W.DKGUN); }
    }

    // Star emblem
    p(cx, hy + 1, W.GOLD);

    if (row < 3) {
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;

      // Helmet (bulkier)
      if (row === 0) {
        b(cx - 3, 0 + bob, 6, 3, W.DKARM); b(cx - 2, 0 + bob, 4, 2, W.GUN);
        p(cx - 3, 0 + bob, W.DKGUN); p(cx + 2, 0 + bob, W.DKGUN);
        b(cx - 2, 2 + bob, 4, 2, W.SKIN); p(cx, 2 + bob, W.DKSKIN);
        p(cx - 2, 3 + bob, W.DKSKIN);
      } else if (row === 1) {
        b(cx - 2, 0 + bob, 5, 3, W.DKARM); b(cx - 1, 0 + bob, 3, 2, W.GUN);
        b(cx, 2 + bob, 3, 2, W.SKIN); p(cx + 1, 2 + bob, W.DKSKIN);
      } else {
        b(cx - 3, 0 + bob, 6, 3, W.DKARM); b(cx - 2, 0 + bob, 4, 2, W.GUN);
        b(cx - 2, 2 + bob, 4, 2, W.DKSKIN);
      }

      // Heavy armor torso — L2+: extra armor plating
      b(cx - 3, 4 + bob, 7, 5, W.DKARM); b(cx - 2, 4 + bob, 5, 4, W.OLIVE);
      b(cx - 1, 5 + bob, 3, 2, W.SAGE);
      if (level >= 2) { p(cx - 3, 5 + bob, W.DKGUN); p(cx + 3, 5 + bob, W.DKGUN); p(cx - 3, 6 + bob, W.DKGUN); p(cx + 3, 6 + bob, W.DKGUN); } // extra plating
      if (level >= 3) { b(cx - 3, 4 + bob, 7, 2, W.DKGUN); b(cx - 2, 4 + bob, 5, 1, W.LTGUN); } // full heavy plate
      b(cx - 2, 8 + bob, 5, 1, W.BELT);

      // Machine gun — L2+: larger barrel
      if (row === 0 || row === 2) {
        p(cx + 3, 4 + bob, W.GUN); p(cx + 4, 4 + bob, W.GUN);
        p(cx + 3, 5 + bob, W.DKGUN); p(cx + 4, 5 + bob, W.DKGUN);
        if (level >= 2) { p(cx + 5, 4 + bob, W.DKGUN); p(cx + 5, 5 + bob, W.DKGUN); } // bigger barrel
      } else {
        p(cx + 3, 4 + bob, W.GUN); p(cx + 4, 4 + bob, W.GUN);
        p(cx + 5, 4 + bob, W.DKGUN);
        p(cx + 3, 5 + bob, W.DKGUN);
        if (level >= 2) { p(cx + 6, 4 + bob, W.DKGUN); } // longer barrel
      }

      // Ammo belt sway — L3+: double ammo belt
      const beltOff = (col === 1 || col === 3) ? 1 : 0;
      p(cx - 4, 5 + bob + beltOff, W.DKGOLD);
      p(cx - 4, 6 + bob + beltOff, W.GOLD);
      p(cx - 4, 7 + bob, W.DKGOLD);
      if (level >= 3) { p(cx - 5, 5 + bob + beltOff, W.GOLD); p(cx - 5, 6 + bob + beltOff, W.DKGOLD); } // double belt

      // Arms
      p(cx - 4, 4 + bob, W.OLIVE); p(cx + 3, 6 + bob, W.OLIVE);

      // Heavy legs (slow trudge)
      b(cx - 2 + lOff, 9 + bob, 2, 4, W.DKARM);
      b(cx + 1 + rOff, 9 + bob, 2, 4, W.DKARM);
      p(cx - 1 + lOff, 9 + bob, W.OLIVE); p(cx + 1 + rOff, 9 + bob, W.OLIVE);
      b(cx - 3 + lOff, 13 + bob, 3, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 3, 1, W.BOOT);

    } else {
      // ATTACK: col0=brace, col1=fire burst, col2=sustained, col3=cease
      // Helmet
      b(cx - 3, 0, 6, 3, W.DKARM); b(cx - 2, 0, 4, 2, W.GUN);
      b(cx - 2, 2, 4, 2, W.SKIN); p(cx, 2, W.DKSKIN);

      // Torso — L2+: extra plating, L3+: heavy plate
      b(cx - 3, 4, 7, 5, W.DKARM); b(cx - 2, 4, 5, 4, W.OLIVE);
      b(cx - 1, 5, 3, 2, W.SAGE);
      if (level >= 2) { p(cx - 3, 5, W.DKGUN); p(cx + 3, 5, W.DKGUN); p(cx - 3, 6, W.DKGUN); p(cx + 3, 6, W.DKGUN); }
      if (level >= 3) { b(cx - 3, 4, 7, 2, W.DKGUN); b(cx - 2, 4, 5, 1, W.LTGUN); }
      b(cx - 2, 8, 5, 1, W.BELT);

      // Gun forward — L2+: larger barrel
      const gunLen = level >= 2 ? 4 : 3;
      if (col === 0) { // brace
        b(cx + 3, 4, gunLen, 1, W.GUN); b(cx + 3, 5, gunLen, 1, W.DKGUN);
        p(cx - 4, 5, W.OLIVE);
      } else if (col === 1) { // fire burst
        b(cx + 3, 4, gunLen, 1, W.GUN); b(cx + 3, 5, gunLen, 1, W.DKGUN);
        // big muzzle flash
        const mz = cx + 3 + gunLen;
        p(mz, 3, W.FLASH); p(mz + 1, 4, W.WHITE); p(mz, 5, W.FLASH);
        p(mz + 1, 3, W.FLASH); p(mz + 1, 5, W.FLASH);
        // shell casing
        p(cx + 2, 2, W.DKGOLD); p(cx + 1, 1, W.GOLD);
        p(cx - 4, 5, W.OLIVE);
      } else if (col === 2) { // sustained
        b(cx + 3, 4, gunLen, 1, W.GUN); b(cx + 3, 5, gunLen, 1, W.DKGUN);
        const mz2 = cx + 3 + gunLen;
        p(mz2, 4, W.FLASH); p(mz2 + 1, 4, W.FLASH);
        p(mz2, 3, W.FLASH); p(mz2, 5, W.FLASH);
        p(cx + 3, 2, W.GOLD); p(cx + 2, 3, W.DKGOLD); // casing
        p(cx - 4, 5, W.OLIVE);
      } else { // cease
        b(cx + 3, 5, gunLen, 1, W.GUN); b(cx + 3, 6, Math.max(2, gunLen - 1), 1, W.DKGUN);
        p(cx - 4, 5, W.OLIVE);
        p(cx + 2 + gunLen, 4, W.GUN); // barrel cooling
      }

      // Ammo belt — L3+: double belt
      p(cx - 4, 5, W.DKGOLD); p(cx - 4, 6, W.GOLD); p(cx - 4, 7, W.DKGOLD);
      if (level >= 3) { p(cx - 5, 5, W.GOLD); p(cx - 5, 6, W.DKGOLD); }

      // Legs braced
      b(cx - 3, 9, 2, 4, W.DKARM); b(cx + 1, 9, 2, 4, W.DKARM);
      b(cx - 3, 13, 3, 1, W.BOOT); b(cx + 1, 13, 3, 1, W.BOOT);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 4. COMMANDER =====
export function drawCommander(ctx: CanvasRenderingContext2D, level: number = 1) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;

      // Officer cap
      if (row === 0) {
        b(cx - 3, 0 + bob, 6, 1, W.DKOLV); // brim
        b(cx - 2, 0 + bob, 4, 1, W.GOLD); // gold band
        b(cx - 2, -1 + bob, 4, 1, W.OLIVE);
        p(cx - 1, -1 + bob, W.SAGE);
        b(cx - 1, 2 + bob, 3, 2, W.SKIN); p(cx, 2 + bob, W.DKSKIN);
        p(cx - 1, 2 + bob, W.DKSKIN); p(cx + 1, 2 + bob, W.DKSKIN);
      } else if (row === 1) {
        b(cx - 1, 0 + bob, 4, 1, W.DKOLV);
        b(cx, 0 + bob, 2, 1, W.GOLD);
        b(cx - 1, -1 + bob, 3, 1, W.OLIVE);
        b(cx, 2 + bob, 2, 2, W.SKIN); p(cx + 1, 2 + bob, W.DKSKIN);
      } else {
        b(cx - 3, 0 + bob, 6, 1, W.DKOLV);
        b(cx - 2, 0 + bob, 4, 1, W.GOLD);
        b(cx - 2, -1 + bob, 4, 1, W.OLIVE);
        b(cx - 1, 2 + bob, 3, 2, W.DKSKIN);
      }

      // Epaulettes + torso — L2+: golden trim, L3+: medals
      b(cx - 3, 4 + bob, 6, 5, W.OLIVE); b(cx - 2, 4 + bob, 4, 4, W.SAGE);
      p(cx - 3, 4 + bob, W.GOLD); p(cx + 2, 4 + bob, W.GOLD); // epaulettes
      if (level >= 2) { p(cx - 3, 5 + bob, W.DKGOLD); p(cx + 2, 5 + bob, W.DKGOLD); } // golden trim
      if (level >= 3) { p(cx - 1, 5 + bob, W.GOLD); p(cx, 6 + bob, W.GOLD); p(cx + 1, 5 + bob, W.DKGOLD); } // medals
      b(cx - 2, 8 + bob, 4, 1, W.BELT);

      // Cape flowing behind — L2+: longer cape
      const capeOff = col === 1 ? 1 : col === 3 ? -1 : 0;
      if (row === 0 || row === 1) {
        p(cx - 4, 5 + bob + capeOff, W.CAPE); p(cx - 4, 6 + bob, W.DKCAPE);
        p(cx - 4, 7 + bob - capeOff, W.CAPE);
        if (level >= 2) { p(cx - 4, 8 + bob + capeOff, W.CAPE); p(cx - 5, 7 + bob, W.DKCAPE); } // longer cape
      }

      // Sword at side
      if (row !== 2) {
        p(cx + 3, 6 + bob, W.LTGUN); p(cx + 3, 7 + bob, W.GUN);
        p(cx + 3, 8 + bob, W.GUN); p(cx + 3, 9 + bob, W.DKGUN);
      }

      // Arms
      p(cx - 3, 5 + bob, W.SAGE); p(cx + 2, 5 + bob, W.SAGE);

      // Legs (confident stride)
      b(cx - 2 + lOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx + rOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx - 2 + lOff, 13 + bob, 2, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 2, 1, W.BOOT);

    } else {
      // ATTACK: col0=sword slash, col1=pistol fire, col2=command pose, col3=recover
      // Cap
      b(cx - 3, 0, 6, 1, W.DKOLV); b(cx - 2, 0, 4, 1, W.GOLD);
      b(cx - 2, -1, 4, 1, W.OLIVE);
      b(cx - 1, 2, 3, 2, W.SKIN); p(cx, 2, W.DKSKIN);

      // Torso — L2+: golden trim, L3+: medals
      b(cx - 3, 4, 6, 5, W.OLIVE); b(cx - 2, 4, 4, 4, W.SAGE);
      p(cx - 3, 4, W.GOLD); p(cx + 2, 4, W.GOLD);
      if (level >= 2) { p(cx - 3, 5, W.DKGOLD); p(cx + 2, 5, W.DKGOLD); }
      if (level >= 3) { p(cx - 1, 5, W.GOLD); p(cx, 6, W.GOLD); p(cx + 1, 5, W.DKGOLD); }
      b(cx - 2, 8, 4, 1, W.BELT);

      if (col === 0) { // sword slash forward
        p(cx + 3, 3, W.LTGUN); p(cx + 4, 4, W.GUN); p(cx + 5, 5, W.GUN);
        p(cx + 6, 6, W.DKGUN); p(cx + 7, 7, W.DKGUN);
        p(cx - 3, 6, W.SAGE);
      } else if (col === 1) { // pistol fire
        p(cx - 3, 5, W.GUN); p(cx - 4, 5, W.DKGUN);
        p(cx - 5, 4, W.FLASH); p(cx - 5, 5, W.FLASH); p(cx - 5, 6, W.FLASH);
        p(cx + 3, 7, W.GUN); p(cx + 3, 8, W.DKGUN); // sword lowered
      } else if (col === 2) { // command pose — golden aura
        p(cx + 3, 5, W.SAGE); p(cx - 3, 5, W.SAGE);
        // golden aura ring
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          p(cx + Math.round(Math.cos(a) * 6), 7 + Math.round(Math.sin(a) * 5), W.GOLD);
        }
        p(cx, 1, W.DKGOLD);
        p(cx + 3, 7, W.GUN); // sword
      } else { // recover
        p(cx + 3, 6, W.LTGUN); p(cx + 3, 7, W.GUN); p(cx + 3, 8, W.DKGUN);
        p(cx - 3, 5, W.SAGE); p(cx + 2, 5, W.SAGE);
      }

      // Legs
      b(cx - 2, 9, 2, 4, W.OLIVE); b(cx, 9, 2, 4, W.OLIVE);
      b(cx - 2, 13, 2, 1, W.BOOT); b(cx, 13, 2, 1, W.BOOT);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 5. SWARMLING =====
export function drawSwarmling(ctx: CanvasRenderingContext2D, level: number = 1) {
  const A = ALN;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      // WALK: rapid scuttle, 6 legs in pairs, antennae bobbing
      const legPhase = col; // 0,1,2,3
      const bob = (col === 0 || col === 2) ? 0 : 1;
      const antBob = (col === 1 || col === 3) ? -1 : 0;

      // Antennae
      if (row === 0) { // down
        p(cx - 2, 3 + antBob, A.LIME); p(cx - 3, 2 + antBob, A.DKLIME);
        p(cx + 1, 3 + antBob, A.LIME); p(cx + 2, 2 + antBob, A.DKLIME);
      } else if (row === 1) { // right
        p(cx + 1, 3 + antBob, A.LIME); p(cx + 2, 2 + antBob, A.DKLIME);
        p(cx + 1, 2 + antBob, A.LIME);
      } else { // up
        p(cx - 2, 3 + antBob, A.DKLIME); p(cx - 3, 2 + antBob, A.LIME);
        p(cx + 1, 3 + antBob, A.DKLIME); p(cx + 2, 2 + antBob, A.LIME);
      }

      // Head — L2+: larger mandibles
      if (row === 0) {
        b(cx - 2, 4 + bob, 4, 2, A.CHITIN); b(cx - 1, 4 + bob, 2, 2, A.LTCHI);
        p(cx - 1, 4 + bob, A.EYE); p(cx + 1, 4 + bob, A.EYE);
        p(cx, 5 + bob, A.MAND);
        if (level >= 2) { p(cx - 1, 5 + bob, A.MAND); p(cx + 1, 5 + bob, A.MAND); } // bigger mandibles
      } else if (row === 1) {
        b(cx - 1, 4 + bob, 3, 2, A.CHITIN); b(cx, 4 + bob, 2, 2, A.LTCHI);
        p(cx + 1, 4 + bob, A.EYE);
        if (level >= 2) { p(cx + 2, 5 + bob, A.MAND); } // bigger mandible
      } else {
        b(cx - 2, 4 + bob, 4, 2, A.CHITIN); b(cx - 1, 4 + bob, 2, 2, A.DKCHI);
      }

      // Body (oval) — L2+: extra chitin plating
      b(cx - 3, 6 + bob, 6, 4, A.CHITIN); b(cx - 2, 6 + bob, 4, 3, A.LIME);
      b(cx - 1, 7 + bob, 2, 2, A.LTLIME);
      p(cx - 3, 6 + bob, A.DKCHI); p(cx + 2, 6 + bob, A.DKCHI);
      if (level >= 2) { p(cx - 3, 7 + bob, A.DKCHI); p(cx + 2, 7 + bob, A.DKCHI); p(cx - 3, 8 + bob, A.DKCHI); p(cx + 2, 8 + bob, A.DKCHI); } // extra plating

      // 6 legs in 3 pairs — phase shifts per col
      const lP1 = legPhase === 0 ? -1 : legPhase === 1 ? 0 : legPhase === 2 ? 1 : 0;
      const lP2 = legPhase === 0 ? 1 : legPhase === 1 ? 0 : legPhase === 2 ? -1 : 0;
      const lP3 = legPhase === 0 ? 0 : legPhase === 1 ? 1 : legPhase === 2 ? 0 : -1;

      // Front pair
      p(cx - 4 + lP1, 7 + bob, A.DKCHI); p(cx + 3 - lP1, 7 + bob, A.DKCHI);
      p(cx - 5 + lP1, 8 + bob, A.DARK); p(cx + 4 - lP1, 8 + bob, A.DARK);
      // Middle pair
      p(cx - 4 + lP2, 8 + bob, A.DKCHI); p(cx + 3 - lP2, 8 + bob, A.DKCHI);
      p(cx - 5 + lP2, 9 + bob, A.DARK); p(cx + 4 - lP2, 9 + bob, A.DARK);
      // Back pair
      p(cx - 4 + lP3, 9 + bob, A.DKCHI); p(cx + 3 - lP3, 9 + bob, A.DKCHI);
      p(cx - 5 + lP3, 10 + bob, A.DARK); p(cx + 4 - lP3, 10 + bob, A.DARK);

      // Tail segment
      b(cx - 1, 10 + bob, 2, 2, A.DKCHI); p(cx, 11 + bob, A.CHITIN);

    } else {
      // ATTACK: col0=lunge, col1=bite, col2=pull back, col3=reset
      const lunge = col === 0 ? 1 : col === 1 ? 2 : col === 2 ? -1 : 0;
      const by = 7 - lunge;

      // Antennae (aggressive forward)
      p(cx - 2, by - 3, A.LIME); p(cx - 3, by - 4, A.DKLIME);
      p(cx + 1, by - 3, A.LIME); p(cx + 2, by - 4, A.DKLIME);

      // Head
      b(cx - 2, by - 2, 4, 2, A.CHITIN); b(cx - 1, by - 2, 2, 2, A.LTCHI);
      p(cx - 1, by - 2, A.EYE); p(cx + 1, by - 2, A.EYE);

      // Mandibles open/closed — L2+: larger mandibles
      if (col === 1) { // bite — mandibles wide
        p(cx - 3, by - 1, A.MAND); p(cx + 2, by - 1, A.MAND);
        p(cx - 3, by, A.LIME); p(cx + 2, by, A.LIME);
        if (level >= 2) { p(cx - 4, by - 1, A.MAND); p(cx + 3, by - 1, A.MAND); } // wider bite
      } else if (col === 0) { // lunge — opening
        p(cx - 2, by - 1, A.MAND); p(cx + 1, by - 1, A.MAND);
        if (level >= 2) { p(cx - 3, by - 1, A.MAND); p(cx + 2, by - 1, A.MAND); }
      } else {
        p(cx, by - 1, A.MAND);
        if (level >= 2) { p(cx - 1, by - 1, A.MAND); p(cx + 1, by - 1, A.MAND); }
      }

      // Body — L2+: extra chitin plating
      b(cx - 3, by, 6, 4, A.CHITIN); b(cx - 2, by, 4, 3, A.LIME);
      b(cx - 1, by + 1, 2, 2, A.LTLIME);
      if (level >= 2) { p(cx - 3, by + 1, A.DKCHI); p(cx + 2, by + 1, A.DKCHI); p(cx - 3, by + 2, A.DKCHI); p(cx + 2, by + 2, A.DKCHI); }

      // Legs (braced)
      for (let i = 0; i < 3; i++) {
        p(cx - 4, by + 1 + i, A.DKCHI); p(cx + 3, by + 1 + i, A.DKCHI);
        p(cx - 5, by + 2 + i, A.DARK); p(cx + 4, by + 2 + i, A.DARK);
      }

      // Tail
      b(cx - 1, by + 4, 2, 2, A.DKCHI); p(cx, by + 5, A.CHITIN);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 6. FIEND (Kamikaze) =====
export function drawFiend(ctx: CanvasRenderingContext2D, level: number = 1) {
  const F = INF;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      // WALK: hunched sprint, arms back, fire trail
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;
      const lean = 1; // hunched forward

      // Horns — L2+: larger horns
      if (row === 0) {
        p(cx - 2, 1 + bob, F.HORN); p(cx - 3, 0 + bob, F.DKHORN);
        p(cx + 1, 1 + bob, F.HORN); p(cx + 2, 0 + bob, F.DKHORN);
        if (level >= 2) { p(cx - 4, 0 + bob, F.HORN); p(cx + 3, 0 + bob, F.HORN); } // taller horns
      } else if (row === 1) {
        p(cx, 1 + bob, F.HORN); p(cx + 1, 0 + bob, F.DKHORN);
        p(cx + 2, 1 + bob, F.HORN);
        if (level >= 2) { p(cx + 3, 0 + bob, F.HORN); } // bigger horn
      } else {
        p(cx - 2, 1 + bob, F.DKHORN); p(cx - 3, 0 + bob, F.HORN);
        p(cx + 1, 1 + bob, F.DKHORN); p(cx + 2, 0 + bob, F.HORN);
        if (level >= 2) { p(cx - 4, 0 + bob, F.DKHORN); p(cx + 3, 0 + bob, F.DKHORN); }
      }

      // Head (glowing)
      if (row === 0) {
        b(cx - 2, 2 + bob, 4, 2, F.RED); b(cx - 1, 2 + bob, 2, 2, F.LTRED);
        p(cx - 1, 2 + bob, F.GLOW); p(cx + 1, 2 + bob, F.GLOW); // eyes
        p(cx, 3 + bob, F.DKRED);
      } else if (row === 1) {
        b(cx - 1, 2 + bob, 3, 2, F.RED); b(cx, 2 + bob, 2, 2, F.LTRED);
        p(cx + 1, 2 + bob, F.GLOW);
      } else {
        b(cx - 2, 2 + bob, 4, 2, F.DKRED); b(cx - 1, 2 + bob, 2, 2, F.RED);
      }

      // Hunched torso — L2+: more glowing cracks
      b(cx - 2, 4 + bob, 5, 4, F.RED); b(cx - 1, 4 + bob, 3, 3, F.ORANGE);
      p(cx, 5 + bob, F.GLOW); // inner glow
      if (level >= 2) { p(cx - 1, 4 + bob, F.GLOW); p(cx + 1, 6 + bob, F.GLOW); p(cx - 2, 5 + bob, F.YELLOW); } // extra glow cracks
      b(cx - 2, 7 + bob, 4, 1, F.DKRED);

      // Arms back (sprinting pose)
      if (row === 0) {
        p(cx - 3, 5 + bob, F.RED); p(cx - 4, 6 + bob, F.DKRED);
        p(cx + 3, 5 + bob, F.RED); p(cx + 4, 6 + bob, F.DKRED);
      } else if (row === 1) {
        p(cx - 2, 5 + bob, F.RED); p(cx - 3, 6 + bob, F.DKRED);
      } else {
        p(cx - 3, 6 + bob, F.RED); p(cx + 3, 6 + bob, F.RED);
      }

      // Legs (fast running)
      b(cx - 2 + lOff, 8 + bob, 2, 4, F.DKRED);
      b(cx + rOff, 8 + bob, 2, 4, F.DKRED);
      p(cx - 1 + lOff, 8 + bob, F.RED); p(cx + rOff, 8 + bob, F.RED);
      b(cx - 2 + lOff, 12 + bob, 2, 1, F.DARK);
      b(cx + rOff, 12 + bob, 2, 1, F.DARK);

      // Fire trail behind
      const trailY = 13 + bob;
      if (row === 0) {
        p(cx - 1, trailY, F.ORANGE); p(cx + 1, trailY, F.ORANGE);
        p(cx, trailY + 1, F.YELLOW);
        if (col === 1 || col === 3) {
          p(cx - 2, trailY + 1, F.DKORA); p(cx + 2, trailY + 1, F.DKORA);
        }
      } else if (row === 1) {
        p(cx - 2, 7 + bob, F.ORANGE); p(cx - 3, 8 + bob, F.YELLOW);
        if (col === 0 || col === 2) p(cx - 4, 9 + bob, F.DKORA);
      }

    } else {
      // ATTACK: col0=crouch, col1=swell/glow, col2=EXPLODE, col3=aftermath smoke
      if (col === 0) { // crouch
        // Horns — L2+: larger
        p(cx - 2, 4, F.HORN); p(cx - 3, 3, F.DKHORN);
        p(cx + 1, 4, F.HORN); p(cx + 2, 3, F.DKHORN);
        if (level >= 2) { p(cx - 4, 2, F.HORN); p(cx + 3, 2, F.HORN); }
        // Head crouched low
        b(cx - 2, 5, 4, 2, F.RED); b(cx - 1, 5, 2, 2, F.LTRED);
        p(cx - 1, 5, F.GLOW); p(cx + 1, 5, F.GLOW);
        // Body compact — L2+: more glow cracks
        b(cx - 2, 7, 5, 3, F.RED); b(cx - 1, 7, 3, 2, F.ORANGE);
        p(cx, 8, F.GLOW);
        if (level >= 2) { p(cx - 1, 7, F.GLOW); p(cx + 1, 8, F.YELLOW); }
        // Legs tucked
        b(cx - 2, 10, 2, 3, F.DKRED); b(cx + 1, 10, 2, 3, F.DKRED);
        b(cx - 2, 13, 2, 1, F.DARK); b(cx + 1, 13, 2, 1, F.DARK);

      } else if (col === 1) { // swell — body glowing bright
        // Horns — L2+: larger
        p(cx - 2, 3, F.HORN); p(cx - 3, 2, F.DKHORN);
        p(cx + 1, 3, F.HORN); p(cx + 2, 2, F.DKHORN);
        if (level >= 2) { p(cx - 4, 1, F.HORN); p(cx + 3, 1, F.HORN); }
        // Head glowing
        b(cx - 2, 4, 4, 2, F.ORANGE); b(cx - 1, 4, 2, 2, F.YELLOW);
        p(cx - 1, 4, F.GLOW); p(cx + 1, 4, F.GLOW);
        // Body swelling bright
        b(cx - 3, 6, 6, 4, F.ORANGE); b(cx - 2, 6, 4, 3, F.YELLOW);
        p(cx, 7, F.FLASH); p(cx - 1, 7, F.GLOW);
        // Glow aura
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          p(cx + Math.round(Math.cos(a) * 5), 7 + Math.round(Math.sin(a) * 4), F.ORANGE);
        }
        // Legs
        b(cx - 2, 10, 2, 3, F.DKRED); b(cx + 1, 10, 2, 3, F.DKRED);

      } else if (col === 2) { // EXPLODE — bright flash + ring
        // Central flash
        b(cx - 2, 5, 4, 4, F.FLASH); b(cx - 1, 4, 2, 6, F.FLASH);
        b(cx - 3, 6, 6, 2, F.YELLOW);
        // Explosion ring
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6;
          const r = 6;
          p(cx + Math.round(Math.cos(a) * r), 7 + Math.round(Math.sin(a) * r), F.ORANGE);
          p(cx + Math.round(Math.cos(a) * (r - 1)), 7 + Math.round(Math.sin(a) * (r - 1)), F.YELLOW);
        }
        // Outer sparks
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          p(cx + Math.round(Math.cos(a) * 7), 7 + Math.round(Math.sin(a) * 7), F.RED);
        }
        // Debris
        p(cx - 5, 3, F.DKRED); p(cx + 5, 2, F.DKRED);
        p(cx - 6, 9, F.DKORA); p(cx + 6, 10, F.DKORA);

      } else { // aftermath smoke
        // Smoke wisps
        b(cx - 2, 8, 4, 3, F.SMOKE); b(cx - 1, 7, 2, 4, F.DKSMOKE);
        p(cx - 3, 9, F.SMOKE); p(cx + 2, 8, F.SMOKE);
        // Rising smoke
        p(cx, 5, F.SMOKE); p(cx - 1, 4, F.DKSMOKE); p(cx + 1, 3, F.SMOKE);
        // Embers
        p(cx - 2, 10, F.DKORA); p(cx + 1, 11, F.DKORA);
        p(cx, 9, F.ORANGE);
        // Scorch mark
        b(cx - 3, 12, 6, 1, F.DARK); b(cx - 2, 13, 4, 1, F.DARK);
      }
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 7. MIRE DART (POISON DART FROG) =====
//
// Replaces the earlier Thornweaver spider. Three life stages —
// each a distinctly different silhouette, not a scaled-up blob:
//
//   L1 Hatchling
//       - Small pale-sage body, crouched pose, no stripes
//       - Sage eyes, no tongue showing, short tucked back legs
//   L2 Striped Dart
//       - Medium green body with yellow warning stripes across back
//       - Short red tongue visible during attack, amber eyes
//       - Longer hopping legs
//   L3 Ancient Dart
//       - Large dark-forest body with yellow stripes + red warning
//         spots, bulging red throat sac, gnarled tongue always
//         out, four-eye cluster, constant venom drool
//
// Walk rows (0-2) use a 4-frame HOP cycle — the sprite bobs up
// into the air at frames 1-2 and lands at 0/3. Underlying unit
// position is still interpolated linearly by the mobile_unit
// trait; the "jumping" is pure sprite-level Y-offsetting. Attack
// row (3) animates a tongue-lash extending from the mouth.
export function drawDartfrog(ctx: CanvasRenderingContext2D, level: number = 1) {
  const C = NAT;

  // Per-level silhouette jumps
  const BODY_W = [0, 5, 7, 9][level];   // width of the frog's body
  const BODY_H = [0, 4, 5, 6][level];   // body height (squat)
  const HEAD_W = [0, 4, 5, 6][level];   // head bulge width
  const LEG_LEN = [0, 2, 3, 4][level];  // back-leg reach on launch frame
  const TONGUE_MAX = [0, 3, 5, 7][level];  // tongue extent on attack frame 2
  const STRIPES = level >= 2;           // yellow warning stripes
  const SPOTS = level >= 3;             // red spots (L3 only)
  const EYE_CLUSTER = level >= 3;       // four eyes (L3 only)
  const THROAT_SAC = level >= 2;        // pulsing red throat

  // Tone gradient — light sage → green → dark forest
  const BODY = [C.SAGE, C.GREEN, C.FOREST][level - 1];
  const MID = [C.MOSS, C.DKGRN, C.DARK][level - 1];
  const BELLY_COL = [C.SAGE, C.MOSS, C.DKGRN][level - 1];
  const EYE_COL = level === 1 ? C.SAGE : level === 2 ? C.EYE : C.GLOW;
  const LEG_COL = level === 1 ? C.DKGRN : level === 2 ? C.FOREST : C.DARK;
  const STRIPE = C.GLOW;
  const SPOT = C.EYE;       // amber-red for L3 spots
  const TONGUE_COL = C.PINK;
  const TONGUE_DK = C.DKTHRN; // nearest NAT dark-red-ish for tongue shadow

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);

    const cx = 8;

    // ---- ATTACK row (tongue-lash, 4 frames) ----
    if (row === 3) {
      // Frog stays grounded during the attack pose, just the
      // tongue animates outward.
      const baseY = 10;
      const aby = baseY;
      const abx = cx - Math.floor(BODY_W / 2);

      // Body (crouched low, ready-to-pounce pose)
      b(abx, aby, BODY_W, BODY_H, C.DARK);
      b(abx + 1, aby + 1, BODY_W - 2, BODY_H - 2, MID);
      b(abx + 2, aby + 1, BODY_W - 4, 2, BODY);
      b(abx + 1, aby + BODY_H - 2, BODY_W - 2, 1, BELLY_COL);

      // Warning stripes + spots stay visible during attack
      if (STRIPES) {
        for (let sx = abx + 2; sx < abx + BODY_W - 2; sx += 2) p(sx, aby + 2, STRIPE);
      }
      if (SPOTS) {
        p(abx + 2, aby + 3, SPOT);
        p(abx + BODY_W - 3, aby + 3, SPOT);
      }

      // Head — extended FORWARD (to the right) during attack, jaw open
      const headX = abx + BODY_W - 1;
      const headY = aby - 1;
      b(headX, headY, HEAD_W - 1, 3, MID);
      b(headX, headY + 1, HEAD_W - 1, 1, C.DARK); // open mouth line

      // Bulging eyes on top of head
      p(headX, headY - 1, C.DARK); p(headX + 1, headY - 1, EYE_COL);
      p(headX + 2, headY - 1, C.DARK); p(headX + 3, headY - 1, EYE_COL);
      if (EYE_CLUSTER) {
        p(headX + 1, headY - 2, C.EYE);
        p(headX + 3, headY - 2, C.EYE);
      }

      // Tongue animation — col 0 retracted, 1 extending, 2 full
      // extended, 3 retracting with venom drip.
      const tongueY = headY + 2;
      let tongueLen = 0;
      if (col === 1) tongueLen = Math.max(1, Math.floor(TONGUE_MAX / 2));
      else if (col === 2) tongueLen = TONGUE_MAX;
      else if (col === 3) tongueLen = Math.max(1, Math.floor(TONGUE_MAX / 3));

      if (tongueLen > 0) {
        // Tongue shaft
        const tongueStartX = headX + HEAD_W - 1;
        for (let t = 0; t < tongueLen; t++) {
          p(tongueStartX + t, tongueY, TONGUE_COL);
          if (t > 0) p(tongueStartX + t, tongueY + 1, TONGUE_DK);
        }
        // Tongue tip — bright white-pink
        const tipX = tongueStartX + tongueLen;
        p(tipX, tongueY, C.WHITE);
        if (level >= 2) p(tipX + 1, tongueY, TONGUE_COL);
        // Barbed tip at L3
        if (level >= 3) {
          p(tipX, tongueY - 1, TONGUE_COL);
          p(tipX, tongueY + 1, TONGUE_COL);
        }
      }

      // Venom drips from tongue retract (col 3)
      if (col === 3 && level >= 2) {
        const dripX = headX + HEAD_W + Math.floor(tongueLen / 2);
        p(dripX, tongueY + 2, C.VENOM);
        if (level >= 3) p(dripX - 1, tongueY + 3, C.TOXIC);
      }

      // Back legs (tense, coiled for the pounce)
      p(abx - 1, aby + BODY_H - 2, LEG_COL);
      p(abx - 2, aby + BODY_H - 1, LEG_COL);
      p(abx - 2, aby + BODY_H, C.DARK);

      // Throat sac puffs bigger during attack
      if (THROAT_SAC) {
        p(abx + Math.floor(BODY_W / 2), aby + BODY_H, C.PINK);
        if (level >= 3) {
          p(abx + Math.floor(BODY_W / 2) - 1, aby + BODY_H, C.MAGENTA);
          p(abx + Math.floor(BODY_W / 2) + 1, aby + BODY_H, C.MAGENTA);
        }
      }
      return;
    }

    // ---- WALK (HOP) frames — rows 0..2 ----
    // 4-frame hop cycle: crouch → launch → peak → landing.
    // Y offset gives the airborne illusion while the underlying
    // mobile_unit position still interpolates linearly.
    const hopOffsets = [0, -3, -5, -2];
    const hopY = hopOffsets[col];
    const cy = 9 + hopY;

    // Orientation per direction
    const orient = row; // 0=down, 1=right, 2=up
    const headFacing = orient === 0 ? 'down' : orient === 1 ? 'right' : 'up';

    // ---- Body (squat oval) ----
    const abx = cx - Math.floor(BODY_W / 2);
    const aby = cy;
    // Silhouette outline
    b(abx, aby, BODY_W, BODY_H, C.DARK);
    // Body fill
    b(abx + 1, aby + 1, BODY_W - 2, BODY_H - 2, MID);
    // Light back dome
    b(abx + 2, aby + 1, BODY_W - 4, 1, BODY);
    // Lighter belly
    b(abx + 1, aby + BODY_H - 2, BODY_W - 2, 1, BELLY_COL);
    // Round corners
    p(abx, aby, C.DARK);
    p(abx + BODY_W - 1, aby, C.DARK);

    // Warning stripes (L2+)
    if (STRIPES) {
      for (let sx = abx + 2; sx < abx + BODY_W - 2; sx += 2) {
        p(sx, aby + 2, STRIPE);
      }
      // Warning stripe along the spine
      if (BODY_W >= 7) p(cx, aby + 3, STRIPE);
    }

    // Red dart-frog spots (L3)
    if (SPOTS) {
      p(abx + 2, aby + 1, SPOT);
      p(abx + BODY_W - 3, aby + 1, SPOT);
      p(cx, aby + BODY_H - 2, C.PINK);
    }

    // ---- Head (bulge facing direction of travel) ----
    if (headFacing === 'down') {
      // Facing down — head at bottom edge
      const hy = aby + BODY_H;
      const hx = cx - Math.floor(HEAD_W / 2);
      b(hx, hy, HEAD_W, 2, MID);
      // Eyes bulge UP from the back (top of body)
      const eyeY = aby - 1;
      const eye1X = abx + 1;
      const eye2X = abx + BODY_W - 2;
      p(eye1X, eyeY, C.DARK); p(eye1X + 1, eyeY - 1, EYE_COL); p(eye1X, eyeY - 1, C.DARK);
      p(eye2X, eyeY, C.DARK); p(eye2X - 1, eyeY - 1, EYE_COL); p(eye2X, eyeY - 1, C.DARK);
      if (EYE_CLUSTER) {
        p(eye1X + 1, eyeY, C.EYE);
        p(eye2X - 1, eyeY, C.EYE);
      }
      // Short idle tongue visible at L3
      if (level >= 3) {
        p(cx, hy, TONGUE_COL);
        p(cx, hy + 1, TONGUE_DK);
      }
    } else if (headFacing === 'right') {
      // Facing right — head bulges to the right
      const hx = abx + BODY_W;
      const hy = aby + Math.floor(BODY_H / 2);
      b(hx, hy - 1, 2, 3, MID);
      // Eyes on top of head-bulge
      p(hx + 1, hy - 2, C.DARK);
      p(hx + 1, hy - 3, EYE_COL);
      if (EYE_CLUSTER) p(hx, hy - 2, C.EYE);
      // Idle tongue tip (L3)
      if (level >= 3) p(hx + 2, hy, TONGUE_COL);
    } else {
      // Facing up — head at top, eyes visible
      const hy = aby - 2;
      const hx = cx - Math.floor(HEAD_W / 2);
      b(hx, hy, HEAD_W, 2, MID);
      // Eyes bulge up
      p(hx + 1, hy - 1, EYE_COL);
      p(hx + HEAD_W - 2, hy - 1, EYE_COL);
      if (EYE_CLUSTER) {
        p(hx + 2, hy - 1, C.EYE);
        p(hx + HEAD_W - 3, hy - 1, C.EYE);
      }
    }

    // ---- Back legs (frog's signature: coiled vs extended per frame) ----
    // Frame 0 (crouch) + 3 (landing) = tucked
    // Frame 1 (launch) + 2 (peak) = extended back behind body
    const extended = col === 1 || col === 2;
    if (extended) {
      // Left back leg — extended diagonally behind
      for (let d = 1; d <= LEG_LEN; d++) {
        p(abx - d, aby + BODY_H - 1 + Math.floor(d * 0.3), LEG_COL);
      }
      // Right back leg
      for (let d = 1; d <= LEG_LEN; d++) {
        p(abx + BODY_W - 1 + d, aby + BODY_H - 1 + Math.floor(d * 0.3), LEG_COL);
      }
      // Toe tips
      p(abx - LEG_LEN - 1, aby + BODY_H + Math.floor(LEG_LEN * 0.3), C.DARK);
      p(abx + BODY_W + LEG_LEN, aby + BODY_H + Math.floor(LEG_LEN * 0.3), C.DARK);
    } else {
      // Tucked — legs folded under body
      p(abx, aby + BODY_H, LEG_COL);
      p(abx - 1, aby + BODY_H, C.DARK);
      p(abx + BODY_W - 1, aby + BODY_H, LEG_COL);
      p(abx + BODY_W, aby + BODY_H, C.DARK);
      // Front toes peeking
      if (level >= 2) {
        p(abx + 2, aby + BODY_H, LEG_COL);
        p(abx + BODY_W - 3, aby + BODY_H, LEG_COL);
      }
    }

    // ---- Throat sac pulsing (L2+) ----
    // Visible on walk-down orientation (we can see it)
    if (THROAT_SAC && headFacing === 'down') {
      const sacX = cx;
      const sacY = aby + BODY_H;
      const sacCol = col === 0 || col === 3 ? C.PINK : C.MAGENTA;
      p(sacX, sacY + 1, sacCol);
      if (level >= 3) {
        p(sacX - 1, sacY + 1, C.DKTHRN);
        p(sacX + 1, sacY + 1, C.DKTHRN);
      }
    }

    // ---- Motion-trail droplets on the peak frame (L2+) ----
    // Adds to the hop-in-air feel — a tiny dust/venom puff trails
    // behind the frog at its highest point.
    if (col === 2 && level >= 2) {
      p(abx - 2, aby + BODY_H + 1, C.VENOM);
      if (level >= 3) {
        p(abx + BODY_W + 1, aby + BODY_H + 1, C.VENOM);
      }
    }
  }

  const levels = 3;
  // Draw 4 rows (walk down, walk right, walk up, attack) × 4 cols
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      frame(ctx, [col * CELL, row * CELL], row, col);
    }
  }
  void levels;
}

// ===== UNIT DEFINITIONS =====
export const UNITS = [
  { name: 'Rifleman', file: 'rifleman_mobile.png', draw: drawRifleman, levels: 5 },
  { name: 'Brawler', file: 'brawler_mobile.png', draw: drawBrawler, levels: 5 },
  { name: 'Tank', file: 'heavy_mobile.png', draw: drawHeavy, levels: 3 },
  { name: 'Commander', file: 'commander_mobile.png', draw: drawCommander, levels: 3 },
  { name: 'Swarmling', file: 'swarmling_mobile.png', draw: drawSwarmling, levels: 2 },
  { name: 'Fiend', file: 'fiend_mobile.png', draw: drawFiend, levels: 2 },
  { name: 'Mire Dart', file: 'dartfrog_mobile.png', draw: drawDartfrog, levels: 3 },
];

export const ROWS_PER_LEVEL = 4; // walk down, walk right, walk up, attack
const ROW_LABELS = ['Walk DOWN', 'Walk RIGHT', 'Walk UP', 'ATTACK'];
const COL_LABELS = ['Frame 0', 'Frame 1', 'Frame 2', 'Frame 3'];

// ===== REACT COMPONENT =====
export default function MobileUnitSprites() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    UNITS.forEach((unit, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      const totalRows = unit.levels * ROWS_PER_LEVEL;
      canvas.width = 4 * CELL;  // 128
      canvas.height = totalRows * CELL;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw each level's 4 rows, offset vertically
      for (let lv = 1; lv <= unit.levels; lv++) {
        const yOff = (lv - 1) * ROWS_PER_LEVEL * CELL;
        // Create an offset wrapper canvas context approach:
        // Save transform, translate, draw, restore
        ctx.save();
        ctx.translate(0, yOff);
        unit.draw(ctx, lv);
        ctx.restore();
      }
    });
    setReady(true);
  }, []);

  const dl = (idx: number) => () => {
    const canvas = canvasRefs.current[idx];
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = UNITS[idx].file;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16, fontFamily: 'monospace' }}>
      <h2 style={{ color: '#88cc44', margin: '0 0 12px 0', fontSize: 16 }}>
        Mobile Unit Spritesheets (128xN, 32x32 cells, per-level)
      </h2>
      <p style={{ color: '#666', fontSize: 11, margin: '0 0 16px 0' }}>
        4 cols x (4 rows per level). Row 0-3: Level 1 (Walk Down/Right/Up, Attack). Row 4-7: Level 2, etc.
        Internal grid: 16x16 at 2px/pixel.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {UNITS.map((unit, i) => (
          <div key={unit.name} style={{ background: '#111', border: '1px solid #333', borderRadius: 4, padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#aad466', fontSize: 12, fontWeight: 'bold' }}>{unit.name}</span>
              {ready && (
                <button
                  onClick={dl(i)}
                  style={{
                    background: '#556b2f', color: '#fff', border: 'none', padding: '3px 10px',
                    borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10
                  }}
                >
                  Download
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <canvas
                ref={el => { canvasRefs.current[i] = el; }}
                data-label={`${unit.name} Mobile`}
                data-frame-size="32x32"
                style={{ imageRendering: 'pixelated', width: 256, height: 256 * unit.levels, display: 'block', background: '#000' }}
              />
              {/* Row labels overlay — per level */}
              <div style={{ position: 'absolute', top: 0, left: -70, width: 66, height: 256 * unit.levels }}>
                {Array.from({ length: unit.levels }, (_, lv) =>
                  ROW_LABELS.map((lbl, r) => (
                    <div key={`${lv}-${r}`} style={{
                      position: 'absolute', top: (lv * 4 + r) * 64 + 22, left: 0, color: r === 0 ? '#aad466' : '#666',
                      fontSize: 8, width: 66, textAlign: 'right'
                    }}>{r === 0 ? `L${lv + 1} ${lbl}` : lbl}</div>
                  ))
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {COL_LABELS.map((lbl, ci) => (
                <span key={ci} style={{ color: '#555', fontSize: 8, width: 64, textAlign: 'center' }}>{lbl}</span>
              ))}
            </div>
            <div style={{ color: '#555', fontSize: 9, marginTop: 4 }}>
              {unit.file} — 128x{unit.levels * ROWS_PER_LEVEL * CELL}px ({unit.levels} level{unit.levels > 1 ? 's' : ''})
            </div>
          </div>
        ))}
      </div>
      <div style={{ color: '#444', fontSize: 9, marginTop: 20, maxWidth: 600 }}>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#667744' }}>Phaser loader:</b>{' '}
          <code style={{ color: '#88cc44' }}>
            {"this.load.spritesheet('unit_name', 'filename.png', { frameWidth: 32, frameHeight: 32 })"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#667744' }}>Flip for LEFT:</b> Use sprite.setFlipX(true) on Right-facing frames (row 1).</p>
      </div>
    </div>
  );
}
