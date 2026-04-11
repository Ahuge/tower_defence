/**
 * Infernal Terrain Sprite Generator — Hellscape / Demon's Throne Room terrain.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for lava pools.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: scorched stone / brimstone floor (volcanic ground with glowing cracks)
 *   1: obsidian spires / demon structures (blocked type 1)
 *   2: lava pool frame 0 (blocked type 2, animated — bubbling lava)
 *   3: lava pool frame 1 (animated — bubbles growing, crust breaking)
 *   4: lava pool frame 2 (animated — bubbles popping, imp arm)
 *   5: lava seepage / ember patches (NoBuild — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: hellscape doodads (8 types)
 *     0: skull pile, 1: broken chain, 2: demon horn, 3: flame geyser,
 *     4: obsidian shard, 5: iron maiden fragment, 6: pentagram, 7: floating ember cluster
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

// Infernal color palettes — HELL theme
const PAL = {
  // Scorched stone ground
  ground: {
    base: '#120805',
    baseLt: '#160a07',
    accent: '#1a0d08',
    accentDk: '#0e0604',
  },
  // Obsidian / demon structure
  obsidian: {
    base: '#0a0405',       // near-black obsidian
    facet1: '#1a0808',     // facet dark
    facet2: '#220e0e',     // facet medium
    facetShine: '#442222',  // facet bright reflection
    facetGlint: '#553322', // crystal glint
    skullBone: '#887766',  // skull relief
    skullEye: '#cc1a00',   // skull eye glow (toned down)
    skullShadow: '#443322', // skull dark
    cage: '#554433',       // iron cage bars
    cageRust: '#663322',   // rusted cage
    altarTop: '#331818',   // altar surface
    altarBlood: '#880022',  // bloodstain
    altarBloodBright: '#aa0033',
    glowEdge: '#cc280044', // lava light on edges (toned down)
    glowBright: '#cc440066', // (toned down)
    dark: '#060203',       // deepest shadow
  },
  // Lava pool
  lava: {
    core: '#cc3300',       // main lava orange (toned down)
    mid: '#cc5218',        // medium lava (toned down)
    bright: '#cc8833',     // bright lava (toned down)
    white: '#ccb066',      // near-white hotspot (toned down)
    yellow: '#cca228',     // yellow hot (toned down)
    darkEdge: '#991a00',   // cooled edge (toned down)
    crust: '#331100',      // cooled crust
    crustMid: '#552200',   // crust mid
    crustLight: '#663300',  // crust highlight
    dim: '#771300',        // dim lava (toned down)
    bubble: '#cca250',     // bubble surface (toned down)
    bubbleHighlight: '#ccbb88', // bubble hot center (toned down)
    bubbleShadow: '#993300',  // bubble edge (toned down)
    impSkin: '#774433',    // drowning imp
    impHand: '#885544',    // imp hand
  },
  // NoBuild — lava seepage
  nobuild: {
    base: '#221008',       // cracked dark ground
    baseMid: '#2a1410',    // ground variation
    crack: '#110604',      // crack shadow
    crackDeep: '#0a0302',  // deep crack
    lavaSeep: '#cc3300',   // lava in crack (toned down)
    lavaGlow: '#cc550044', // glow around seep (toned down)
    ember: '#cc6b28',      // ember particle (toned down)
    emberBright: '#cc8833', // bright ember (toned down)
    emberDim: '#993300',   // dim ember (toned down)
    scorched: '#180a04',   // scorched earth
    transGround: '#2a1810', // transition to normal
    smoke: '#44333380',    // smoke wisps
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

// Seeded pseudo-random for deterministic variation per tile variant
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >> 16) / 32768;
  };
}

// ===================== TERRAIN DRAWERS =====================

function drawBrimstoneGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.ground;
  // Very dark scorched stone base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle texture pixels (faint warm/red tint)
  p(ctx, ox, oy, 5, 3, c.baseLt);
  p(ctx, ox, oy, 10, 8, c.accent);
  p(ctx, ox, oy, 2, 11, c.baseLt);
  // One darker depression
  p(ctx, ox, oy, 8, 6, c.accentDk);
}

function drawObsidianRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.obsidian;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 41 + 19);

  // Near-black obsidian base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Faceted crystal structure — angular blocks with highlights
  // Large faceted obsidian blocks
  b(ctx, ox, oy, 1, 1, 5, 5, c.facet1);
  b(ctx, ox, oy, 7, 0, 6, 4, c.facet1);
  b(ctx, ox, oy, 2, 7, 5, 5, c.facet1);
  b(ctx, ox, oy, 8, 5, 5, 6, c.facet1);
  b(ctx, ox, oy, 0, 11, 4, 3, c.facet1);
  b(ctx, ox, oy, 10, 10, 4, 4, c.facet1);

  // Mid-tone facet faces — angled crystal planes
  b(ctx, ox, oy, 2, 2, 3, 3, c.facet2);
  b(ctx, ox, oy, 8, 1, 4, 2, c.facet2);
  b(ctx, ox, oy, 3, 8, 3, 3, c.facet2);
  b(ctx, ox, oy, 9, 6, 3, 4, c.facet2);
  b(ctx, ox, oy, 1, 12, 2, 2, c.facet2);
  b(ctx, ox, oy, 11, 11, 2, 2, c.facet2);

  // Crystal glint highlights — sharp single-pixel reflections
  p(ctx, ox, oy, 2, 2, c.facetShine);
  p(ctx, ox, oy, 3, 2, c.facetGlint);
  p(ctx, ox, oy, 8, 1, c.facetShine);
  p(ctx, ox, oy, 10, 1, c.facetGlint);
  p(ctx, ox, oy, 3, 8, c.facetShine);
  p(ctx, ox, oy, 9, 6, c.facetShine);
  p(ctx, ox, oy, 11, 11, c.facetGlint);

  // Diagonal facet lines — crystal edges
  p(ctx, ox, oy, 5, 1, c.facetShine);
  p(ctx, ox, oy, 6, 2, c.facet2);
  p(ctx, ox, oy, 6, 5, c.facetShine);
  p(ctx, ox, oy, 7, 6, c.facet2);
  p(ctx, ox, oy, 12, 4, c.facetShine);
  p(ctx, ox, oy, 13, 5, c.facet2);

  // Deep shadow crevices between blocks
  p(ctx, ox, oy, 6, 0, c.dark);
  p(ctx, ox, oy, 6, 1, c.dark);
  p(ctx, ox, oy, 6, 3, c.dark);
  p(ctx, ox, oy, 6, 4, c.dark);
  p(ctx, ox, oy, 1, 6, c.dark);
  p(ctx, ox, oy, 2, 6, c.dark);
  p(ctx, ox, oy, 7, 4, c.dark);
  p(ctx, ox, oy, 7, 5, c.dark);
  p(ctx, ox, oy, 4, 12, c.dark);

  // === DEMON SKULL RELIEF carved into wall (variant-dependent position) ===
  const skullX = (idx % 3) * 3 + 2;
  const skullY = (idx % 2) * 4 + 3;
  if (idx % 4 < 3 && skullX + 4 < G && skullY + 4 < G) {
    // Cranium carved in relief
    p(ctx, ox, oy, skullX + 1, skullY, c.skullShadow);
    p(ctx, ox, oy, skullX + 2, skullY, c.skullShadow);
    p(ctx, ox, oy, skullX, skullY + 1, c.skullBone);
    p(ctx, ox, oy, skullX + 1, skullY + 1, c.skullBone);
    p(ctx, ox, oy, skullX + 2, skullY + 1, c.skullBone);
    p(ctx, ox, oy, skullX + 3, skullY + 1, c.skullShadow);
    // Glowing red eyes
    p(ctx, ox, oy, skullX + 1, skullY + 2, c.skullEye);
    p(ctx, ox, oy, skullX + 3, skullY + 2, c.skullEye);
    // Nose/mouth
    p(ctx, ox, oy, skullX + 2, skullY + 2, c.skullShadow);
    p(ctx, ox, oy, skullX + 1, skullY + 3, c.skullShadow);
    p(ctx, ox, oy, skullX + 2, skullY + 3, c.skullShadow);
    p(ctx, ox, oy, skullX + 3, skullY + 3, c.skullShadow);
  }

  // === IRON CAGE BARS (imp cages) on certain variants ===
  if (idx % 5 === 1 || idx % 5 === 3) {
    const cageX = idx % 2 === 0 ? 1 : 8;
    // Vertical bars
    for (let cy = 2; cy < 12; cy += 1) {
      p(ctx, ox, oy, cageX, cy, c.cage);
      p(ctx, ox, oy, cageX + 2, cy, c.cage);
      p(ctx, ox, oy, cageX + 4, cy, c.cage);
    }
    // Horizontal crossbar
    b(ctx, ox, oy, cageX, 4, 5, 1, c.cageRust);
    b(ctx, ox, oy, cageX, 9, 5, 1, c.cageRust);
    // Rust spots
    p(ctx, ox, oy, cageX + 1, 6, c.cageRust);
    p(ctx, ox, oy, cageX + 3, 7, c.cageRust);
  }

  // === SACRIFICIAL ALTAR STONE with bloodstains on certain variants ===
  if (idx % 7 === 0 || idx % 7 === 4) {
    b(ctx, ox, oy, 4, 10, 6, 3, c.altarTop);
    // Blood dripping down
    p(ctx, ox, oy, 5, 10, c.altarBlood);
    p(ctx, ox, oy, 6, 10, c.altarBloodBright);
    p(ctx, ox, oy, 7, 10, c.altarBlood);
    p(ctx, ox, oy, 6, 11, c.altarBlood);
    p(ctx, ox, oy, 8, 11, c.altarBloodBright);
    p(ctx, ox, oy, 7, 12, c.altarBlood);
    // Altar edge highlight
    b(ctx, ox, oy, 4, 10, 6, 1, c.facetShine);
  }

  // === SPIRE TIPS — pointed obsidian spires on exposed edges ===
  if (!n) {
    // Top edge: jagged spire silhouette with orange lava glow
    b(ctx, ox, oy, 0, 0, G, 1, c.facet2);
    // Jagged points reaching up
    p(ctx, ox, oy, 2, 0, c.facetShine);
    p(ctx, ox, oy, 5, 0, c.facetGlint);
    p(ctx, ox, oy, 9, 0, c.facetShine);
    p(ctx, ox, oy, 12, 0, c.facetGlint);
    // Orange lava glow reflecting on top edge
    b(ctx, ox, oy, 1, 0, 3, 1, c.glowEdge);
    b(ctx, ox, oy, 6, 0, 4, 1, c.glowEdge);
    b(ctx, ox, oy, 11, 0, 2, 1, c.glowEdge);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.facet2);
    // Bright lava glow from below
    b(ctx, ox, oy, 2, G - 1, 4, 1, c.glowBright);
    b(ctx, ox, oy, 8, G - 1, 3, 1, c.glowBright);
    p(ctx, ox, oy, 5, G - 1, c.glowEdge);
    p(ctx, ox, oy, 12, G - 1, c.glowEdge);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.facet2);
    // Side glow strips
    b(ctx, ox, oy, 0, 2, 1, 4, c.glowEdge);
    b(ctx, ox, oy, 0, 8, 1, 4, c.glowEdge);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.facet2);
    b(ctx, ox, oy, G - 1, 1, 1, 3, c.glowEdge);
    b(ctx, ox, oy, G - 1, 7, 1, 5, c.glowEdge);
  }

  // Scattered obsidian dust texture
  for (let i = 0; i < 8; i++) {
    const dx = Math.floor(rng() * G);
    const dy = Math.floor(rng() * G);
    p(ctx, ox, oy, dx, dy, rng() > 0.5 ? c.dark : c.facet1);
  }
}

function drawLavaPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.lava;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 53 + frame * 17 + 11);

  // Fully interior tile (variant 15 = all NESW neighbors are lava):
  // Fill entire tile as continuous lava surface — no crust, no edge treatment
  const isInterior = idx === 15;

  if (isInterior) {
    // Continuous molten lava — no crust base, no ring layering
    b(ctx, ox, oy, 0, 0, G, G, c.core);
    // Subtle variation across the surface
    b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.mid);
    b(ctx, ox, oy, 3, 3, G - 6, G - 6, c.bright);
    // Add some dim patches for texture (not edges, just natural variation)
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const v = rng();
        if (v < 0.08) p(ctx, ox, oy, gx, gy, c.dim);
        else if (v < 0.14) p(ctx, ox, oy, gx, gy, c.core);
        else if (v < 0.18) p(ctx, ox, oy, gx, gy, c.bright);
      }
    }
  } else {
    // Non-interior tiles: cooled crust base with layered lava rings
    b(ctx, ox, oy, 0, 0, G, G, c.crust);

    // Crust texture — irregular cooled patches
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const dist = Math.min(gx, gy, G - 1 - gx, G - 1 - gy);
        if (dist < 2) continue; // edges handled separately
        const v = rng();
        if (v < 0.1) p(ctx, ox, oy, gx, gy, c.crustMid);
        else if (v < 0.15) p(ctx, ox, oy, gx, gy, c.crustLight);
      }
    }

    // Lava core — layered glow from edge to center
    // Outer ring: dim lava
    b(ctx, ox, oy, 2, 2, G - 4, G - 4, c.dim);
    // Middle ring: main orange
    b(ctx, ox, oy, 3, 3, G - 6, G - 6, c.core);
    // Inner ring: brighter
    b(ctx, ox, oy, 4, 4, G - 8, G - 8, c.mid);
    // Hot center
    b(ctx, ox, oy, 5, 5, G - 10, G - 10, c.bright);
  }

  // Surface crust forming and breaking per frame
  // Frame 0: more crust visible
  // Frame 1: crust cracking
  // Frame 2: crust broken, more molten visible
  if (frame === 0) {
    // Cooling crust patches on surface
    b(ctx, ox, oy, 4, 3, 3, 2, c.crustMid);
    b(ctx, ox, oy, 8, 6, 2, 3, c.crustMid);
    b(ctx, ox, oy, 3, 9, 4, 2, c.crustMid);
    p(ctx, ox, oy, 5, 3, c.crustLight);
    p(ctx, ox, oy, 9, 7, c.crustLight);
    p(ctx, ox, oy, 4, 9, c.crustLight);
  } else if (frame === 1) {
    // Crust cracking — bright lines through dark patches
    b(ctx, ox, oy, 4, 3, 3, 2, c.crustMid);
    p(ctx, ox, oy, 5, 3, c.bright); // crack through crust
    p(ctx, ox, oy, 5, 4, c.yellow); // crack glows
    b(ctx, ox, oy, 8, 7, 2, 2, c.crustMid);
    p(ctx, ox, oy, 9, 7, c.bright);
    b(ctx, ox, oy, 3, 9, 3, 1, c.crustMid);
    p(ctx, ox, oy, 4, 9, c.yellow);
  } else {
    // Crust mostly broken — more molten surface
    p(ctx, ox, oy, 4, 3, c.crustMid); // tiny remnant
    p(ctx, ox, oy, 9, 7, c.crustMid);
    // Extra bright where crust broke away
    b(ctx, ox, oy, 5, 3, 2, 2, c.bright);
    b(ctx, ox, oy, 3, 9, 3, 1, c.yellow);
  }

  // Lava flow streaks that shift per frame
  const flowShift = frame * 2;
  for (let gy = 3; gy < G - 3; gy += 2) {
    const sx = ((flowShift + gy * 3) % 5) + 2;
    const streakLen = 3 + (gy % 2);
    for (let dx = 0; dx < streakLen && sx + dx < G - 2; dx++) {
      const sc = rng() > 0.5 ? c.mid : c.bright;
      p(ctx, ox, oy, sx + dx, gy, sc);
    }
  }

  // Bright hotspots pulsing with frame
  const hotColors = [c.white, c.yellow, c.bright];
  b(ctx, ox, oy, 5 + (frame % 2), 5, 2, 2, hotColors[frame % 3]);
  b(ctx, ox, oy, 3, 7 - frame, 2, 1, hotColors[(frame + 1) % 3]);
  b(ctx, ox, oy, 9, 4 + frame, 2, 2, hotColors[(frame + 2) % 3]);
  // White-hot center pixel
  p(ctx, ox, oy, 6 + (frame % 2), 6, c.white);

  // === BUBBLES — form, grow, pop across 3 frames ===
  if (frame === 0) {
    // Small bubble forming at position A
    p(ctx, ox, oy, 4, 5, c.bubble);
    // Small bubble forming at position B
    p(ctx, ox, oy, 10, 8, c.bubble);
    // New bubble just appearing at C
    p(ctx, ox, oy, 7, 10, c.bubbleShadow);
    // Residual ring from previous pop at D
    p(ctx, ox, oy, 8, 3, c.mid);
    p(ctx, ox, oy, 9, 4, c.mid);
  } else if (frame === 1) {
    // Bubble A growing — 2x2 with highlight
    p(ctx, ox, oy, 4, 4, c.bubbleShadow);
    p(ctx, ox, oy, 5, 4, c.bubbleShadow);
    p(ctx, ox, oy, 4, 5, c.bubble);
    p(ctx, ox, oy, 5, 5, c.bubbleHighlight);
    // Bubble B growing
    p(ctx, ox, oy, 10, 7, c.bubbleShadow);
    p(ctx, ox, oy, 11, 7, c.bubbleShadow);
    p(ctx, ox, oy, 10, 8, c.bubble);
    p(ctx, ox, oy, 11, 8, c.bubbleHighlight);
    // Bubble C growing
    p(ctx, ox, oy, 7, 9, c.bubbleShadow);
    p(ctx, ox, oy, 7, 10, c.bubble);
    p(ctx, ox, oy, 8, 10, c.bubbleHighlight);
  } else {
    // Bubble A POPPING — ring of splash
    p(ctx, ox, oy, 3, 4, c.yellow);
    p(ctx, ox, oy, 5, 4, c.yellow);
    p(ctx, ox, oy, 4, 3, c.yellow);
    p(ctx, ox, oy, 4, 5, c.bright);
    p(ctx, ox, oy, 6, 5, c.yellow);
    // Bubble B POPPING
    p(ctx, ox, oy, 9, 7, c.yellow);
    p(ctx, ox, oy, 11, 7, c.yellow);
    p(ctx, ox, oy, 10, 6, c.yellow);
    p(ctx, ox, oy, 10, 8, c.bright);
    p(ctx, ox, oy, 12, 8, c.yellow);
    // Bubble C popping
    p(ctx, ox, oy, 6, 9, c.yellow);
    p(ctx, ox, oy, 8, 9, c.yellow);
    p(ctx, ox, oy, 7, 8, c.yellow);
    p(ctx, ox, oy, 7, 10, c.bright);

    // === DROWNING IMP (on certain variants) — arm reaching out then sinking ===
    if (idx % 6 === 2 || idx % 6 === 5) {
      // Imp hand/arm reaching out of lava
      // Frame 2: arm sinking — just fingertips and splash
      p(ctx, ox, oy, 6, 11, c.impSkin);
      p(ctx, ox, oy, 7, 11, c.impHand);
      p(ctx, ox, oy, 7, 12, c.impSkin);
      // Lava splash around sinking point
      p(ctx, ox, oy, 5, 11, c.yellow);
      p(ctx, ox, oy, 8, 11, c.bright);
      p(ctx, ox, oy, 6, 12, c.mid);
    }
  }

  // On frame 0/1 for imp variants, show arm more prominently
  if ((idx % 6 === 2 || idx % 6 === 5) && frame === 0) {
    // Full arm reaching up
    p(ctx, ox, oy, 6, 9, c.impSkin);
    p(ctx, ox, oy, 6, 10, c.impHand);
    p(ctx, ox, oy, 6, 11, c.impHand);
    p(ctx, ox, oy, 7, 11, c.impSkin);
    p(ctx, ox, oy, 5, 9, c.impSkin); // fingers spread
    p(ctx, ox, oy, 7, 9, c.impSkin);
    // Splash
    p(ctx, ox, oy, 5, 11, c.bright);
    p(ctx, ox, oy, 8, 11, c.bright);
  } else if ((idx % 6 === 2 || idx % 6 === 5) && frame === 1) {
    // Arm partially submerged
    p(ctx, ox, oy, 6, 10, c.impHand);
    p(ctx, ox, oy, 6, 11, c.impHand);
    p(ctx, ox, oy, 7, 11, c.impSkin);
    p(ctx, ox, oy, 5, 10, c.impSkin);
    p(ctx, ox, oy, 7, 10, c.impSkin);
    p(ctx, ox, oy, 5, 11, c.mid);
    p(ctx, ox, oy, 8, 11, c.mid);
  }

  // Edge treatments — skip entirely for fully interior tiles (variant 15)
  if (!isInterior) {
    // Dark cooled edges (where lava meets rock)
    if (!n) {
      b(ctx, ox, oy, 0, 0, G, 2, c.darkEdge);
      b(ctx, ox, oy, 1, 0, G - 2, 1, c.crust);
      // Jagged edge — some pixels of crust jut into lava
      p(ctx, ox, oy, 3, 1, c.crustMid);
      p(ctx, ox, oy, 7, 1, c.crustMid);
      p(ctx, ox, oy, 10, 1, c.crustMid);
    }
    if (!s) {
      b(ctx, ox, oy, 0, G - 2, G, 2, c.darkEdge);
      b(ctx, ox, oy, 1, G - 1, G - 2, 1, c.crust);
      p(ctx, ox, oy, 4, G - 2, c.crustMid);
      p(ctx, ox, oy, 9, G - 2, c.crustMid);
    }
    if (!w) {
      b(ctx, ox, oy, 0, 0, 2, G, c.darkEdge);
      b(ctx, ox, oy, 0, 1, 1, G - 2, c.crust);
      p(ctx, ox, oy, 1, 4, c.crustMid);
      p(ctx, ox, oy, 1, 9, c.crustMid);
    }
    if (!e) {
      b(ctx, ox, oy, G - 2, 0, 2, G, c.darkEdge);
      b(ctx, ox, oy, G - 1, 1, 1, G - 2, c.crust);
      p(ctx, ox, oy, G - 2, 3, c.crustMid);
      p(ctx, ox, oy, G - 2, 8, c.crustMid);
    }

    // Glow on connected edges (lava meets lava — seamless)
    if (n) {
      b(ctx, ox, oy, 2, 0, G - 4, 1, c.core);
      b(ctx, ox, oy, 3, 1, G - 6, 1, c.mid);
    }
    if (s) {
      b(ctx, ox, oy, 2, G - 1, G - 4, 1, c.core);
      b(ctx, ox, oy, 3, G - 2, G - 6, 1, c.mid);
    }
    if (w) {
      b(ctx, ox, oy, 0, 2, 1, G - 4, c.core);
      b(ctx, ox, oy, 1, 3, 1, G - 6, c.mid);
    }
    if (e) {
      b(ctx, ox, oy, G - 1, 2, 1, G - 4, c.core);
      b(ctx, ox, oy, G - 2, 3, 1, G - 6, c.mid);
    }
  }
}

function drawCrackedBrimstone(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.nobuild;
  const rng = seededRand(idx * 47 + 13);

  // Base ground — mix of scorched and normal
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Texture variation — patches of different ground shades
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const v = rng();
      if (v < 0.15) p(ctx, ox, oy, gx, gy, c.baseMid);
      else if (v < 0.22) p(ctx, ox, oy, gx, gy, c.scorched);
      else if (v < 0.27) p(ctx, ox, oy, gx, gy, c.transGround);
    }
  }

  // Transition zones — edges fade toward normal ground on some sides
  // Bottom and right edges tend toward normal ground color
  for (let gx = 0; gx < G; gx++) {
    if (rng() > 0.4) p(ctx, ox, oy, gx, G - 1, c.transGround);
    if (rng() > 0.5) p(ctx, ox, oy, gx, G - 2, c.transGround);
  }

  // Major crack network with lava seeping through
  const crackPaths = [
    // Main diagonal crack
    [[1, 1], [2, 2], [3, 3], [3, 4], [4, 5], [5, 6], [5, 7], [6, 8]],
    // Secondary crack branching off
    [[3, 3], [4, 3], [5, 2], [6, 2], [7, 1]],
    // Third crack
    [[8, 4], [9, 5], [10, 5], [10, 6], [11, 7], [12, 8], [12, 9]],
    // Branch connecting
    [[5, 6], [6, 6], [7, 5], [8, 4]],
    // Small cracks
    [[2, 9], [3, 10], [4, 10], [5, 11]],
    [[9, 10], [10, 11], [11, 11], [12, 12]],
    // Tiny isolated cracks
    [[0, 5], [1, 6]],
    [[13, 3], [13, 4]],
  ];

  for (const path of crackPaths) {
    for (const [cx, cy] of path) {
      if (cx < 0 || cx >= G || cy < 0 || cy >= G) continue;
      // Deep crack shadow
      p(ctx, ox, oy, cx, cy, c.crackDeep);

      // Lava seeping through the crack — bright orange/red
      if (rng() > 0.25) {
        p(ctx, ox, oy, cx, cy, c.lavaSeep);
      }

      // Glow halo around lava seepage
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        if (rng() > 0.45) {
          p(ctx, ox, oy, cx + dx, cy + dy, c.lavaGlow);
        }
      }
    }
  }

  // Ember particles floating above cracks
  const emberPositions = [
    [2, 1], [5, 4], [9, 3], [11, 6], [4, 8], [7, 0], [12, 10], [1, 10],
    [8, 7], [3, 6],
  ];
  for (let i = 0; i < emberPositions.length; i++) {
    const [ex, ey] = emberPositions[i];
    if (rng() > 0.4) {
      const ec = rng() > 0.5 ? c.ember : (rng() > 0.5 ? c.emberBright : c.emberDim);
      p(ctx, ox, oy, ex, ey, ec);
    }
  }

  // Scorched earth patches — darkened areas around major cracks
  for (let i = 0; i < 5; i++) {
    const sx = Math.floor(rng() * (G - 3)) + 1;
    const sy = Math.floor(rng() * (G - 3)) + 1;
    const sw = Math.floor(rng() * 2) + 1;
    const sh = Math.floor(rng() * 2) + 1;
    b(ctx, ox, oy, sx, sy, sw, sh, c.scorched);
  }

  // Smoke wisps rising from cracks
  for (let i = 0; i < 4; i++) {
    const sx = Math.floor(rng() * (G - 2)) + 1;
    const sy = Math.floor(rng() * (G - 4));
    p(ctx, ox, oy, sx, sy, c.smoke);
    if (rng() > 0.5) p(ctx, ox, oy, sx, sy - 1, c.smoke);
  }

  // Grid hint (slightly visible)
  ctx.strokeStyle = '#331508';
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

// ===================== DOODAD DRAWERS =====================

function drawInfernalDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);

  switch (type) {
    case 0: { // Skull pile — heap of skulls and bones
      // Bottom skull (large, facing forward)
      b(ctx, ox, oy, 4, 9, 5, 3, '#bbaa99');
      b(ctx, ox, oy, 5, 8, 3, 1, '#aa9988');
      p(ctx, ox, oy, 5, 10, '#332211'); // left eye socket
      p(ctx, ox, oy, 7, 10, '#332211'); // right eye socket
      p(ctx, ox, oy, 6, 11, '#998877'); // teeth
      p(ctx, ox, oy, 5, 11, '#887766');
      p(ctx, ox, oy, 7, 11, '#887766');

      // Second skull (tilted, behind left)
      b(ctx, ox, oy, 2, 7, 4, 3, '#aa9988');
      b(ctx, ox, oy, 3, 6, 2, 1, '#998877');
      p(ctx, ox, oy, 3, 8, '#221100'); // eye
      p(ctx, ox, oy, 5, 8, '#221100'); // eye
      p(ctx, ox, oy, 2, 9, '#887766');

      // Third skull (right, partially hidden)
      b(ctx, ox, oy, 8, 7, 3, 3, '#998877');
      b(ctx, ox, oy, 9, 6, 2, 1, '#887766');
      p(ctx, ox, oy, 9, 8, '#221100');
      p(ctx, ox, oy, 10, 8, '#221100');

      // Loose bones scattered
      p(ctx, ox, oy, 1, 10, '#ccbbaa');
      p(ctx, ox, oy, 1, 11, '#bbaa99');
      p(ctx, ox, oy, 10, 10, '#bbaa99');
      p(ctx, ox, oy, 11, 11, '#aa9988');
      p(ctx, ox, oy, 3, 12, '#998877');

      // Top skull fragment
      p(ctx, ox, oy, 5, 5, '#aa9988');
      p(ctx, ox, oy, 6, 5, '#bbaa99');
      p(ctx, ox, oy, 6, 4, '#998877');

      // Shadow underneath
      b(ctx, ox, oy, 3, 12, 7, 1, '#11080440');
      break;
    }

    case 1: { // Broken chain — shattered iron links
      // Chain links (broken in middle)
      // Upper section hanging
      p(ctx, ox, oy, 6, 1, '#777766');
      p(ctx, ox, oy, 6, 2, '#888877');
      p(ctx, ox, oy, 5, 2, '#666655');
      p(ctx, ox, oy, 7, 2, '#666655');
      p(ctx, ox, oy, 6, 3, '#888877');
      // Link shape
      p(ctx, ox, oy, 5, 4, '#777766');
      p(ctx, ox, oy, 7, 4, '#777766');
      p(ctx, ox, oy, 6, 4, '#555544');
      p(ctx, ox, oy, 5, 5, '#888877');
      p(ctx, ox, oy, 7, 5, '#888877');

      // Break point — jagged edges
      p(ctx, ox, oy, 6, 6, '#999988');
      p(ctx, ox, oy, 5, 6, '#776655'); // rust at break
      p(ctx, ox, oy, 7, 7, '#776655');

      // Lower broken section on ground
      p(ctx, ox, oy, 4, 8, '#666655');
      p(ctx, ox, oy, 5, 8, '#777766');
      p(ctx, ox, oy, 5, 9, '#888877');
      p(ctx, ox, oy, 4, 9, '#666655');
      p(ctx, ox, oy, 6, 9, '#777766');
      p(ctx, ox, oy, 6, 10, '#666655');
      p(ctx, ox, oy, 7, 10, '#777766');
      p(ctx, ox, oy, 7, 11, '#555544');
      p(ctx, ox, oy, 8, 11, '#666655');

      // Rust spots
      p(ctx, ox, oy, 5, 3, '#884422');
      p(ctx, ox, oy, 7, 9, '#884422');
      p(ctx, ox, oy, 6, 5, '#773311');
      break;
    }

    case 2: { // Demon horn — curved horn with ridges
      // Base (wide, embedded in ground)
      b(ctx, ox, oy, 5, 11, 4, 2, '#443322');
      b(ctx, ox, oy, 6, 10, 3, 1, '#554433');

      // Horn shaft curving upward and right
      b(ctx, ox, oy, 6, 8, 3, 2, '#665544');
      b(ctx, ox, oy, 7, 6, 2, 2, '#776655');
      b(ctx, ox, oy, 8, 4, 2, 2, '#887766');
      p(ctx, ox, oy, 9, 3, '#998877');
      p(ctx, ox, oy, 10, 2, '#aa9988');
      p(ctx, ox, oy, 10, 1, '#bbaa99'); // tip

      // Ridge lines along horn (growth rings)
      p(ctx, ox, oy, 6, 9, '#554433');
      p(ctx, ox, oy, 7, 7, '#665544');
      p(ctx, ox, oy, 8, 5, '#776655');
      p(ctx, ox, oy, 9, 3, '#887766');

      // Highlight on leading edge
      p(ctx, ox, oy, 8, 8, '#887766');
      p(ctx, ox, oy, 8, 6, '#998877');
      p(ctx, ox, oy, 9, 4, '#aa9988');
      p(ctx, ox, oy, 10, 2, '#ccbbaa');

      // Dark inner curve shadow
      p(ctx, ox, oy, 6, 7, '#332211');
      p(ctx, ox, oy, 7, 5, '#332211');
      p(ctx, ox, oy, 8, 3, '#332211');

      // Blood-stained base
      p(ctx, ox, oy, 5, 12, '#661122');
      p(ctx, ox, oy, 6, 12, '#551111');
      break;
    }

    case 3: { // Flame geyser — erupting fire column
      // Base vent (dark opening)
      b(ctx, ox, oy, 5, 11, 4, 2, '#221100');
      b(ctx, ox, oy, 4, 12, 6, 1, '#1a0a00');
      // Vent glow
      p(ctx, ox, oy, 6, 11, '#ff4400');
      p(ctx, ox, oy, 7, 11, '#ff6622');

      // Fire column erupting upward
      // Core (white-hot)
      p(ctx, ox, oy, 6, 10, '#ffdd88');
      p(ctx, ox, oy, 7, 10, '#ffdd88');
      p(ctx, ox, oy, 6, 9, '#ffcc55');
      p(ctx, ox, oy, 7, 9, '#ffdd88');
      p(ctx, ox, oy, 7, 8, '#ffaa44');
      p(ctx, ox, oy, 6, 8, '#ffcc55');

      // Mid flame (orange)
      p(ctx, ox, oy, 5, 9, '#ff6622');
      p(ctx, ox, oy, 8, 9, '#ff6622');
      p(ctx, ox, oy, 5, 8, '#ff4400');
      p(ctx, ox, oy, 8, 8, '#ff4400');
      p(ctx, ox, oy, 7, 7, '#ff8833');
      p(ctx, ox, oy, 6, 7, '#ff6622');

      // Outer flame (red tips)
      p(ctx, ox, oy, 5, 7, '#cc3300');
      p(ctx, ox, oy, 8, 7, '#cc3300');
      p(ctx, ox, oy, 6, 6, '#ff4400');
      p(ctx, ox, oy, 7, 6, '#cc3300');
      p(ctx, ox, oy, 7, 5, '#aa2200');
      p(ctx, ox, oy, 6, 5, '#cc3300');

      // Flame tips (flickering)
      p(ctx, ox, oy, 6, 4, '#882200');
      p(ctx, ox, oy, 5, 4, '#66110066');
      p(ctx, ox, oy, 7, 3, '#aa220066');
      p(ctx, ox, oy, 8, 5, '#66110066');

      // Sparks
      p(ctx, ox, oy, 4, 6, '#ffaa4488');
      p(ctx, ox, oy, 9, 7, '#ffaa4488');
      p(ctx, ox, oy, 3, 8, '#ff664488');
      p(ctx, ox, oy, 10, 6, '#ff664488');
      break;
    }

    case 4: { // Obsidian shard — jagged black crystal jutting from ground
      // Base rubble
      b(ctx, ox, oy, 4, 11, 6, 2, '#1a0808');
      p(ctx, ox, oy, 3, 12, '#110606');
      p(ctx, ox, oy, 10, 12, '#110606');

      // Main shard (tall, angular)
      b(ctx, ox, oy, 6, 4, 2, 8, '#0a0405');
      b(ctx, ox, oy, 5, 6, 1, 6, '#0a0405');
      b(ctx, ox, oy, 8, 7, 1, 5, '#0a0405');
      p(ctx, ox, oy, 7, 3, '#0a0405');
      p(ctx, ox, oy, 6, 3, '#110808');
      p(ctx, ox, oy, 7, 2, '#110808'); // tip

      // Facet highlights (glassy reflections)
      p(ctx, ox, oy, 6, 5, '#331818');
      p(ctx, ox, oy, 6, 7, '#442222');
      p(ctx, ox, oy, 7, 6, '#221010');
      p(ctx, ox, oy, 7, 9, '#331818');
      // Bright glint
      p(ctx, ox, oy, 6, 4, '#554433');
      p(ctx, ox, oy, 7, 7, '#443322');

      // Smaller shard leaning left
      p(ctx, ox, oy, 4, 8, '#0a0405');
      p(ctx, ox, oy, 4, 9, '#110808');
      p(ctx, ox, oy, 4, 10, '#0a0405');
      p(ctx, ox, oy, 3, 9, '#221010');

      // Smaller shard right
      p(ctx, ox, oy, 9, 9, '#0a0405');
      p(ctx, ox, oy, 9, 10, '#110808');
      p(ctx, ox, oy, 10, 10, '#0a0405');

      // Red glow at base
      p(ctx, ox, oy, 5, 11, '#ff220022');
      p(ctx, ox, oy, 8, 11, '#ff220022');
      break;
    }

    case 5: { // Iron maiden fragment — half-open torture device
      // Main body (iron plate, upright)
      b(ctx, ox, oy, 4, 3, 5, 9, '#555544');
      b(ctx, ox, oy, 5, 4, 3, 7, '#444433');

      // Lid/door (partially open, to the right)
      b(ctx, ox, oy, 9, 4, 2, 7, '#666655');
      p(ctx, ox, oy, 9, 3, '#555544');
      p(ctx, ox, oy, 10, 5, '#777766');

      // Spikes inside (visible through opening)
      p(ctx, ox, oy, 6, 5, '#888877');
      p(ctx, ox, oy, 7, 6, '#888877');
      p(ctx, ox, oy, 5, 7, '#888877');
      p(ctx, ox, oy, 7, 8, '#888877');
      p(ctx, ox, oy, 6, 9, '#888877');

      // Hinge at top
      p(ctx, ox, oy, 8, 3, '#776655');
      p(ctx, ox, oy, 9, 3, '#776655');

      // Blood dripping from spikes
      p(ctx, ox, oy, 6, 6, '#880022');
      p(ctx, ox, oy, 7, 7, '#aa0033');
      p(ctx, ox, oy, 5, 8, '#880022');
      p(ctx, ox, oy, 6, 10, '#660011');
      p(ctx, ox, oy, 7, 10, '#880022');
      // Blood pooling at base
      b(ctx, ox, oy, 4, 12, 7, 1, '#550011');
      p(ctx, ox, oy, 5, 12, '#770022');
      p(ctx, ox, oy, 8, 12, '#660011');

      // Rust patches
      p(ctx, ox, oy, 4, 5, '#884422');
      p(ctx, ox, oy, 8, 8, '#773311');
      p(ctx, ox, oy, 4, 10, '#884422');

      // Shadow
      b(ctx, ox, oy, 3, 12, 1, 1, '#11080440');
      p(ctx, ox, oy, 11, 11, '#11080440');
      break;
    }

    case 6: { // Pentagram symbol — glowing arcane circle
      // Outer circle (faint glow)
      const cx = 7, cy = 7, r = 5;
      // Draw circle points
      const circlePoints = [
        [2, 5], [2, 6], [2, 7], [2, 8], [2, 9],
        [3, 3], [3, 4], [3, 10], [3, 11],
        [4, 2], [4, 12],
        [5, 2], [5, 12],
        [6, 2], [6, 12],
        [7, 1], [7, 13],
        [8, 2], [8, 12],
        [9, 2], [9, 12],
        [10, 2], [10, 12],
        [11, 3], [11, 4], [11, 10], [11, 11],
        [12, 5], [12, 6], [12, 7], [12, 8], [12, 9],
      ];
      for (const [px, py] of circlePoints) {
        p(ctx, ox, oy, px, py, '#cc220088');
      }

      // Star lines (5-pointed star)
      // Top to bottom-left
      p(ctx, ox, oy, 7, 2, '#ff3300');
      p(ctx, ox, oy, 6, 4, '#ff3300');
      p(ctx, ox, oy, 5, 6, '#ff3300');
      p(ctx, ox, oy, 4, 8, '#ff3300');
      p(ctx, ox, oy, 3, 10, '#ff3300');
      // Top to bottom-right
      p(ctx, ox, oy, 8, 4, '#ff3300');
      p(ctx, ox, oy, 9, 6, '#ff3300');
      p(ctx, ox, oy, 10, 8, '#ff3300');
      p(ctx, ox, oy, 11, 10, '#ff3300');
      // Bottom-left to right
      p(ctx, ox, oy, 4, 10, '#ff3300');
      p(ctx, ox, oy, 5, 10, '#ff3300');
      p(ctx, ox, oy, 6, 10, '#ff3300');
      p(ctx, ox, oy, 8, 10, '#ff3300');
      p(ctx, ox, oy, 9, 10, '#ff3300');
      p(ctx, ox, oy, 10, 10, '#ff3300');
      // Left to top-right
      p(ctx, ox, oy, 3, 5, '#ff3300');
      p(ctx, ox, oy, 5, 4, '#ff3300');
      p(ctx, ox, oy, 7, 3, '#ff3300');
      p(ctx, ox, oy, 9, 4, '#ff3300');
      p(ctx, ox, oy, 11, 5, '#ff3300');
      // Right cross
      p(ctx, ox, oy, 3, 5, '#ff3300');
      p(ctx, ox, oy, 11, 5, '#ff3300');

      // Center glow
      p(ctx, ox, oy, 7, 7, '#ff660088');
      p(ctx, ox, oy, 6, 7, '#ff440044');
      p(ctx, ox, oy, 8, 7, '#ff440044');
      p(ctx, ox, oy, 7, 6, '#ff440044');
      p(ctx, ox, oy, 7, 8, '#ff440044');

      // Ambient glow around circle
      p(ctx, ox, oy, 1, 7, '#ff220022');
      p(ctx, ox, oy, 13, 7, '#ff220022');
      p(ctx, ox, oy, 7, 0, '#ff220022');
      p(ctx, ox, oy, 7, 13, '#ff220022');
      break;
    }

    case 7: { // Floating ember cluster — scattered glowing particles
      // Large bright embers
      p(ctx, ox, oy, 5, 3, '#ffcc55');
      p(ctx, ox, oy, 9, 5, '#ffaa44');
      p(ctx, ox, oy, 3, 7, '#ffcc55');
      p(ctx, ox, oy, 11, 8, '#ffaa44');
      p(ctx, ox, oy, 7, 6, '#ffdd88');

      // Medium embers
      p(ctx, ox, oy, 6, 4, '#ff8833');
      p(ctx, ox, oy, 8, 3, '#ff8833');
      p(ctx, ox, oy, 4, 5, '#ff6622');
      p(ctx, ox, oy, 10, 6, '#ff6622');
      p(ctx, ox, oy, 6, 9, '#ff8833');
      p(ctx, ox, oy, 8, 8, '#ff8833');
      p(ctx, ox, oy, 2, 9, '#ff6622');
      p(ctx, ox, oy, 12, 4, '#ff6622');

      // Small dim embers (fading)
      p(ctx, ox, oy, 4, 2, '#cc440088');
      p(ctx, ox, oy, 10, 3, '#cc440088');
      p(ctx, ox, oy, 2, 6, '#cc440088');
      p(ctx, ox, oy, 12, 7, '#cc440088');
      p(ctx, ox, oy, 7, 10, '#cc440088');
      p(ctx, ox, oy, 5, 8, '#cc440088');
      p(ctx, ox, oy, 9, 9, '#cc440088');
      p(ctx, ox, oy, 1, 4, '#aa330066');
      p(ctx, ox, oy, 11, 2, '#aa330066');
      p(ctx, ox, oy, 3, 11, '#aa330066');

      // Tiny trails behind embers (motion blur)
      p(ctx, ox, oy, 5, 4, '#ff664444');
      p(ctx, ox, oy, 9, 6, '#ff664444');
      p(ctx, ox, oy, 3, 8, '#ff664444');
      p(ctx, ox, oy, 11, 9, '#ff664444');
      p(ctx, ox, oy, 7, 7, '#ff884444');

      // Glow halos around brightest embers
      p(ctx, ox, oy, 4, 3, '#ff440022');
      p(ctx, ox, oy, 6, 3, '#ff440022');
      p(ctx, ox, oy, 5, 2, '#ff440022');
      p(ctx, ox, oy, 8, 5, '#ff440022');
      p(ctx, ox, oy, 10, 5, '#ff440022');
      break;
    }
  }
}

// ===================== MAIN COMPONENT =====================

export default function InfernalTerrainSprites() {
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
      // Row 0: brimstone ground
      drawBrimstoneGround(tCtx, ox, 0 * T, v);
      // Row 1: obsidian rock / stalagmite
      drawObsidianRock(tCtx, ox, 1 * T, v);
      // Rows 2-4: lava pool (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawLavaPool(tCtx, ox, (2 + f) * T, v, f);
      }
      // Row 5: cracked brimstone (NoBuild)
      drawCrackedBrimstone(tCtx, ox, 5 * T, v);
    }

    // Preview with labels
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 160;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a0504';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 160, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#ff8844';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Brimstone', 'Obsidian', 'Lava 0', 'Lava 1', 'Lava 2', 'NoBuild'];
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
      drawInfernalDoodad(dCtx, i * T, 0, i);
    }

    // Doodad preview
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#1a0e08';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#ff8844';
    dpCtx.font = '11px monospace';
    const doodadLabels = ['Skulls', 'Chain', 'Horn', 'Geyser', 'Obsidian', 'Iron Mdn', 'Pentagram', 'Embers'];
    for (let i = 0; i < DOODAD_COLS; i++) {
      dpCtx.fillText(doodadLabels[i], 80 + i * T * dScale + 2, 16);
    }

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ff8844', background: '#0a0504' }}>
      <h2 data-label="Infernal Terrain">Infernal Terrain Sprites — Hellscape</h2>
      <p style={{ fontSize: '12px', color: '#886644' }} data-frame-size="28x28">
        Frame size: 28×28 | PX=2, Grid=14×14 | 16 auto-tile variants × 6 rows = 96 terrain frames + 8 doodads
      </p>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#ff4400' : '#331500', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer' }}>
          Preview (3×)
        </button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#ff4400' : '#331500', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer' }}>
          Actual Size
        </button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'infernal_terrain_tileset.png')} style={{ marginRight: 8, background: '#331500', color: '#ff8844', border: '1px solid #ff440044', padding: '4px 12px', cursor: 'pointer' }}>
              Download Tileset
            </button>
            <button onClick={() => download(doodadRef, 'infernal_terrain_doodads.png')} style={{ background: '#331500', color: '#ff8844', border: '1px solid #ff440044', padding: '4px 12px', cursor: 'pointer' }}>
              Download Doodads
            </button>
          </>
        )}
      </div>
      <h3 data-label="Infernal Terrain (Preview)">Terrain Tileset (16 auto-tile variants × 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #331500' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #331500' }} />
      <h3>Hellscape Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #331500' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #331500' }} />
    </div>
  );
}
