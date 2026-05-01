#!/usr/bin/env python3
"""
slice_high_res_art.py — Process the high-resolution art delivery in
`resources/high_res_art/`:

  - 11 individual splash PNGs (`splash_{faction}.png`) → copy directly
    to `public/assets/{faction}/{faction}_splash.png`. The source file
    `splash_mech.png` maps to faction id `mechanical`.

  - One emblem reference sheet (`elmblems.png`, 1254×1254) → slice
    each of the 11 emblems into its own file at
    `public/assets/{faction}/{faction}_emblem.png`. Layout: 6 emblems
    on the top row (arcane / mechanical / nature / void / military /
    aliens), 5 on the bottom row (cypherpunk / infernal / celestial /
    psionic / harmonic). Column boundaries detected by scanning each
    row for dark vertical gutters.

This supersedes the earlier `slice_art_pass.py` cuts on the composite
preview — the bespoke files in `high_res_art/` are higher resolution
and ship as separate assets, no slicing artifacts.
"""
import os
import shutil
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# v2 has 4× higher-res splash + emblem files plus a new image_c.png
# (6144×4096 parallax reference sheet). Fall back to v1 folder if v2
# isn't present so the script still works on older deliveries.
SRC_V2 = os.path.join(ROOT, 'resources', 'high_res_art_v2')
SRC_V1 = os.path.join(ROOT, 'resources', 'high_res_art')
SRC = SRC_V2 if os.path.isdir(SRC_V2) else SRC_V1
PARALLAX_SHEET = os.path.join(SRC_V2, 'image_c.png')
OUT = os.path.join(ROOT, 'public', 'assets')

# Map source filename token → canonical faction id used in code.
SPLASH_NAME_MAP = {
    'arcane': 'arcane',
    'mech': 'mechanical',
    'nature': 'nature',
    'void': 'void',
    'military': 'military',
    'aliens': 'aliens',
    'cypherpunk': 'cypherpunk',
    'infernal': 'infernal',
    'celestial': 'celestial',
    'psionic': 'psionic',
    'harmonic': 'harmonic',
}

# Emblem layout — v2 sheet is 5016×5016 (4× v1's 1254×1254). Boundaries
# auto-detected once and stored as constants. Top row: 6 emblems. Bottom
# row: 5.
EMBLEM_TOP_Y = (1160, 1880)  # emblem circle band (drops label text below)
EMBLEM_TOP_X = [
    (109, 862),    # arcane
    (954, 1708),   # mechanical
    (1786, 2532),  # nature
    (2596, 3332),  # void
    (3398, 4113),  # military
    (4180, 4919),  # aliens
]

EMBLEM_BOT_Y = (2800, 3560)  # bottom-row emblem band
EMBLEM_BOT_X = [
    (134, 909),    # cypherpunk
    (1140, 1910),  # infernal
    (2106, 2882),  # celestial
    (3058, 3816),  # psionic
    (4018, 4784),  # harmonic
]

EMBLEM_TOP_FACTIONS = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens']
EMBLEM_BOT_FACTIONS = ['cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic']

# ─── Parallax sheet (v2 image_c.png, 6144×4096) ───────────────────
# 11 factions × 4 sub-cells (composite + 3 layers). 6 factions on top
# row (y=0..2080), 5 on bottom (y=2160..4096). Within each row's
# faction column, the 3 layer images are at fixed y-bands; we crop
# Layer 1 (Far), Layer 2 (Mid), Layer 3 (Fore).

PARALLAX_TOP_FACTIONS = EMBLEM_TOP_FACTIONS
PARALLAX_BOT_FACTIONS = EMBLEM_BOT_FACTIONS

# Top-row faction columns. Even-spaced in 6 columns.
PARALLAX_TOP_X = [
    (i * (6144 // 6), (i + 1) * (6144 // 6)) for i in range(6)
]
# Bottom-row faction columns. Even-spaced in 5 columns.
PARALLAX_BOT_X = [
    (i * (6144 // 5), (i + 1) * (6144 // 5)) for i in range(5)
]

# Y-bands per layer per row. Measured by overlaying grid markers on
# Arcane (top row) and Cypherpunk (bottom row) cells. Bottom-row
# cells are slightly shorter than top-row cells, so the y-bands
# differ — kept as separate tables instead of computed shifts.
PARALLAX_TOP_LAYER_Y = {
    'far':  (1370, 1545),  # Layer 1 - FAR BACKGROUND
    'mid':  (1625, 1830),  # Layer 2 - MID SCENE
    'fore': (1965, 2115),  # Layer 3 - FORE PARTICLES (between LAYER-2 + LAYER-3 labels)
}
PARALLAX_BOT_LAYER_Y = {
    'far':  (3425, 3545),
    'mid':  (3725, 3825),  # past LAYER 2 label
    'fore': (3970, 4045),  # past LAYER 3 label
}


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def copy_splashes(dry: bool) -> None:
    print('— Splashes —')
    for token, faction in SPLASH_NAME_MAP.items():
        src = os.path.join(SRC, f'splash_{token}.png')
        if not os.path.exists(src):
            print(f'  WARN: missing {src}', file=sys.stderr)
            continue
        out_dir = os.path.join(OUT, faction)
        ensure_dir(out_dir)
        out = os.path.join(out_dir, f'{faction}_splash.png')
        if dry:
            print(f'  [dry] would copy {src} → {out}')
            continue
        shutil.copyfile(src, out)
        size_kb = os.path.getsize(out) / 1024
        print(f'  ✓ {os.path.relpath(out, ROOT)}  ({size_kb:.0f} KB)')


def slice_emblems(dry: bool) -> None:
    print('— Emblems —')
    src = os.path.join(SRC, 'elmblems.png')
    if not os.path.exists(src):
        print(f'  ERR: {src} not found', file=sys.stderr)
        return
    img = Image.open(src).convert('RGBA')

    def slice_row(y0: int, y1: int, xs: list[tuple[int, int]], factions: list[str]) -> None:
        for (x0, x1), faction in zip(xs, factions):
            out_dir = os.path.join(OUT, faction)
            ensure_dir(out_dir)
            out = os.path.join(out_dir, f'{faction}_emblem.png')
            box = (x0 + 4, y0, x1 - 4, y1)  # 4-px inner gutter trim
            if dry:
                print(f'  [dry] would crop {faction} from {box}')
                continue
            crop = img.crop(box)
            crop.save(out, 'PNG', optimize=True)
            w, h = crop.size
            size_kb = os.path.getsize(out) / 1024
            print(f'  ✓ {os.path.relpath(out, ROOT)}  ({w}×{h}, {size_kb:.0f} KB)')

    slice_row(*EMBLEM_TOP_Y, EMBLEM_TOP_X, EMBLEM_TOP_FACTIONS)
    slice_row(*EMBLEM_BOT_Y, EMBLEM_BOT_X, EMBLEM_BOT_FACTIONS)


def slice_parallax(dry: bool) -> None:
    """Slice the v2 image_c.png parallax sheet into per-faction-per-layer
    PNGs. Top row has 6 factions, bottom row has 5; each cell contains
    a composite preview + 3 layer images (far / mid / fore)."""
    print('— Parallax —')
    if not os.path.exists(PARALLAX_SHEET):
        print(f'  WARN: {PARALLAX_SHEET} not found — skipping parallax slice')
        return
    img = Image.open(PARALLAX_SHEET).convert('RGBA')
    print(f'  source: {PARALLAX_SHEET}  ({img.size[0]}×{img.size[1]})')

    def slice_row(factions: list[str], xs: list[tuple[int, int]],
                  layer_ys: dict[str, tuple[int, int]]) -> None:
        for (x0, x1), faction in zip(xs, factions):
            out_dir = os.path.join(OUT, faction)
            ensure_dir(out_dir)
            for layer, (y0, y1) in layer_ys.items():
                # Inset 4px on the left/right to drop any column-divider
                # outline that crept in. Layers run edge-to-edge vertically.
                box = (x0 + 8, y0, x1 - 8, y1)
                out = os.path.join(out_dir, f'{faction}_parallax_{layer}.png')
                if dry:
                    print(f'  [dry] would crop {faction} parallax_{layer} from {box}')
                    continue
                crop = img.crop(box)
                crop.save(out, 'PNG', optimize=True)
                w, h = crop.size
                size_kb = os.path.getsize(out) / 1024
                print(f'  ✓ {os.path.relpath(out, ROOT)}  ({w}×{h}, {size_kb:.0f} KB)')

    slice_row(PARALLAX_TOP_FACTIONS, PARALLAX_TOP_X, PARALLAX_TOP_LAYER_Y)
    slice_row(PARALLAX_BOT_FACTIONS, PARALLAX_BOT_X, PARALLAX_BOT_LAYER_Y)


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    if dry:
        print('(dry run — no files written)')
    copy_splashes(dry)
    slice_emblems(dry)
    slice_parallax(dry)
