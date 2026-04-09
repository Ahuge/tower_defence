/**
 * Aliens Terrain Sprite Generator — Hive Tunnels terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: organic floor (ground)
 *   1: hive walls (blocked type 1)
 *   2: acid pool frame 0 (blocked type 2)
 *   3: acid pool frame 1 (blocked type 2, animated)
 *   4: acid pool frame 2 (blocked type 2, animated)
 *   5: egg chambers (NoBuild terrain)
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
    chitin: '#2a3a22',
    chitinBright: '#334428',
    vein: '#253318',
  },
  wall: {
    fill: '#334418',
    dark: '#223310',
    ridge: '#446622',
    ridgeBright: '#558833',
    edge: '#3a5520',
    bump: '#4a6628',
    highlight: '#66aa33',
  },
  acid: {
    deep: '#113308',
    bubble: '#88ff22',
    bubbleMid: '#55cc11',
    bubbleDim: '#338808',
    edge: '#224410',
    glow: '#44aa11',
  },
  noBuild: {
    base: '#1a2a12',
    egg: '#aaaa66',
    eggDim: '#887744',
    membrane: '#ccddaa',
    membraneDim: '#99aa77',
  },
  doodad: {
    green: '#88ff22',
    slime: '#66cc11',
    chitin: '#446622',
    dark: '#223310',
    yellow: '#aaaa66',
    pale: '#ccddaa',
    red: '#cc4422',
    purple: '#664488',
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
  // Chitin texture — organic bumpy pattern
  p(ctx, ox, oy, 2, 2, c.chitin); p(ctx, ox, oy, 3, 3, c.chitin);
  p(ctx, ox, oy, 7, 1, c.chitinBright); p(ctx, ox, oy, 11, 4, c.chitin);
  p(ctx, ox, oy, 1, 7, c.chitin); p(ctx, ox, oy, 5, 9, c.chitinBright);
  p(ctx, ox, oy, 10, 8, c.chitin); p(ctx, ox, oy, 3, 11, c.chitin);
  p(ctx, ox, oy, 8, 12, c.chitinBright); p(ctx, ox, oy, 12, 11, c.chitin);
  // Veins
  p(ctx, ox, oy, 4, 5, c.vein); p(ctx, ox, oy, 5, 5, c.vein);
  p(ctx, ox, oy, 6, 6, c.vein); p(ctx, ox, oy, 9, 6, c.vein);
  p(ctx, ox, oy, 10, 7, c.vein);
  ctx.strokeStyle = c.chitin;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawWall(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.wall;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 2, 2, 10, 10, c.dark);
  // Shell ridges — organic curved lines
  b(ctx, ox, oy, 3, 4, 8, 1, c.ridge);
  b(ctx, ox, oy, 3, 7, 8, 1, c.ridge);
  b(ctx, ox, oy, 3, 10, 8, 1, c.ridge);
  // Organic bumps
  p(ctx, ox, oy, 4, 3, c.bump); p(ctx, ox, oy, 9, 3, c.bump);
  p(ctx, ox, oy, 5, 5, c.ridgeBright); p(ctx, ox, oy, 8, 6, c.ridgeBright);
  p(ctx, ox, oy, 6, 9, c.bump); p(ctx, ox, oy, 10, 9, c.bump);
  // Highlight
  p(ctx, ox, oy, 6, 6, c.highlight); p(ctx, ox, oy, 7, 7, c.ridgeBright);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  if (!n) { p(ctx, ox, oy, 4, 0, c.ridgeBright); p(ctx, ox, oy, 10, 0, c.bump); }
  if (!s) { p(ctx, ox, oy, 3, G - 1, c.bump); p(ctx, ox, oy, 9, G - 1, c.ridgeBright); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.ridgeBright); p(ctx, ox, oy, 0, 9, c.bump); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.bump); p(ctx, ox, oy, G - 1, 10, c.ridgeBright); }
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.ridge); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.ridge); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.ridge); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.ridge); }
}

function drawAcid(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.acid;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Background glow
  for (let gy = 1; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glow);
  }
  // Animated acid bubbles popping
  const bOff = frame * 3;
  // Bubble cluster 1
  const b1x = (3 + bOff) % (G - 3);
  const b1y = (4 + frame * 4) % (G - 3);
  p(ctx, ox, oy, b1x, b1y, c.bubble);
  p(ctx, ox, oy, b1x + 1, b1y, c.bubbleMid);
  if (frame !== 2) p(ctx, ox, oy, b1x, b1y + 1, c.bubbleMid);
  // Bubble cluster 2
  const b2x = (9 + bOff) % (G - 2);
  const b2y = (8 + frame * 2) % (G - 2);
  p(ctx, ox, oy, b2x, b2y, c.bubbleMid);
  if (frame !== 1) p(ctx, ox, oy, b2x + 1, b2y, c.bubble);
  // Small bubbles
  p(ctx, ox, oy, (5 + frame * 2) % G, (2 + frame * 5) % G, c.bubble);
  p(ctx, ox, oy, (11 + frame) % G, (6 + frame * 3) % G, c.bubbleDim);
  // Pop effect for frame 2
  if (frame === 2) {
    p(ctx, ox, oy, b1x - 1, b1y - 1, c.bubbleDim);
    p(ctx, ox, oy, b1x + 2, b1y - 1, c.bubbleDim);
  }
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.bubbleDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.bubbleDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.bubbleDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.bubbleDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let gx = 0; gx < G; gx += 4) {
    for (let gy = 0; gy < G; gy += 4) {
      p(ctx, ox, oy, gx, gy, PAL.ground.vein);
    }
  }
  // Egg shapes
  // Egg 1
  p(ctx, ox, oy, 4, 4, c.egg); p(ctx, ox, oy, 5, 4, c.egg);
  p(ctx, ox, oy, 4, 5, c.egg); p(ctx, ox, oy, 5, 5, c.membrane);
  p(ctx, ox, oy, 4, 6, c.eggDim); p(ctx, ox, oy, 5, 6, c.eggDim);
  // Egg 2
  p(ctx, ox, oy, 9, 7, c.egg); p(ctx, ox, oy, 10, 7, c.egg);
  p(ctx, ox, oy, 9, 8, c.membrane); p(ctx, ox, oy, 10, 8, c.egg);
  p(ctx, ox, oy, 9, 9, c.eggDim); p(ctx, ox, oy, 10, 9, c.eggDim);
  // Membrane glow
  p(ctx, ox, oy, 3, 5, c.membraneDim); p(ctx, ox, oy, 11, 8, c.membraneDim);
  // Center
  p(ctx, ox, oy, 6, 6, c.egg); p(ctx, ox, oy, 7, 7, c.membrane);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.membraneDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.membraneDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.membraneDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.membraneDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.egg); p(ctx, ox, oy, 7, 0, c.egg); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.egg); p(ctx, ox, oy, 7, G - 1, c.egg); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.egg); p(ctx, ox, oy, 0, 7, c.egg); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.egg); p(ctx, ox, oy, G - 1, 7, c.egg); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Egg sac
      p(ctx, ox, oy, 6, 5, d.yellow); p(ctx, ox, oy, 7, 5, d.yellow);
      p(ctx, ox, oy, 5, 6, d.yellow); p(ctx, ox, oy, 8, 6, d.yellow);
      p(ctx, ox, oy, 6, 6, d.pale); p(ctx, ox, oy, 7, 6, d.pale);
      p(ctx, ox, oy, 5, 7, d.yellow); p(ctx, ox, oy, 8, 7, d.yellow);
      p(ctx, ox, oy, 6, 7, d.yellow); p(ctx, ox, oy, 7, 7, d.yellow);
      p(ctx, ox, oy, 6, 8, d.chitin); p(ctx, ox, oy, 7, 8, d.chitin);
      break;
    case 1: // Acid drip
      p(ctx, ox, oy, 7, 4, d.green); p(ctx, ox, oy, 7, 5, d.slime);
      p(ctx, ox, oy, 7, 6, d.slime); p(ctx, ox, oy, 7, 7, d.green);
      p(ctx, ox, oy, 6, 8, d.green); p(ctx, ox, oy, 7, 8, d.green);
      p(ctx, ox, oy, 8, 8, d.green);
      break;
    case 2: // Chitin shard
      p(ctx, ox, oy, 6, 4, d.chitin); p(ctx, ox, oy, 7, 5, d.chitin);
      p(ctx, ox, oy, 7, 6, d.chitin); p(ctx, ox, oy, 8, 6, d.chitin);
      p(ctx, ox, oy, 6, 7, d.dark); p(ctx, ox, oy, 7, 7, d.chitin);
      break;
    case 3: // Mandible
      p(ctx, ox, oy, 5, 5, d.chitin); p(ctx, ox, oy, 9, 5, d.chitin);
      p(ctx, ox, oy, 4, 6, d.chitin); p(ctx, ox, oy, 10, 6, d.chitin);
      p(ctx, ox, oy, 5, 7, d.chitin); p(ctx, ox, oy, 9, 7, d.chitin);
      p(ctx, ox, oy, 6, 8, d.chitin); p(ctx, ox, oy, 8, 8, d.chitin);
      p(ctx, ox, oy, 7, 8, d.red);
      break;
    case 4: // Cocoon
      p(ctx, ox, oy, 6, 4, d.pale); p(ctx, ox, oy, 7, 4, d.pale);
      p(ctx, ox, oy, 5, 5, d.pale); p(ctx, ox, oy, 8, 5, d.pale);
      p(ctx, ox, oy, 6, 5, d.yellow); p(ctx, ox, oy, 7, 5, d.yellow);
      p(ctx, ox, oy, 5, 6, d.pale); p(ctx, ox, oy, 8, 6, d.pale);
      p(ctx, ox, oy, 6, 6, d.yellow); p(ctx, ox, oy, 7, 6, d.yellow);
      p(ctx, ox, oy, 6, 7, d.pale); p(ctx, ox, oy, 7, 7, d.pale);
      break;
    case 5: // Slime trail
      p(ctx, ox, oy, 4, 5, d.slime); p(ctx, ox, oy, 5, 6, d.slime);
      p(ctx, ox, oy, 6, 6, d.green); p(ctx, ox, oy, 7, 7, d.slime);
      p(ctx, ox, oy, 8, 7, d.slime); p(ctx, ox, oy, 9, 8, d.slime);
      p(ctx, ox, oy, 10, 8, d.green);
      break;
    case 6: // Larvae
      p(ctx, ox, oy, 5, 6, d.pale); p(ctx, ox, oy, 6, 6, d.yellow);
      p(ctx, ox, oy, 7, 6, d.yellow); p(ctx, ox, oy, 8, 6, d.yellow);
      p(ctx, ox, oy, 9, 6, d.pale);
      p(ctx, ox, oy, 5, 7, d.chitin); p(ctx, ox, oy, 9, 7, d.chitin);
      break;
    case 7: // Compound eye
      p(ctx, ox, oy, 5, 5, d.red); p(ctx, ox, oy, 6, 5, d.red);
      p(ctx, ox, oy, 8, 5, d.red); p(ctx, ox, oy, 9, 5, d.red);
      p(ctx, ox, oy, 5, 6, d.red); p(ctx, ox, oy, 6, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.purple); p(ctx, ox, oy, 9, 6, d.red);
      p(ctx, ox, oy, 5, 7, d.red); p(ctx, ox, oy, 6, 7, d.red);
      p(ctx, ox, oy, 8, 7, d.red); p(ctx, ox, oy, 9, 7, d.red);
      p(ctx, ox, oy, 7, 6, d.chitin); // bridge
      break;
  }
}

export default function AliensTerrainSprites() {
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
      drawWall(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawAcid(tCtx, ox, (2 + f) * T, v, f);
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
    tpCtx.fillStyle = '#88ff22';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Hive Wall', 'Acid Pool 0', 'Acid Pool 1', 'Acid Pool 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#88ff22';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Hive', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#88ff22', background: '#0a1408' }}>
      <h2 data-label="Aliens Terrain">Aliens Terrain Sprites — Hive Tunnels</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#88ff22' : '#1a2a12', color: view === 'preview' ? '#0a1408' : '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#88ff22' : '#1a2a12', color: view === 'actual' ? '#0a1408' : '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'aliens_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2a12', color: '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'aliens_terrain_doodads.png')} style={{ background: '#1a2a12', color: '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#338808' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Aliens Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #88ff2233' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #88ff2233' }} />
      <h3>Hive Tunnel Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #88ff2233' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #88ff2233' }} />
    </div>
  );
}
