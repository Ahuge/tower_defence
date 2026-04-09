/**
 * Psionic Terrain Sprite Generator — Mind Palace terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: psychic floor (ground)
 *   1: brain tanks/walls (blocked type 1)
 *   2: thought pool frame 0 (blocked type 2)
 *   3: thought pool frame 1 (blocked type 2, animated)
 *   4: thought pool frame 2 (blocked type 2, animated)
 *   5: neural corridors (NoBuild terrain)
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
    base: '#18102a',
    neural: '#281840',
    neuralBright: '#302048',
    dot: '#221838',
  },
  tank: {
    fill: '#3a2858',
    dark: '#2a1a44',
    glass: '#5a4878',
    brain: '#cc88dd',
    brainDim: '#9966aa',
    pulse: '#ee44ff',
    edge: '#4a3868',
    highlight: '#dd99ee',
  },
  thought: {
    deep: '#110828',
    ripple: '#aa44cc',
    rippleMid: '#8833aa',
    rippleDim: '#662288',
    edge: '#1a1038',
    glow: '#773399',
  },
  noBuild: {
    base: '#18102a',
    path: '#aa44cc',
    pathDim: '#773399',
    synapse: '#cc66ee',
    synapseDim: '#8844aa',
  },
  doodad: {
    pink: '#cc88dd',
    purple: '#aa44cc',
    magenta: '#ee44ff',
    white: '#eeccff',
    dark: '#2a1a44',
    dim: '#662288',
    blue: '#6688cc',
    teal: '#44aabb',
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
  // Neural hints — faint branching patterns
  p(ctx, ox, oy, 3, 2, c.neural); p(ctx, ox, oy, 4, 3, c.neural);
  p(ctx, ox, oy, 5, 3, c.neuralBright); p(ctx, ox, oy, 6, 4, c.neural);
  p(ctx, ox, oy, 10, 3, c.neural); p(ctx, ox, oy, 11, 4, c.neuralBright);
  p(ctx, ox, oy, 2, 8, c.neural); p(ctx, ox, oy, 3, 9, c.neural);
  p(ctx, ox, oy, 8, 10, c.neuralBright); p(ctx, ox, oy, 9, 10, c.neural);
  p(ctx, ox, oy, 12, 7, c.neural); p(ctx, ox, oy, 7, 7, c.dot);
  for (let gx = 0; gx < G; gx += 6) {
    for (let gy = 0; gy < G; gy += 6) {
      p(ctx, ox, oy, gx, gy, c.dot);
    }
  }
  ctx.strokeStyle = c.neural;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawTank(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.tank;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  // Glass tank interior
  b(ctx, ox, oy, 2, 2, 10, 10, c.dark);
  b(ctx, ox, oy, 3, 3, 8, 8, c.glass);
  // Brain visible inside
  p(ctx, ox, oy, 5, 5, c.brain); p(ctx, ox, oy, 6, 5, c.brainDim);
  p(ctx, ox, oy, 7, 5, c.brain); p(ctx, ox, oy, 8, 5, c.brainDim);
  p(ctx, ox, oy, 4, 6, c.brainDim); p(ctx, ox, oy, 5, 6, c.brain);
  p(ctx, ox, oy, 6, 6, c.highlight); p(ctx, ox, oy, 7, 6, c.brain);
  p(ctx, ox, oy, 8, 6, c.brain); p(ctx, ox, oy, 9, 6, c.brainDim);
  p(ctx, ox, oy, 5, 7, c.brainDim); p(ctx, ox, oy, 6, 7, c.brain);
  p(ctx, ox, oy, 7, 7, c.brainDim); p(ctx, ox, oy, 8, 7, c.brain);
  p(ctx, ox, oy, 5, 8, c.brain); p(ctx, ox, oy, 6, 8, c.brainDim);
  p(ctx, ox, oy, 7, 8, c.brain); p(ctx, ox, oy, 8, 8, c.brainDim);
  // Pulse points
  p(ctx, ox, oy, 6, 5, c.pulse); p(ctx, ox, oy, 8, 7, c.pulse);
  // Edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
  if (!n) { p(ctx, ox, oy, 4, 0, c.pulse); p(ctx, ox, oy, 10, 0, c.brainDim); }
  if (!s) { p(ctx, ox, oy, 3, G - 1, c.brainDim); p(ctx, ox, oy, 9, G - 1, c.pulse); }
  if (!w) { p(ctx, ox, oy, 0, 5, c.pulse); p(ctx, ox, oy, 0, 9, c.brainDim); }
  if (!e) { p(ctx, ox, oy, G - 1, 4, c.brainDim); p(ctx, ox, oy, G - 1, 8, c.pulse); }
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.brainDim); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.brainDim); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.brainDim); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.brainDim); }
}

function drawThought(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.thought;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Background glow
  for (let gy = 1; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glow);
  }
  // Animated thought ripples — concentric rings expanding
  const ringR = 2 + frame;
  const cx = 7, cy = 7;
  for (let a = 0; a < 12; a++) {
    const rx = cx + Math.round(ringR * Math.cos(a * Math.PI / 6));
    const ry = cy + Math.round(ringR * Math.sin(a * Math.PI / 6));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.ripple);
    }
  }
  // Inner ring
  const innerR = Math.max(1, ringR - 2);
  for (let a = 0; a < 8; a++) {
    const rx = cx + Math.round(innerR * Math.cos(a * Math.PI / 4));
    const ry = cy + Math.round(innerR * Math.sin(a * Math.PI / 4));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.rippleMid);
    }
  }
  // Center
  p(ctx, ox, oy, 7, 7, c.ripple);
  // Floating thought fragments
  p(ctx, ox, oy, (3 + frame * 3) % G, (2 + frame * 4) % G, c.rippleDim);
  p(ctx, ox, oy, (10 + frame * 2) % G, (9 + frame * 3) % G, c.rippleMid);
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.rippleDim); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.rippleDim); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.rippleDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.rippleDim); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let gx = 0; gx < G; gx += 6) {
    for (let gy = 0; gy < G; gy += 6) {
      p(ctx, ox, oy, gx, gy, PAL.ground.dot);
    }
  }
  // Neural pathway lines
  b(ctx, ox, oy, 0, 6, G, 1, c.path);
  b(ctx, ox, oy, 0, 7, G, 1, c.path);
  b(ctx, ox, oy, 6, 0, 1, G, c.pathDim);
  b(ctx, ox, oy, 7, 0, 1, G, c.pathDim);
  // Synapse dots at intersections
  b(ctx, ox, oy, 6, 6, 2, 2, c.synapse);
  // Branch synapses
  p(ctx, ox, oy, 3, 6, c.synapseDim); p(ctx, ox, oy, 10, 7, c.synapseDim);
  p(ctx, ox, oy, 6, 3, c.synapseDim); p(ctx, ox, oy, 7, 10, c.synapseDim);
  if (n) { b(ctx, ox, oy, 6, 0, 2, 3, c.pathDim); }
  if (s) { b(ctx, ox, oy, 6, G - 3, 2, 3, c.pathDim); }
  if (w) { b(ctx, ox, oy, 0, 6, 3, 2, c.pathDim); }
  if (e) { b(ctx, ox, oy, G - 3, 6, 3, 2, c.pathDim); }
  if (!n) { p(ctx, ox, oy, 6, 0, c.synapse); p(ctx, ox, oy, 7, 0, c.synapse); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.synapse); p(ctx, ox, oy, 7, G - 1, c.synapse); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.synapse); p(ctx, ox, oy, 0, 7, c.synapse); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.synapse); p(ctx, ox, oy, G - 1, 7, c.synapse); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Floating brain
      p(ctx, ox, oy, 5, 5, d.pink); p(ctx, ox, oy, 6, 5, d.pink);
      p(ctx, ox, oy, 7, 5, d.pink); p(ctx, ox, oy, 8, 5, d.pink);
      p(ctx, ox, oy, 5, 6, d.pink); p(ctx, ox, oy, 6, 6, d.white);
      p(ctx, ox, oy, 7, 6, d.pink); p(ctx, ox, oy, 8, 6, d.pink);
      p(ctx, ox, oy, 5, 7, d.pink); p(ctx, ox, oy, 6, 7, d.pink);
      p(ctx, ox, oy, 7, 7, d.white); p(ctx, ox, oy, 8, 7, d.pink);
      p(ctx, ox, oy, 6, 8, d.pink); p(ctx, ox, oy, 7, 8, d.pink);
      break;
    case 1: // Synapse spark
      p(ctx, ox, oy, 7, 5, d.magenta); p(ctx, ox, oy, 6, 6, d.magenta);
      p(ctx, ox, oy, 8, 6, d.purple); p(ctx, ox, oy, 7, 7, d.magenta);
      p(ctx, ox, oy, 5, 5, d.dim); p(ctx, ox, oy, 9, 7, d.dim);
      break;
    case 2: // Thought bubble
      p(ctx, ox, oy, 6, 4, d.purple); p(ctx, ox, oy, 7, 4, d.purple);
      p(ctx, ox, oy, 8, 4, d.purple);
      p(ctx, ox, oy, 5, 5, d.purple); p(ctx, ox, oy, 9, 5, d.purple);
      p(ctx, ox, oy, 6, 5, d.white); p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 5, 6, d.purple); p(ctx, ox, oy, 9, 6, d.purple);
      p(ctx, ox, oy, 6, 7, d.purple); p(ctx, ox, oy, 7, 7, d.purple);
      p(ctx, ox, oy, 8, 7, d.purple);
      p(ctx, ox, oy, 7, 9, d.dim); p(ctx, ox, oy, 8, 10, d.dim);
      break;
    case 3: // Neural node
      p(ctx, ox, oy, 6, 6, d.purple); p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 6, 7, d.purple); p(ctx, ox, oy, 7, 7, d.magenta);
      // Connections
      p(ctx, ox, oy, 4, 5, d.dim); p(ctx, ox, oy, 5, 5, d.dim);
      p(ctx, ox, oy, 9, 7, d.dim); p(ctx, ox, oy, 10, 8, d.dim);
      p(ctx, ox, oy, 6, 4, d.dim); p(ctx, ox, oy, 7, 9, d.dim);
      break;
    case 4: // Psychic eye
      p(ctx, ox, oy, 5, 6, d.purple); p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.purple); p(ctx, ox, oy, 8, 6, d.purple);
      p(ctx, ox, oy, 6, 6, d.magenta); p(ctx, ox, oy, 7, 6, d.white);
      p(ctx, ox, oy, 5, 7, d.purple); p(ctx, ox, oy, 8, 7, d.purple);
      p(ctx, ox, oy, 6, 7, d.purple); p(ctx, ox, oy, 7, 7, d.purple);
      break;
    case 5: // Crystal
      p(ctx, ox, oy, 7, 4, d.white); p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.magenta); p(ctx, ox, oy, 8, 5, d.purple);
      p(ctx, ox, oy, 6, 6, d.dim); p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.dim); p(ctx, ox, oy, 7, 7, d.dim);
      break;
    case 6: // Psychic tendril
      p(ctx, ox, oy, 4, 4, d.purple); p(ctx, ox, oy, 5, 5, d.purple);
      p(ctx, ox, oy, 6, 5, d.magenta); p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 8, 7, d.purple); p(ctx, ox, oy, 9, 7, d.magenta);
      p(ctx, ox, oy, 10, 8, d.purple); p(ctx, ox, oy, 10, 9, d.dim);
      break;
    case 7: // Memory fragment
      b(ctx, ox, oy, 5, 5, 4, 4, d.dark);
      p(ctx, ox, oy, 5, 5, d.purple); p(ctx, ox, oy, 8, 5, d.purple);
      p(ctx, ox, oy, 5, 8, d.purple); p(ctx, ox, oy, 8, 8, d.purple);
      p(ctx, ox, oy, 6, 6, d.blue); p(ctx, ox, oy, 7, 6, d.teal);
      p(ctx, ox, oy, 6, 7, d.teal); p(ctx, ox, oy, 7, 7, d.blue);
      break;
  }
}

export default function PsionicTerrainSprites() {
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
      drawTank(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawThought(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#08060e';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#aa44cc';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Brain Tank', 'Thought 0', 'Thought 1', 'Thought 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#08060e';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#aa44cc';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Psionic', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#aa44cc', background: '#08060e' }}>
      <h2 data-label="Psionic Terrain">Psionic Terrain Sprites — Mind Palace</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#aa44cc' : '#18102a', color: view === 'preview' ? '#08060e' : '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#aa44cc' : '#18102a', color: view === 'actual' ? '#08060e' : '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'psionic_terrain_tileset.png')} style={{ marginRight: 8, background: '#18102a', color: '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'psionic_terrain_doodads.png')} style={{ background: '#18102a', color: '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#662288' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Psionic Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa44cc33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa44cc33' }} />
      <h3>Mind Palace Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa44cc33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa44cc33' }} />
    </div>
  );
}
