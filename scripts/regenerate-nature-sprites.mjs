/**
 * ============================================================
 *  DEPRECATED — do not run.
 * ============================================================
 *
 * This was a one-shot bootstrap used to produce the initial
 * post-Thorn 8-column Nature sheets by cropping the legacy 6-col
 * PNG and drawing Bramble/Spider/Sunroot programmatically. It
 * assumes:
 *   - An 8-col tower layout (real layout is now 9 — Razor Bramble
 *     appended at col 8).
 *   - `nature_spider` as the third column (the mobile unit is now
 *     the poison-dart frog `nature_dartfrog`).
 *
 * The authoritative source for all Nature sprites is now the TSX
 * generator (`nature_sprites.tsx` + `mobile_unit_sprites.tsx`)
 * baked via the puppeteer pipeline:
 *
 *   node scripts/export-sprites.mjs
 *
 * For `_autumn` variants (palette swap only, no layout change)
 * use the dedicated:
 *
 *   node scripts/regenerate-nature-autumn.mjs
 *
 * Kept here for git history; running it will overwrite the good
 * sprites with a stale 8-col Thornweaver-era layout.
 */
// Deprecation guard — fail closed so we don't silently regress the
// sprite sheets. Pass --force-stale-bootstrap to bypass (only use
// if you explicitly want the legacy 8-col bootstrap output).
if (!process.argv.includes('--force-stale-bootstrap')) {
  console.error(
    'scripts/regenerate-nature-sprites.mjs is DEPRECATED and produces ' +
    'a stale 8-col Thornweaver-era layout.\n' +
    'Use `node scripts/export-sprites.mjs` (puppeteer + TSX) for the ' +
    'authoritative bake, or `scripts/regenerate-nature-autumn.mjs` for ' +
    '_autumn variants only.\n' +
    '(Pass --force-stale-bootstrap if you really want the legacy output.)',
  );
  process.exit(1);
}

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NATURE_DIR = join(ROOT, 'public', 'assets', 'nature');

// ---------- constants ----------
const CELL = 64;
const ROWS = 24;            // 6 levels × 4 states (idle/charge/fire/cooldown)
const OLD_COLS = 6;
const NEW_COLS = 8;

const TOWER_W = NEW_COLS * CELL;   // 512
const TOWER_H = ROWS * CELL;       // 1536

const PCELL = 32;
const PROJ_ROWS = 6;               // 3 travel + 3 impact
const PROJ_W = NEW_COLS * PCELL;   // 256
const PROJ_H = PROJ_ROWS * PCELL;  // 192

// Old → new column mapping for copied art (source col → dest col).
// Columns 0, 2, 5 are drawn fresh (bramble, spider, sunroot).
const COPY_MAP = [
  { src: 1, dst: 1 },  // root
  { src: 2, dst: 3 },  // blossom
  { src: 3, dst: 4 },  // spore
  { src: 4, dst: 6 },  // vine
  { src: 5, dst: 7 },  // elder
];

// Autumn palette — loaded from skin_sources JSON so the swap stays
// consistent with whatever the skin editor produced.
const AUTUMN_PALETTE = JSON.parse(
  readFileSync(join(ROOT, 'skin_sources', 'nature_skin_autumn_nature.json'), 'utf8'),
).towerPalettes['-1'];

// Nature colour anchors (match nature_sprites.tsx palette so new
// columns look like the kept ones). All lowercase so they hit the
// autumn palette keys directly.
const COL = {
  darkFor: '#113311',
  forest:  '#1a4422',
  mdGreen: '#226633',
  green:   '#33aa44',
  ltGreen: '#66dd77',
  paleGrn: '#aaffbb',
  bark:    '#664422',
  midBark: '#885533',
  ltBark:  '#aa7744',
  dkBark:  '#3a2211',
  stump:   '#4a3318',
  amber:   '#ffaa44',
  tanG:    '#cc7722',
  ltAmber: '#ffcc88',
  gold:    '#ffcc00',
  thorn:   '#558833',
  spore:   '#88cc44',
  vineG:   '#339944',
  pink:    '#ee55aa',
  white:   '#ffffff',
};

// ---------- pixel helpers ----------
/** A 2-px-scaled pixel draw over a 32x32 logical grid → 64x64 cell. */
function gridBrush(ctx, originX, originY, scale = 2) {
  const p = (gx, gy, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(originX + gx * scale, originY + gy * scale, scale, scale);
  };
  const b = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(originX + gx * scale, originY + gy * scale, gw * scale, gh * scale);
  };
  return { p, b };
}

// ---------- base drawing (reusable pedestal) ----------
/** Mossy stone pedestal shared by most Nature towers. `lv` scales
 *  the mass 1..5. Draws at (0,0) in a 32x32 grid (2x scale to 64). */
function drawPedestal(b, p, lv, glow) {
  const mossRich = lv >= 4;
  // Soil ring
  b(6, 28, 20, 3, COL.dkBark);
  b(7, 27, 18, 1, COL.bark);
  // Roots spreading
  p(5, 29, COL.bark); p(26, 29, COL.bark);
  p(4, 30, COL.dkBark); p(27, 30, COL.dkBark);
  // Stump
  b(9, 22, 14, 6, COL.midBark);
  b(10, 21, 12, 1, COL.ltBark);
  b(11, 23, 10, 1, COL.bark);
  // Moss patches (more at higher level)
  p(10, 24, COL.thorn); p(14, 25, COL.thorn); p(18, 24, COL.thorn);
  if (lv >= 2) { p(12, 23, COL.spore); p(20, 26, COL.thorn); }
  if (lv >= 3) { p(11, 26, COL.green); p(17, 23, COL.green); }
  if (mossRich) {
    b(10, 25, 3, 1, COL.mdGreen); b(19, 26, 3, 1, COL.mdGreen);
  }
  if (glow) {
    p(15, 22, COL.gold); p(16, 22, COL.gold);
  }
}

// ---------- Bramble Hedge — new art (col 0) ----------
function drawBramble(ctx, colX) {
  // 5 levels. Each cell 64×64 via 32×32 @ 2x.
  const maxLv = 5;
  for (let lv = 1; lv <= maxLv; lv++) {
    for (let state = 0; state < 4; state++) {
      const rowIdx = (lv - 1) * 4 + state;
      const ox = colX * CELL;
      const oy = rowIdx * CELL;
      const { p, b } = gridBrush(ctx, ox, oy, 2);
      const glow = state === 1 || state === 2;

      drawPedestal(b, p, lv, glow);

      // Hedge body — a wide, low thicket. Grows taller with level.
      const hh = 6 + lv * 2;
      const ht = 22 - hh;
      const hw = 16 + Math.min(lv, 3) * 2;
      const cx = 16;
      const xL = cx - hw / 2;

      // ---- Dark base silhouette ----
      b(xL, ht, hw, hh, COL.forest);
      p(xL, ht + hh - 1, COL.darkFor); p(xL + hw - 1, ht + hh - 1, COL.darkFor);

      // ---- Branch / twig silhouettes poking through ----
      for (let i = 0; i < Math.max(3, lv + 2); i++) {
        const bx = xL + 2 + ((i * 5 + lv) % (hw - 3));
        const by = ht + 1 + ((i * 3) % (hh - 3));
        const blen = Math.min(hh - 2, 3 + ((i * 2) % 3));
        for (let y = 0; y < blen; y++) p(bx, by + y, COL.darkFor);
      }

      // ---- Dappled mid-green body over the silhouette ----
      for (let y = ht + 1; y < ht + hh - 1; y++) {
        for (let x = xL + 1; x < xL + hw - 1; x++) {
          const n = (x * 7 + y * 13 + lv) % 11;
          if (n < 8) p(x, y, COL.mdGreen);
          else if (n === 8) p(x, y, COL.forest);       // shadow pocket
          else if (n === 9) p(x, y, COL.green);        // bright leaf
          else p(x, y, COL.thorn);                     // dark leaf
        }
      }

      // ---- Clustered leaf shapes scattered through ----
      const leafCount = Math.min(8, 3 + lv);
      for (let i = 0; i < leafCount; i++) {
        const lx = xL + 1 + ((i * 7 + lv * 2) % (hw - 3));
        const ly = ht + 1 + ((i * 5 + lv) % (hh - 3));
        p(lx, ly, COL.green); p(lx + 1, ly, COL.green);
        p(lx, ly + 1, COL.mdGreen); p(lx + 1, ly + 1, COL.ltGreen);
      }

      // ---- Top ridge highlight ----
      for (let x = xL + 2; x < xL + hw - 2; x++) {
        const wave = Math.round(Math.sin((x - xL) * 0.7) * 0.6);
        p(x, ht + wave, COL.green);
        if ((x - xL) % 3 === 0) p(x, ht + wave, COL.ltGreen);
        if ((x - xL) % 5 === 0) p(x, ht + wave + 1, COL.paleGrn);
      }

      // ---- Thorns poking out the top ----
      const tn = 3 + lv;
      for (let i = 0; i < tn; i++) {
        const tx = xL + 2 + ((i * 3) % (hw - 4));
        p(tx, ht - 1, COL.thorn);
        p(tx, ht - 2, i % 2 === 0 ? COL.darkFor : COL.thorn);
        if (state === 2) { p(tx, ht - 3, COL.thorn); p(tx + 1, ht - 2, COL.green); }
      }

      // ---- Side leaves + thorns at higher levels ----
      if (lv >= 2) {
        p(xL - 1, ht + 2, COL.green); p(xL - 1, ht + 4, COL.mdGreen);
        p(xL + hw, ht + 3, COL.green); p(xL + hw, ht + 5, COL.mdGreen);
      }
      if (lv >= 3) {
        p(xL - 1, ht + 2, COL.thorn); p(xL + hw, ht + 2, COL.thorn);
        p(xL - 1, ht + 5, COL.thorn); p(xL + hw, ht + 5, COL.thorn);
        p(xL - 2, ht + 3, COL.bark); p(xL + hw + 1, ht + 4, COL.bark);
      }
      if (lv >= 4) {
        p(xL + 2, ht + 2, COL.ltGreen);
        p(xL + hw - 3, ht + hh - 3, COL.ltGreen);
        p(xL + Math.floor(hw / 2), ht + Math.floor(hh / 2), COL.paleGrn);
      }
      if (lv >= 5) {
        p(xL - 1, ht + hh - 2, COL.thorn); p(xL + hw, ht + hh - 2, COL.thorn);
        p(xL + 3, ht + 3, COL.pink); p(xL + hw - 4, ht + 4, COL.pink); p(cx, ht + 2, COL.pink);
        p(xL + 5, ht + 5, COL.pink); p(xL + hw - 6, ht + 3, COL.pink);
      }

      // ---- Charge glow ----
      if (state === 1) {
        const gcy = ht + Math.floor(hh / 2);
        p(cx, gcy, COL.ltGreen); p(cx - 1, gcy, COL.paleGrn); p(cx + 1, gcy, COL.paleGrn);
        p(cx, gcy - 1, COL.paleGrn); p(cx, gcy + 1, COL.paleGrn);
      }
      // ---- Fire spike ----
      if (state === 2) {
        p(cx, ht - 2, COL.thorn); p(cx, ht - 3, COL.thorn); p(cx, ht - 4, COL.white);
        p(cx - 1, ht - 2, COL.ltGreen); p(cx + 1, ht - 2, COL.ltGreen);
        p(cx - 1, ht - 3, COL.green); p(cx + 1, ht - 3, COL.green);
      }
      // ---- Cooldown ----
      if (state === 3) b(xL + 2, ht + 1, hw - 4, 2, COL.darkFor);
    }
  }
}

// ---------- Thornweaver — dock icon (col 2, main sheet) ----------
// Real animated sheet lives in nature_spider_mobile.png; this is just
// what shows in the tower-dock icon and hover previews. 3 levels.
function drawSpiderIcon(ctx, colX) {
  const maxLv = 3;
  for (let lv = 1; lv <= maxLv; lv++) {
    for (let state = 0; state < 4; state++) {
      const rowIdx = (lv - 1) * 4 + state;
      const ox = colX * CELL;
      const oy = rowIdx * CELL;
      const { p, b } = gridBrush(ctx, ox, oy, 2);

      drawPedestal(b, p, lv, state === 1);

      // Spider body — centred, legs splayed
      const cx = 16;
      const cy = 16;
      const bodySize = 4 + lv;

      // Abdomen (back half)
      b(cx - bodySize / 2, cy - 1, bodySize, 4, COL.forest);
      b(cx - bodySize / 2 + 1, cy, bodySize - 2, 2, COL.mdGreen);
      // Head (front half)
      b(cx - 2, cy - 4, 4, 3, COL.darkFor);
      // Eyes
      p(cx - 1, cy - 3, COL.amber);
      p(cx + 1, cy - 3, COL.amber);
      if (state === 1 || state === 2) {
        p(cx - 1, cy - 3, COL.gold);
        p(cx + 1, cy - 3, COL.gold);
      }

      // Fangs
      if (lv >= 2) {
        p(cx - 1, cy - 1, COL.white);
        p(cx + 1, cy - 1, COL.white);
      }

      // Legs — 4 per side
      const legRows = [cy - 1, cy, cy + 1, cy + 2];
      for (let i = 0; i < 4; i++) {
        // Left legs
        p(cx - bodySize / 2 - 1, legRows[i], COL.bark);
        p(cx - bodySize / 2 - 2, legRows[i], COL.dkBark);
        p(cx - bodySize / 2 - 3 - (i % 2), legRows[i] + 1, COL.dkBark);
        // Right legs
        p(cx + bodySize / 2, legRows[i], COL.bark);
        p(cx + bodySize / 2 + 1, legRows[i], COL.dkBark);
        p(cx + bodySize / 2 + 2 + (i % 2), legRows[i] + 1, COL.dkBark);
      }

      // Thorn crest on back at higher levels
      if (lv >= 2) p(cx, cy - 2, COL.thorn);
      if (lv >= 3) {
        p(cx - 1, cy - 2, COL.thorn);
        p(cx + 1, cy - 2, COL.thorn);
      }

      // Venom drip on fire
      if (state === 2) {
        p(cx, cy + 3, COL.spore);
        p(cx, cy + 4, COL.spore);
      }
    }
  }
}

// ---------- Sunroot — new art (col 5) ----------
// Splash DPS. A sunflower-like bloom on a green stalk.
function drawSunroot(ctx, colX) {
  const maxLv = 3;
  for (let lv = 1; lv <= maxLv; lv++) {
    for (let state = 0; state < 4; state++) {
      const rowIdx = (lv - 1) * 4 + state;
      const ox = colX * CELL;
      const oy = rowIdx * CELL;
      const { p, b } = gridBrush(ctx, ox, oy, 2);
      const charge = state === 1;
      const fire = state === 2;

      drawPedestal(b, p, lv, charge || fire);

      const cx = 16;
      const bloomCY = 8 + (3 - lv); // higher levels bloom higher

      // Stalk
      b(cx - 1, bloomCY + 3, 2, 14, COL.mdGreen);
      b(cx, bloomCY + 3, 1, 14, COL.green);
      // Leaves at mid-stalk
      p(cx - 3, bloomCY + 8, COL.green);
      p(cx - 4, bloomCY + 9, COL.mdGreen);
      p(cx + 2, bloomCY + 7, COL.green);
      p(cx + 3, bloomCY + 8, COL.mdGreen);
      if (lv >= 2) {
        p(cx - 4, bloomCY + 10, COL.ltGreen);
        p(cx + 3, bloomCY + 11, COL.ltGreen);
      }

      // Bloom disc — sunflower center
      const bloomR = 2 + lv;
      for (let dy = -bloomR; dy <= bloomR; dy++) {
        for (let dx = -bloomR; dx <= bloomR; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 <= bloomR * bloomR) {
            const c = d2 < (bloomR - 1) * (bloomR - 1) ? COL.tanG : COL.bark;
            p(cx + dx, bloomCY + dy, c);
          }
        }
      }
      // Petals — 8 around the bloom
      const petalR = bloomR + 1;
      const petalCol = fire ? COL.white : (charge ? COL.ltAmber : COL.amber);
      const offsets = [[0, -petalR], [petalR, 0], [0, petalR], [-petalR, 0],
        [petalR - 1, -petalR + 1], [petalR - 1, petalR - 1], [-petalR + 1, petalR - 1], [-petalR + 1, -petalR + 1]];
      for (const [dx, dy] of offsets) {
        p(cx + dx, bloomCY + dy, petalCol);
        if (lv >= 3) {
          p(cx + Math.sign(dx) * (Math.abs(dx) + 1), bloomCY + dy, COL.gold);
          p(cx + dx, bloomCY + Math.sign(dy) * (Math.abs(dy) + 1), COL.gold);
        }
      }
      // Seed pattern in center
      if (lv >= 2) {
        p(cx, bloomCY, COL.dkBark);
        p(cx - 1, bloomCY - 1, COL.dkBark);
        p(cx + 1, bloomCY + 1, COL.dkBark);
      }

      // Charge — glow behind petals
      if (charge) {
        for (const [dx, dy] of offsets) p(cx + dx * 1.3 | 0, bloomCY + dy * 1.3 | 0, COL.ltAmber);
      }
      // Fire — bright radiant spike upward
      if (fire) {
        p(cx, bloomCY - petalR - 1, COL.white);
        p(cx, bloomCY - petalR - 2, COL.gold);
        p(cx - 1, bloomCY - petalR - 1, COL.ltAmber);
        p(cx + 1, bloomCY - petalR - 1, COL.ltAmber);
      }
    }
  }
}

// ---------- Projectile drawing (new columns) ----------
function drawBrambleProj(ctx, colX) {
  const ox = colX * PCELL;
  for (let row = 0; row < PROJ_ROWS; row++) {
    const oy = row * PCELL;
    const { p, b } = gridBrush(ctx, ox, oy, 2);
    // Small thorn sliver
    if (row < 3) {
      // Travel frames
      const tilt = row;
      p(8 - tilt, 8, COL.thorn);
      p(7 - tilt, 7, COL.thorn);
      p(8 - tilt, 7, COL.thorn);
      p(6 - tilt, 8, COL.thorn);
      p(9 - tilt, 8, COL.dkBark);
    } else {
      // Impact — tiny thorn burst
      const r = row - 3;
      for (let a = 0; a < 8; a++) {
        const dx = [0, 1, 2, 1, 0, -1, -2, -1][a];
        const dy = [-2, -1, 0, 1, 2, 1, 0, -1][a];
        p(8 + dx + r, 8 + dy, COL.thorn);
      }
    }
  }
}

function drawSpiderProj(ctx, colX) {
  // Thornweaver is mobile-melee — no projectile. Leave column empty.
  // (The game never fires a projectile for this tower; the mobile
  // unit trait handles attacks directly.) Just paint nothing.
}

function drawSunrootProj(ctx, colX) {
  const ox = colX * PCELL;
  for (let row = 0; row < PROJ_ROWS; row++) {
    const oy = row * PCELL;
    const { p } = gridBrush(ctx, ox, oy, 2);
    if (row < 3) {
      // Fireball petal
      const spin = row;
      const cx = 8, cy = 8;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy <= 4) {
            const d = Math.abs(dx) + Math.abs(dy);
            p(cx + dx, cy + dy, d < 2 ? COL.gold : COL.amber);
          }
        }
      }
      p(cx + (spin - 1), cy, COL.white);
      p(cx, cy + (spin - 1), COL.white);
    } else {
      // Bloom-burst impact
      const r = row - 3 + 2;
      for (let a = 0; a < 8; a++) {
        const dx = [0, 1, 2, 1, 0, -1, -2, -1][a] * r / 2 | 0;
        const dy = [-2, -1, 0, 1, 2, 1, 0, -1][a] * r / 2 | 0;
        p(8 + dx, 8 + dy, COL.gold);
        p(8 + dx * 2 / 3 | 0, 8 + dy * 2 / 3 | 0, COL.amber);
      }
    }
  }
}

// ---------- Spider mobile sheet ----------
/** 4 cols × (levels × 4 rows) × 32 cell. Rows per level:
 *    0: walk-down, 1: walk-right, 2: walk-up, 3: attack */
function drawSpiderMobile() {
  const levels = 3;
  const W = 4 * 32;
  const H = levels * 4 * 32;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  for (let lv = 1; lv <= levels; lv++) {
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 4; frame++) {
        const ox = frame * 32;
        const oy = ((lv - 1) * 4 + dir) * 32;
        const { p, b } = gridBrush(ctx, ox, oy, 2);

        // Walk bob — 4-frame gait
        const bob = (frame === 1) ? -1 : (frame === 3) ? 1 : 0;
        const legPhase = (frame % 2 === 0) ? 1 : -1;

        const cx = 8;
        const cy = 8 + bob;

        // Body orientation per direction
        const bodySize = 3 + lv;
        const abdomen = bodySize;
        const headOff = (dir === 0) ? 2 : (dir === 2) ? -2 : 0;
        const sideHead = (dir === 1) ? 2 : (dir === 1) ? 0 : 0;

        if (dir === 3) {
          // Attack — reared up pose
          b(cx - 2, cy - 3, 4, 4, COL.darkFor);      // head/fore
          b(cx - 2, cy + 1, 4, 3, COL.mdGreen);      // body
          // Fangs extended
          p(cx - 2, cy - 1, COL.white);
          p(cx + 1, cy - 1, COL.white);
          // Legs splayed wide
          for (let i = 0; i < 4; i++) {
            p(cx - 4 + i * 3 - 1 + (frame % 2), cy + 4, COL.bark);
            p(cx - 5 + i * 3, cy + 5, COL.dkBark);
          }
          // Venom drip during strike
          if (frame >= 2) {
            p(cx, cy - 2, COL.spore);
            p(cx + 1, cy - 1, COL.spore);
          }
        } else {
          // Walk — head on one side, abdomen on the other
          // Abdomen
          b(cx - abdomen / 2, cy, abdomen, abdomen, COL.forest);
          b(cx - abdomen / 2 + 1, cy + 1, abdomen - 2, abdomen - 2, COL.mdGreen);
          // Head
          b(cx - 2 + headOff, cy - 3, 4, 3, COL.darkFor);
          // Eyes
          const eyeColor = COL.amber;
          if (dir === 0) {
            // Facing down — eyes visible
            p(cx - 1 + headOff, cy - 2, eyeColor);
            p(cx + 1 + headOff, cy - 2, eyeColor);
          } else if (dir === 2) {
            // Facing up — small eye highlights
            p(cx - 1 + headOff, cy - 2, COL.dkBark);
            p(cx + 1 + headOff, cy - 2, COL.dkBark);
          }

          // Legs — 4 per side with phase
          for (let i = 0; i < 4; i++) {
            const yOff = ((i + frame) % 2 === 0) ? 0 : -1;
            // Left legs
            p(cx - abdomen / 2 - 1, cy + i + yOff, COL.bark);
            p(cx - abdomen / 2 - 2, cy + i + 1 + yOff, COL.dkBark);
            // Right legs
            p(cx + abdomen / 2, cy + i + yOff, COL.bark);
            p(cx + abdomen / 2 + 1, cy + i + 1 + yOff, COL.dkBark);
          }

          // Fangs visible at higher levels
          if (lv >= 2 && dir === 0) {
            p(cx - 1 + headOff, cy - 1, COL.white);
            p(cx + 1 + headOff, cy - 1, COL.white);
          }

          // Thorn crest at lv3
          if (lv >= 3) {
            p(cx, cy + 1, COL.thorn);
            p(cx - 1, cy + 2, COL.thorn);
            p(cx + 1, cy + 2, COL.thorn);
          }
        }
      }
    }
  }
  return canvas;
}

// ---------- Autumn palette swap ----------
/** Pixel-by-pixel swap using the loaded autumn palette. Uses
 *  `getImageData`/`putImageData` — slow for large sheets but only
 *  runs at build time. */
function applyAutumnPalette(sourceCanvas) {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;
  const out = createCanvas(W, H);
  const ctx = out.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;

  // Build a lookup: hex string → [r,g,b]
  const swapMap = new Map();
  for (const [from, to] of Object.entries(AUTUMN_PALETTE)) {
    const fromRGB = hexToRgb(from);
    const toRGB = hexToRgb(to);
    const key = (fromRGB[0] << 16) | (fromRGB[1] << 8) | fromRGB[2];
    swapMap.set(key, toRGB);
  }

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue; // transparent pixel
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const swap = swapMap.get(key);
    if (swap) {
      d[i] = swap[0]; d[i + 1] = swap[1]; d[i + 2] = swap[2];
    }
  }

  ctx.putImageData(img, 0, 0);
  return out;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// ---------- main pipeline ----------
async function main() {
  // Source the kept-column art from whichever sheet is currently
  // on disk. IMPORTANT: this script is NOT idempotent — a second
  // run against an already-reshuffled 8-col sheet will corrupt
  // the copied columns. Dimension-check so we fail loudly instead.
  console.log('Loading source nature_towers.png...');
  const oldTowers = await loadImage(join(NATURE_DIR, 'nature_towers.png'));
  if (oldTowers.width !== OLD_COLS * CELL) {
    console.error(
      `ERROR: expected source sheet to be ${OLD_COLS * CELL}px wide ` +
      `(6-col legacy layout), but found ${oldTowers.width}px. ` +
      `If the sheet is already in the new 8-col layout, restore the ` +
      `legacy PNG (e.g. \`git restore public/assets/nature/nature_towers.png\`) ` +
      `before re-running.`,
    );
    process.exit(1);
  }
  const oldProj = await loadImage(join(NATURE_DIR, 'nature_projectiles.png'));

  // -------- Towers sheet --------
  const tCanvas = createCanvas(TOWER_W, TOWER_H);
  const tCtx = tCanvas.getContext('2d');
  tCtx.imageSmoothingEnabled = false;
  tCtx.clearRect(0, 0, TOWER_W, TOWER_H);

  // Copy kept columns from old sheet
  for (const { src, dst } of COPY_MAP) {
    tCtx.drawImage(
      oldTowers,
      src * CELL, 0, CELL, TOWER_H,
      dst * CELL, 0, CELL, TOWER_H,
    );
  }

  // Draw new columns programmatically
  drawBramble(tCtx, 0);
  drawSpiderIcon(tCtx, 2);
  drawSunroot(tCtx, 5);

  writeFileSync(join(NATURE_DIR, 'nature_towers.png'), tCanvas.toBuffer('image/png'));
  console.log(`Wrote nature_towers.png (${TOWER_W}×${TOWER_H})`);

  // -------- Projectiles sheet --------
  const pCanvas = createCanvas(PROJ_W, PROJ_H);
  const pCtx = pCanvas.getContext('2d');
  pCtx.imageSmoothingEnabled = false;
  pCtx.clearRect(0, 0, PROJ_W, PROJ_H);

  // Copy kept projectile columns
  for (const { src, dst } of COPY_MAP) {
    pCtx.drawImage(
      oldProj,
      src * PCELL, 0, PCELL, PROJ_H,
      dst * PCELL, 0, PCELL, PROJ_H,
    );
  }
  drawBrambleProj(pCtx, 0);
  drawSpiderProj(pCtx, 2);
  drawSunrootProj(pCtx, 5);

  writeFileSync(join(NATURE_DIR, 'nature_projectiles.png'), pCanvas.toBuffer('image/png'));
  console.log(`Wrote nature_projectiles.png (${PROJ_W}×${PROJ_H})`);

  // -------- Autumn variants --------
  const tAutumn = applyAutumnPalette(tCanvas);
  writeFileSync(join(NATURE_DIR, 'nature_towers_autumn.png'), tAutumn.toBuffer('image/png'));
  console.log(`Wrote nature_towers_autumn.png (${TOWER_W}×${TOWER_H})`);

  const pAutumn = applyAutumnPalette(pCanvas);
  writeFileSync(join(NATURE_DIR, 'nature_projectiles_autumn.png'), pAutumn.toBuffer('image/png'));
  console.log(`Wrote nature_projectiles_autumn.png (${PROJ_W}×${PROJ_H})`);

  // -------- Spider mobile sheet --------
  const spiderCanvas = drawSpiderMobile();
  // Filename convention: `{name}_mobile.png` — faction prefix is
  // stripped (matches `rifleman_mobile.png`, `fiend_mobile.png`, etc.)
  writeFileSync(join(NATURE_DIR, 'spider_mobile.png'), spiderCanvas.toBuffer('image/png'));
  console.log(`Wrote spider_mobile.png (${spiderCanvas.width}×${spiderCanvas.height})`);

  const spiderAutumn = applyAutumnPalette(spiderCanvas);
  writeFileSync(join(NATURE_DIR, 'spider_mobile_autumn.png'), spiderAutumn.toBuffer('image/png'));
  console.log(`Wrote spider_mobile_autumn.png`);

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
