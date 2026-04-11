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
    base: '#141413',
    baseLt: '#181816',
    accent: '#1c1c1a',
    accentDk: '#101010',
  },
  machine: {
    fill: '#8a7a44',
    fillLt: '#9a8a54',
    fillDk: '#6a5a30',
    panel: '#7a6a3a',
    panelDk: '#5a4a28',
    panelInner: '#4a3a20',
    highlight: '#bbaa66',
    highlightDim: '#9a8844',
    edge: '#aa9955',
    edgeDk: '#786830',
    bolt: '#666666',
    boltHi: '#999999',
    boltShadow: '#444444',
    gear: '#776633',
    gearLt: '#8a7a44',
    gearDk: '#5a4a22',
    gearAxle: '#aaaaaa',
    pipe: '#607068',
    pipeLt: '#708878',
    pipeDk: '#4a5850',
    gauge: '#556655',
    gaugeFace: '#ccccbb',
    gaugeNeedle: '#ff3322',
    gaugeDk: '#334433',
    vent: '#3a3a30',
    ventSlot: '#222218',
    warnYellow: '#ccaa22',
    warnBlack: '#222218',
    controlPanel: '#445544',
    controlLed: '#44ff44',
    controlLedOff: '#224422',
    controlBtn: '#aa3333',
  },
  steam: {
    deep: '#2a2a1e',
    deepLt: '#333326',
    grate: '#4a4a38',
    grateLt: '#5a5a48',
    grateDk: '#3a3a2a',
    grateSlot: '#1a1a12',
    frame: '#555544',
    frameLt: '#666654',
    frameDk: '#444434',
    puff: '#cccccc',
    puffBright: '#e0e0e0',
    puffMid: '#999999',
    puffDim: '#666666',
    puffFaint: '#444444',
    puffWisp: '#555550',
    heat1: '#554433',
    heat2: '#443322',
    condensation: '#3a4444',
    condensationLt: '#4a5555',
    bolt: '#666655',
  },
  noBuild: {
    base: '#1a1a18',
    baseLt: '#1e1e1c',
    belt: '#333330',
    beltLt: '#3e3e3a',
    beltDk: '#282826',
    beltSegment: '#2e2e2b',
    rail: '#aa8833',
    railLt: '#ccaa44',
    railDk: '#886622',
    railShadow: '#664411',
    chevron: '#ccaa44',
    chevronDk: '#aa8833',
    chevronDim: '#887733',
    roller: '#555550',
    rollerLt: '#777770',
    rollerDk: '#3a3a36',
    rollerAxle: '#444440',
    sideRail: '#666655',
    sideRailLt: '#888877',
    sideRailDk: '#444433',
    rivet: '#887744',
  },
  doodad: {
    brass: '#aa8833',
    brassLt: '#ccaa55',
    brassDk: '#886622',
    copper: '#bb6633',
    copperLt: '#dd8844',
    copperDk: '#884422',
    steel: '#888888',
    steelLt: '#aaaaaa',
    steelDk: '#666666',
    gunmetal: '#556666',
    gunmetalLt: '#778888',
    gunmetalDk: '#334444',
    dark: '#444440',
    darkDeep: '#2a2a26',
    bright: '#ccaa44',
    rust: '#884422',
    rustLt: '#aa5533',
    rustDk: '#662211',
    oil: '#181810',
    oilSheen: '#222218',
    red: '#cc3322',
    redDk: '#882211',
    warnYellow: '#ddbb22',
    warnBlack: '#222218',
    handle: '#665544',
    handleLt: '#887766',
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
  // Dark steel plate base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle variation pixels (slight metallic warmth)
  p(ctx, ox, oy, 4, 3, c.baseLt);
  p(ctx, ox, oy, 11, 7, c.accent);
  p(ctx, ox, oy, 2, 10, c.baseLt);
  // One darker depression
  p(ctx, ox, oy, 8, 5, c.accentDk);
}

function drawMachine(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.machine;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Base housing fill
  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Inner panel (recessed)
  b(ctx, ox, oy, 2, 2, 10, 10, c.panel);
  b(ctx, ox, oy, 3, 3, 8, 8, c.panelDk);

  // Pick a detail type based on variant for variety
  const detailType = idx % 4;

  if (detailType === 0) {
    // GEAR visible through window
    b(ctx, ox, oy, 3, 3, 8, 8, c.panelInner);
    // Gear teeth (outer ring)
    p(ctx, ox, oy, 6, 3, c.gear); p(ctx, ox, oy, 7, 3, c.gear);
    p(ctx, ox, oy, 3, 6, c.gear); p(ctx, ox, oy, 3, 7, c.gear);
    p(ctx, ox, oy, 10, 6, c.gear); p(ctx, ox, oy, 10, 7, c.gear);
    p(ctx, ox, oy, 6, 10, c.gear); p(ctx, ox, oy, 7, 10, c.gear);
    // Diagonal teeth
    p(ctx, ox, oy, 4, 4, c.gearLt); p(ctx, ox, oy, 9, 4, c.gearLt);
    p(ctx, ox, oy, 4, 9, c.gearLt); p(ctx, ox, oy, 9, 9, c.gearLt);
    // Gear body
    b(ctx, ox, oy, 5, 5, 4, 4, c.gear);
    b(ctx, ox, oy, 6, 6, 2, 2, c.gearLt);
    // Axle highlight
    p(ctx, ox, oy, 6, 6, c.gearAxle); p(ctx, ox, oy, 7, 7, c.gearDk);
    // Gear spoke lines
    p(ctx, ox, oy, 5, 6, c.gearDk); p(ctx, ox, oy, 8, 7, c.gearDk);
    p(ctx, ox, oy, 6, 5, c.gearDk); p(ctx, ox, oy, 7, 8, c.gearDk);
  } else if (detailType === 1) {
    // PRESSURE GAUGE + PIPES
    b(ctx, ox, oy, 3, 3, 8, 8, c.panelInner);
    // Horizontal pipe at top
    b(ctx, ox, oy, 3, 3, 8, 2, c.pipe);
    b(ctx, ox, oy, 3, 3, 8, 1, c.pipeLt);
    p(ctx, ox, oy, 5, 4, c.pipeDk); p(ctx, ox, oy, 8, 4, c.pipeDk);
    // Pipe joint rivets
    p(ctx, ox, oy, 4, 3, c.boltHi); p(ctx, ox, oy, 9, 3, c.boltHi);
    // Gauge circle
    p(ctx, ox, oy, 6, 6, c.gaugeFace); p(ctx, ox, oy, 7, 6, c.gaugeFace);
    p(ctx, ox, oy, 5, 7, c.gaugeFace); p(ctx, ox, oy, 8, 7, c.gaugeFace);
    p(ctx, ox, oy, 5, 8, c.gaugeFace); p(ctx, ox, oy, 8, 8, c.gaugeFace);
    p(ctx, ox, oy, 6, 9, c.gaugeFace); p(ctx, ox, oy, 7, 9, c.gaugeFace);
    // Gauge outline
    p(ctx, ox, oy, 5, 6, c.gauge); p(ctx, ox, oy, 9, 7, c.gaugeDk);
    p(ctx, ox, oy, 6, 10, c.gaugeDk); p(ctx, ox, oy, 7, 10, c.gaugeDk);
    // Needle
    p(ctx, ox, oy, 7, 7, c.gaugeNeedle); p(ctx, ox, oy, 8, 7, c.gaugeNeedle);
    // Center pin
    p(ctx, ox, oy, 6, 8, c.gearAxle);
    // Vertical pipe down
    b(ctx, ox, oy, 9, 5, 1, 5, c.pipe);
    p(ctx, ox, oy, 9, 5, c.pipeLt);
  } else if (detailType === 2) {
    // EXHAUST VENT with warning stripes
    b(ctx, ox, oy, 3, 3, 8, 8, c.panelInner);
    // Warning stripes (diagonal yellow/black)
    for (let i = 0; i < 8; i++) {
      const stripe = (i % 2 === 0) ? c.warnYellow : c.warnBlack;
      p(ctx, ox, oy, 3 + i, 3, stripe);
      p(ctx, ox, oy, 3 + i, 10, stripe);
    }
    // Vent slats
    for (let vy = 5; vy <= 9; vy += 2) {
      b(ctx, ox, oy, 4, vy, 6, 1, c.vent);
      b(ctx, ox, oy, 5, vy, 4, 1, c.ventSlot);
    }
    // Vent frame
    b(ctx, ox, oy, 3, 4, 1, 7, c.vent);
    b(ctx, ox, oy, 10, 4, 1, 7, c.vent);
    // Heat glow from vent
    p(ctx, ox, oy, 6, 4, c.highlightDim); p(ctx, ox, oy, 7, 4, c.highlightDim);
  } else {
    // CONTROL PANEL with LEDs and buttons
    b(ctx, ox, oy, 3, 3, 8, 8, c.controlPanel);
    // Screen area
    b(ctx, ox, oy, 4, 4, 6, 3, c.gaugeDk);
    b(ctx, ox, oy, 5, 5, 4, 1, c.gauge);
    // Readout line
    p(ctx, ox, oy, 5, 5, c.controlLed); p(ctx, ox, oy, 6, 5, c.controlLed);
    p(ctx, ox, oy, 7, 5, c.controlLedOff);
    // LED row
    p(ctx, ox, oy, 4, 8, c.controlLed); p(ctx, ox, oy, 5, 8, c.controlLed);
    p(ctx, ox, oy, 6, 8, c.controlLedOff); p(ctx, ox, oy, 7, 8, c.controlLed);
    // Button
    p(ctx, ox, oy, 9, 8, c.controlBtn); p(ctx, ox, oy, 9, 9, c.controlBtn);
    // Dial
    p(ctx, ox, oy, 5, 10, c.boltHi); p(ctx, ox, oy, 6, 10, c.bolt);
    // Pipe connections on sides
    b(ctx, ox, oy, 3, 5, 1, 2, c.pipe);
    b(ctx, ox, oy, 10, 7, 1, 2, c.pipe);
  }

  // Housing bolts at corners
  p(ctx, ox, oy, 2, 2, c.boltHi); p(ctx, ox, oy, 11, 2, c.boltHi);
  p(ctx, ox, oy, 2, 11, c.bolt); p(ctx, ox, oy, 11, 11, c.bolt);
  // Bolt shadows
  p(ctx, ox, oy, 2, 3, c.boltShadow); p(ctx, ox, oy, 11, 3, c.boltShadow);

  // Additional mid-edge bolts
  p(ctx, ox, oy, 6, 2, c.bolt); p(ctx, ox, oy, 7, 2, c.bolt);
  p(ctx, ox, oy, 6, 11, c.bolt); p(ctx, ox, oy, 7, 11, c.bolt);
  p(ctx, ox, oy, 2, 6, c.bolt); p(ctx, ox, oy, 2, 7, c.bolt);
  p(ctx, ox, oy, 11, 6, c.bolt); p(ctx, ox, oy, 11, 7, c.bolt);

  // Exposed edges with beveled look
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    // Top edge highlight
    for (let px = 1; px < G - 1; px++) {
      if (px % 2 === 0) p(ctx, ox, oy, px, 0, c.highlight);
    }
    // Rivet line
    for (let px = 2; px < G - 1; px += 3) {
      p(ctx, ox, oy, px, 0, c.boltHi);
    }
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edgeDk);
    for (let px = 2; px < G - 1; px += 3) p(ctx, ox, oy, px, G - 1, c.boltHi);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    for (let py = 2; py < G - 1; py += 3) p(ctx, ox, oy, 0, py, c.boltHi);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edgeDk);
    for (let py = 2; py < G - 1; py += 3) p(ctx, ox, oy, G - 1, py, c.boltHi);
  }

  // Connected-side seam rivets (smaller, dimmer)
  if (n) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, 0, c.bolt); }
  if (s) { for (let px = 3; px < G - 2; px += 4) p(ctx, ox, oy, px, G - 1, c.bolt); }
  if (w) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, 0, py, c.bolt); }
  if (e) { for (let py = 3; py < G - 2; py += 4) p(ctx, ox, oy, G - 1, py, c.bolt); }

  // Corner treatment — fill corners only if both edges are exposed
  if (!n && !w) { p(ctx, ox, oy, 0, 0, c.highlight); }
  if (!n && !e) { p(ctx, ox, oy, G - 1, 0, c.highlightDim); }
  if (!s && !w) { p(ctx, ox, oy, 0, G - 1, c.highlightDim); }
  if (!s && !e) { p(ctx, ox, oy, G - 1, G - 1, c.edgeDk); }

  // Subtle pipe stub on connected sides
  if (n) {
    p(ctx, ox, oy, 4, 0, c.pipe); p(ctx, ox, oy, 4, 1, c.pipeDk);
    p(ctx, ox, oy, 9, 0, c.pipe); p(ctx, ox, oy, 9, 1, c.pipeDk);
  }
  if (s) {
    p(ctx, ox, oy, 4, G - 1, c.pipe); p(ctx, ox, oy, 4, G - 2, c.pipeDk);
    p(ctx, ox, oy, 9, G - 1, c.pipe); p(ctx, ox, oy, 9, G - 2, c.pipeDk);
  }
}

function drawSteam(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.steam;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Metal frame border (2px thick on exposed sides)
  if (!n) { b(ctx, ox, oy, 0, 0, G, 2, c.frame); p(ctx, ox, oy, 1, 0, c.frameLt); p(ctx, ox, oy, 12, 1, c.frameDk); }
  if (!s) { b(ctx, ox, oy, 0, G - 2, G, 2, c.frameDk); p(ctx, ox, oy, 1, G - 2, c.frame); }
  if (!w) { b(ctx, ox, oy, 0, 0, 2, G, c.frame); p(ctx, ox, oy, 0, 1, c.frameLt); }
  if (!e) { b(ctx, ox, oy, G - 2, 0, 2, G, c.frameDk); }

  // Frame bolts on exposed edges
  if (!n) { p(ctx, ox, oy, 3, 0, c.bolt); p(ctx, ox, oy, 7, 0, c.bolt); p(ctx, ox, oy, 11, 0, c.bolt); }
  if (!s) { p(ctx, ox, oy, 3, G - 1, c.bolt); p(ctx, ox, oy, 7, G - 1, c.bolt); p(ctx, ox, oy, 11, G - 1, c.bolt); }
  if (!w) { p(ctx, ox, oy, 0, 3, c.bolt); p(ctx, ox, oy, 0, 7, c.bolt); p(ctx, ox, oy, 0, 11, c.bolt); }
  if (!e) { p(ctx, ox, oy, G - 1, 3, c.bolt); p(ctx, ox, oy, G - 1, 7, c.bolt); p(ctx, ox, oy, G - 1, 11, c.bolt); }

  // Grate pattern (horizontal bars with gaps)
  const gStart = 2, gEnd = 12;
  for (let gy = 2; gy < 12; gy++) {
    if (gy % 2 === 0) {
      // Grate bar
      for (let gx = gStart; gx < gEnd; gx++) {
        p(ctx, ox, oy, gx, gy, c.grate);
      }
      // Bar highlight on top edge
      p(ctx, ox, oy, gStart, gy, c.grateLt);
      p(ctx, ox, oy, gStart + 1, gy, c.grateLt);
    } else {
      // Gap — show deep below
      for (let gx = gStart; gx < gEnd; gx++) {
        p(ctx, ox, oy, gx, gy, c.grateSlot);
      }
      // Cross supports
      p(ctx, ox, oy, 4, gy, c.grateDk);
      p(ctx, ox, oy, 9, gy, c.grateDk);
    }
  }

  // Animated steam based on frame
  if (frame === 0) {
    // Frame 0: Steam building — small wisps emerging from grate slots
    p(ctx, ox, oy, 5, 5, c.puffDim); p(ctx, ox, oy, 6, 5, c.puffDim);
    p(ctx, ox, oy, 8, 7, c.puffFaint);
    p(ctx, ox, oy, 7, 3, c.puffFaint);
    p(ctx, ox, oy, 4, 9, c.puffDim);
    // Subtle heat shimmer — slight color shift on grate bars
    p(ctx, ox, oy, 6, 4, c.heat1); p(ctx, ox, oy, 7, 6, c.heat2);
    p(ctx, ox, oy, 5, 8, c.heat1);
    // Condensation droplets on frame
    if (!n) { p(ctx, ox, oy, 5, 1, c.condensation); p(ctx, ox, oy, 10, 1, c.condensationLt); }
    if (!w) { p(ctx, ox, oy, 1, 6, c.condensation); }
  } else if (frame === 1) {
    // Frame 1: Steam burst — medium puffs billowing up
    // Main burst from center
    b(ctx, ox, oy, 5, 4, 4, 2, c.puffMid);
    p(ctx, ox, oy, 6, 4, c.puff); p(ctx, ox, oy, 7, 4, c.puff);
    p(ctx, ox, oy, 5, 3, c.puffDim); p(ctx, ox, oy, 8, 3, c.puffDim);
    // Side wisps
    p(ctx, ox, oy, 3, 5, c.puffFaint); p(ctx, ox, oy, 10, 5, c.puffFaint);
    // Secondary burst
    b(ctx, ox, oy, 8, 7, 2, 2, c.puffDim);
    p(ctx, ox, oy, 9, 7, c.puffMid);
    // Rising wisp
    p(ctx, ox, oy, 4, 3, c.puffFaint); p(ctx, ox, oy, 5, 2, c.puffWisp);
    // Heat shimmer — more visible
    p(ctx, ox, oy, 6, 6, c.heat1); p(ctx, ox, oy, 7, 8, c.heat1);
    p(ctx, ox, oy, 5, 4, c.heat2); p(ctx, ox, oy, 9, 6, c.heat2);
    // Condensation
    if (!n) { p(ctx, ox, oy, 5, 1, c.condensationLt); p(ctx, ox, oy, 8, 1, c.condensation); }
  } else {
    // Frame 2: Steam dissipating — large cloud, fading edges
    // Big cloud at top
    b(ctx, ox, oy, 4, 2, 6, 3, c.puffDim);
    b(ctx, ox, oy, 5, 2, 4, 2, c.puffMid);
    p(ctx, ox, oy, 6, 2, c.puff); p(ctx, ox, oy, 7, 2, c.puffBright);
    // Cloud edges fading
    p(ctx, ox, oy, 3, 3, c.puffFaint); p(ctx, ox, oy, 10, 3, c.puffFaint);
    p(ctx, ox, oy, 3, 2, c.puffWisp); p(ctx, ox, oy, 10, 2, c.puffWisp);
    // Trailing wisps below
    p(ctx, ox, oy, 5, 6, c.puffFaint); p(ctx, ox, oy, 8, 8, c.puffWisp);
    p(ctx, ox, oy, 6, 7, c.puffFaint);
    // Dissipating top edge
    p(ctx, ox, oy, 5, 1, c.puffWisp); p(ctx, ox, oy, 8, 1, c.puffWisp);
    // Heavy condensation
    if (!n) { p(ctx, ox, oy, 4, 1, c.condensationLt); p(ctx, ox, oy, 9, 1, c.condensationLt); }
    if (!w) { p(ctx, ox, oy, 1, 5, c.condensation); p(ctx, ox, oy, 1, 8, c.condensationLt); }
    if (!e) { p(ctx, ox, oy, G - 2, 6, c.condensation); }
    // Heat shimmer fading
    p(ctx, ox, oy, 7, 5, c.heat2);
  }

  // Corner brackets where frame edges meet
  if (!n && !w) { p(ctx, ox, oy, 1, 1, c.frameLt); }
  if (!n && !e) { p(ctx, ox, oy, G - 2, 1, c.frameDk); }
  if (!s && !w) { p(ctx, ox, oy, 1, G - 2, c.frame); }
  if (!s && !e) { p(ctx, ox, oy, G - 2, G - 2, c.frameDk); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Side rails (top and bottom of belt channel)
  b(ctx, ox, oy, 0, 3, G, 1, c.sideRail);
  b(ctx, ox, oy, 0, 10, G, 1, c.sideRailDk);
  // Rail highlight
  for (let gx = 0; gx < G; gx += 3) {
    p(ctx, ox, oy, gx, 3, c.sideRailLt);
    p(ctx, ox, oy, gx + 1, 10, c.sideRail);
  }
  // Rail rivets
  p(ctx, ox, oy, 2, 3, c.rivet); p(ctx, ox, oy, 6, 3, c.rivet); p(ctx, ox, oy, 11, 3, c.rivet);
  p(ctx, ox, oy, 2, 10, c.rivet); p(ctx, ox, oy, 6, 10, c.rivet); p(ctx, ox, oy, 11, 10, c.rivet);

  // Belt surface between rails
  b(ctx, ox, oy, 0, 4, G, 6, c.belt);

  // Belt segments (alternating shade for rubber belt look)
  for (let gx = 0; gx < G; gx += 2) {
    b(ctx, ox, oy, gx, 4, 1, 6, c.beltSegment);
  }
  // Belt highlight (top surface catches light)
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, 4, c.beltLt);
  }
  // Belt shadow at bottom
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, 9, c.beltDk);
  }

  // Rollers visible at edges of belt
  // Left roller
  b(ctx, ox, oy, 0, 5, 1, 4, c.roller);
  p(ctx, ox, oy, 0, 5, c.rollerLt); p(ctx, ox, oy, 0, 8, c.rollerDk);
  p(ctx, ox, oy, 0, 6, c.rollerAxle); p(ctx, ox, oy, 0, 7, c.rollerAxle);
  // Right roller
  b(ctx, ox, oy, G - 1, 5, 1, 4, c.roller);
  p(ctx, ox, oy, G - 1, 5, c.rollerLt); p(ctx, ox, oy, G - 1, 8, c.rollerDk);
  p(ctx, ox, oy, G - 1, 6, c.rollerAxle); p(ctx, ox, oy, G - 1, 7, c.rollerAxle);

  // Chevron direction markings (V-shaped pointing right)
  for (let gx = 1; gx < G - 2; gx += 4) {
    // V chevron shape
    p(ctx, ox, oy, gx, 5, c.chevron);
    p(ctx, ox, oy, gx + 1, 6, c.chevron);
    p(ctx, ox, oy, gx + 1, 7, c.chevron);
    p(ctx, ox, oy, gx, 8, c.chevron);
    // Chevron shadow
    p(ctx, ox, oy, gx, 6, c.chevronDim);
    p(ctx, ox, oy, gx, 7, c.chevronDim);
  }

  // Floor area above and below belt
  // Top floor
  for (let gx = 0; gx < G; gx += 7) {
    for (let gy = 0; gy < 3; gy++) p(ctx, ox, oy, gx, gy, PAL.ground.accent);
  }
  for (let gy = 0; gy < 3; gy += 2) {
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, gy, PAL.ground.accent);
  }
  // Bottom floor
  for (let gx = 0; gx < G; gx += 7) {
    for (let gy = 11; gy < G; gy++) p(ctx, ox, oy, gx, gy, PAL.ground.accent);
  }
  for (let gy = 11; gy < G; gy += 2) {
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, gy, PAL.ground.accent);
  }

  // Vertical rail connections for N/S neighbors
  if (n) {
    b(ctx, ox, oy, 5, 0, 1, 4, c.sideRailDk);
    b(ctx, ox, oy, 8, 0, 1, 4, c.sideRailDk);
    b(ctx, ox, oy, 6, 0, 2, 4, c.belt);
    p(ctx, ox, oy, 6, 1, c.chevronDim); p(ctx, ox, oy, 7, 2, c.chevronDim);
  }
  if (s) {
    b(ctx, ox, oy, 5, 10, 1, 4, c.sideRailDk);
    b(ctx, ox, oy, 8, 10, 1, 4, c.sideRailDk);
    b(ctx, ox, oy, 6, 10, 2, 4, c.belt);
    p(ctx, ox, oy, 6, 11, c.chevronDim); p(ctx, ox, oy, 7, 12, c.chevronDim);
  }
  if (w) {
    b(ctx, ox, oy, 0, 5, 1, 4, c.belt);
    p(ctx, ox, oy, 0, 6, c.chevronDim);
  }
  if (e) {
    b(ctx, ox, oy, G - 1, 5, 1, 4, c.belt);
    p(ctx, ox, oy, G - 1, 6, c.chevronDim);
  }

  // Center junction node (where belts cross)
  b(ctx, ox, oy, 6, 6, 2, 2, c.rail);
  p(ctx, ox, oy, 6, 6, c.railLt); p(ctx, ox, oy, 7, 7, c.railDk);

  // End caps on non-connected sides
  if (!n) { p(ctx, ox, oy, 6, 0, c.rail); p(ctx, ox, oy, 7, 0, c.rail); }
  if (!s) { p(ctx, ox, oy, 6, G - 1, c.rail); p(ctx, ox, oy, 7, G - 1, c.railDk); }
  if (!w) { p(ctx, ox, oy, 0, 6, c.rail); p(ctx, ox, oy, 0, 7, c.rail); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.railDk); p(ctx, ox, oy, G - 1, 7, c.railDk); }

  // Subtle warning stripe at belt edges
  p(ctx, ox, oy, 1, 3, c.rail); p(ctx, ox, oy, 4, 3, c.rail); p(ctx, ox, oy, 9, 3, c.rail);
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: {
      // GEAR ON FLOOR — detailed cog with teeth and axle
      // Outer teeth (8 directions)
      p(ctx, ox, oy, 6, 2, d.brass); p(ctx, ox, oy, 7, 2, d.brass);
      p(ctx, ox, oy, 3, 5, d.brass); p(ctx, ox, oy, 3, 6, d.brass);
      p(ctx, ox, oy, 10, 7, d.brass); p(ctx, ox, oy, 10, 8, d.brass);
      p(ctx, ox, oy, 6, 11, d.brass); p(ctx, ox, oy, 7, 11, d.brass);
      // Diagonal teeth
      p(ctx, ox, oy, 4, 3, d.brassDk); p(ctx, ox, oy, 9, 3, d.brassDk);
      p(ctx, ox, oy, 4, 10, d.brassDk); p(ctx, ox, oy, 9, 10, d.brassDk);
      // Gear body ring
      b(ctx, ox, oy, 5, 4, 4, 6, d.brass);
      b(ctx, ox, oy, 4, 5, 6, 4, d.brass);
      // Inner cutout
      b(ctx, ox, oy, 5, 5, 4, 4, d.brassDk);
      // Spokes
      p(ctx, ox, oy, 5, 7, d.brass); p(ctx, ox, oy, 8, 6, d.brass);
      p(ctx, ox, oy, 7, 5, d.brass); p(ctx, ox, oy, 6, 8, d.brass);
      // Center axle
      p(ctx, ox, oy, 6, 6, d.steelLt); p(ctx, ox, oy, 7, 7, d.steelDk);
      p(ctx, ox, oy, 7, 6, d.steel); p(ctx, ox, oy, 6, 7, d.steel);
      // Highlight
      p(ctx, ox, oy, 5, 4, d.brassLt); p(ctx, ox, oy, 6, 4, d.brassLt);
      // Shadow
      p(ctx, ox, oy, 8, 9, d.dark); p(ctx, ox, oy, 9, 9, d.dark);
      break;
    }
    case 1: {
      // WRENCH TOOL — adjustable wrench lying on floor
      // Handle
      p(ctx, ox, oy, 3, 10, d.steelDk); p(ctx, ox, oy, 4, 9, d.steel);
      p(ctx, ox, oy, 5, 8, d.steel); p(ctx, ox, oy, 6, 7, d.steel);
      p(ctx, ox, oy, 3, 11, d.steelDk); p(ctx, ox, oy, 4, 10, d.steelDk);
      // Shaft
      p(ctx, ox, oy, 7, 6, d.steelLt); p(ctx, ox, oy, 8, 5, d.steelLt);
      // Jaw (open end)
      p(ctx, ox, oy, 9, 4, d.steel); p(ctx, ox, oy, 10, 3, d.steel);
      p(ctx, ox, oy, 9, 3, d.steelLt);
      p(ctx, ox, oy, 11, 3, d.steelDk); p(ctx, ox, oy, 11, 4, d.steelDk);
      p(ctx, ox, oy, 10, 5, d.steel);
      // Adjustment wheel
      p(ctx, ox, oy, 8, 4, d.brass); p(ctx, ox, oy, 9, 5, d.brassDk);
      // Handle grip texture
      p(ctx, ox, oy, 3, 10, d.red); p(ctx, ox, oy, 4, 9, d.handle);
      p(ctx, ox, oy, 2, 11, d.handle);
      // Shadow beneath
      p(ctx, ox, oy, 4, 11, d.darkDeep); p(ctx, ox, oy, 5, 10, d.darkDeep);
      break;
    }
    case 2: {
      // OIL PUDDLE — irregular dark puddle with iridescent sheen
      // Main puddle body
      b(ctx, ox, oy, 5, 6, 5, 3, d.oil);
      p(ctx, ox, oy, 4, 7, d.oil); p(ctx, ox, oy, 10, 7, d.oil);
      p(ctx, ox, oy, 4, 8, d.oil); p(ctx, ox, oy, 10, 8, d.oil);
      p(ctx, ox, oy, 6, 5, d.oil); p(ctx, ox, oy, 7, 5, d.oil);
      p(ctx, ox, oy, 5, 9, d.oil); p(ctx, ox, oy, 8, 9, d.oil);
      // Spread fingers
      p(ctx, ox, oy, 3, 8, d.oilSheen);
      p(ctx, ox, oy, 9, 5, d.oilSheen);
      p(ctx, ox, oy, 6, 10, d.oilSheen);
      // Iridescent sheen highlights
      p(ctx, ox, oy, 6, 6, '#2a2a30'); // blue tint
      p(ctx, ox, oy, 7, 7, '#302a28'); // warm tint
      p(ctx, ox, oy, 8, 6, '#282a2e'); // cool tint
      p(ctx, ox, oy, 5, 7, '#2e2a30'); // purple tint
      // Light reflection
      p(ctx, ox, oy, 7, 6, '#3a3a38');
      break;
    }
    case 3: {
      // PRESSURE GAUGE — round gauge face with bezel and needle
      // Bezel ring (brass)
      p(ctx, ox, oy, 6, 3, d.brass); p(ctx, ox, oy, 7, 3, d.brass);
      p(ctx, ox, oy, 4, 4, d.brass); p(ctx, ox, oy, 9, 4, d.brass);
      p(ctx, ox, oy, 3, 5, d.brass); p(ctx, ox, oy, 3, 6, d.brass); p(ctx, ox, oy, 3, 7, d.brass);
      p(ctx, ox, oy, 10, 5, d.brassDk); p(ctx, ox, oy, 10, 6, d.brassDk); p(ctx, ox, oy, 10, 7, d.brassDk);
      p(ctx, ox, oy, 4, 8, d.brassDk); p(ctx, ox, oy, 9, 8, d.brassDk);
      p(ctx, ox, oy, 6, 9, d.brassDk); p(ctx, ox, oy, 7, 9, d.brassDk);
      // Bezel highlight
      p(ctx, ox, oy, 5, 3, d.brassLt); p(ctx, ox, oy, 4, 4, d.brassLt);
      // Gauge face (white/cream)
      b(ctx, ox, oy, 5, 5, 4, 3, '#ccccbb');
      p(ctx, ox, oy, 4, 5, '#ccccbb'); p(ctx, ox, oy, 9, 5, '#bbbbaa');
      p(ctx, ox, oy, 4, 6, '#ccccbb'); p(ctx, ox, oy, 9, 6, '#bbbbaa');
      p(ctx, ox, oy, 4, 7, '#bbbbaa'); p(ctx, ox, oy, 9, 7, '#aaaaaa');
      p(ctx, ox, oy, 5, 4, '#ccccbb'); p(ctx, ox, oy, 8, 4, '#bbbbaa');
      p(ctx, ox, oy, 5, 8, '#aaaaaa'); p(ctx, ox, oy, 8, 8, '#999988');
      // Scale markings
      p(ctx, ox, oy, 5, 4, '#666655'); p(ctx, ox, oy, 8, 4, '#666655');
      p(ctx, ox, oy, 4, 6, '#666655'); p(ctx, ox, oy, 9, 6, '#666655');
      // Needle (pointing to high pressure — upper right)
      p(ctx, ox, oy, 7, 6, d.red); p(ctx, ox, oy, 8, 5, d.red);
      // Center pivot
      p(ctx, ox, oy, 6, 6, d.dark); p(ctx, ox, oy, 7, 7, d.dark);
      // Mounting pipe below
      p(ctx, ox, oy, 6, 10, d.gunmetal); p(ctx, ox, oy, 7, 10, d.gunmetal);
      p(ctx, ox, oy, 6, 11, d.gunmetalDk); p(ctx, ox, oy, 7, 11, d.gunmetalDk);
      break;
    }
    case 4: {
      // PIPE SECTION — horizontal pipe with flange and joint
      // Main pipe body
      b(ctx, ox, oy, 2, 5, 10, 4, d.gunmetal);
      // Highlight on top surface
      b(ctx, ox, oy, 2, 5, 10, 1, d.gunmetalLt);
      b(ctx, ox, oy, 3, 5, 8, 1, d.steelDk);
      // Shadow on bottom
      b(ctx, ox, oy, 2, 8, 10, 1, d.gunmetalDk);
      // Flanges at each end
      b(ctx, ox, oy, 2, 4, 1, 6, d.steel);
      b(ctx, ox, oy, 11, 4, 1, 6, d.steelDk);
      // Flange bolts
      p(ctx, ox, oy, 2, 4, d.boltHi); p(ctx, ox, oy, 2, 9, d.boltHi);
      p(ctx, ox, oy, 11, 4, d.boltHi); p(ctx, ox, oy, 11, 9, d.boltHi);
      // Joint ring in middle
      b(ctx, ox, oy, 6, 4, 2, 6, d.steel);
      p(ctx, ox, oy, 6, 4, d.steelLt); p(ctx, ox, oy, 7, 9, d.steelDk);
      // Rivet on joint
      p(ctx, ox, oy, 6, 6, d.boltHi); p(ctx, ox, oy, 7, 7, d.boltHi);
      // Rust spot
      p(ctx, ox, oy, 4, 7, d.rust); p(ctx, ox, oy, 9, 6, d.rustDk);
      // Shadow beneath pipe
      b(ctx, ox, oy, 3, 10, 8, 1, d.darkDeep);
      break;
    }
    case 5: {
      // WARNING SIGN — diamond-shaped yellow/black hazard sign
      // Diamond shape — yellow fill
      p(ctx, ox, oy, 7, 2, d.warnYellow);
      p(ctx, ox, oy, 6, 3, d.warnYellow); p(ctx, ox, oy, 7, 3, d.warnYellow); p(ctx, ox, oy, 8, 3, d.warnYellow);
      b(ctx, ox, oy, 5, 4, 5, 1, d.warnYellow);
      b(ctx, ox, oy, 4, 5, 7, 1, d.warnYellow);
      b(ctx, ox, oy, 4, 6, 7, 1, d.warnYellow);
      b(ctx, ox, oy, 4, 7, 7, 1, d.warnYellow);
      b(ctx, ox, oy, 5, 8, 5, 1, d.warnYellow);
      p(ctx, ox, oy, 6, 9, d.warnYellow); p(ctx, ox, oy, 7, 9, d.warnYellow); p(ctx, ox, oy, 8, 9, d.warnYellow);
      p(ctx, ox, oy, 7, 10, d.warnYellow);
      // Black border
      p(ctx, ox, oy, 6, 2, d.warnBlack); p(ctx, ox, oy, 8, 2, d.warnBlack);
      p(ctx, ox, oy, 5, 3, d.warnBlack); p(ctx, ox, oy, 9, 3, d.warnBlack);
      p(ctx, ox, oy, 3, 5, d.warnBlack); p(ctx, ox, oy, 3, 6, d.warnBlack); p(ctx, ox, oy, 3, 7, d.warnBlack);
      p(ctx, ox, oy, 11, 5, d.warnBlack); p(ctx, ox, oy, 11, 6, d.warnBlack); p(ctx, ox, oy, 11, 7, d.warnBlack);
      p(ctx, ox, oy, 5, 9, d.warnBlack); p(ctx, ox, oy, 9, 9, d.warnBlack);
      p(ctx, ox, oy, 6, 10, d.warnBlack); p(ctx, ox, oy, 8, 10, d.warnBlack);
      // Exclamation mark
      p(ctx, ox, oy, 7, 4, d.warnBlack); p(ctx, ox, oy, 7, 5, d.warnBlack);
      p(ctx, ox, oy, 7, 6, d.warnBlack); p(ctx, ox, oy, 7, 8, d.warnBlack);
      // Post
      p(ctx, ox, oy, 7, 11, d.steel); p(ctx, ox, oy, 7, 12, d.steelDk);
      break;
    }
    case 6: {
      // TOOLBOX — open toolbox with tools visible
      // Box body
      b(ctx, ox, oy, 3, 6, 8, 5, d.red);
      b(ctx, ox, oy, 3, 6, 8, 1, d.redDk);
      // Box interior (visible because open)
      b(ctx, ox, oy, 4, 4, 6, 3, d.darkDeep);
      // Box lid (open, angled back)
      b(ctx, ox, oy, 3, 3, 8, 1, d.red);
      p(ctx, ox, oy, 3, 3, d.redDk); p(ctx, ox, oy, 10, 3, d.redDk);
      // Handle
      p(ctx, ox, oy, 6, 2, d.steel); p(ctx, ox, oy, 7, 2, d.steel);
      p(ctx, ox, oy, 5, 3, d.steelDk); p(ctx, ox, oy, 8, 3, d.steelDk);
      // Latch
      p(ctx, ox, oy, 6, 6, d.brass); p(ctx, ox, oy, 7, 6, d.brass);
      // Tools visible inside
      p(ctx, ox, oy, 5, 5, d.steelLt); p(ctx, ox, oy, 5, 4, d.steelLt); // screwdriver
      p(ctx, ox, oy, 7, 5, d.brass); p(ctx, ox, oy, 8, 4, d.brassLt); // wrench handle
      p(ctx, ox, oy, 6, 5, d.dark); // dark gap
      // Box bottom shadow
      b(ctx, ox, oy, 4, 11, 6, 1, d.darkDeep);
      // Corner rivets
      p(ctx, ox, oy, 3, 7, d.boltHi); p(ctx, ox, oy, 10, 7, d.boltHi);
      p(ctx, ox, oy, 3, 10, d.boltHi); p(ctx, ox, oy, 10, 10, d.boltHi);
      break;
    }
    case 7: {
      // STEAM PIPE ELBOW — L-shaped pipe with valve wheel
      // Vertical section
      b(ctx, ox, oy, 5, 2, 3, 6, d.gunmetal);
      b(ctx, ox, oy, 5, 2, 3, 1, d.gunmetalLt);
      p(ctx, ox, oy, 5, 2, d.steelLt);
      // Elbow joint
      b(ctx, ox, oy, 5, 7, 4, 3, d.gunmetal);
      p(ctx, ox, oy, 5, 7, d.gunmetalLt); p(ctx, ox, oy, 8, 9, d.gunmetalDk);
      // Horizontal section
      b(ctx, ox, oy, 8, 7, 4, 3, d.gunmetal);
      b(ctx, ox, oy, 8, 7, 4, 1, d.gunmetalLt);
      // Flange at vertical top
      b(ctx, ox, oy, 4, 2, 5, 1, d.steel);
      p(ctx, ox, oy, 4, 2, d.steelLt); p(ctx, ox, oy, 8, 2, d.steelDk);
      // Flange at horizontal end
      b(ctx, ox, oy, 11, 6, 1, 5, d.steel);
      p(ctx, ox, oy, 11, 6, d.steelLt); p(ctx, ox, oy, 11, 10, d.steelDk);
      // Valve wheel on elbow
      p(ctx, ox, oy, 6, 5, d.copper); p(ctx, ox, oy, 7, 5, d.copper);
      p(ctx, ox, oy, 5, 5, d.copperDk); p(ctx, ox, oy, 8, 5, d.copperDk);
      p(ctx, ox, oy, 6, 4, d.copperLt); p(ctx, ox, oy, 7, 4, d.copper);
      // Valve center
      p(ctx, ox, oy, 6, 5, d.brassLt);
      // Steam wisp from joint
      p(ctx, ox, oy, 9, 6, '#aaaaaa'); p(ctx, ox, oy, 10, 5, '#888888');
      // Rust on elbow
      p(ctx, ox, oy, 6, 8, d.rust); p(ctx, ox, oy, 7, 9, d.rustDk);
      // Shadow
      b(ctx, ox, oy, 6, 10, 5, 1, d.darkDeep);
      break;
    }
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
