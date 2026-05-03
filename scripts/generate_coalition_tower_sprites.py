#!/usr/bin/env python3
"""
generate_coalition_tower_sprites.py — procedural pixel-art for the
5 Coalition towers (Arcane-campaign first-time default kit).

Output: public/assets/coalition/coalition_towers.png — a 320×256
spritesheet at 64×64 frames, 5 cols × 4 rows.

Design direction: classic Warcraft-3-Human pixel-art TD towers.
Stone bases + wood beams + terracotta or slate roofs + banners +
brass trim. Color over pure greyscale — the towers should look
*medieval and lived-in*, not industrial.

Layout (per SpriteManager.factionTowers convention):
    Col 0: arrow           Col 1: cannon          Col 2: sniper
    Col 3: coalition_wall  Col 4: coalition_root  (Briarroot)
    Row 0: idle            Row 1: charge          Row 2: fire
    Row 3: cooldown
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / 'public' / 'assets' / 'coalition' / 'coalition_towers.png'

FRAME = 64
COLS = 5
ROWS = 4
SHEET_W = FRAME * COLS
SHEET_H = FRAME * ROWS

IDLE, CHARGE, FIRE, COOLDOWN = 0, 1, 2, 3

# ─── Color palette ───────────────────────────────────────────────
# Hand-picked WC3-style human-tower palette. Values are RGBA tuples
# so every draw call is unambiguous and the alpha = 255 default reads
# as opaque pixel-art.

def C(hex_int, a=255):
    return ((hex_int >> 16) & 0xff, (hex_int >> 8) & 0xff, hex_int & 0xff, a)

STONE_DARK    = C(0x4d5560)   # deep stone shadow
STONE_MID     = C(0x7c8696)   # base stone
STONE_LIGHT   = C(0xa9b4c0)   # stone highlight
STONE_BRIGHT  = C(0xcdd4dc)   # stone topedge

MORTAR        = C(0x35393f)   # near-black grout between stones

WOOD_DARK     = C(0x4a2c18)   # rough wood shadow
WOOD_MID      = C(0x7c4f2a)   # warm cedar plank
WOOD_LIGHT    = C(0xa67042)   # plank highlight

ROOF_DARK     = C(0x4d1f15)   # roof shadow (terracotta deep)
ROOF_MID      = C(0xa04030)   # main roof (terracotta)
ROOF_LIGHT    = C(0xc66050)   # roof highlight
ROOF_RIDGE    = C(0xe8826c)   # peak rim

BANNER_BLUE   = C(0x2f4d8c)   # blue cloth
BANNER_BLUE_L = C(0x4a6cb8)
BANNER_RED    = C(0x8a2424)   # crimson cloth
BANNER_RED_L  = C(0xb83a3a)
BANNER_POLE   = C(0x202020)

IRON_DARK     = C(0x202229)   # cannon iron, scope barrel
IRON_MID      = C(0x40434b)
IRON_HL       = C(0x6a6e78)

BRASS_DARK    = C(0x6b4a14)
BRASS_MID     = C(0xa57a28)
BRASS_LIGHT   = C(0xd9aa50)

GROUND_DARK   = C(0x32261d)   # base shadow at ground
GROUND_MID    = C(0x4a3b2c)   # earth around tower base

WINDOW_DARK   = C(0x121519, 255)  # arrow slit interior
WINDOW_GLOW   = C(0xe5c878, 200)  # warm window glow

FLASH_HOT     = C(0xfff4be)
FLASH_MID     = C(0xffce5c)
FLASH_DEEP    = C(0xff7a2a)
SMOKE_LIGHT   = C(0xb0b0b0, 200)
SMOKE_DARK    = C(0x707070, 220)
SPARK         = C(0xfff7d0)


# ─── Helpers ─────────────────────────────────────────────────────

def stone_block(d, x0, y0, x1, y1):
    """Filled stone rectangle with subtle highlight on the top edge."""
    d.rectangle((x0, y0, x1, y1), fill=STONE_MID)
    d.line((x0, y0, x1, y0), fill=STONE_LIGHT)
    d.line((x0, y0, x0, y1), fill=STONE_LIGHT)
    d.line((x1, y0, x1, y1), fill=STONE_DARK)
    d.line((x0, y1, x1, y1), fill=STONE_DARK)


def stone_blocks(d, x0, y0, x1, y1, block_w=4, block_h=4):
    """Stone wall with mortar lines drawn as a brick pattern. Rows
    offset so the bricks stagger like real masonry."""
    stone_block(d, x0, y0, x1, y1)
    # Horizontal mortar lines
    yy = y0 + block_h
    while yy < y1:
        d.line((x0, yy, x1, yy), fill=MORTAR)
        yy += block_h
    # Vertical mortar lines, offset by row
    yy = y0
    row = 0
    while yy < y1:
        offset = (block_w // 2) if (row % 2) else 0
        xx = x0 + offset
        while xx < x1:
            d.line((xx, yy, xx, min(yy + block_h, y1)), fill=MORTAR)
            xx += block_w
        yy += block_h
        row += 1


def base_pad(d, cx, ground_y):
    """Soft earth/shadow circle at the base of a tower so it doesn't
    look like it's floating on transparent space."""
    d.ellipse((cx - 16, ground_y - 3, cx + 16, ground_y + 3), fill=GROUND_MID)
    d.ellipse((cx - 12, ground_y - 1, cx + 12, ground_y + 1), fill=GROUND_DARK)


# ─── Per-tower drawers ────────────────────────────────────────────

def draw_arrow(d, ox, oy, phase):
    """Arrow Tower — classic stone+wood watchtower with terracotta roof.
    Tall, narrow, with arrow-slit windows; small archer hint at top."""
    cx = ox + FRAME // 2
    base_pad(d, cx, oy + 60)

    # Stone base (wider than the upper body)
    stone_blocks(d, cx - 13, oy + 48, cx + 13, oy + 60)
    # Stone foundation lip
    d.rectangle((cx - 14, oy + 60, cx + 14, oy + 62), fill=STONE_DARK)

    # Wooden upper body
    d.rectangle((cx - 9, oy + 26, cx + 9, oy + 48), fill=WOOD_MID)
    # Vertical plank lines
    for px in (cx - 5, cx, cx + 5):
        d.line((px, oy + 26, px, oy + 48), fill=WOOD_DARK)
    # Plank highlights
    d.line((cx - 9, oy + 26, cx + 9, oy + 26), fill=WOOD_LIGHT)
    d.line((cx - 8, oy + 27, cx - 8, oy + 47), fill=WOOD_LIGHT)
    # Iron strap bands
    d.rectangle((cx - 10, oy + 36, cx + 10, oy + 38), fill=IRON_DARK)
    d.line((cx - 10, oy + 36, cx + 10, oy + 36), fill=IRON_HL)

    # Crenellated walkway between body and roof (stone)
    d.rectangle((cx - 11, oy + 22, cx + 11, oy + 26), fill=STONE_MID)
    d.line((cx - 11, oy + 22, cx + 11, oy + 22), fill=STONE_BRIGHT)
    # Crenellation notches
    for nx in (cx - 9, cx - 4, cx + 1, cx + 6):
        d.rectangle((nx, oy + 19, nx + 2, oy + 22), fill=STONE_MID)

    # Terracotta conical roof (triangular pixel shape)
    for i, w in enumerate([1, 3, 5, 7, 9, 11]):
        y = oy + 8 + i * 2
        d.rectangle((cx - w, y, cx + w, y + 2), fill=ROOF_MID)
        # Highlight on left face
        d.line((cx - w, y, cx - w + 1, y), fill=ROOF_LIGHT)
        d.line((cx - w, y + 1, cx - w, y + 1), fill=ROOF_LIGHT)
        # Shadow on right face
        d.line((cx + w - 1, y + 1, cx + w, y + 1), fill=ROOF_DARK)
    # Roof peak finial
    d.point((cx, oy + 6), fill=ROOF_RIDGE)
    d.line((cx, oy + 4, cx, oy + 6), fill=BANNER_POLE)

    # Arrow slit window with warm glow during charge/idle
    if phase != FIRE:
        d.rectangle((cx - 1, oy + 30, cx + 1, oy + 35), fill=WINDOW_DARK)
        if phase == CHARGE:
            d.point((cx, oy + 33), fill=WINDOW_GLOW)
        else:
            d.point((cx, oy + 32), fill=WINDOW_GLOW)
    else:
        # On fire: arrow head visible at slit
        d.rectangle((cx - 1, oy + 30, cx + 1, oy + 35), fill=WINDOW_DARK)
        d.point((cx, oy + 32), fill=BRASS_LIGHT)

    # Phase-specific: bowstring / arrow visible at the top crenellation
    if phase == CHARGE:
        # String pulled back — arrow visible at the parapet
        d.line((cx - 6, oy + 21, cx + 6, oy + 21), fill=WOOD_DARK)
        d.point((cx, oy + 21), fill=BRASS_LIGHT)
    elif phase == FIRE:
        # Arrow flying out
        d.line((cx + 7, oy + 22, cx + 14, oy + 22), fill=WOOD_DARK)
        d.point((cx + 14, oy + 22), fill=BRASS_LIGHT)


def draw_cannon(d, ox, oy, phase):
    """Cannon Tower — squat fortified bastion with iron cannon
    protruding right, brass-banded barrel, small banner."""
    cx = ox + FRAME // 2
    base_pad(d, cx, oy + 60)

    # Wider stone base — the bastion
    stone_blocks(d, cx - 18, oy + 32, cx + 18, oy + 60)
    d.rectangle((cx - 19, oy + 60, cx + 19, oy + 62), fill=STONE_DARK)

    # Crenellated parapet
    d.rectangle((cx - 19, oy + 28, cx + 19, oy + 32), fill=STONE_MID)
    d.line((cx - 19, oy + 28, cx + 19, oy + 28), fill=STONE_BRIGHT)
    for nx in (cx - 17, cx - 11, cx - 5, cx + 1, cx + 7, cx + 13):
        d.rectangle((nx, oy + 25, nx + 2, oy + 28), fill=STONE_MID)

    # Wood floor inside the bastion (visible above parapet)
    d.rectangle((cx - 16, oy + 32, cx + 16, oy + 36), fill=WOOD_DARK)

    # Cannon — iron barrel protruding to the right of the bastion
    d.rectangle((cx - 6, oy + 38, cx + 22, oy + 50), fill=IRON_MID)
    # Barrel side-shading
    d.line((cx - 6, oy + 38, cx + 22, oy + 38), fill=IRON_HL)
    d.line((cx - 6, oy + 50, cx + 22, oy + 50), fill=IRON_DARK)
    # Brass bands
    for bx in (cx - 2, cx + 6, cx + 14):
        d.rectangle((bx, oy + 38, bx + 2, oy + 50), fill=BRASS_MID)
        d.line((bx, oy + 38, bx, oy + 50), fill=BRASS_LIGHT)
    # Cannon mouth (the dark hole)
    d.rectangle((cx + 18, oy + 41, cx + 22, oy + 47), fill=WINDOW_DARK)
    d.line((cx + 22, oy + 41, cx + 22, oy + 47), fill=BRASS_DARK)

    # Banner pole + small banner on top
    d.line((cx - 14, oy + 14, cx - 14, oy + 28), fill=BANNER_POLE)
    d.rectangle((cx - 14, oy + 14, cx - 6, oy + 22), fill=BANNER_BLUE)
    d.line((cx - 14, oy + 14, cx - 6, oy + 14), fill=BANNER_BLUE_L)
    d.line((cx - 6, oy + 14, cx - 6, oy + 22), fill=BANNER_BLUE_L)
    # Banner triangular cut
    d.polygon([(cx - 6, oy + 22), (cx - 10, oy + 19), (cx - 6, oy + 19)], fill=(0, 0, 0, 0))

    # Phase-specific muzzle effects
    if phase == FIRE:
        # Big bright muzzle flash + smoke
        d.ellipse((cx + 20, oy + 36, cx + 32, oy + 52), fill=FLASH_DEEP)
        d.ellipse((cx + 21, oy + 38, cx + 30, oy + 50), fill=FLASH_MID)
        d.ellipse((cx + 23, oy + 40, cx + 28, oy + 48), fill=FLASH_HOT)
        # Sparks
        d.point((cx + 30, oy + 36), fill=SPARK)
        d.point((cx + 33, oy + 44), fill=SPARK)
        d.point((cx + 28, oy + 52), fill=SPARK)
    elif phase == COOLDOWN:
        # Smoke wisps lazily from barrel
        d.ellipse((cx + 22, oy + 36, cx + 26, oy + 40), fill=SMOKE_LIGHT)
        d.ellipse((cx + 24, oy + 32, cx + 28, oy + 35), fill=SMOKE_DARK)
        d.point((cx + 26, oy + 28), fill=SMOKE_LIGHT)
    elif phase == CHARGE:
        # Glow inside the barrel
        d.point((cx + 19, oy + 44), fill=FLASH_MID)


def draw_sniper(d, ox, oy, phase):
    """Sniper Tower — the tallest of the three. Watchtower silhouette,
    pointed roof, scope/spyglass extending out the top window."""
    cx = ox + FRAME // 2
    base_pad(d, cx, oy + 60)

    # Stone base
    stone_blocks(d, cx - 11, oy + 50, cx + 11, oy + 60)
    d.rectangle((cx - 12, oy + 60, cx + 12, oy + 62), fill=STONE_DARK)

    # Wooden mid-body (long, slim)
    d.rectangle((cx - 7, oy + 22, cx + 7, oy + 50), fill=WOOD_MID)
    for px in (cx - 3, cx, cx + 3):
        d.line((px, oy + 22, px, oy + 50), fill=WOOD_DARK)
    d.line((cx - 7, oy + 22, cx + 7, oy + 22), fill=WOOD_LIGHT)
    d.line((cx - 6, oy + 23, cx - 6, oy + 49), fill=WOOD_LIGHT)
    # Iron straps
    d.rectangle((cx - 8, oy + 32, cx + 8, oy + 34), fill=IRON_DARK)
    d.rectangle((cx - 8, oy + 42, cx + 8, oy + 44), fill=IRON_DARK)

    # Stone crow's-nest at the top
    stone_block(d, cx - 9, oy + 16, cx + 9, oy + 22)
    # Window slits in crow's-nest
    d.rectangle((cx - 4, oy + 18, cx - 2, oy + 21), fill=WINDOW_DARK)
    d.rectangle((cx + 2, oy + 18, cx + 4, oy + 21), fill=WINDOW_DARK)

    # Slate steeper roof (gray-blue)
    SLATE_DARK = C(0x303642)
    SLATE_MID = C(0x4a5260)
    SLATE_LIGHT = C(0x6b7484)
    for i, w in enumerate([1, 3, 5, 7, 9]):
        y = oy + 6 + i * 2
        d.rectangle((cx - w, y, cx + w, y + 2), fill=SLATE_MID)
        d.line((cx - w, y, cx - w + 1, y), fill=SLATE_LIGHT)
        d.line((cx + w - 1, y + 1, cx + w, y + 1), fill=SLATE_DARK)
    d.line((cx, oy + 2, cx, oy + 6), fill=BANNER_POLE)

    # Spyglass / brass scope protruding from upper window
    d.rectangle((cx + 4, oy + 19, cx + 14, oy + 21), fill=IRON_DARK)
    d.rectangle((cx + 4, oy + 19, cx + 14, oy + 19), fill=IRON_HL)
    # Brass eye-piece collar
    d.rectangle((cx + 12, oy + 18, cx + 14, oy + 22), fill=BRASS_MID)
    d.point((cx + 13, oy + 18), fill=BRASS_LIGHT)

    # Phase-specific
    if phase == CHARGE:
        # Lens glint
        d.point((cx + 13, oy + 20), fill=SPARK)
    elif phase == FIRE:
        # Long thin muzzle flash from the spyglass tip
        d.line((cx + 14, oy + 20, cx + 24, oy + 20), fill=FLASH_HOT)
        d.point((cx + 22, oy + 20), fill=FLASH_DEEP)
    elif phase == COOLDOWN:
        # Tiny wisp
        d.point((cx + 16, oy + 18), fill=SMOKE_LIGHT)


def draw_wall(d, ox, oy, phase):
    """Coalition Wall — proper stone wall with crenellations, mortar
    lines, banner. Visually static; the wall doesn't really fire."""
    cx = ox + FRAME // 2

    # Ground line
    base_pad(d, cx, oy + 60)

    # Big stone wall body — full frame width
    stone_blocks(d, cx - 26, oy + 30, cx + 26, oy + 60, block_w=6, block_h=5)
    d.rectangle((cx - 27, oy + 60, cx + 27, oy + 62), fill=STONE_DARK)

    # Top edge highlight
    d.line((cx - 26, oy + 30, cx + 26, oy + 30), fill=STONE_BRIGHT)

    # Crenellations on top
    for nx in (-22, -14, -6, 2, 10, 18):
        x = cx + nx
        d.rectangle((x, oy + 22, x + 4, oy + 30), fill=STONE_MID)
        d.line((x, oy + 22, x + 3, oy + 22), fill=STONE_BRIGHT)
        d.line((x + 4, oy + 22, x + 4, oy + 30), fill=STONE_DARK)

    # Iron-banded gate panel mid-wall
    d.rectangle((cx - 7, oy + 38, cx + 7, oy + 60), fill=WOOD_MID)
    d.line((cx - 7, oy + 38, cx + 7, oy + 38), fill=WOOD_LIGHT)
    for px in (cx - 3, cx + 3):
        d.line((px, oy + 38, px, oy + 60), fill=WOOD_DARK)
    # Iron straps on gate
    for sy in (oy + 42, oy + 50, oy + 58):
        d.rectangle((cx - 7, sy, cx + 7, sy + 1), fill=IRON_DARK)
    # Iron ring handle
    d.ellipse((cx - 1, oy + 50, cx + 1, oy + 52), outline=IRON_DARK)

    # Red banner hanging from one of the crenellations
    d.line((cx + 8, oy + 22, cx + 8, oy + 38), fill=BANNER_POLE)
    d.rectangle((cx + 9, oy + 24, cx + 17, oy + 36), fill=BANNER_RED)
    d.line((cx + 9, oy + 24, cx + 17, oy + 24), fill=BANNER_RED_L)
    d.line((cx + 9, oy + 24, cx + 9, oy + 36), fill=BANNER_RED_L)
    # Triangular bottom cut
    d.polygon([(cx + 9, oy + 36), (cx + 13, oy + 33), (cx + 17, oy + 36)], fill=(0, 0, 0, 0))

    if phase == FIRE:
        # Tiny sparks above crenellations (boiling oil / arrows from the top)
        for sx in (-12, 0, 12):
            d.point((cx + sx, oy + 20), fill=FLASH_HOT)


def draw_briarroot(d, ox, oy, phase):
    """Briarroot — stone tower wrapped in thorny brown vines, crowned
    with iron thorns. Faction-neutral palette per locked design — no
    glowing magic — but with brown vine accents for character."""
    cx = ox + FRAME // 2
    base_pad(d, cx, oy + 60)

    # Stone foundation
    stone_blocks(d, cx - 14, oy + 48, cx + 14, oy + 60)
    d.rectangle((cx - 15, oy + 60, cx + 15, oy + 62), fill=STONE_DARK)

    # Stone tower body (smaller, cylindrical feel)
    stone_blocks(d, cx - 10, oy + 26, cx + 10, oy + 48, block_w=5, block_h=4)
    # Tower top edge
    d.line((cx - 10, oy + 26, cx + 10, oy + 26), fill=STONE_BRIGHT)

    # Thorny brown vines wrapping the tower
    VINE = C(0x3a2916)
    VINE_DARK = C(0x1f160c)
    THORN = C(0x6b3a1f)
    # Left-side vine wrapping up
    for ix, iy in [
        (cx - 9, oy + 56), (cx - 8, oy + 52), (cx - 11, oy + 48),
        (cx - 9, oy + 44), (cx - 12, oy + 40), (cx - 8, oy + 36),
        (cx - 11, oy + 32), (cx - 7, oy + 28),
    ]:
        d.point((ix, iy), fill=VINE)
        d.point((ix, iy + 1), fill=VINE_DARK)
    # Right-side vine
    for ix, iy in [
        (cx + 8, oy + 58), (cx + 11, oy + 54), (cx + 8, oy + 50),
        (cx + 11, oy + 46), (cx + 9, oy + 42), (cx + 12, oy + 38),
        (cx + 8, oy + 34), (cx + 11, oy + 30),
    ]:
        d.point((ix, iy), fill=VINE)
        d.point((ix - 1, iy + 1), fill=VINE_DARK)
    # Thorn pricks on the vines
    for tx, ty in [(cx - 11, oy + 46), (cx + 11, oy + 42), (cx - 8, oy + 34)]:
        d.point((tx, ty), fill=THORN)

    # Iron-thorn crown at the top
    SPIKE = C(0x14161b)
    SPIKE_HL = C(0x32363f)
    # Crown rim
    d.rectangle((cx - 11, oy + 24, cx + 11, oy + 26), fill=SPIKE)
    d.line((cx - 11, oy + 24, cx + 11, oy + 24), fill=SPIKE_HL)
    # Center tall spike
    d.line((cx, oy + 12, cx, oy + 24), fill=SPIKE)
    d.line((cx - 1, oy + 14, cx - 1, oy + 24), fill=SPIKE_HL)
    # Two side spikes (medium height)
    d.line((cx - 6, oy + 18, cx - 5, oy + 24), fill=SPIKE)
    d.line((cx + 5, oy + 18, cx + 6, oy + 24), fill=SPIKE)
    # Outer two short spikes
    d.line((cx - 10, oy + 20, cx - 9, oy + 24), fill=SPIKE)
    d.line((cx + 9, oy + 20, cx + 10, oy + 24), fill=SPIKE)
    # Cross-spikes between (small barbs)
    d.line((cx - 3, oy + 21, cx - 2, oy + 24), fill=SPIKE)
    d.line((cx + 2, oy + 21, cx + 3, oy + 24), fill=SPIKE)

    # Iron-banded door at base
    d.rectangle((cx - 4, oy + 38, cx + 4, oy + 48), fill=WOOD_DARK)
    d.line((cx - 4, oy + 38, cx + 4, oy + 38), fill=WOOD_MID)
    d.rectangle((cx - 4, oy + 42, cx + 4, oy + 43), fill=IRON_DARK)
    d.point((cx + 2, oy + 44), fill=IRON_HL)

    if phase == CHARGE:
        # Spikes vibrate — extra pixel above center spike
        d.point((cx, oy + 10), fill=SPIKE)
        d.point((cx - 5, oy + 16), fill=SPIKE_HL)
        d.point((cx + 5, oy + 16), fill=SPIKE_HL)
    elif phase == FIRE:
        # Iron thorn shoots out the side
        d.line((cx + 14, oy + 32, cx + 22, oy + 32), fill=SPIKE)
        d.point((cx + 22, oy + 31), fill=SPIKE_HL)
        # Tiny dust kick from the body
        d.point((cx + 12, oy + 34), fill=SMOKE_LIGHT)
    elif phase == COOLDOWN:
        # Empty notch in crown rim where the thorn was
        d.point((cx + 4, oy + 22), fill=STONE_DARK)


# ─── Main ────────────────────────────────────────────────────────

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

    for col, (name, drawer) in enumerate(DRAWERS):
        ox = col * FRAME
        for row in range(ROWS):
            oy = row * FRAME
            phase = row
            drawer(d, ox, oy, phase)

    img.save(OUT_PATH, optimize=True)
    print(f'  ✓ {OUT_PATH.relative_to(ROOT)}  ({SHEET_W}×{SHEET_H}, {OUT_PATH.stat().st_size // 1024}K)')


if __name__ == '__main__':
    main()
