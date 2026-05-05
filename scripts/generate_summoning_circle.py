#!/usr/bin/env python3
"""
generate_summoning_circle.py — final M10 Summoning Circle spritesheet
(PRD 04). The polished version of variant B (Crystalline Geode), per
the user pick + agent review.

Polish notes from review:
- Thicker pillar at frame 9 (now max width 6 instead of 4).
- More sparkles around the perimeter at high charge (8 cardinals
  + 8 diagonals at frame 9).
- Brighter core at apex.
- Pillar climbs higher (32 px instead of 28).

Output: `public/assets/arena/struct_summoning_circle.png` —
56 × 560 px, 10 frames stacked vertically (one per ~10% of charge).

Run:
  python3 scripts/generate_summoning_circle.py
"""
from __future__ import annotations
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'assets' / 'arena' / 'struct_summoning_circle.png'

W = 56
H = 56
FRAMES = 10

# Arcane palette (matches PRD 04)
STONE_DARK    = (58, 45, 82, 255)     # #3a2d52
STONE_MID     = (90, 72, 128, 255)    # #5a4880
STONE_LIGHT   = (126, 107, 168, 255)  # #7e6ba8
OUTLINE       = (26, 18, 38, 255)     # #1a1226
VIOLET_DEEP   = (102, 68, 255, 255)   # #6644ff
VIOLET_MID    = (153, 136, 255, 255)  # #9988ff
VIOLET_LIGHT  = (220, 200, 255, 255)  # #dcc8ff
WHITE_HOT     = (255, 255, 255, 255)
TRANSPARENT   = (0, 0, 0, 0)


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(4))


def blend_pixel(img: Image.Image, x: int, y: int, color):
    """Alpha-blend a single pixel onto the image."""
    if not (0 <= x < W and 0 <= y < H):
        return
    cur = img.getpixel((x, y))
    if cur[3] == 0:
        img.putpixel((x, y), color)
        return
    a = color[3] / 255.0
    out = tuple(
        int(cur[i] * (1 - a) + color[i] * a) for i in range(3)
    ) + (max(cur[3], color[3]),)
    img.putpixel((x, y), out)


def draw_pillar(img: Image.Image, charge: float, top_y: int, max_height: int = 32):
    """Vertical pillar of light rising from the central core.

    Polish v2: max width 6 at frame 9, max height 32 (was 28).
    Pillar starts at half charge and grows in height + width
    progressively. Frame 9 has a white-hot 2-pixel core surrounded
    by 2-pixel violet falloff = 6 px total width. Frame 9 also
    fades out more slowly upward so the pillar reads as a beam,
    not a glow ball.
    """
    if charge < 0.5:
        return
    progress = (charge - 0.5) / 0.5  # 0..1 in upper half
    pillar_h = int(max_height * progress)
    width = max(1, int(progress * 6))  # 1-pixel at half charge → 6 at full
    cx = W // 2
    full_charge = charge >= 0.95
    for dy in range(pillar_h):
        y = top_y - dy
        # Frame 9 fades slower (intensity 1.0 → 0.7); earlier frames fade faster.
        fade_floor = 0.7 if full_charge else 0.5
        intensity = 1.0 - (dy / max(1, pillar_h)) * (1.0 - fade_floor)
        for dx in range(-width, width + 1):
            t = abs(dx) / max(1, width)
            if t <= 0.33:
                # Inner core — white-hot at full charge, violet-light otherwise
                core = WHITE_HOT if full_charge else VIOLET_LIGHT
                color = (core[0], core[1], core[2], int(255 * intensity))
            elif t <= 0.66:
                # Mid band — violet light
                color = (VIOLET_LIGHT[0], VIOLET_LIGHT[1], VIOLET_LIGHT[2],
                         int(220 * intensity))
            else:
                # Outer fade — violet mid
                color = (VIOLET_MID[0], VIOLET_MID[1], VIOLET_MID[2],
                         int(160 * intensity * (1 - t)))
            blend_pixel(img, cx + dx, y, color)


def draw_frame(frame_idx: int) -> Image.Image:
    """One charge frame of the Summoning Circle (variant B polished)."""
    img = Image.new('RGBA', (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)
    cx, cy = W // 2, H // 2 + 4  # nudge slightly down for pillar headroom
    charge = frame_idx / (FRAMES - 1)

    # Stone base — chamfered square, three rings of depth shading
    base_pts = [
        (cx - 20, cy - 17), (cx - 17, cy - 20),
        (cx + 17, cy - 20), (cx + 20, cy - 17),
        (cx + 20, cy + 17), (cx + 17, cy + 20),
        (cx - 17, cy + 20), (cx - 20, cy + 17),
    ]
    d.polygon(base_pts, fill=STONE_DARK, outline=OUTLINE)
    inner_pts = [
        (cx - 17, cy - 14), (cx - 14, cy - 17),
        (cx + 14, cy - 17), (cx + 17, cy - 14),
        (cx + 17, cy + 14), (cx + 14, cy + 17),
        (cx - 14, cy + 17), (cx - 17, cy + 14),
    ]
    d.polygon(inner_pts, fill=STONE_MID)
    deep_pts = [
        (cx - 14, cy - 11), (cx - 11, cy - 14),
        (cx + 11, cy - 14), (cx + 14, cy - 11),
        (cx + 14, cy + 11), (cx + 11, cy + 14),
        (cx - 11, cy + 14), (cx - 14, cy + 11),
    ]
    d.polygon(deep_pts, fill=STONE_LIGHT)

    # Six crystal shards arranged radially (hexagonal)
    shard_count = 6
    for i in range(shard_count):
        ang = i * (math.pi * 2 / shard_count) - math.pi / 2
        rx = cx + int(11 * math.cos(ang))
        ry = cy + int(11 * math.sin(ang))
        tx = cx + int(17 * math.cos(ang))
        ty = cy + int(17 * math.sin(ang))
        # Shard activation order — some shards light earlier than others
        shard_threshold = i / shard_count
        lit = charge > shard_threshold * 0.6
        if lit:
            intensity = min(1.0, (charge - shard_threshold * 0.6) / 0.3)
            shard_color = lerp_color(VIOLET_DEEP, VIOLET_LIGHT, intensity)
        else:
            shard_color = STONE_DARK
        d.line((rx, ry, tx, ty), fill=shard_color)
        d.point((tx, ty), fill=lerp_color(shard_color, WHITE_HOT, 0.3) if lit else shard_color)

    # Central crystal core — octahedron silhouette
    core_size = 4
    core_pts = [
        (cx, cy - core_size),
        (cx + core_size, cy),
        (cx, cy + core_size),
        (cx - core_size, cy),
    ]
    if charge >= 0.55:
        intensity = (charge - 0.55) / 0.45
        core_fill = lerp_color(VIOLET_MID, WHITE_HOT, intensity)
        core_outline = lerp_color(VIOLET_DEEP, VIOLET_LIGHT, intensity)
    else:
        core_fill = STONE_DARK
        core_outline = STONE_DARK
    d.polygon(core_pts, fill=core_fill, outline=core_outline)

    # Inner faceting line — 1 px highlight in center at high charge.
    # Polish v2: brightened apex (frame 9) — center is white-hot with
    # a 1-pixel halo of violet-light around it.
    if charge >= 0.7:
        d.point((cx, cy), fill=WHITE_HOT)
    if charge >= 0.95:
        # Apex halo around the core
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            blend_pixel(img, cx + dx, cy + dy, VIOLET_LIGHT)

    # Particles around perimeter at high charge.
    # Polish v2: more sparkles, organized around the structure
    # in cardinal + diagonal positions for a "structure radiating"
    # feel rather than the random orbit of v1.
    if charge >= 0.8:
        # Cardinal sparkles outside the base
        sparkle_radius = 23
        cardinal_count_lit = int((charge - 0.8) / 0.025)  # 8 lit by frame 9
        cardinals = [(0, -1), (1, 0), (0, 1), (-1, 0)]
        diagonals = [(1, -1), (1, 1), (-1, 1), (-1, -1)]
        all_dirs = cardinals + diagonals
        for i, (dx, dy) in enumerate(all_dirs):
            if i >= cardinal_count_lit:
                break
            # Normalize diagonal vectors to roughly the same radius
            length = math.sqrt(dx * dx + dy * dy)
            sx = cx + int(sparkle_radius * dx / length)
            sy = cy + int(sparkle_radius * dy / length)
            blend_pixel(img, sx, sy, VIOLET_LIGHT)
            # Frame 9: brighter, with a 1-pixel falloff trail toward the core
            if charge >= 0.95:
                tx = cx + int((sparkle_radius - 2) * dx / length)
                ty = cy + int((sparkle_radius - 2) * dy / length)
                blend_pixel(img, tx, ty, VIOLET_MID)

    # Pillar of light — drawn last so it sits on top of base accents
    draw_pillar(img, charge, cy - 22)
    return img


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (W, H * FRAMES), TRANSPARENT)
    for i in range(FRAMES):
        sheet.paste(draw_frame(i), (0, i * H), draw_frame(i))
    sheet.save(OUT)
    print(f'wrote {OUT} ({sheet.width}×{sheet.height})')


if __name__ == '__main__':
    main()
