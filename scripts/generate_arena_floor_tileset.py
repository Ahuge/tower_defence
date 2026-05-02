#!/usr/bin/env python3
"""
generate_arena_floor_tileset.py — per-faction Hero Defense arena floor
tilesets per `notes/art_prds/01_hero_arena_floor.md`.

v2 polish — multi-tone shaded ground (4 shades + dither pattern),
detailed prop silhouettes (3-tone shading + outline + specular),
proper tile boundary shadowing.

Output: `public/assets/arena/<faction>_arena_tileset.png` (448 × 56 px).
- Row 0: 16 ground variants — 12 base + 4 accent (rune / sigil / etc).
- Row 1: 16 alpha-PNG prop tiles, scattered ~4% in the renderer.

Run:
  python3 scripts/generate_arena_floor_tileset.py
"""
from __future__ import annotations
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'arena'

TILE = 28
ROWS = 2
COLS = 16
W = TILE * COLS  # 448
H = TILE * ROWS  # 56

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


def hex_to_rgb(c: int):
    return ((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)


def darken(rgb, k):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb, k):
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


def rgba(rgb, a=255):
    return (rgb[0], rgb[1], rgb[2], a)


def make_ground_palette(secondary):
    """Ground palette — desaturated cool tones derived from secondary."""
    base = darken(secondary, 0.32)
    return {
        'deep':   darken(secondary, 0.20),
        'mid':    base,
        'light':  darken(secondary, 0.42),
        'highlight': darken(secondary, 0.55),
        'edge':   darken(secondary, 0.18),
    }


def make_prop_palette(primary):
    return {
        'shadow':    darken(primary, 0.55),
        'mid':       darken(primary, 0.85),
        'highlight': primary,
        'specular':  lighten(primary, 0.45),
        'outline':   darken(primary, 0.30),
    }


# ─── Prop catalog — detailed shaded silhouettes per faction ───────────
# Every prop now uses 3-tone shading (shadow + mid + highlight) + 1px
# outline + specular catch-light. Reads at 28×28 with proper volume.

def prop_pillar(d, p):
    # Stone column with cap + base
    o = rgba(p['outline'])
    d.rectangle((11, 22, 17, 24), fill=rgba(p['shadow']), outline=o)  # base
    d.rectangle((11, 6, 17, 8), fill=rgba(p['shadow']), outline=o)    # cap
    d.rectangle((12, 8, 16, 22), fill=rgba(p['mid']))                  # shaft body
    d.line((12, 8, 12, 22), fill=rgba(p['highlight']))                 # left highlight
    d.point((12, 8), fill=rgba(p['specular']))                          # corner glint
    d.line((14, 11, 14, 19), fill=rgba(p['shadow']))                   # center groove


def prop_crystal(d, p):
    # Faceted crystal with internal facet line
    d.polygon([(14, 4), (19, 12), (16, 23), (12, 23), (9, 12)],
              fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 4), (9, 12), (12, 23), (14, 12)], fill=rgba(p['highlight']))  # left facet
    d.line((14, 4, 14, 23), fill=rgba(p['outline']))  # central facet line
    d.point((11, 8), fill=rgba(p['specular']))         # specular


def prop_cog(d, p):
    o = rgba(p['outline'])
    # 8-tooth gear
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x1 = int(14 + math.cos(rad) * 7)
        y1 = int(13 + math.sin(rad) * 7)
        x2 = int(14 + math.cos(rad) * 11)
        y2 = int(13 + math.sin(rad) * 11)
        d.rectangle((min(x1, x2) - 1, min(y1, y2) - 1, max(x1, x2) + 1, max(y1, y2) + 1),
                    fill=rgba(p['mid']))
    # Body ring
    d.ellipse((6, 5, 22, 21), fill=rgba(p['mid']), outline=o)
    d.ellipse((7, 6, 21, 20), fill=rgba(p['highlight']))
    d.ellipse((9, 8, 19, 18), fill=rgba(p['mid']), outline=o)
    # Hub
    d.ellipse((11, 10, 17, 16), fill=rgba(p['shadow']), outline=o)
    d.point((13, 12), fill=rgba(p['specular']))


def prop_spike(d, p):
    # Sharp triangular spike with shaded sides
    d.polygon([(14, 4), (18, 23), (10, 23)], fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 4), (10, 23), (14, 23)], fill=rgba(p['highlight']))  # left half lit
    d.line((14, 4, 14, 22), fill=rgba(p['outline']))                      # center ridge
    d.point((11, 9), fill=rgba(p['specular']))


def prop_diamond(d, p):
    # Faceted diamond gem
    d.polygon([(14, 5), (22, 14), (14, 23), (6, 14)],
              fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 5), (6, 14), (14, 14)], fill=rgba(p['highlight']))   # top-left facet
    d.polygon([(14, 5), (14, 14), (22, 14)], fill=rgba(p['shadow']))      # top-right facet
    d.line((6, 14, 22, 14), fill=rgba(p['outline']))                      # belt
    d.point((10, 10), fill=rgba(p['specular']))                            # specular


def prop_blob(d, p):
    # Organic mossy blob (rounded with bumps)
    o = rgba(p['outline'])
    d.ellipse((4, 12, 24, 24), fill=rgba(p['mid']), outline=o)
    d.ellipse((8, 6, 20, 16), fill=rgba(p['mid']), outline=o)
    d.ellipse((12, 10, 18, 16), fill=rgba(p['highlight']))
    d.ellipse((6, 14, 14, 22), fill=rgba(p['highlight']))
    # Specular dots (catch-light on top)
    d.point((11, 9), fill=rgba(p['specular']))
    d.point((9, 16), fill=rgba(p['specular']))


def prop_skull(d, p):
    o = rgba(p['outline'])
    # Cranium
    d.ellipse((7, 5, 21, 19), fill=rgba(p['mid']), outline=o)
    d.ellipse((8, 6, 20, 16), fill=rgba(p['highlight']))
    # Eye sockets (dark)
    d.rectangle((10, 11, 12, 14), fill=rgba(p['shadow']), outline=o)
    d.rectangle((16, 11, 18, 14), fill=rgba(p['shadow']), outline=o)
    # Specular catch-lights inside eye sockets (creepy)
    d.point((11, 12), fill=rgba(p['specular']))
    d.point((17, 12), fill=rgba(p['specular']))
    # Jaw
    d.rectangle((9, 18, 19, 22), fill=rgba(p['mid']), outline=o)
    d.line((11, 19, 11, 21), fill=rgba(p['outline']))
    d.line((13, 19, 13, 21), fill=rgba(p['outline']))
    d.line((15, 19, 15, 21), fill=rgba(p['outline']))
    d.line((17, 19, 17, 21), fill=rgba(p['outline']))


def prop_chip(d, p):
    o = rgba(p['outline'])
    # Circuit chip body
    d.rectangle((6, 8, 22, 20), fill=rgba(p['shadow']), outline=o)
    d.rectangle((7, 9, 21, 19), fill=rgba(p['mid']))
    # Corner pin spec
    d.point((8, 10), fill=rgba(p['specular']))
    # Center pad
    d.rectangle((11, 12, 17, 16), fill=rgba(p['highlight']), outline=o)
    # Pins on left/right
    for py in (10, 12, 14, 16, 18):
        d.line((4, py, 6, py), fill=rgba(p['mid']))
        d.line((4, py, 6, py), fill=rgba(p['outline']))
        d.line((22, py, 24, py), fill=rgba(p['mid']))
        d.line((22, py, 24, py), fill=rgba(p['outline']))


def prop_post(d, p):
    o = rgba(p['outline'])
    # Wooden post with crossbar
    d.rectangle((12, 4, 16, 23), fill=rgba(p['mid']), outline=o)
    d.line((12, 4, 12, 23), fill=rgba(p['highlight']))
    d.line((14, 4, 14, 23), fill=rgba(p['shadow']))
    # Crossbar
    d.rectangle((9, 9, 19, 11), fill=rgba(p['mid']), outline=o)
    d.line((9, 9, 19, 9), fill=rgba(p['highlight']))
    # Wood grain
    d.line((13, 14, 15, 14), fill=rgba(p['outline']))
    d.line((13, 18, 15, 18), fill=rgba(p['outline']))


def prop_orb(d, p):
    o = rgba(p['outline'])
    # Glowing sphere with proper sphere shading
    d.ellipse((7, 7, 21, 21), fill=rgba(p['shadow']), outline=o)
    d.ellipse((8, 8, 20, 20), fill=rgba(p['mid']))
    d.ellipse((9, 9, 17, 17), fill=rgba(p['highlight']))
    d.ellipse((10, 10, 14, 14), fill=rgba(p['specular']))
    # Glow halo
    d.ellipse((5, 5, 23, 23), outline=rgba(p['mid']))


def prop_horn(d, p):
    # Curved horn shape
    o = rgba(p['outline'])
    d.polygon([(8, 23), (16, 5), (20, 12), (12, 23)],
              fill=rgba(p['mid']), outline=o)
    d.polygon([(8, 23), (16, 5), (15, 15)], fill=rgba(p['highlight']))
    d.point((13, 9), fill=rgba(p['specular']))


def prop_brand(d, p):
    o = rgba(p['outline'])
    # Branding iron / hot torch
    d.line((9, 23, 19, 5), fill=rgba(p['shadow']), width=3)
    d.line((10, 22, 18, 6), fill=rgba(p['mid']))
    d.line((11, 21, 17, 7), fill=rgba(p['highlight']))
    # Hot tip glow
    d.ellipse((6, 20, 12, 26), fill=rgba(p['shadow']), outline=o)
    d.ellipse((7, 21, 11, 25), fill=rgba(p['highlight']))
    d.ellipse((8, 22, 10, 24), fill=rgba(p['specular']))


def prop_feather(d, p):
    o = rgba(p['outline'])
    # Stylized feather
    d.polygon([(14, 4), (18, 12), (16, 23), (12, 23), (10, 12)],
              fill=rgba(p['mid']), outline=o)
    d.polygon([(14, 4), (10, 12), (12, 23), (14, 12)], fill=rgba(p['highlight']))
    # Quill spine
    d.line((14, 5, 14, 22), fill=rgba(p['outline']))
    # Feather barbs
    for fy in (8, 11, 14, 17, 20):
        d.line((11, fy, 14, fy), fill=rgba(p['shadow']))
        d.line((14, fy, 17, fy), fill=rgba(p['mid']))
    d.point((13, 7), fill=rgba(p['specular']))


def prop_fork(d, p):
    o = rgba(p['outline'])
    # Tuning fork
    d.line((10, 4, 10, 22), fill=rgba(p['mid']), width=2)
    d.line((10, 4, 10, 22), fill=rgba(p['outline']))
    d.line((11, 4, 11, 22), fill=rgba(p['highlight']))
    d.line((18, 4, 18, 22), fill=rgba(p['mid']), width=2)
    d.line((18, 4, 18, 22), fill=rgba(p['outline']))
    d.line((19, 4, 19, 22), fill=rgba(p['highlight']))
    # Bottom yoke
    d.line((9, 22, 19, 22), fill=rgba(p['mid']), width=2)
    d.line((9, 22, 19, 22), fill=rgba(p['outline']))
    # Top tine caps
    d.point((10, 4), fill=rgba(p['specular']))
    d.point((18, 4), fill=rgba(p['specular']))


PROP_SETS: dict[str, list] = {
    'arcane':     [prop_crystal, prop_pillar, prop_orb, prop_diamond] * 4,
    'mechanical': [prop_cog, prop_chip, prop_pillar, prop_chip] * 4,
    'nature':     [prop_blob, prop_post, prop_blob, prop_blob] * 4,
    'void':       [prop_diamond, prop_skull, prop_orb, prop_diamond] * 4,
    'military':   [prop_pillar, prop_spike, prop_pillar, prop_blob] * 4,
    'aliens':     [prop_blob, prop_orb, prop_spike, prop_blob] * 4,
    'cypherpunk': [prop_chip, prop_post, prop_chip, prop_pillar] * 4,
    'infernal':   [prop_skull, prop_brand, prop_spike, prop_skull] * 4,
    'celestial':  [prop_feather, prop_orb, prop_diamond, prop_feather] * 4,
    'psionic':    [prop_orb, prop_blob, prop_orb, prop_diamond] * 4,
    'harmonic':   [prop_fork, prop_diamond, prop_fork, prop_orb] * 4,
}


def render_ground_tile(faction: str, col: int, ground_pal, primary) -> Image.Image:
    """Single 28×28 ground tile.
    Variants 0-11: shaded base ground with dithered texture.
    Variants 12-15: accent (rune / sigil / etc) on top of base."""
    rng = random.Random(hash(('ground', faction, col)) & 0xffffffff)
    img = Image.new('RGBA', (TILE, TILE), rgba(ground_pal['mid']))
    d = ImageDraw.Draw(img)

    # Base shaded fill — 4-tone dither pattern. Each cell gets a
    # deterministic color choice from {deep, mid, light, highlight}.
    for y in range(TILE):
        for x in range(TILE):
            r = rng.random()
            if r < 0.10:
                px_color = ground_pal['light']
            elif r < 0.18:
                px_color = ground_pal['deep']
            elif r < 0.22:
                px_color = ground_pal['highlight']
            else:
                continue  # leave the mid base color
            img.putpixel((x, y), rgba(px_color))

    # Subtle 1px tile edge — top + left darker so light reads from
    # upper-left, like every existing terrain tile.
    edge = rgba(ground_pal['edge'])
    d.line((0, 0, TILE - 1, 0), fill=edge)
    d.line((0, 0, 0, TILE - 1), fill=edge)
    # Bottom + right slight light line for tile separation
    d.line((TILE - 1, 0, TILE - 1, TILE - 1), fill=rgba(darken(ground_pal['deep'], 0.85)))
    d.line((0, TILE - 1, TILE - 1, TILE - 1), fill=rgba(darken(ground_pal['deep'], 0.85)))

    # Accent variants 12-15: add a centered shaped detail using primary color.
    if col >= 12:
        accent_dark = rgba(darken(primary, 0.5))
        accent_mid = rgba(darken(primary, 0.85))
        accent_bright = rgba(primary)
        accent_spec = rgba(lighten(primary, 0.5))
        if col == 12:
            # Cross rune (chunky, with shading)
            d.rectangle((11, 13, 16, 14), fill=accent_mid)
            d.rectangle((13, 11, 14, 16), fill=accent_mid)
            d.point((11, 13), fill=accent_dark)
            d.point((13, 11), fill=accent_dark)
            d.point((13, 13), fill=accent_spec)
        elif col == 13:
            # Diamond gem (multi-faceted)
            d.polygon([(13, 9), (18, 14), (13, 19), (8, 14)], fill=accent_mid, outline=accent_dark)
            d.polygon([(13, 9), (8, 14), (13, 14)], fill=accent_bright)
            d.point((10, 12), fill=accent_spec)
        elif col == 14:
            # Triple-dot rune line (shaded dots)
            for cx in (8, 13, 18):
                d.ellipse((cx - 2, 12, cx + 2, 16), fill=accent_dark)
                d.ellipse((cx - 1, 13, cx + 1, 15), fill=accent_bright)
                d.point((cx, 13), fill=accent_spec)
        else:  # col == 15
            # Glowing pip with halo
            d.ellipse((9, 9, 18, 18), fill=accent_dark)
            d.ellipse((10, 10, 17, 17), fill=accent_mid)
            d.ellipse((11, 11, 16, 16), fill=accent_bright)
            d.ellipse((12, 12, 15, 15), fill=accent_spec)

    return img


def render_prop_tile(faction: str, col: int, prop_pal) -> Image.Image:
    img = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fn = PROP_SETS[faction][col]
    fn(d, prop_pal)
    return img


def render_sheet(faction: str) -> Image.Image:
    primary = hex_to_rgb(FACTIONS[faction][0])
    secondary = hex_to_rgb(FACTIONS[faction][1])
    ground_pal = make_ground_palette(secondary)
    prop_pal = make_prop_palette(primary)
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for col in range(COLS):
        sheet.paste(render_ground_tile(faction, col, ground_pal, primary), (col * TILE, 0))
        sheet.paste(render_prop_tile(faction, col, prop_pal), (col * TILE, TILE))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating {len(FACTIONS)} arena floor tilesets v2 → {OUT_DIR.relative_to(ROOT)}/')
    for faction in FACTIONS:
        sheet = render_sheet(faction)
        out_path = OUT_DIR / f'{faction}_arena_tileset.png'
        sheet.save(out_path, 'PNG')
        size_kb = out_path.stat().st_size / 1024
        print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H}, {size_kb:.1f}K)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
