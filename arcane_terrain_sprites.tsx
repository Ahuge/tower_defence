/**
 * Arcane Terrain Sprite Generator — Crystal Caverns terrain.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for arcane pools (swirling runes).
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: dark purple stone (ground)
 *   1: crystal walls (blocked type 1)
 *   2: arcane pool frame 0 (blocked type 2)
 *   3: arcane pool frame 1 (blocked type 2, animated)
 *   4: arcane pool frame 2 (blocked type 2, animated)
 *   5: arcane circles (NoBuild terrain — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: arcane doodads (8 types)
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
    base: '#1a1828',
    grid: '#2a2838',
    gridBright: '#332e48',
    dot: '#251e40',
  },
  crystal: {
    fill: '#4a3870',
    dark: '#3a2858',
    highlight: '#8866ff',
    highlightDim: '#6644cc',
    edge: '#5a4888',
    facet: '#aa88ff',
    facetDim: '#7755cc',
    shine: '#ccaaff',
  },
  pool: {
    deep: '#220044',
    rune: '#aa88ff',
    runeMid: '#8866cc',
    runeDim: '#6644aa',
    edge: '#331166',
    glow: '#7744cc',
  },
  noBuild: {
    base: '#1a1828',
    circle: '#6644aa',
    circleDim: '#4a3388',
    node: '#8866cc',
    nodeDim: '#553399',
  },
  doodad: {
    purple: '#aa88ff',
    pink: '#cc66ff',
    blue: '#6688ff',
    white: '#ddccff',
    dim: '#4a3870',
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
  for (let i = 0; i < G; i += 4) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, c.grid);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, c.grid);
  }
  for (let gx = 0; gx < G; gx += 4) {
    for (let gy = 0; gy < G; gy += 4) {
      p(ctx, ox, oy, gx, gy, c.gridBright);
    }
  }
  p(ctx, ox, oy, 3, 5, c.dot);
  p(ctx, ox, oy, 10, 3, c.dot);
  p(ctx, ox, oy, 7, 10, c.dot);
  p(ctx, ox, oy, 1, 11, c.grid);
  p(ctx, ox, oy, 11, 8, c.grid);
  ctx.strokeStyle = c.grid;
  ctx.globalAlpha = 0.2;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawCrystal(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.crystal;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 3, 3, 8, 8, c.dark);
  // Crystal facets
  b(ctx, ox, oy, 4, 4, 3, 2, c.highlight);
  b(ctx, ox, oy, 8, 5, 2, 3, c.highlightDim);
  b(ctx, ox, oy, 5, 8, 4, 2, c.facetDim);
  // Bright highlights
  p(ctx, ox, oy, 5, 4, c.facet);
  p(ctx, ox, oy, 9, 6, c.facet);
  p(ctx, ox, oy, 6, 9, c.shine);
  // Center crystal point
  p(ctx, ox, oy, 6, 6, c.shine);
  p(ctx, ox, oy, 7, 7, c.facet);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  // Facet highlights on exposed edges
  if (!n) { p(ctx, ox, oy, 3, 0, c.facet); p(ctx, ox, oy, 8, 0, c.highlight); p(ctx, ox, oy, 11, 0, c.facetDim); }
  if (!s) { p(ctx, ox, oy, 4, G - 1, c.highlight); p(ctx, ox, oy, 10, G - 1, c.facet); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.facet); p(ctx, ox, oy, 0, 9, c.highlight); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.highlight); p(ctx, ox, oy, G - 1, 10, c.facetDim); }
  // Dim connected edges
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.facetDim); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.facetDim); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.facetDim); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.facetDim); }
}

function drawPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.pool;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Background swirl pattern
  for (let gy = 1; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glow);
  }
  // Animated runes that shift per frame
  const runeOff = frame * 3;
  const r1x = (2 + runeOff) % (G - 2);
  const r1y = (3 + frame * 4) % (G - 2);
  const r2x = (8 + runeOff) % (G - 2);
  const r2y = (7 + frame * 2) % (G - 2);
  // Rune symbol 1
  p(ctx, ox, oy, r1x, r1y, c.rune);
  p(ctx, ox, oy, r1x + 1, r1y, c.runeMid);
  p(ctx, ox, oy, r1x, r1y + 1, c.runeMid);
  // Rune symbol 2
  p(ctx, ox, oy, r2x, r2y, c.runeMid);
  p(ctx, ox, oy, r2x + 1, r2y + 1, c.rune);
  p(ctx, ox, oy, r2x - 1, r2y, c.runeDim);
  // Swirl lines
  const swirlY = (1 + frame * 5) % G;
  b(ctx, ox, oy, 2, swirlY, 5, 1, c.rune);
  b(ctx, ox, oy, 7, (swirlY + 6) % G, 4, 1, c.runeMid);
  // Bright nodes
  p(ctx, ox, oy, 4, (3 + frame * 4) % G, c.rune);
  p(ctx, ox, oy, 10, (8 + frame * 3) % G, c.rune);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.runeDim); p(ctx, ox, oy, 5, 0, c.runeMid); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.runeDim); p(ctx, ox, oy, 8, G - 1, c.runeMid); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.runeDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.runeDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let i = 0; i < G; i += 4) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, PAL.ground.grid);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, PAL.ground.grid);
  }
  // Rune circle pattern
  const cx = 7, cy = 7, r = 4;
  for (let a = 0; a < 16; a++) {
    const ax = cx + Math.round(r * Math.cos(a * Math.PI / 8));
    const ay = cy + Math.round(r * Math.sin(a * Math.PI / 8));
    p(ctx, ox, oy, ax, ay, c.circle);
  }
  // Inner circle
  for (let a = 0; a < 8; a++) {
    const ax = cx + Math.round(2 * Math.cos(a * Math.PI / 4));
    const ay = cy + Math.round(2 * Math.sin(a * Math.PI / 4));
    p(ctx, ox, oy, ax, ay, c.circleDim);
  }
  // Center node
  p(ctx, ox, oy, 6, 6, c.node);
  p(ctx, ox, oy, 7, 7, c.node);
  // Connectivity lines
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.circleDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.circleDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.circleDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.circleDim); }
  // Exposed edges
  if (!n) { p(ctx, ox, oy, 6, 0, c.node); p(ctx, ox, oy, 7, 0, c.node); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.node); p(ctx, ox, oy, 7, G - 1, c.node); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.node); p(ctx, ox, oy, 0, 7, c.node); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.node); p(ctx, ox, oy, G - 1, 7, c.node); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Floating rune particle
      p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.purple);
      p(ctx, ox, oy, 6, 6, d.white);
      p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 5, 7, d.dim);
      p(ctx, ox, oy, 8, 7, d.dim);
      break;
    case 1: // Crystal shard
      p(ctx, ox, oy, 7, 3, d.white);
      p(ctx, ox, oy, 6, 4, d.purple);
      p(ctx, ox, oy, 7, 4, d.purple);
      p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.blue);
      p(ctx, ox, oy, 6, 6, d.dim);
      p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 6, 7, d.dim);
      p(ctx, ox, oy, 7, 7, d.dim);
      break;
    case 2: // Magic orb
      p(ctx, ox, oy, 6, 5, d.blue);
      p(ctx, ox, oy, 7, 5, d.blue);
      p(ctx, ox, oy, 5, 6, d.blue);
      p(ctx, ox, oy, 6, 6, d.white);
      p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.blue);
      p(ctx, ox, oy, 5, 7, d.blue);
      p(ctx, ox, oy, 6, 7, d.purple);
      p(ctx, ox, oy, 7, 7, d.purple);
      p(ctx, ox, oy, 8, 7, d.dim);
      p(ctx, ox, oy, 6, 8, d.dim);
      p(ctx, ox, oy, 7, 8, d.dim);
      break;
    case 3: // Spell circle
      for (let a = 0; a < 8; a++) {
        const ax = 7 + Math.round(3 * Math.cos(a * Math.PI / 4));
        const ay = 7 + Math.round(3 * Math.sin(a * Math.PI / 4));
        p(ctx, ox, oy, ax, ay, d.purple);
      }
      p(ctx, ox, oy, 7, 7, d.white);
      break;
    case 4: // Arcane dust
      p(ctx, ox, oy, 3, 4, d.dim);
      p(ctx, ox, oy, 8, 3, d.purple);
      p(ctx, ox, oy, 5, 7, d.dim);
      p(ctx, ox, oy, 10, 6, d.purple);
      p(ctx, ox, oy, 7, 10, d.dim);
      break;
    case 5: // Purple flame
      p(ctx, ox, oy, 7, 4, d.white);
      p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.pink);
      p(ctx, ox, oy, 8, 5, d.purple);
      p(ctx, ox, oy, 6, 6, d.purple);
      p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.dim);
      p(ctx, ox, oy, 7, 7, d.dim);
      break;
    case 6: // Rune stone
      b(ctx, ox, oy, 5, 5, 4, 4, d.dim);
      p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.purple);
      p(ctx, ox, oy, 5, 6, d.purple);
      p(ctx, ox, oy, 8, 7, d.purple);
      p(ctx, ox, oy, 6, 8, d.purple);
      p(ctx, ox, oy, 7, 8, d.purple);
      p(ctx, ox, oy, 6, 6, d.white);
      break;
    case 7: // Mana wisp
      p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 6, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.purple);
      p(ctx, ox, oy, 5, 7, d.dim);
      p(ctx, ox, oy, 9, 7, d.dim);
      p(ctx, ox, oy, 7, 7, d.blue);
      break;
  }
}

export default function ArcaneTerrainSprites() {
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
      drawCrystal(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) {
        drawPool(tCtx, ox, (2 + f) * T, v, f);
      }
      drawNoBuild(tCtx, ox, 5 * T, v);
    }

    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a0818';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#8866ff';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Crystal Wall', 'Arcane Pool 0', 'Arcane Pool 1', 'Arcane Pool 2', 'NoBuild'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }

    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;
    for (let i = 0; i < DOODAD_COLS; i++) {
      drawDoodad(dCtx, i * T, 0, i);
    }

    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#0a0818';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#8866ff';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Arcane', 4, 20 + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#8866ff', background: '#0a0818' }}>
      <h2 data-label="Arcane Terrain">Arcane Terrain Sprites — Crystal Caverns</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#8866ff' : '#1a1828', color: view === 'preview' ? '#0a0818' : '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#8866ff' : '#1a1828', color: view === 'actual' ? '#0a0818' : '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'arcane_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a1828', color: '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'arcane_terrain_doodads.png')} style={{ background: '#1a1828', color: '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#553399' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Arcane Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #8866ff33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #8866ff33' }} />
      <h3>Arcane Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #8866ff33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #8866ff33' }} />
    </div>
  );
}
