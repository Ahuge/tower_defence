#!/usr/bin/env python3
"""
slice_art_pass.py — Cuts the composite art-pass PNG at
`resources/composite_art_theme.png` into the individual faction
emblem / splash / parallax-layer files we expect under
`public/assets/{faction}/`.

The composite is a 1536x1024 reference grid laid out as:
  A1. Faction emblems (1 row × 11 cols)
  A2. Faction welcome-splash key art (1 row × 11 cols)
  A3. Faction homeworld parallax backgrounds (3 rows × 11 cols)
  A4. Faction unlock audio sting waveforms (1 row × 11 cols)

A4 is a visualization, NOT actual audio — those still need to ship as
real OGG/MP3 files separately. This script ignores A4.

Crop coordinates are tuned by visual inspection of the composite.
Re-tune if the composite layout changes; output is regenerable.

Usage:
  python3 scripts/slice_art_pass.py [--dry-run]
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'resources', 'composite_art_theme.png')
PUBLIC_ASSETS = os.path.join(ROOT, 'public', 'assets')

FACTIONS = [
    'arcane', 'mechanical', 'nature', 'void', 'military',
    'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
]

# ─── Crop regions, all in source pixel coordinates ───────────────
# Composite is 1536 wide, 1024 tall. Column boundaries detected by
# scanning the A1 emblem row for dark vertical gutters — the cells
# turned out to be unevenly spaced (cell 10 is wider than cell 0)
# so we use explicit per-cell ranges instead of uniform math.

IMG_W = 1536
IMG_H = 1024

# Per-faction column ranges (x0, x1) measured from the composite.
# Order matches FACTIONS list. Each row has its own boundary table
# because the designer didn't align A1 / A2 / A3 columns identically.
# Inner gutter of 4 px applied at crop time.

# A1 emblems — detected by scanning A1 row for dark gutters between
# the bright circular crests.
A1_FACTION_X = [
    (10, 146),     # arcane
    (146, 277),    # mechanical
    (277, 409),    # nature
    (409, 540),    # void
    (540, 672),    # military
    (672, 806),    # aliens
    (806, 937),    # cypherpunk
    (937, 1069),   # infernal
    (1069, 1208),  # celestial
    (1208, 1348),  # psionic
    (1348, 1508),  # harmonic
]

# A2 splash key art — detected by scanning the splash content band.
# Cells are wider on the left half, narrower on the right (designer
# call) — explicit table beats even-spacing math.
A2_FACTION_X = [
    (10, 167),     # arcane
    (167, 318),    # mechanical
    (318, 463),    # nature
    (463, 605),    # void
    (605, 754),    # military
    (754, 899),    # aliens
    (899, 1058),   # cypherpunk
    (1058, 1192),  # infernal
    (1192, 1299),  # celestial
    (1299, 1404),  # psionic
    (1404, 1528),  # harmonic
]

# A3 parallax — visually verified evenly-spaced across x=85..1528.
# The 85-px left gutter holds the "LAYER 1/2/3" labels.
def _a3_table():
    left, right, n = 85, 1528, 11
    return [
        (round(left + i * (right - left) / n),
         round(left + (i + 1) * (right - left) / n))
        for i in range(n)
    ]
A3_FACTION_X = _a3_table()

# A1 row — emblems are circles centered in their column.
A1_Y0, A1_Y1 = 40, 150

# A2 row — vertical splash rectangles. Header sits above y~245,
# splash subjects through y~488, label below at y~495.
A2_Y0, A2_Y1 = 248, 488

# A3 grid — three sub-rows of parallax layers. Faction-name header
# at y~575, then layers below it. The "LAYER 1/2/3" labels on the
# left gutter shift A3 cells slightly right of the A1/A2 column edges.
A3_LAYER_Y = [
    (588, 670),   # Layer 1 (Far)
    (676, 760),   # Layer 2 (Mid)
    (765, 850),   # Layer 3 (Fore)
]
def col_xs(idx: int, table, gutter: int = 4) -> tuple[int, int]:
    x0, x1 = table[idx]
    return x0 + gutter, x1 - gutter


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_crop(img: Image.Image, box: tuple[int, int, int, int], out_path: str, dry: bool) -> None:
    if dry:
        print(f'  [dry] would save {out_path} from {box}')
        return
    crop = img.crop(box)
    crop.save(out_path, 'PNG', optimize=True)
    w, h = crop.size
    size_kb = os.path.getsize(out_path) / 1024
    print(f'  ✓ {os.path.relpath(out_path, ROOT)}  ({w}×{h}, {size_kb:.0f} KB)')


def slice(dry: bool) -> None:
    if not os.path.exists(SOURCE):
        print(f'ERROR: source composite not found at {SOURCE}', file=sys.stderr)
        sys.exit(1)

    img = Image.open(SOURCE).convert('RGBA')
    if img.size != (IMG_W, IMG_H):
        print(f'WARN: expected {IMG_W}x{IMG_H}, got {img.size[0]}x{img.size[1]} — '
              f'crops may be off. Re-tune coordinates if so.')

    print(f'Source: {SOURCE}  ({img.size[0]}×{img.size[1]})')
    if dry:
        print('(dry run — no files written)')

    for i, faction in enumerate(FACTIONS):
        out_dir = os.path.join(PUBLIC_ASSETS, faction)
        ensure_dir(out_dir)
        print(f'\n[{faction}]')

        # A1 — emblem (uses A1_FACTION_X table)
        x0, x1 = col_xs(i, A1_FACTION_X)
        save_crop(img, (x0, A1_Y0, x1, A1_Y1),
                  os.path.join(out_dir, f'{faction}_emblem.png'), dry)

        # A2 — welcome splash (uses A2_FACTION_X table — designer
        # offset slightly different from A1)
        x0, x1 = col_xs(i, A2_FACTION_X)
        save_crop(img, (x0, A2_Y0, x1, A2_Y1),
                  os.path.join(out_dir, f'{faction}_splash.png'), dry)

        # A3 — three parallax layers. Uses A3_FACTION_X (even-spaced
        # x=85..1528) because the layer-label gutter shifts the cells
        # right of A1/A2.
        for layer_idx, (y0, y1) in enumerate(A3_LAYER_Y):
            layer_name = ['far', 'mid', 'fore'][layer_idx]
            xa, xb = col_xs(i, A3_FACTION_X)
            save_crop(img, (xa, y0, xb, y1),
                      os.path.join(out_dir, f'{faction}_parallax_{layer_name}.png'), dry)


if __name__ == '__main__':
    slice(dry='--dry-run' in sys.argv)
