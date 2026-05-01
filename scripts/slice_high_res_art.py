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
SRC = os.path.join(ROOT, 'resources', 'high_res_art')
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

# Emblem layout in elmblems.png. Detected by scanning for dark gutters
# in the top and bottom emblem rows. Top row: 6 emblems. Bottom row: 5.
EMBLEM_TOP_Y = (290, 490)  # tighter — drops label text below the circle
EMBLEM_TOP_X = [
    (41, 204),     # arcane
    (251, 416),    # mechanical
    (456, 620),    # nature
    (660, 821),    # void
    (860, 1018),   # military
    (1055, 1219),  # aliens
]

EMBLEM_BOT_Y = (700, 900)  # tighter — drops label text
EMBLEM_BOT_X = [
    (34, 227),     # cypherpunk
    (285, 477),    # infernal
    (527, 720),    # celestial
    (764, 954),    # psionic
    (1005, 1195),  # harmonic
]

EMBLEM_TOP_FACTIONS = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens']
EMBLEM_BOT_FACTIONS = ['cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic']


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


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    if dry:
        print('(dry run — no files written)')
    copy_splashes(dry)
    slice_emblems(dry)
