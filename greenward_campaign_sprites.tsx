// @ts-nocheck
/**
 * greenward_campaign_sprites.tsx — Greenward (Campaign #3) campaign sprites.
 *
 * Same shape as arcane_campaign_sprites.tsx + mech_campaign_sprites.tsx.
 *
 * Contents (built incrementally — order tracks the execution plan):
 *
 *   - Heron of Eadwin (commit 8) — recurring named figure across
 *     M3 / M6 / M8 / M10. 4-frame sheet, 32×32 each:
 *       F0 silhouette  — M3 chimney perch; dark outline only.
 *       F1 watching    — M6 chapel-roof perch; full colour.
 *       F2 walking     — M8 behind-the-Child gait; the Heron has
 *                        come down from the roofs.
 *       F3 kneeling    — M10 Mercy-Nave end-state.
 *     Bakes to `public/assets/arena/heron_of_eadwin.png`.
 *
 *   - Inheritor creeps (commit 9) — Road-Walker, Den-Walker,
 *     Messenger, River-Crawler, Civilian (3 variants), Wedding-Stone
 *     livery, Knight, Herald, Child.
 *
 *   - Named Watchers (commit 9 / per-mission commits) — Old Woman
 *     of Eadwin, Cethric the Crow-Priest, Stone Bride.
 *
 *   - Inheritor defender CPU towers (commit 9 / M9 commit) — 3
 *     variants for the M9 attacker mission.
 *
 *   - End tableaux (commit 20) — three M10 ending illustrations.
 *
 * Render script: scripts/render_greenward_campaign_sprites.ts
 */

import { useRef, useEffect, useState } from 'react';

// ─── Palette ────────────────────────────────────────────────────
// Heron-of-Eadwin palette. Cool greys + pale legs; the silhouette
// is darker than the lit form so the M3 chimney version reads as
// "outline only" even before it animates.
const HERON_SILHOUETTE = '#1a1a1f';
const HERON_BODY       = '#9ca0a8';   // pale grey-feathered
const HERON_BODY_DK    = '#5b6068';   // shading on the underside
const HERON_BEAK       = '#c8a04b';   // muted ochre — bird-of-prey palette
const HERON_LEG        = '#4a4a52';   // legs darker than body
const HERON_EYE        = '#e8d8a8';   // pale knowing eye

// ─── Draw helpers ───────────────────────────────────────────────
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ─── Heron of Eadwin ─────────────────────────────────────────────
//
// 32×32 frame. Bird stands on a 32-wide frame with its body roughly
// centred; long neck rises from the upper torso, thin legs descend
// to the bottom. Silhouette frame uses HERON_SILHOUETTE for every
// pixel; lit frames colour-in.
//
// Body proportions are deliberate: tall narrow bird, ~24 px tall,
// 8 px wide at the body, neck offset slightly to one side so the
// walking and kneeling poses can rotate without redrawing everything.

const HERON_W = 32;
const HERON_H = 32;
const HERON_FRAMES = 4;
export const HERON_DIMS = { W: HERON_W, H: HERON_H, FRAMES: HERON_FRAMES };

/** Draw the perched, silhouette-only Heron (F0 — M3 chimney). */
export function drawHeronSilhouette(ctx: CanvasRenderingContext2D, yOff: number) {
  drawHeronPerched(ctx, yOff, true);
}

/** Draw the perched, full-colour Heron (F1 — M6 chapel-roof). */
export function drawHeronWatching(ctx: CanvasRenderingContext2D, yOff: number) {
  drawHeronPerched(ctx, yOff, false);
}

function drawHeronPerched(ctx: CanvasRenderingContext2D, yOff: number, silhouette: boolean) {
  const C_BODY = silhouette ? HERON_SILHOUETTE : HERON_BODY;
  const C_DK   = silhouette ? HERON_SILHOUETTE : HERON_BODY_DK;
  const C_BEAK = silhouette ? HERON_SILHOUETTE : HERON_BEAK;
  const C_LEG  = silhouette ? HERON_SILHOUETTE : HERON_LEG;
  const C_EYE  = silhouette ? null : HERON_EYE;

  // Body (centred, 8 wide × 6 tall, around y=18).
  rect(ctx, 12, yOff + 18, 8, 6, C_BODY);
  // Underbelly shading.
  rect(ctx, 13, yOff + 22, 6, 1, C_DK);
  // Neck rising from upper torso, slight forward tilt.
  rect(ctx, 17, yOff + 13, 2, 5, C_BODY);
  rect(ctx, 16, yOff + 11, 2, 2, C_BODY);
  // Head.
  rect(ctx, 14, yOff + 8,  4, 4, C_BODY);
  // Beak — long, pointing forward (camera-right).
  rect(ctx, 18, yOff + 9,  4, 1, C_BEAK);
  rect(ctx, 18, yOff + 10, 3, 1, C_BEAK);
  // Eye — single bright pixel.
  if (C_EYE) px(ctx, 15, yOff + 9, C_EYE);
  // Folded wing — slight darker patch on body.
  rect(ctx, 14, yOff + 19, 4, 3, C_DK);
  // Legs — straight down (perched).
  rect(ctx, 14, yOff + 24, 1, 6, C_LEG);
  rect(ctx, 17, yOff + 24, 1, 6, C_LEG);
  // Tail tuck.
  rect(ctx, 10, yOff + 19, 2, 2, C_BODY);
}

/** Draw the walking Heron (F2 — M8 court gait). Slightly lower body
 *  pose; one leg lifted forward. */
export function drawHeronWalking(ctx: CanvasRenderingContext2D, yOff: number) {
  // Body, dropped 1 px to read as "no longer perched."
  rect(ctx, 12, yOff + 19, 8, 6, HERON_BODY);
  rect(ctx, 13, yOff + 23, 6, 1, HERON_BODY_DK);
  // Neck more forward, walking posture.
  rect(ctx, 18, yOff + 14, 2, 5, HERON_BODY);
  rect(ctx, 17, yOff + 12, 2, 2, HERON_BODY);
  rect(ctx, 15, yOff + 9,  4, 4, HERON_BODY);
  // Beak pointing camera-right.
  rect(ctx, 19, yOff + 10, 4, 1, HERON_BEAK);
  rect(ctx, 19, yOff + 11, 3, 1, HERON_BEAK);
  px(ctx, 16, yOff + 10, HERON_EYE);
  // Wing folded but slightly forward.
  rect(ctx, 14, yOff + 20, 4, 3, HERON_BODY_DK);
  // Front leg lifted (knee bent), back leg planted.
  // Back (planted) leg
  rect(ctx, 17, yOff + 25, 1, 5, HERON_LEG);
  // Front (lifted) leg — bent forward
  rect(ctx, 14, yOff + 25, 1, 3, HERON_LEG);
  rect(ctx, 13, yOff + 27, 2, 1, HERON_LEG);
  rect(ctx, 13, yOff + 28, 1, 2, HERON_LEG);
  rect(ctx, 10, yOff + 19, 2, 3, HERON_BODY);
}

/** Draw the kneeling Heron (F3 — M10 Mercy-Nave). Body lowered
 *  flat against the ground; head bowed; legs folded under. */
export function drawHeronKneeling(ctx: CanvasRenderingContext2D, yOff: number) {
  // Body lying low and wider — read as collapsed onto the floor.
  rect(ctx, 10, yOff + 24, 12, 5, HERON_BODY);
  rect(ctx, 11, yOff + 28, 10, 1, HERON_BODY_DK);
  // Wings tucked across body.
  rect(ctx, 12, yOff + 25, 8, 3, HERON_BODY_DK);
  // Neck bowed forward, almost level with body.
  rect(ctx, 20, yOff + 22, 3, 2, HERON_BODY);
  rect(ctx, 21, yOff + 21, 2, 1, HERON_BODY);
  // Head (lowered).
  rect(ctx, 22, yOff + 22, 4, 3, HERON_BODY);
  // Beak resting on ground.
  rect(ctx, 26, yOff + 23, 4, 1, HERON_BEAK);
  rect(ctx, 26, yOff + 24, 3, 1, HERON_BEAK);
  px(ctx, 23, yOff + 23, HERON_EYE);
  // Legs folded — visible as small dark bumps under the body.
  rect(ctx, 14, yOff + 28, 1, 2, HERON_LEG);
  rect(ctx, 17, yOff + 28, 1, 2, HERON_LEG);
}

/** Draw the full 4-frame Heron sheet stacked vertically. Matches the
 *  Phaser spritesheet convention used by Mech / Arcane campaigns. */
export function drawHeronSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, HERON_W, HERON_H * HERON_FRAMES);
  drawHeronSilhouette(ctx, 0 * HERON_H);
  drawHeronWatching  (ctx, 1 * HERON_H);
  drawHeronWalking   (ctx, 2 * HERON_H);
  drawHeronKneeling  (ctx, 3 * HERON_H);
}

// ─── Preview component (sprite-preview pipeline) ─────────────────
// Mirrors the Mech / Arcane preview components — sprite-preview.tsx
// imports each campaign's module by name. Renders a single canvas
// the user can eyeball + download.

export default function GreenwardCampaignPreview() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(4);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawHeronSheet(ctx);
  }, []);
  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#e8e8e8' }}>
      <h1 style={{ fontFamily: 'sans-serif' }}>Greenward Campaign — Sprites</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label>scale</label>
        <input type="range" min={1} max={8} value={scale} onChange={e => setScale(Number(e.target.value))} />
        <span>{scale}×</span>
      </div>
      <div>
        <div style={{ fontFamily: 'monospace', marginBottom: 4 }}>Heron of Eadwin (4 frames: silhouette / watching / walking / kneeling)</div>
        <canvas
          ref={ref}
          width={HERON_W}
          height={HERON_H * HERON_FRAMES}
          style={{ imageRendering: 'pixelated', width: HERON_W * scale, height: HERON_H * HERON_FRAMES * scale, background: '#222' }}
        />
      </div>
    </div>
  );
}
