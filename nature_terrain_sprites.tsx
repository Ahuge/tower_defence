/**
 * Nature Terrain Sprite Generator — Ancient Grove terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: forest floor (ground)
 *   1: ancient trees (blocked type 1)
 *   2: enchanted spring frame 0 (blocked type 2)
 *   3: enchanted spring frame 1 (blocked type 2, animated)
 *   4: enchanted spring frame 2 (blocked type 2, animated)
 *   5: mushroom rings (NoBuild terrain)
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
    base: '#1a2a12',
    leaf: '#2a3a22',
    leafBright: '#334428',
    dot: '#253318',
  },
  tree: {
    bark: '#553311',
    barkDark: '#442208',
    moss: '#338833',
    mossDim: '#226622',
    ring: '#664422',
    edge: '#665522',
    highlight: '#448844',
    top: '#447733',
  },
  spring: {
    deep: '#225544',
    sparkle: '#88ffcc',
    sparkleMid: '#55cc99',
    sparkleDim: '#338866',
    edge: '#2a6655',
    glow: '#44aa88',
  },
  noBuild: {
    base: '#1a2a12',
    mushroom: '#aa6644',
    mushroomDim: '#885533',
    spore: '#aabb55',
    sporeDim: '#778833',
  },
  doodad: {
    green: '#55aa44',
    brown: '#885533',
    red: '#cc4444',
    yellow: '#ddcc44',
    pink: '#cc88aa',
    blue: '#5588cc',
    dark: '#2a3a22',
    white: '#ccddbb',
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
  // Fallen leaf details scattered
  p(ctx, ox, oy, 2, 3, c.leaf); p(ctx, ox, oy, 3, 3, c.leaf);
  p(ctx, ox, oy, 8, 1, c.leafBright); p(ctx, ox, oy, 9, 2, c.leaf);
  p(ctx, ox, oy, 1, 8, c.leaf); p(ctx, ox, oy, 2, 8, c.leafBright);
  p(ctx, ox, oy, 11, 6, c.leaf); p(ctx, ox, oy, 12, 7, c.leaf);
  p(ctx, ox, oy, 5, 11, c.leafBright); p(ctx, ox, oy, 6, 11, c.leaf);
  p(ctx, ox, oy, 10, 10, c.leaf); p(ctx, ox, oy, 4, 6, c.dot);
  p(ctx, ox, oy, 7, 4, c.dot); p(ctx, ox, oy, 12, 12, c.dot);
  // Subtle earth texture
  for (let gx = 0; gx < G; gx += 5) {
    for (let gy = 0; gy < G; gy += 5) {
      p(ctx, ox, oy, gx, gy, c.dot);
    }
  }
  ctx.strokeStyle = c.leaf;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawTree(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.tree;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.bark);
  // Inner bark darker
  b(ctx, ox, oy, 2, 2, 10, 10, c.barkDark);
  // Tree ring pattern (top face view)
  for (let a = 0; a < 12; a++) {
    const rx = 7 + Math.round(4 * Math.cos(a * Math.PI / 6));
    const ry = 7 + Math.round(4 * Math.sin(a * Math.PI / 6));
    p(ctx, ox, oy, rx, ry, c.ring);
  }
  for (let a = 0; a < 8; a++) {
    const rx = 7 + Math.round(2 * Math.cos(a * Math.PI / 4));
    const ry = 7 + Math.round(2 * Math.sin(a * Math.PI / 4));
    p(ctx, ox, oy, rx, ry, c.ring);
  }
  // Moss patches
  b(ctx, ox, oy, 2, 3, 2, 2, c.moss);
  b(ctx, ox, oy, 10, 8, 2, 3, c.mossDim);
  p(ctx, ox, oy, 5, 10, c.moss);
  // Center highlight
  p(ctx, ox, oy, 6, 6, c.highlight); p(ctx, ox, oy, 7, 7, c.top);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  // Moss on exposed edges
  if (!n) { p(ctx, ox, oy, 3, 0, c.moss); p(ctx, ox, oy, 9, 0, c.mossDim); }
  if (!s) { p(ctx, ox, oy, 5, G - 1, c.moss); p(ctx, ox, oy, 11, G - 1, c.mossDim); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.moss); p(ctx, ox, oy, 0, 10, c.mossDim); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.mossDim); p(ctx, ox, oy, G - 1, 8, c.moss); }
  if (n) { for (let px = 4; px < G - 3; px += 4) p(ctx, ox, oy, px, 0, c.ring); }
  if (s) { for (let px = 4; px < G - 3; px += 4) p(ctx, ox, oy, px, G - 1, c.ring); }
  if (w) { for (let py = 4; py < G - 3; py += 4) p(ctx, ox, oy, 0, py, c.ring); }
  if (e) { for (let py = 4; py < G - 3; py += 4) p(ctx, ox, oy, G - 1, py, c.ring); }
}

function drawSpring(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.spring;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Water ripple rings
  for (let gy = 2; gy < G; gy += 4) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glow);
  }
  // Animated sparkle particles
  const s1x = (3 + frame * 4) % (G - 2);
  const s1y = (2 + frame * 3) % (G - 2);
  const s2x = (9 + frame * 2) % (G - 2);
  const s2y = (8 + frame * 4) % (G - 2);
  const s3x = (6 + frame * 5) % (G - 2);
  const s3y = (5 + frame * 2) % (G - 2);
  p(ctx, ox, oy, s1x, s1y, c.sparkle);
  p(ctx, ox, oy, s1x + 1, s1y, c.sparkleMid);
  p(ctx, ox, oy, s2x, s2y, c.sparkleMid);
  p(ctx, ox, oy, s2x, s2y + 1, c.sparkleDim);
  p(ctx, ox, oy, s3x, s3y, c.sparkle);
  // Ripple lines
  const ripY = (1 + frame * 4) % G;
  b(ctx, ox, oy, 3, ripY, 4, 1, c.sparkleMid);
  b(ctx, ox, oy, 8, (ripY + 5) % G, 3, 1, c.sparkleDim);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.sparkleDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.sparkleDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.sparkleDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.sparkleDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Scattered earth texture
  for (let gx = 0; gx < G; gx += 5) {
    for (let gy = 0; gy < G; gy += 5) {
      p(ctx, ox, oy, gx, gy, PAL.ground.dot);
    }
  }
  // Mushroom ring pattern (circle of dots)
  const cx = 7, cy = 7;
  for (let a = 0; a < 8; a++) {
    const mx = cx + Math.round(4 * Math.cos(a * Math.PI / 4));
    const my = cy + Math.round(4 * Math.sin(a * Math.PI / 4));
    p(ctx, ox, oy, mx, my, c.mushroom);
    // Cap highlight
    if (a % 2 === 0) p(ctx, ox, oy, mx, my - 1, c.mushroomDim);
  }
  // Spore particles
  p(ctx, ox, oy, 5, 5, c.spore); p(ctx, ox, oy, 9, 6, c.sporeDim);
  p(ctx, ox, oy, 6, 9, c.spore); p(ctx, ox, oy, 8, 4, c.sporeDim);
  // Center
  p(ctx, ox, oy, 6, 6, c.spore); p(ctx, ox, oy, 7, 7, c.spore);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.sporeDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.sporeDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.sporeDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.sporeDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.mushroom); p(ctx, ox, oy, 7, 0, c.mushroom); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.mushroom); p(ctx, ox, oy, 7, G - 1, c.mushroom); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.mushroom); p(ctx, ox, oy, 0, 7, c.mushroom); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.mushroom); p(ctx, ox, oy, G - 1, 7, c.mushroom); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Mushroom
      p(ctx, ox, oy, 6, 5, d.red); p(ctx, ox, oy, 7, 5, d.red);
      p(ctx, ox, oy, 5, 6, d.red); p(ctx, ox, oy, 8, 6, d.red);
      p(ctx, ox, oy, 6, 6, d.white); p(ctx, ox, oy, 7, 6, d.red);
      p(ctx, ox, oy, 6, 7, d.brown); p(ctx, ox, oy, 7, 7, d.brown);
      p(ctx, ox, oy, 6, 8, d.brown); p(ctx, ox, oy, 7, 8, d.brown);
      break;
    case 1: // Fern
      p(ctx, ox, oy, 7, 4, d.green);
      p(ctx, ox, oy, 6, 5, d.green); p(ctx, ox, oy, 8, 5, d.green);
      p(ctx, ox, oy, 5, 6, d.green); p(ctx, ox, oy, 7, 6, d.green); p(ctx, ox, oy, 9, 6, d.green);
      p(ctx, ox, oy, 4, 7, d.green); p(ctx, ox, oy, 6, 7, d.green); p(ctx, ox, oy, 10, 7, d.green);
      p(ctx, ox, oy, 7, 8, d.brown);
      break;
    case 2: // Flower
      p(ctx, ox, oy, 7, 5, d.pink); p(ctx, ox, oy, 6, 6, d.pink);
      p(ctx, ox, oy, 8, 6, d.pink); p(ctx, ox, oy, 7, 7, d.pink);
      p(ctx, ox, oy, 7, 6, d.yellow);
      p(ctx, ox, oy, 7, 8, d.green); p(ctx, ox, oy, 7, 9, d.green);
      break;
    case 3: // Acorn
      p(ctx, ox, oy, 7, 5, d.brown);
      p(ctx, ox, oy, 6, 6, d.brown); p(ctx, ox, oy, 7, 6, d.brown); p(ctx, ox, oy, 8, 6, d.brown);
      p(ctx, ox, oy, 6, 7, '#996633'); p(ctx, ox, oy, 7, 7, '#996633'); p(ctx, ox, oy, 8, 7, '#996633');
      p(ctx, ox, oy, 7, 8, '#996633');
      break;
    case 4: // Bee
      p(ctx, ox, oy, 5, 6, d.white); p(ctx, ox, oy, 9, 6, d.white);
      p(ctx, ox, oy, 6, 6, d.yellow); p(ctx, ox, oy, 7, 6, d.dark);
      p(ctx, ox, oy, 8, 6, d.yellow);
      p(ctx, ox, oy, 6, 7, d.yellow); p(ctx, ox, oy, 7, 7, d.dark); p(ctx, ox, oy, 8, 7, d.yellow);
      break;
    case 5: // Butterfly
      p(ctx, ox, oy, 5, 5, d.blue); p(ctx, ox, oy, 9, 5, d.blue);
      p(ctx, ox, oy, 4, 6, d.blue); p(ctx, ox, oy, 10, 6, d.blue);
      p(ctx, ox, oy, 5, 6, d.pink); p(ctx, ox, oy, 9, 6, d.pink);
      p(ctx, ox, oy, 7, 6, d.brown);
      p(ctx, ox, oy, 5, 7, d.blue); p(ctx, ox, oy, 9, 7, d.blue);
      p(ctx, ox, oy, 7, 7, d.brown);
      break;
    case 6: // Moss patch
      b(ctx, ox, oy, 5, 6, 4, 3, d.green);
      p(ctx, ox, oy, 4, 7, d.green); p(ctx, ox, oy, 9, 7, d.green);
      p(ctx, ox, oy, 6, 5, '#44aa44');
      p(ctx, ox, oy, 7, 8, d.dark);
      break;
    case 7: // Fallen log
      b(ctx, ox, oy, 3, 6, 8, 2, d.brown);
      b(ctx, ox, oy, 3, 6, 8, 1, '#775533');
      p(ctx, ox, oy, 3, 6, '#664422'); p(ctx, ox, oy, 10, 7, '#664422');
      p(ctx, ox, oy, 5, 6, d.green); // moss on log
      break;
  }
}

export default function NatureTerrainSprites() {
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
      drawTree(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawSpring(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a1408';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#55aa44';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Ancient Tree', 'Spring 0', 'Spring 1', 'Spring 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#0a1408';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#55aa44';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Grove', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#55aa44', background: '#0a1408' }}>
      <h2 data-label="Nature Terrain">Nature Terrain Sprites — Ancient Grove</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#55aa44' : '#1a2a12', color: view === 'preview' ? '#0a1408' : '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#55aa44' : '#1a2a12', color: view === 'actual' ? '#0a1408' : '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'nature_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2a12', color: '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'nature_terrain_doodads.png')} style={{ background: '#1a2a12', color: '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#338822' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Nature Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #55aa4433' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #55aa4433' }} />
      <h3>Ancient Grove Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #55aa4433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #55aa4433' }} />
    </div>
  );
}
