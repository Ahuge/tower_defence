#!/usr/bin/env python3
"""
generate_coalition_projectile_sprites.py — projectile spritesheet
for the 5 Coalition towers.

Output: public/assets/coalition/coalition_projectiles.png — 160×192,
32×32 frames, 5 cols × 6 rows.

Per SpriteManager.factionProj convention:
  Cols: arrow / cannon / sniper / coalition_wall / coalition_root
  Rows 0-2: travel animation (3 frames)
  Rows 3-5: impact animation (3 frames)

Coalition Wall doesn't really fire projectiles (it's a 2-damage
melee-range filler), but the sheet must include a column for layout.
We render a tiny chip-of-stone placeholder so it doesn't crash if
the engine ever queries the sprite.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _arena_palette import faction_palette, rgba

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / 'public' / 'assets' / 'coalition' / 'coalition_projectiles.png'

FRAME = 32
COLS = 5
ROWS = 6
SHEET_W = FRAME * COLS
SHEET_H = FRAME * ROWS


def draw_travel_arrow(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Wood-shaft arrow flying right. 3 frames = subtle yaw wobble."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    leather = rgba(pal['tertiary'])
    deep = rgba(pal['deep'])
    hl = rgba(pal['highlight'])
    yaw = (-1, 0, 1)[frame]
    # Shaft
    d.line((cx - 10, cy + yaw, cx + 6, cy + yaw), fill=leather)
    # Tip (iron)
    d.line((cx + 6, cy + yaw, cx + 10, cy + yaw), fill=deep)
    d.point((cx + 9, cy - 1 + yaw), fill=hl)
    # Fletching
    d.line((cx - 12, cy - 2 + yaw, cx - 9, cy + yaw), fill=hl)
    d.line((cx - 12, cy + 2 + yaw, cx - 9, cy + yaw), fill=hl)


def draw_impact_arrow(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Arrow impact — small splash of dust + arrow stuck in target."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    deep = rgba(pal['deep'])
    leather = rgba(pal['tertiary'])
    hl = rgba(pal['highlight'])
    # Frame 0 = bright burst, frame 1 = fading splash, frame 2 = dust
    if frame == 0:
        d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), outline=hl)
        d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=hl)
    elif frame == 1:
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), outline=leather)
        d.point((cx - 4, cy - 4), fill=hl)
        d.point((cx + 4, cy + 4), fill=hl)
    else:
        d.point((cx - 6, cy - 6), fill=leather)
        d.point((cx + 6, cy + 6), fill=leather)
        d.point((cx, cy), fill=deep)


def draw_travel_cannon(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Iron cannonball flying right. 3 frames = subtle bob."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    hl = rgba(pal['highlight'])
    bob = (0, -1, 0)[frame]
    # Iron ball
    d.ellipse((cx - 5, cy - 5 + bob, cx + 5, cy + 5 + bob), fill=shadow, outline=deep)
    # Highlight
    d.ellipse((cx - 3, cy - 3 + bob, cx, cy + bob), fill=hl)
    # Wisp behind
    d.point((cx - 7, cy - 1 + bob), fill=(180, 180, 180, 200))
    d.point((cx - 9, cy + bob), fill=(160, 160, 160, 180))


def draw_impact_cannon(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Cannon impact — explosion ring."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    if frame == 0:
        # Bright core
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(255, 200, 120, 255), outline=(255, 240, 180, 255))
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=(255, 255, 200, 255))
    elif frame == 1:
        # Expanding ring
        d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), outline=(255, 180, 80, 255), width=2)
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=(180, 100, 40, 200))
    else:
        # Smoke
        for off in ((-8, -6), (8, 4), (0, 8), (-4, -8)):
            d.ellipse((cx + off[0] - 3, cy + off[1] - 3, cx + off[0] + 3, cy + off[1] + 3), fill=(120, 100, 80, 160))


def draw_travel_sniper(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Long iron bolt flying right with faint glint trail."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    deep = rgba(pal['deep'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Long shaft
    d.line((cx - 12, cy, cx + 8, cy), fill=deep)
    d.line((cx - 12, cy - 1, cx + 8, cy - 1), fill=leather)
    # Tip
    d.line((cx + 8, cy, cx + 12, cy), fill=hl)
    # Glint trail (varies by frame)
    glint_off = (-14, -10, -6)[frame]
    d.point((cx + glint_off, cy - 1), fill=hl)


def draw_impact_sniper(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Sniper impact — sharp puncture flash, no spray."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    hl = rgba(pal['highlight'])
    deep = rgba(pal['deep'])
    if frame == 0:
        # Cross flash
        d.line((cx - 6, cy, cx + 6, cy), fill=hl)
        d.line((cx, cy - 6, cx, cy + 6), fill=hl)
        d.point((cx, cy), fill=(255, 255, 255, 255))
    elif frame == 1:
        d.line((cx - 4, cy, cx + 4, cy), fill=hl)
        d.line((cx, cy - 4, cx, cy + 4), fill=hl)
    else:
        d.point((cx, cy), fill=deep)


def draw_travel_wall(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Wall doesn't really fire — small stone chip placeholder so the
    sprite layout has the column. Visible only if the engine ever
    queries it. Rendered tiny + faint."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    deep = rgba(pal['deep'])
    d.rectangle((cx - 1, cy - 1, cx + 1, cy + 1), fill=deep)


def draw_impact_wall(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Wall impact — same tiny stone-chip placeholder."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    deep = rgba(pal['deep'])
    if frame == 0:
        d.point((cx, cy), fill=deep)


def draw_travel_root(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Iron thorn / dart from Briarroot."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    spike = (24, 22, 18, 255)
    leather = rgba(pal['tertiary'])
    hl = rgba(pal['highlight'])
    rotate = (0, 1, 0)[frame]  # subtle spin
    # Iron thorn shaft
    d.line((cx - 6, cy + rotate, cx + 8, cy + rotate), fill=spike)
    d.line((cx - 6, cy - 1 + rotate, cx + 8, cy - 1 + rotate), fill=leather)
    # Barbs (back-pointing)
    d.line((cx - 6, cy + rotate, cx - 9, cy - 2 + rotate), fill=spike)
    d.line((cx - 6, cy + rotate, cx - 9, cy + 2 + rotate), fill=spike)
    # Sharp tip
    d.point((cx + 9, cy + rotate), fill=hl)


def draw_impact_root(d: ImageDraw.ImageDraw, ox: int, oy: int, frame: int, pal: dict) -> None:
    """Briarroot impact — ground-burst of brambles. Reads as 'roots
    erupt around target' rather than a green explosion."""
    cx, cy = ox + FRAME // 2, oy + FRAME // 2
    spike = (24, 22, 18, 255)
    leather = rgba(pal['tertiary'])
    hl = rgba(pal['highlight'])
    if frame == 0:
        # Initial spike-burst from ground
        d.line((cx, cy + 8, cx, cy - 6), fill=spike)
        d.line((cx - 6, cy + 8, cx - 8, cy - 4), fill=spike)
        d.line((cx + 6, cy + 8, cx + 8, cy - 4), fill=spike)
        d.line((cx - 10, cy + 8, cx - 12, cy + 2), fill=spike)
        d.line((cx + 10, cy + 8, cx + 12, cy + 2), fill=spike)
    elif frame == 1:
        # Brambles fully extended
        for sx, sy, ex, ey in [
            (cx, cy + 10, cx, cy - 8),
            (cx - 7, cy + 10, cx - 10, cy - 6),
            (cx + 7, cy + 10, cx + 10, cy - 6),
            (cx - 12, cy + 10, cx - 14, cy),
            (cx + 12, cy + 10, cx + 14, cy),
        ]:
            d.line((sx, sy, ex, ey), fill=spike)
            d.point((ex, ey), fill=hl)
        # Soil splash
        d.point((cx - 4, cy + 8), fill=leather)
        d.point((cx + 4, cy + 8), fill=leather)
    else:
        # Fading — barbs receding
        d.line((cx, cy + 6, cx, cy - 2), fill=spike)
        d.line((cx - 6, cy + 6, cx - 7, cy + 2), fill=spike)
        d.line((cx + 6, cy + 6, cx + 7, cy + 2), fill=spike)


# Per-tower (travel_drawer, impact_drawer) in column order
PROJ_DRAWERS = [
    ('arrow', draw_travel_arrow, draw_impact_arrow),
    ('cannon', draw_travel_cannon, draw_impact_cannon),
    ('sniper', draw_travel_sniper, draw_impact_sniper),
    ('coalition_wall', draw_travel_wall, draw_impact_wall),
    ('coalition_root', draw_travel_root, draw_impact_root),
]


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new('RGBA', (SHEET_W, SHEET_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pal = faction_palette('coalition')

    for col, (name, travel, impact) in enumerate(PROJ_DRAWERS):
        ox = col * FRAME
        # Travel rows 0-2
        for f in range(3):
            travel(d, ox, f * FRAME, f, pal)
        # Impact rows 3-5
        for f in range(3):
            impact(d, ox, (3 + f) * FRAME, f, pal)

    img.save(OUT_PATH, optimize=True)
    print(f'  ✓ {OUT_PATH.relative_to(ROOT)}  ({SHEET_W}×{SHEET_H}, {OUT_PATH.stat().st_size // 1024}K)')


if __name__ == '__main__':
    main()
