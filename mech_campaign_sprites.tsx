// @ts-nocheck
/**
 * mech_campaign_sprites.tsx — one-off sprites for the Mechanical campaign.
 *
 * Same shape as arcane_campaign_sprites.tsx (palette imports, draw helpers,
 * default-export React component for the sprite-preview pipeline).
 *
 * Contents (built incrementally — order matches mech-campaign-sprites-plan.md):
 *   - Workshop (M10) — Arcane summoning altar where Vael conjures the
 *     Raider squad. Violet stone + gold runes. Single static frame, 32×32.
 *     Bakes to `assets/arena/struct_workshop.png`.
 *
 *   Forthcoming: Suppression Pylon (Mech/steampunk), Generator (Mech),
 *   Raider (Arcane apprentice with walk cycle), Voss's Throne (Mech 3×3
 *   boss structure).
 */
import { useRef, useEffect, useState } from 'react';
import { C_base as ArcBase } from './arcane_sprites';

// ===== HELPERS =====
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ============================================================
// WORKSHOP — Vael's summoning altar (M10)
// ============================================================
// 32×32 single frame. Octagonal stone dais with a peaked roof on
// two flanking pillars; a glowing arcane rune hangs in the alcove
// between the pillars. Reads as "place where apprentices are
// conjured into being." Arcane palette throughout — violet stone,
// gold rune accent, lavender highlight.

const WS_W = 32;
const WS_H = 32;
const WS_FRAMES = 1;

// Palette aliases for legibility.
const WS_SHAD       = ArcBase.SHAD;        // #110022 — outline / deepest shadow
const WS_STONE_DK   = ArcBase.DVIO;        // #220044 — base stone shadow
const WS_STONE_MD   = ArcBase.DKVIO;       // #331166 — stone mid-tone
const WS_STONE_LT   = ArcBase.MDVIO;       // #442288 — stone highlight
const WS_RUNE_GOLD  = '#ffcc44';
const WS_RUNE_HI    = '#ffee99';
const WS_VIOLET     = ArcBase.BRVIO;       // #6644ff — magic glow
const WS_LAV        = ArcBase.LAV;         // #cc88ff — bright lavender
const WS_PLLAV      = ArcBase.PLLAV;       // #eeccff — palest lavender highlight

function drawWorkshopSheet(ctx: CanvasRenderingContext2D) {
  // ─── DAIS (bottom octagonal base, rows 24-30) ────────────
  // Wide bottom row, narrower upper rows — fakes octagonal shape.
  rect(ctx, 6, 30, 20, 1, WS_SHAD);              // ground shadow
  rect(ctx, 5, 28, 22, 2, WS_STONE_DK);          // dais base ring
  rect(ctx, 6, 27, 20, 1, WS_STONE_MD);          // dais step
  rect(ctx, 7, 26, 18, 1, WS_STONE_LT);          // dais top edge highlight
  rect(ctx, 7, 25, 18, 1, WS_STONE_MD);          // dais top
  // Dais detail — repeating notches for "carved stone" feel.
  for (let x = 8; x < 25; x += 3) {
    px(ctx, x, 27, WS_SHAD);
    px(ctx, x, 29, WS_SHAD);
  }
  // Front step into alcove.
  rect(ctx, 12, 24, 8, 1, WS_STONE_MD);
  rect(ctx, 13, 23, 6, 1, WS_STONE_LT);

  // ─── PILLARS (left + right, rows 8-24) ───────────────────
  // Left pillar.
  rect(ctx, 6, 8, 4, 17, WS_STONE_DK);           // shadow
  rect(ctx, 7, 8, 2, 17, WS_STONE_MD);           // mid
  rect(ctx, 7, 8, 1, 17, WS_STONE_LT);           // left-edge highlight
  rect(ctx, 6, 9, 1, 15, WS_SHAD);               // outline
  // Right pillar (mirror).
  rect(ctx, 22, 8, 4, 17, WS_STONE_DK);
  rect(ctx, 23, 8, 2, 17, WS_STONE_MD);
  rect(ctx, 24, 8, 1, 17, WS_STONE_LT);
  rect(ctx, 25, 9, 1, 15, WS_SHAD);
  // Pillar caps (carved tops).
  rect(ctx, 5, 7, 6, 1, WS_STONE_LT);
  rect(ctx, 21, 7, 6, 1, WS_STONE_LT);
  rect(ctx, 5, 8, 6, 1, WS_STONE_MD);
  rect(ctx, 21, 8, 6, 1, WS_STONE_MD);

  // ─── ROOF / CANOPY (peaked arch, rows 1-7) ──────────────
  // Spans across both pillars, peaked apex in the centre.
  rect(ctx, 6, 6, 20, 1, WS_STONE_DK);           // canopy underside shadow
  rect(ctx, 7, 5, 18, 1, WS_STONE_MD);           // canopy main
  rect(ctx, 8, 4, 16, 1, WS_STONE_LT);           // canopy top edge
  // Peak: triangle rising from centre.
  rect(ctx, 14, 3, 4, 1, WS_STONE_MD);
  rect(ctx, 15, 2, 2, 1, WS_STONE_LT);
  px(ctx, 15, 1, WS_STONE_MD);
  px(ctx, 16, 1, WS_STONE_DK);
  // Peak apex finial — small gold rune to crown the structure.
  px(ctx, 15, 0, WS_RUNE_GOLD);
  px(ctx, 16, 0, WS_RUNE_GOLD);

  // ─── ALCOVE INTERIOR (the dark space behind the rune) ────
  // Recess between pillars, casts shadow.
  rect(ctx, 11, 9, 10, 14, WS_SHAD);
  rect(ctx, 11, 9, 1, 14, WS_STONE_DK);          // inner-left edge
  rect(ctx, 20, 9, 1, 14, WS_STONE_DK);          // inner-right edge
  // Subtle violet inner glow lining the alcove.
  rect(ctx, 12, 10, 8, 1, withAlpha(WS_VIOLET, 0.35));
  rect(ctx, 12, 22, 8, 1, withAlpha(WS_VIOLET, 0.35));

  // ─── RUNE — central glowing sigil ────────────────────────
  // The rune is a hovering hexagonal sigil — gold core with violet
  // diffusion ring. Player reads it as "things spawn from here."
  const rcx = 16, rcy = 15;
  // Outer violet glow (3 concentric brightness rings).
  for (let r = 5; r >= 1; r--) {
    const intensity = (6 - r) / 6; // 0.17 → 0.83
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === r) {
          px(ctx, rcx + dx, rcy + dy, withAlpha(WS_LAV, intensity * 0.5));
        }
      }
    }
  }
  // Hex outline (gold).
  px(ctx, rcx,     rcy - 3, WS_RUNE_GOLD);
  px(ctx, rcx - 1, rcy - 2, WS_RUNE_GOLD); px(ctx, rcx + 1, rcy - 2, WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy - 1, WS_RUNE_GOLD); px(ctx, rcx + 2, rcy - 1, WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy,     WS_RUNE_GOLD); px(ctx, rcx + 2, rcy,     WS_RUNE_GOLD);
  px(ctx, rcx - 2, rcy + 1, WS_RUNE_GOLD); px(ctx, rcx + 2, rcy + 1, WS_RUNE_GOLD);
  px(ctx, rcx - 1, rcy + 2, WS_RUNE_GOLD); px(ctx, rcx + 1, rcy + 2, WS_RUNE_GOLD);
  px(ctx, rcx,     rcy + 3, WS_RUNE_GOLD);
  // Hex core (brighter highlight).
  rect(ctx, rcx - 1, rcy - 1, 3, 3, WS_RUNE_HI);
  px(ctx, rcx, rcy, '#ffffff');

  // ─── ORBITING GLYPH PARTICLES ────────────────────────────
  // Three pale lavender dots floating around the rune — atmosphere.
  px(ctx, 10, 12, WS_PLLAV);
  px(ctx, 22, 17, WS_PLLAV);
  px(ctx, 12, 20, WS_PLLAV);
}

// ============================================================
// REACT COMPONENT — preview + download
// ============================================================

export default function MechCampaignSprites() {
  const wsRef = useRef<HTMLCanvasElement>(null);
  const wsPv = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ----- Workshop sheet (single 32×32 frame) -----
    const ws = wsRef.current!;
    ws.width = WS_W;
    ws.height = WS_H * WS_FRAMES;
    const wCtx = ws.getContext('2d')!;
    wCtx.imageSmoothingEnabled = false;
    drawWorkshopSheet(wCtx);

    const pv = wsPv.current!;
    const scale = 8;
    pv.width = WS_W * scale + 80;
    pv.height = WS_H * scale + 20;
    const pCtx = pv.getContext('2d')!;
    pCtx.imageSmoothingEnabled = false;
    pCtx.fillStyle = '#07050c';
    pCtx.fillRect(0, 0, pv.width, pv.height);
    pCtx.fillStyle = WS_LAV;
    pCtx.font = 'bold 11px monospace';
    pCtx.fillText('Workshop', 4, pv.height / 2 + 4);
    pCtx.save();
    pCtx.translate(80, 10);
    pCtx.scale(scale, scale);
    pCtx.drawImage(ws, 0, 0, WS_W, WS_H, 0, 0, WS_W, WS_H);
    pCtx.restore();
    pCtx.strokeStyle = '#1a1a2a';
    pCtx.strokeRect(80, 10, WS_W * scale, WS_H * scale);

    setReady(true);
  }, []);

  const dl = (ref: React.RefObject<HTMLCanvasElement>, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ background: '#07050c', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: WS_LAV, margin: 0, fontSize: 15 }}>
          MECH CAMPAIGN — Workshop (Vael's Summoning Altar)
        </h2>
        {ready && (
          <button
            onClick={dl(wsRef as React.RefObject<HTMLCanvasElement>, 'struct_workshop.png')}
            style={{
              background: WS_VIOLET, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download Workshop PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: WS_LAV, fontSize: 11, marginBottom: 4 }}>raw sheet (32×32)</div>
          <canvas
            ref={wsRef}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <div>
          <div style={{ color: WS_LAV, fontSize: 11, marginBottom: 4 }}>preview (8×)</div>
          <canvas
            ref={wsPv}
            style={{ background: '#000', imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
