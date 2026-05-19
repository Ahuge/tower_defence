// @ts-nocheck
/**
 * snake_eyes_creep_sprites.tsx — bespoke sprite for The Collector,
 * the Snake Eyes campaign's M8 boss.
 *
 * Single-creep sheet: 1 col × 7 rows = 64×448. Routes through
 * CreepSpriteManager.SNAKE_EYES_CAMPAIGN_TO_COL so the void_collector
 * id renders this bespoke art instead of falling back to col 0 of
 * the void faction sheet (which made him look like a generic void
 * creep and undercut his read as the campaign's named enforcer).
 *
 * Locked-in concept (3-option compare, user picked B):
 *   Coin-faced repo-man — banker's coat, top hat, gold-coin face.
 *
 * The Collector "doesn't take lives — takes towers." So the sprite
 * is dressed for finance: dark Victorian banker's coat with golden
 * buttons, a top hat, an open ledger in hand. His face is a
 * gleaming gold coin (with the snake-eyes "1" pip stamped on it),
 * not a human face. Reads as "debt is walking toward you."
 *
 * Bakes to `public/assets/creeps/snake_eyes_creeps.png`.
 */
import { useRef, useEffect, useState } from 'react';

// ===== PALETTE =====
const C = {
  // Coat — deep blue-black banker's tailcoat
  COAT_DK:    '#1a1828',
  COAT:       '#2a2840',
  COAT_HI:    '#4a4866',
  COAT_LT:    '#6a6888',
  // Coin / gold (the face)
  GOLD_DK:    '#886622',
  GOLD:       '#ccaa44',
  GOLD_HI:    '#ffdd88',
  GOLD_GLOW:  '#ffeeaa',
  // Shadow / black
  BLACK:      '#0a0a14',
  SHAD:       '#1a1a24',
  WHITE:      '#ffffff',
  // Hat — black with silk band
  HAT:        '#141420',
  HAT_HI:     '#2a2a3a',
  // Ledger
  LEDGER_DK:  '#3a2422',
  LEDGER:     '#5a3a30',
  PAPER:      '#e8d8c0',
  PAPER_DK:   '#b8a888',
  INK:        '#1a1010',
  // Tie / lapel
  TIE:        '#440044',
  // Snake-eyes "1" pip on coin face
  PIP:        '#2a1828',
  // Drifting purple (void signature)
  VOID:       '#5a2266',
  VOID_LT:    '#aa66cc',
  VOID_DK:    '#2a0a3a',
};

const mk = (c: CanvasRenderingContext2D, o: number[], gw: number, gh: number, ps: number) => {
  const p = (x: number, y: number, cl: string) => {
    if (!cl || x < 0 || x >= gw || y < 0 || y >= gh) return;
    c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, ps, ps);
  };
  const b = (x: number, y: number, w: number, h: number, cl: string) => {
    if (!cl) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, w * ps, h * ps);
  };
  return { p, b };
};

const PX = 2, GRID = 32, CELL = GRID * PX;
const COLS = 1;
const ROWS = 7;
export const SHEET_W = COLS * CELL; // 64
export const SHEET_H = ROWS * CELL; // 448

// ============================================================
// The Collector — coin-faced repo-man
// ============================================================
function drawCollector(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legA = [0, 1, 0, -1][f];
    const legB = [0, -1, 0, 1][f];
    const ledgerSway = (f % 2);
    const by = 3 + bob;
    // Drifting void wisp behind/under him (campaign signature)
    p(6, by + 12, C.VOID_LT); p(25, by + 16, C.VOID_LT);
    p(4, by + 18, C.VOID); p(27, by + 8, C.VOID);

    // ─── TOP HAT ─────────────────────────────────────────
    // crown
    b(11, by, 10, 5, C.HAT);
    b(11, by, 10, 1, C.HAT_HI);
    b(11, by, 1, 5, C.HAT_HI);
    b(20, by + 1, 1, 4, C.BLACK);
    // hat band (purple, snake-eyes signature)
    b(11, by + 4, 10, 1, C.VOID);
    p(15, by + 4, C.VOID_LT); p(16, by + 4, C.VOID_LT);
    // hat brim
    b(9, by + 5, 14, 2, C.HAT);
    b(9, by + 5, 14, 1, C.HAT_HI);
    b(9, by + 6, 14, 1, C.BLACK);

    // ─── COIN FACE ───────────────────────────────────────
    // outer rim (slightly larger than face — embossed coin look)
    b(11, by + 7, 10, 10, C.GOLD_DK);
    b(11, by + 7, 10, 1, C.GOLD);
    b(11, by + 16, 10, 1, C.BLACK);
    b(11, by + 7, 1, 10, C.GOLD);
    b(20, by + 8, 1, 9, C.SHAD);
    // coin face (inner disc)
    b(12, by + 8, 8, 8, C.GOLD);
    b(12, by + 8, 8, 1, C.GOLD_HI);
    b(12, by + 15, 8, 1, C.GOLD_DK);
    b(12, by + 8, 1, 8, C.GOLD_HI);
    b(19, by + 9, 1, 7, C.GOLD_DK);
    // gleam highlight on the coin (animated — rotates each frame)
    const gleamX = 13 + (f % 3);
    p(gleamX, by + 9, C.GOLD_GLOW);
    p(gleamX + 1, by + 9, C.WHITE);
    // SNAKE-EYES PIP — a stamped "1" in the centre of the coin
    // (single pip = snake eyes, the campaign's signature)
    b(15, by + 11, 2, 3, C.PIP);
    p(15, by + 11, C.GOLD_DK); p(16, by + 13, C.GOLD_DK);
    // tiny circumferential text dots ("E PLURIBUS DEBTUM")
    p(13, by + 10, C.PIP); p(18, by + 10, C.PIP);
    p(12, by + 12, C.PIP); p(19, by + 12, C.PIP);
    p(13, by + 14, C.PIP); p(18, by + 14, C.PIP);
    // ridged coin edge
    p(11, by + 9, C.GOLD_HI); p(11, by + 11, C.GOLD_HI); p(11, by + 13, C.GOLD_HI);
    p(20, by + 9, C.SHAD); p(20, by + 11, C.SHAD); p(20, by + 13, C.SHAD);

    // ─── TIE / COLLAR ────────────────────────────────────
    b(14, by + 17, 4, 1, C.PAPER); // wing collar
    b(15, by + 18, 2, 3, C.TIE);
    p(15, by + 19, C.VOID_LT);

    // ─── COAT (Victorian tailcoat) ───────────────────────
    // shoulders
    b(9, by + 17, 14, 2, C.COAT_DK);
    b(9, by + 17, 14, 1, C.COAT);
    // chest
    b(10, by + 19, 12, 6, C.COAT);
    b(10, by + 19, 1, 6, C.COAT_HI);
    b(21, by + 19, 1, 6, C.COAT_DK);
    // lapels
    b(11, by + 19, 2, 4, C.COAT_HI);
    b(11, by + 19, 1, 4, C.COAT_LT);
    b(19, by + 19, 2, 4, C.COAT_HI);
    // gold buttons down the front
    p(16, by + 20, C.GOLD); p(16, by + 22, C.GOLD); p(16, by + 24, C.GOLD);
    p(16, by + 20, C.GOLD_HI); p(16, by + 22, C.GOLD_HI);
    // pocket-watch chain (slung across waistcoat — animates with sway)
    p(13, by + 23 + (f % 2), C.GOLD);
    p(14, by + 24 - (f % 2), C.GOLD_HI);
    p(15, by + 23 + (f % 2), C.GOLD);

    // ─── LEDGER in left hand (open book, taxing your towers) ─
    // arm
    b(8, by + 19, 2, 4, C.COAT_DK);
    b(8, by + 19, 1, 4, C.COAT);
    // hand
    b(7, by + 22, 2, 2, C.PAPER_DK);
    // ledger — slightly tilted, animates open/close
    const bx = 4 + ledgerSway;
    // back cover
    b(bx, by + 22, 5, 4, C.LEDGER_DK);
    b(bx, by + 22, 5, 1, C.LEDGER);
    // pages
    b(bx + 1, by + 22, 3, 4, C.PAPER);
    b(bx + 1, by + 22, 3, 1, C.PAPER_DK);
    b(bx + 2, by + 22, 1, 4, C.LEDGER);
    // ink lines on pages (writing)
    p(bx + 1, by + 23, C.INK); p(bx + 3, by + 23, C.INK);
    p(bx + 1, by + 24, C.INK); p(bx + 3, by + 24, C.INK);
    p(bx + 1, by + 25, C.INK);

    // ─── RIGHT ARM (gesturing/pointing) ──────────────────
    b(22, by + 19, 2, 4, C.COAT);
    b(22, by + 19, 1, 4, C.COAT_HI);
    // pointing finger
    b(23, by + 23, 1, 2, C.PAPER_DK);
    p(24, by + 24, C.PAPER_DK);

    // ─── COAT TAILS (extend below waist) ─────────────────
    b(10, by + 25, 12, 2, C.COAT_DK);
    b(10, by + 25, 12, 1, C.COAT);
    // tail splits (asymmetric — animates with stride)
    b(11 + legA, by + 27, 4, 2, C.COAT_DK);
    b(17 + legB, by + 27, 4, 2, C.COAT_DK);
    // tail edges
    p(10, by + 27, C.BLACK); p(22, by + 27, C.BLACK);

    // ─── LEGS (mostly hidden behind tails — just feet) ──
    b(12 + legA, by + 28, 2, 1, C.BLACK);
    b(18 + legB, by + 28, 2, 1, C.BLACK);
  } else {
    drawCollectorDeath(p, b, f - 4);
  }
}

// ============================================================
// Death — coin spins to ground, ledger pages scatter
// ============================================================
function drawCollectorDeath(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number
) {
  const cx = 16, cy = 18;
  if (deathFrame === 0) {
    // Coin flips loose from hat — coat sags
    b(cx - 5, cy - 2, 10, 8, C.COAT_DK);
    b(cx - 5, cy - 2, 10, 1, C.COAT);
    // coin in mid-flip (edge-on)
    b(cx - 3, cy - 10, 6, 2, C.GOLD);
    b(cx - 3, cy - 10, 6, 1, C.GOLD_HI);
    p(cx, cy - 9, C.PIP);
    // hat tilting off
    b(cx + 1, cy - 7, 5, 3, C.HAT);
    p(cx + 1, cy - 7, C.HAT_HI);
    // pages flying
    p(cx - 8, cy - 4, C.PAPER); p(cx + 8, cy - 6, C.PAPER);
    // void wisp escapes
    p(cx, cy + 2, C.VOID_LT); p(cx - 2, cy + 3, C.VOID);
  } else if (deathFrame === 1) {
    // Burst — coat collapses, coin lands face-up, void plume
    b(cx - 6, cy + 4, 12, 4, C.COAT_DK);
    b(cx - 6, cy + 4, 12, 1, C.COAT);
    // coin face up on the ground (full disc)
    b(cx - 4, cy + 8, 8, 5, C.GOLD);
    b(cx - 4, cy + 8, 8, 1, C.GOLD_HI);
    b(cx - 4, cy + 12, 8, 1, C.GOLD_DK);
    // snake-eyes pip stamped
    b(cx - 1, cy + 10, 2, 2, C.PIP);
    // pages scattered
    p(cx - 8, cy + 6, C.PAPER); p(cx + 8, cy + 6, C.PAPER_DK);
    p(cx - 6, cy + 9, C.PAPER_DK); p(cx + 7, cy + 9, C.PAPER);
    p(cx - 4, cy - 2, C.PAPER); p(cx + 5, cy - 1, C.PAPER);
    // void plume rising
    p(cx, cy - 4, C.VOID_LT); p(cx - 1, cy - 6, C.VOID);
    p(cx + 1, cy - 7, C.VOID_LT); p(cx, cy - 9, C.VOID_DK);
    // splash sparks
    p(cx - 9, cy + 8, C.GOLD_HI); p(cx + 9, cy + 8, C.GOLD_HI);
  } else {
    // Settled — coin lies on the floor among pages, void dissipating
    // ground silhouette of coat heap
    b(cx - 7, cy + 10, 14, 3, C.SHAD);
    b(cx - 7, cy + 10, 14, 1, C.COAT_DK);
    // coin (final rest)
    b(cx - 3, cy + 8, 6, 4, C.GOLD);
    b(cx - 3, cy + 8, 6, 1, C.GOLD_HI);
    b(cx - 3, cy + 11, 6, 1, C.GOLD_DK);
    b(cx - 1, cy + 9, 2, 2, C.PIP);
    // final pages
    b(cx - 9, cy + 11, 3, 2, C.PAPER);
    b(cx + 6, cy + 11, 3, 2, C.PAPER_DK);
    p(cx - 8, cy + 12, C.INK); p(cx + 7, cy + 12, C.INK);
    // last void wisp drifting up
    p(cx, cy - 8, C.VOID_DK); p(cx + 2, cy - 6, C.VOID_DK);
    p(cx, cy - 10, C.VOID_DK);
  }
}

// ===== ROUTING =====
export function drawSnakeEyesCampaignCreepSheet(ctx: CanvasRenderingContext2D) {
  for (let row = 0; row < ROWS; row++) {
    drawCollector(ctx, [0, row * CELL], row);
  }
}

// ===== COMPONENT (browser preview) =====
export default function SnakeEyesCampaignCreepSprites() {
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sc = sheetRef.current!;
    sc.width = SHEET_W;
    sc.height = SHEET_H;
    const sctx = sc.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    drawSnakeEyesCampaignCreepSheet(sctx);

    const pv = previewRef.current!;
    const S = 4, LW = 100, LH = 18;
    pv.width = LW + CELL * S;
    pv.height = ROWS * (CELL * S + LH);
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a0814';
    pc.fillRect(0, 0, pv.width, pv.height);
    const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];
    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 4;
      pc.fillStyle = C.GOLD_HI;
      pc.font = 'bold 11px monospace';
      pc.fillText(ROW_NAMES[r], 4, by + CELL * S / 2 + 4);
      pc.drawImage(sc, 0, r * CELL, CELL, CELL, LW, by, CELL * S, CELL * S);
    }
    setReady(true);
  }, []);

  const download = () => {
    const a = document.createElement('a');
    a.download = 'snake_eyes_creeps.png';
    a.href = sheetRef.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 16, background: '#0a0510', minHeight: '100vh', color: C.GOLD_HI }}>
      <h1>Snake Eyes — The Collector</h1>
      <p>1 col × 7 rows = {SHEET_W}×{SHEET_H} sheet. Coin-faced repo-man.</p>
      <button onClick={download} disabled={!ready}>Download snake_eyes_creeps.png</button>
      <canvas ref={sheetRef} style={{ display: 'none' }} />
      <canvas ref={previewRef} style={{ marginTop: 16, border: '1px solid #444' }} />
    </div>
  );
}
