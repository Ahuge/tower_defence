/**
 * Harmonic Terrain Sprite Generator — Concert Hall terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: polished wood floor (ground)
 *   1: seating/walls (blocked type 1)
 *   2: resonance frame 0 (blocked type 2)
 *   3: resonance frame 1 (blocked type 2, animated)
 *   4: resonance frame 2 (blocked type 2, animated)
 *   5: orchestra pit (NoBuild terrain)
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
    base: '#2a2018',
    grain: '#3a3028',
    grainBright: '#443830',
    dot: '#332818',
  },
  seat: {
    fill: '#442222',
    dark: '#331818',
    gold: '#ddaa44',
    goldDim: '#aa7722',
    edge: '#553333',
    armrest: '#bb8833',
    number: '#664444',
    velvet: '#552222',
  },
  resonance: {
    stage: '#221a10',
    wave: '#44aaff',
    waveMid: '#3388cc',
    waveDim: '#226688',
    edge: '#2a2218',
    glow: '#2a6699',
  },
  noBuild: {
    base: '#1a1420',
    instrument: '#6688aa',
    instrumentDim: '#445566',
    outline: '#556677',
    outlineDim: '#334455',
  },
  doodad: {
    gold: '#ddaa44',
    white: '#eeddcc',
    dark: '#221a10',
    blue: '#44aaff',
    red: '#cc3333',
    wood: '#885533',
    brass: '#ccaa44',
    black: '#1a1420',
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
  // Wood grain — horizontal lines with slight variation
  for (let gy = 0; gy < G; gy += 3) {
    for (let gx = 0; gx < G; gx++) {
      p(ctx, ox, oy, gx, gy, c.grain);
    }
  }
  // Grain highlights
  p(ctx, ox, oy, 2, 3, c.grainBright); p(ctx, ox, oy, 3, 3, c.grainBright);
  p(ctx, ox, oy, 8, 6, c.grainBright); p(ctx, ox, oy, 9, 6, c.grainBright);
  p(ctx, ox, oy, 5, 9, c.grainBright); p(ctx, ox, oy, 6, 9, c.grainBright);
  p(ctx, ox, oy, 11, 0, c.grainBright);
  // Knot
  p(ctx, ox, oy, 10, 4, c.dot); p(ctx, ox, oy, 4, 11, c.dot);
  ctx.strokeStyle = c.grain;
  ctx.globalAlpha = 0.2;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawSeat(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.seat;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.velvet);
  // Seat cushion
  b(ctx, ox, oy, 2, 3, 10, 8, c.dark);
  b(ctx, ox, oy, 3, 4, 8, 6, c.fill);
  // Gold armrest details
  b(ctx, ox, oy, 2, 3, 1, 8, c.goldDim); // left armrest
  b(ctx, ox, oy, 11, 3, 1, 8, c.goldDim); // right armrest
  p(ctx, ox, oy, 2, 3, c.gold); p(ctx, ox, oy, 11, 3, c.gold);
  p(ctx, ox, oy, 2, 10, c.gold); p(ctx, ox, oy, 11, 10, c.gold);
  // Row number
  p(ctx, ox, oy, 6, 6, c.number); p(ctx, ox, oy, 7, 6, c.number);
  p(ctx, ox, oy, 6, 7, c.number); p(ctx, ox, oy, 7, 7, c.number);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  if (!n) { p(ctx, ox, oy, 4, 0, c.gold); p(ctx, ox, oy, 9, 0, c.goldDim); }
  if (!s) { p(ctx, ox, oy, 5, G - 1, c.goldDim); p(ctx, ox, oy, 10, G - 1, c.gold); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.gold); p(ctx, ox, oy, 0, 9, c.goldDim); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.goldDim); p(ctx, ox, oy, G - 1, 10, c.gold); }
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.goldDim); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.goldDim); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.goldDim); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.goldDim); }
}

function drawResonance(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.resonance;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.stage);
  // Wood grain on stage
  for (let gy = 2; gy < G; gy += 4) {
    b(ctx, ox, oy, 0, gy, G, 1, c.edge);
  }
  // Animated sound wave rings expanding from center
  const cx = 7, cy = 7;
  const ringR = 2 + frame * 2;
  // Outer ring
  for (let a = 0; a < 16; a++) {
    const rx = cx + Math.round(ringR * Math.cos(a * Math.PI / 8));
    const ry = cy + Math.round(ringR * Math.sin(a * Math.PI / 8));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.wave);
    }
  }
  // Middle ring
  const midR = Math.max(1, ringR - 2);
  for (let a = 0; a < 12; a++) {
    const rx = cx + Math.round(midR * Math.cos(a * Math.PI / 6));
    const ry = cy + Math.round(midR * Math.sin(a * Math.PI / 6));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.waveMid);
    }
  }
  // Center source
  p(ctx, ox, oy, 6, 6, c.wave); p(ctx, ox, oy, 7, 7, c.waveMid);
  // Wave fragments
  p(ctx, ox, oy, (3 + frame * 3) % G, (4 + frame * 2) % G, c.waveDim);
  p(ctx, ox, oy, (10 + frame * 2) % G, (9 + frame * 3) % G, c.waveDim);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.waveDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.waveDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.waveDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.waveDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Dark recessed floor
  for (let gx = 0; gx < G; gx += 5) {
    for (let gy = 0; gy < G; gy += 5) {
      p(ctx, ox, oy, gx, gy, '#111018');
    }
  }
  // Instrument silhouettes
  // Violin shape
  p(ctx, ox, oy, 3, 4, c.instrument); p(ctx, ox, oy, 4, 4, c.instrument);
  p(ctx, ox, oy, 3, 5, c.instrumentDim); p(ctx, ox, oy, 4, 5, c.instrumentDim);
  p(ctx, ox, oy, 3, 6, c.instrument); p(ctx, ox, oy, 4, 6, c.instrument);
  // Drum shape
  p(ctx, ox, oy, 9, 8, c.instrument); p(ctx, ox, oy, 10, 8, c.instrument);
  p(ctx, ox, oy, 9, 9, c.instrument); p(ctx, ox, oy, 10, 9, c.instrument);
  p(ctx, ox, oy, 9, 10, c.instrumentDim); p(ctx, ox, oy, 10, 10, c.instrumentDim);
  // Edge outlines
  b(ctx, ox, oy, 0, 5, G, 1, c.outline);
  b(ctx, ox, oy, 0, 8, G, 1, c.outline);
  b(ctx, ox, oy, 5, 0, 1, G, c.outlineDim);
  b(ctx, ox, oy, 8, 0, 1, G, c.outlineDim);
  b(ctx, ox, oy, 6, 6, 2, 2, c.instrument);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.outlineDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.outlineDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.outlineDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.outlineDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.instrument); p(ctx, ox, oy, 7, 0, c.instrument); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.instrument); p(ctx, ox, oy, 7, G - 1, c.instrument); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.instrument); p(ctx, ox, oy, 0, 7, c.instrument); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.instrument); p(ctx, ox, oy, G - 1, 7, c.instrument); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Musical note
      p(ctx, ox, oy, 8, 4, d.white); p(ctx, ox, oy, 8, 5, d.white);
      p(ctx, ox, oy, 8, 6, d.white); p(ctx, ox, oy, 8, 7, d.white);
      p(ctx, ox, oy, 6, 7, d.white); p(ctx, ox, oy, 7, 7, d.white);
      p(ctx, ox, oy, 6, 8, d.white);
      break;
    case 1: // Treble clef
      p(ctx, ox, oy, 7, 3, d.gold); p(ctx, ox, oy, 8, 4, d.gold);
      p(ctx, ox, oy, 7, 5, d.gold); p(ctx, ox, oy, 6, 5, d.gold);
      p(ctx, ox, oy, 7, 6, d.gold); p(ctx, ox, oy, 8, 6, d.gold);
      p(ctx, ox, oy, 7, 7, d.gold); p(ctx, ox, oy, 6, 8, d.gold);
      p(ctx, ox, oy, 7, 9, d.gold);
      break;
    case 2: // Drum stick
      p(ctx, ox, oy, 4, 4, d.wood); p(ctx, ox, oy, 5, 5, d.wood);
      p(ctx, ox, oy, 6, 6, d.wood); p(ctx, ox, oy, 7, 7, d.wood);
      p(ctx, ox, oy, 8, 8, d.wood); p(ctx, ox, oy, 9, 9, d.wood);
      p(ctx, ox, oy, 10, 10, d.white);
      break;
    case 3: // Trumpet bell
      p(ctx, ox, oy, 4, 6, d.brass); p(ctx, ox, oy, 5, 6, d.brass);
      p(ctx, ox, oy, 6, 5, d.brass); p(ctx, ox, oy, 6, 6, d.gold);
      p(ctx, ox, oy, 6, 7, d.brass);
      p(ctx, ox, oy, 7, 4, d.brass); p(ctx, ox, oy, 7, 5, d.gold);
      p(ctx, ox, oy, 7, 6, d.gold); p(ctx, ox, oy, 7, 7, d.gold);
      p(ctx, ox, oy, 7, 8, d.brass);
      p(ctx, ox, oy, 8, 5, d.brass); p(ctx, ox, oy, 8, 7, d.brass);
      break;
    case 4: // Violin
      p(ctx, ox, oy, 7, 3, d.wood); p(ctx, ox, oy, 6, 4, d.wood);
      p(ctx, ox, oy, 7, 4, d.wood); p(ctx, ox, oy, 8, 4, d.wood);
      p(ctx, ox, oy, 7, 5, d.wood);
      p(ctx, ox, oy, 6, 6, d.wood); p(ctx, ox, oy, 7, 6, d.dark);
      p(ctx, ox, oy, 8, 6, d.wood);
      p(ctx, ox, oy, 7, 7, d.wood);
      p(ctx, ox, oy, 6, 8, d.wood); p(ctx, ox, oy, 7, 8, d.wood);
      p(ctx, ox, oy, 8, 8, d.wood);
      p(ctx, ox, oy, 7, 9, d.wood); p(ctx, ox, oy, 7, 10, d.wood);
      break;
    case 5: // Sheet music
      b(ctx, ox, oy, 4, 4, 6, 6, d.white);
      b(ctx, ox, oy, 5, 5, 4, 1, d.dark);
      b(ctx, ox, oy, 5, 7, 4, 1, d.dark);
      b(ctx, ox, oy, 5, 9, 3, 1, d.dark);
      p(ctx, ox, oy, 6, 5, d.black); p(ctx, ox, oy, 8, 7, d.black);
      break;
    case 6: // Metronome
      b(ctx, ox, oy, 5, 8, 4, 2, d.wood);
      b(ctx, ox, oy, 6, 5, 2, 3, d.wood);
      p(ctx, ox, oy, 7, 4, d.brass); // pendulum tip
      p(ctx, ox, oy, 6, 6, d.gold); // face
      p(ctx, ox, oy, 5, 8, d.dark); p(ctx, ox, oy, 8, 8, d.dark);
      break;
    case 7: // Spotlight
      p(ctx, ox, oy, 6, 4, d.gold); p(ctx, ox, oy, 7, 4, d.gold);
      p(ctx, ox, oy, 5, 5, d.gold); p(ctx, ox, oy, 8, 5, d.gold);
      p(ctx, ox, oy, 6, 5, d.white); p(ctx, ox, oy, 7, 5, d.white);
      // Light beam
      p(ctx, ox, oy, 5, 6, d.blue); p(ctx, ox, oy, 8, 6, d.blue);
      p(ctx, ox, oy, 4, 7, d.blue); p(ctx, ox, oy, 9, 7, d.blue);
      p(ctx, ox, oy, 6, 6, d.white); p(ctx, ox, oy, 7, 6, d.white);
      break;
  }
}

export default function HarmonicTerrainSprites() {
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
      drawSeat(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawResonance(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0e0a06';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#ddaa44';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Seating', 'Resonance 0', 'Resonance 1', 'Resonance 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#0e0a06';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#ddaa44';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Concert', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ddaa44', background: '#0e0a06' }}>
      <h2 data-label="Harmonic Terrain">Harmonic Terrain Sprites — Concert Hall</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#ddaa44' : '#2a2018', color: view === 'preview' ? '#0e0a06' : '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#ddaa44' : '#2a2018', color: view === 'actual' ? '#0e0a06' : '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'harmonic_terrain_tileset.png')} style={{ marginRight: 8, background: '#2a2018', color: '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'harmonic_terrain_doodads.png')} style={{ background: '#2a2018', color: '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#886622' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Harmonic Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #ddaa4433' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #ddaa4433' }} />
      <h3>Concert Hall Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #ddaa4433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #ddaa4433' }} />
    </div>
  );
}
