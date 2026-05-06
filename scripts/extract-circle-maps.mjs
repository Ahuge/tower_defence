/**
 * One-shot extractor — runs the circle_2p / circle_3p / circle_4p
 * IIFEs currently inlined in `src/data/Maps.ts` and writes each one
 * out as a JSON file under `src/data/maps/circle/`, extended with
 * the new `spawners` + `playerCount` fields that the JSON format
 * requires.
 *
 * After this runs once and the JSON files are committed, the IIFE
 * blocks in Maps.ts get replaced by a loader. This script is then
 * effectively archival — kept in scripts/ as a reference for how
 * the first three circle maps were shaped.
 *
 * Usage:
 *   node scripts/extract-circle-maps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'src/data/maps/circle');

// These constants mirror src/config.ts — must match when re-running.
const GRID_COLS = 36;
const GRID_ROWS = 26;
const MID_COL = Math.floor(GRID_COLS / 2);
const MID_ROW = Math.floor(GRID_ROWS / 2);

function inBounds(c, r) {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}
function rect(c1, r1, c2, r2) {
  const ps = [];
  for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) if (inBounds(c, r)) ps.push([c, r]);
  return ps;
}
function circle(cx, cy, radius) {
  const ps = [];
  for (let c = cx - radius; c <= cx + radius; c++) {
    for (let r = cy - radius; r <= cy + radius; r++) {
      const dx = c - cx, dy = r - cy;
      if (dx * dx + dy * dy <= radius * radius && inBounds(c, r)) ps.push([c, r]);
    }
  }
  return ps;
}

// ───────────────────────────────────────────────────────────
// 2-PLAYER — left/right halves with central wall
// ───────────────────────────────────────────────────────────
function circle2p() {
  const blocked = [];
  for (let r = 3; r < GRID_ROWS - 3; r++) {
    if (r >= MID_ROW - 2 && r <= MID_ROW + 2) continue;
    blocked.push([MID_COL, r]);
    blocked.push([MID_COL - 1, r]);
  }
  blocked.push(...circle(8, 6, 2));
  blocked.push(...circle(8, GRID_ROWS - 7, 2));
  blocked.push(...circle(GRID_COLS - 9, 6, 2));
  blocked.push(...circle(GRID_COLS - 9, GRID_ROWS - 7, 2));

  const zone0 = [];
  const zone1 = [];
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (blocked.some(b => b[0] === c && b[1] === r)) continue;
      if (c < MID_COL - 1) zone0.push([c, r]);
      else if (c > MID_COL) zone1.push([c, r]);
    }
  }

  return {
    id: 'circle_2p',
    name: 'Circle 2P — Classic',
    description: '2-player co-op. Creeps loop through both halves, circling the map before returning to their spawn.',
    playerCount: 2,
    theme: 'forest',
    blocked,
    animated: [],
    noBuild: [],
    zones: [zone0, zone1],
    zoneColors: ['#ff4444', '#4488ff'],
    // Spawners: each creep enters at its player's edge, visits the
    // opposite player's half via the central gap (MID_ROW), then
    // loops back to the entry point. Two waypoints force the
    // "circumnavigate twice" feel from the plan — first waypoint on
    // the far side, second back near the entry, then final exit at
    // entry cell.
    spawners: [
      {
        entry: [0, MID_ROW],
        waypoints: [
          [GRID_COLS - 1, MID_ROW],   // cross to P1's far edge
          [GRID_COLS - 1, 1],         // up the right side
          [0, 1],                     // back across top
          [0, MID_ROW],               // circle 1 done
          [GRID_COLS - 1, MID_ROW],   // second lap — far edge
          [GRID_COLS - 1, GRID_ROWS - 2], // down the right side
          [0, GRID_ROWS - 2],         // back across bottom
        ],
        exit: [0, MID_ROW],
      },
      {
        entry: [GRID_COLS - 1, MID_ROW],
        waypoints: [
          [0, MID_ROW],
          [0, GRID_ROWS - 2],
          [GRID_COLS - 1, GRID_ROWS - 2],
          [GRID_COLS - 1, MID_ROW],
          [0, MID_ROW],
          [0, 1],
          [GRID_COLS - 1, 1],
        ],
        exit: [GRID_COLS - 1, MID_ROW],
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────
// 3-PLAYER — Y-layout, three sectors
// ───────────────────────────────────────────────────────────
function circle3p() {
  const blocked = [];
  for (let r = 0; r < MID_ROW - 2; r++) {
    if (r <= 1) continue;
    blocked.push([MID_COL, r]);
  }
  for (let i = 1; i < 10; i++) {
    const r = MID_ROW + i;
    if (r >= GRID_ROWS - 1) break;
    const cL = MID_COL - i;
    const cR = MID_COL + i;
    if (i >= 3 && i <= 5) continue;
    if (cL >= 2) blocked.push([cL, r]);
    if (cR < GRID_COLS - 2) blocked.push([cR, r]);
  }
  blocked.push(...circle(7, 5, 2));
  blocked.push(...circle(GRID_COLS - 8, 5, 2));
  blocked.push(...circle(MID_COL, GRID_ROWS - 6, 2));

  // Zones: P0 top-left, P1 top-right, P2 bottom
  const zone0 = [];
  const zone1 = [];
  const zone2 = [];
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (blocked.some(b => b[0] === c && b[1] === r)) continue;
      if (r < MID_ROW && c < MID_COL) zone0.push([c, r]);
      else if (r < MID_ROW && c >= MID_COL) zone1.push([c, r]);
      else if (r >= MID_ROW) zone2.push([c, r]);
    }
  }

  return {
    id: 'circle_3p',
    name: 'Circle 3P — Trinity',
    description: '3-player co-op on a Y-divided map. Creeps visit every zone before exiting.',
    playerCount: 3,
    theme: 'forest',
    blocked,
    animated: [],
    noBuild: [],
    zones: [zone0, zone1, zone2],
    zoneColors: ['#ff4444', '#4488ff', '#44ff88'],
    spawners: [
      {
        entry: [0, 1],                       // P0 entry — top-left
        waypoints: [
          [GRID_COLS - 1, 1],                // top-right (P1)
          [MID_COL, GRID_ROWS - 2],          // bottom-centre (P2)
          [0, 1],                             // back to P0 for round 2
          [GRID_COLS - 1, 1],
          [MID_COL, GRID_ROWS - 2],
        ],
        exit: [0, 1],
      },
      {
        entry: [GRID_COLS - 1, 1],           // P1 entry — top-right
        waypoints: [
          [MID_COL, GRID_ROWS - 2],          // P2
          [0, 1],                             // P0
          [GRID_COLS - 1, 1],                 // back to P1
          [MID_COL, GRID_ROWS - 2],
          [0, 1],
        ],
        exit: [GRID_COLS - 1, 1],
      },
      {
        entry: [MID_COL, GRID_ROWS - 2],     // P2 entry — bottom centre
        waypoints: [
          [0, 1],                             // P0
          [GRID_COLS - 1, 1],                 // P1
          [MID_COL, GRID_ROWS - 2],           // back to P2
          [0, 1],
          [GRID_COLS - 1, 1],
        ],
        exit: [MID_COL, GRID_ROWS - 2],
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────
// 4-PLAYER — quadrants + central cross
// ───────────────────────────────────────────────────────────
function circle4p() {
  const blocked = [];
  // Cross-shaped walls dividing the grid into 4 quadrants, with
  // gaps in each arm so paths can flow between adjacent quadrants.
  for (let c = 2; c < GRID_COLS - 2; c++) {
    if (c >= MID_COL - 2 && c <= MID_COL + 2) continue;
    blocked.push([c, MID_ROW]);
  }
  for (let r = 2; r < GRID_ROWS - 2; r++) {
    if (r >= MID_ROW - 2 && r <= MID_ROW + 2) continue;
    blocked.push([MID_COL, r]);
    blocked.push([MID_COL - 1, r]);
  }
  blocked.push(...circle(6, 5, 2));
  blocked.push(...circle(GRID_COLS - 7, 5, 2));
  blocked.push(...circle(6, GRID_ROWS - 6, 2));
  blocked.push(...circle(GRID_COLS - 7, GRID_ROWS - 6, 2));

  const zone0 = [], zone1 = [], zone2 = [], zone3 = [];
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (blocked.some(b => b[0] === c && b[1] === r)) continue;
      if (c < MID_COL - 1 && r < MID_ROW) zone0.push([c, r]);
      else if (c > MID_COL && r < MID_ROW) zone1.push([c, r]);
      else if (c < MID_COL - 1 && r > MID_ROW) zone2.push([c, r]);
      else if (c > MID_COL && r > MID_ROW) zone3.push([c, r]);
    }
  }

  return {
    id: 'circle_4p',
    name: 'Circle 4P — Quadrants',
    description: '4-player co-op on a cross-divided map. Creeps rotate through all four quadrants.',
    playerCount: 4,
    theme: 'forest',
    blocked,
    animated: [],
    noBuild: [],
    zones: [zone0, zone1, zone2, zone3],
    zoneColors: ['#ff4444', '#4488ff', '#44ff88', '#ffaa44'],
    spawners: [
      {
        entry: [0, 1],                        // P0 top-left
        waypoints: [
          [GRID_COLS - 1, 1],                 // P1 top-right
          [GRID_COLS - 1, GRID_ROWS - 2],     // P3 bottom-right
          [0, GRID_ROWS - 2],                 // P2 bottom-left
          [0, 1],                             // back to P0
          [GRID_COLS - 1, 1],
        ],
        exit: [0, 1],
      },
      {
        entry: [GRID_COLS - 1, 1],            // P1 top-right
        waypoints: [
          [GRID_COLS - 1, GRID_ROWS - 2],     // P3
          [0, GRID_ROWS - 2],                 // P2
          [0, 1],                             // P0
          [GRID_COLS - 1, 1],
          [GRID_COLS - 1, GRID_ROWS - 2],
        ],
        exit: [GRID_COLS - 1, 1],
      },
      {
        entry: [0, GRID_ROWS - 2],            // P2 bottom-left
        waypoints: [
          [0, 1],                             // P0
          [GRID_COLS - 1, 1],                 // P1
          [GRID_COLS - 1, GRID_ROWS - 2],     // P3
          [0, GRID_ROWS - 2],
          [0, 1],
        ],
        exit: [0, GRID_ROWS - 2],
      },
      {
        entry: [GRID_COLS - 1, GRID_ROWS - 2],// P3 bottom-right
        waypoints: [
          [0, GRID_ROWS - 2],                 // P2
          [0, 1],                             // P0
          [GRID_COLS - 1, 1],                 // P1
          [GRID_COLS - 1, GRID_ROWS - 2],
          [0, GRID_ROWS - 2],
        ],
        exit: [GRID_COLS - 1, GRID_ROWS - 2],
      },
    ],
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const maps = [circle2p(), circle3p(), circle4p()];
for (const m of maps) {
  const fileName = `${m.id}.json`;
  const out = path.join(OUT_DIR, fileName);
  fs.writeFileSync(out, JSON.stringify(m, null, 2), 'utf-8');
  console.log(`  wrote ${path.relative(REPO_ROOT, out)} (${m.blocked.length} blocked cells, ${m.spawners.length} spawners)`);
}
console.log('Done.');
