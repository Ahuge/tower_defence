/**
 * Cypherpunk Terrain Sprite Generator — Data Grid / Tron-inspired circuit board terrain.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for data pits (pulsing scan lines).
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: circuit board floor (ground)
 *   1: processor block (blocked type 1)
 *   2: data pit frame 0 (blocked type 2)
 *   3: data pit frame 1 (blocked type 2, animated)
 *   4: data pit frame 2 (blocked type 2, animated)
 *   5: data bus trace (NoBuild terrain — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: circuit board doodads (8 types)
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

// Cypherpunk color palette
const PAL = {
  // Ground — circuit board floor
  ground: {
    base: '#0a1a18',
    trace: '#1a2a28',
    traceBright: '#1e3230',
    dot: '#153025',
  },
  // Processor block (blocked type 1)
  processor: {
    fill: '#1a2828',
    dark: '#112220',
    highlight: '#22ddaa',
    highlightDim: '#188866',
    edge: '#1e3830',
    pin: '#22ddaa',
    pinDim: '#166644',
    chipLabel: '#2a3a38',
  },
  // Data pit (blocked type 2, animated)
  dataPit: {
    deep: '#060e0c',
    scanBright: '#33ffbb',
    scanMid: '#22aa88',
    scanDim: '#115544',
    edge: '#0a1a16',
    glowLine: '#1a6655',
  },
  // NoBuild — data bus traces
  noBuild: {
    base: '#0a1a18',
    trace: '#00ff88',
    traceDim: '#00aa55',
    node: '#22ddaa',
    nodeDim: '#116644',
  },
  // Doodad accent colors
  led: {
    red: '#ff2222',
    green: '#00ff88',
    amber: '#ffaa44',
    redDim: '#881111',
    greenDim: '#006633',
    amberDim: '#885522',
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

// ===================== TERRAIN DRAWERS =====================

/** Row 0: Circuit board floor (ground) */
function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  // Dark base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Subtle grid lines every 4 grid units (circuit board pattern)
  for (let i = 0; i < G; i += 4) {
    // Vertical grid lines
    for (let gy = 0; gy < G; gy++) {
      p(ctx, ox, oy, i, gy, c.trace);
    }
    // Horizontal grid lines
    for (let gx = 0; gx < G; gx++) {
      p(ctx, ox, oy, gx, i, c.trace);
    }
  }

  // Small dot at grid intersections
  for (let gx = 0; gx < G; gx += 4) {
    for (let gy = 0; gy < G; gy += 4) {
      p(ctx, ox, oy, gx, gy, c.traceBright);
    }
  }

  // Subtle scattered trace fragments
  p(ctx, ox, oy, 2, 6, c.trace);
  p(ctx, ox, oy, 3, 6, c.trace);
  p(ctx, ox, oy, 9, 2, c.trace);
  p(ctx, ox, oy, 10, 2, c.trace);
  p(ctx, ox, oy, 6, 11, c.trace);

  // Faint border
  ctx.strokeStyle = c.trace;
  ctx.globalAlpha = 0.2;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

/** Row 1: Processor block (blocked type 1) */
function drawProcessor(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.processor;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark chip body
  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Internal die area (darker rectangle in center)
  b(ctx, ox, oy, 3, 3, 8, 8, c.dark);

  // Chip label lines (circuit traces on chip surface)
  b(ctx, ox, oy, 4, 5, 6, 1, c.chipLabel);
  b(ctx, ox, oy, 4, 7, 4, 1, c.chipLabel);
  b(ctx, ox, oy, 4, 9, 5, 1, c.chipLabel);

  // Neon highlight accents on the die
  p(ctx, ox, oy, 4, 4, c.highlightDim);
  p(ctx, ox, oy, 9, 4, c.highlightDim);
  p(ctx, ox, oy, 4, 10, c.highlightDim);
  p(ctx, ox, oy, 9, 10, c.highlightDim);

  // Center highlight dot
  p(ctx, ox, oy, 6, 7, c.highlight);
  p(ctx, ox, oy, 7, 7, c.highlight);

  // Edge treatment — brighter edge on exposed sides
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);

  // Pin connections on exposed edges (IC chip pins)
  if (!n) {
    for (let px = 2; px < G - 1; px += 2) {
      p(ctx, ox, oy, px, 0, c.pin);
    }
  }
  if (!s) {
    for (let px = 2; px < G - 1; px += 2) {
      p(ctx, ox, oy, px, G - 1, c.pin);
    }
  }
  if (!w) {
    for (let py = 2; py < G - 1; py += 2) {
      p(ctx, ox, oy, 0, py, c.pin);
    }
  }
  if (!e) {
    for (let py = 2; py < G - 1; py += 2) {
      p(ctx, ox, oy, G - 1, py, c.pin);
    }
  }

  // Dimmer pins on connected edges (pins are hidden when adjacent to same type)
  if (n) {
    for (let px = 3; px < G - 2; px += 4) {
      p(ctx, ox, oy, px, 0, c.pinDim);
    }
  }
  if (s) {
    for (let px = 3; px < G - 2; px += 4) {
      p(ctx, ox, oy, px, G - 1, c.pinDim);
    }
  }
  if (w) {
    for (let py = 3; py < G - 2; py += 4) {
      p(ctx, ox, oy, 0, py, c.pinDim);
    }
  }
  if (e) {
    for (let py = 3; py < G - 2; py += 4) {
      p(ctx, ox, oy, G - 1, py, c.pinDim);
    }
  }
}

/** Rows 2-4: Data pit (blocked type 2, animated with scan lines) */
function drawDataPit(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.dataPit;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep black base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Faint horizontal data lines (static background)
  for (let gy = 1; gy < G; gy += 3) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.glowLine);
  }

  // Animated scan line that moves vertically between frames (Tron-like)
  const scanY1 = (2 + frame * 4) % G;
  const scanY2 = (scanY1 + 1) % G;
  const scanY3 = (scanY1 + 7) % G;

  // Bright scan line
  b(ctx, ox, oy, 0, scanY1, G, 1, c.scanBright);
  // Mid-glow line above/below
  b(ctx, ox, oy, 0, scanY2, G, 1, c.scanMid);
  // Secondary dimmer scan line
  b(ctx, ox, oy, 1, scanY3, G - 2, 1, c.scanMid);

  // Additional dim scan fragments
  const fragY = (5 + frame * 3) % G;
  b(ctx, ox, oy, 3, fragY, 4, 1, c.scanDim);
  b(ctx, ox, oy, 9, (fragY + 4) % G, 3, 1, c.scanDim);

  // Bright data nodes at intersections
  p(ctx, ox, oy, 3, scanY1, c.scanBright);
  p(ctx, ox, oy, 7, scanY1, c.scanBright);
  p(ctx, ox, oy, 11, scanY1, c.scanBright);

  // Edge glow on exposed sides
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.scanDim); p(ctx, ox, oy, 4, 0, c.scanMid); p(ctx, ox, oy, 9, 0, c.scanMid); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.scanDim); p(ctx, ox, oy, 4, G - 1, c.scanMid); p(ctx, ox, oy, 9, G - 1, c.scanMid); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.scanDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.scanDim); }
}

/** Row 5: Data bus trace (NoBuild — walkable but unbuildable) */
function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Same dark ground as base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Subtle background grid (same as ground)
  for (let i = 0; i < G; i += 4) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, PAL.ground.trace);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, PAL.ground.trace);
  }

  // Bright horizontal trace line through center
  b(ctx, ox, oy, 0, 6, G, 1, c.trace);
  b(ctx, ox, oy, 0, 7, G, 1, c.trace);

  // Bright vertical trace line through center
  b(ctx, ox, oy, 6, 0, 1, G, c.trace);
  b(ctx, ox, oy, 7, 0, 1, G, c.trace);

  // Node dot at center (intersection)
  b(ctx, ox, oy, 6, 6, 2, 2, c.node);

  // Dimmer branches based on connectivity
  if (n) {
    b(ctx, ox, oy, 6, 0, 1, 3, c.traceDim);
    b(ctx, ox, oy, 7, 0, 1, 3, c.traceDim);
  }
  if (s) {
    b(ctx, ox, oy, 6, G - 3, 1, 3, c.traceDim);
    b(ctx, ox, oy, 7, G - 3, 1, 3, c.traceDim);
  }
  if (w) {
    b(ctx, ox, oy, 0, 6, 3, 1, c.traceDim);
    b(ctx, ox, oy, 0, 7, 3, 1, c.traceDim);
  }
  if (e) {
    b(ctx, ox, oy, G - 3, 6, 3, 1, c.traceDim);
    b(ctx, ox, oy, G - 3, 7, 3, 1, c.traceDim);
  }

  // Small circuit node dots at corners of the trace intersection
  p(ctx, ox, oy, 5, 5, c.nodeDim);
  p(ctx, ox, oy, 8, 5, c.nodeDim);
  p(ctx, ox, oy, 5, 8, c.nodeDim);
  p(ctx, ox, oy, 8, 8, c.nodeDim);

  // Exposed edge highlights
  if (!n) { p(ctx, ox, oy, 6, 0, c.node); p(ctx, ox, oy, 7, 0, c.node); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.node); p(ctx, ox, oy, 7, G - 1, c.node); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.node); p(ctx, ox, oy, 0, 7, c.node); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.node); p(ctx, ox, oy, G - 1, 7, c.node); }
}

// ===================== DOODAD DRAWERS =====================

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);

  const led = PAL.led;

  switch (type) {
    case 0: // Data node — bright intersection dot
      p(ctx, ox, oy, 6, 6, PAL.noBuild.node);
      p(ctx, ox, oy, 7, 6, PAL.noBuild.node);
      p(ctx, ox, oy, 6, 7, PAL.noBuild.node);
      p(ctx, ox, oy, 7, 7, PAL.noBuild.node);
      // Tiny trace arms
      p(ctx, ox, oy, 5, 6, PAL.noBuild.traceDim);
      p(ctx, ox, oy, 8, 7, PAL.noBuild.traceDim);
      p(ctx, ox, oy, 6, 5, PAL.noBuild.traceDim);
      p(ctx, ox, oy, 7, 8, PAL.noBuild.traceDim);
      break;

    case 1: // Trace intersection — cross pattern
      b(ctx, ox, oy, 6, 3, 2, 8, PAL.ground.trace);
      b(ctx, ox, oy, 3, 6, 8, 2, PAL.ground.trace);
      p(ctx, ox, oy, 6, 6, PAL.noBuild.traceDim);
      p(ctx, ox, oy, 7, 7, PAL.noBuild.traceDim);
      break;

    case 2: // Red LED indicator
      p(ctx, ox, oy, 6, 6, led.red);
      p(ctx, ox, oy, 7, 6, led.red);
      p(ctx, ox, oy, 6, 7, led.redDim);
      p(ctx, ox, oy, 7, 7, led.redDim);
      // Glow
      p(ctx, ox, oy, 5, 6, '#330808');
      p(ctx, ox, oy, 8, 7, '#330808');
      break;

    case 3: // Green LED indicator
      p(ctx, ox, oy, 6, 6, led.green);
      p(ctx, ox, oy, 7, 6, led.green);
      p(ctx, ox, oy, 6, 7, led.greenDim);
      p(ctx, ox, oy, 7, 7, led.greenDim);
      // Glow
      p(ctx, ox, oy, 5, 6, '#002210');
      p(ctx, ox, oy, 8, 7, '#002210');
      break;

    case 4: // Capacitor — small rectangular component
      b(ctx, ox, oy, 5, 5, 4, 4, '#1a3030');
      b(ctx, ox, oy, 6, 4, 2, 1, '#22ddaa');
      b(ctx, ox, oy, 6, 9, 2, 1, '#22ddaa');
      b(ctx, ox, oy, 6, 6, 2, 2, '#0d2220');
      break;

    case 5: // Resistor — striped component
      b(ctx, ox, oy, 4, 6, 6, 2, '#1a2828');
      p(ctx, ox, oy, 5, 6, '#886644');
      p(ctx, ox, oy, 5, 7, '#886644');
      p(ctx, ox, oy, 7, 6, '#444488');
      p(ctx, ox, oy, 7, 7, '#444488');
      p(ctx, ox, oy, 8, 6, led.amber);
      p(ctx, ox, oy, 8, 7, led.amber);
      // Leads
      p(ctx, ox, oy, 3, 6, PAL.processor.pinDim);
      p(ctx, ox, oy, 10, 7, PAL.processor.pinDim);
      break;

    case 6: // Chip — small IC outline
      b(ctx, ox, oy, 4, 4, 6, 6, PAL.processor.dark);
      b(ctx, ox, oy, 5, 5, 4, 4, PAL.processor.fill);
      // Pin notch
      p(ctx, ox, oy, 4, 4, PAL.processor.edge);
      // Pins on sides
      p(ctx, ox, oy, 4, 6, PAL.processor.pin);
      p(ctx, ox, oy, 4, 8, PAL.processor.pin);
      p(ctx, ox, oy, 9, 6, PAL.processor.pin);
      p(ctx, ox, oy, 9, 8, PAL.processor.pin);
      // Label dot
      p(ctx, ox, oy, 6, 6, PAL.processor.highlight);
      break;

    case 7: // Via / solder point — metallic ring
      p(ctx, ox, oy, 6, 5, '#557755');
      p(ctx, ox, oy, 7, 5, '#557755');
      p(ctx, ox, oy, 5, 6, '#557755');
      p(ctx, ox, oy, 8, 6, '#557755');
      p(ctx, ox, oy, 5, 7, '#557755');
      p(ctx, ox, oy, 8, 7, '#557755');
      p(ctx, ox, oy, 6, 8, '#557755');
      p(ctx, ox, oy, 7, 8, '#557755');
      // Center hole
      p(ctx, ox, oy, 6, 6, '#0a1a18');
      p(ctx, ox, oy, 7, 6, '#0a1a18');
      p(ctx, ox, oy, 6, 7, '#0a1a18');
      p(ctx, ox, oy, 7, 7, '#0a1a18');
      // Highlight
      p(ctx, ox, oy, 6, 5, '#88aa88');
      break;
  }
}

// ===================== MAIN COMPONENT =====================

export default function CypherpunkTerrainSprites() {
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
      // Row 0: circuit board floor (ground)
      drawGround(tCtx, ox, 0 * T);
      // Row 1: processor block (blocked type 1)
      drawProcessor(tCtx, ox, 1 * T, v);
      // Rows 2-4: data pit (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawDataPit(tCtx, ox, (2 + f) * T, v, f);
      }
      // Row 5: data bus trace (NoBuild)
      drawNoBuild(tCtx, ox, 5 * T, v);
    }

    // Preview with labels (3x scale)
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#050d0b';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#22ddaa';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Processor', 'Data Pit 0', 'Data Pit 1', 'Data Pit 2', 'NoBuild'];
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
      drawDoodad(dCtx, i * T, 0, i);
    }

    // Doodad preview (3x scale)
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#0a1a18';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#22ddaa';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Circuit', 4, 20 + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#22ddaa', background: '#050d0b' }}>
      <h2 data-label="Cypherpunk Terrain">Cypherpunk Terrain Sprites</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#22ddaa' : '#1a2828', color: view === 'preview' ? '#050d0b' : '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#22ddaa' : '#1a2828', color: view === 'actual' ? '#050d0b' : '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'cypherpunk_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2828', color: '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'cypherpunk_terrain_doodads.png')} style={{ background: '#1a2828', color: '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#116644' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Cypherpunk Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ddaa33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ddaa33' }} />
      <h3>Circuit Board Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ddaa33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ddaa33' }} />
    </div>
  );
}
