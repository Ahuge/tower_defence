#!/usr/bin/env python3
"""
generate_hero_base_sheets.py — per-faction HD base spritesheets per
`notes/art_prds/02_hero_base_per_faction.md`.

Output: `public/assets/arena/base_<faction>.png` (112 × 700 px).
- 5 damage frames stacked vertically (112 × 140 each).
- Frame order: pristine → 75% → 50% → 25% → 0% (collapse).
- Each frame's silhouette is a faction-specific shape; damage states
  reuse the silhouette and add progressively heavier overlay
  (chip pixels, holes, scorch marks, fragmentation).

Pixel-art discipline matches existing structures:
- 1 px outline (secondary color, not pure black)
- 3-color palette per detail blob
- No AA, NEAREST filter

Run:
  python3 scripts/generate_hero_base_sheets.py
"""
from __future__ import annotations
import os
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'arena'

W = 112
H = 140
FRAMES = 5

FACTIONS: dict[str, tuple[int, int]] = {
    'arcane':     (0x6644ff, 0x9988ff),
    'mechanical': (0xcc8833, 0xeebb66),
    'nature':     (0x33aa44, 0x66dd77),
    'void':       (0x8822aa, 0xbb55dd),
    'military':   (0x556b2f, 0x8fbc8f),
    'aliens':     (0x88ff44, 0xaaff66),
    'cypherpunk': (0x00ffcc, 0x44ffdd),
    'infernal':   (0xff4422, 0xff8844),
    'celestial':  (0xffffaa, 0xffffff),
    'psionic':    (0xdd88ff, 0xee99ff),
    'harmonic':   (0xffcc44, 0xffee88),
}


def hex_to_rgb(c: int) -> tuple[int, int, int]:
    return ((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)


def darken(rgb, k: float):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb, k: float):
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


# ─── Per-faction base silhouettes ─────────────────────────────────────
# Each draws the pristine (frame 0) silhouette into a transparent
# 112×140 image with origin at (0,0). Bottom of silhouette at y≈135 so
# the engine can anchor bottom-center on the arena floor.

CX = W // 2  # 56
GROUND_Y = 135  # bottom anchor


def draw_arcane(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.55)
    h = lighten(primary, 0.4)
    # Arch foundation
    d.rectangle((20, 110, 92, 135), fill=s, outline=o)
    d.rectangle((24, 100, 88, 110), fill=p, outline=o)
    # Twin pillars
    d.rectangle((26, 60, 38, 110), fill=p, outline=o)
    d.rectangle((74, 60, 86, 110), fill=p, outline=o)
    # Arch top
    d.polygon([(38, 60), (56, 30), (74, 60)], fill=p, outline=o)
    # Crystal spire above arch
    d.polygon([(56, 18), (66, 50), (56, 60), (46, 50)], fill=h, outline=o)
    # Rune dot
    d.ellipse((52, 80, 60, 88), fill=h, outline=o)


def draw_mechanical(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.55)
    h = lighten(primary, 0.4)
    # Heavy iron block base
    d.rectangle((18, 90, 94, 135), fill=s, outline=o)
    # Mid block
    d.rectangle((22, 60, 90, 90), fill=p, outline=o)
    # Furnace mouth (glowing center)
    d.rectangle((44, 70, 68, 90), fill=darken(h, 0.75), outline=o)
    d.rectangle((48, 74, 64, 86), fill=h)
    # Smokestack chimneys
    d.rectangle((28, 30, 38, 60), fill=p, outline=o)
    d.rectangle((74, 30, 84, 60), fill=p, outline=o)
    # Smoke plumes (small)
    d.ellipse((26, 22, 40, 34), fill=darken(p, 0.3), outline=o)
    d.ellipse((72, 22, 86, 34), fill=darken(p, 0.3), outline=o)
    # Rivets along block edge
    for x in (28, 56, 84):
        d.ellipse((x - 2, 96, x + 2, 100), fill=h, outline=o)


def draw_nature(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.5)
    h = lighten(primary, 0.4)
    # Trunk
    d.rectangle((44, 70, 68, 135), fill=darken(p, 0.5), outline=o)
    # Roots
    d.polygon([(20, 130), (44, 110), (44, 135)], fill=darken(p, 0.6), outline=o)
    d.polygon([(92, 130), (68, 110), (68, 135)], fill=darken(p, 0.6), outline=o)
    # Leafy crown
    d.ellipse((22, 14, 90, 78), fill=p, outline=o)
    d.ellipse((34, 6, 78, 50), fill=lighten(p, 0.2), outline=o)
    # Leaf accent dots
    for cx, cy in [(34, 30), (78, 30), (56, 18), (40, 50), (72, 50)]:
        d.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=h, outline=o)


def draw_void(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.4)
    h = lighten(primary, 0.4)
    # Obsidian platform
    d.rectangle((24, 120, 88, 135), fill=darken(s, 0.7), outline=o)
    # Floating shard (large)
    d.polygon([(56, 16), (84, 60), (76, 110), (36, 110), (28, 60)],
              fill=p, outline=o)
    # Inner rift
    d.polygon([(56, 28), (72, 64), (66, 96), (46, 96), (40, 64)],
              fill=s, outline=o)
    # Glowing rift slash
    d.line((50, 50, 62, 90), fill=h, width=2)
    d.line((50, 50, 62, 90), fill=lighten(h, 0.5))


def draw_military(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.55)
    h = lighten(primary, 0.4)
    # Concrete bunker base
    d.rectangle((14, 80, 98, 135), fill=s, outline=o)
    # Sandbags piled in front
    for cx, cy in [(28, 120), (56, 122), (84, 120), (40, 110), (72, 110)]:
        d.ellipse((cx - 8, cy - 4, cx + 8, cy + 4), fill=p, outline=o)
    # Slit window
    d.rectangle((42, 94, 70, 102), fill=darken(s, 0.4), outline=o)
    # Antenna
    d.rectangle((54, 30, 58, 80), fill=p, outline=o)
    d.ellipse((50, 22, 62, 34), fill=p, outline=o)
    # Sandbag mid-row stripes (suggest texture)
    d.line((22, 116, 90, 116), fill=darken(p, 0.6))


def draw_aliens(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.5)
    h = lighten(primary, 0.4)
    # Hive base mound
    d.ellipse((12, 90, 100, 135), fill=s, outline=o)
    # Hive body
    d.ellipse((24, 40, 88, 105), fill=p, outline=o)
    # Pustule cluster
    for cx, cy in [(40, 64), (56, 56), (72, 64), (48, 82), (64, 82)]:
        d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=h, outline=o)
        d.point((cx, cy), fill=lighten(h, 0.6))
    # Top spike
    d.polygon([(56, 20), (62, 40), (50, 40)], fill=p, outline=o)


def draw_cypherpunk(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.55)
    h = lighten(primary, 0.4)
    # Server rack base
    d.rectangle((20, 90, 92, 135), fill=darken(s, 0.6), outline=o)
    # Server stack body
    d.rectangle((24, 30, 88, 90), fill=s, outline=o)
    # Neon strips (horizontal)
    for y in (40, 50, 60, 70, 80):
        d.line((28, y, 84, y), fill=h)
        d.line((28, y + 1, 84, y + 1), fill=p)
    # Monitor on top
    d.rectangle((36, 18, 76, 32), fill=p, outline=o)
    d.rectangle((40, 22, 72, 28), fill=h, outline=darken(o, 1))
    # Side antennae
    d.line((22, 30, 16, 16), fill=p, width=2)
    d.line((90, 30, 96, 16), fill=p, width=2)


def draw_infernal(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.5)
    h = lighten(primary, 0.4)
    # Obsidian altar base
    d.rectangle((22, 100, 90, 135), fill=darken(s, 0.6), outline=o)
    # Altar mid block
    d.rectangle((28, 70, 84, 100), fill=s, outline=o)
    # Pillar
    d.rectangle((46, 40, 66, 70), fill=p, outline=o)
    # Eternal flame
    d.polygon([(56, 14), (66, 38), (60, 36), (56, 30), (52, 36), (46, 38)],
              fill=p, outline=o)
    d.polygon([(56, 22), (62, 36), (50, 36)], fill=h, outline=o)
    # Glowing seam in altar
    d.line((30, 84, 82, 84), fill=h, width=2)


def draw_celestial(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.45)
    h = lighten(primary, 0.4)
    # Marble pillar base
    d.rectangle((30, 110, 82, 135), fill=s, outline=o)
    # Pillar shaft
    d.rectangle((42, 50, 70, 110), fill=p, outline=o)
    # Vertical ridges
    d.line((48, 54, 48, 106), fill=darken(p, 0.65))
    d.line((56, 54, 56, 106), fill=darken(p, 0.65))
    d.line((64, 54, 64, 106), fill=darken(p, 0.65))
    # Capital (top)
    d.rectangle((38, 40, 74, 50), fill=p, outline=o)
    # Halo above
    d.ellipse((34, 12, 78, 38), outline=h, width=3)
    d.ellipse((38, 16, 74, 34), outline=p, width=1)


def draw_psionic(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.5)
    h = lighten(primary, 0.4)
    # Cradle base
    d.rectangle((26, 110, 86, 135), fill=darken(s, 0.6), outline=o)
    d.polygon([(24, 110), (88, 110), (82, 100), (30, 100)], fill=s, outline=o)
    # Glass orb (large)
    d.ellipse((22, 30, 90, 100), fill=darken(p, 0.7), outline=o)
    d.ellipse((26, 34, 86, 96), fill=p)
    # Brain blob inside
    d.ellipse((36, 50, 76, 86), fill=lighten(s, 0.2), outline=o)
    d.line((48, 60, 64, 60), fill=h)
    d.line((44, 70, 68, 70), fill=h)
    d.line((48, 80, 64, 80), fill=h)
    # Tendrils
    d.line((32, 95, 24, 110), fill=p, width=2)
    d.line((80, 95, 88, 110), fill=p, width=2)


def draw_harmonic(d, primary, outline):
    p = primary
    o = outline
    s = darken(primary, 0.55)
    h = lighten(primary, 0.4)
    # Resonator base
    d.rectangle((22, 110, 90, 135), fill=darken(s, 0.6), outline=o)
    # Tuning fork shaft
    d.rectangle((48, 70, 64, 110), fill=p, outline=o)
    # Fork tines
    d.rectangle((30, 20, 42, 70), fill=p, outline=o)
    d.rectangle((70, 20, 82, 70), fill=p, outline=o)
    # Tine caps (crystal)
    d.polygon([(36, 12), (44, 22), (28, 22)], fill=h, outline=o)
    d.polygon([(76, 12), (84, 22), (68, 22)], fill=h, outline=o)
    # Resonance crystal at center
    d.polygon([(56, 50), (62, 60), (56, 70), (50, 60)], fill=h, outline=o)
    # Resonance lines (concentric, drawn with darker tone for damage to bite into)
    d.arc((30, 75, 82, 105), start=200, end=340, fill=darken(p, 0.55), width=2)


SILHOUETTES = {
    'arcane': draw_arcane,
    'mechanical': draw_mechanical,
    'nature': draw_nature,
    'void': draw_void,
    'military': draw_military,
    'aliens': draw_aliens,
    'cypherpunk': draw_cypherpunk,
    'infernal': draw_infernal,
    'celestial': draw_celestial,
    'psionic': draw_psionic,
    'harmonic': draw_harmonic,
}


def silhouette_pixels(img: Image.Image) -> list[tuple[int, int]]:
    """Return all opaque pixel coords in the silhouette. Damage
    overlays only chip / scorch / hole pixels that exist in the
    silhouette — no marks in empty space. """
    px = img.load()
    coords = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 0:
                coords.append((x, y))
    return coords


def apply_damage(img: Image.Image, level: int, faction: str, primary, outline) -> Image.Image:
    """Apply damage level (1..4) to a pristine silhouette.
    Levels:
      1: small chips, ~3% pixels
      2: + holes (small alpha cuts), scorch dots
      3: + larger holes, lean (skew slightly), more scorch
      4: collapse start — knock out top 30%, scatter pieces
    Higher levels accumulate the effects of lower levels."""
    out = img.copy()
    rng = random.Random(hash((faction, level)) & 0xffffffff)
    coords = silhouette_pixels(out)
    px = out.load()
    scorch_dark = darken(primary, 0.25) + (255,)
    scorch_mid = darken(primary, 0.4) + (255,)
    crack = outline + (255,)

    def chip(rate: float):
        for x, y in coords:
            if rng.random() < rate:
                px[x, y] = (0, 0, 0, 0)  # alpha cut

    def scorch(rate: float):
        for x, y in coords:
            if px[x, y][3] == 0:
                continue
            if rng.random() < rate:
                px[x, y] = scorch_dark if rng.random() < 0.5 else scorch_mid

    def cracks(count: int):
        d = ImageDraw.Draw(out)
        for _ in range(count):
            # Pick two silhouette coords near each other for a crack line.
            if not coords:
                return
            cx, cy = coords[rng.randrange(len(coords))]
            length = rng.randint(4, 10)
            angle = rng.uniform(0, 6.283)
            ex = int(cx + length * (1 if rng.random() < 0.5 else -1))
            ey = int(cy + length * (1 if rng.random() < 0.5 else -1))
            d.line((cx, cy, ex, ey), fill=crack)

    def knock_out_region(rect):
        # Carve a hole — set alpha 0 in the rect for any silhouette
        # pixels inside it.
        x0, y0, x1, y1 = rect
        for y in range(max(0, y0), min(H, y1)):
            for x in range(max(0, x0), min(W, x1)):
                if px[x, y][3] > 0:
                    px[x, y] = (0, 0, 0, 0)

    if level >= 1:
        chip(0.03)
        scorch(0.04)
    if level >= 2:
        chip(0.05)
        scorch(0.06)
        cracks(3)
        # 1 small hole near upper third
        cx_h = rng.randint(30, W - 30)
        cy_h = rng.randint(30, 70)
        knock_out_region((cx_h - 4, cy_h - 4, cx_h + 4, cy_h + 4))
    if level >= 3:
        chip(0.08)
        scorch(0.10)
        cracks(5)
        # Bigger hole + lean overlay (we won't actually skew the
        # image — instead crack the structure with a diagonal void)
        d = ImageDraw.Draw(out)
        d.line((rng.randint(20, 50), 30, rng.randint(60, 90), 100),
               fill=(0, 0, 0, 0), width=3)
        # Two more knocked-out regions
        for _ in range(2):
            cx_h = rng.randint(20, W - 20)
            cy_h = rng.randint(40, 100)
            knock_out_region((cx_h - 6, cy_h - 6, cx_h + 6, cy_h + 6))
    if level >= 4:
        chip(0.10)
        scorch(0.12)
        cracks(8)
        # Knock out the entire upper third — collapse start.
        knock_out_region((0, 0, W, int(H * 0.30)))
        # Large gap mid-section
        knock_out_region((rng.randint(20, 50), 50, rng.randint(60, 90), 90))
        # Scatter ember pixels around the base
        d = ImageDraw.Draw(out)
        for _ in range(20):
            ex = rng.randint(0, W - 1)
            ey = rng.randint(H - 30, H - 1)
            d.point((ex, ey), fill=(scorch_mid))

    return out


def render_sheet(faction: str) -> Image.Image:
    primary = hex_to_rgb(FACTIONS[faction][0])
    secondary = hex_to_rgb(FACTIONS[faction][1])
    outline = darken(primary, 0.35)
    sheet = Image.new('RGBA', (W, H * FRAMES), (0, 0, 0, 0))

    # Frame 0 — pristine silhouette
    pristine = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(pristine)
    SILHOUETTES[faction](d0, primary, outline)
    sheet.paste(pristine, (0, 0))

    # Frames 1-4 — damaged
    for lvl in range(1, FRAMES):
        damaged = apply_damage(pristine, lvl, faction, primary, outline)
        sheet.paste(damaged, (0, H * lvl))

    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating {len(FACTIONS)} HD base sheets → {OUT_DIR.relative_to(ROOT)}/')
    for faction in FACTIONS:
        sheet = render_sheet(faction)
        out_path = OUT_DIR / f'base_{faction}.png'
        sheet.save(out_path, 'PNG')
        size_kb = out_path.stat().st_size / 1024
        print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H * FRAMES}, {size_kb:.1f}K)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
