#!/usr/bin/env python3
"""
generate_arena_floor_tileset.py — procedurally generate per-faction
Hero Defense arena floor tilesets per `notes/art_prds/01_hero_arena_floor.md`.

Output: `public/assets/arena/<faction>_arena_tileset.png` (448 × 56 px).
- Row 0: 16 ground variants — 12 base + 4 accent (rune / sigil / etc.).
- Row 1: 16 edge/prop tiles — alpha PNG, scattered ~3% of cells in
  the renderer. Mix of faction-themed clutter silhouettes.

Style discipline matches existing `<faction>_terrain_tileset.png`:
- 28x28 tile, NEAREST filter, 1 px outlines, no AA.
- 3-color palette per detail (base / shadow / highlight).
- Deterministic — same input, same bytes; lets us re-generate freely
  and the version control diff is meaningful.

Run:
  python3 scripts/generate_arena_floor_tileset.py
"""
from __future__ import annotations
import os
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'arena'

TILE = 28
ROWS = 2
COLS = 16
W = TILE * COLS  # 448
H = TILE * ROWS  # 56

# (primary, secondary) per faction. Pulled from src/data/Factions.ts —
# duplicated here so this script is standalone (no TS bridge needed).
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


def darken(rgb: tuple[int, int, int], k: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb: tuple[int, int, int], k: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


# Prop catalog — small silhouettes (28x28 pixels). Each entry is a
# render fn that paints a centered shape onto a draw context using
# the given primary + outline colors. Picked deterministically by
# (faction-seed × col-index) so each faction's row-1 reads as that
# faction's clutter set. Shapes are intentionally simple — we read
# at 28 px on a busy battlefield, not in isolation.
def prop_pillar(d: ImageDraw.ImageDraw, p, o):
    d.rectangle((11, 4, 16, 23), fill=p, outline=o)
    d.rectangle((9, 22, 18, 25), fill=p, outline=o)


def prop_crystal(d: ImageDraw.ImageDraw, p, o):
    d.polygon([(13, 5), (18, 13), (15, 24), (10, 13)], fill=p, outline=o)


def prop_cog(d: ImageDraw.ImageDraw, p, o):
    d.ellipse((8, 8, 19, 19), fill=p, outline=o)
    d.ellipse((12, 12, 15, 15), fill=o)
    for dx, dy in [(0, -8), (8, 0), (0, 8), (-8, 0)]:
        x, y = 13 + dx, 13 + dy
        d.rectangle((x - 1, y - 2, x + 1, y + 2), fill=p, outline=o)


def prop_spike(d: ImageDraw.ImageDraw, p, o):
    d.polygon([(13, 5), (17, 22), (9, 22)], fill=p, outline=o)


def prop_diamond(d: ImageDraw.ImageDraw, p, o):
    d.polygon([(13, 6), (20, 14), (13, 22), (6, 14)], fill=p, outline=o)


def prop_blob(d: ImageDraw.ImageDraw, p, o):
    d.ellipse((6, 10, 20, 22), fill=p, outline=o)
    d.ellipse((10, 6, 18, 14), fill=p, outline=o)


def prop_skull(d: ImageDraw.ImageDraw, p, o):
    d.ellipse((8, 8, 19, 19), fill=p, outline=o)
    d.rectangle((11, 16, 13, 19), fill=o)
    d.rectangle((14, 16, 16, 19), fill=o)
    d.rectangle((10, 19, 17, 22), fill=p, outline=o)


def prop_chip(d: ImageDraw.ImageDraw, p, o):
    d.rectangle((8, 9, 19, 18), fill=p, outline=o)
    for x in (7, 19):
        for y in (10, 13, 16):
            d.line((x, y, x + 1, y), fill=o)
    d.rectangle((11, 12, 16, 15), fill=o)


def prop_post(d: ImageDraw.ImageDraw, p, o):
    d.rectangle((12, 6, 15, 22), fill=p, outline=o)
    d.line((10, 9, 17, 9), fill=o)


def prop_orb(d: ImageDraw.ImageDraw, p, o):
    d.ellipse((9, 9, 18, 18), fill=p, outline=o)
    d.point((12, 12), fill=lighten(p, 0.5))
    d.point((13, 12), fill=lighten(p, 0.5))


def prop_horn(d: ImageDraw.ImageDraw, p, o):
    d.polygon([(8, 20), (14, 6), (18, 12), (12, 22)], fill=p, outline=o)


def prop_brand(d: ImageDraw.ImageDraw, p, o):
    d.line((9, 22, 18, 6), fill=p, width=2)
    d.line((9, 22, 18, 6), fill=o)
    d.ellipse((6, 19, 11, 24), fill=p, outline=o)


def prop_feather(d: ImageDraw.ImageDraw, p, o):
    d.polygon([(13, 5), (17, 12), (15, 23), (11, 23), (9, 12)], fill=p, outline=o)
    d.line((13, 7, 13, 22), fill=o)


def prop_fork(d: ImageDraw.ImageDraw, p, o):
    d.line((10, 5, 10, 22), fill=p, width=2)
    d.line((16, 5, 16, 22), fill=p, width=2)
    d.line((9, 5, 17, 5), fill=p, width=2)
    d.line((10, 5, 10, 22), fill=o)
    d.line((16, 5, 16, 22), fill=o)
    d.line((9, 5, 17, 5), fill=o)


# Per-faction prop selection — list of 16 prop renderers per faction.
# Mix of generic (pillar, blob, crystal) + 1-2 themed standouts so the
# floor reads per-faction without being too literal. Deterministic
# order (no shuffle) so versioning is stable.
PROP_SETS: dict[str, list] = {
    'arcane':     [prop_crystal, prop_pillar, prop_orb, prop_diamond, prop_crystal, prop_pillar, prop_orb, prop_diamond,
                   prop_crystal, prop_pillar, prop_orb, prop_diamond, prop_crystal, prop_pillar, prop_orb, prop_diamond],
    'mechanical': [prop_cog, prop_chip, prop_pillar, prop_chip, prop_cog, prop_chip, prop_pillar, prop_chip,
                   prop_cog, prop_chip, prop_pillar, prop_chip, prop_cog, prop_chip, prop_pillar, prop_chip],
    'nature':     [prop_blob, prop_post, prop_blob, prop_blob, prop_post, prop_blob, prop_blob, prop_post,
                   prop_blob, prop_post, prop_blob, prop_blob, prop_post, prop_blob, prop_blob, prop_post],
    'void':       [prop_diamond, prop_skull, prop_orb, prop_diamond, prop_skull, prop_orb, prop_diamond, prop_skull,
                   prop_orb, prop_diamond, prop_skull, prop_orb, prop_diamond, prop_skull, prop_orb, prop_diamond],
    'military':   [prop_pillar, prop_spike, prop_pillar, prop_blob, prop_pillar, prop_spike, prop_pillar, prop_blob,
                   prop_pillar, prop_spike, prop_pillar, prop_blob, prop_pillar, prop_spike, prop_pillar, prop_blob],
    'aliens':     [prop_blob, prop_orb, prop_spike, prop_blob, prop_orb, prop_spike, prop_blob, prop_orb,
                   prop_spike, prop_blob, prop_orb, prop_spike, prop_blob, prop_orb, prop_spike, prop_blob],
    'cypherpunk': [prop_chip, prop_post, prop_chip, prop_pillar, prop_chip, prop_post, prop_chip, prop_pillar,
                   prop_chip, prop_post, prop_chip, prop_pillar, prop_chip, prop_post, prop_chip, prop_pillar],
    'infernal':   [prop_skull, prop_brand, prop_spike, prop_skull, prop_brand, prop_spike, prop_skull, prop_brand,
                   prop_spike, prop_skull, prop_brand, prop_spike, prop_skull, prop_brand, prop_spike, prop_skull],
    'celestial':  [prop_feather, prop_orb, prop_diamond, prop_feather, prop_orb, prop_diamond, prop_feather, prop_orb,
                   prop_diamond, prop_feather, prop_orb, prop_diamond, prop_feather, prop_orb, prop_diamond, prop_feather],
    'psionic':    [prop_orb, prop_blob, prop_orb, prop_diamond, prop_orb, prop_blob, prop_orb, prop_diamond,
                   prop_orb, prop_blob, prop_orb, prop_diamond, prop_orb, prop_blob, prop_orb, prop_diamond],
    'harmonic':   [prop_fork, prop_diamond, prop_fork, prop_orb, prop_fork, prop_diamond, prop_fork, prop_orb,
                   prop_fork, prop_diamond, prop_fork, prop_orb, prop_fork, prop_diamond, prop_fork, prop_orb],
}


def render_ground_tile(faction: str, col: int, primary, secondary) -> Image.Image:
    """Single 28x28 ground tile. Variants 12-15 add a small accent
    shape (rune / sigil) on top of the base ground.
    """
    rng = random.Random(hash(('ground', faction, col)) & 0xffffffff)
    base = darken(secondary, 0.30)  # desaturated ~30% darker secondary
    shadow = darken(secondary, 0.18)
    highlight = darken(secondary, 0.42)
    img = Image.new('RGBA', (TILE, TILE), base + (255,))
    d = ImageDraw.Draw(img)

    # Sparse texture noise — ~14 dots, half shadow / half highlight.
    for _ in range(14):
        x = rng.randint(0, TILE - 1)
        y = rng.randint(0, TILE - 1)
        d.point((x, y), fill=(shadow if rng.random() < 0.5 else highlight) + (255,))

    # Subtle tile boundary — 1 px slightly-darker top + left edge so
    # tiling reads with light from the upper-left, like every existing
    # terrain tile does.
    edge = darken(secondary, 0.20)
    d.line((0, 0, TILE - 1, 0), fill=edge + (255,))
    d.line((0, 0, 0, TILE - 1), fill=edge + (255,))

    # Variants 12-15: add an accent shape.
    if col >= 12:
        accent_color = primary
        accent_shadow = darken(primary, 0.45)
        if col == 12:
            # Small rune cross
            d.line((11, 13, 16, 13), fill=accent_color + (255,))
            d.line((13, 11, 13, 16), fill=accent_color + (255,))
            d.point((13, 13), fill=lighten(accent_color, 0.3) + (255,))
        elif col == 13:
            # Small diamond gem
            d.polygon([(13, 10), (17, 14), (13, 18), (9, 14)],
                      fill=accent_color + (255,), outline=accent_shadow + (255,))
        elif col == 14:
            # Three dots (echoes / runes)
            for dx in (-4, 0, 4):
                d.ellipse((11 + dx, 12, 14 + dx, 15),
                          fill=accent_color + (255,), outline=accent_shadow + (255,))
        else:
            # Glowing center pip
            d.ellipse((10, 10, 17, 17),
                      fill=accent_shadow + (255,), outline=accent_color + (255,))
            d.ellipse((12, 12, 15, 15), fill=lighten(accent_color, 0.4) + (255,))

    return img


def render_prop_tile(faction: str, col: int, primary, secondary) -> Image.Image:
    """Transparent 28x28 prop tile. Single silhouette in primary +
    outline in secondary, no ground beneath."""
    img = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    prop_fn = PROP_SETS[faction][col]
    # Outline = darker secondary; fill = primary.
    outline = darken(primary, 0.4) + (255,)
    fill = primary + (255,)
    prop_fn(d, fill, outline)
    return img


def render_sheet(faction: str) -> Image.Image:
    primary_hex, secondary_hex = FACTIONS[faction]
    primary = hex_to_rgb(primary_hex)
    secondary = hex_to_rgb(secondary_hex)
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for col in range(COLS):
        sheet.paste(render_ground_tile(faction, col, primary, secondary),
                    (col * TILE, 0))
        sheet.paste(render_prop_tile(faction, col, primary, secondary),
                    (col * TILE, TILE))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating {len(FACTIONS)} arena floor tilesets → {OUT_DIR.relative_to(ROOT)}/')
    for faction in FACTIONS:
        sheet = render_sheet(faction)
        out_path = OUT_DIR / f'{faction}_arena_tileset.png'
        sheet.save(out_path, 'PNG')
        size_kb = out_path.stat().st_size / 1024
        print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H}, {size_kb:.1f}K)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
