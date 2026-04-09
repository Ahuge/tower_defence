/**
 * Military Terrain Sprite Generator — Warzone Outpost terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: cracked concrete (ground)
 *   1: ruined buildings (blocked type 1)
 *   2: fire/destruction frame 0 (blocked type 2)
 *   3: fire/destruction frame 1 (blocked type 2, animated)
 *   4: fire/destruction frame 2 (blocked type 2, animated)
 *   5: trenches (NoBuild terrain)
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
    base: '#2a2828',
    line: '#3a3838',
    lineBright: '#444440',
    crack: '#222220',
  },
  building: {
    fill: '#555550',
    dark: '#3a3a38',
    window: '#222222',
    rubble: '#444440',
    edge: '#666660',
    highlight: '#777770',
    beam: '#4a4a45',
  },
  fire: {
    rubble: '#553322',
    flame: '#ff6622',
    flameMid: '#cc4411',
    flameDim: '#883311',
    ember: '#ffaa44',
    edge: '#442211',
    smoke: '#444444',
  },
  noBuild: {
    base: '#1a1a18',
    sandbag: '#555544',
    sandbagDim: '#3a3a30',
    dirt: '#333328',
    dirtDim: '#222218',
  },
  doodad: {
    olive: '#556633',
    steel: '#888888',
    dark: '#333330',
    rust: '#884422',
    sand: '#aa9966',
    red: '#cc3322',
    glass: '#6688aa',
    wire: '#666666',
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
  // Road marking lines
  b(ctx, ox, oy, 0, 6, G, 1, c.line);
  b(ctx, ox, oy, 0, 7, G, 1, c.line);
  // Cracks
  p(ctx, ox, oy, 3, 3, c.crack); p(ctx, ox, oy, 4, 4, c.crack);
  p(ctx, ox, oy, 5, 4, c.crack); p(ctx, ox, oy, 9, 9, c.crack);
  p(ctx, ox, oy, 10, 10, c.crack); p(ctx, ox, oy, 10, 9, c.crack);
  // Dashes on road
  for (let gx = 2; gx < G; gx += 4) {
    p(ctx, ox, oy, gx, 6, c.lineBright);
    p(ctx, ox, oy, gx + 1, 6, c.lineBright);
  }
  // Scattered debris
  p(ctx, ox, oy, 1, 2, c.line); p(ctx, ox, oy, 11, 4, c.line);
  p(ctx, ox, oy, 7, 11, c.line); p(ctx, ox, oy, 2, 10, c.crack);
  ctx.strokeStyle = c.line;
  ctx.globalAlpha = 0.2;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawBuilding(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.building;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.dark);
  // Window holes
  b(ctx, ox, oy, 3, 3, 2, 2, c.window);
  b(ctx, ox, oy, 9, 3, 2, 2, c.window);
  b(ctx, ox, oy, 3, 8, 2, 2, c.window);
  b(ctx, ox, oy, 9, 8, 2, 2, c.window);
  // Rubble texture
  p(ctx, ox, oy, 6, 5, c.rubble); p(ctx, ox, oy, 7, 6, c.rubble);
  p(ctx, ox, oy, 5, 7, c.rubble); p(ctx, ox, oy, 8, 7, c.rubble);
  // Support beams
  b(ctx, ox, oy, 6, 1, 2, G - 2, c.beam);
  b(ctx, ox, oy, 1, 6, G - 2, 2, c.beam);
  // Center
  p(ctx, ox, oy, 6, 6, c.highlight); p(ctx, ox, oy, 7, 7, c.highlight);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  // Rubble on exposed edges
  if (!n) { p(ctx, ox, oy, 4, 0, c.highlight); p(ctx, ox, oy, 10, 0, c.rubble); }
  if (!s) { p(ctx, ox, oy, 3, G - 1, c.rubble); p(ctx, ox, oy, 9, G - 1, c.highlight); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.highlight); p(ctx, ox, oy, 0, 10, c.rubble); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.rubble); p(ctx, ox, oy, G - 1, 9, c.highlight); }
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.rubble); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.rubble); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.rubble); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.rubble); }
}

function drawFire(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.fire;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.rubble);
  // Scattered rubble base
  for (let gy = 2; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.edge);
  }
  // Animated fire flickering
  const fOff = frame * 2;
  // Flame 1 (tall)
  const f1x = 4;
  const f1h = 3 + (frame % 2);
  const f1y = 7 - f1h - (frame % 2);
  for (let fy = 0; fy < f1h; fy++) {
    const col = fy === 0 ? c.ember : fy === 1 ? c.flame : c.flameMid;
    p(ctx, ox, oy, f1x, f1y + fy, col);
    p(ctx, ox, oy, f1x + 1, f1y + fy, col);
  }
  p(ctx, ox, oy, f1x, f1y + f1h, c.flameDim);
  // Flame 2
  const f2x = 8 + (fOff % 2);
  const f2y = 5 - frame;
  p(ctx, ox, oy, f2x, f2y + 2, c.flameDim);
  p(ctx, ox, oy, f2x, f2y + 1, c.flame);
  p(ctx, ox, oy, f2x, f2y, c.ember);
  p(ctx, ox, oy, f2x + 1, f2y + 1, c.flameMid);
  // Smoke
  p(ctx, ox, oy, 3 + frame, 2, c.smoke);
  p(ctx, ox, oy, 10 - frame, 1, c.smoke);
  // Embers
  p(ctx, ox, oy, (6 + fOff) % G, (3 + frame) % G, c.ember);
  p(ctx, ox, oy, (10 + fOff) % G, (8 + frame * 2) % G, c.ember);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.flameDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.flameDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.flameDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.flameDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Dirt texture
  for (let gx = 0; gx < G; gx += 3) {
    for (let gy = 0; gy < G; gy += 3) {
      p(ctx, ox, oy, gx, gy, c.dirtDim);
    }
  }
  // Sandbag outlines (rows)
  b(ctx, ox, oy, 1, 4, 3, 2, c.sandbag);
  b(ctx, ox, oy, 5, 4, 3, 2, c.sandbag);
  b(ctx, ox, oy, 9, 4, 3, 2, c.sandbag);
  b(ctx, ox, oy, 2, 8, 3, 2, c.sandbagDim);
  b(ctx, ox, oy, 7, 8, 3, 2, c.sandbagDim);
  // Trench depression
  b(ctx, ox, oy, 0, 6, G, 2, c.dirt);
  // Center
  p(ctx, ox, oy, 6, 6, c.sandbag); p(ctx, ox, oy, 7, 7, c.sandbag);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.dirtDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.dirtDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.dirtDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.dirtDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.sandbag); p(ctx, ox, oy, 7, 0, c.sandbag); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.sandbag); p(ctx, ox, oy, 7, G - 1, c.sandbag); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.sandbag); p(ctx, ox, oy, 0, 7, c.sandbag); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.sandbag); p(ctx, ox, oy, G - 1, 7, c.sandbag); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Sandbag
      b(ctx, ox, oy, 4, 6, 6, 3, d.sand);
      b(ctx, ox, oy, 4, 6, 6, 1, '#bbaa77');
      p(ctx, ox, oy, 7, 7, d.dark);
      break;
    case 1: // Barbed wire
      b(ctx, ox, oy, 3, 6, 8, 1, d.wire);
      p(ctx, ox, oy, 4, 5, d.wire); p(ctx, ox, oy, 6, 5, d.wire);
      p(ctx, ox, oy, 8, 5, d.wire); p(ctx, ox, oy, 10, 5, d.wire);
      p(ctx, ox, oy, 5, 7, d.wire); p(ctx, ox, oy, 7, 7, d.wire);
      p(ctx, ox, oy, 9, 7, d.wire);
      break;
    case 2: // Bullet casings
      p(ctx, ox, oy, 4, 7, '#ccaa44'); p(ctx, ox, oy, 6, 6, '#ccaa44');
      p(ctx, ox, oy, 8, 7, '#ccaa44'); p(ctx, ox, oy, 9, 8, '#ccaa44');
      p(ctx, ox, oy, 5, 8, '#aa8833');
      break;
    case 3: // Broken glass
      p(ctx, ox, oy, 5, 5, d.glass); p(ctx, ox, oy, 7, 6, d.glass);
      p(ctx, ox, oy, 6, 7, d.glass); p(ctx, ox, oy, 8, 5, d.glass);
      p(ctx, ox, oy, 9, 8, d.glass); p(ctx, ox, oy, 6, 9, '#88aabb');
      break;
    case 4: // Tire track
      b(ctx, ox, oy, 3, 5, 1, 5, d.dark);
      b(ctx, ox, oy, 5, 5, 1, 5, d.dark);
      for (let gy = 5; gy < 10; gy += 2) {
        p(ctx, ox, oy, 4, gy, d.dark);
      }
      break;
    case 5: // Crater
      p(ctx, ox, oy, 6, 5, d.dark); p(ctx, ox, oy, 7, 5, d.dark);
      p(ctx, ox, oy, 5, 6, d.dark); p(ctx, ox, oy, 8, 6, d.dark);
      p(ctx, ox, oy, 5, 7, d.dark); p(ctx, ox, oy, 8, 7, d.dark);
      p(ctx, ox, oy, 6, 8, d.dark); p(ctx, ox, oy, 7, 8, d.dark);
      p(ctx, ox, oy, 6, 6, '#1a1a18'); p(ctx, ox, oy, 7, 7, '#1a1a18');
      p(ctx, ox, oy, 9, 5, d.rust); p(ctx, ox, oy, 5, 8, d.rust);
      break;
    case 6: // Flag pole
      b(ctx, ox, oy, 7, 3, 1, 8, d.steel);
      b(ctx, ox, oy, 8, 3, 3, 2, d.olive);
      p(ctx, ox, oy, 8, 3, d.red);
      break;
    case 7: // Crate
      b(ctx, ox, oy, 4, 4, 6, 6, d.olive);
      b(ctx, ox, oy, 5, 5, 4, 4, d.dark);
      p(ctx, ox, oy, 4, 4, d.steel); p(ctx, ox, oy, 9, 4, d.steel);
      p(ctx, ox, oy, 4, 9, d.steel); p(ctx, ox, oy, 9, 9, d.steel);
      p(ctx, ox, oy, 6, 6, d.steel); p(ctx, ox, oy, 7, 7, d.steel);
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
    const rowLabels = ['Ground', 'Ruin', 'Fire 0', 'Fire 1', 'Fire 2', 'NoBuild'];
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
      <h2 data-label="Military Terrain">Military Terrain Sprites — Warzone Outpost</h2>
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
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa884433' }} />
      <h3>Warzone Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa884433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa884433' }} />
    </div>
  );
}
