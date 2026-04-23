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

// ===== 7. GROVE VIPER (SNAKE) =====
//
// Replaces the earlier Mire Dart frog. Three stages — each a
// clearly different silhouette:
//
//   L1 Hatchling — slim sage snake, 2-wide body, short tongue, no
//                 markings
//   L2 Adult viper — thicker green body with diamond-back scale
//                 pattern, forked tongue flicks out, visible eye
//   L3 Ancient viper — long dark-forest body with bold diamonds +
//                 red accents, slit pupil, cobra-hood flare,
//                 constant venom drool, rattle-tipped tail
//
// Walk rows (0-2) use a 4-frame SLITHER cycle — the body path is
// a sine curve with the phase shifted per frame so the snake
// appears to undulate as it moves. Attack row (3) coils once
// then lunges forward with fangs extended.
export function drawViper(ctx: CanvasRenderingContext2D, level: number = 1) {
  const C = NAT;

  // Per-level silhouette — longer bodies + more scales as the
  // viper matures.
  // Beefed up thickness so the snake reads as a chunky rope, not a
  // wire — the old 2-cell body blended into the grass tileset.
  const BODY_TH = [0, 3, 4, 5][level];  // body thickness in grid cells
  const N_SEGS = [0, 10, 12, 14][level]; // denser segment sampling → no gaps
  const AMP    = [0, 2, 2, 3][level];   // sine-wave amplitude (slither undulation)
  const HEAD_W = [0, 4, 5, 6][level];
  const HEAD_H = [0, 3, 4, 5][level];
  const DIAMOND = level >= 2;
  const HOOD = level >= 3;
  const FORKED_TONGUE = level >= 2;
  const SLIT_PUPIL = level >= 3;

  // Palette: shift L1 to BARK BROWNS so a juvenile viper contrasts
  // against a green grass tileset. L2 keeps dark-green but with
  // warm bark mid-tones. L3 stays near-black with red accents.
  // Dark outlines are always the "near-black" end so the snake
  // always has a hard silhouette against any background.
  const SCALE_LT = [C.BARK,   C.THORN,  C.MOSS  ][level - 1]; // back highlight
  const SCALE_MD = [C.DKBARK, C.DKGRN,  C.FOREST][level - 1]; // body fill
  const SCALE_DK = [C.DARK,   C.DARK,   C.DARK  ][level - 1]; // outline (always near-black)
  const BELLY_SCALE = [C.LTBARK, C.SAGE, C.MDGRN][level - 1];
  const EYE_COL = level === 1 ? C.SAGE : level === 2 ? C.EYE : C.GLOW;
  const TONGUE_COL = C.PINK;
  const DIAMOND_LT = level === 3 ? C.PINK : C.GLOW;
  const DIAMOND_DK = C.DARK;

  // Cell center
  const cx = 8;

  // ---- Path helper — returns the snake's centerline as (x,y)
  // points. `row` sets the primary axis (0=down, 1=right, 2=up,
  // 3=attack lunge). `col` sets the phase of the slither wave. ----
  function snakePath(row: number, col: number): Array<{ x: number; y: number; t: number }> {
    const pts: Array<{ x: number; y: number; t: number }> = [];
    const phase = col * (Math.PI / 2);
    if (row === 3) {
      // Attack pose: body coiled tightly then lunging forward.
      // Col 0 = fully coiled, col 1 = pre-lunge, col 2 = full strike,
      // col 3 = recoiling.
      const lunge = col === 0 ? 0 : col === 1 ? 0.3 : col === 2 ? 1 : 0.5;
      for (let i = 0; i < N_SEGS; i++) {
        const t = i / (N_SEGS - 1);
        // Tail coiled at lower-left, body curves up and to the right
        // toward the head. During lunge, the head-end extends forward.
        let x, y;
        if (t < 0.5) {
          // Coiled tail portion
          const ang = (t * 2) * Math.PI * 1.5;
          x = 6 + Math.cos(ang) * 2.5;
          y = 10 + Math.sin(ang) * 2.5;
        } else {
          // Head extending forward
          const s = (t - 0.5) * 2;
          x = 8 + s * (4 + lunge * 5);
          y = 9 - s * (1 + lunge * 2);
        }
        pts.push({ x, y, t });
      }
      return pts;
    }
    // Walk rows: snake slithers along the primary axis with a
    // sine wave perpendicular to travel direction.
    for (let i = 0; i < N_SEGS; i++) {
      const t = i / (N_SEGS - 1);
      const wave = Math.sin(t * Math.PI * 2.5 + phase) * AMP;
      let x, y;
      if (row === 1) {
        // Horizontal (walk-right): x along length, y is the wave
        x = 1 + t * 13;
        y = 8 + wave;
      } else if (row === 0) {
        // Walk-down: y along length (increasing), x is the wave
        x = 8 + wave;
        y = 2 + t * 12;
      } else {
        // Walk-up: y decreasing (head at top)
        x = 8 + wave;
        y = 14 - t * 12;
      }
      pts.push({ x, y, t });
    }
    return pts;
  }

  // ---- Draw a segment of the snake body at a given path point ----
  // `t` is 0 at tail, 1 at head. Thickness tapers from head to
  // tail. Diamond pattern alternates along the body.
  //
  // Cross-section is drawn perpendicular to the travel axis:
  //   row 1 (walk-right)       → vertical cross-section
  //   row 0/2 (walk-down/up)   → horizontal cross-section
  //   row 3 (attack)           → horizontal (default, coiled blob)
  //
  // Dark outline pixels are ALWAYS placed at both edges of the
  // cross-section so the snake silhouette reads against any
  // background.
  function drawBodySeg(p: (x: number, y: number, c: string) => void, b: (x: number, y: number, w: number, h: number, c: string) => void, px: number, py: number, t: number, row: number, segIdx: number) {
    const pxI = Math.round(px);
    const pyI = Math.round(py);
    // Taper — full thickness through the midsection, slimmer at tail
    const thick = t < 0.1 ? 1 : t < 0.25 ? Math.max(2, BODY_TH - 2) : t < 0.5 ? Math.max(2, BODY_TH - 1) : BODY_TH;
    const half = Math.floor(thick / 2);

    // Travel axis → cross-section axis. Row 1 (horizontal travel)
    // draws a vertical stripe; everything else draws horizontal.
    const vertical = row === 1;

    for (let o = -half; o < thick - half; o++) {
      const isEdge = o === -half || o === thick - half - 1;
      let col: string;
      if (isEdge) {
        col = SCALE_DK;
      } else if (o === -half + 1 && thick >= 4) {
        // Back highlight — one row in from the top/left edge
        col = SCALE_LT;
      } else if (o === thick - half - 2 && thick >= 4) {
        // Belly tone — one row in from the bottom/right edge
        col = BELLY_SCALE;
      } else {
        col = SCALE_MD;
      }
      if (vertical) p(pxI, pyI + o, col);
      else p(pxI + o, pyI, col);
    }

    // Diamond-back pattern — every 3rd segment, centred on the spine
    if (DIAMOND && segIdx % 3 === 1 && segIdx > 0 && t < 0.85 && thick >= 3) {
      if (vertical) {
        p(pxI, pyI, DIAMOND_DK);
        if (thick >= 4) p(pxI, pyI + 1, DIAMOND_LT);
      } else {
        p(pxI, pyI, DIAMOND_DK);
        if (thick >= 4) p(pxI + 1, pyI, DIAMOND_LT);
      }
    }
  }

  function drawTail(p: (x: number, y: number, c: string) => void, tx: number, ty: number) {
    // Simple tail tip — single dark pixel + rattle hint at L2+
    p(Math.round(tx), Math.round(ty), SCALE_DK);
    if (level >= 2) p(Math.round(tx), Math.round(ty) + 1, C.AMBER);
    if (level >= 3) p(Math.round(tx) - 1, Math.round(ty) + 1, C.DKBARK);
  }

  function drawHead(p: (x: number, y: number, c: string) => void, b: (x: number, y: number, w: number, h: number, c: string) => void, hx: number, hy: number, row: number, col: number) {
    const cxI = Math.round(hx);
    const cyI = Math.round(hy);

    // Triangular head oriented along travel direction. For
    // simplicity we draw a squarish 3×3 or 4×4 block and add a
    // tapered tip in the direction of travel.
    const size = HEAD_W;
    const halfSize = Math.floor(size / 2);

    // Main head block
    b(cxI - halfSize, cyI - halfSize, size, size, SCALE_MD);
    // Top highlight
    p(cxI - halfSize + 1, cyI - halfSize, SCALE_LT);
    p(cxI, cyI - halfSize, SCALE_LT);
    // Outline edges
    for (let i = 0; i < size; i++) {
      p(cxI - halfSize + i, cyI - halfSize, SCALE_DK);
      p(cxI - halfSize + i, cyI - halfSize + size - 1, SCALE_DK);
      p(cxI - halfSize, cyI - halfSize + i, SCALE_DK);
      p(cxI - halfSize + size - 1, cyI - halfSize + i, SCALE_DK);
    }

    // Direction-tapered tip (a triangular nose jutting forward)
    if (row === 1) {
      // Facing right — tip extends to the right
      p(cxI + halfSize, cyI, SCALE_MD);
      p(cxI + halfSize + 1, cyI, SCALE_DK);
    } else if (row === 0) {
      // Facing down — tip at bottom
      p(cxI, cyI + halfSize, SCALE_MD);
      p(cxI, cyI + halfSize + 1, SCALE_DK);
    } else if (row === 2) {
      // Facing up — tip at top
      p(cxI, cyI - halfSize - 1, SCALE_DK);
    } else {
      // Attack — tip extends forward (to the right)
      p(cxI + halfSize, cyI, SCALE_MD);
      p(cxI + halfSize + 1, cyI, SCALE_DK);
      if (col === 2) {
        // Lunging — open jaw
        b(cxI - 1, cyI + halfSize - 1, 3, 1, C.DARK);
      }
    }

    // Cobra hood (L3 only) — flared sides on the head
    if (HOOD) {
      p(cxI - halfSize - 1, cyI, SCALE_MD);
      p(cxI + halfSize, cyI, SCALE_MD);
      p(cxI - halfSize - 1, cyI + 1, SCALE_DK);
      p(cxI + halfSize, cyI + 1, SCALE_DK);
      p(cxI - halfSize - 1, cyI, C.AMBER);
      p(cxI + halfSize, cyI, C.AMBER);
    }

    // Eye — always visible (single eye since we're viewing from above/side)
    const eyeX = row === 2 ? cxI - 1 : cxI;
    const eyeY = cyI - Math.floor(halfSize / 2);
    p(eyeX, eyeY, C.DARK);
    p(eyeX, eyeY, EYE_COL);
    // Pupil
    if (SLIT_PUPIL) {
      // Vertical slit — classic viper
      p(eyeX, eyeY + 1, C.DARK);
    } else {
      p(eyeX, eyeY, C.DARK);
      p(eyeX, eyeY, EYE_COL); // redraw iris
    }
    // Highlight
    if (level >= 2) p(eyeX - 1, eyeY - 1, C.WHITE);

    // Tongue — flicks out in direction of travel. On attack, we
    // skip the regular tongue (jaw is open, venom sprays elsewhere).
    if (row !== 3) {
      const flick = col === 1 || col === 3; // flicks at specific frames
      const tLen = flick ? (level >= 2 ? 3 : 2) : 1;
      let tx = cxI, ty = cyI;
      if (row === 1) { tx = cxI + halfSize + 1; ty = cyI; }
      else if (row === 0) { ty = cyI + halfSize + 1; tx = cxI; }
      else if (row === 2) { ty = cyI - halfSize - 1; tx = cxI; }

      for (let i = 0; i < tLen; i++) {
        if (row === 1) p(tx + i, ty, TONGUE_COL);
        else if (row === 0) p(tx, ty + i, TONGUE_COL);
        else p(tx, ty - i, TONGUE_COL);
      }
      // Fork at the tip (L2+)
      if (FORKED_TONGUE && tLen >= 2) {
        if (row === 1) {
          p(tx + tLen, ty - 1, TONGUE_COL);
          p(tx + tLen, ty + 1, TONGUE_COL);
        } else if (row === 0) {
          p(tx - 1, ty + tLen, TONGUE_COL);
          p(tx + 1, ty + tLen, TONGUE_COL);
        } else {
          p(tx - 1, ty - tLen, TONGUE_COL);
          p(tx + 1, ty - tLen, TONGUE_COL);
        }
      }
    }

    // Fangs on attack frames (L2+, visible only during lunge peak)
    if (row === 3 && col === 2 && FORKED_TONGUE) {
      p(cxI - 1, cyI + halfSize, C.WHITE);
      p(cxI + 1, cyI + halfSize, C.WHITE);
      if (level >= 3) {
        p(cxI - 1, cyI + halfSize + 1, C.WHITE);
        p(cxI + 1, cyI + halfSize + 1, C.WHITE);
      }
    }

    // Venom drip on attack retract (col 3)
    if (row === 3 && col === 3 && level >= 2) {
      p(cxI, cyI + halfSize + 1, C.VENOM);
      if (level >= 3) p(cxI, cyI + halfSize + 2, C.TOXIC);
    }
  }

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);

    const path = snakePath(row, col);

    // Draw body segments from tail → head (so head overpaints)
    for (let i = 1; i < path.length - 1; i++) {
      drawBodySeg(p, b, path[i].x, path[i].y, path[i].t, row, i);
    }

    // Tail tip
    drawTail(p, path[0].x, path[0].y);

    // Head (always drawn last so it paints over body)
    const headPt = path[path.length - 1];
    drawHead(p, b, headPt.x, headPt.y, row, col);

    // Attack-specific venom splash (col 2 = full lunge)
    if (row === 3 && col === 2) {
      const hx = Math.round(headPt.x);
      const hy = Math.round(headPt.y);
      // A small splash of venom in the strike direction
      p(hx + 1, hy + 2, C.VENOM);
      p(hx + 2, hy + 1, C.VENOM);
      if (level >= 2) {
        p(hx + 2, hy + 3, C.TOXIC);
        p(hx + 3, hy, C.TOXIC);
      }
      if (level >= 3) {
        p(hx + 4, hy + 1, C.VENOM);
        p(hx + 3, hy + 2, C.TOXIC);
      }
    }

  }

  // Draw 4 rows × 4 cols
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      frame(ctx, [col * CELL, row * CELL], row, col);
    }
  }
}

// ===== UNIT DEFINITIONS =====
export const UNITS = [
  { name: 'Rifleman', file: 'rifleman_mobile.png', draw: drawRifleman, levels: 5 },
  { name: 'Brawler', file: 'brawler_mobile.png', draw: drawBrawler, levels: 5 },
  { name: 'Tank', file: 'heavy_mobile.png', draw: drawHeavy, levels: 3 },
  { name: 'Commander', file: 'commander_mobile.png', draw: drawCommander, levels: 3 },
  { name: 'Swarmling', file: 'swarmling_mobile.png', draw: drawSwarmling, levels: 2 },
  { name: 'Fiend', file: 'fiend_mobile.png', draw: drawFiend, levels: 2 },
  { name: 'Grove Viper', file: 'viper_mobile.png', draw: drawViper, levels: 3 },
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
