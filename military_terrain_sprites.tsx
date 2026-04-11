/**
 * Military Terrain Sprite Generator — Forward Operating Base terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: cracked concrete + dirt (ground)
 *   1: ruined buildings with interior detail (blocked type 1)
 *   2: burning rubble frame 0 (blocked type 2)
 *   3: burning rubble frame 1 (blocked type 2, animated)
 *   4: burning rubble frame 2 (blocked type 2, animated)
 *   5: bomb craters + barbed wire (NoBuild terrain)
 *
 * Doodads row 0: 8 types (sandbag wall, barbed wire coil, shell casings,
 *   broken glass, tire tracks, crater, flag pole, ammo crate)
 */
import React, { useRef, useEffect, useState } from 'react';

const T = 28;
const G = 14;
const PX = 2;
const VARIANTS = 16;
const TERRAIN_ROWS = 6;
const DOODAD_COLS = 8;
const DOODAD_ROWS = 1;

const PAL = {
  ground: {
    base: '#1a1918',
    baseLt: '#1e1d1c',
    accent: '#211f1e',
    accentDk: '#151414',
  },
  building: {
    wall: '#585550',
    wallDk: '#3e3c38',
    wallLt: '#686560',
    floor: '#353330',
    window: '#1a1a1e',
    windowFrame: '#4a4840',
    rubble: '#444440',
    rubbleDk: '#2a2a28',
    beam: '#4a4a42',
    beamLt: '#5a5a52',
    roof: '#504e48',
    door: '#302e28',
    edge: '#6a6860',
    pipe: '#667766',
  },
  fire: {
    rubble: '#442820',
    rubbleLt: '#553828',
    flame: '#ff6622',
    flameMid: '#cc4411',
    flameDim: '#883311',
    flameHot: '#ffcc44',
    ember: '#ffaa44',
    emberDim: '#dd7722',
    edge: '#332218',
    smoke: '#444446',
    smokeLt: '#555558',
    ash: '#333330',
    glow: '#664422',
  },
  noBuild: {
    dirt: '#282420',
    dirtLt: '#322e28',
    dirtDk: '#1e1c18',
    scorch: '#1a1818',
    scorchRing: '#3a3028',
    wire: '#666666',
    wireDk: '#444444',
    wireBarb: '#888888',
    rubble: '#3a3630',
    puddle: '#282830',
  },
  doodad: {
    olive: '#556633',
    oliveLt: '#667744',
    steel: '#888888',
    steelDk: '#666666',
    dark: '#2a2a28',
    rust: '#884422',
    rustLt: '#aa5533',
    sand: '#aa9966',
    sandLt: '#bbaa77',
    red: '#cc3322',
    glass: '#6688aa',
    wire: '#666666',
    brass: '#ccaa44',
    brassLt: '#ddbb55',
  },
};

function p(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, color: string) {
  if (gx < 0 || gx >= G || gy < 0 || gy >= G) return;
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, PX, PX);
}

function b(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, w * PX, h * PX);
}

function hasN(idx: number) { return !!(idx & 8); }
function hasE(idx: number) { return !!(idx & 4); }
function hasS(idx: number) { return !!(idx & 2); }
function hasW(idx: number) { return !!(idx & 1); }

// Seeded random for consistent texture variation per tile
function tileRand(idx: number, seed: number): number {
  let h = (idx * 374761 + seed * 668265) | 0;
  h = ((h ^ (h >> 13)) * 1103515) | 0;
  return ((h ^ (h >> 16)) & 0x7fff) / 0x7fff;
}

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  // Dark concrete/dirt base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle worn spots (neutral grey tint)
  p(ctx, ox, oy, 5, 3, c.baseLt);
  p(ctx, ox, oy, 10, 8, c.accent);
  p(ctx, ox, oy, 2, 11, c.baseLt);
  // One darker depression
  p(ctx, ox, oy, 8, 5, c.accentDk);
}

function drawBuilding(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.building;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Floor base
  b(ctx, ox, oy, 0, 0, G, G, c.floor);
  // Outer walls (thick, with damage)
  b(ctx, ox, oy, 0, 0, G, G, c.wallDk);
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.wall);
  b(ctx, ox, oy, 2, 2, G - 4, G - 4, c.floor);
  // Interior detail: floor tiles
  for (let gx = 3; gx < G - 3; gx += 2) {
    for (let gy = 3; gy < G - 3; gy += 2) {
      p(ctx, ox, oy, gx, gy, c.rubbleDk);
    }
  }
  // Windows (with frames)
  if (!n || idx % 3 === 0) {
    b(ctx, ox, oy, 3, 2, 2, 2, c.windowFrame);
    b(ctx, ox, oy, 3, 2, 1, 1, c.window);
    b(ctx, ox, oy, 9, 2, 2, 2, c.windowFrame);
    b(ctx, ox, oy, 9, 2, 1, 1, c.window);
  }
  if (!s || idx % 5 === 0) {
    b(ctx, ox, oy, 3, G - 4, 2, 2, c.windowFrame);
    b(ctx, ox, oy, 4, G - 3, 1, 1, c.window);
    b(ctx, ox, oy, 9, G - 4, 2, 2, c.windowFrame);
    b(ctx, ox, oy, 10, G - 3, 1, 1, c.window);
  }
  // Door (on one side based on variant)
  if (!s && idx % 2 === 0) {
    b(ctx, ox, oy, 6, G - 3, 2, 3, c.door);
    p(ctx, ox, oy, 7, G - 2, c.beam);
  }
  // Support beams (cross pattern)
  b(ctx, ox, oy, 6, 2, 1, G - 4, c.beam);
  b(ctx, ox, oy, 2, 6, G - 4, 1, c.beam);
  p(ctx, ox, oy, 6, 6, c.beamLt);
  // Roof remnants
  b(ctx, ox, oy, 2, 2, 3, 1, c.roof);
  b(ctx, ox, oy, G - 5, 2, 3, 1, c.roof);
  // Exposed pipe
  if (idx % 4 < 2) {
    p(ctx, ox, oy, 10, 5, c.pipe); p(ctx, ox, oy, 10, 6, c.pipe);
    p(ctx, ox, oy, 10, 7, c.pipe);
  }
  // Rubble scatter on interior
  p(ctx, ox, oy, 4, 5, c.rubble); p(ctx, ox, oy, 8, 8, c.rubble);
  p(ctx, ox, oy, 5, 9, c.rubbleDk); p(ctx, ox, oy, 7, 4, c.rubble);
  // Edges — raised wall on exposed sides, continuity on interior sides
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edge); p(ctx, ox, oy, 5, 0, c.wallLt); p(ctx, ox, oy, 8, 0, c.rubble); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.edge); p(ctx, ox, oy, 4, G - 1, c.rubble); p(ctx, ox, oy, 11, G - 1, c.wallLt); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.edge); p(ctx, ox, oy, 0, 5, c.wallLt); p(ctx, ox, oy, 0, 10, c.rubble); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.edge); p(ctx, ox, oy, G - 1, 4, c.rubble); p(ctx, ox, oy, G - 1, 9, c.wallLt); }
  // Connected-side seams
  if (n) { for (let gx = 3; gx < G - 2; gx += 3) p(ctx, ox, oy, gx, 0, c.rubbleDk); }
  if (s) { for (let gx = 4; gx < G - 2; gx += 3) p(ctx, ox, oy, gx, G - 1, c.rubbleDk); }
  if (w) { for (let gy = 3; gy < G - 2; gy += 3) p(ctx, ox, oy, 0, gy, c.rubbleDk); }
  if (e) { for (let gy = 4; gy < G - 2; gy += 3) p(ctx, ox, oy, G - 1, gy, c.rubbleDk); }
}

function drawFire(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.fire;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Scorched rubble base
  b(ctx, ox, oy, 0, 0, G, G, c.rubble);
  // Rubble texture (broken chunks)
  for (let gy = 1; gy < G - 1; gy += 2) {
    for (let gx = 1; gx < G - 1; gx += 3) {
      p(ctx, ox, oy, gx, gy, c.rubbleLt);
      p(ctx, ox, oy, gx + 1, gy + 1, c.edge);
    }
  }
  // Glow on ground
  b(ctx, ox, oy, 3, 8, 3, 2, c.glow);
  b(ctx, ox, oy, 8, 6, 3, 2, c.glow);
  // Flame 1 (main fire — tall, flickers with frame)
  const f1x = 3 + (frame % 2);
  const f1base = 8;
  const f1h = 4 + (frame === 1 ? 1 : 0);
  for (let fy = 0; fy < f1h; fy++) {
    const y = f1base - fy;
    const col = fy === 0 ? c.flameDim : fy === 1 ? c.flameMid : fy === 2 ? c.flame : c.flameHot;
    p(ctx, ox, oy, f1x, y, col);
    p(ctx, ox, oy, f1x + 1, y, col);
    if (fy >= 2) p(ctx, ox, oy, f1x + 2, y, c.flameMid);
  }
  // Flame tip
  p(ctx, ox, oy, f1x + (frame === 2 ? 1 : 0), f1base - f1h, c.ember);
  // Flame 2 (smaller, offset)
  const f2x = 9 + (frame === 0 ? 0 : frame === 1 ? 1 : 0);
  const f2base = 7;
  for (let fy = 0; fy < 3; fy++) {
    const y = f2base - fy;
    const col = fy === 0 ? c.flameDim : fy === 1 ? c.flame : c.ember;
    p(ctx, ox, oy, f2x, y, col);
    if (fy < 2) p(ctx, ox, oy, f2x + 1, y, c.flameMid);
  }
  // Smoke wisps (drift with frame)
  p(ctx, ox, oy, 2 + frame, 2, c.smoke);
  p(ctx, ox, oy, 4 + frame, 1, c.smokeLt);
  p(ctx, ox, oy, 10 - frame, 2, c.smoke);
  p(ctx, ox, oy, 11 - frame, 1, c.smokeLt);
  // Embers (scattered, shift with frame)
  p(ctx, ox, oy, (5 + frame * 3) % G, (3 + frame) % G, c.ember);
  p(ctx, ox, oy, (11 + frame * 2) % G, (5 + frame * 2) % G, c.emberDim);
  p(ctx, ox, oy, (1 + frame * 4) % G, (9 - frame) % G, c.ember);
  // Ash layer
  p(ctx, ox, oy, 2, 10, c.ash); p(ctx, ox, oy, 7, 11, c.ash);
  p(ctx, ox, oy, 11, 10, c.ash); p(ctx, ox, oy, 5, 12, c.ash);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Disturbed dirt base
  b(ctx, ox, oy, 0, 0, G, G, c.dirt);
  // Texture variation
  for (let gx = 1; gx < G - 1; gx += 2) {
    for (let gy = 1; gy < G - 1; gy += 3) {
      p(ctx, ox, oy, gx, gy, c.dirtLt);
    }
  }
  // Central crater depression (dark circle)
  b(ctx, ox, oy, 4, 4, 6, 6, c.scorch);
  b(ctx, ox, oy, 5, 5, 4, 4, c.dirtDk);
  // Scorch ring around crater
  p(ctx, ox, oy, 3, 5, c.scorchRing); p(ctx, ox, oy, 3, 8, c.scorchRing);
  p(ctx, ox, oy, 10, 5, c.scorchRing); p(ctx, ox, oy, 10, 8, c.scorchRing);
  p(ctx, ox, oy, 5, 3, c.scorchRing); p(ctx, ox, oy, 8, 3, c.scorchRing);
  p(ctx, ox, oy, 5, 10, c.scorchRing); p(ctx, ox, oy, 8, 10, c.scorchRing);
  // Crater bottom
  p(ctx, ox, oy, 6, 6, c.puddle); p(ctx, ox, oy, 7, 7, c.puddle);
  // Rubble chunks ejected from blast
  p(ctx, ox, oy, 2, 2, c.rubble); p(ctx, ox, oy, 11, 3, c.rubble);
  p(ctx, ox, oy, 1, 10, c.rubble); p(ctx, ox, oy, 12, 11, c.rubble);
  // Barbed wire fragments on edges
  if (!n) {
    b(ctx, ox, oy, 2, 0, 4, 1, c.wire);
    p(ctx, ox, oy, 3, 0, c.wireBarb); p(ctx, ox, oy, 5, 0, c.wireBarb);
    b(ctx, ox, oy, 9, 0, 3, 1, c.wireDk);
  }
  if (!s) {
    b(ctx, ox, oy, 3, G - 1, 4, 1, c.wire);
    p(ctx, ox, oy, 4, G - 1, c.wireBarb); p(ctx, ox, oy, 6, G - 1, c.wireBarb);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 3, 1, 3, c.wire);
    p(ctx, ox, oy, 0, 4, c.wireBarb);
    b(ctx, ox, oy, 0, 9, 1, 3, c.wireDk);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 4, 1, 3, c.wire);
    p(ctx, ox, oy, G - 1, 5, c.wireBarb);
  }
  // Connected-side transitions
  if (n) { b(ctx, ox, oy, 5, 0, 4, 2, c.scorch); }
  if (s) { b(ctx, ox, oy, 5, G - 2, 4, 2, c.scorch); }
  if (w) { b(ctx, ox, oy, 0, 5, 2, 4, c.scorch); }
  if (e) { b(ctx, ox, oy, G - 2, 5, 2, 4, c.scorch); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Sandbag wall (stacked)
      b(ctx, ox, oy, 3, 7, 8, 2, d.sand);
      b(ctx, ox, oy, 3, 7, 8, 1, d.sandLt);
      b(ctx, ox, oy, 4, 5, 6, 2, d.sand);
      b(ctx, ox, oy, 4, 5, 6, 1, d.sandLt);
      // Gaps between sandbags
      p(ctx, ox, oy, 6, 7, d.dark); p(ctx, ox, oy, 9, 7, d.dark);
      p(ctx, ox, oy, 6, 5, d.dark); p(ctx, ox, oy, 8, 5, d.dark);
      break;
    case 1: // Barbed wire coil (3D spiral look)
      b(ctx, ox, oy, 3, 5, 8, 1, d.wire);
      b(ctx, ox, oy, 3, 7, 8, 1, d.wire);
      // Cross wires
      p(ctx, ox, oy, 4, 4, d.wire); p(ctx, ox, oy, 6, 4, d.wire);
      p(ctx, ox, oy, 8, 4, d.wire); p(ctx, ox, oy, 10, 4, d.wire);
      p(ctx, ox, oy, 5, 6, d.wire); p(ctx, ox, oy, 7, 6, d.wire);
      p(ctx, ox, oy, 9, 6, d.wire);
      p(ctx, ox, oy, 4, 8, d.wire); p(ctx, ox, oy, 6, 8, d.wire);
      p(ctx, ox, oy, 8, 8, d.wire); p(ctx, ox, oy, 10, 8, d.wire);
      // Barbs (bright spots)
      p(ctx, ox, oy, 5, 5, '#aaaaaa'); p(ctx, ox, oy, 7, 5, '#aaaaaa');
      p(ctx, ox, oy, 9, 5, '#aaaaaa'); p(ctx, ox, oy, 6, 7, '#aaaaaa');
      p(ctx, ox, oy, 8, 7, '#aaaaaa');
      break;
    case 2: // Shell casings (scattered brass)
      p(ctx, ox, oy, 4, 6, d.brass); p(ctx, ox, oy, 5, 7, d.brassLt);
      p(ctx, ox, oy, 6, 5, d.brass); p(ctx, ox, oy, 8, 7, d.brass);
      p(ctx, ox, oy, 9, 8, d.brassLt); p(ctx, ox, oy, 7, 9, d.brass);
      p(ctx, ox, oy, 10, 6, d.brass); p(ctx, ox, oy, 5, 9, d.brassLt);
      break;
    case 3: // Broken glass shards
      p(ctx, ox, oy, 5, 5, d.glass); p(ctx, ox, oy, 7, 6, d.glass);
      p(ctx, ox, oy, 6, 7, d.glass); p(ctx, ox, oy, 8, 5, d.glass);
      p(ctx, ox, oy, 9, 8, '#88aabb'); p(ctx, ox, oy, 6, 9, '#88aabb');
      p(ctx, ox, oy, 4, 7, d.glass); p(ctx, ox, oy, 10, 7, '#88aabb');
      break;
    case 4: // Tire tracks (parallel ruts)
      b(ctx, ox, oy, 3, 4, 1, 6, d.dark);
      b(ctx, ox, oy, 6, 4, 1, 6, d.dark);
      for (let gy = 4; gy < 10; gy += 2) {
        p(ctx, ox, oy, 4, gy, d.dark); p(ctx, ox, oy, 5, gy + 1, d.dark);
      }
      // Mud splatter
      p(ctx, ox, oy, 2, 5, '#3a3422'); p(ctx, ox, oy, 7, 8, '#3a3422');
      break;
    case 5: // Small crater
      p(ctx, ox, oy, 5, 5, d.dark); p(ctx, ox, oy, 6, 5, d.dark); p(ctx, ox, oy, 7, 5, d.dark); p(ctx, ox, oy, 8, 5, d.dark);
      p(ctx, ox, oy, 5, 6, d.dark); p(ctx, ox, oy, 8, 6, d.dark);
      p(ctx, ox, oy, 5, 7, d.dark); p(ctx, ox, oy, 8, 7, d.dark);
      p(ctx, ox, oy, 5, 8, d.dark); p(ctx, ox, oy, 6, 8, d.dark); p(ctx, ox, oy, 7, 8, d.dark); p(ctx, ox, oy, 8, 8, d.dark);
      // Crater depth
      p(ctx, ox, oy, 6, 6, '#1a1a18'); p(ctx, ox, oy, 7, 7, '#1a1a18');
      // Ejecta
      p(ctx, ox, oy, 4, 4, d.rust); p(ctx, ox, oy, 9, 4, d.rustLt);
      p(ctx, ox, oy, 4, 9, d.rustLt); p(ctx, ox, oy, 9, 9, d.rust);
      // Scorch marks
      p(ctx, ox, oy, 3, 6, '#332820'); p(ctx, ox, oy, 10, 7, '#332820');
      break;
    case 6: // Flag pole with torn flag
      b(ctx, ox, oy, 7, 2, 1, 9, d.steel);
      p(ctx, ox, oy, 7, 2, d.steelDk);
      // Torn flag
      b(ctx, ox, oy, 8, 2, 3, 2, d.olive);
      b(ctx, ox, oy, 8, 4, 2, 1, d.olive);
      p(ctx, ox, oy, 8, 2, d.red);
      p(ctx, ox, oy, 10, 3, d.oliveLt);
      // Base
      b(ctx, ox, oy, 6, 10, 3, 1, d.steelDk);
      break;
    case 7: // Ammo crate (detailed)
      b(ctx, ox, oy, 4, 4, 6, 6, d.olive);
      b(ctx, ox, oy, 5, 5, 4, 4, d.dark);
      // Corner rivets
      p(ctx, ox, oy, 4, 4, d.steel); p(ctx, ox, oy, 9, 4, d.steel);
      p(ctx, ox, oy, 4, 9, d.steel); p(ctx, ox, oy, 9, 9, d.steel);
      // Cross straps
      b(ctx, ox, oy, 4, 6, 6, 1, d.oliveLt);
      b(ctx, ox, oy, 6, 4, 1, 6, d.oliveLt);
      // Label marking
      p(ctx, ox, oy, 5, 7, d.red); p(ctx, ox, oy, 6, 7, d.red);
      p(ctx, ox, oy, 7, 7, d.red);
      // Lid latch
      p(ctx, ox, oy, 7, 5, d.steel);
      break;
  }
}

export default function MilitaryTerrainSprites() {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const terrainPreviewRef = useRef<HTMLCanvasElement>(null);
  const doodadRef = useRef<HTMLCanvasElement>(null);
  const doodadPreviewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    const tc = terrainRef.current!;
    tc.width = VARIANTS * T;
    tc.height = TERRAIN_ROWS * T;
    const tCtx = tc.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;
    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * T;
      drawGround(tCtx, ox, 0 * T);
      drawBuilding(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawFire(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#111110';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#aa8844';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Building', 'Fire 0', 'Fire 1', 'Fire 2', 'Crater'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }
    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;
    for (let i = 0; i < DOODAD_COLS; i++) drawDoodad(dCtx, i * T, 0, i);
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#111110';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#aa8844';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Warzone', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#aa8844', background: '#111110' }}>
      <h2 data-label="Military Terrain">Military Terrain Sprites — Forward Operating Base</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#aa8844' : '#2a2828', color: view === 'preview' ? '#111110' : '#aa8844', border: '1px solid #aa8844', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#aa8844' : '#2a2828', color: view === 'actual' ? '#111110' : '#aa8844', border: '1px solid #aa8844', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'military_terrain_tileset.png')} style={{ marginRight: 8, background: '#2a2828', color: '#aa8844', border: '1px solid #aa8844', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'military_terrain_doodads.png')} style={{ background: '#2a2828', color: '#aa8844', border: '1px solid #aa8844', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#665533' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Military Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa884433' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa884433' }} data-label="military_terrain_tileset" />
      <h3>Warzone Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa884433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa884433' }} data-label="military_terrain_doodads" />
    </div>
  );
}
