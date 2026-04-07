import { useRef, useEffect, useState } from "react";

// ===== PALETTES =====
const MIL = {
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
const ALN = {
  LIME:'#88ff44', DKLIME:'#55cc22', LTLIME:'#bbff88',
  CHITIN:'#445522', DKCHI:'#334411', LTCHI:'#667744',
  DARK:'#112200', EYE:'#ff4444', DKEYE:'#cc2222',
  MAND:'#99dd33',
};
const INF = {
  RED:'#ff4422', DKRED:'#cc2200', LTRED:'#ff7755',
  ORANGE:'#ff8844', DKORA:'#cc6622', LTORA:'#ffbb77',
  DARK:'#220000', HORN:'#884400', DKHORN:'#663300',
  GLOW:'#ffcc00', FLASH:'#ffffff', YELLOW:'#ffee44',
  SMOKE:'#444444', DKSMOKE:'#222222',
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
function drawRifleman(ctx: CanvasRenderingContext2D) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      // WALK frames — row0=down, row1=right, row2=up
      // col 0-3: walk cycle. 0,2=contact(leg fwd), 1,3=passing(legs together)
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;

      // Helmet
      if (row === 0) { // down
        b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.SAGE);
        p(cx - 2, 1 + bob, W.DKOLV); p(cx + 1, 1 + bob, W.DKOLV);
        // face
        b(cx - 1, 3 + bob, 3, 2, W.SKIN); p(cx - 1, 4 + bob, W.DKSKIN);
        p(cx, 3 + bob, W.DKSKIN); // eyes
      } else if (row === 1) { // right
        b(cx - 1, 1 + bob, 3, 3, W.OLIVE); b(cx, 1 + bob, 2, 2, W.SAGE);
        p(cx - 1, 1 + bob, W.DKOLV);
        b(cx, 3 + bob, 2, 2, W.SKIN); p(cx + 1, 3 + bob, W.DKSKIN);
      } else { // up
        b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.DKOLV);
        p(cx - 2, 2 + bob, W.DKOLV); p(cx + 1, 2 + bob, W.DKOLV);
        b(cx - 1, 3 + bob, 3, 2, W.DKSKIN);
      }

      // Torso
      b(cx - 2, 5 + bob, 4, 4, W.OLIVE); b(cx - 1, 5 + bob, 2, 3, W.SAGE);
      p(cx - 2, 8 + bob, W.BELT); p(cx + 1, 8 + bob, W.BELT);
      b(cx - 1, 8 + bob, 2, 1, W.BELT);

      // Rifle across chest (down/right) or on back (up)
      if (row === 0) {
        // rifle diagonal across chest
        p(cx - 3, 5 + bob, W.GUN); p(cx - 2, 6 + bob, W.DKGUN);
        p(cx + 2, 7 + bob, W.GUN); p(cx + 3, 8 + bob, W.DKGUN);
      } else if (row === 1) {
        p(cx + 2, 5 + bob, W.GUN); p(cx + 2, 6 + bob, W.DKGUN);
        p(cx + 2, 7 + bob, W.GUN); p(cx + 3, 5 + bob, W.LTGUN);
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
      // Boots
      b(cx - 2 + lOff, 13 + bob, 2, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 2, 1, W.BOOT);

    } else {
      // ATTACK row (row 3): col0=raise, col1=fire, col2=recoil, col3=lower
      const bob = col === 2 ? 1 : 0;

      // Helmet
      b(cx - 2, 1 + bob, 4, 3, W.OLIVE); b(cx - 1, 1 + bob, 2, 2, W.SAGE);
      p(cx - 2, 1 + bob, W.DKOLV); p(cx + 1, 1 + bob, W.DKOLV);
      b(cx - 1, 3 + bob, 3, 2, W.SKIN); p(cx, 3 + bob, W.DKSKIN);

      // Torso
      b(cx - 2, 5 + bob, 4, 4, W.OLIVE); b(cx - 1, 5 + bob, 2, 3, W.SAGE);
      b(cx - 1, 8 + bob, 2, 1, W.BELT);

      // Rifle position per frame
      if (col === 0) { // raise
        p(cx + 2, 3, W.GUN); p(cx + 2, 4, W.GUN); p(cx + 2, 5, W.DKGUN);
        p(cx + 3, 2, W.GUN); p(cx + 3, 1, W.LTGUN);
      } else if (col === 1) { // fire
        p(cx + 2, 3, W.GUN); p(cx + 3, 3, W.GUN); p(cx + 4, 3, W.DKGUN);
        p(cx + 5, 3, W.LTGUN);
        // muzzle flash
        p(cx + 6, 2, W.FLASH); p(cx + 6, 3, W.FLASH); p(cx + 6, 4, W.FLASH);
        p(cx + 7, 3, W.WHITE);
      } else if (col === 2) { // recoil
        p(cx + 1, 4 + bob, W.GUN); p(cx + 1, 5 + bob, W.GUN);
        p(cx + 2, 3 + bob, W.DKGUN); p(cx + 2, 4 + bob, W.GUN);
        p(cx + 3, 4 + bob, W.LTGUN);
      } else { // lower
        p(cx + 2, 5, W.GUN); p(cx + 2, 6, W.DKGUN); p(cx + 2, 7, W.GUN);
        p(cx + 3, 5, W.LTGUN);
      }

      // Arms
      p(cx - 3, 6 + bob, W.SAGE); p(cx + 2, 5 + bob, W.SAGE);

      // Legs (standing)
      b(cx - 2, 9 + bob, 2, 4, W.OLIVE); b(cx, 9 + bob, 2, 4, W.OLIVE);
      b(cx - 2, 13 + bob, 2, 1, W.BOOT); b(cx, 13 + bob, 2, 1, W.BOOT);
    }
  }

  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      frame(ctx, [col * CELL, row * CELL], row, col);
}

// ===== 2. BRAWLER =====
function drawBrawler(ctx: CanvasRenderingContext2D) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

    if (row < 3) {
      const lOff = col === 0 ? -1 : col === 1 ? 0 : col === 2 ? 1 : 0;
      const rOff = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const bob = (col === 0 || col === 2) ? 0 : -1;
      const lean = 1; // forward lean

      // Beret
      if (row === 0) {
        b(cx - 2, 1 + bob, 5, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        b(cx - 1, 2 + bob, 3, 2, W.SKIN); p(cx, 3 + bob, W.DKSKIN);
        p(cx - 1, 2 + bob, W.DKSKIN); p(cx + 1, 2 + bob, W.DKSKIN);
      } else if (row === 1) {
        b(cx - 1, 1 + bob, 4, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        b(cx, 2 + bob, 2, 2, W.SKIN); p(cx + 1, 3 + bob, W.DKSKIN);
      } else {
        b(cx - 2, 1 + bob, 5, 2, W.BERET); p(cx + 2, 1 + bob, W.DKBER);
        b(cx - 1, 2 + bob, 3, 2, W.DKSKIN);
      }

      // Muscular torso (wider)
      b(cx - 3, 4 + bob, 6, 5, W.OLIVE); b(cx - 2, 4 + bob, 4, 4, W.SAGE);
      p(cx - 3, 4 + bob, W.DKOLV); p(cx + 2, 4 + bob, W.DKOLV);
      b(cx - 2, 8 + bob, 4, 1, W.BELT);

      // Arms swinging (skin colored fists)
      const armSwF = col === 0 ? 1 : col === 1 ? 0 : col === 2 ? -1 : 0;
      const armSwB = -armSwF;
      p(cx - 4, 5 + bob + armSwF, W.SAGE); p(cx - 4, 6 + bob + armSwF, W.SKIN);
      p(cx + 3, 5 + bob + armSwB, W.SAGE); p(cx + 3, 6 + bob + armSwB, W.SKIN);

      // Legs (heavy steps)
      b(cx - 2 + lOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx + rOff, 9 + bob, 2, 4, W.OLIVE);
      b(cx - 2 + lOff, 13 + bob, 2, 1, W.BOOT);
      b(cx + rOff, 13 + bob, 2, 1, W.BOOT);

    } else {
      // ATTACK: col0=wind up, col1=strike, col2=follow through, col3=recover
      // Beret
      b(cx - 2, 1, 5, 2, W.BERET); p(cx + 2, 1, W.DKBER);
      b(cx - 1, 2, 3, 2, W.SKIN); p(cx, 3, W.DKSKIN);

      // Torso
      b(cx - 3, 4, 6, 5, W.OLIVE); b(cx - 2, 4, 4, 4, W.SAGE);
      b(cx - 2, 8, 4, 1, W.BELT);

      // Fist positions
      if (col === 0) { // wind up — fist pulled back
        p(cx - 4, 4, W.SAGE); p(cx - 5, 4, W.SKIN); p(cx - 5, 5, W.SKIN);
        p(cx + 3, 6, W.SAGE);
      } else if (col === 1) { // strike — fist forward
        p(cx + 3, 5, W.SAGE); p(cx + 4, 5, W.SKIN); p(cx + 5, 5, W.SKIN);
        p(cx + 6, 4, W.FLASH); p(cx + 6, 5, W.FLASH); p(cx + 6, 6, W.FLASH); // impact
        p(cx - 4, 6, W.SAGE);
      } else if (col === 2) { // follow through
        p(cx + 3, 6, W.SAGE); p(cx + 4, 6, W.SKIN); p(cx + 5, 7, W.SKIN);
        p(cx - 4, 5, W.SAGE);
      } else { // recover
        p(cx - 4, 5, W.SAGE); p(cx - 4, 6, W.SKIN);
        p(cx + 3, 5, W.SAGE); p(cx + 3, 6, W.SKIN);
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
function drawHeavy(ctx: CanvasRenderingContext2D) {
  const W = MIL;

  function frame(c: CanvasRenderingContext2D, o: number[], row: number, col: number) {
    const { p, b } = mk(c, o, GR, GR, PX);
    const cx = 8;

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

      // Heavy armor torso
      b(cx - 3, 4 + bob, 7, 5, W.DKARM); b(cx - 2, 4 + bob, 5, 4, W.OLIVE);
      b(cx - 1, 5 + bob, 3, 2, W.SAGE);
      b(cx - 2, 8 + bob, 5, 1, W.BELT);

      // Machine gun
      if (row === 0 || row === 2) {
        p(cx + 3, 4 + bob, W.GUN); p(cx + 4, 4 + bob, W.GUN);
        p(cx + 3, 5 + bob, W.DKGUN); p(cx + 4, 5 + bob, W.DKGUN);
      } else {
        p(cx + 3, 4 + bob, W.GUN); p(cx + 4, 4 + bob, W.GUN);
        p(cx + 5, 4 + bob, W.DKGUN);
        p(cx + 3, 5 + bob, W.DKGUN);
      }

      // Ammo belt sway
      const beltOff = (col === 1 || col === 3) ? 1 : 0;
      p(cx - 4, 5 + bob + beltOff, W.DKGOLD);
      p(cx - 4, 6 + bob + beltOff, W.GOLD);
      p(cx - 4, 7 + bob, W.DKGOLD);

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

      // Torso
      b(cx - 3, 4, 7, 5, W.DKARM); b(cx - 2, 4, 5, 4, W.OLIVE);
      b(cx - 1, 5, 3, 2, W.SAGE); b(cx - 2, 8, 5, 1, W.BELT);

      // Gun forward
      if (col === 0) { // brace
        b(cx + 3, 4, 3, 1, W.GUN); b(cx + 3, 5, 3, 1, W.DKGUN);
        p(cx - 4, 5, W.OLIVE);
      } else if (col === 1) { // fire burst
        b(cx + 3, 4, 3, 1, W.GUN); b(cx + 3, 5, 3, 1, W.DKGUN);
        // big muzzle flash
        p(cx + 6, 3, W.FLASH); p(cx + 7, 4, W.WHITE); p(cx + 6, 5, W.FLASH);
        p(cx + 7, 3, W.FLASH); p(cx + 7, 5, W.FLASH);
        // shell casing
        p(cx + 2, 2, W.DKGOLD); p(cx + 1, 1, W.GOLD);
        p(cx - 4, 5, W.OLIVE);
      } else if (col === 2) { // sustained
        b(cx + 3, 4, 3, 1, W.GUN); b(cx + 3, 5, 3, 1, W.DKGUN);
        p(cx + 6, 4, W.FLASH); p(cx + 7, 4, W.FLASH);
        p(cx + 6, 3, W.FLASH); p(cx + 6, 5, W.FLASH);
        p(cx + 3, 2, W.GOLD); p(cx + 2, 3, W.DKGOLD); // casing
        p(cx - 4, 5, W.OLIVE);
      } else { // cease
        b(cx + 3, 5, 3, 1, W.GUN); b(cx + 3, 6, 2, 1, W.DKGUN);
        p(cx - 4, 5, W.OLIVE);
        p(cx + 5, 4, W.GUN); // barrel cooling
      }

      // Ammo belt
      p(cx - 4, 5, W.DKGOLD); p(cx - 4, 6, W.GOLD); p(cx - 4, 7, W.DKGOLD);

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
function drawCommander(ctx: CanvasRenderingContext2D) {
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

      // Epaulettes + torso
      b(cx - 3, 4 + bob, 6, 5, W.OLIVE); b(cx - 2, 4 + bob, 4, 4, W.SAGE);
      p(cx - 3, 4 + bob, W.GOLD); p(cx + 2, 4 + bob, W.GOLD); // epaulettes
      b(cx - 2, 8 + bob, 4, 1, W.BELT);

      // Cape flowing behind
      const capeOff = col === 1 ? 1 : col === 3 ? -1 : 0;
      if (row === 0 || row === 1) {
        p(cx - 4, 5 + bob + capeOff, W.CAPE); p(cx - 4, 6 + bob, W.DKCAPE);
        p(cx - 4, 7 + bob - capeOff, W.CAPE);
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

      // Torso
      b(cx - 3, 4, 6, 5, W.OLIVE); b(cx - 2, 4, 4, 4, W.SAGE);
      p(cx - 3, 4, W.GOLD); p(cx + 2, 4, W.GOLD);
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
function drawSwarmling(ctx: CanvasRenderingContext2D) {
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

      // Head
      if (row === 0) {
        b(cx - 2, 4 + bob, 4, 2, A.CHITIN); b(cx - 1, 4 + bob, 2, 2, A.LTCHI);
        p(cx - 1, 4 + bob, A.EYE); p(cx + 1, 4 + bob, A.EYE);
        p(cx, 5 + bob, A.MAND);
      } else if (row === 1) {
        b(cx - 1, 4 + bob, 3, 2, A.CHITIN); b(cx, 4 + bob, 2, 2, A.LTCHI);
        p(cx + 1, 4 + bob, A.EYE);
      } else {
        b(cx - 2, 4 + bob, 4, 2, A.CHITIN); b(cx - 1, 4 + bob, 2, 2, A.DKCHI);
      }

      // Body (oval)
      b(cx - 3, 6 + bob, 6, 4, A.CHITIN); b(cx - 2, 6 + bob, 4, 3, A.LIME);
      b(cx - 1, 7 + bob, 2, 2, A.LTLIME);
      p(cx - 3, 6 + bob, A.DKCHI); p(cx + 2, 6 + bob, A.DKCHI);

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

      // Mandibles open/closed
      if (col === 1) { // bite — mandibles wide
        p(cx - 3, by - 1, A.MAND); p(cx + 2, by - 1, A.MAND);
        p(cx - 3, by, A.LIME); p(cx + 2, by, A.LIME);
      } else if (col === 0) { // lunge — opening
        p(cx - 2, by - 1, A.MAND); p(cx + 1, by - 1, A.MAND);
      } else {
        p(cx, by - 1, A.MAND);
      }

      // Body
      b(cx - 3, by, 6, 4, A.CHITIN); b(cx - 2, by, 4, 3, A.LIME);
      b(cx - 1, by + 1, 2, 2, A.LTLIME);

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
function drawFiend(ctx: CanvasRenderingContext2D) {
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

      // Horns
      if (row === 0) {
        p(cx - 2, 1 + bob, F.HORN); p(cx - 3, 0 + bob, F.DKHORN);
        p(cx + 1, 1 + bob, F.HORN); p(cx + 2, 0 + bob, F.DKHORN);
      } else if (row === 1) {
        p(cx, 1 + bob, F.HORN); p(cx + 1, 0 + bob, F.DKHORN);
        p(cx + 2, 1 + bob, F.HORN);
      } else {
        p(cx - 2, 1 + bob, F.DKHORN); p(cx - 3, 0 + bob, F.HORN);
        p(cx + 1, 1 + bob, F.DKHORN); p(cx + 2, 0 + bob, F.HORN);
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

      // Hunched torso
      b(cx - 2, 4 + bob, 5, 4, F.RED); b(cx - 1, 4 + bob, 3, 3, F.ORANGE);
      p(cx, 5 + bob, F.GLOW); // inner glow
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
        // Horns
        p(cx - 2, 4, F.HORN); p(cx - 3, 3, F.DKHORN);
        p(cx + 1, 4, F.HORN); p(cx + 2, 3, F.DKHORN);
        // Head crouched low
        b(cx - 2, 5, 4, 2, F.RED); b(cx - 1, 5, 2, 2, F.LTRED);
        p(cx - 1, 5, F.GLOW); p(cx + 1, 5, F.GLOW);
        // Body compact
        b(cx - 2, 7, 5, 3, F.RED); b(cx - 1, 7, 3, 2, F.ORANGE);
        p(cx, 8, F.GLOW);
        // Legs tucked
        b(cx - 2, 10, 2, 3, F.DKRED); b(cx + 1, 10, 2, 3, F.DKRED);
        b(cx - 2, 13, 2, 1, F.DARK); b(cx + 1, 13, 2, 1, F.DARK);

      } else if (col === 1) { // swell — body glowing bright
        // Horns
        p(cx - 2, 3, F.HORN); p(cx - 3, 2, F.DKHORN);
        p(cx + 1, 3, F.HORN); p(cx + 2, 2, F.DKHORN);
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

// ===== UNIT DEFINITIONS =====
const UNITS = [
  { name: 'Rifleman', file: 'rifleman_mobile.png', draw: drawRifleman },
  { name: 'Brawler', file: 'brawler_mobile.png', draw: drawBrawler },
  { name: 'Heavy Gunner', file: 'heavy_mobile.png', draw: drawHeavy },
  { name: 'Commander', file: 'commander_mobile.png', draw: drawCommander },
  { name: 'Swarmling', file: 'swarmling_mobile.png', draw: drawSwarmling },
  { name: 'Fiend', file: 'fiend_mobile.png', draw: drawFiend },
];

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
      canvas.width = 4 * CELL;  // 128
      canvas.height = 4 * CELL; // 128
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      unit.draw(ctx);
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
        Mobile Unit Spritesheets (128x128, 32x32 cells)
      </h2>
      <p style={{ color: '#666', fontSize: 11, margin: '0 0 16px 0' }}>
        4 cols x 4 rows per sheet. Row 0: Walk Down, Row 1: Walk Right (flip for Left), Row 2: Walk Up, Row 3: Attack.
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
                style={{ imageRendering: 'pixelated', width: 256, height: 256, display: 'block', background: '#000' }}
              />
              {/* Row labels overlay */}
              <div style={{ position: 'absolute', top: 0, left: -60, width: 56, height: 256 }}>
                {ROW_LABELS.map((lbl, r) => (
                  <div key={r} style={{
                    position: 'absolute', top: r * 64 + 22, left: 0, color: '#666',
                    fontSize: 8, width: 56, textAlign: 'right'
                  }}>{lbl}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {COL_LABELS.map((lbl, ci) => (
                <span key={ci} style={{ color: '#555', fontSize: 8, width: 64, textAlign: 'center' }}>{lbl}</span>
              ))}
            </div>
            <div style={{ color: '#555', fontSize: 9, marginTop: 4 }}>
              {unit.file} — 128x128px
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
