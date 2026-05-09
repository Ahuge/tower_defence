#!/usr/bin/env python3
"""
import_parallax_v2.py — copy the high-res parallax delivery from
`resources/high_res_art_v2/parallax/parallax_<faction>_<role>.png` to
`public/assets/<faction>/<faction>_parallax_<role>.png`, replacing
the lower-res v1 layers.

Per-faction the artist ships 6 files. We import 4:
  - _far    → {faction}_parallax_far.png    (background, RGB ok)
  - _mid    → {faction}_parallax_mid.png    (mid, RGBA — composites)
  - _fore   → {faction}_parallax_fore.png   (foreground; if RGB,
                                             auto-mask dark to alpha
                                             so it doesn't block the
                                             layers below)
  - _big_no_text → {faction}_keyart.png     (square-ish hero art for
                                             campaign-lobby + tree
                                             detail panel)

Skipped (kept as source material under resources/):
  - _big (with title text overlay) — locked layout, can't reuse
  - _composite — pre-flattened single image, useful as a
                  later fallback but no current consumer

After running, re-run scripts/convert_assets_to_webp.py to refresh
the .webp variants.
"""
from __future__ import annotations
import shutil
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'resources' / 'high_res_art_v2' / 'parallax'
DST_BASE = ROOT / 'public' / 'assets'

# Factions delivered in this drop. Add to this list as new factions
# arrive in resources/high_res_art_v2/parallax/.
FACTIONS = ['arcane', 'mechanical', 'nature', 'void']


def import_layer(faction: str, role: str, dst_name: str) -> bool:
    """Copy a parallax layer source → engine path. We used to luminosity-
    mask RGB fore layers to drop dark sky to alpha, but it over-thinned
    them — the artist's intent for an RGB fore is "render the dark
    pixels as opaque dim foreground" (a soft vignette / atmosphere).
    The CSS in FactionTreeScreen already stacks the layer at opacity
    0.25 over the mid+far, so dark RGB reads as a gentle darkening
    rather than a hard block. If a faction needs true transparent fore
    detail (floating crystals on clear sky, etc.), the artist ships
    the layer as RGBA and that alpha is preserved. Either way, this
    function just copies the bytes straight through. """
    src = SRC / f'parallax_{faction}_{role}.png'
    if not src.exists():
        print(f'  ! missing {src.name}')
        return False
    dst = DST_BASE / faction / dst_name
    shutil.copy2(src, dst)
    size_kb = dst.stat().st_size / 1024
    print(f'  {src.name:42} → {dst.relative_to(ROOT)}  ({size_kb:.0f}K)')
    return True


def main() -> int:
    if not SRC.is_dir():
        print(f'No source dir at {SRC}', file=sys.stderr)
        return 1

    for faction in FACTIONS:
        print(f'\n{faction}:')
        ok = True
        ok &= import_layer(faction, 'far',  f'{faction}_parallax_far.png')
        ok &= import_layer(faction, 'mid',  f'{faction}_parallax_mid.png')
        ok &= import_layer(faction, 'fore', f'{faction}_parallax_fore.png')
        ok &= import_layer(faction, 'big_no_text', f'{faction}_keyart.png')
        if not ok:
            print(f'  ! {faction} skipped some files')

    print('\nNext: python3 scripts/convert_assets_to_webp.py  (refresh .webp variants)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
