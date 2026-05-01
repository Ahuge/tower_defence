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


def luminosity_alpha(img: Image.Image, bias: float = 1.4) -> Image.Image:
    """Convert an RGB image to RGBA, deriving alpha from luminance.

    Dark pixels (background sky / void) become near-transparent so the
    foreground layer composites cleanly over the mid/far layers.
    `bias` boosts highlights — embers, sparks, crystals stay opaque
    even if their luminance isn't pure white. Tuned at 1.4 to keep
    the ember/crystal silhouettes readable without bringing back the
    grey haze that would defeat the whole point.
    """
    rgba = img.convert('RGBA')
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            # Rec.601 luminance — matches how the eye reads brightness.
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            a = max(0, min(255, int(lum * bias)))
            pixels[x, y] = (r, g, b, a)
    return rgba


def import_layer(faction: str, role: str, dst_name: str, mask_alpha: bool = False) -> bool:
    src = SRC / f'parallax_{faction}_{role}.png'
    if not src.exists():
        print(f'  ! missing {src.name}')
        return False
    dst = DST_BASE / faction / dst_name
    if mask_alpha:
        img = Image.open(src)
        if img.mode == 'RGB':
            print(f'    luminosity-mask: {src.name} (RGB → RGBA)')
            out = luminosity_alpha(img)
            out.save(dst, 'PNG')
        else:
            # Already has alpha — straight copy.
            shutil.copy2(src, dst)
    else:
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
        # Fore layer: if it ships as RGB it would block the mid/far
        # layers when stacked. Auto-mask dark → transparent so the
        # parallax layering reads correctly regardless of artist
        # delivery format.
        ok &= import_layer(faction, 'fore', f'{faction}_parallax_fore.png', mask_alpha=True)
        ok &= import_layer(faction, 'big_no_text', f'{faction}_keyart.png')
        if not ok:
            print(f'  ! {faction} skipped some files')

    print('\nNext: python3 scripts/convert_assets_to_webp.py  (refresh .webp variants)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
