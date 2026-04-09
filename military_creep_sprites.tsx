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
const PX = 2, GRID = 16, CELL = GRID * PX; // 32x32 pixel frames
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

// 0: Infantry — Soldier with helmet, rifle, backpack
function drawInfantry(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) { // death
    if (frame === 4) {
      // stumbling backward
      p(7, 5, C.HELM); p(8, 5, C.HELM);
      p(7, 6, C.SKIN); p(8, 6, C.DKSKIN);
      b(6, 7, 4, 3, C.BODY); p(7, 7, C.LTOLIVE);
      p(10, 7, C.METAL); p(11, 7, C.DKMETAL); // rifle
      p(5, 8, C.GEAR); // backpack
      p(6, 10, C.BODY); p(7, 10, C.BODY);
      p(8, 10, C.BROWN); p(9, 10, C.BROWN);
      p(5, 11, C.BROWN); p(10, 11, C.BROWN);
    } else if (frame === 5) {
      // falling horizontal
      b(4, 9, 3, 2, C.BODY); p(4, 9, C.LTOLIVE);
      p(3, 9, C.HELM); p(3, 10, C.SKIN);
      p(7, 9, C.GEAR); p(8, 9, C.GEAR);
      p(9, 10, C.BROWN); p(10, 10, C.BROWN);
      p(11, 9, C.METAL); p(12, 9, C.DKMETAL); // rifle flying
      p(5, 11, C.DARK);
    } else {
      // helmet + scattered gear
      p(5, 12, C.HELM); p(6, 12, C.HELM);
      p(8, 11, C.METAL); p(9, 12, C.DKMETAL);
      p(4, 13, C.GEAR); p(10, 13, C.BROWN);
      p(7, 13, C.DARK);
    }
    return;
  }
  // Walk frames 0-3
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const armOff = [0, -1, 0, 1][step];
  const bobY = [0, 0, 0, 0][step];

  // Helmet
  b(7, 3 + bobY, 3, 2, C.HELM); p(6, 4 + bobY, C.HELM);
  p(9, 3 + bobY, C.DARK); // helmet shadow
  // Face
  p(7, 5 + bobY, C.SKIN); p(8, 5 + bobY, C.DKSKIN);
  // Body
  b(6, 6 + bobY, 4, 3, C.BODY);
  p(6, 6 + bobY, C.LTOLIVE); p(9, 8 + bobY, C.DARK);
  // Backpack
  p(5, 7 + bobY, C.GEAR); p(5, 8 + bobY, C.GEAR);
  p(5, 6 + bobY, C.DARK);
  // Belt
  b(6, 9 + bobY, 4, 1, C.KHAKI);
  // Rifle (held forward)
  p(10, 6 + bobY + armOff, C.METAL); p(11, 6 + bobY + armOff, C.METAL);
  p(12, 6 + bobY + armOff, C.DKMETAL); p(10, 7 + bobY + armOff, C.BROWN);
  // Arms
  p(6, 7 + bobY + armOff, C.BODY); // rear arm
  p(10, 7 + bobY, C.BODY); // front arm (by rifle)
  // Legs
  p(7, 10 + bobY, C.BROWN); p(8, 10 + bobY, C.BROWN);
  p(7 - (legOff > 0 ? 1 : 0), 11 + bobY, C.BROWN);
  p(8 + (legOff > 0 ? 1 : 0), 11 + bobY, C.BROWN);
  // Boots
  p(7 - (legOff > 0 ? 1 : 0), 12 + bobY, C.DARK);
  p(8 + (legOff > 0 ? 1 : 0), 12 + bobY, C.DARK);
}

// 1: Scout — Lean sprinting soldier
function drawScout(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 6, C.HELM); p(8, 6, C.SKIN);
      b(6, 7, 4, 2, C.BODY); p(6, 7, C.LTOLIVE);
      p(7, 9, C.BROWN); p(9, 9, C.BROWN);
      p(6, 10, C.DARK); p(10, 10, C.DARK);
    } else if (frame === 5) {
      p(4, 10, C.HELM); p(5, 10, C.SKIN);
      b(5, 10, 4, 1, C.BODY);
      p(9, 10, C.BROWN); p(10, 11, C.DARK);
      p(3, 11, C.DARK);
    } else {
      p(5, 12, C.HELM); p(8, 13, C.DARK);
      p(10, 12, C.BROWN); p(3, 13, C.GEAR);
    }
    return;
  }
  const step = frame;
  const stride = [-1, 0, 1, 0][step];
  const lean = 1; // always leaning forward
  // Head (leaning forward)
  p(8 + lean, 4, C.HELM); p(9 + lean, 4, C.HELM);
  p(8 + lean, 5, C.SKIN); p(9 + lean, 5, C.DKSKIN);
  // Lean body
  b(7, 6, 3, 3, C.BODY); p(7, 6, C.LTOLIVE);
  p(10, 7, C.DARK);
  // Belt
  p(7, 9, C.KHAKI); p(8, 9, C.KHAKI);
  // Legs — extended stride
  const lf = 8 + stride, lr = 7 - stride;
  p(lf, 10, C.BROWN); p(lr, 10, C.BROWN);
  p(lf + (stride > 0 ? 1 : 0), 11, C.DARK);
  p(lr - (stride < 0 ? 1 : 0), 11, C.DARK);
  // Arms pumping
  p(6, 7 + (stride > 0 ? -1 : 0), C.BODY);
  p(10, 7 + (stride < 0 ? -1 : 0), C.BODY);
}

// 2: Heavy Trooper — Wide power armor
function drawHeavy(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      // tilting back
      b(5, 4, 6, 2, C.METAL); p(5, 4, C.LTMETAL);
      p(6, 3, C.HELM); p(7, 3, C.HELM);
      b(4, 6, 8, 3, C.BODY); p(4, 6, C.LTOLIVE);
      p(6, 9, C.BROWN); p(9, 9, C.BROWN);
      p(5, 10, C.DARK); p(10, 10, C.DARK);
    } else if (frame === 5) {
      b(3, 9, 8, 2, C.BODY);
      p(3, 9, C.METAL); p(10, 9, C.METAL);
      p(2, 10, C.HELM); p(11, 10, C.DARK);
      p(5, 11, C.BROWN); p(8, 11, C.DARK);
    } else {
      p(4, 12, C.HELM); p(5, 12, C.METAL);
      p(7, 13, C.DARK); p(9, 12, C.BODY);
      p(11, 13, C.DKMETAL); p(3, 13, C.BROWN);
    }
    return;
  }
  const step = frame;
  const stomp = [0, 1, 0, 1][step];
  // Helmet (small on big body)
  b(7, 2 + stomp, 3, 2, C.HELM); p(9, 2 + stomp, C.DARK);
  p(7, 4 + stomp, C.SKIN);
  // Massive shoulder pads
  b(3, 4 + stomp, 4, 2, C.METAL); p(3, 4 + stomp, C.LTMETAL);
  b(9, 4 + stomp, 4, 2, C.METAL); p(12, 4 + stomp, C.DKMETAL);
  // Wide torso
  b(4, 6 + stomp, 8, 4, C.BODY); p(4, 6 + stomp, C.LTOLIVE);
  p(11, 9 + stomp, C.DARK);
  // Chest plate
  b(6, 7 + stomp, 4, 2, C.METAL); p(6, 7 + stomp, C.LTMETAL);
  // Arms
  p(3, 7 + stomp, C.BODY); p(12, 7 + stomp, C.BODY);
  // Tiny legs
  const legSpread = step % 2 === 0 ? 0 : 1;
  p(6 - legSpread, 10 + stomp, C.BROWN); p(9 + legSpread, 10 + stomp, C.BROWN);
  p(6 - legSpread, 11 + stomp, C.DARK); p(9 + legSpread, 11 + stomp, C.DARK);
  // Heavy weapon
  b(12, 6 + stomp, 2, 1, C.METAL); p(13, 7 + stomp, C.DKMETAL);
}

// 3: Recruit — Tiny figure
function drawRecruit(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 9, C.HELM); p(8, 10, C.BODY);
      p(7, 10, C.SKIN); p(8, 11, C.DARK);
    } else if (frame === 5) {
      p(6, 11, C.HELM); p(7, 11, C.BODY);
      p(8, 12, C.DARK);
    } else {
      p(7, 12, C.HELM); p(9, 13, C.DARK);
    }
    return;
  }
  const step = frame;
  const shuffle = [0, 1, 0, -1][step];
  // Helmet dot
  p(8, 8, C.HELM);
  // Face
  p(8, 9, C.SKIN);
  // Tiny body
  p(8, 10, C.BODY); p(7, 10, C.GEAR);
  // Legs (quick shuffle)
  p(7 + shuffle, 11, C.BROWN);
  p(8 - shuffle, 11, C.BROWN);
}

// 4: Medic — Red cross, medical gear
function drawMedic(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 5, C.HELM); p(8, 5, C.HELM);
      p(7, 6, C.SKIN);
      b(6, 7, 4, 3, C.BODY);
      p(5, 8, C.WHITE); p(5, 7, C.RED); p(5, 9, C.RED); // cross falling
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      p(4, 10, C.HELM);
      b(4, 10, 5, 1, C.BODY);
      p(3, 11, C.SKIN);
      p(9, 10, C.WHITE); p(9, 11, C.RED);
      p(6, 11, C.DARK);
    } else {
      p(5, 12, C.HELM); p(8, 12, C.RED); p(9, 13, C.WHITE);
      p(4, 13, C.DARK); p(11, 12, C.BROWN);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const armOff = [0, -1, 0, 1][step];
  // Helmet with cross
  b(7, 3, 3, 2, C.HELM); p(8, 3, C.RED); // red cross on helmet
  // Face
  p(7, 5, C.SKIN); p(8, 5, C.DKSKIN);
  // Body
  b(6, 6, 4, 3, C.BODY); p(6, 6, C.LTOLIVE);
  // Red cross armband
  p(10, 7, C.WHITE); p(10, 6, C.RED); p(10, 8, C.RED);
  p(11, 7, C.RED); p(9, 7, C.RED);
  // Medkit backpack (white with red cross)
  p(5, 7, C.WHITE); p(5, 8, C.WHITE);
  p(5, 7, C.RED); // cross center
  p(5, 6, C.DKRED);
  // Belt
  b(6, 9, 4, 1, C.KHAKI);
  // Legs
  p(7, 10 + Math.abs(legOff), C.BROWN); p(8, 10, C.BROWN);
  p(7, 11, C.DARK); p(8, 11 + Math.abs(legOff), C.DARK);
  // Arms
  p(6, 7 + armOff, C.BODY);
}

// 5: Tank Commander — Large armored exosuit
function drawTankCommander(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      // massive suit stumbling
      b(3, 3, 8, 3, C.METAL); p(3, 3, C.LTMETAL);
      p(7, 1, C.DKMETAL); // antenna
      b(2, 6, 10, 4, C.BODY); p(2, 6, C.LTOLIVE);
      b(5, 6, 4, 2, C.METAL);
      p(4, 10, C.BROWN); p(9, 10, C.BROWN);
      p(3, 11, C.DARK); p(10, 11, C.DARK);
    } else if (frame === 5) {
      b(2, 8, 10, 3, C.BODY); p(2, 8, C.LTOLIVE);
      b(4, 8, 6, 2, C.METAL);
      p(1, 9, C.HELM); p(12, 9, C.DKMETAL);
      p(5, 11, C.BROWN); p(8, 11, C.DARK);
      p(3, 12, C.DKMETAL); // weapon mount
    } else {
      p(3, 12, C.HELM); p(5, 12, C.METAL); p(7, 13, C.DKMETAL);
      p(9, 12, C.BODY); p(11, 13, C.DARK);
      p(4, 13, C.BROWN); p(13, 12, C.METAL);
    }
    return;
  }
  const step = frame;
  const mech = [0, 1, 0, 1][step];
  // Command antenna
  p(7, 0 + mech, C.DKMETAL); p(7, 1 + mech, C.METAL);
  // Armored head
  b(5, 2 + mech, 5, 2, C.METAL); p(5, 2 + mech, C.LTMETAL);
  p(9, 3 + mech, C.DKMETAL);
  p(6, 3 + mech, C.SKIN); // visor slit
  // Massive shoulder weapon mounts
  b(1, 4 + mech, 4, 2, C.METAL); p(1, 4 + mech, C.LTMETAL);
  p(2, 4 + mech, C.DKMETAL); // weapon barrel
  b(10, 4 + mech, 4, 2, C.METAL); p(13, 4 + mech, C.DKMETAL);
  p(13, 5 + mech, C.METAL);
  // Massive torso
  b(3, 6 + mech, 9, 4, C.BODY); p(3, 6 + mech, C.LTOLIVE);
  p(11, 9 + mech, C.DARK);
  // Chest armor
  b(5, 7 + mech, 5, 2, C.METAL); p(5, 7 + mech, C.LTMETAL);
  p(7, 8 + mech, C.BLUE); // power core
  // Side armor
  p(2, 7 + mech, C.GEAR); p(12, 7 + mech, C.GEAR);
  p(2, 8 + mech, C.GEAR); p(12, 8 + mech, C.GEAR);
  // Heavy legs
  b(4, 10 + mech, 3, 2, C.BROWN); b(8, 10 + mech, 3, 2, C.BROWN);
  const legS = step % 2;
  p(4 - legS, 12 + mech, C.DARK); p(5, 12 + mech, C.DARK);
  p(8 + legS, 12 + mech, C.DARK); p(9, 12 + mech, C.DARK);
}

// 6: Fire Team — Smaller infantry
function drawFireTeam(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 6, C.HELM); p(8, 7, C.SKIN);
      b(7, 8, 3, 2, C.BODY);
      p(7, 10, C.BROWN); p(9, 10, C.DARK);
    } else if (frame === 5) {
      p(5, 10, C.HELM); b(5, 10, 4, 1, C.BODY);
      p(9, 11, C.DARK);
    } else {
      p(6, 12, C.HELM); p(9, 12, C.DARK); p(4, 13, C.GEAR);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  // Helmet (small)
  p(8, 5, C.HELM); p(9, 5, C.HELM);
  // Face
  p(8, 6, C.SKIN);
  // Body (compact)
  b(7, 7, 3, 2, C.BODY); p(7, 7, C.LTOLIVE);
  // Rifle
  p(10, 7, C.METAL); p(11, 7, C.DKMETAL);
  // Belt
  p(7, 9, C.KHAKI); p(8, 9, C.KHAKI);
  // Legs
  p(7 + legOff, 10, C.BROWN); p(8 - legOff, 10, C.BROWN);
  p(7 + legOff, 11, C.DARK); p(8 - legOff, 11, C.DARK);
}

// 7: Cargo Carrier — Two soldiers carrying crate
function drawCargo(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      // soldiers stumble, crate tips
      p(4, 6, C.HELM); p(11, 6, C.HELM);
      p(4, 7, C.SKIN); p(11, 7, C.SKIN);
      b(3, 8, 3, 2, C.BODY); b(10, 8, 3, 2, C.BODY);
      b(6, 7, 4, 3, C.KHAKI); p(7, 7, C.LTKHAKI); // tipping crate
      p(4, 10, C.BROWN); p(11, 10, C.BROWN);
    } else if (frame === 5) {
      b(3, 10, 10, 1, C.BODY);
      p(3, 10, C.HELM); p(12, 10, C.HELM);
      b(6, 9, 4, 2, C.KHAKI); // crate on ground
      p(5, 11, C.DARK); p(10, 11, C.DARK);
    } else {
      p(4, 12, C.HELM); p(11, 12, C.HELM);
      b(6, 11, 4, 2, C.KHAKI); p(7, 11, C.LTKHAKI);
      p(3, 13, C.DARK); p(12, 13, C.DARK);
    }
    return;
  }
  const step = frame;
  const bob = [0, 0, 0, 0][step];
  const legOff = [0, 1, 0, -1][step];
  // Left soldier
  p(4, 4 + bob, C.HELM); p(4, 5 + bob, C.SKIN);
  b(3, 6 + bob, 3, 2, C.BODY); p(3, 6 + bob, C.LTOLIVE);
  // Right soldier
  p(11, 4 + bob, C.HELM); p(11, 5 + bob, C.SKIN);
  b(10, 6 + bob, 3, 2, C.BODY); p(10, 6 + bob, C.LTOLIVE);
  // Shared crate between them
  b(6, 5 + bob, 4, 3, C.KHAKI); p(6, 5 + bob, C.LTKHAKI);
  p(9, 7 + bob, C.BROWN); // shadow on crate
  b(7, 6 + bob, 2, 1, C.DARK); // crate marking
  // Arms holding crate
  p(5, 7 + bob, C.BODY); p(10, 7 + bob, C.BODY);
  // Legs (synchronized)
  p(3 + legOff, 8 + bob, C.BROWN); p(5 - legOff, 8 + bob, C.BROWN);
  p(10 + legOff, 8 + bob, C.BROWN); p(12 - legOff, 8 + bob, C.BROWN);
  p(3 + legOff, 9 + bob, C.DARK); p(5 - legOff, 9 + bob, C.DARK);
  p(10 + legOff, 9 + bob, C.DARK); p(12 - legOff, 9 + bob, C.DARK);
}

// 8: Riot Trooper — Shield bearer
function drawRiot(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(6, 5, C.HELM); p(7, 5, C.HELM);
      p(6, 6, C.SKIN);
      b(5, 7, 4, 3, C.BODY);
      b(9, 5, 2, 5, C.SHIELD); p(9, 5, C.DKSHIELD); // shield tipping
      p(5, 10, C.BROWN); p(8, 10, C.BROWN);
    } else if (frame === 5) {
      p(4, 10, C.HELM);
      b(4, 10, 4, 1, C.BODY);
      b(8, 9, 3, 2, C.SHIELD); // shield flat
      p(3, 11, C.DARK); p(7, 11, C.DARK);
    } else {
      p(5, 12, C.HELM); p(8, 11, C.SHIELD); p(9, 12, C.DKSHIELD);
      p(3, 13, C.DARK); p(11, 13, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  // Helmet
  b(6, 3, 3, 2, C.HELM); p(8, 3, C.DARK);
  // Face (peering over shield)
  p(6, 5, C.SKIN); p(7, 5, C.DKSKIN);
  // Body behind shield
  b(5, 6, 4, 3, C.BODY); p(5, 6, C.LTOLIVE);
  // Shield in front (transparent look — lighter colors)
  b(10, 3, 2, 7, C.SHIELD); p(10, 3, C.DKSHIELD);
  p(11, 9, C.DKSHIELD); p(10, 5, C.WHITE); // highlight
  p(11, 4, C.WHITE);
  // Shield arm
  p(9, 6, C.BODY); p(9, 7, C.BODY);
  // Belt
  b(5, 9, 4, 1, C.KHAKI);
  // Legs (slow advance)
  p(6 + legOff, 10, C.BROWN); p(7 - legOff, 10, C.BROWN);
  p(6 + legOff, 11, C.DARK); p(7 - legOff, 11, C.DARK);
}

// 9: Recon Operative — Stealth/camo, crouched
function drawRecon(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 7, C.DKOLIVE); p(8, 7, C.DKOLIVE);
      p(7, 8, C.SKIN);
      b(6, 9, 4, 2, C.DKOLIVE);
      p(7, 11, C.DARK); p(9, 11, C.DARK);
    } else if (frame === 5) {
      b(5, 10, 5, 1, C.DKOLIVE);
      p(4, 10, C.DKOLIVE); p(10, 11, C.DARK);
    } else {
      p(6, 12, C.DKOLIVE); p(9, 12, C.DARK); p(4, 13, C.GEAR);
    }
    return;
  }
  const step = frame;
  const sneak = [0, 0, 1, 0][step];
  const legOff = [0, 1, 0, -1][step];
  // Crouched lower in frame
  // Head (small, camo)
  p(8, 6 + sneak, C.DKOLIVE); p(9, 6 + sneak, C.DKOLIVE);
  p(8, 7 + sneak, C.SKIN); // small face
  // Crouched body (sparse camo pixels)
  b(6, 8 + sneak, 4, 2, C.DKOLIVE);
  p(7, 8 + sneak, C.GEAR); p(9, 9 + sneak, C.BODY);
  // Camo effect — scattered lighter/darker pixels
  p(6, 8 + sneak, C.LTOLIVE);
  p(8, 9 + sneak, C.DARK);
  // Low legs (crouched)
  p(6 + legOff, 10 + sneak, C.DKOLIVE);
  p(8 - legOff, 10 + sneak, C.DKOLIVE);
  p(6 + legOff, 11 + sneak, C.DARK);
  p(8 - legOff, 11 + sneak, C.DARK);
}

// 10: Combat Engineer — Repair tools, wrench
function drawEngineer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 5, C.HELM); p(8, 5, C.HELM);
      p(7, 6, C.SKIN);
      b(6, 7, 4, 3, C.BODY);
      p(10, 6, C.METAL); p(11, 7, C.LTMETAL); // wrench falling
      p(5, 8, C.GEAR);
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      p(4, 10, C.HELM);
      b(4, 10, 5, 1, C.BODY);
      p(3, 11, C.SKIN);
      p(9, 10, C.METAL); p(10, 11, C.LTMETAL); // wrench on ground
    } else {
      p(5, 12, C.HELM); p(8, 12, C.METAL); p(10, 13, C.LTMETAL);
      p(3, 13, C.DARK); p(6, 13, C.GEAR);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const armOff = [0, -1, 0, 1][step];
  // Helmet
  b(7, 3, 3, 2, C.HELM); p(6, 4, C.HELM);
  // Goggles on helmet
  p(8, 3, C.LTMETAL); p(9, 3, C.LTMETAL);
  // Face
  p(7, 5, C.SKIN); p(8, 5, C.DKSKIN);
  // Body with patches
  b(6, 6, 4, 3, C.BODY); p(6, 6, C.LTOLIVE);
  p(7, 7, C.GEAR); p(8, 8, C.GEAR); // patches
  // Tool belt
  b(6, 9, 4, 1, C.KHAKI);
  p(10, 9, C.METAL); // tools on belt
  // Wrench held out
  p(10, 6 + armOff, C.METAL); p(11, 6 + armOff, C.LTMETAL);
  p(11, 5 + armOff, C.METAL); // wrench head
  // Backpack with tools
  p(5, 7, C.GEAR); p(5, 8, C.DKOLIVE);
  p(5, 6, C.METAL); // tool sticking out
  // Legs
  p(7, 10, C.BROWN); p(8, 10 + Math.abs(legOff), C.BROWN);
  p(7, 11, C.DARK); p(8, 11, C.DARK);
}

// 11: Paratrooper — Jetpack with flames
function drawParatrooper(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 4, C.HELM); p(8, 4, C.HELM);
      p(7, 5, C.SKIN);
      b(6, 6, 4, 3, C.BODY);
      p(5, 7, C.METAL); p(5, 8, C.DKMETAL); // jetpack sparking
      p(5, 9, C.ORANGE);
      p(7, 9, C.BROWN); p(9, 9, C.BROWN);
    } else if (frame === 5) {
      p(4, 9, C.HELM);
      b(4, 9, 5, 1, C.BODY);
      p(3, 10, C.METAL); p(3, 11, C.DKMETAL);
      p(9, 10, C.DARK);
    } else {
      p(5, 12, C.HELM); p(3, 12, C.METAL); p(8, 12, C.DARK);
      p(10, 13, C.BROWN); p(4, 13, C.DKMETAL);
    }
    return;
  }
  const step = frame;
  const hover = [0, -1, 0, -1][step]; // floating up/down
  const flicker = step % 2;
  // Elevated position (floating)
  // Helmet
  b(7, 2 + hover, 3, 2, C.HELM); p(9, 2 + hover, C.DARK);
  // Face
  p(7, 4 + hover, C.SKIN); p(8, 4 + hover, C.DKSKIN);
  // Body
  b(6, 5 + hover, 4, 3, C.BODY); p(6, 5 + hover, C.LTOLIVE);
  // Jetpack on back
  b(4, 5 + hover, 2, 3, C.METAL); p(4, 5 + hover, C.LTMETAL);
  p(5, 7 + hover, C.DKMETAL);
  // Jet flames below
  p(4, 8 + hover, C.FLAME); p(5, 8 + hover, C.FLAME);
  p(4, 9 + hover, flicker ? C.LTFLAME : C.ORANGE);
  p(5, 9 + hover, flicker ? C.ORANGE : C.LTFLAME);
  if (flicker) { p(4, 10 + hover, C.ORANGE); }
  else { p(5, 10 + hover, C.ORANGE); }
  // Arms
  p(6, 6 + hover, C.BODY); p(10, 6 + hover, C.BODY);
  // Legs (dangling)
  p(7, 8 + hover, C.BROWN); p(8, 8 + hover, C.BROWN);
  p(7, 9 + hover, C.DARK); p(8, 9 + hover + flicker, C.DARK);
}

// 13: Iron Mage (Armor Officer) — Heavy coat, rally gesture
function drawArmorOfficer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 4, C.DARK); p(8, 4, C.DARK); // beret
      p(7, 5, C.SKIN);
      b(6, 6, 4, 4, C.DKOLIVE); p(6, 6, C.BODY);
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      b(4, 10, 6, 1, C.DKOLIVE);
      p(3, 10, C.DARK); p(10, 10, C.DARK);
      p(5, 11, C.BROWN);
    } else {
      p(5, 12, C.DARK); p(8, 12, C.DKOLIVE);
      p(10, 13, C.BROWN); p(3, 13, C.DARK);
    }
    return;
  }
  const step = frame;
  const armOff = [0, -1, -1, 0][step]; // rally gesture
  const legOff = [0, 1, 0, -1][step];
  // Cap/beret
  b(7, 3, 3, 1, C.DARK); p(6, 3, C.DARK);
  p(7, 2, C.DARK); p(8, 2, C.DGRAY); // beret top
  // Face
  p(7, 4, C.SKIN); p(8, 4, C.DKSKIN);
  // Officer coat (longer, darker olive)
  b(6, 5, 4, 5, C.DKOLIVE); p(6, 5, C.BODY); // highlight
  p(9, 9, C.DARK); // shadow
  // Epaulettes
  p(5, 5, C.METAL); p(10, 5, C.METAL);
  // Rally arm raised
  p(10, 4 + armOff, C.BODY); p(11, 3 + armOff, C.BODY); // arm up
  p(11, 2 + armOff, C.SKIN); // fist
  // Belt with insignia
  b(6, 8, 4, 1, C.KHAKI); p(8, 8, C.METAL);
  // Legs under coat
  p(7 + legOff, 10, C.BROWN); p(8 - legOff, 10, C.BROWN);
  p(7 + legOff, 11, C.DARK); p(8 - legOff, 11, C.DARK);
}

// 14: Haste Mage (Signals Officer) — Radio antenna, speed lines
function drawSignalsOfficer(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 4, C.DARK); p(8, 4, C.DARK);
      p(7, 5, C.SKIN);
      b(6, 6, 4, 4, C.BODY); p(6, 6, C.LTOLIVE);
      p(5, 5, C.METAL); p(5, 4, C.LTMETAL); // antenna breaking
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      b(4, 10, 6, 1, C.BODY);
      p(3, 10, C.DARK); p(10, 10, C.DARK);
      p(5, 11, C.METAL);
    } else {
      p(5, 12, C.DARK); p(8, 12, C.METAL);
      p(3, 13, C.BODY); p(10, 13, C.DARK);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const wave = step % 2;
  // Cap
  b(7, 3, 3, 1, C.DARK); p(6, 3, C.DARK);
  p(7, 2, C.DGRAY);
  // Face
  p(7, 4, C.SKIN); p(8, 4, C.DKSKIN);
  // Body
  b(6, 5, 4, 4, C.BODY); p(6, 5, C.LTOLIVE);
  // Radio antenna on back
  p(5, 5, C.METAL); p(5, 4, C.METAL); p(5, 3, C.LTMETAL);
  p(5, 2, C.LTMETAL); p(4, 1, C.LTBLUE); // antenna tip
  // Speed-wave lines (animated)
  if (wave) {
    p(2, 6, C.LTBLUE); p(1, 7, C.BLUE); p(3, 8, C.LTBLUE);
  } else {
    p(3, 6, C.BLUE); p(2, 7, C.LTBLUE); p(1, 8, C.BLUE);
  }
  // Belt
  b(6, 8, 4, 1, C.KHAKI);
  // Epaulettes
  p(5, 5, C.METAL); p(10, 5, C.METAL);
  // Legs
  p(7 + legOff, 9, C.BROWN); p(8 - legOff, 9, C.BROWN);
  p(7 + legOff, 10, C.DARK); p(8 - legOff, 10, C.DARK);
}

// 15: Mist Mage (Smoke Operator) — Smoke cloud around body
function drawSmokeOperator(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 4, C.DARK); p(8, 4, C.DARK);
      p(7, 5, C.SKIN);
      b(6, 6, 4, 4, C.BODY);
      p(4, 7, C.SMOKE); p(11, 6, C.LTSMOKE); // smoke dissipating
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      b(4, 10, 6, 1, C.BODY);
      p(3, 9, C.SMOKE); p(10, 9, C.LTSMOKE);
      p(5, 11, C.DARK);
    } else {
      p(5, 12, C.DARK); p(8, 12, C.SMOKE);
      p(3, 13, C.LTSMOKE); p(10, 13, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const smokePhase = step;
  // Cap
  b(7, 3, 3, 1, C.DARK); p(6, 3, C.DARK);
  p(7, 2, C.DGRAY);
  // Face
  p(7, 4, C.SKIN); p(8, 4, C.DKSKIN);
  // Body
  b(6, 5, 4, 4, C.BODY); p(6, 5, C.LTOLIVE);
  // Smoke cloud pixels around body (shifting)
  const smokePositions = [
    [[3, 5], [4, 3], [11, 6], [12, 4], [3, 8], [11, 9]],
    [[4, 4], [3, 6], [12, 5], [11, 3], [2, 7], [12, 8]],
    [[3, 3], [5, 4], [11, 5], [12, 6], [4, 9], [10, 8]],
    [[4, 5], [3, 4], [12, 3], [11, 7], [3, 9], [11, 4]],
  ];
  const spos = smokePositions[smokePhase % 4];
  for (let i = 0; i < spos.length; i++) {
    p(spos[i][0], spos[i][1], i % 2 === 0 ? C.SMOKE : C.LTSMOKE);
  }
  // Smoke grenade in hand
  p(10, 6, C.DGRAY); p(10, 7, C.MGRAY);
  // Belt
  b(6, 8, 4, 1, C.KHAKI);
  // Legs
  p(7 + legOff, 9, C.BROWN); p(8 - legOff, 9, C.BROWN);
  p(7 + legOff, 10, C.DARK); p(8 - legOff, 10, C.DARK);
}

// 16: Heal Mage (Combat Surgeon) — Medical cross, healing glow
function drawCombatSurgeon(c: any, o: number[], frame: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (frame >= 4) {
    if (frame === 4) {
      p(7, 4, C.DARK); p(8, 4, C.DARK);
      p(7, 5, C.SKIN);
      b(6, 6, 4, 4, C.BODY);
      p(10, 6, C.RED); p(10, 7, C.WHITE); p(10, 8, C.RED); // cross falling
      p(7, 10, C.BROWN); p(9, 10, C.BROWN);
    } else if (frame === 5) {
      b(4, 10, 6, 1, C.BODY);
      p(3, 10, C.DARK);
      p(9, 10, C.RED); p(10, 11, C.WHITE);
      p(5, 11, C.DARK);
    } else {
      p(5, 12, C.DARK); p(8, 12, C.RED); p(9, 13, C.WHITE);
      p(3, 13, C.LTGREEN); p(11, 12, C.BODY);
    }
    return;
  }
  const step = frame;
  const legOff = [0, 1, 0, -1][step];
  const glow = step % 2;
  // Cap
  b(7, 3, 3, 1, C.DARK); p(6, 3, C.DARK);
  p(7, 2, C.DGRAY); p(8, 2, C.RED); // red cross on cap
  // Face
  p(7, 4, C.SKIN); p(8, 4, C.DKSKIN);
  // Body
  b(6, 5, 4, 4, C.BODY); p(6, 5, C.LTOLIVE);
  // Red cross on chest
  p(8, 6, C.RED); p(7, 7, C.RED); p(8, 7, C.WHITE); p(9, 7, C.RED);
  p(8, 8, C.RED);
  // Healing glow around (green, pulsing)
  if (glow) {
    p(4, 5, C.LTGREEN); p(11, 5, C.GREEN); p(5, 9, C.LTGREEN);
    p(12, 8, C.GREEN);
  } else {
    p(5, 4, C.GREEN); p(12, 6, C.LTGREEN); p(4, 8, C.GREEN);
    p(11, 9, C.LTGREEN);
  }
  // Epaulettes
  p(5, 5, C.METAL); p(10, 5, C.METAL);
  // Belt
  b(6, 8, 4, 1, C.KHAKI);
  // Medical bag
  p(5, 6, C.WHITE); p(5, 7, C.RED);
  // Legs
  p(7 + legOff, 9, C.BROWN); p(8 - legOff, 9, C.BROWN);
  p(7 + legOff, 10, C.DARK); p(8 - legOff, 10, C.DARK);
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
        <canvas ref={pvRef} data-label="Military Creeps (Preview)" data-columns='["Infantry","Scout","Heavy Trooper","Recruit","Field Medic","Tank Commander","Fire Team","Cargo Carrier","Riot Trooper","Recon Operative","Combat Engineer","Paratrooper","Armor Officer","Signals Officer","Smoke Operator","Combat Surgeon"]' data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]' style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }} />
        <canvas ref={cRef} data-label="Military Creeps" data-columns='["Infantry","Scout","Heavy Trooper","Recruit","Field Medic","Tank Commander","Fire Team","Cargo Carrier","Riot Trooper","Recon Operative","Combat Engineer","Paratrooper","Armor Officer","Signals Officer","Smoke Operator","Combat Surgeon"]' data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]' style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', width: COLS * CELL * 2, border: '1px solid #1a2a1a' }} />
      </div>
      <div style={{ color: '#556644', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Sheet:</b> {COLS * CELL}x{ROWS * CELL}px ({COLS * CELL / PX}x{ROWS * CELL / PX} logical) — {CELL}x{CELL} cells</p>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Phaser:</b> <code style={{ color: '#4488ff' }}>{"this.load.spritesheet('military_creeps','military_creeps.png',{frameWidth:32,frameHeight:32})"}</code></p>
        <p style={{ margin: '2px 0' }}><b style={{ color: '#8fbc8f' }}>Layout:</b> {COLS} cols (creep types) x {ROWS} rows (4 walk + 3 death). Types: {NAMES.join(', ')}</p>
      </div>
    </div>
  );
}
