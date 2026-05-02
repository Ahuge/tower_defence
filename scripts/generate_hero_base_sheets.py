#!/usr/bin/env python3
"""
generate_hero_base_sheets.py — per-faction HD base spritesheets per
`notes/art_prds/02_hero_base_per_faction.md`.

v2 polish — 4-tone palette per silhouette region, inner detail lines
(facets / bricks / seams), specular catch-lights, structural damage
states (smoke / fire / cracks / debris) rather than alpha-chip noise.

Output: `public/assets/arena/base_<faction>.png` (112 × 700 px).
- 5 damage frames stacked vertically (112 × 140 each).
- Frame 0 pristine → frame 4 collapse.
- Each silhouette is faction-distinct; damage cumulatively adds chips,
  cracks, smoke, debris, ember pixels.

Run:
  python3 scripts/generate_hero_base_sheets.py
"""
from __future__ import annotations
import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'arena'

W = 112
H = 140
FRAMES = 5

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


def darken(rgb, k: float):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb, k: float):
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


def rgba(rgb, a=255):
    return (rgb[0], rgb[1], rgb[2], a)


def make_palette(primary):
    """4-tone palette + outline + specular for a faction.
    Order: deep_shadow, shadow, mid, highlight, specular, outline."""
    return {
        'deep':   darken(primary, 0.30),
        'shadow': darken(primary, 0.55),
        'mid':    primary,
        'highlight': lighten(primary, 0.30),
        'specular':  lighten(primary, 0.65),
        'outline':   darken(primary, 0.25),
    }


def shaded_rect(d: ImageDraw.ImageDraw, rect, pal):
    """Draw a rectangle with proper shading: deep shadow on bottom-right,
    mid on body, highlight on top-left edge, specular pixel at corner."""
    x0, y0, x1, y1 = rect
    # Deep shadow fill base
    d.rectangle((x0, y0, x1, y1), fill=rgba(pal['deep']))
    # Mid body inset
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=rgba(pal['shadow']))
    d.rectangle((x0 + 2, y0 + 1, x1 - 2, y1 - 2), fill=rgba(pal['mid']))
    # Top edge highlight
    d.line((x0 + 1, y0 + 1, x1 - 1, y0 + 1), fill=rgba(pal['highlight']))
    # Left edge highlight
    d.line((x0 + 1, y0 + 1, x0 + 1, y1 - 2), fill=rgba(pal['highlight']))
    # Specular corner pixel
    d.point((x0 + 2, y0 + 2), fill=rgba(pal['specular']))
    # Outline
    d.rectangle((x0, y0, x1, y1), outline=rgba(pal['outline']))


def shaded_polygon(d: ImageDraw.ImageDraw, points, pal, light_dir='top'):
    """Draw a polygon with body fill + highlight on top edge + outline."""
    # Body
    d.polygon(points, fill=rgba(pal['mid']), outline=rgba(pal['outline']))
    # Inner shading: a darker inset polygon
    if len(points) >= 3:
        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)
        inset = []
        for x, y in points:
            ix = int(cx + (x - cx) * 0.7)
            iy = int(cy + (y - cy) * 0.7)
            inset.append((ix, iy))
        d.polygon(inset, fill=rgba(pal['highlight']))
    # Top vertex specular
    if light_dir == 'top':
        top = min(points, key=lambda p: p[1])
        d.point(top, fill=rgba(pal['specular']))


def shaded_circle(d: ImageDraw.ImageDraw, bbox, pal):
    """Circle with proper sphere shading: shadow side + mid + highlight + specular."""
    x0, y0, x1, y1 = bbox
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    rx = (x1 - x0) // 2
    ry = (y1 - y0) // 2
    d.ellipse(bbox, fill=rgba(pal['deep']), outline=rgba(pal['outline']))
    d.ellipse((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=rgba(pal['shadow']))
    d.ellipse((x0 + 2, y0 + 1, x1 - 2, y1 - 2), fill=rgba(pal['mid']))
    # Highlight crescent (top-left)
    d.ellipse((x0 + 2, y0 + 2, x0 + rx + 1, y0 + ry + 1), fill=rgba(pal['highlight']))
    # Specular pixel
    d.point((x0 + max(2, rx // 2), y0 + max(2, ry // 2)), fill=rgba(pal['specular']))


# ─── Per-faction silhouettes — pristine (frame 0) ─────────────────────

CX = W // 2  # 56


def draw_arcane(d, pal):
    # Stone foundation (3 levels)
    shaded_rect(d, (18, 118, 94, 135), {**pal, 'mid': pal['shadow'], 'shadow': pal['deep']})
    shaded_rect(d, (22, 108, 90, 118), pal)
    # Arch base blocks
    shaded_rect(d, (24, 95, 88, 108), pal)
    # Twin pillars with brick segmentation
    for px in (26, 74):
        shaded_rect(d, (px, 55, px + 12, 95), pal)
        # Brick lines across the pillar
        for y in (65, 75, 85):
            d.line((px + 1, y, px + 11, y), fill=rgba(pal['outline']))
    # Arch top — wedge polygon with highlight
    shaded_polygon(d, [(38, 55), (56, 28), (74, 55)], pal)
    # Inner arch shadow recess
    d.polygon([(42, 55), (56, 36), (70, 55)], fill=rgba(pal['deep']))
    # Crystal spire above arch — multi-faceted
    shaded_polygon(d, [(56, 12), (66, 30), (62, 55), (50, 55), (46, 30)], pal)
    # Spire facet line down center
    d.line((56, 14, 56, 52), fill=rgba(pal['highlight']))
    d.line((56, 16, 56, 50), fill=rgba(pal['specular']))
    # Glowing rune dot on arch keystone
    d.ellipse((52, 70, 60, 78), fill=rgba(pal['highlight']), outline=rgba(pal['outline']))
    d.point((54, 72), fill=rgba(pal['specular']))
    # Side rune marks
    for rx in (32, 80):
        d.line((rx, 80, rx + 4, 80), fill=rgba(pal['highlight']))
        d.line((rx + 2, 78, rx + 2, 82), fill=rgba(pal['highlight']))


def draw_mechanical(d, pal):
    # Heavy iron foundation with rivets
    shaded_rect(d, (16, 110, 96, 135), {**pal, 'mid': pal['shadow'], 'shadow': pal['deep']})
    # Mid block (main body)
    shaded_rect(d, (20, 88, 92, 110), pal)
    # Plate seams across mid block
    for y in (92, 96, 100, 104):
        d.line((22, y, 90, y), fill=rgba(pal['outline']))
    # Rivets along top of mid
    for rx in (26, 36, 46, 56, 66, 76, 86):
        d.ellipse((rx - 1, 90, rx + 1, 92), fill=rgba(pal['highlight']), outline=rgba(pal['outline']))
    # Furnace mouth — recessed dark with glow
    d.rectangle((40, 64, 72, 88), fill=rgba(darken(pal['mid'], 0.25)), outline=rgba(pal['outline']))
    d.rectangle((43, 67, 69, 85), fill=rgba(pal['mid']))
    d.rectangle((46, 70, 66, 82), fill=rgba(pal['highlight']))
    d.rectangle((49, 73, 63, 79), fill=rgba(pal['specular']))
    # Furnace grating bars
    for fx in (49, 55, 61):
        d.line((fx, 67, fx, 85), fill=rgba(pal['outline']))
    # Smokestacks with rim detail
    for sx in (28, 76):
        shaded_rect(d, (sx, 30, sx + 8, 64), pal)
        d.rectangle((sx - 1, 28, sx + 9, 32), fill=rgba(pal['shadow']), outline=rgba(pal['outline']))
        # Vertical seam down stack
        d.line((sx + 4, 32, sx + 4, 62), fill=rgba(pal['outline']))
    # Smoke plumes (puffy, 2-tone)
    for sx, sy in ((32, 24), (76, 24)):
        d.ellipse((sx - 6, sy - 4, sx + 8, sy + 6), fill=rgba(darken(pal['shadow'], 0.5)), outline=rgba(pal['outline']))
        d.ellipse((sx - 4, sy - 6, sx + 4, sy + 2), fill=rgba(darken(pal['mid'], 0.4)))
    # Side gauges
    for gx in (22, 90):
        d.ellipse((gx - 2, 96, gx + 2, 100), fill=rgba(pal['highlight']), outline=rgba(pal['outline']))


def draw_nature(d, pal):
    # Mossy dirt base
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.45), 'highlight': pal['shadow'], 'shadow': pal['deep']}
    d.ellipse((10, 118, 102, 135), fill=rgba(base_pal['mid']), outline=rgba(base_pal['outline']))
    d.ellipse((14, 118, 98, 130), fill=rgba(base_pal['highlight']))
    # Trunk with bark texture
    trunk_pal = {**pal, 'mid': darken(pal['mid'], 0.5), 'highlight': darken(pal['mid'], 0.35), 'shadow': darken(pal['mid'], 0.65)}
    shaded_rect(d, (44, 70, 68, 122), trunk_pal)
    # Bark vertical grooves
    for tx in (48, 56, 64):
        d.line((tx, 73, tx, 119), fill=rgba(trunk_pal['outline']))
    # Knothole detail
    d.ellipse((54, 90, 58, 94), fill=rgba(trunk_pal['outline']))
    # Roots (3 per side)
    for rx, sx in ((20, 40), (28, 44)):
        d.polygon([(rx, 130), (sx, 110), (sx + 2, 130)], fill=rgba(trunk_pal['mid']), outline=rgba(trunk_pal['outline']))
    for rx, sx in ((92, 72), (84, 68)):
        d.polygon([(rx, 130), (sx, 110), (sx - 2, 130)], fill=rgba(trunk_pal['mid']), outline=rgba(trunk_pal['outline']))
    # Leafy crown — multiple overlapping circles for fullness
    crown_centers = [(56, 36), (38, 50), (74, 50), (46, 28), (66, 28), (28, 60), (84, 60)]
    for cx, cy in crown_centers:
        r = 14 if cx == 56 else 11
        shaded_circle(d, (cx - r, cy - r, cx + r, cy + r), pal)
    # Highlight leaves (specular dots)
    for cx, cy in [(56, 26), (40, 40), (72, 40), (52, 50), (60, 50)]:
        d.ellipse((cx - 1, cy - 1, cx + 1, cy + 1), fill=rgba(pal['specular']))


def draw_void(d, pal):
    # Obsidian platform
    plat_pal = {**pal, 'mid': darken(pal['mid'], 0.45)}
    d.polygon([(20, 124), (92, 124), (88, 135), (24, 135)], fill=rgba(plat_pal['shadow']), outline=rgba(plat_pal['outline']))
    d.polygon([(22, 124), (90, 124), (86, 132), (26, 132)], fill=rgba(plat_pal['mid']))
    # Floating shard — large faceted polygon
    shard_outer = [(56, 14), (84, 50), (78, 100), (66, 120), (46, 120), (34, 100), (28, 50)]
    d.polygon(shard_outer, fill=rgba(pal['shadow']), outline=rgba(pal['outline']))
    # Inner facet (left side highlight)
    d.polygon([(56, 14), (28, 50), (34, 100), (56, 60)], fill=rgba(pal['mid']))
    d.polygon([(56, 14), (56, 60), (34, 100), (46, 120)], fill=rgba(pal['highlight']))
    # Facet edge lines (cracks)
    d.line((56, 14, 56, 60), fill=rgba(pal['outline']))
    d.line((56, 60, 34, 100), fill=rgba(pal['outline']))
    d.line((56, 60, 78, 100), fill=rgba(pal['outline']))
    d.line((28, 50, 56, 60), fill=rgba(pal['outline']))
    d.line((84, 50, 56, 60), fill=rgba(pal['outline']))
    # Glowing rift slash (vertical, energy)
    d.line((54, 35, 58, 95), fill=rgba(pal['specular']), width=2)
    d.line((55, 38, 57, 92), fill=rgba(lighten(pal['specular'], 0.3)))
    # Rift glow dots
    for ry in (45, 65, 85):
        d.ellipse((53, ry, 59, ry + 4), fill=rgba(pal['highlight']))
    # Top vertex specular
    d.point((56, 14), fill=rgba(pal['specular']))


def draw_military(d, pal):
    # Concrete bunker — tan/olive with darker panels
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.5), 'highlight': pal['shadow']}
    # Foundation
    shaded_rect(d, (12, 120, 100, 135), {**base_pal, 'mid': darken(base_pal['mid'], 0.5)})
    # Bunker body
    shaded_rect(d, (14, 78, 98, 120), base_pal)
    # Concrete panel seams
    for x in (28, 42, 56, 70, 84):
        d.line((x, 80, x, 118), fill=rgba(base_pal['outline']))
    for y in (90, 100, 110):
        d.line((16, y, 96, y), fill=rgba(darken(base_pal['mid'], 0.6)))
    # Slit window (dark recessed)
    d.rectangle((38, 92, 74, 100), fill=rgba(darken(base_pal['mid'], 0.2)), outline=rgba(base_pal['outline']))
    # Slit interior glints
    d.point((42, 96), fill=rgba(pal['specular']))
    d.point((68, 96), fill=rgba(pal['specular']))
    # Sandbags — ovals stacked
    sandbag_pal = {**pal, 'mid': darken(pal['mid'], 0.4), 'highlight': darken(pal['mid'], 0.2), 'shadow': darken(pal['mid'], 0.6)}
    for cx, cy in [(24, 122), (40, 124), (56, 126), (72, 124), (88, 122),
                   (32, 116), (48, 118), (64, 118), (80, 116)]:
        d.ellipse((cx - 8, cy - 4, cx + 8, cy + 4), fill=rgba(sandbag_pal['mid']), outline=rgba(sandbag_pal['outline']))
        # Cinch mark on each bag
        d.line((cx, cy - 3, cx, cy + 3), fill=rgba(sandbag_pal['outline']))
        # Highlight strip
        d.ellipse((cx - 6, cy - 3, cx + 4, cy - 1), fill=rgba(sandbag_pal['highlight']))
    # Antenna mast
    d.line((56, 30, 56, 78), fill=rgba(pal['shadow']), width=2)
    d.line((56, 30, 56, 78), fill=rgba(pal['highlight']))
    # Antenna base
    d.rectangle((52, 76, 60, 82), fill=rgba(pal['shadow']), outline=rgba(pal['outline']))
    # Antenna dish/ball
    shaded_circle(d, (50, 22, 62, 34), pal)
    # Top tip
    d.line((56, 18, 56, 24), fill=rgba(pal['outline']))


def draw_aliens(d, pal):
    # Hive mound base (organic)
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.35), 'highlight': darken(pal['mid'], 0.15)}
    d.ellipse((10, 105, 102, 135), fill=rgba(base_pal['shadow']), outline=rgba(base_pal['outline']))
    d.ellipse((14, 108, 98, 132), fill=rgba(base_pal['mid']))
    d.ellipse((20, 111, 92, 124), fill=rgba(base_pal['highlight']))
    # Hive body (egg-shaped)
    shaded_circle(d, (24, 30, 88, 110), pal)
    # Chitin plate seams (curved lines suggesting insectile shell)
    for r_offset in (6, 12, 18):
        # Vertical curve down
        for y in range(36 + r_offset, 95):
            t = (y - 36 - r_offset) / 50
            offset = int(8 * math.sin(t * 3.14))
            d.point((56 + offset, y), fill=rgba(pal['outline']))
            d.point((56 - offset, y), fill=rgba(pal['outline']))
    # Pulsing pustules (4-tone gradient)
    pustules = [(38, 55), (56, 48), (74, 55), (44, 75), (68, 75), (56, 90)]
    for cx, cy in pustules:
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=rgba(pal['outline']))
        d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=rgba(pal['shadow']))
        d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=rgba(pal['mid']))
        d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=rgba(pal['highlight']))
        d.point((cx - 1, cy - 1), fill=rgba(pal['specular']))
    # Top spike (chitinous spire)
    shaded_polygon(d, [(56, 14), (62, 36), (50, 36)], pal)
    # Tendrils dropping from base
    for tx in (28, 84):
        d.line((tx, 100, tx + (3 if tx < 56 else -3), 118), fill=rgba(pal['shadow']), width=2)
        d.line((tx, 100, tx + (3 if tx < 56 else -3), 118), fill=rgba(pal['mid']))


def draw_cypherpunk(d, pal):
    # Server stack base
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.5)}
    shaded_rect(d, (16, 118, 96, 135), {**base_pal, 'mid': darken(base_pal['mid'], 0.5)})
    # Server tower
    body_pal = {**pal, 'mid': darken(pal['mid'], 0.55), 'highlight': darken(pal['mid'], 0.35)}
    shaded_rect(d, (20, 32, 92, 118), body_pal)
    # Horizontal server units (each row is a "rack")
    for y in (40, 52, 64, 76, 88, 100):
        d.rectangle((22, y, 90, y + 8), fill=rgba(darken(body_pal['mid'], 0.6)), outline=rgba(body_pal['outline']))
        # Status LEDs on the right side of each rack
        for lx in (78, 82, 86):
            d.point((lx, y + 4), fill=rgba(pal['specular']))
        # Vent slots
        for vx in (28, 30, 32):
            d.line((vx, y + 2, vx, y + 6), fill=rgba(body_pal['outline']))
    # Neon strip down both sides (vertical glow)
    d.line((22, 34, 22, 116), fill=rgba(pal['specular']), width=2)
    d.line((23, 36, 23, 114), fill=rgba(pal['highlight']))
    d.line((90, 34, 90, 116), fill=rgba(pal['specular']), width=2)
    d.line((89, 36, 89, 114), fill=rgba(pal['highlight']))
    # Monitor on top (with screen content)
    d.rectangle((34, 14, 78, 32), fill=rgba(body_pal['shadow']), outline=rgba(body_pal['outline']))
    d.rectangle((36, 16, 76, 30), fill=rgba(darken(pal['mid'], 0.7)), outline=rgba(body_pal['outline']))
    # Screen content (waveform)
    for sx in range(38, 75, 3):
        sy = 23 + (3 if (sx // 3) % 2 == 0 else -3)
        d.point((sx, sy), fill=rgba(pal['specular']))
        d.point((sx + 1, sy), fill=rgba(pal['highlight']))
    # Side antennae
    d.line((22, 32, 14, 18), fill=rgba(pal['outline']))
    d.line((22, 32, 14, 18), fill=rgba(pal['mid']))
    d.point((14, 18), fill=rgba(pal['specular']))
    d.line((90, 32, 98, 18), fill=rgba(pal['outline']))
    d.line((90, 32, 98, 18), fill=rgba(pal['mid']))
    d.point((98, 18), fill=rgba(pal['specular']))


def draw_infernal(d, pal):
    # Obsidian altar foundation (dark)
    found_pal = {**pal, 'mid': darken(pal['mid'], 0.4), 'highlight': darken(pal['mid'], 0.2), 'shadow': darken(pal['mid'], 0.55)}
    shaded_rect(d, (18, 115, 94, 135), found_pal)
    # Stepped altar block
    shaded_rect(d, (24, 95, 88, 115), found_pal)
    shaded_rect(d, (30, 80, 82, 95), found_pal)
    # Glowing seams in altar (lava cracks)
    for y in (98, 104, 108):
        for x in range(28, 86, 8):
            d.line((x, y, x + 4, y), fill=rgba(pal['specular']))
    # Lava seam vertical
    d.line((42, 82, 42, 113), fill=rgba(pal['highlight']))
    d.line((70, 82, 70, 113), fill=rgba(pal['highlight']))
    # Central pillar
    shaded_rect(d, (46, 50, 66, 80), {**pal, 'mid': darken(pal['mid'], 0.6)})
    # Pillar embers (glowing pixels)
    for ex, ey in [(50, 58), (62, 64), (54, 72), (60, 76)]:
        d.point((ex, ey), fill=rgba(pal['specular']))
        d.point((ex + 1, ey), fill=rgba(pal['highlight']))
    # Eternal flame (multi-layered)
    flame_pts_outer = [(56, 12), (66, 30), (62, 38), (56, 32), (50, 38), (46, 30)]
    d.polygon(flame_pts_outer, fill=rgba(darken(pal['shadow'], 0.3)), outline=rgba(pal['outline']))
    d.polygon([(56, 16), (62, 30), (58, 36), (56, 30), (54, 36), (50, 30)], fill=rgba(pal['mid']))
    d.polygon([(56, 20), (60, 30), (56, 28), (52, 30)], fill=rgba(pal['highlight']))
    d.point((56, 24), fill=rgba(pal['specular']))


def draw_celestial(d, pal):
    # Marble base (gold-veined)
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.4)}
    shaded_rect(d, (28, 118, 84, 135), base_pal)
    # Step
    shaded_rect(d, (32, 110, 80, 118), base_pal)
    # Pillar shaft (with vertical fluting)
    shaft_pal = {**pal, 'mid': darken(pal['mid'], 0.3), 'highlight': pal['mid']}
    shaded_rect(d, (40, 50, 72, 110), shaft_pal)
    # Fluting (vertical grooves)
    for fx in (44, 50, 56, 62, 68):
        d.line((fx, 53, fx, 107), fill=rgba(shaft_pal['outline']))
        d.line((fx + 1, 53, fx + 1, 107), fill=rgba(shaft_pal['highlight']))
    # Capital (decorative top)
    shaded_rect(d, (36, 42, 76, 50), base_pal)
    shaded_rect(d, (38, 38, 74, 42), {**base_pal, 'mid': base_pal['highlight']})
    # Acanthus leaf decoration on capital
    for lx in (44, 56, 68):
        d.polygon([(lx - 2, 42), (lx, 38), (lx + 2, 42)], fill=rgba(pal['specular']))
    # Halo (multi-ring)
    d.ellipse((30, 8, 82, 38), outline=rgba(pal['outline']), width=1)
    d.ellipse((32, 10, 80, 36), outline=rgba(pal['highlight']), width=2)
    d.ellipse((36, 14, 76, 32), outline=rgba(pal['specular']), width=1)
    # Halo shimmer (4-direction)
    for hx, hy in [(56, 8), (82, 22), (56, 38), (30, 22)]:
        d.point((hx, hy), fill=rgba(pal['specular']))


def draw_psionic(d, pal):
    # Cradle base
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.45)}
    shaded_rect(d, (26, 115, 86, 135), {**base_pal, 'mid': darken(base_pal['mid'], 0.5)})
    # Cradle prongs holding the orb
    for prong_x in (24, 88):
        d.polygon([(prong_x, 115), (prong_x + (3 if prong_x < 56 else -3), 90),
                   (prong_x + (1 if prong_x < 56 else -1), 60),
                   (prong_x + (4 if prong_x < 56 else -4), 60),
                   (prong_x + (6 if prong_x < 56 else -6), 90),
                   (prong_x + (5 if prong_x < 56 else -5), 115)],
                  fill=rgba(base_pal['mid']), outline=rgba(base_pal['outline']))
    # Glass orb (large, multi-layer for translucent feel)
    glass_pal = {**pal, 'mid': darken(pal['mid'], 0.3), 'shadow': darken(pal['mid'], 0.5)}
    d.ellipse((22, 28, 90, 96), fill=rgba(glass_pal['shadow']), outline=rgba(pal['outline']))
    d.ellipse((24, 30, 88, 94), fill=rgba(glass_pal['mid']))
    d.ellipse((26, 32, 86, 92), fill=rgba(pal['mid']))
    # Brain blob inside (crinkly)
    brain_pal = {**pal, 'mid': lighten(pal['mid'], 0.2)}
    d.ellipse((34, 44, 78, 84), fill=rgba(brain_pal['shadow']), outline=rgba(brain_pal['outline']))
    d.ellipse((36, 46, 76, 82), fill=rgba(brain_pal['mid']))
    # Brain folds (curvy lines)
    d.line((42, 56, 70, 56), fill=rgba(pal['outline']))
    d.line((44, 58, 68, 58), fill=rgba(pal['highlight']))
    d.line((40, 64, 72, 64), fill=rgba(pal['outline']))
    d.line((42, 66, 70, 66), fill=rgba(pal['highlight']))
    d.line((42, 72, 70, 72), fill=rgba(pal['outline']))
    d.line((44, 74, 68, 74), fill=rgba(pal['highlight']))
    # Highlight crescent on glass (specular)
    d.ellipse((28, 34, 50, 56), outline=rgba(pal['specular']), width=2)
    d.point((34, 38), fill=rgba(pal['specular']))
    # Orb top stem
    d.rectangle((54, 24, 58, 32), fill=rgba(pal['shadow']), outline=rgba(pal['outline']))
    d.point((56, 22), fill=rgba(pal['specular']))


def draw_harmonic(d, pal):
    # Resonator base
    base_pal = {**pal, 'mid': darken(pal['mid'], 0.5)}
    shaded_rect(d, (22, 115, 90, 135), {**base_pal, 'mid': darken(base_pal['mid'], 0.4)})
    # Inscription marks on base
    for ix in (32, 44, 56, 68, 80):
        d.line((ix, 122, ix + 2, 124), fill=rgba(pal['highlight']))
        d.line((ix, 128, ix + 2, 130), fill=rgba(pal['highlight']))
    # Tuning fork shaft (central)
    shaded_rect(d, (50, 65, 62, 115), pal)
    # Spiraling resonance line on shaft
    for sy in (70, 76, 82, 88, 94, 100, 106, 112):
        d.line((52, sy, 60, sy), fill=rgba(pal['outline']))
    # Twin tuning fork tines (flared crystalline)
    for tx in (28, 78):
        # Tine body
        shaded_rect(d, (tx, 22, tx + 12, 65), pal)
        # Tine inner fluting
        d.line((tx + 4, 25, tx + 4, 63), fill=rgba(pal['outline']))
        d.line((tx + 8, 25, tx + 8, 63), fill=rgba(pal['outline']))
        d.line((tx + 5, 25, tx + 5, 63), fill=rgba(pal['highlight']))
    # Tine caps (faceted crystals)
    for tx in (34, 84):
        shaded_polygon(d, [(tx, 12), (tx + 8, 22), (tx - 8, 22)], pal)
    # Resonance crystal at center
    shaded_polygon(d, [(56, 42), (66, 56), (56, 70), (46, 56)], pal)
    # Crystal facet line
    d.line((56, 42, 56, 70), fill=rgba(pal['highlight']))
    d.point((56, 56), fill=rgba(pal['specular']))
    # Resonance arcs above the device
    for arc_r in (16, 22, 28):
        d.arc((56 - arc_r, 42 - arc_r, 56 + arc_r, 42 + arc_r),
              start=200, end=340, fill=rgba(pal['highlight']))


SILHOUETTES = {
    'arcane': draw_arcane,
    'mechanical': draw_mechanical,
    'nature': draw_nature,
    'void': draw_void,
    'military': draw_military,
    'aliens': draw_aliens,
    'cypherpunk': draw_cypherpunk,
    'infernal': draw_infernal,
    'celestial': draw_celestial,
    'psionic': draw_psionic,
    'harmonic': draw_harmonic,
}


def silhouette_pixels(img: Image.Image) -> list[tuple[int, int]]:
    px = img.load()
    coords = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 0:
                coords.append((x, y))
    return coords


def apply_damage(img: Image.Image, level: int, faction: str, pal) -> Image.Image:
    """Damage v2 — instead of just chip-pixel noise, build cumulative
    structural damage: cracks (line marks), scorch zones (replaced
    pixels), and at higher levels actual silhouette removal +
    debris/smoke/fire overlays."""
    out = img.copy()
    rng = random.Random(hash((faction, level)) & 0xffffffff)
    coords = silhouette_pixels(out)
    if not coords:
        return out
    px = out.load()
    d = ImageDraw.Draw(out)
    crack = rgba(pal['outline'])
    scorch = rgba(darken(pal['shadow'], 0.5))
    soot = rgba((20, 18, 16))
    ember = rgba((255, 180, 60))
    smoke_dark = rgba((60, 55, 50, 200))
    smoke_light = rgba((110, 100, 95, 180))

    def add_cracks(n: int, max_len: int = 12):
        for _ in range(n):
            sx, sy = coords[rng.randrange(len(coords))]
            steps = rng.randint(4, max_len)
            x, y = sx, sy
            ang = rng.uniform(0, 6.283)
            for _ in range(steps):
                if 0 <= x < W and 0 <= y < H and px[x, y][3] > 0:
                    px[x, y] = crack
                ang += rng.uniform(-0.4, 0.4)
                x += int(round(math.cos(ang)))
                y += int(round(math.sin(ang)))

    def add_scorch(rate: float):
        for cx, cy in coords:
            if rng.random() < rate and px[cx, cy][3] > 0:
                if rng.random() < 0.5:
                    px[cx, cy] = scorch
                else:
                    px[cx, cy] = soot

    def add_chip(rate: float):
        for cx, cy in coords:
            if rng.random() < rate:
                px[cx, cy] = (0, 0, 0, 0)

    def carve_hole(rect):
        x0, y0, x1, y1 = rect
        for y in range(max(0, y0), min(H, y1)):
            for x in range(max(0, x0), min(W, x1)):
                if px[x, y][3] > 0:
                    px[x, y] = (0, 0, 0, 0)

    def add_embers(n: int):
        for _ in range(n):
            ex = rng.randint(8, W - 8)
            ey = rng.randint(H - 40, H - 4)
            px[ex, ey] = ember
            if 0 <= ex + 1 < W:
                px[ex + 1, ey] = rgba(lighten((255, 180, 60), 0.3))

    def add_smoke(n: int, base_y: int):
        for _ in range(n):
            sx = rng.randint(20, W - 20)
            sy = rng.randint(base_y - 30, base_y - 8)
            r = rng.randint(3, 6)
            d.ellipse((sx - r, sy - r, sx + r, sy + r), fill=smoke_dark)
            d.ellipse((sx - r + 1, sy - r + 1, sx + r - 1, sy + r - 1), fill=smoke_light)

    def add_fire(n: int, base_y: int):
        for _ in range(n):
            fx = rng.randint(20, W - 20)
            fy = rng.randint(base_y - 18, base_y - 6)
            # 3-tone flame
            d.polygon([(fx, fy - 8), (fx + 4, fy), (fx, fy - 2), (fx - 4, fy)],
                      fill=rgba(darken((255, 60, 20), 0.6)), outline=rgba((100, 30, 10)))
            d.polygon([(fx, fy - 6), (fx + 2, fy - 1), (fx, fy - 3), (fx - 2, fy - 1)],
                      fill=rgba((255, 130, 30)))
            px[fx, fy - 5] = rgba((255, 220, 100))

    if level >= 1:
        add_cracks(2, 8)
        add_scorch(0.02)
        add_chip(0.015)
    if level >= 2:
        add_cracks(4, 12)
        add_scorch(0.05)
        add_chip(0.03)
        carve_hole((rng.randint(30, 50), rng.randint(40, 70),
                    rng.randint(56, 80), rng.randint(72, 94)))
        add_smoke(2, 100)
    if level >= 3:
        add_cracks(7, 18)
        add_scorch(0.10)
        add_chip(0.05)
        # Two more holes
        for _ in range(2):
            cx_h = rng.randint(20, W - 20)
            cy_h = rng.randint(35, 110)
            carve_hole((cx_h - 7, cy_h - 7, cx_h + 7, cy_h + 7))
        add_embers(4)
        add_smoke(4, 80)
        add_fire(2, 130)
    if level >= 4:
        # Knock out top 30% — collapse start
        carve_hole((0, 0, W, int(H * 0.32)))
        # Mid section gap
        carve_hole((rng.randint(20, 40), 50,
                    rng.randint(60, 90), 90))
        add_cracks(10, 20)
        add_scorch(0.18)
        add_chip(0.08)
        add_embers(12)
        add_smoke(6, 60)
        add_fire(4, 130)
        # Debris on the ground
        for _ in range(8):
            dx = rng.randint(8, W - 8)
            dy = rng.randint(125, 138)
            d.rectangle((dx, dy, dx + 2, dy + 1), fill=rgba(pal['shadow']))
            d.point((dx + 1, dy), fill=rgba(pal['outline']))

    return out


def render_sheet(faction: str) -> Image.Image:
    pal = make_palette(hex_to_rgb(FACTIONS[faction][0]))
    sheet = Image.new('RGBA', (W, H * FRAMES), (0, 0, 0, 0))
    pristine = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(pristine)
    SILHOUETTES[faction](d0, pal)
    sheet.paste(pristine, (0, 0))
    for lvl in range(1, FRAMES):
        damaged = apply_damage(pristine, lvl, faction, pal)
        sheet.paste(damaged, (0, H * lvl))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating {len(FACTIONS)} HD base sheets v2 → {OUT_DIR.relative_to(ROOT)}/')
    for faction in FACTIONS:
        sheet = render_sheet(faction)
        out_path = OUT_DIR / f'base_{faction}.png'
        sheet.save(out_path, 'PNG')
        size_kb = out_path.stat().st_size / 1024
        print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H * FRAMES}, {size_kb:.1f}K)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
