/**
 * Infernal Terrain Sprite Generator — Hellscape terrain (lava, fire, brimstone).
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for lava pools.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: brimstone ground (volcanic floor)
 *   1: obsidian rock / stalagmite (blocked type 1)
 *   2: lava pool frame 0 (blocked type 2, animated)
 *   3: lava pool frame 1 (animated — lava flow)
 *   4: lava pool frame 2 (animated)
 *   5: cracked brimstone (NoBuild — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: hellscape doodads (8 types)
 */
import React, { useRef, useEffect, useState } from 'react';

// Tile size in pixels (matches TILE_SIZE in game)
const T = 28;
// Grid units per tile
const G = 14;
// Pixels per grid unit
const PX = 2;
// Auto-tile variants
const VARIANTS = 16;
// Terrain rows
const TERRAIN_ROWS = 6;
// Doodad types
const DOODAD_COLS = 8;
const DOODAD_ROWS = 1;

// Infernal color palettes
const PAL = {
  // Brimstone ground
  ground: {
    base: '#1a0e08', crack: '#2a1810', warm: '#331500',
    hotCrack: '#ff440033', grid: '#2a1508',
  },
  // Obsidian rock / stalagmite
  obsidian: {
    fill: '#110808', mid: '#221100', highlight: '#332211',
    dark: '#0a0404', glowEdge: '#ff440044', glowBright: '#ff660066',
  },
  // Lava pool
  lava: {
    core: '#ff4400', mid: '#ff6622', bright: '#ffaa44',
    darkEdge: '#cc3300', crust: '#441100', dim: '#aa2200',
    bubble: '#ffcc66',
  },
  // NoBuild cracked brimstone
  nobuild: {
    base: '#2a1508', crack: '#1a0a04', fire: '#ff4400',
    fireGlow: '#ff6622', smoke: '#44333380',
  },
};

// Helper: plot pixel at grid coords
function p(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, color: string) {
  if (gx < 0 || gx >= G || gy < 0 || gy >= G) return;
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, PX, PX);
}

// Helper: plot rectangle at grid coords
function b(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, w * PX, h * PX);
}

// Decode bitmask: N(8) E(4) S(2) W(1)
function hasN(idx: number) { return !!(idx & 8); }
function hasE(idx: number) { return !!(idx & 4); }
function hasS(idx: number) { return !!(idx & 2); }
function hasW(idx: number) { return !!(idx & 1); }

// Seeded pseudo-random for deterministic variation per tile variant
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >> 16) / 32768;
  };
}

// ===================== TERRAIN DRAWERS =====================

function drawBrimstoneGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.ground;
  const rng = seededRand(idx * 31 + 7);

  // Dark volcanic base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Warm undertone patches
  for (let i = 0; i < 8; i++) {
    const gx = Math.floor(rng() * G);
    const gy = Math.floor(rng() * G);
    p(ctx, ox, oy, gx, gy, c.warm);
  }

  // Crack patterns across surface
  const crackStarts = [
    { x: 2, y: 1 }, { x: 8, y: 5 }, { x: 1, y: 9 }, { x: 10, y: 2 },
    { x: 5, y: 11 }, { x: 12, y: 8 },
  ];
  for (const start of crackStarts) {
    let cx = start.x, cy = start.y;
    for (let step = 0; step < 3; step++) {
      p(ctx, ox, oy, cx, cy, c.crack);
      cx += Math.floor(rng() * 3) - 1;
      cy += Math.floor(rng() * 2);
    }
  }

  // Faint orange glow in some cracks (heat from below)
  p(ctx, ox, oy, 3, 6, '#ff440020');
  p(ctx, ox, oy, 9, 3, '#ff440020');
  p(ctx, ox, oy, 6, 10, '#ff440018');
  p(ctx, ox, oy, 11, 7, '#ff440020');

  // Subtle texture variation
  for (let i = 0; i < 5; i++) {
    const gx = Math.floor(rng() * G);
    const gy = Math.floor(rng() * G);
    p(ctx, ox, oy, gx, gy, c.crack);
  }

  // Grid hint
  ctx.strokeStyle = c.grid;
  ctx.globalAlpha = 0.12;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawObsidianRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.obsidian;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Very dark base
  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Angular rocky texture - sharp edges, not smooth
  // Large angular blocks
  b(ctx, ox, oy, 1, 2, 5, 4, c.dark);
  b(ctx, ox, oy, 7, 1, 5, 3, c.dark);
  b(ctx, ox, oy, 3, 7, 6, 4, c.dark);
  b(ctx, ox, oy, 10, 8, 3, 4, c.dark);

  // Mid-tone facets (angular highlights)
  b(ctx, ox, oy, 2, 3, 3, 2, c.mid);
  b(ctx, ox, oy, 8, 2, 3, 1, c.mid);
  b(ctx, ox, oy, 5, 8, 3, 2, c.mid);
  b(ctx, ox, oy, 11, 9, 2, 2, c.mid);

  // Sharp brown highlights on rock faces
  b(ctx, ox, oy, 4, 4, 2, 1, c.highlight);
  b(ctx, ox, oy, 10, 2, 2, 1, c.highlight);
  b(ctx, ox, oy, 1, 10, 3, 1, c.highlight);
  b(ctx, ox, oy, 7, 6, 2, 1, c.highlight);

  // Stalagmite-like pointed shapes
  p(ctx, ox, oy, 4, 1, c.mid);
  p(ctx, ox, oy, 4, 0, c.highlight);
  p(ctx, ox, oy, 11, 5, c.mid);
  p(ctx, ox, oy, 11, 4, c.highlight);

  // Edge highlights on exposed sides (sharp/angular, not smooth)
  if (!n) {
    // Top edge: jagged silhouette + orange glow from lava light
    b(ctx, ox, oy, 0, 0, G, 1, c.highlight);
    // Jagged points
    p(ctx, ox, oy, 3, 0, c.mid);
    p(ctx, ox, oy, 7, 0, c.mid);
    p(ctx, ox, oy, 11, 0, c.mid);
    // Orange lava glow on top edge
    b(ctx, ox, oy, 1, 0, 3, 1, c.glowEdge);
    b(ctx, ox, oy, 6, 0, 4, 1, c.glowEdge);
    b(ctx, ox, oy, 11, 0, 2, 1, c.glowEdge);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.mid);
    // Orange glow from below
    b(ctx, ox, oy, 2, G - 1, 4, 1, c.glowBright);
    b(ctx, ox, oy, 8, G - 1, 3, 1, c.glowBright);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.mid);
    // Side glow
    b(ctx, ox, oy, 0, 3, 1, 4, c.glowEdge);
    b(ctx, ox, oy, 0, 9, 1, 3, c.glowEdge);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.mid);
    // Side glow
    b(ctx, ox, oy, G - 1, 2, 1, 3, c.glowEdge);
    b(ctx, ox, oy, G - 1, 8, 1, 4, c.glowEdge);
  }
}

function drawLavaPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.lava;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark crust base
  b(ctx, ox, oy, 0, 0, G, G, c.crust);

  // Main lava core - bright in center, darker at edges
  b(ctx, ox, oy, 2, 2, G - 4, G - 4, c.core);
  b(ctx, ox, oy, 3, 3, G - 6, G - 6, c.mid);
  b(ctx, ox, oy, 4, 4, G - 8, G - 8, c.bright);

  // Flow direction shifts per frame
  const flowShift = frame * 2;

  // Lava flow streaks (animated direction)
  for (let gy = 2; gy < G - 2; gy += 2) {
    const sx = (flowShift + gy * 3) % 6 + 1;
    b(ctx, ox, oy, sx, gy, 4, 1, c.mid);
    b(ctx, ox, oy, (sx + 5) % (G - 2) + 1, gy + 1, 3, 1, c.core);
  }

  // Bright hotspots in center (pulse with frame)
  const hotColors = [c.bright, c.mid, c.core];
  const hotColor = hotColors[frame % 3];
  b(ctx, ox, oy, 5 + (frame % 2), 5, 3, 2, hotColor);
  b(ctx, ox, oy, 3, 8 - frame, 2, 2, hotColors[(frame + 1) % 3]);
  b(ctx, ox, oy, 9, 4 + frame, 2, 3, hotColors[(frame + 2) % 3]);

  // Bubbles that appear/disappear per frame
  if (frame === 0) {
    p(ctx, ox, oy, 4, 5, c.bubble);
    p(ctx, ox, oy, 10, 8, c.bubble);
    p(ctx, ox, oy, 7, 3, c.bright);
  } else if (frame === 1) {
    p(ctx, ox, oy, 6, 7, c.bubble);
    p(ctx, ox, oy, 3, 10, c.bubble);
    p(ctx, ox, oy, 11, 5, c.bright);
    // Bubble popping ring
    p(ctx, ox, oy, 3, 4, c.mid);
    p(ctx, ox, oy, 5, 4, c.mid);
    p(ctx, ox, oy, 4, 3, c.mid);
  } else {
    p(ctx, ox, oy, 8, 4, c.bubble);
    p(ctx, ox, oy, 5, 11, c.bubble);
    p(ctx, ox, oy, 2, 7, c.bright);
    // Another popping bubble
    p(ctx, ox, oy, 5, 6, c.mid);
    p(ctx, ox, oy, 7, 6, c.mid);
    p(ctx, ox, oy, 6, 5, c.mid);
    p(ctx, ox, oy, 6, 7, c.mid);
  }

  // Dark cooled edges (where lava meets rock)
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 2, c.darkEdge);
    b(ctx, ox, oy, 2, 0, G - 4, 1, c.dim);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 2, G, 2, c.darkEdge);
    b(ctx, ox, oy, 3, G - 1, G - 6, 1, c.dim);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 2, G, c.darkEdge);
    b(ctx, ox, oy, 0, 2, 1, G - 4, c.dim);
  }
  if (!e) {
    b(ctx, ox, oy, G - 2, 0, 2, G, c.darkEdge);
    b(ctx, ox, oy, G - 1, 3, 1, G - 6, c.dim);
  }

  // Glow on connected edges (lava meets lava — no border)
  if (n) b(ctx, ox, oy, 2, 0, G - 4, 1, c.core);
  if (s) b(ctx, ox, oy, 2, G - 1, G - 4, 1, c.core);
  if (w) b(ctx, ox, oy, 0, 2, 1, G - 4, c.core);
  if (e) b(ctx, ox, oy, G - 1, 2, 1, G - 4, c.core);
}

function drawCrackedBrimstone(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.nobuild;
  const rng = seededRand(idx * 47 + 13);

  // Cracked ground base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Darker crack lines forming an irregular pattern
  // Major cracks
  const cracks = [
    [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    [[8, 1], [9, 2], [9, 3], [10, 4], [11, 5], [12, 6]],
    [[3, 8], [4, 9], [5, 10], [6, 10], [7, 11], [8, 12]],
    [[10, 7], [11, 8], [12, 9], [12, 10]],
    [[5, 0], [5, 1], [6, 2], [6, 3], [7, 4]],
  ];

  for (const crack of cracks) {
    for (const [cx, cy] of crack) {
      p(ctx, ox, oy, cx, cy, c.crack);
    }
  }

  // Fire showing through cracks (bright orange/red)
  const fireCracks = [
    [2, 3], [3, 4], [9, 2], [9, 3], [4, 9], [5, 10],
    [11, 8], [6, 2], [7, 11],
  ];
  for (const [fx, fy] of fireCracks) {
    p(ctx, ox, oy, fx, fy, c.fire);
  }

  // Fire glow adjacent to cracks
  p(ctx, ox, oy, 3, 3, c.fireGlow);
  p(ctx, ox, oy, 10, 3, c.fireGlow);
  p(ctx, ox, oy, 5, 9, c.fireGlow);
  p(ctx, ox, oy, 12, 9, c.fireGlow);

  // Smoke wisps (semi-transparent gray patches)
  for (let i = 0; i < 3; i++) {
    const sx = Math.floor(rng() * (G - 2)) + 1;
    const sy = Math.floor(rng() * (G - 4));
    p(ctx, ox, oy, sx, sy, c.smoke);
  }

  // Subtle surface texture variation
  for (let i = 0; i < 6; i++) {
    const gx = Math.floor(rng() * G);
    const gy = Math.floor(rng() * G);
    p(ctx, ox, oy, gx, gy, '#221008');
  }

  // Grid hint (slightly visible)
  ctx.strokeStyle = '#331508';
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

// ===================== DOODAD DRAWERS =====================

function drawInfernalDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);

  switch (type) {
    case 0: // Ember particle
      p(ctx, ox, oy, 6, 6, '#ff8833');
      p(ctx, ox, oy, 7, 5, '#ffaa44');
      p(ctx, ox, oy, 7, 7, '#ff6622');
      p(ctx, ox, oy, 8, 6, '#ffcc55');
      p(ctx, ox, oy, 6, 8, '#ff4400');
      p(ctx, ox, oy, 5, 7, '#ff8833');
      break;

    case 1: // Skull
      // Cranium
      b(ctx, ox, oy, 5, 5, 4, 3, '#ccccbb');
      b(ctx, ox, oy, 6, 4, 2, 1, '#bbbbaa');
      // Eye sockets
      p(ctx, ox, oy, 6, 6, '#332211');
      p(ctx, ox, oy, 8, 6, '#332211');
      // Jaw
      b(ctx, ox, oy, 6, 8, 2, 1, '#aaaaaa');
      p(ctx, ox, oy, 5, 7, '#bbbbaa');
      p(ctx, ox, oy, 8, 7, '#bbbbaa');
      // Teeth
      p(ctx, ox, oy, 6, 8, '#ccccbb');
      p(ctx, ox, oy, 7, 8, '#ccccbb');
      break;

    case 2: // Bone fragment
      p(ctx, ox, oy, 5, 9, '#ddddcc');
      p(ctx, ox, oy, 6, 8, '#ccccbb');
      p(ctx, ox, oy, 7, 8, '#ddddcc');
      p(ctx, ox, oy, 8, 7, '#ccccbb');
      p(ctx, ox, oy, 9, 7, '#bbbbaa');
      // Joint knob
      b(ctx, ox, oy, 4, 9, 2, 2, '#ccccbb');
      break;

    case 3: // Lava crack
      p(ctx, ox, oy, 3, 5, '#ff4400');
      p(ctx, ox, oy, 4, 6, '#ff6622');
      p(ctx, ox, oy, 5, 7, '#ff4400');
      p(ctx, ox, oy, 6, 7, '#ffaa44');
      p(ctx, ox, oy, 7, 8, '#ff6622');
      p(ctx, ox, oy, 8, 9, '#ff4400');
      p(ctx, ox, oy, 9, 9, '#cc3300');
      // Glow around crack
      p(ctx, ox, oy, 4, 5, '#ff440044');
      p(ctx, ox, oy, 5, 6, '#ff440044');
      p(ctx, ox, oy, 7, 7, '#ff440044');
      p(ctx, ox, oy, 8, 8, '#ff440044');
      break;

    case 4: // Fire wisp
      // Hot core
      p(ctx, ox, oy, 7, 8, '#ffcc55');
      p(ctx, ox, oy, 7, 7, '#ffaa44');
      p(ctx, ox, oy, 6, 7, '#ff8833');
      p(ctx, ox, oy, 8, 7, '#ff8833');
      // Flame tendrils upward
      p(ctx, ox, oy, 7, 6, '#ff6622');
      p(ctx, ox, oy, 6, 5, '#ff4400');
      p(ctx, ox, oy, 8, 5, '#ff4400');
      p(ctx, ox, oy, 7, 4, '#cc3300');
      p(ctx, ox, oy, 7, 3, '#aa220066');
      break;

    case 5: // Ash pile
      b(ctx, ox, oy, 5, 9, 4, 2, '#444440');
      b(ctx, ox, oy, 4, 10, 6, 2, '#3a3a38');
      b(ctx, ox, oy, 6, 8, 2, 1, '#4a4a48');
      p(ctx, ox, oy, 5, 9, '#555550');
      p(ctx, ox, oy, 8, 10, '#333330');
      break;

    case 6: // Brimstone crystal
      // Crystal body - dark red/orange angular shape
      b(ctx, ox, oy, 6, 6, 2, 5, '#882200');
      b(ctx, ox, oy, 5, 8, 4, 3, '#772200');
      p(ctx, ox, oy, 7, 5, '#993300');
      p(ctx, ox, oy, 6, 5, '#aa4400');
      // Crystal highlight
      p(ctx, ox, oy, 6, 6, '#cc5500');
      p(ctx, ox, oy, 7, 7, '#bb4400');
      // Facet edge
      p(ctx, ox, oy, 5, 9, '#661100');
      p(ctx, ox, oy, 8, 8, '#661100');
      break;

    case 7: // Charred remains
      // Blackened stump/remains
      b(ctx, ox, oy, 5, 8, 4, 4, '#1a1a18');
      b(ctx, ox, oy, 6, 7, 2, 1, '#222220');
      b(ctx, ox, oy, 4, 10, 6, 2, '#151514');
      // Ember glow on edges
      p(ctx, ox, oy, 5, 8, '#ff440033');
      p(ctx, ox, oy, 8, 9, '#ff440033');
      p(ctx, ox, oy, 4, 11, '#ff440022');
      // Ash specks
      p(ctx, ox, oy, 7, 7, '#333330');
      p(ctx, ox, oy, 9, 10, '#2a2a28');
      break;
  }
}

// ===================== MAIN COMPONENT =====================

export default function InfernalTerrainSprites() {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const terrainPreviewRef = useRef<HTMLCanvasElement>(null);
  const doodadRef = useRef<HTMLCanvasElement>(null);
  const doodadPreviewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    // Render terrain tileset
    const tc = terrainRef.current!;
    tc.width = VARIANTS * T;
    tc.height = TERRAIN_ROWS * T;
    const tCtx = tc.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * T;
      // Row 0: brimstone ground
      drawBrimstoneGround(tCtx, ox, 0 * T, v);
      // Row 1: obsidian rock / stalagmite
      drawObsidianRock(tCtx, ox, 1 * T, v);
      // Rows 2-4: lava pool (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawLavaPool(tCtx, ox, (2 + f) * T, v, f);
      }
      // Row 5: cracked brimstone (NoBuild)
      drawCrackedBrimstone(tCtx, ox, 5 * T, v);
    }

    // Preview with labels
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 160;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a0504';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 160, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#ff8844';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Brimstone', 'Obsidian', 'Lava 0', 'Lava 1', 'Lava 2', 'NoBuild'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }

    // Render doodads
    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;

    for (let i = 0; i < DOODAD_COLS; i++) {
      drawInfernalDoodad(dCtx, i * T, 0, i);
    }

    // Doodad preview
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#1a0e08';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#ff8844';
    dpCtx.font = '11px monospace';
    const doodadLabels = ['Ember', 'Skull', 'Bone', 'Lava Crack', 'Fire Wisp', 'Ash', 'Crystal', 'Charred'];
    for (let i = 0; i < DOODAD_COLS; i++) {
      dpCtx.fillText(doodadLabels[i], 80 + i * T * dScale + 2, 16);
    }

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ff8844', background: '#0a0504' }}>
      <h2 data-label="Infernal Terrain">Infernal Terrain Sprites — Hellscape</h2>
      <p style={{ fontSize: '12px', color: '#886644' }} data-frame-size="28x28">
        Frame size: 28×28 | PX=2, Grid=14×14 | 16 auto-tile variants × 6 rows = 96 terrain frames + 8 doodads
      </p>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#ff4400' : '#331500', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer' }}>
          Preview (3×)
        </button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#ff4400' : '#331500', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer' }}>
          Actual Size
        </button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'infernal_terrain_tileset.png')} style={{ marginRight: 8, background: '#331500', color: '#ff8844', border: '1px solid #ff440044', padding: '4px 12px', cursor: 'pointer' }}>
              Download Tileset
            </button>
            <button onClick={() => download(doodadRef, 'infernal_terrain_doodads.png')} style={{ background: '#331500', color: '#ff8844', border: '1px solid #ff440044', padding: '4px 12px', cursor: 'pointer' }}>
              Download Doodads
            </button>
          </>
        )}
      </div>
      <h3 data-label="Infernal Terrain (Preview)">Terrain Tileset (16 auto-tile variants × 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #331500' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #331500' }} />
      <h3>Hellscape Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #331500' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #331500' }} />
    </div>
  );
}
