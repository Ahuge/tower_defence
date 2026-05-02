#!/usr/bin/env python3
"""
generate_arena_floor_tileset.py — per-faction Hero Defense arena floor
tilesets per `notes/art_prds/01_hero_arena_floor.md`.

v3 — pulls shared faction palette (primary / secondary / tertiary)
+ ground motifs + ground textures from `_arena_palette.py` so the
floor + base + future ability VFX all share through-line motifs.
Each faction has a recognizable accent color (gold runes for arcane,
furnace-orange for mech, magenta rifts for void, etc) and a
distinctive ground texture (rivets / circuit grid / lava cracks /
marble veins / etc).

Output: `public/assets/arena/<faction>_arena_tileset.png` (448 × 56).
- Row 0: 16 ground variants — 12 base + 4 accent (rune / sigil / etc).
- Row 1: 16 alpha-PNG prop tiles, scattered ~4% in the renderer.
"""
from __future__ import annotations
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _arena_palette import (
    FACTION_PALETTE, faction_palette, hex_to_rgb, darken, lighten, rgba,
    GROUND_MOTIF, GROUND_TEXTURE,
)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'arena'

TILE = 28
ROWS = 2
COLS = 16
W = TILE * COLS  # 448
H = TILE * ROWS  # 56


# ─── Prop catalog — detailed shaded silhouettes per faction ────────

def prop_pillar(d, p):
    o = rgba(p['outline'])
    d.rectangle((11, 22, 17, 24), fill=rgba(p['shadow']), outline=o)
    d.rectangle((11, 6, 17, 8), fill=rgba(p['shadow']), outline=o)
    d.rectangle((12, 8, 16, 22), fill=rgba(p['mid']))
    d.line((12, 8, 12, 22), fill=rgba(p['highlight']))
    d.point((12, 8), fill=rgba(p['specular']))
    d.line((14, 11, 14, 19), fill=rgba(p['shadow']))


def prop_crystal(d, p):
    """Faceted arcane crystal — body is primary, glow rune on belt
    uses tertiary."""
    d.polygon([(14, 4), (19, 12), (16, 23), (12, 23), (9, 12)],
              fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 4), (9, 12), (12, 23), (14, 12)], fill=rgba(p['highlight']))
    d.line((14, 4, 14, 23), fill=rgba(p['outline']))
    d.point((11, 8), fill=rgba(p['specular']))
    # Tertiary rune speck at heart
    d.point((14, 14), fill=rgba(p['glow_mid']))


def prop_cog(d, p):
    o = rgba(p['outline'])
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x1 = int(14 + math.cos(rad) * 7)
        y1 = int(13 + math.sin(rad) * 7)
        x2 = int(14 + math.cos(rad) * 11)
        y2 = int(13 + math.sin(rad) * 11)
        d.rectangle((min(x1, x2) - 1, min(y1, y2) - 1, max(x1, x2) + 1, max(y1, y2) + 1),
                    fill=rgba(p['mid']))
    d.ellipse((6, 5, 22, 21), fill=rgba(p['mid']), outline=o)
    d.ellipse((7, 6, 21, 20), fill=rgba(p['highlight']))
    d.ellipse((9, 8, 19, 18), fill=rgba(p['mid']), outline=o)
    d.ellipse((11, 10, 17, 16), fill=rgba(p['shadow']), outline=o)
    # Furnace-orange center glow
    d.point((13, 12), fill=rgba(p['glow_bright']))
    d.point((14, 13), fill=rgba(p['glow_mid']))


def prop_spike(d, p):
    d.polygon([(14, 4), (18, 23), (10, 23)], fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 4), (10, 23), (14, 23)], fill=rgba(p['highlight']))
    d.line((14, 4, 14, 22), fill=rgba(p['outline']))
    d.point((11, 9), fill=rgba(p['specular']))


def prop_diamond(d, p):
    d.polygon([(14, 5), (22, 14), (14, 23), (6, 14)],
              fill=rgba(p['mid']), outline=rgba(p['outline']))
    d.polygon([(14, 5), (6, 14), (14, 14)], fill=rgba(p['highlight']))
    d.polygon([(14, 5), (14, 14), (22, 14)], fill=rgba(p['shadow']))
    d.line((6, 14, 22, 14), fill=rgba(p['outline']))
    d.point((10, 10), fill=rgba(p['specular']))
    # Glow heart
    d.point((14, 14), fill=rgba(p['glow_mid']))


def prop_blob(d, p):
    """Mossy rock with bright pollen-yellow flowers (tertiary)."""
    o = rgba(p['outline'])
    d.ellipse((4, 12, 24, 24), fill=rgba(p['mid']), outline=o)
    d.ellipse((8, 6, 20, 16), fill=rgba(p['mid']), outline=o)
    d.ellipse((12, 10, 18, 16), fill=rgba(p['highlight']))
    d.ellipse((6, 14, 14, 22), fill=rgba(p['highlight']))
    d.point((11, 9), fill=rgba(p['specular']))
    d.point((9, 16), fill=rgba(p['specular']))
    # Tertiary pollen flowers
    d.point((15, 11), fill=rgba(p['glow_mid']))
    d.point((10, 18), fill=rgba(p['glow_mid']))


def prop_skull(d, p):
    """Skull with glowing tertiary eye-glints."""
    o = rgba(p['outline'])
    d.ellipse((7, 5, 21, 19), fill=rgba(p['mid']), outline=o)
    d.ellipse((8, 6, 20, 16), fill=rgba(p['highlight']))
    d.rectangle((10, 11, 12, 14), fill=rgba(p['shadow']), outline=o)
    d.rectangle((16, 11, 18, 14), fill=rgba(p['shadow']), outline=o)
    # Tertiary glowing eye-pixels
    d.point((11, 12), fill=rgba(p['glow_bright']))
    d.point((17, 12), fill=rgba(p['glow_bright']))
    d.rectangle((9, 18, 19, 22), fill=rgba(p['mid']), outline=o)
    for tx in (11, 13, 15, 17):
        d.line((tx, 19, tx, 21), fill=rgba(p['outline']))


def prop_chip(d, p):
    """Circuit chip with neon-pink (tertiary) glowing pad."""
    o = rgba(p['outline'])
    d.rectangle((6, 8, 22, 20), fill=rgba(p['shadow']), outline=o)
    d.rectangle((7, 9, 21, 19), fill=rgba(p['mid']))
    d.point((8, 10), fill=rgba(p['specular']))
    # Tertiary-glowing center pad
    d.rectangle((11, 12, 17, 16), fill=rgba(p['glow_dim']), outline=o)
    d.rectangle((12, 13, 16, 15), fill=rgba(p['glow_mid']))
    d.point((13, 14), fill=rgba(p['glow_bright']))
    for py in (10, 12, 14, 16, 18):
        d.line((4, py, 6, py), fill=rgba(p['mid']))
        d.line((4, py, 6, py), fill=rgba(p['outline']))
        d.line((22, py, 24, py), fill=rgba(p['mid']))
        d.line((22, py, 24, py), fill=rgba(p['outline']))


def prop_post(d, p):
    o = rgba(p['outline'])
    d.rectangle((12, 4, 16, 23), fill=rgba(p['mid']), outline=o)
    d.line((12, 4, 12, 23), fill=rgba(p['highlight']))
    d.line((14, 4, 14, 23), fill=rgba(p['shadow']))
    d.rectangle((9, 9, 19, 11), fill=rgba(p['mid']), outline=o)
    d.line((9, 9, 19, 9), fill=rgba(p['highlight']))
    d.line((13, 14, 15, 14), fill=rgba(p['outline']))
    d.line((13, 18, 15, 18), fill=rgba(p['outline']))


def prop_orb(d, p):
    """Sphere with tertiary halo glow."""
    o = rgba(p['outline'])
    # Outer glow halo
    d.ellipse((5, 5, 23, 23), outline=rgba(p['glow_dim']))
    # Sphere
    d.ellipse((7, 7, 21, 21), fill=rgba(p['shadow']), outline=o)
    d.ellipse((8, 8, 20, 20), fill=rgba(p['mid']))
    d.ellipse((9, 9, 17, 17), fill=rgba(p['highlight']))
    d.ellipse((10, 10, 14, 14), fill=rgba(p['glow_mid']))
    d.point((12, 12), fill=rgba(p['specular']))


def prop_horn(d, p):
    o = rgba(p['outline'])
    d.polygon([(8, 23), (16, 5), (20, 12), (12, 23)],
              fill=rgba(p['mid']), outline=o)
    d.polygon([(8, 23), (16, 5), (15, 15)], fill=rgba(p['highlight']))
    d.point((13, 9), fill=rgba(p['specular']))


def prop_brand(d, p):
    """Branding iron — hot tip glows with tertiary ember color."""
    o = rgba(p['outline'])
    d.line((9, 23, 19, 5), fill=rgba(p['shadow']), width=3)
    d.line((10, 22, 18, 6), fill=rgba(p['mid']))
    d.line((11, 21, 17, 7), fill=rgba(p['highlight']))
    # Hot ember tip
    d.ellipse((5, 19, 13, 27), fill=rgba(p['glow_dim']))
    d.ellipse((6, 20, 12, 26), fill=rgba(p['glow_mid']))
    d.ellipse((7, 21, 11, 25), fill=rgba(p['glow_bright']))
    d.point((9, 23), fill=(255, 255, 255, 255))


def prop_feather(d, p):
    """Stylized feather with gold quill highlight."""
    o = rgba(p['outline'])
    d.polygon([(14, 4), (18, 12), (16, 23), (12, 23), (10, 12)],
              fill=rgba(p['mid']), outline=o)
    d.polygon([(14, 4), (10, 12), (12, 23), (14, 12)], fill=rgba(p['highlight']))
    # Gold quill
    d.line((14, 5, 14, 22), fill=rgba(p['glow_mid']))
    for fy in (8, 11, 14, 17, 20):
        d.line((11, fy, 14, fy), fill=rgba(p['shadow']))
        d.line((14, fy, 17, fy), fill=rgba(p['mid']))
    d.point((13, 7), fill=rgba(p['specular']))


def prop_fork(d, p):
    """Tuning fork with white prism glints (tertiary)."""
    o = rgba(p['outline'])
    d.line((10, 4, 10, 22), fill=rgba(p['mid']), width=2)
    d.line((10, 4, 10, 22), fill=o)
    d.line((11, 4, 11, 22), fill=rgba(p['highlight']))
    d.line((18, 4, 18, 22), fill=rgba(p['mid']), width=2)
    d.line((18, 4, 18, 22), fill=o)
    d.line((19, 4, 19, 22), fill=rgba(p['highlight']))
    d.line((9, 22, 19, 22), fill=rgba(p['mid']), width=2)
    d.line((9, 22, 19, 22), fill=o)
    # Prism-white glints on tine tops (tertiary = white)
    d.point((10, 4), fill=rgba(p['glow_bright']))
    d.point((18, 4), fill=rgba(p['glow_bright']))


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


def make_ground_palette(secondary, primary):
    """Ground tone derived from secondary, ~30% darker, with the
    primary's hue pulled toward the secondary so the floor reads
    as part of the same family but cooler/darker than the highlights
    on creatures + structures."""
    base = darken(secondary, 0.32)
    return {
        'deep':       darken(base, 0.75),
        'mid':        base,
        'light':      darken(secondary, 0.42),
        'highlight':  darken(secondary, 0.55),
        'edge':       darken(base, 0.70),
    }


def render_ground_tile(faction: str, col: int, ground_pal, full_pal) -> Image.Image:
    """A single 28x28 ground tile.
    Variants 0-11: shaded base ground with dithered texture +
    faction-specific texture overlay + scattered ambient motifs.
    Variants 12-15: full-detail accent shape (rune / sigil / glow)."""
    rng = random.Random(hash(('ground', faction, col)) & 0xffffffff)
    img = Image.new('RGBA', (TILE, TILE), rgba(ground_pal['mid']))
    d = ImageDraw.Draw(img)

    # 4-tone dither pattern (40% mid, 18% deep, 8% light, 4% highlight)
    for y in range(TILE):
        for x in range(TILE):
            r = rng.random()
            if r < 0.04:
                img.putpixel((x, y), rgba(ground_pal['highlight']))
            elif r < 0.12:
                img.putpixel((x, y), rgba(ground_pal['light']))
            elif r < 0.30:
                img.putpixel((x, y), rgba(ground_pal['deep']))

    # Tile boundary edges (light from upper-left)
    edge = rgba(ground_pal['edge'])
    d.line((0, 0, TILE - 1, 0), fill=edge)
    d.line((0, 0, 0, TILE - 1), fill=edge)
    d.line((TILE - 1, 0, TILE - 1, TILE - 1), fill=rgba(darken(ground_pal['deep'], 0.85)))
    d.line((0, TILE - 1, TILE - 1, TILE - 1), fill=rgba(darken(ground_pal['deep'], 0.85)))

    # Faction-specific ground texture overlay (rivets / plates / cracks / etc).
    # Use the tone palette (no accent — ambient only). Skip 1 in 4 tiles
    # so the texture isn't perfectly uniform.
    if rng.random() < 0.75:
        GROUND_TEXTURE[faction](d, TILE, TILE, full_pal)

    # Scatter 0-2 ambient motif marks (ambient runes / rivets / embers
    # depending on faction). Sparse — just enough to make the floor
    # read as faction-themed without distracting from gameplay.
    motif_count = rng.randint(0, 2)
    for _ in range(motif_count):
        mx = rng.randint(2, TILE - 4)
        my = rng.randint(2, TILE - 4)
        GROUND_MOTIF[faction](d, mx, my, full_pal)

    # Accent variants 12-15 — bigger marquee details. These are the
    # "look at me" tiles scattered ~6% by the renderer.
    if col >= 12:
        glow_dim = rgba(full_pal['glow_dim'])
        glow_mid = rgba(full_pal['glow_mid'])
        glow_bright = rgba(full_pal['glow_bright'])
        outline = rgba(full_pal['outline'])
        if col == 12:
            # Big rune cross (faction tertiary glow)
            d.rectangle((10, 13, 17, 14), fill=glow_dim)
            d.rectangle((13, 10, 14, 17), fill=glow_dim)
            d.rectangle((11, 13, 16, 14), fill=glow_mid)
            d.rectangle((13, 11, 14, 16), fill=glow_mid)
            d.point((13, 13), fill=glow_bright)
            d.point((14, 14), fill=glow_bright)
        elif col == 13:
            # Multi-faceted gem in tertiary glow
            d.polygon([(13, 9), (18, 14), (13, 19), (8, 14)], fill=glow_dim, outline=outline)
            d.polygon([(13, 9), (8, 14), (13, 14)], fill=glow_mid)
            d.point((10, 12), fill=glow_bright)
        elif col == 14:
            # Triple-dot sigil row
            for cx in (8, 13, 18):
                d.ellipse((cx - 2, 12, cx + 2, 16), fill=glow_dim)
                d.ellipse((cx - 1, 13, cx + 1, 15), fill=glow_mid)
                d.point((cx, 13), fill=glow_bright)
        else:  # col == 15
            # Glowing pip with halo (multi-ring)
            d.ellipse((7, 7, 20, 20), outline=glow_dim)
            d.ellipse((9, 9, 18, 18), fill=glow_dim)
            d.ellipse((10, 10, 17, 17), fill=glow_mid)
            d.ellipse((11, 11, 16, 16), fill=glow_bright)
            d.point((13, 13), fill=(255, 255, 255, 255))

    return img


def render_prop_tile(faction: str, col: int, full_pal) -> Image.Image:
    img = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fn = PROP_SETS[faction][col]
    fn(d, full_pal)
    return img


def render_sheet(faction: str) -> Image.Image:
    pal = faction_palette(faction)
    ground_pal = make_ground_palette(pal['secondary'], pal['primary'])
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for col in range(COLS):
        sheet.paste(render_ground_tile(faction, col, ground_pal, pal), (col * TILE, 0))
        sheet.paste(render_prop_tile(faction, col, pal), (col * TILE, TILE))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating {len(FACTION_PALETTE)} arena floor tilesets v3 → {OUT_DIR.relative_to(ROOT)}/')
    for faction in FACTION_PALETTE:
        sheet = render_sheet(faction)
        out_path = OUT_DIR / f'{faction}_arena_tileset.png'
        sheet.save(out_path, 'PNG')
        size_kb = out_path.stat().st_size / 1024
        print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H}, {size_kb:.1f}K)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
