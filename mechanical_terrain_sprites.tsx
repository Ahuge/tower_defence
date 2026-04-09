/**
 * Mechanical Terrain Sprite Generator — Iron Foundry terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: steel plate floor (ground)
 *   1: machine blocks (blocked type 1)
 *   2: steam vent frame 0 (blocked type 2)
 *   3: steam vent frame 1 (blocked type 2, animated)
 *   4: steam vent frame 2 (blocked type 2, animated)
 *   5: conveyor belts (NoBuild terrain)
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
    base: '#1a1a18',
    line: '#2a2a28',
    lineBright: '#333330',
    rivet: '#3a3a36',
  },
  machine: {
    fill: '#8a7a44',
    dark: '#6a5a30',
    highlight: '#bbaa66',
    highlightDim: '#9a8844',
    edge: '#aa9955',
    rivet: '#666666',
    rivetBright: '#888888',
    gear: '#776633',
  },
  steam: {
    deep: '#333322',
    puff: '#aaaaaa',
    puffMid: '#888888',
    puffDim: '#555555',
    edge: '#444433',
    grate: '#4a4a38',
  },
  noBuild: {
    base: '#1a1a18',
    rail: '#aa8833',
    railDim: '#886622',
    chevron: '#ccaa44',
    chevronDim: '#887733',
  },
  doodad: {
    brass: '#aa8833',
    steel: '#888888',
    dark: '#444440',
    bright: '#ccaa44',
    rust: '#884422',
    oil: '#222218',
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
  // Riveted plate lines
  for (let i = 0; i < G; i += 7) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, c.line);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, c.line);
  }
  // Rivets at intersections and along edges
  p(ctx, ox, oy, 0, 0, c.rivet); p(ctx, ox, oy, 7, 0, c.rivet); p(ctx, ox, oy, 13, 0, c.rivet);
  p(ctx, ox, oy, 0, 7, c.rivet); p(ctx, ox, oy, 7, 7, c.rivet); p(ctx, ox, oy, 13, 7, c.rivet);
  p(ctx, ox, oy, 0, 13, c.rivet); p(ctx, ox, oy, 7, 13, c.rivet); p(ctx, ox, oy, 13, 13, c.rivet);
  // Subtle scratches
  p(ctx, ox, oy, 3, 4, c.line); p(ctx, ox, oy, 4, 4, c.line);
  p(ctx, ox, oy, 10, 10, c.line); p(ctx, ox, oy, 11, 10, c.line);
  ctx.strokeStyle = c.line;
  ctx.globalAlpha = 0.2;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawMachine(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.machine;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 2, 2, 10, 10, c.dark);
  // Gear detail in center
  b(ctx, ox, oy, 5, 5, 4, 4, c.gear);
  p(ctx, ox, oy, 6, 4, c.highlight); p(ctx, ox, oy, 7, 4, c.highlight);
  p(ctx, ox, oy, 4, 6, c.highlight); p(ctx, ox, oy, 9, 7, c.highlight);
  p(ctx, ox, oy, 6, 9, c.highlightDim); p(ctx, ox, oy, 7, 9, c.highlightDim);
  // Center axle
  p(ctx, ox, oy, 6, 6, c.rivetBright); p(ctx, ox, oy, 7, 7, c.rivetBright);
  // Rivets
  p(ctx, ox, oy, 2, 2, c.rivet); p(ctx, ox, oy, 11, 2, c.rivet);
  p(ctx, ox, oy, 2, 11, c.rivet); p(ctx, ox, oy, 11, 11, c.rivet);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  // Rivets on exposed edges
  if (!n) { for (let px = 2; px < G - 1; px += 3) p(ctx, ox, oy, px, 0, c.rivetBright); }
  if (!s) { for (let px = 2; px < G - 1; px += 3) p(ctx, ox, oy, px, G - 1, c.rivetBright); }
  if (!w) { for (let py = 2; py < G - 1; py += 3) p(ctx, ox, oy, 0, py, c.rivetBright); }
  if (!e) { for (let py = 2; py < G - 1; py += 3) p(ctx, ox, oy, G - 1, py, c.rivetBright); }
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.rivet); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.rivet); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.rivet); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.rivet); }
}

function drawSteam(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.steam;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Grate lines
  for (let gy = 1; gy < G; gy += 2) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.grate);
  }
  // Animated steam puffs rising
  const puffY1 = (10 - frame * 3 + G) % G;
  const puffY2 = (7 - frame * 3 + G) % G;
  const puffY3 = (4 - frame * 3 + G) % G;
  // Big puff
  b(ctx, ox, oy, 4, puffY1, 3, 2, c.puff);
  b(ctx, ox, oy, 3, puffY1 + 1, 2, 1, c.puffMid);
  // Medium puff
  b(ctx, ox, oy, 8, puffY2, 2, 2, c.puffMid);
  p(ctx, ox, oy, 10, puffY2, c.puffDim);
  // Small puff
  p(ctx, ox, oy, 6, puffY3, c.puffMid);
  p(ctx, ox, oy, 7, puffY3, c.puff);
  // Additional wisps
  p(ctx, ox, oy, 3, (puffY3 + 2) % G, c.puffDim);
  p(ctx, ox, oy, 11, (puffY1 + 5) % G, c.puffDim);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.puffDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.puffDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.puffDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.puffDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let i = 0; i < G; i += 7) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, PAL.ground.line);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, PAL.ground.line);
  }
  // Rail lines
  b(ctx, ox, oy, 0, 5, G, 1, c.rail);
  b(ctx, ox, oy, 0, 8, G, 1, c.rail);
  // Chevrons (direction markers)
  for (let gx = 1; gx < G - 1; gx += 3) {
    p(ctx, ox, oy, gx, 6, c.chevron);
    p(ctx, ox, oy, gx + 1, 7, c.chevron);
  }
  // Vertical rail for connected
  b(ctx, ox, oy, 5, 0, 1, G, c.railDim);
  b(ctx, ox, oy, 8, 0, 1, G, c.railDim);
  // Center node
  b(ctx, ox, oy, 6, 6, 2, 2, c.chevron);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.railDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.railDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.railDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.railDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.chevron); p(ctx, ox, oy, 7, 0, c.chevron); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.chevron); p(ctx, ox, oy, 7, G - 1, c.chevron); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.chevron); p(ctx, ox, oy, 0, 7, c.chevron); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.chevron); p(ctx, ox, oy, G - 1, 7, c.chevron); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Gear
      p(ctx, ox, oy, 6, 4, d.brass); p(ctx, ox, oy, 7, 4, d.brass);
      p(ctx, ox, oy, 4, 6, d.brass); p(ctx, ox, oy, 9, 6, d.brass);
      p(ctx, ox, oy, 4, 7, d.brass); p(ctx, ox, oy, 9, 7, d.brass);
      p(ctx, ox, oy, 6, 9, d.brass); p(ctx, ox, oy, 7, 9, d.brass);
      p(ctx, ox, oy, 5, 5, d.dark); p(ctx, ox, oy, 8, 5, d.dark);
      p(ctx, ox, oy, 5, 8, d.dark); p(ctx, ox, oy, 8, 8, d.dark);
      p(ctx, ox, oy, 6, 6, d.bright); p(ctx, ox, oy, 7, 7, d.steel);
      break;
    case 1: // Bolt
      p(ctx, ox, oy, 6, 5, d.steel); p(ctx, ox, oy, 7, 5, d.steel);
      p(ctx, ox, oy, 5, 6, d.steel); p(ctx, ox, oy, 8, 6, d.steel);
      p(ctx, ox, oy, 6, 6, d.bright); p(ctx, ox, oy, 7, 6, d.bright);
      p(ctx, ox, oy, 6, 7, d.steel); p(ctx, ox, oy, 7, 7, d.steel);
      p(ctx, ox, oy, 6, 8, d.dark); p(ctx, ox, oy, 7, 8, d.dark);
      break;
    case 2: // Pipe (horizontal)
      b(ctx, ox, oy, 2, 6, 10, 2, d.steel);
      b(ctx, ox, oy, 2, 6, 10, 1, d.bright);
      p(ctx, ox, oy, 4, 6, d.dark); p(ctx, ox, oy, 9, 6, d.dark);
      break;
    case 3: // Wrench
      p(ctx, ox, oy, 5, 4, d.steel); p(ctx, ox, oy, 6, 4, d.steel);
      p(ctx, ox, oy, 4, 5, d.steel); p(ctx, ox, oy, 7, 5, d.steel);
      p(ctx, ox, oy, 6, 6, d.steel); p(ctx, ox, oy, 7, 7, d.steel);
      p(ctx, ox, oy, 8, 8, d.steel); p(ctx, ox, oy, 9, 9, d.steel);
      p(ctx, ox, oy, 9, 10, d.steel); p(ctx, ox, oy, 10, 9, d.steel);
      break;
    case 4: // Sparks
      p(ctx, ox, oy, 7, 4, d.bright); p(ctx, ox, oy, 5, 6, d.bright);
      p(ctx, ox, oy, 9, 5, d.bright); p(ctx, ox, oy, 6, 8, d.bright);
      p(ctx, ox, oy, 10, 7, d.bright); p(ctx, ox, oy, 8, 9, '#ffcc22');
      break;
    case 5: // Oil puddle
      b(ctx, ox, oy, 5, 6, 4, 3, d.oil);
      p(ctx, ox, oy, 4, 7, d.oil); p(ctx, ox, oy, 9, 7, d.oil);
      p(ctx, ox, oy, 6, 6, '#333328');
      break;
    case 6: // Pressure gauge
      p(ctx, ox, oy, 6, 5, d.brass); p(ctx, ox, oy, 7, 5, d.brass);
      p(ctx, ox, oy, 5, 6, d.brass); p(ctx, ox, oy, 8, 6, d.brass);
      p(ctx, ox, oy, 5, 7, d.brass); p(ctx, ox, oy, 8, 7, d.brass);
      p(ctx, ox, oy, 6, 8, d.brass); p(ctx, ox, oy, 7, 8, d.brass);
      p(ctx, ox, oy, 6, 6, d.dark); p(ctx, ox, oy, 7, 7, d.dark);
      p(ctx, ox, oy, 7, 6, '#ff4422'); // needle
      break;
    case 7: // Crate
      b(ctx, ox, oy, 4, 4, 6, 6, d.dark);
      b(ctx, ox, oy, 5, 5, 4, 4, d.rust);
      p(ctx, ox, oy, 6, 4, d.brass); p(ctx, ox, oy, 7, 4, d.brass);
      p(ctx, ox, oy, 6, 9, d.brass); p(ctx, ox, oy, 7, 9, d.brass);
      p(ctx, ox, oy, 6, 6, d.bright); p(ctx, ox, oy, 7, 7, d.bright);
      break;
  }
}

export default function MechanicalTerrainSprites() {
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
      drawMachine(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawSteam(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a0a08';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#aa8833';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Machine Block', 'Steam Vent 0', 'Steam Vent 1', 'Steam Vent 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#0a0a08';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#aa8833';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Foundry', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#aa8833', background: '#0a0a08' }}>
      <h2 data-label="Mechanical Terrain">Mechanical Terrain Sprites — Iron Foundry</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#aa8833' : '#1a1a18', color: view === 'preview' ? '#0a0a08' : '#aa8833', border: '1px solid #aa8833', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#aa8833' : '#1a1a18', color: view === 'actual' ? '#0a0a08' : '#aa8833', border: '1px solid #aa8833', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'mechanical_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a1a18', color: '#aa8833', border: '1px solid #aa8833', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'mechanical_terrain_doodads.png')} style={{ background: '#1a1a18', color: '#aa8833', border: '1px solid #aa8833', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#886622' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Mechanical Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa883333' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa883333' }} />
      <h3>Iron Foundry Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa883333' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa883333' }} />
    </div>
  );
}
