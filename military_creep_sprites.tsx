import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C = {
  BODY: '#556b2f',    // olive body
  GEAR: '#4a5a28',    // darker gear
  DARK: '#2a3518',    // darkest shadow
  SKIN: '#c8a882',    // skin tone
  DKSKIN: '#a08060',  // dark skin
  HELM: '#3a4a20',    // helmet
  METAL: '#888888',   // metal/gun
  DKMETAL: '#666666',  // dark metal
  LTMETAL: '#aaaaaa', // light metal
  RED: '#cc3333',     // red accent
  DKRED: '#992222',   // dark red
  LTOLIVE: '#7a8a4a', // light olive highlight
  DKOLIVE: '#3a4a1a', // dark olive
  KHAKI: '#8a7a50',   // khaki
  LTKHAKI: '#b0a070', // light khaki
  SAND: '#c2b280',    // sand
  BROWN: '#5c4033',   // brown
  DKBRN: '#3a2820',   // dark brown
  BLACK: '#111111',
  DGRAY: '#333333',
  MGRAY: '#555555',
  WHITE: '#eeeeee',
  BLUE: '#4488ff',
  LTBLUE: '#88bbff',
  GREEN: '#44cc44',
  LTGREEN: '#88ee88',
  ORANGE: '#ff8844',
  SMOKE: '#888899',
  LTSMOKE: '#aaaabb',
  SHIELD: '#aaccdd',
  DKSHIELD: '#7799aa',
  FLAME: '#ff6622',
  LTFLAME: '#ffaa44',
  // Boss accent colors
  POWERCORE: '#4488ff', // blue power core
  DKCORE: '#2255cc',    // dark power core
  TARGET: '#ff2222',    // red targeting laser
};

// ===== DRAWING HELPERS =====
const mk = (c: any, o: number[], gw: number, gh: number, ps: number) => {
  const p = (x: number, y: number, cl: string) => {
    if (!cl || x < 0 || x >= gw || y < 0 || y >= gh) return;
    c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, ps, ps);
  };
  const b = (x: number, y: number, w: number, h: number, cl: string) => {
    if (!cl) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, w * ps, h * ps);
  };
  return { p, b };
};

// ===== SHEET LAYOUT =====
const PX = 2, GRID = 32, CELL = GRID * PX; // 64x64 pixel frames
const COLS = 16; // 16 creep types
const ROWS = 7;  // walk0-3, death0-2
const NAMES = [
  'Infantry', 'Scout', 'Heavy', 'Recruit', 'Medic', 'Tank Cmdr',
  'Fire Team', 'Cargo', 'Riot', 'Recon', 'Engineer', 'Paratrooper',
  'Armor Off', 'Signals', 'Smoke Op', 'Surgeon'
];
const ROW_LABELS = ['walk0', 'walk1', 'walk2', 'walk3', 'death0', 'death1', 'death2'];

// ===== CREEP DRAWING FUNCTIONS =====
// Each function: (ctx, origin, frame) where frame=0-6
// Grid is now 32x32 (was 16x16), giving much more detail space

// 0: Infantry — Soldier with helmet, rifle, backpack
function drawInfantry(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) { // death
    if (frame === 4) {
      // stumbling backward
      b(13, 8, 6, 4, C.HELM); p(14, 9, C.DARK); p(18, 8, C.DARK);
      b(14, 12, 4, 2, C.SKIN); p(15, 12, C.DKSKIN); p(17, 13, C.DKSKIN);
      b(11, 14, 10, 6, C.BODY); p(12, 14, C.LTOLIVE); p(13, 15, C.LTOLIVE);
      p(20, 19, C.DARK); p(20, 18, C.DARK);
      // rifle flying off
      b(21, 13, 4, 2, C.METAL); p(25, 13, C.DKMETAL); p(22, 15, C.BROWN);
      // backpack
      b(9, 15, 3, 4, C.GEAR); p(9, 14, C.DARK);
      // belt
      b(11, 20, 10, 1, C.KHAKI);
      // legs stumbling
      b(12, 21, 3, 3, C.BROWN); b(17, 21, 3, 3, C.BROWN);
      p(10, 24, C.DARK); p(11, 24, C.DARK); p(20, 24, C.DARK); p(21, 24, C.DARK);
    } else if (frame === 5) {
      // falling horizontal
      b(7, 18, 8, 4, C.BODY); p(7, 18, C.LTOLIVE); p(8, 19, C.LTOLIVE);
      b(5, 18, 3, 3, C.HELM); p(5, 21, C.SKIN); p(6, 21, C.DKSKIN);
      b(15, 18, 4, 3, C.GEAR);
      b(19, 19, 4, 2, C.BROWN); b(23, 19, 2, 2, C.DARK);
      b(25, 17, 4, 2, C.METAL); p(29, 17, C.DKMETAL); // rifle flying
      p(10, 22, C.DARK); p(11, 22, C.DARK);
      b(7, 22, 8, 1, C.KHAKI);
    } else {
      // helmet + scattered gear on ground
      b(9, 24, 4, 3, C.HELM); p(10, 25, C.DARK);
      b(17, 23, 3, 2, C.METAL); p(20, 24, C.DKMETAL);
      b(7, 26, 3, 2, C.GEAR); p(22, 27, C.BROWN); p(23, 27, C.BROWN);
      p(14, 27, C.DARK); p(15, 27, C.DARK); p(16, 27, C.DARK);
    }
    return;
  }
  // Walk frames 0-3
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const armOff = [0, -1, 0, 1][step];
  const bobY = [0, 0, 0, 0][step];

  // Helmet (3-4px tall, rounded)
  b(13, 5 + bobY, 7, 4, C.HELM); p(12, 7 + bobY, C.HELM); p(20, 7 + bobY, C.HELM);
  p(14, 5 + bobY, C.LTOLIVE); p(15, 5 + bobY, C.LTOLIVE); // helmet highlight
  p(19, 6 + bobY, C.DARK); p(19, 7 + bobY, C.DARK); // helmet shadow
  p(13, 8 + bobY, C.DARK); // helmet rim shadow
  // Face under helmet
  b(14, 9 + bobY, 4, 3, C.SKIN); p(17, 9 + bobY, C.DKSKIN); p(17, 10 + bobY, C.DKSKIN);
  p(14, 10 + bobY, C.DKSKIN); // eye area
  p(15, 11 + bobY, C.DKSKIN); // mouth
  // Body
  b(12, 12 + bobY, 8, 7, C.BODY);
  p(12, 12 + bobY, C.LTOLIVE); p(13, 13 + bobY, C.LTOLIVE); // highlight
  p(19, 17 + bobY, C.DARK); p(19, 18 + bobY, C.DARK); // shadow
  // Chest detail / pockets
  b(14, 14 + bobY, 3, 2, C.GEAR); p(14, 14 + bobY, C.LTOLIVE);
  // Backpack (tall, detailed)
  b(9, 13 + bobY, 3, 6, C.GEAR); p(9, 12 + bobY, C.DARK); p(10, 12 + bobY, C.DARK);
  p(10, 14 + bobY, C.DKOLIVE); p(10, 16 + bobY, C.DKOLIVE); // backpack straps
  p(9, 18 + bobY, C.DARK); // backpack bottom shadow
  // Belt
  b(12, 19 + bobY, 8, 1, C.KHAKI); p(15, 19 + bobY, C.METAL); // buckle
  // Rifle (held forward, 2px wide barrel)
  b(20, 12 + bobY + armOff, 2, 2, C.BROWN); // stock
  b(22, 12 + bobY + armOff, 2, 1, C.METAL); // receiver
  b(24, 12 + bobY + armOff, 3, 1, C.METAL); // barrel
  p(27, 12 + bobY + armOff, C.DKMETAL); // muzzle
  p(22, 13 + bobY + armOff, C.DKMETAL); // trigger guard
  p(20, 14 + bobY + armOff, C.BODY); // front arm gripping
  // Arms
  p(11, 14 + bobY + armOff, C.BODY); p(11, 15 + bobY + armOff, C.BODY); // rear arm
  p(20, 15 + bobY, C.BODY); p(20, 14 + bobY, C.BODY); // front arm near rifle
  // Legs with clear alternation
  b(13, 20 + bobY, 3, 4, C.BROWN); b(17, 20 + bobY, 3, 4, C.BROWN);
  p(13 - (legOff > 0 ? 2 : 0), 22 + bobY, C.BROWN); p(14 - (legOff > 0 ? 2 : 0), 22 + bobY, C.BROWN);
  p(17 + (legOff > 0 ? 2 : 0), 22 + bobY, C.BROWN); p(18 + (legOff > 0 ? 2 : 0), 22 + bobY, C.BROWN);
  // Boots
  b(13 - (legOff > 0 ? 2 : 0), 24 + bobY, 3, 2, C.DARK);
  b(17 + (legOff > 0 ? 2 : 0), 24 + bobY, 3, 2, C.DARK);
}

// 1: Scout — Lean sprinting soldier with visible stride
function drawScout(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(14, 10, 5, 3, C.HELM); p(15, 11, C.DARK);
      b(15, 13, 3, 2, C.SKIN); p(16, 13, C.DKSKIN);
      b(12, 15, 8, 5, C.BODY); p(12, 15, C.LTOLIVE);
      b(14, 20, 3, 2, C.BROWN); b(18, 20, 3, 2, C.BROWN);
      p(12, 22, C.DARK); p(13, 22, C.DARK); p(21, 22, C.DARK);
    } else if (frame === 5) {
      b(8, 20, 5, 3, C.HELM); p(9, 21, C.DARK);
      p(10, 23, C.SKIN); p(11, 23, C.DKSKIN);
      b(11, 20, 8, 3, C.BODY);
      b(19, 21, 4, 2, C.BROWN); p(23, 22, C.DARK); p(24, 22, C.DARK);
      p(7, 23, C.DARK);
    } else {
      b(10, 25, 4, 3, C.HELM); p(11, 26, C.DARK);
      p(17, 27, C.DARK); p(18, 27, C.DARK);
      b(22, 25, 3, 2, C.BROWN);
      p(6, 27, C.GEAR); p(7, 27, C.GEAR);
    }
    return;
  }
  const step = frame;
  const stride = [-2, 0, 2, 0][step];
  const lean = 2; // always leaning forward
  // Head (leaning forward)
  b(16 + lean, 6, 5, 3, C.HELM); p(17 + lean, 6, C.LTOLIVE);
  p(20 + lean, 7, C.DARK);
  b(16 + lean, 9, 4, 2, C.SKIN); p(19 + lean, 9, C.DKSKIN);
  p(17 + lean, 10, C.DKSKIN);
  // Lean body
  b(13, 11, 7, 6, C.BODY); p(13, 11, C.LTOLIVE); p(14, 12, C.LTOLIVE);
  p(19, 16, C.DARK);
  // Light gear (no heavy backpack)
  p(12, 13, C.GEAR); p(12, 14, C.GEAR);
  // Belt
  b(13, 17, 7, 1, C.KHAKI);
  // Arms pumping wide
  b(11, 13 + (stride > 0 ? -2 : 0), 2, 3, C.BODY); p(11, 12 + (stride > 0 ? -2 : 0), C.SKIN);
  b(20, 13 + (stride < 0 ? -2 : 0), 2, 3, C.BODY); p(21, 12 + (stride < 0 ? -2 : 0), C.SKIN);
  // Legs — extended stride, clear alternation
  const lf = 16 + stride, lr = 14 - stride;
  b(lf, 18, 3, 4, C.BROWN); b(lr, 18, 3, 4, C.BROWN);
  b(lf + (stride > 0 ? 2 : 0), 22, 3, 2, C.DARK);
  b(lr - (stride < 0 ? 2 : 0), 22, 3, 2, C.DARK);
}

// 2: Heavy Trooper — Wide power armor with layered plates
function drawHeavy(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      // tilting back
      b(9, 6, 12, 4, C.METAL); p(9, 6, C.LTMETAL); p(10, 7, C.LTMETAL);
      b(12, 4, 5, 3, C.HELM); p(13, 4, C.DARK);
      b(7, 10, 16, 7, C.BODY); p(7, 10, C.LTOLIVE);
      b(10, 12, 8, 4, C.METAL); p(10, 12, C.LTMETAL);
      b(11, 17, 4, 3, C.BROWN); b(17, 17, 4, 3, C.BROWN);
      p(9, 20, C.DARK); p(10, 20, C.DARK); p(21, 20, C.DARK); p(22, 20, C.DARK);
    } else if (frame === 5) {
      b(5, 17, 18, 5, C.BODY); p(5, 17, C.LTOLIVE);
      b(8, 17, 12, 4, C.METAL); p(8, 17, C.LTMETAL);
      b(3, 18, 3, 3, C.METAL); b(22, 18, 3, 3, C.METAL);
      p(3, 19, C.HELM); p(4, 19, C.HELM); p(25, 19, C.DKMETAL);
      b(10, 22, 3, 2, C.BROWN); b(16, 22, 3, 2, C.DARK);
      p(6, 23, C.DKMETAL);
    } else {
      b(8, 24, 4, 3, C.HELM); p(9, 25, C.DARK);
      b(13, 24, 3, 2, C.METAL); p(16, 25, C.DKMETAL);
      p(19, 25, C.BODY); p(20, 25, C.BODY);
      b(23, 26, 3, 2, C.DKMETAL); p(6, 27, C.BROWN); p(7, 27, C.BROWN);
      p(15, 27, C.DARK);
    }
    return;
  }
  const step = frame;
  const stomp = [0, 1, 0, 1][step];
  // Helmet (small on big body)
  b(13, 3 + stomp, 6, 4, C.HELM); p(18, 3 + stomp, C.DARK); p(18, 4 + stomp, C.DARK);
  p(14, 3 + stomp, C.LTOLIVE); // highlight
  b(14, 7 + stomp, 4, 2, C.SKIN); p(17, 7 + stomp, C.DKSKIN);
  // Massive shoulder pads (6-8px wide each)
  b(4, 7 + stomp, 8, 4, C.METAL); p(4, 7 + stomp, C.LTMETAL); p(5, 8 + stomp, C.LTMETAL);
  p(11, 10 + stomp, C.DKMETAL); // shadow
  b(19, 7 + stomp, 8, 4, C.METAL); p(26, 7 + stomp, C.DKMETAL); p(26, 8 + stomp, C.DKMETAL);
  p(19, 8 + stomp, C.LTMETAL);
  // Layered plate detail on shoulders
  p(6, 9 + stomp, C.DKMETAL); p(7, 10 + stomp, C.DKMETAL);
  p(22, 9 + stomp, C.LTMETAL); p(23, 10 + stomp, C.LTMETAL);
  // Wide torso
  b(7, 11 + stomp, 18, 8, C.BODY); p(7, 11 + stomp, C.LTOLIVE); p(8, 12 + stomp, C.LTOLIVE);
  p(24, 18 + stomp, C.DARK); p(24, 17 + stomp, C.DARK);
  // Chest plate (layered)
  b(11, 13 + stomp, 10, 4, C.METAL); p(11, 13 + stomp, C.LTMETAL); p(12, 14 + stomp, C.LTMETAL);
  p(20, 16 + stomp, C.DKMETAL);
  p(15, 15 + stomp, C.BLUE); p(16, 15 + stomp, C.BLUE); // power core
  p(15, 16 + stomp, C.LTBLUE);
  // Arms (thick)
  b(5, 12 + stomp, 3, 4, C.BODY); b(24, 12 + stomp, 3, 4, C.BODY);
  // Heavy legs
  const legSpread = step % 2 === 0 ? 0 : 1;
  b(10 - legSpread, 19 + stomp, 5, 5, C.BROWN); b(17 + legSpread, 19 + stomp, 5, 5, C.BROWN);
  b(10 - legSpread, 24 + stomp, 5, 2, C.DARK); b(17 + legSpread, 24 + stomp, 5, 2, C.DARK);
  // Heavy weapon on right shoulder
  b(25, 10 + stomp, 4, 2, C.METAL); p(29, 10 + stomp, C.DKMETAL);
  b(27, 12 + stomp, 2, 3, C.DKMETAL);
}

// 3: Recruit — Tiny figure, minimal gear
function drawRecruit(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(14, 17, 4, 3, C.HELM); p(15, 18, C.DARK);
      b(15, 20, 3, 2, C.SKIN);
      b(14, 22, 5, 3, C.BODY); p(14, 22, C.LTOLIVE);
      p(15, 25, C.BROWN); p(17, 25, C.BROWN);
      p(15, 26, C.DARK); p(18, 26, C.DARK);
    } else if (frame === 5) {
      b(11, 22, 4, 3, C.HELM); p(12, 23, C.DARK);
      b(15, 22, 5, 2, C.BODY);
      p(20, 24, C.DARK); p(21, 24, C.DARK);
    } else {
      b(13, 25, 4, 3, C.HELM); p(14, 26, C.DARK);
      p(19, 27, C.DARK); p(20, 27, C.DARK);
    }
    return;
  }
  const step = frame;
  const shuffle = [0, 1, 0, -1][step];
  // Helmet (small)
  b(14, 14, 4, 3, C.HELM); p(15, 14, C.LTOLIVE); p(17, 15, C.DARK);
  // Face
  b(15, 17, 3, 2, C.SKIN); p(16, 17, C.DKSKIN);
  // Tiny body
  b(14, 19, 5, 4, C.BODY); p(14, 19, C.LTOLIVE);
  p(13, 20, C.GEAR); p(13, 21, C.GEAR); // small pack
  // Belt
  b(14, 23, 5, 1, C.KHAKI);
  // Legs (quick shuffle)
  b(14 + shuffle, 24, 2, 2, C.BROWN);
  b(17 - shuffle, 24, 2, 2, C.BROWN);
  p(14 + shuffle, 26, C.DARK); p(15 + shuffle, 26, C.DARK);
  p(17 - shuffle, 26, C.DARK); p(18 - shuffle, 26, C.DARK);
}

// 4: Medic — Red cross, medical gear
function drawMedic(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 8, 6, 4, C.HELM); p(14, 9, C.DARK);
      p(16, 8, C.RED); // cross on helmet
      b(14, 12, 4, 2, C.SKIN);
      b(11, 14, 10, 6, C.BODY);
      // falling red cross
      b(9, 15, 2, 4, C.WHITE); p(8, 16, C.RED); p(9, 16, C.RED); p(10, 16, C.RED);
      p(9, 15, C.RED); p(9, 18, C.RED);
      b(13, 20, 3, 3, C.BROWN); b(17, 20, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 5, 3, C.HELM);
      b(10, 20, 10, 3, C.BODY);
      p(6, 22, C.SKIN); p(7, 22, C.DKSKIN);
      b(20, 21, 3, 3, C.WHITE); p(21, 21, C.RED); p(21, 23, C.RED);
      p(20, 22, C.RED); p(22, 22, C.RED);
      p(12, 23, C.DARK); p(13, 23, C.DARK);
    } else {
      b(10, 25, 4, 3, C.HELM); p(11, 26, C.DARK);
      b(17, 25, 2, 2, C.RED); p(19, 26, C.WHITE);
      p(7, 27, C.DARK); p(8, 27, C.DARK);
      p(23, 25, C.BROWN);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const armOff = [0, -1, 0, 1][step];
  // Helmet with cross
  b(13, 5, 7, 4, C.HELM); p(12, 7, C.HELM);
  p(14, 5, C.LTOLIVE); // highlight
  p(16, 5, C.RED); p(17, 5, C.RED); // red cross on helmet top
  p(19, 6, C.DARK);
  // Face
  b(14, 9, 4, 3, C.SKIN); p(17, 9, C.DKSKIN); p(15, 11, C.DKSKIN);
  // Body
  b(12, 12, 8, 7, C.BODY); p(12, 12, C.LTOLIVE); p(13, 13, C.LTOLIVE);
  // Red cross armband (clear 2-3px cross)
  b(20, 13, 3, 5, C.WHITE);
  p(21, 13, C.RED); p(20, 15, C.RED); p(21, 15, C.RED); p(22, 15, C.RED);
  p(21, 17, C.RED); p(21, 14, C.RED); p(21, 16, C.RED);
  // Medkit backpack (white with red cross)
  b(9, 13, 3, 5, C.WHITE);
  p(10, 14, C.RED); p(9, 15, C.RED); p(10, 15, C.RED); p(11, 15, C.RED);
  p(10, 16, C.RED);
  p(9, 12, C.DKRED); p(10, 12, C.DKRED); p(11, 12, C.DKRED);
  // Belt
  b(12, 19, 8, 1, C.KHAKI); p(16, 19, C.METAL);
  // Legs
  b(13, 20 + Math.abs(legOff), 3, 3, C.BROWN); b(17, 20, 3, 3, C.BROWN);
  b(13, 23, 3, 2, C.DARK); b(17, 23 + Math.abs(legOff), 3, 2, C.DARK);
  // Arms
  p(11, 14 + armOff, C.BODY); p(11, 15 + armOff, C.BODY);
}

// 5: Tank Commander — Massive powered exosuit, command antenna with blinking light, dual shoulder-mounted weapons, chest power core (blue glow), heavy treaded feet, targeting laser, red targeting, blue power core
function drawTankCommander(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(7, 4, 14, 5, C.METAL); p(7, 4, C.LTMETAL); p(8, 5, C.LTMETAL);
      p(14, 1, C.DKMETAL); p(14, 2, C.METAL); p(14, 3, C.METAL);
      b(4, 9, 22, 8, C.BODY); p(4, 9, C.LTOLIVE); p(5, 10, C.LTOLIVE);
      b(9, 11, 10, 4, C.METAL); p(9, 11, C.LTMETAL);
      b(8, 17, 5, 4, C.BROWN); b(17, 17, 5, 4, C.BROWN);
      p(6, 21, C.DARK); p(7, 21, C.DARK); p(22, 21, C.DARK); p(23, 21, C.DARK);
    } else if (frame === 5) {
      b(3, 15, 22, 6, C.BODY); p(3, 15, C.LTOLIVE);
      b(8, 15, 14, 4, C.METAL); p(8, 15, C.LTMETAL);
      p(2, 17, C.HELM); p(3, 17, C.HELM); p(4, 17, C.HELM);
      b(25, 16, 3, 3, C.DKMETAL);
      b(10, 21, 4, 2, C.BROWN); b(17, 21, 4, 2, C.DARK);
      p(6, 23, C.DKMETAL); p(7, 23, C.DKMETAL);
    } else {
      b(6, 24, 5, 3, C.HELM); p(7, 25, C.DARK);
      b(12, 24, 4, 2, C.METAL); p(16, 25, C.DKMETAL);
      p(19, 25, C.BODY); p(20, 25, C.BODY); p(21, 25, C.BODY);
      p(24, 26, C.DARK); p(25, 26, C.DARK);
      b(8, 27, 3, 2, C.BROWN); p(27, 25, C.METAL); p(28, 25, C.METAL);
    }
    return;
  }
  const step = frame;
  const mech = [0, 1, 0, 1][step];
  const blinkLight = step % 2 === 0;

  // === COMMAND ANTENNA (tall, with blinking light) ===
  b(14, 0 + mech, 1, 3, C.METAL); p(14, 0 + mech, C.LTMETAL);
  p(15, 0 + mech, blinkLight ? C.TARGET : C.DKCORE); // blinking red/blue
  p(13, 0 + mech, blinkLight ? C.LTBLUE : C.DKMETAL);
  // Secondary antenna
  b(18, 1 + mech, 1, 2, C.DKMETAL); p(19, 1 + mech, blinkLight ? C.LTBLUE : C.DKMETAL);

  // === ARMORED HEAD (wide visor slit, menacing) ===
  b(8, 3 + mech, 14, 5, C.METAL); p(8, 3 + mech, C.LTMETAL); p(9, 4 + mech, C.LTMETAL);
  p(21, 5 + mech, C.DKMETAL); p(21, 6 + mech, C.DKMETAL); p(21, 7 + mech, C.DKMETAL);
  b(10, 3 + mech, 10, 1, C.LTMETAL);
  // Visor slit (wide, face barely visible)
  b(10, 6 + mech, 10, 2, C.DARK);
  b(11, 6 + mech, 8, 1, C.SKIN); p(12, 6 + mech, C.DKSKIN);
  // Visor glow
  p(10, 6 + mech, C.POWERCORE); p(19, 6 + mech, C.POWERCORE);
  // Head armor detail
  p(10, 4 + mech, C.DKMETAL); p(19, 4 + mech, C.DKMETAL);

  // === DUAL SHOULDER-MOUNTED WEAPONS (massive, multi-barrel) ===
  // Left shoulder weapon pod
  b(0, 7 + mech, 7, 5, C.METAL); b(0, 7 + mech, 2, 5, C.LTMETAL); p(0, 7 + mech, C.LTMETAL);
  b(6, 8 + mech, 1, 3, C.DKMETAL);
  // Barrels (dual)
  b(0, 8 + mech, 2, 1, C.DKMETAL); b(0, 10 + mech, 2, 1, C.DKMETAL);
  p(0, 8 + mech, C.BLACK); p(0, 10 + mech, C.BLACK);
  // Weapon detail
  p(3, 7 + mech, C.DKMETAL); p(4, 7 + mech, C.LTMETAL);
  p(2, 11 + mech, C.DKMETAL);

  // Right shoulder weapon pod
  b(23, 7 + mech, 7, 5, C.METAL); b(28, 7 + mech, 2, 5, C.DKMETAL);
  b(29, 8 + mech, 1, 3, C.DARK);
  // Barrels
  b(29, 8 + mech, 2, 1, C.DKMETAL); b(29, 10 + mech, 2, 1, C.DKMETAL);
  p(30, 8 + mech, C.BLACK); p(30, 10 + mech, C.BLACK);
  p(27, 7 + mech, C.LTMETAL); p(28, 11 + mech, C.DARK);

  // === TARGETING LASER (from right weapon, red line) ===
  p(31, 9 + mech, C.TARGET); p(31, 8 + mech, C.TARGET);

  // === MASSIVE TORSO ===
  b(4, 11 + mech, 22, 8, C.BODY); p(4, 11 + mech, C.LTOLIVE); p(5, 12 + mech, C.LTOLIVE);
  p(25, 18 + mech, C.DARK); p(25, 17 + mech, C.DARK);
  b(4, 11 + mech, 2, 8, C.LTOLIVE);
  b(24, 11 + mech, 2, 8, C.DARK);

  // === CHEST ARMOR PLATE (layered, power core visible) ===
  b(8, 13 + mech, 14, 5, C.METAL); b(8, 13 + mech, 14, 1, C.LTMETAL);
  b(8, 13 + mech, 2, 5, C.LTMETAL); p(9, 14 + mech, C.LTMETAL);
  b(20, 15 + mech, 2, 3, C.DKMETAL);
  // Power core (blue glow, prominent)
  b(13, 15 + mech, 4, 3, C.POWERCORE); b(14, 16 + mech, 2, 1, C.LTBLUE);
  p(14, 15 + mech, C.WHITE); p(15, 15 + mech, C.WHITE);
  p(13, 17 + mech, C.DKCORE); p(16, 17 + mech, C.DKCORE);
  // Power core glow ring
  p(12, 16 + mech, C.DKCORE); p(17, 16 + mech, C.DKCORE);

  // === SIDE REACTIVE ARMOR PLATES ===
  b(2, 13 + mech, 3, 5, C.GEAR); b(2, 13 + mech, 1, 5, C.METAL);
  p(2, 13 + mech, C.LTMETAL);
  b(25, 13 + mech, 3, 5, C.GEAR); p(27, 13 + mech, C.METAL);
  // Armor rivets
  p(3, 14 + mech, C.DGRAY); p(3, 16 + mech, C.DGRAY);
  p(26, 14 + mech, C.DGRAY); p(26, 16 + mech, C.DGRAY);

  // Command insignia (star/rank)
  p(14, 14 + mech, C.ORANGE); p(15, 14 + mech, C.ORANGE); p(16, 14 + mech, C.ORANGE);
  p(15, 13 + mech, C.ORANGE);

  // === HEAVY LEGS (thick, armored, treaded feet) ===
  b(6, 19 + mech, 8, 5, C.BROWN); b(6, 19 + mech, 2, 5, C.LTKHAKI);
  b(13, 19 + mech, 1, 5, C.DARK);
  b(16, 19 + mech, 8, 5, C.BROWN); b(23, 19 + mech, 1, 5, C.DARK);
  b(16, 19 + mech, 2, 5, C.KHAKI);
  // Knee joint armor
  p(8, 21 + mech, C.METAL); p(9, 21 + mech, C.DKMETAL);
  p(20, 21 + mech, C.METAL); p(21, 21 + mech, C.DKMETAL);

  const legS = step % 2;
  // Heavy treaded feet (wide, gripping)
  b(4 - legS * 2, 24 + mech, 10, 3, C.DARK); b(5 - legS * 2, 24 + mech, 8, 2, C.DKMETAL);
  p(4 - legS * 2, 26 + mech, C.BLACK);
  b(15 + legS * 2, 24 + mech, 10, 3, C.DARK); b(16 + legS * 2, 24 + mech, 8, 2, C.DKMETAL);
  p(24 + legS * 2, 26 + mech, C.BLACK);
  // Tread detail
  p(6 - legS * 2, 25 + mech, C.MGRAY); p(10 - legS * 2, 25 + mech, C.MGRAY);
  p(17 + legS * 2, 25 + mech, C.MGRAY); p(21 + legS * 2, 25 + mech, C.MGRAY);

  // === GROUND IMPACT DUST ===
  p(5 - legS * 2, 27 + mech, C.SMOKE); p(22 + legS * 2, 27 + mech, C.SMOKE);
}

// 6: Fire Team — Smaller infantry
function drawFireTeam(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(14, 11, 5, 3, C.HELM); p(15, 12, C.DARK);
      b(15, 14, 3, 2, C.SKIN);
      b(13, 16, 7, 5, C.BODY); p(13, 16, C.LTOLIVE);
      b(14, 21, 3, 2, C.BROWN); b(18, 21, 2, 2, C.DARK);
    } else if (frame === 5) {
      b(10, 21, 4, 3, C.HELM); p(11, 22, C.DARK);
      b(13, 21, 8, 2, C.BODY);
      p(21, 23, C.DARK); p(22, 23, C.DARK);
    } else {
      b(12, 25, 4, 3, C.HELM); p(13, 26, C.DARK);
      p(18, 26, C.DARK); p(8, 27, C.GEAR); p(9, 27, C.GEAR);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  // Helmet (compact)
  b(15, 8, 5, 3, C.HELM); p(16, 8, C.LTOLIVE); p(19, 9, C.DARK);
  // Face
  b(16, 11, 3, 2, C.SKIN); p(17, 11, C.DKSKIN);
  // Body (compact)
  b(14, 13, 6, 5, C.BODY); p(14, 13, C.LTOLIVE); p(15, 14, C.LTOLIVE);
  p(19, 17, C.DARK);
  // Rifle
  b(20, 14, 3, 1, C.METAL); p(23, 14, C.DKMETAL); p(24, 14, C.DKMETAL);
  p(20, 15, C.BROWN); // grip
  // Belt
  b(14, 18, 6, 1, C.KHAKI);
  // Legs
  b(14 + legOff, 19, 3, 3, C.BROWN); b(17 - legOff, 19, 3, 3, C.BROWN);
  b(14 + legOff, 22, 3, 2, C.DARK); b(17 - legOff, 22, 3, 2, C.DARK);
}

// 7: Cargo Carrier — Two soldiers carrying crate
function drawCargo(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      // soldiers stumble, crate tips
      b(6, 10, 4, 3, C.HELM); b(22, 10, 4, 3, C.HELM);
      p(7, 11, C.DARK); p(23, 11, C.DARK);
      b(7, 13, 3, 2, C.SKIN); b(23, 13, 3, 2, C.SKIN);
      b(5, 15, 5, 4, C.BODY); b(21, 15, 5, 4, C.BODY);
      b(11, 13, 8, 6, C.KHAKI); p(12, 14, C.LTKHAKI); p(13, 14, C.LTKHAKI);
      b(14, 15, 4, 2, C.DARK); // crate marking
      b(7, 19, 3, 2, C.BROWN); b(22, 19, 3, 2, C.BROWN);
    } else if (frame === 5) {
      b(5, 20, 22, 3, C.BODY);
      b(4, 20, 3, 2, C.HELM); b(25, 20, 3, 2, C.HELM);
      b(11, 18, 8, 5, C.KHAKI); p(12, 19, C.LTKHAKI);
      b(14, 20, 4, 2, C.DARK);
      p(9, 23, C.DARK); p(10, 23, C.DARK); p(21, 23, C.DARK); p(22, 23, C.DARK);
    } else {
      b(7, 24, 4, 3, C.HELM); b(22, 24, 4, 3, C.HELM);
      b(12, 22, 8, 5, C.KHAKI); p(13, 23, C.LTKHAKI);
      b(14, 24, 4, 2, C.DARK);
      p(5, 27, C.DARK); p(6, 27, C.DARK); p(26, 27, C.DARK); p(27, 27, C.DARK);
    }
    return;
  }
  const step = frame;
  const bob = [0, 0, 0, 0][step];
  const legOff = [0, 1, 0, -1][step];
  // Left soldier
  b(6, 7 + bob, 4, 3, C.HELM); p(7, 7 + bob, C.LTOLIVE);
  b(7, 10 + bob, 3, 2, C.SKIN);
  b(5, 12 + bob, 5, 4, C.BODY); p(5, 12 + bob, C.LTOLIVE);
  // Right soldier
  b(22, 7 + bob, 4, 3, C.HELM); p(23, 7 + bob, C.LTOLIVE);
  b(23, 10 + bob, 3, 2, C.SKIN);
  b(21, 12 + bob, 5, 4, C.BODY); p(21, 12 + bob, C.LTOLIVE);
  // Shared crate between them
  b(11, 9 + bob, 8, 6, C.KHAKI); p(11, 9 + bob, C.LTKHAKI); p(12, 10 + bob, C.LTKHAKI);
  p(18, 14 + bob, C.BROWN); p(18, 13 + bob, C.BROWN); // shadow
  b(13, 11 + bob, 4, 2, C.DARK); // crate marking
  // Arms holding crate
  b(10, 14 + bob, 2, 2, C.BODY); b(19, 14 + bob, 2, 2, C.BODY);
  // Left soldier legs
  b(6 + legOff, 16 + bob, 2, 3, C.BROWN); b(8 - legOff, 16 + bob, 2, 3, C.BROWN);
  p(6 + legOff, 19 + bob, C.DARK); p(7 + legOff, 19 + bob, C.DARK);
  p(8 - legOff, 19 + bob, C.DARK); p(9 - legOff, 19 + bob, C.DARK);
  // Right soldier legs
  b(22 + legOff, 16 + bob, 2, 3, C.BROWN); b(24 - legOff, 16 + bob, 2, 3, C.BROWN);
  p(22 + legOff, 19 + bob, C.DARK); p(23 + legOff, 19 + bob, C.DARK);
  p(24 - legOff, 19 + bob, C.DARK); p(25 - legOff, 19 + bob, C.DARK);
}

// 8: Riot Trooper — Shield bearer with distinct transparent panel
function drawRiot(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(11, 8, 6, 4, C.HELM); p(12, 9, C.DARK);
      b(12, 12, 4, 2, C.SKIN);
      b(10, 14, 8, 6, C.BODY); p(10, 14, C.LTOLIVE);
      b(19, 8, 4, 12, C.SHIELD); p(19, 8, C.DKSHIELD); p(22, 19, C.DKSHIELD);
      p(20, 10, C.WHITE); p(21, 12, C.WHITE);
      b(11, 20, 3, 3, C.BROWN); b(16, 20, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 4, 3, C.HELM);
      b(10, 20, 8, 3, C.BODY);
      b(18, 18, 6, 4, C.SHIELD); p(18, 18, C.DKSHIELD);
      p(6, 23, C.DARK); p(7, 23, C.DARK);
      p(15, 23, C.DARK);
    } else {
      b(10, 25, 4, 3, C.HELM); p(11, 26, C.DARK);
      b(17, 23, 5, 3, C.SHIELD); p(18, 24, C.DKSHIELD);
      p(6, 27, C.DARK); p(7, 27, C.DARK);
      p(23, 26, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  // Helmet (visor)
  b(11, 5, 6, 4, C.HELM); p(16, 5, C.DARK); p(16, 6, C.DARK);
  p(12, 5, C.LTOLIVE); // highlight
  b(11, 8, 6, 1, C.DKMETAL); // visor rim
  // Face (peering over shield)
  b(12, 9, 4, 2, C.SKIN); p(15, 9, C.DKSKIN);
  // Body behind shield
  b(10, 11, 8, 7, C.BODY); p(10, 11, C.LTOLIVE); p(11, 12, C.LTOLIVE);
  p(17, 17, C.DARK);
  // Shield in front (transparent panel, distinct)
  b(20, 5, 4, 15, C.SHIELD);
  p(20, 5, C.DKSHIELD); p(20, 6, C.DKSHIELD); // left edge
  p(23, 18, C.DKSHIELD); p(23, 19, C.DKSHIELD); // bottom right shadow
  // Shield highlights (transparency effect)
  p(21, 7, C.WHITE); p(22, 8, C.WHITE); p(21, 10, C.WHITE);
  p(22, 13, C.WHITE); p(21, 16, C.WHITE);
  // Shield grip / arm
  b(18, 12, 2, 4, C.BODY); p(19, 13, C.BODY);
  // Belt
  b(10, 18, 8, 1, C.KHAKI);
  // Legs (slow advance)
  b(12 + legOff, 19, 3, 4, C.BROWN); b(15 - legOff, 19, 3, 4, C.BROWN);
  b(12 + legOff, 23, 3, 2, C.DARK); b(15 - legOff, 23, 3, 2, C.DARK);
}

// 9: Recon Operative — Commando crawling, flat on ground, very low profile
function drawRecon(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 13, 5, 3, C.DKOLIVE); p(14, 14, C.DARK);
      b(14, 16, 3, 2, C.SKIN);
      b(12, 18, 8, 4, C.DKOLIVE); p(12, 18, C.BODY);
      p(14, 22, C.DARK); p(15, 22, C.DARK); p(18, 22, C.DARK); p(19, 22, C.DARK);
    } else if (frame === 5) {
      b(9, 21, 10, 3, C.DKOLIVE); p(9, 21, C.BODY);
      p(7, 22, C.DKOLIVE); p(8, 22, C.DKOLIVE);
      p(20, 23, C.DARK); p(21, 23, C.DARK);
    } else {
      b(11, 25, 5, 3, C.DKOLIVE); p(12, 26, C.DARK);
      p(18, 25, C.DARK); p(19, 25, C.DARK);
      p(7, 27, C.GEAR); p(8, 27, C.GEAR);
    }
    return;
  }
  const step = frame;
  // Commando crawling: body is horizontal, flat on ground
  // Arms and legs alternate crawling motion per frame
  const crawlY = 18; // body stays low (horizontal center-line)
  // Arm positions: left arm forward on frames 0,2; right arm forward on 1,3
  const lArmX = [4, 10, 4, 10][step];   // left arm reaches far forward then pulls back
  const rArmX = [22, 16, 22, 16][step];  // right arm alternates opposite
  const lArmFwd = step === 0 || step === 2;
  const rArmFwd = step === 1 || step === 3;
  // Leg positions: opposite to arms
  const lLegX = lArmFwd ? 22 : 18;
  const rLegX = rArmFwd ? 8 : 12;
  const lLegBend = lArmFwd ? -1 : 0;  // knee bend
  const rLegBend = rArmFwd ? -1 : 0;

  // === HEAD (low, turned to side, camo helmet) ===
  b(6, crawlY - 3, 5, 3, C.DKOLIVE); p(7, crawlY - 3, C.GEAR);
  p(10, crawlY - 2, C.DARK);
  // Face (small, looking forward)
  b(7, crawlY - 1, 3, 2, C.SKIN); p(8, crawlY - 1, C.DKSKIN);
  // Eye
  p(9, crawlY - 1, C.DARK);

  // === TORSO (horizontal, long and flat) ===
  b(8, crawlY, 16, 3, C.DKOLIVE);
  b(8, crawlY, 16, 1, C.GEAR); // top highlight
  b(8, crawlY + 2, 16, 1, C.DARK); // bottom shadow
  // Camo pattern on back
  p(10, crawlY, C.LTOLIVE); p(14, crawlY + 1, C.LTOLIVE); p(18, crawlY, C.LTOLIVE);
  p(12, crawlY + 1, C.DARK); p(16, crawlY, C.DARK); p(20, crawlY + 1, C.DARK);
  p(11, crawlY + 2, C.BODY); p(15, crawlY + 2, C.BODY); p(19, crawlY + 2, C.BODY);
  // Backpack bump
  b(13, crawlY - 1, 4, 1, C.GEAR); p(14, crawlY - 1, C.BODY); p(16, crawlY - 1, C.DARK);

  // === LEFT ARM (elbow crawl, reaching forward or pulling back) ===
  if (lArmFwd) {
    // Arm extended forward
    b(lArmX, crawlY + 1, 4, 2, C.DKOLIVE); // upper arm
    b(lArmX, crawlY, 2, 1, C.SKIN); // hand/elbow on ground
    p(lArmX, crawlY, C.DKSKIN); p(lArmX + 1, crawlY + 1, C.GEAR);
  } else {
    // Arm pulled back, elbow bent
    b(lArmX, crawlY + 1, 3, 2, C.DKOLIVE);
    b(lArmX - 1, crawlY + 2, 2, 1, C.SKIN); // elbow
    p(lArmX, crawlY + 1, C.GEAR);
  }

  // === RIGHT ARM (opposite phase) ===
  if (rArmFwd) {
    // Arm extended forward (reaching under body right side)
    b(rArmX, crawlY + 1, 4, 2, C.DKOLIVE);
    b(rArmX + 3, crawlY, 2, 1, C.SKIN); // hand
    p(rArmX + 3, crawlY, C.DKSKIN); p(rArmX + 2, crawlY + 1, C.GEAR);
  } else {
    // Arm pulled back
    b(rArmX, crawlY + 1, 3, 2, C.DKOLIVE);
    b(rArmX + 2, crawlY + 2, 2, 1, C.SKIN);
    p(rArmX + 1, crawlY + 1, C.GEAR);
  }

  // === LEFT LEG (knee crawl, alternating) ===
  b(lLegX, crawlY + 2 + lLegBend, 3, 2, C.DKOLIVE); // thigh
  b(lLegX + 1, crawlY + 4 + lLegBend, 2, 2, C.DKOLIVE); // lower leg
  b(lLegX + 2, crawlY + 5 + lLegBend, 2, 1, C.DARK); // boot
  p(lLegX, crawlY + 2 + lLegBend, C.BODY); // knee highlight

  // === RIGHT LEG (opposite phase) ===
  b(rLegX, crawlY + 2 + rLegBend, 3, 2, C.DKOLIVE);
  b(rLegX - 1, crawlY + 4 + rLegBend, 2, 2, C.DKOLIVE);
  b(rLegX - 2, crawlY + 5 + rLegBend, 2, 1, C.DARK);
  p(rLegX + 2, crawlY + 2 + rLegBend, C.DARK);

  // === RIFLE (slung alongside body) ===
  b(8, crawlY + 3, 12, 1, C.DKMETAL); // rifle barrel alongside
  p(6, crawlY + 3, C.METAL); p(7, crawlY + 3, C.METAL); // muzzle
  p(19, crawlY + 3, C.DKMETAL); // stock

  // === GROUND DUST (crawling kicks up dust) ===
  if (step === 0 || step === 2) {
    p(lLegX + 3, crawlY + 5, C.SAND); p(lLegX + 4, crawlY + 4, C.KHAKI);
  }
  if (step === 1 || step === 3) {
    p(rLegX - 3, crawlY + 5, C.SAND); p(rLegX - 2, crawlY + 4, C.KHAKI);
  }
}

// 10: Combat Engineer — Repair tools, wrench
function drawEngineer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 8, 6, 4, C.HELM); p(14, 9, C.DARK);
      b(15, 8, 3, 1, C.LTMETAL); // goggles
      b(14, 12, 4, 2, C.SKIN);
      b(12, 14, 8, 6, C.BODY);
      // wrench falling
      b(21, 11, 2, 4, C.METAL); p(23, 12, C.LTMETAL);
      b(9, 15, 3, 4, C.GEAR);
      b(14, 20, 3, 2, C.BROWN); b(18, 20, 3, 2, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 5, 3, C.HELM);
      b(11, 20, 10, 3, C.BODY);
      p(6, 22, C.SKIN);
      b(21, 21, 2, 3, C.METAL); p(23, 22, C.LTMETAL);
    } else {
      b(10, 25, 4, 3, C.HELM); p(11, 26, C.DARK);
      b(17, 25, 2, 3, C.METAL); p(19, 26, C.LTMETAL);
      p(6, 27, C.DARK); p(7, 27, C.DARK);
      p(13, 27, C.GEAR);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const armOff = [0, -1, 0, 1][step];
  // Helmet
  b(13, 5, 7, 4, C.HELM); p(12, 7, C.HELM);
  p(14, 5, C.LTOLIVE);
  // Goggles on helmet
  b(16, 5, 3, 2, C.LTMETAL); p(17, 6, C.METAL);
  p(19, 6, C.DARK);
  // Face
  b(14, 9, 4, 3, C.SKIN); p(17, 9, C.DKSKIN); p(15, 11, C.DKSKIN);
  // Body with utility patches
  b(12, 12, 8, 7, C.BODY); p(12, 12, C.LTOLIVE);
  p(14, 14, C.GEAR); p(15, 15, C.GEAR); p(17, 14, C.GEAR); // patches
  // Tool belt (detailed)
  b(12, 19, 8, 1, C.KHAKI);
  p(20, 19, C.METAL); p(21, 19, C.METAL); // tools on belt
  p(11, 19, C.DKMETAL);
  // Wrench held out
  b(21, 11 + armOff, 2, 4, C.METAL); p(23, 12 + armOff, C.LTMETAL);
  b(21, 10 + armOff, 3, 2, C.METAL); p(23, 10 + armOff, C.LTMETAL); // wrench head
  p(22, 9 + armOff, C.LTMETAL);
  // Backpack with tools
  b(9, 13, 3, 6, C.GEAR); p(9, 12, C.DKOLIVE); p(10, 12, C.DKOLIVE);
  p(10, 13, C.METAL); p(10, 14, C.LTMETAL); // tool sticking out
  p(9, 18, C.DARK);
  // Legs
  b(13, 20, 3, 3 + Math.abs(legOff), C.BROWN); b(17, 20 + Math.abs(legOff), 3, 3, C.BROWN);
  b(13, 23, 3, 2, C.DARK); b(17, 23, 3, 2, C.DARK);
  // Arms
  p(11, 14 + armOff, C.BODY); p(11, 15 + armOff, C.BODY);
}

// 11: Paratrooper — Jetpack with visible flame particles
function drawParatrooper(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 6, 6, 4, C.HELM); p(14, 7, C.DARK);
      b(14, 10, 4, 2, C.SKIN);
      b(12, 12, 8, 6, C.BODY); p(12, 12, C.LTOLIVE);
      // jetpack sparking
      b(9, 13, 3, 5, C.METAL); p(9, 17, C.DKMETAL);
      p(9, 18, C.ORANGE); p(10, 19, C.FLAME); p(8, 19, C.LTFLAME);
      b(14, 18, 3, 2, C.BROWN); b(18, 18, 3, 2, C.BROWN);
    } else if (frame === 5) {
      b(7, 18, 5, 3, C.HELM); p(8, 19, C.DARK);
      b(11, 18, 10, 3, C.BODY);
      b(5, 19, 3, 4, C.METAL); p(5, 22, C.DKMETAL);
      p(21, 21, C.DARK); p(22, 21, C.DARK);
    } else {
      b(10, 25, 4, 3, C.HELM); p(11, 26, C.DARK);
      b(6, 25, 3, 2, C.METAL); p(17, 25, C.DARK);
      p(22, 27, C.BROWN); p(8, 27, C.DKMETAL);
    }
    return;
  }
  const step = frame;
  const hover = [0, -2, 0, -2][step]; // floating up/down
  const flicker = step % 2;
  // Elevated position (floating)
  // Helmet
  b(13, 3 + hover, 6, 4, C.HELM); p(18, 3 + hover, C.DARK); p(18, 4 + hover, C.DARK);
  p(14, 3 + hover, C.LTOLIVE);
  // Face
  b(14, 7 + hover, 4, 2, C.SKIN); p(17, 7 + hover, C.DKSKIN);
  // Body
  b(12, 9 + hover, 8, 6, C.BODY); p(12, 9 + hover, C.LTOLIVE); p(13, 10 + hover, C.LTOLIVE);
  // Jetpack on back (detailed)
  b(7, 9 + hover, 5, 6, C.METAL); p(7, 9 + hover, C.LTMETAL); p(8, 10 + hover, C.LTMETAL);
  p(11, 14 + hover, C.DKMETAL); p(11, 13 + hover, C.DKMETAL);
  // Nozzles
  p(7, 15 + hover, C.DKMETAL); p(8, 15 + hover, C.DKMETAL);
  p(10, 15 + hover, C.DKMETAL); p(11, 15 + hover, C.DKMETAL);
  // Jet flames below (visible flame particles)
  b(7, 16 + hover, 2, 2, C.FLAME); b(10, 16 + hover, 2, 2, C.FLAME);
  b(7, 18 + hover, 2, 2, flicker ? C.LTFLAME : C.ORANGE);
  b(10, 18 + hover, 2, 2, flicker ? C.ORANGE : C.LTFLAME);
  if (flicker) {
    p(7, 20 + hover, C.ORANGE); p(8, 20 + hover, C.LTFLAME);
    p(10, 20 + hover, C.ORANGE); p(11, 21 + hover, C.LTFLAME);
  } else {
    p(8, 20 + hover, C.ORANGE); p(7, 21 + hover, C.LTFLAME);
    p(11, 20 + hover, C.ORANGE); p(10, 21 + hover, C.LTFLAME);
  }
  // Arms (spread)
  b(11, 11 + hover, 2, 3, C.BODY); b(20, 11 + hover, 2, 3, C.BODY);
  // Legs (dangling)
  b(14, 15 + hover, 2, 4, C.BROWN); b(17, 15 + hover, 2, 4, C.BROWN);
  p(14, 19 + hover, C.DARK); p(15, 19 + hover, C.DARK);
  p(17, 19 + hover + flicker, C.DARK); p(18, 19 + hover + flicker, C.DARK);
}

// 12: Iron Mage (Armor Officer) — Distinct cap/beret, longer coat, rally gesture
function drawArmorOfficer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 6, 6, 3, C.DARK); p(14, 5, C.DARK); p(15, 5, C.DGRAY); // beret
      b(14, 9, 4, 2, C.SKIN);
      b(12, 11, 8, 9, C.DKOLIVE); p(12, 11, C.BODY);
      p(11, 12, C.METAL); p(20, 12, C.METAL); // epaulettes
      b(14, 20, 3, 3, C.BROWN); b(18, 20, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 14, 3, C.DKOLIVE);
      p(5, 21, C.DARK); p(6, 21, C.DARK); p(21, 21, C.DARK); p(22, 21, C.DARK);
      p(10, 23, C.BROWN); p(11, 23, C.BROWN);
    } else {
      b(10, 25, 5, 3, C.DARK); p(11, 26, C.DGRAY);
      b(17, 25, 4, 2, C.DKOLIVE);
      p(22, 27, C.BROWN); p(6, 27, C.DARK);
    }
    return;
  }
  const step = frame;
  const armOff = [0, -2, -2, 0][step]; // rally gesture
  const legOff = [0, 2, 0, -2][step];
  // Cap/beret (distinct shape)
  b(13, 4, 7, 2, C.DARK); p(12, 5, C.DARK); p(11, 5, C.DARK);
  b(14, 2, 5, 2, C.DARK); p(15, 2, C.DGRAY); p(16, 2, C.DGRAY); // beret puff
  p(14, 3, C.DGRAY);
  // Face
  b(14, 6, 4, 3, C.SKIN); p(17, 6, C.DKSKIN); p(15, 8, C.DKSKIN);
  // Officer coat (long, darker olive — extends further down)
  b(12, 9, 8, 12, C.DKOLIVE); p(12, 9, C.BODY); p(13, 10, C.BODY);
  p(19, 20, C.DARK); p(19, 19, C.DARK);
  // Coat lapels
  p(14, 10, C.DARK); p(17, 10, C.DARK);
  p(14, 11, C.DARK); p(17, 11, C.DARK);
  // Epaulettes
  b(10, 9, 2, 2, C.METAL); b(20, 9, 2, 2, C.METAL);
  // Rally arm raised high
  b(20, 7 + armOff, 2, 5, C.BODY);
  p(21, 6 + armOff, C.BODY); p(22, 5 + armOff, C.BODY);
  p(22, 4 + armOff, C.SKIN); p(23, 4 + armOff, C.SKIN); // fist
  // Belt with insignia
  b(12, 16, 8, 1, C.KHAKI); p(16, 16, C.METAL); p(17, 16, C.METAL);
  // Legs under coat (visible below coat hem)
  b(13 + legOff, 21, 3, 3, C.BROWN); b(17 - legOff, 21, 3, 3, C.BROWN);
  b(13 + legOff, 24, 3, 2, C.DARK); b(17 - legOff, 24, 3, 2, C.DARK);
}

// 13: Haste Mage (Signals Officer) — Radio antenna, speed lines
function drawSignalsOfficer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 6, 6, 3, C.DARK); p(14, 5, C.DGRAY);
      b(14, 9, 4, 2, C.SKIN);
      b(12, 11, 8, 8, C.BODY); p(12, 11, C.LTOLIVE);
      // antenna breaking
      p(9, 9, C.METAL); p(9, 8, C.LTMETAL); p(10, 7, C.LTMETAL);
      b(14, 19, 3, 3, C.BROWN); b(18, 19, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 14, 3, C.BODY);
      p(5, 21, C.DARK); p(6, 21, C.DARK); p(21, 21, C.DARK); p(22, 21, C.DARK);
      p(10, 23, C.METAL);
    } else {
      b(10, 25, 5, 3, C.DARK); p(11, 26, C.DGRAY);
      b(17, 25, 3, 2, C.METAL);
      p(6, 27, C.BODY); p(22, 27, C.DARK);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const wave = step % 2;
  // Cap
  b(13, 4, 7, 2, C.DARK); p(12, 5, C.DARK);
  b(14, 2, 5, 2, C.DGRAY); p(15, 3, C.DARK);
  // Face
  b(14, 6, 4, 3, C.SKIN); p(17, 6, C.DKSKIN);
  // Body
  b(12, 9, 8, 9, C.BODY); p(12, 9, C.LTOLIVE); p(13, 10, C.LTOLIVE);
  // Radio antenna on back (tall)
  p(9, 9, C.METAL); p(9, 8, C.METAL); p(9, 7, C.METAL);
  p(9, 6, C.LTMETAL); p(9, 5, C.LTMETAL); p(9, 4, C.LTMETAL);
  p(8, 3, C.LTBLUE); p(9, 3, C.LTBLUE); // antenna tip glow
  // Radio backpack
  b(9, 10, 3, 5, C.GEAR); p(10, 11, C.METAL); p(10, 12, C.DKMETAL);
  // Speed-wave lines (animated)
  if (wave) {
    p(3, 11, C.LTBLUE); p(4, 11, C.LTBLUE); p(2, 13, C.BLUE); p(3, 13, C.BLUE);
    p(5, 15, C.LTBLUE); p(6, 15, C.LTBLUE);
  } else {
    p(5, 11, C.BLUE); p(6, 11, C.BLUE); p(3, 13, C.LTBLUE); p(4, 13, C.LTBLUE);
    p(2, 15, C.BLUE); p(3, 15, C.BLUE);
  }
  // Epaulettes
  b(10, 9, 2, 2, C.METAL); b(20, 9, 2, 2, C.METAL);
  // Belt
  b(12, 17, 8, 1, C.KHAKI);
  // Legs
  b(13 + legOff, 18, 3, 4, C.BROWN); b(17 - legOff, 18, 3, 4, C.BROWN);
  b(13 + legOff, 22, 3, 2, C.DARK); b(17 - legOff, 22, 3, 2, C.DARK);
}

// 14: Mist Mage (Smoke Operator) — Smoke cloud around body
function drawSmokeOperator(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 6, 6, 3, C.DARK); p(14, 5, C.DGRAY);
      b(14, 9, 4, 2, C.SKIN);
      b(12, 11, 8, 8, C.BODY);
      p(8, 13, C.SMOKE); p(9, 13, C.SMOKE);
      p(22, 12, C.LTSMOKE); p(23, 12, C.LTSMOKE);
      b(14, 19, 3, 3, C.BROWN); b(18, 19, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 14, 3, C.BODY);
      p(5, 19, C.SMOKE); p(6, 18, C.SMOKE); p(22, 19, C.LTSMOKE); p(23, 18, C.LTSMOKE);
      p(10, 23, C.DARK);
    } else {
      b(10, 25, 5, 3, C.DARK);
      p(17, 25, C.SMOKE); p(18, 25, C.SMOKE);
      p(6, 27, C.LTSMOKE); p(7, 27, C.LTSMOKE);
      p(22, 27, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const smokePhase = step;
  // Cap
  b(13, 4, 7, 2, C.DARK); p(12, 5, C.DARK);
  b(14, 2, 5, 2, C.DGRAY); p(15, 3, C.DARK);
  // Face
  b(14, 6, 4, 3, C.SKIN); p(17, 6, C.DKSKIN);
  // Body
  b(12, 9, 8, 9, C.BODY); p(12, 9, C.LTOLIVE); p(13, 10, C.LTOLIVE);
  // Smoke cloud pixels around body (shifting, bigger clouds)
  const smokePositions = [
    [[5, 8], [6, 8], [7, 6], [8, 5], [23, 10], [24, 10], [23, 7], [24, 6], [5, 16], [6, 16], [23, 17], [24, 17]],
    [[7, 7], [8, 7], [5, 10], [6, 10], [24, 8], [25, 8], [22, 5], [23, 5], [4, 14], [5, 14], [24, 15], [25, 15]],
    [[5, 5], [6, 5], [9, 7], [10, 7], [22, 9], [23, 9], [25, 11], [24, 12], [7, 17], [8, 17], [21, 16], [22, 16]],
    [[8, 9], [9, 9], [5, 7], [6, 7], [25, 5], [24, 5], [22, 13], [23, 13], [5, 18], [6, 18], [22, 7], [23, 7]],
  ];
  const spos = smokePositions[smokePhase % 4];
  for (let i = 0; i < spos.length; i++) {
    p(spos[i][0], spos[i][1], i % 2 === 0 ? C.SMOKE : C.LTSMOKE);
  }
  // Smoke grenade in hand
  b(21, 11, 2, 3, C.DGRAY); p(22, 12, C.MGRAY);
  p(21, 14, C.SMOKE); p(22, 14, C.LTSMOKE); // smoke emanating
  // Epaulettes
  b(10, 9, 2, 2, C.METAL); b(20, 9, 2, 2, C.METAL);
  // Belt
  b(12, 17, 8, 1, C.KHAKI);
  // Legs
  b(13 + legOff, 18, 3, 4, C.BROWN); b(17 - legOff, 18, 3, 4, C.BROWN);
  b(13 + legOff, 22, 3, 2, C.DARK); b(17 - legOff, 22, 3, 2, C.DARK);
}

// 15: Heal Mage (Combat Surgeon) — Medical cross, healing glow
function drawCombatSurgeon(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      b(13, 6, 6, 3, C.DARK); p(14, 5, C.DGRAY);
      p(17, 5, C.RED); // red cross on cap
      b(14, 9, 4, 2, C.SKIN);
      b(12, 11, 8, 8, C.BODY);
      // cross falling
      b(21, 12, 2, 4, C.WHITE); p(20, 13, C.RED); p(21, 13, C.RED); p(22, 13, C.RED);
      p(21, 12, C.RED); p(21, 15, C.RED);
      b(14, 19, 3, 3, C.BROWN); b(18, 19, 3, 3, C.BROWN);
    } else if (frame === 5) {
      b(7, 20, 14, 3, C.BODY);
      p(5, 21, C.DARK); p(6, 21, C.DARK);
      b(20, 21, 2, 3, C.RED); p(22, 22, C.WHITE);
      p(10, 23, C.DARK);
    } else {
      b(10, 25, 5, 3, C.DARK); p(11, 26, C.DGRAY);
      b(17, 25, 2, 2, C.RED); p(19, 26, C.WHITE);
      p(6, 27, C.LTGREEN); p(7, 27, C.LTGREEN);
      p(23, 25, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 2, 0, -2][step];
  const glow = step % 2;
  // Cap with red cross
  b(13, 4, 7, 2, C.DARK); p(12, 5, C.DARK);
  b(14, 2, 5, 2, C.DGRAY); p(17, 3, C.RED); p(18, 3, C.RED); // red cross on cap
  // Face
  b(14, 6, 4, 3, C.SKIN); p(17, 6, C.DKSKIN);
  // Body
  b(12, 9, 8, 9, C.BODY); p(12, 9, C.LTOLIVE); p(13, 10, C.LTOLIVE);
  // Red cross on chest (clear 3px cross)
  p(16, 11, C.RED); p(15, 12, C.RED); p(16, 12, C.WHITE); p(17, 12, C.RED);
  p(16, 13, C.RED);
  p(16, 10, C.RED); p(16, 14, C.RED);
  // Healing glow around (green, pulsing, bigger)
  if (glow) {
    p(7, 9, C.LTGREEN); p(8, 9, C.LTGREEN); p(23, 9, C.GREEN); p(24, 9, C.GREEN);
    p(9, 18, C.LTGREEN); p(10, 18, C.LTGREEN); p(25, 16, C.GREEN); p(26, 16, C.GREEN);
  } else {
    p(9, 7, C.GREEN); p(10, 7, C.GREEN); p(25, 11, C.LTGREEN); p(26, 11, C.LTGREEN);
    p(7, 16, C.GREEN); p(8, 16, C.GREEN); p(23, 18, C.LTGREEN); p(24, 18, C.LTGREEN);
  }
  // Epaulettes
  b(10, 9, 2, 2, C.METAL); b(20, 9, 2, 2, C.METAL);
  // Belt
  b(12, 17, 8, 1, C.KHAKI);
  // Medical bag on back
  b(9, 11, 3, 4, C.WHITE);
  p(10, 12, C.RED); p(9, 13, C.RED); p(10, 13, C.RED); p(11, 13, C.RED);
  p(10, 14, C.RED);
  // Legs
  b(13 + legOff, 18, 3, 4, C.BROWN); b(17 - legOff, 18, 3, 4, C.BROWN);
  b(13 + legOff, 22, 3, 2, C.DARK); b(17 - legOff, 22, 3, 2, C.DARK);
}

// ===== MASTER DRAW ARRAY =====
const DRAW_FNS = [
  drawInfantry,       // 0: standard
  drawScout,          // 1: fast
  drawHeavy,          // 2: armored
  drawRecruit,        // 3: swarm
  drawMedic,          // 4: healer
  drawTankCommander,  // 5: boss
  drawFireTeam,       // 6: group
  drawCargo,          // 7: splitter
  drawRiot,           // 8: shielded
  drawRecon,          // 9: evasive
  drawEngineer,       // 10: regenerator
  drawParatrooper,    // 11: flying
  drawArmorOfficer,   // 12: mage_iron
  drawSignalsOfficer, // 13: mage_haste
  drawSmokeOperator,  // 14: mage_mist
  drawCombatSurgeon,  // 15: mage_heal
];

// ===== RENDER FULL SHEET =====
function drawCreeps(ctx: any) {
  ctx.imageSmoothingEnabled = false;
  // Clear
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const ox = col * CELL;
      const oy = row * CELL;
      DRAW_FNS[col](ctx, [ox, oy], row);
    }
  }
}

// ===== REACT COMPONENT =====
export default function App() {
  const cRef = useRef<HTMLCanvasElement>(null);
  const pvRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    // Actual-size canvas
    const cc = cRef.current!;
    cc.width = COLS * CELL;
    cc.height = ROWS * CELL;
    const ctx = cc.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawCreeps(ctx);

    // Preview canvas (3x scaled with labels)
    const pv = pvRef.current!;
    const scale = 3;
    const labelW = 90, labelH = 13;
    pv.width = labelW + COLS * CELL * scale;
    pv.height = ROWS * (CELL * scale + labelH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a0f06';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * scale + labelH) + 5;
      pc.fillStyle = '#8fbc8f';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_LABELS[r], 3, by + CELL * scale / 2 + 3);
      for (let c = 0; c < COLS; c++) {
        const bx = labelW + c * CELL * scale;
        pc.save();
        pc.translate(bx, by);
        pc.scale(scale, scale);
        pc.drawImage(cc, c * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a2a1a';
        pc.strokeRect(bx, by, CELL * scale, CELL * scale);
        if (r === 0) {
          pc.fillStyle = '#8a9a6a';
          pc.font = '8px monospace';
          pc.fillText(NAMES[c], bx + 2, by - 2);
        }
      }
    }

    setReady(true);
  }, []);

  const dl = (ref: any, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ background: '#0a0f06', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#8fbc8f', margin: 0, fontSize: 15 }}>MILITARY FACTION — Creep Sprites</h2>
        {ready && <button onClick={dl(cRef, 'military_creeps.png')} style={{ background: '#556b2f', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11 }}>
          Download PNG
        </button>}
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        {(['preview', 'actual'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ background: view === v ? '#1a2a1a' : '#111', color: view === v ? '#4488ff' : '#445566', border: `1px solid ${view === v ? '#334' : '#222'}`, padding: '4px 8px', borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, textTransform: 'capitalize' }}>{v === 'actual' ? 'Actual Size' : v}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '85vh' }}>
        <canvas ref={pvRef} data-label="Military Creeps (Preview)" data-frame-size="64x64" data-direction="right" data-columns='["Infantry (Standard)","Scout (Fast)","Heavy Trooper (Armored)","Recruit (Swarm)","Field Medic (Healer)","Tank Commander (Boss)","Fire Team (Group)","Cargo Carrier (Splitter)","Riot Trooper (Shielded)","Recon Operative (Evasive)","Combat Engineer (Regen)","Paratrooper (Flying)","Armor Officer (Iron)","Signals Officer (Haste)","Smoke Operator (Mist)","Combat Surgeon (Heal)"]' data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]' data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]' style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }} />
        <canvas ref={cRef} data-label="Military Creeps" data-frame-size="64x64" data-direction="right" data-columns='["Infantry (Standard)","Scout (Fast)","Heavy Trooper (Armored)","Recruit (Swarm)","Field Medic (Healer)","Tank Commander (Boss)","Fire Team (Group)","Cargo Carrier (Splitter)","Riot Trooper (Shielded)","Recon Operative (Evasive)","Combat Engineer (Regen)","Paratrooper (Flying)","Armor Officer (Iron)","Signals Officer (Haste)","Smoke Operator (Mist)","Combat Surgeon (Heal)"]' data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]' data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]' style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', width: COLS * CELL * 2, border: '1px solid #1a2a1a' }} />
      </div>
      <div style={{ color: '#556644', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Sheet:</b> {COLS * CELL}x{ROWS * CELL}px ({COLS * CELL / PX}x{ROWS * CELL / PX} logical) — {CELL}x{CELL} cells</p>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Phaser:</b> <code style={{ color: '#4488ff' }}>{"this.load.spritesheet('military_creeps','military_creeps.png',{frameWidth:64,frameHeight:64})"}</code></p>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Layout:</b> {COLS} cols (creep types) x {ROWS} rows (4 walk + 3 death). Types: {NAMES.join(', ')}</p>
      </div>
    </div>
  );
}
