/**
 * Void Terrain Sprite Generator — Rift Dimension terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: near-black void floor (ground)
 *   1: void rock (blocked type 1)
 *   2: void pool frame 0 (blocked type 2)
 *   3: void pool frame 1 (blocked type 2, animated)
 *   4: void pool frame 2 (blocked type 2, animated)
 *   5: rift bridges (NoBuild terrain)
 *
 * Doodads row 0: 8 types
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
    base: '#0a0816',
    grid: '#1a1428',
    gridBright: '#221a33',
    dot: '#150e22',
  },
  rock: {
    fill: '#110822',
    dark: '#0a0418',
    crack: '#ff33cc',
    crackDim: '#aa2288',
    edge: '#1a1030',
    glow: '#cc22aa',
  },
  pool: {
    deep: '#040008',
    rift: '#22ccaa',
    riftMid: '#188877',
    riftDim: '#0e5544',
    edge: '#0a1818',
    glow: '#1a8866',
  },
  noBuild: {
    base: '#0a0816',
    bridge: '#22ccaa',
    bridgeDim: '#166655',
    shimmer: '#33ddbb',
    shimmerDim: '#1a8866',
  },
  doodad: {
    teal: '#22ccaa',
    magenta: '#ff33cc',
    purple: '#8833aa',
    white: '#ccddee',
    dark: '#110822',
    dim: '#0e5544',
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

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Faint teal grid
  for (let i = 0; i < G; i += 4) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, c.grid);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, c.grid);
  }
  for (let gx = 0; gx < G; gx += 4) {
    for (let gy = 0; gy < G; gy += 4) {
      p(ctx, ox, oy, gx, gy, c.gridBright);
    }
  }
  p(ctx, ox, oy, 5, 3, c.dot); p(ctx, ox, oy, 9, 8, c.dot);
  p(ctx, ox, oy, 2, 11, c.grid); p(ctx, ox, oy, 11, 5, c.grid);
  ctx.strokeStyle = c.grid;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.rock;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 2, 2, 10, 10, c.dark);
  // Energy cracks - magenta lightning pattern
  p(ctx, ox, oy, 3, 3, c.crack); p(ctx, ox, oy, 4, 4, c.crackDim);
  p(ctx, ox, oy, 5, 4, c.crack); p(ctx, ox, oy, 6, 5, c.crackDim);
  p(ctx, ox, oy, 7, 5, c.crack);
  p(ctx, ox, oy, 8, 6, c.crack); p(ctx, ox, oy, 9, 7, c.crackDim);
  p(ctx, ox, oy, 10, 8, c.crack);
  // Second crack branch
  p(ctx, ox, oy, 5, 8, c.crackDim); p(ctx, ox, oy, 6, 9, c.crack);
  p(ctx, ox, oy, 7, 9, c.crackDim); p(ctx, ox, oy, 8, 10, c.crack);
  // Glow around cracks
  p(ctx, ox, oy, 4, 3, c.glow); p(ctx, ox, oy, 6, 6, c.glow);
  p(ctx, ox, oy, 9, 8, c.glow);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  if (!n) { p(ctx, ox, oy, 5, 0, c.crack); p(ctx, ox, oy, 10, 0, c.crackDim); }
  if (!s) { p(ctx, ox, oy, 4, G - 1, c.crackDim); p(ctx, ox, oy, 9, G - 1, c.crack); }
  if (!w) { p(ctx, ox, oy, 0, 5, c.crack); p(ctx, ox, oy, 0, 10, c.crackDim); }
  if (!e) { p(ctx, ox, oy, G - 1, 4, c.crackDim); p(ctx, ox, oy, G - 1, 9, c.crack); }
  if (n) { for (let px = 4; px < G - 3; px += 4) p(ctx, ox, oy, px, 0, c.crackDim); }
  if (s) { for (let px = 4; px < G - 3; px += 4) p(ctx, ox, oy, px, G - 1, c.crackDim); }
  if (w) { for (let py = 4; py < G - 3; py += 4) p(ctx, ox, oy, 0, py, c.crackDim); }
  if (e) { for (let py = 4; py < G - 3; py += 4) p(ctx, ox, oy, G - 1, py, c.crackDim); }
}

function drawPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.pool;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Background glow lines
  for (let gy = 1; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glow);
  }
  // Animated teal rift energy swirling
  const swirlOff = frame * 3;
  // Swirl pattern 1
  const sx1 = (2 + swirlOff) % (G - 2);
  const sy1 = (3 + frame * 4) % (G - 2);
  b(ctx, ox, oy, sx1, sy1, 3, 1, c.rift);
  p(ctx, ox, oy, sx1 + 1, sy1 + 1, c.riftMid);
  // Swirl pattern 2
  const sx2 = (8 + swirlOff) % (G - 2);
  const sy2 = (9 + frame * 2) % (G - 2);
  b(ctx, ox, oy, sx2, sy2, 2, 1, c.riftMid);
  p(ctx, ox, oy, sx2 - 1, sy2, c.riftDim);
  // Energy nodes
  p(ctx, ox, oy, 4, (2 + frame * 5) % G, c.rift);
  p(ctx, ox, oy, 10, (7 + frame * 3) % G, c.rift);
  p(ctx, ox, oy, 7, (11 + frame * 4) % G, c.riftMid);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.riftDim); p(ctx, ox, oy, 6, 0, c.riftMid); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.riftDim); p(ctx, ox, oy, 8, G - 1, c.riftMid); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.riftDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.riftDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let i = 0; i < G; i += 4) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, PAL.ground.grid);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, PAL.ground.grid);
  }
  // Bridge edge lines
  b(ctx, ox, oy, 0, 5, G, 1, c.bridge);
  b(ctx, ox, oy, 0, 8, G, 1, c.bridge);
  b(ctx, ox, oy, 5, 0, 1, G, c.bridgeDim);
  b(ctx, ox, oy, 8, 0, 1, G, c.bridgeDim);
  // Shimmer dots (unstable)
  p(ctx, ox, oy, 3, 6, c.shimmer); p(ctx, ox, oy, 10, 7, c.shimmerDim);
  p(ctx, ox, oy, 6, 3, c.shimmerDim); p(ctx, ox, oy, 7, 10, c.shimmer);
  // Center
  b(ctx, ox, oy, 6, 6, 2, 2, c.shimmer);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.bridgeDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.bridgeDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.bridgeDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.bridgeDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.shimmer); p(ctx, ox, oy, 7, 0, c.shimmer); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.shimmer); p(ctx, ox, oy, 7, G - 1, c.shimmer); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.shimmer); p(ctx, ox, oy, 0, 7, c.shimmer); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.shimmer); p(ctx, ox, oy, G - 1, 7, c.shimmer); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Rift spark
      p(ctx, ox, oy, 7, 5, d.teal); p(ctx, ox, oy, 6, 6, d.teal);
      p(ctx, ox, oy, 8, 6, d.dim); p(ctx, ox, oy, 7, 7, d.teal);
      p(ctx, ox, oy, 5, 5, d.dim); p(ctx, ox, oy, 9, 7, d.dim);
      break;
    case 1: // Void particle
      p(ctx, ox, oy, 6, 6, d.purple); p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 6, 7, d.purple); p(ctx, ox, oy, 7, 7, d.dark);
      p(ctx, ox, oy, 5, 5, d.magenta); p(ctx, ox, oy, 8, 8, d.magenta);
      break;
    case 2: // Floating debris
      p(ctx, ox, oy, 5, 5, d.purple); p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 8, 6, d.purple); p(ctx, ox, oy, 9, 7, d.purple);
      p(ctx, ox, oy, 6, 8, d.purple); p(ctx, ox, oy, 7, 8, d.purple);
      break;
    case 3: // Reality tear
      p(ctx, ox, oy, 4, 4, d.magenta); p(ctx, ox, oy, 5, 5, d.white);
      p(ctx, ox, oy, 6, 5, d.magenta); p(ctx, ox, oy, 7, 6, d.white);
      p(ctx, ox, oy, 8, 7, d.magenta); p(ctx, ox, oy, 9, 8, d.white);
      p(ctx, ox, oy, 10, 9, d.magenta);
      break;
    case 4: // Eye
      p(ctx, ox, oy, 5, 6, d.magenta); p(ctx, ox, oy, 6, 5, d.magenta);
      p(ctx, ox, oy, 7, 5, d.magenta); p(ctx, ox, oy, 8, 6, d.magenta);
      p(ctx, ox, oy, 6, 6, d.teal); p(ctx, ox, oy, 7, 6, d.white);
      p(ctx, ox, oy, 5, 7, d.magenta); p(ctx, ox, oy, 8, 7, d.magenta);
      p(ctx, ox, oy, 6, 7, d.magenta); p(ctx, ox, oy, 7, 7, d.magenta);
      break;
    case 5: // Tentacle tip
      p(ctx, ox, oy, 7, 4, d.purple); p(ctx, ox, oy, 7, 5, d.purple);
      p(ctx, ox, oy, 6, 6, d.purple); p(ctx, ox, oy, 7, 6, d.magenta);
      p(ctx, ox, oy, 6, 7, d.magenta); p(ctx, ox, oy, 5, 8, d.purple);
      p(ctx, ox, oy, 6, 8, d.purple); p(ctx, ox, oy, 5, 9, d.dark);
      break;
    case 6: // Rift crystal
      p(ctx, ox, oy, 7, 4, d.teal); p(ctx, ox, oy, 6, 5, d.teal);
      p(ctx, ox, oy, 7, 5, d.white); p(ctx, ox, oy, 8, 5, d.teal);
      p(ctx, ox, oy, 6, 6, d.dim); p(ctx, ox, oy, 7, 6, d.teal);
      p(ctx, ox, oy, 8, 6, d.dim); p(ctx, ox, oy, 7, 7, d.dim);
      break;
    case 7: // Void portal
      for (let a = 0; a < 8; a++) {
        const ax = 7 + Math.round(3 * Math.cos(a * Math.PI / 4));
        const ay = 7 + Math.round(3 * Math.sin(a * Math.PI / 4));
        p(ctx, ox, oy, ax, ay, d.teal);
      }
      p(ctx, ox, oy, 6, 6, d.dark); p(ctx, ox, oy, 7, 6, d.dark);
      p(ctx, ox, oy, 6, 7, d.dark); p(ctx, ox, oy, 7, 7, d.magenta);
      break;
  }
}

export default function VoidTerrainSprites() {
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
      drawRock(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawPool(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#030006';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#22ccaa';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Void Rock', 'Void Pool 0', 'Void Pool 1', 'Void Pool 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#030006';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#22ccaa';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Void', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#22ccaa', background: '#030006' }}>
      <h2 data-label="Void Terrain">Void Terrain Sprites — Rift Dimension</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#22ccaa' : '#0a0816', color: view === 'preview' ? '#030006' : '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#22ccaa' : '#0a0816', color: view === 'actual' ? '#030006' : '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'void_terrain_tileset.png')} style={{ marginRight: 8, background: '#0a0816', color: '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'void_terrain_doodads.png')} style={{ background: '#0a0816', color: '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#0e5544' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Void Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ccaa33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ccaa33' }} />
      <h3>Rift Dimension Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ccaa33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ccaa33' }} />
    </div>
  );
}
