#!/usr/bin/env python3
"""
convert_assets_to_webp.py — bulk-convert the heavy PNG assets under
`public/assets/{faction}/` to WebP for ~3x faster loading.

WebP at quality 82 hits ~30-40% of the equivalent PNG size with no
perceptible loss on the splash/emblem art (the textures are already
stylised, no fine line work). Browsers without WebP support fall back
to the PNG via the `<picture>` element in the components.

Run:
  python3 scripts/convert_assets_to_webp.py
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public' / 'assets'

# Files we convert. Splash + emblem are the big ones; parallax layers
# are also worth converting since FactionTreeScreen layers all 3.
PATTERNS = (
    '_splash.png',
    '_splash_mobile.png',
    '_emblem.png',
    '_parallax_far.png',
    '_parallax_mid.png',
    '_parallax_fore.png',
)

# WebP quality. 82 is the sweet spot for stylised art; 90 is barely
# better and 30% larger. Drop to 75 only if loadtime is still bad.
WEBP_QUALITY = 82


def convert(png_path: Path) -> tuple[int, int]:
    """Convert one PNG → sibling .webp. Returns (png_bytes, webp_bytes)."""
    webp_path = png_path.with_suffix('.webp')
    img = Image.open(png_path)
    # WebP supports both lossy and lossless. Lossy at q=82 wins for
    # photographic / painterly art; lossless wins for crisp UI icons.
    # The splash + emblem art is painterly → lossy.
    img.save(webp_path, 'WEBP', quality=WEBP_QUALITY, method=6)
    return png_path.stat().st_size, webp_path.stat().st_size


def main() -> int:
    if not ASSETS.is_dir():
        print(f'No assets dir at {ASSETS}', file=sys.stderr)
        return 1

    total_png = 0
    total_webp = 0
    files = []
    for faction_dir in sorted(ASSETS.iterdir()):
        if not faction_dir.is_dir():
            continue
        for png in sorted(faction_dir.glob('*.png')):
            if any(png.name.endswith(p) for p in PATTERNS):
                files.append(png)

    print(f'Converting {len(files)} files to WebP (q={WEBP_QUALITY})...')
    for png in files:
        try:
            png_b, webp_b = convert(png)
            total_png += png_b
            total_webp += webp_b
            ratio = webp_b / png_b * 100 if png_b else 0
            rel = png.relative_to(ROOT)
            print(f'  {rel}  {png_b/1024:6.1f}K → {webp_b/1024:6.1f}K  ({ratio:4.1f}%)')
        except Exception as e:
            print(f'  ! failed {png}: {e}', file=sys.stderr)

    if total_png:
        ratio = total_webp / total_png * 100
        print(f'\nTotal: {total_png/1024/1024:.1f}MB → {total_webp/1024/1024:.1f}MB  ({ratio:.1f}%)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
