#!/usr/bin/env python3
"""
generate_coalition_tower_sprites.py — procedural pixel-art for the
5 Coalition towers (Arcane-campaign first-time default kit).

Output: public/assets/coalition/coalition_towers.png — a 320×256
spritesheet at 64×64 frames, 5 cols × 4 rows.

Sheet layout (per SpriteManager.factionTowers convention):
    Col 0: arrow           Col 1: cannon          Col 2: sniper
    Col 3: coalition_wall  Col 4: coalition_root  (Briarroot)

    Row 0: idle    Row 1: charge  Row 2: fire  Row 3: cooldown

Coalition is faction-neutral: steel + leather + grey-stone. No glow,
no magic, no faction color accents. Each tower's identity comes from
silhouette + small accent (crossbow string, cannon mouth, scope
ring, crenellations, thorn crown).

Per-tower 4-row animation is a small visual change between frames
(e.g. arrow pulled back during charge, cannon flash on fire) so the
tower reads as alive without needing per-pixel hand animation.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _arena_palette import faction_palette, rgba

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / 'public' / 'assets' / 'coalition' / 'coalition_towers.png'

FRAME = 64
COLS = 5
ROWS = 4   # idle, charge, fire, cooldown
SHEET_W = FRAME * COLS
SHEET_H = FRAME * ROWS

# Animation phases (used by drawers as a 0..3 index for visual variation).
IDLE, CHARGE, FIRE, COOLDOWN = 0, 1, 2, 3


def base_pedestal(d: ImageDraw.ImageDraw, x: int, y: int, pal: dict) -> None:
    """Stone pedestal at frame bottom — shared base across all towers.
    24×8 stone block with iron rim. Anchored at frame center; bottom
    sits at y = 60 so the tower has visible silhouette above."""
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Stone block
    d.rectangle((x - 12, y - 8, x + 12, y), fill=mid, outline=shadow)
    d.line((x - 11, y - 8, x + 11, y - 8), fill=hl)
    # Bottom shadow
    d.rectangle((x - 13, y, x + 13, y + 2), fill=deep)
    # Iron strapping
    d.line((x - 12, y - 4, x + 12, y - 4), fill=leather)


def draw_arrow(d: ImageDraw.ImageDraw, ox: int, oy: int, phase: int, pal: dict) -> None:
    """Arrow tower — slim watchtower with crossbow on top.
    Charge: bowstring pulled back; Fire: arrow flying; Cooldown: relaxed."""
    cx = ox + FRAME // 2
    base_pedestal(d, cx, oy + 60, pal)
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Watchtower body — vertical post
    d.rectangle((cx - 4, oy + 24, cx + 4, oy + 52), fill=mid, outline=shadow)
    d.line((cx - 3, oy + 24, cx - 3, oy + 51), fill=hl)
    # Top platform
    d.rectangle((cx - 10, oy + 20, cx + 10, oy + 24), fill=mid, outline=shadow)
    d.line((cx - 9, oy + 20, cx + 9, oy + 20), fill=hl)
    # Crossbow stock (horizontal bar across top)
    d.rectangle((cx - 12, oy + 14, cx + 12, oy + 18), fill=leather, outline=deep)
    # Bowstring — varies by phase
    string_pull = 0 if phase == IDLE else (3 if phase == CHARGE else 0)
    if phase != FIRE:
        # Drawn bow — string from end to end with a pull
        d.line((cx - 12, oy + 16, cx - 4 + string_pull, oy + 16), fill=hl)
        d.line((cx + 12, oy + 16, cx + 4 - string_pull, oy + 16), fill=hl)
        d.line((cx - 4 + string_pull, oy + 16, cx + 4 - string_pull, oy + 16), fill=hl)
    else:
        # Released — string snapped flat
        d.line((cx - 12, oy + 16, cx + 12, oy + 16), fill=hl)
    # Arrow nock (visible during charge)
    if phase == CHARGE:
        d.line((cx, oy + 12, cx, oy + 18), fill=deep)
    elif phase == IDLE:
        d.point((cx, oy + 16), fill=deep)


def draw_cannon(d: ImageDraw.ImageDraw, ox: int, oy: int, phase: int, pal: dict) -> None:
    """Cannon tower — squat round drum on stone base.
    Fire: bright muzzle flash; Cooldown: smoke wisp."""
    cx = ox + FRAME // 2
    base_pedestal(d, cx, oy + 60, pal)
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Cannon body — horizontal drum
    d.rectangle((cx - 14, oy + 32, cx + 10, oy + 50), fill=mid, outline=shadow)
    d.line((cx - 13, oy + 33, cx + 9, oy + 33), fill=hl)
    # Iron bands
    d.line((cx - 8, oy + 32, cx - 8, oy + 50), fill=leather)
    d.line((cx + 2, oy + 32, cx + 2, oy + 50), fill=leather)
    # Muzzle (right side)
    d.rectangle((cx + 10, oy + 36, cx + 18, oy + 46), fill=deep, outline=shadow)
    d.rectangle((cx + 14, oy + 38, cx + 18, oy + 44), fill=(20, 20, 20, 255))
    # Phase-specific:
    if phase == FIRE:
        # Muzzle flash — bright orange/yellow burst
        d.ellipse((cx + 16, oy + 36, cx + 28, oy + 46), fill=(255, 220, 120, 255))
        d.ellipse((cx + 18, oy + 38, cx + 26, oy + 44), fill=(255, 255, 200, 255))
    elif phase == COOLDOWN:
        # Smoke wisp
        d.point((cx + 20, oy + 36), fill=(180, 180, 180, 200))
        d.point((cx + 22, oy + 33), fill=(160, 160, 160, 200))
        d.point((cx + 24, oy + 30), fill=(140, 140, 140, 180))
    elif phase == CHARGE:
        # Tiny ember in barrel
        d.point((cx + 16, oy + 41), fill=(255, 180, 80, 200))


def draw_sniper(d: ImageDraw.ImageDraw, ox: int, oy: int, phase: int, pal: dict) -> None:
    """Sniper tower — tall narrow turret with scope at top.
    Charge: scope glints; Fire: long muzzle flash."""
    cx = ox + FRAME // 2
    base_pedestal(d, cx, oy + 60, pal)
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Tall turret body
    d.rectangle((cx - 5, oy + 18, cx + 5, oy + 52), fill=mid, outline=shadow)
    d.line((cx - 4, oy + 18, cx - 4, oy + 51), fill=hl)
    # Long barrel — protrudes right
    d.rectangle((cx + 4, oy + 28, cx + 24, oy + 32), fill=mid, outline=shadow)
    d.line((cx + 4, oy + 28, cx + 23, oy + 28), fill=hl)
    # Brass scope ring
    d.ellipse((cx - 2, oy + 14, cx + 8, oy + 24), outline=leather, fill=mid)
    d.ellipse((cx, oy + 16, cx + 6, oy + 22), outline=deep)
    # Phase:
    if phase == FIRE:
        # Long bright muzzle flash
        d.line((cx + 24, oy + 30, cx + 32, oy + 30), fill=(255, 240, 180, 255))
        d.point((cx + 30, oy + 30), fill=(255, 255, 255, 255))
    elif phase == CHARGE:
        # Scope glint
        d.point((cx + 4, oy + 17), fill=(255, 255, 255, 255))
    elif phase == COOLDOWN:
        # Faint wisp at barrel tip
        d.point((cx + 26, oy + 28), fill=(200, 200, 200, 180))


def draw_wall(d: ImageDraw.ImageDraw, ox: int, oy: int, phase: int, pal: dict) -> None:
    """Coalition Wall — solid stone block with crenellations.
    Largely static across phases (it's a wall); subtle iron-cap
    glow on fire (it does deal 2 damage per the type def)."""
    cx = ox + FRAME // 2
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Big stone block, full frame width
    d.rectangle((cx - 22, oy + 28, cx + 22, oy + 60), fill=mid, outline=shadow)
    # Top edge highlight
    d.line((cx - 21, oy + 28, cx + 21, oy + 28), fill=hl)
    # Stone-block grout lines (grid pattern)
    d.line((cx - 22, oy + 38, cx + 22, oy + 38), fill=shadow)
    d.line((cx - 22, oy + 48, cx + 22, oy + 48), fill=shadow)
    d.line((cx - 8, oy + 28, cx - 8, oy + 38), fill=shadow)
    d.line((cx + 8, oy + 28, cx + 8, oy + 38), fill=shadow)
    d.line((cx, oy + 38, cx, oy + 48), fill=shadow)
    d.line((cx - 14, oy + 48, cx - 14, oy + 60), fill=shadow)
    d.line((cx + 14, oy + 48, cx + 14, oy + 60), fill=shadow)
    # Crenellations on top
    for cx_off in (-18, -10, -2, 6, 14):
        d.rectangle((cx + cx_off, oy + 22, cx + cx_off + 4, oy + 28), fill=mid, outline=shadow)
        d.line((cx + cx_off, oy + 22, cx + cx_off + 3, oy + 22), fill=hl)
    # Iron strap across middle
    d.rectangle((cx - 22, oy + 42, cx + 22, oy + 44), fill=leather)
    # Phase: subtle on fire, otherwise idle
    if phase == FIRE:
        # Tiny sparks above the crenellations
        for cx_off in (-16, 0, 16):
            d.point((cx + cx_off, oy + 20), fill=(255, 220, 160, 255))


def draw_briarroot(d: ImageDraw.ImageDraw, ox: int, oy: int, phase: int, pal: dict) -> None:
    """Briarroot — stone cube with thorny iron crown. Faction-neutral
    per locked design (no green, no magic). Crown of dark iron spikes
    is the silhouette anchor."""
    cx = ox + FRAME // 2
    base_pedestal(d, cx, oy + 60, pal)
    deep = rgba(pal['deep'])
    shadow = rgba(pal['shadow'])
    mid = rgba(pal['mid'])
    hl = rgba(pal['highlight'])
    leather = rgba(pal['tertiary'])
    # Stone cube body
    d.rectangle((cx - 12, oy + 32, cx + 12, oy + 52), fill=mid, outline=shadow)
    d.line((cx - 11, oy + 32, cx + 11, oy + 32), fill=hl)
    # Stone block grout (cube divisions)
    d.line((cx, oy + 32, cx, oy + 52), fill=shadow)
    d.line((cx - 12, oy + 42, cx + 12, oy + 42), fill=shadow)
    # Thorny iron crown — tall spike at center, two shorter on sides
    spike_dark = rgba((24, 22, 18, 255))
    # Center spike
    d.line((cx, oy + 14, cx, oy + 32), fill=spike_dark)
    d.point((cx - 1, oy + 16), fill=spike_dark)
    d.point((cx + 1, oy + 16), fill=spike_dark)
    # Side spikes
    d.line((cx - 8, oy + 22, cx - 6, oy + 32), fill=spike_dark)
    d.line((cx + 6, oy + 22, cx + 8, oy + 32), fill=spike_dark)
    # Outer spikes
    d.line((cx - 12, oy + 26, cx - 11, oy + 32), fill=spike_dark)
    d.line((cx + 11, oy + 26, cx + 12, oy + 32), fill=spike_dark)
    # Iron rim where crown meets body
    d.rectangle((cx - 12, oy + 30, cx + 12, oy + 32), fill=spike_dark)
    # Phase:
    if phase == CHARGE:
        # Spikes vibrate — small offset
        d.point((cx, oy + 12), fill=spike_dark)
    elif phase == FIRE:
        # Thorn shoots out — small dart leaving frame to the right
        d.line((cx + 14, oy + 32, cx + 22, oy + 32), fill=spike_dark)
        d.point((cx + 22, oy + 31), fill=leather)
    elif phase == COOLDOWN:
        # Empty notch in crown rim where the thorn was
        d.point((cx + 4, oy + 30), fill=deep)


# Tower drawers in column order
DRAWERS = [
    ('arrow', draw_arrow),
    ('cannon', draw_cannon),
    ('sniper', draw_sniper),
    ('coalition_wall', draw_wall),
    ('coalition_root', draw_briarroot),
]


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new('RGBA', (SHEET_W, SHEET_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pal = faction_palette('coalition')

    for col, (name, drawer) in enumerate(DRAWERS):
        ox = col * FRAME
        for row in range(ROWS):
            oy = row * FRAME
            phase = row  # 0..3 == idle/charge/fire/cooldown
            drawer(d, ox, oy, phase, pal)

    img.save(OUT_PATH, optimize=True)
    print(f'  ✓ {OUT_PATH.relative_to(ROOT)}  ({SHEET_W}×{SHEET_H}, {OUT_PATH.stat().st_size // 1024}K)')


if __name__ == '__main__':
    main()
