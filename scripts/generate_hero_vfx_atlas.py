#!/usr/bin/env python3
"""
generate_hero_vfx_atlas.py — hero ability VFX atlases per
`notes/art_prds/03_hero_ability_vfx_atlas.md`.

Output: `public/assets/heroes/vfx/<heroId>_<abilityKey>.png` (384x64).
- 6 frames horizontal strip at 64x64 each.
- 18 fps, play once.
- Anticipation (0-1) → peak (2-3) → decay (4-5) cadence.

v1 ships 12 sheets: mage / ranger / paladin × Q / W / E / R.

Per-ability picks one of four "vfx archetypes":
- burst:  radial impact spikes (single-target hits, projectile lands)
- ring:   expanding AoE ring (Blizzard, Holy Light, Multi-Shot fan)
- aura:   centered self-cast aura (Mirror Image, Trap, Divine Shield)
- beam:   vertical beam + ground flare (Meteor, Hunter's Mark, Judgment)

Each archetype renders the same cadence with different shapes; per
ability we pick the archetype + 2-color palette tied to the hero's
faction.

Pixel art discipline matches in-game creep VFX:
- 1 px outlines (secondary color)
- 3-color palette (base / shadow / highlight)
- No AA, NEAREST filter

Run:
  python3 scripts/generate_hero_vfx_atlas.py
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'assets' / 'heroes' / 'vfx'

FRAME = 64
FRAMES = 6
W = FRAME * FRAMES  # 384
H = FRAME

# Hero -> (primary, secondary) tuned to PRD palette guidance.
HERO_PALETTE: dict[str, tuple[int, int]] = {
    # mage = arcane purple
    'arcanist': (0xaa44ff, 0xdd99ff),
    # ranger = nature green
    'ranger':  (0x33dd55, 0x99ff99),
    # paladin = celestial gold
    'paladin': (0xffdd44, 0xffff99),
}

# Ability archetype assignment per PRD.
ABILITY_ARCHETYPES: dict[str, dict[str, str]] = {
    'arcanist': {
        'Q': 'burst',  # Frostbolt
        'W': 'ring',   # Blizzard
        'E': 'aura',   # Mirror Image
        'R': 'beam',   # Meteor
    },
    'ranger': {
        'Q': 'burst',  # Power Shot
        'W': 'ring',   # Multi-Shot fan
        'E': 'aura',   # Trap
        'R': 'beam',   # Hunter's Mark
    },
    'paladin': {
        'Q': 'burst',  # Hammer Slam
        'W': 'ring',   # Holy Light
        'E': 'aura',   # Divine Shield
        'R': 'beam',   # Judgment
    },
}

CX = FRAME // 2
CY = FRAME // 2


def hex_to_rgb(c: int):
    return ((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)


def darken(rgb, k):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb, k):
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


# ─── archetype renderers ─────────────────────────────────────────────
# Each takes (draw, frame_idx, primary, secondary) and paints into a
# transparent 64x64 frame. Frame index 0..5 drives anticipation /
# peak / decay automatically.

def render_burst(d, f, primary, secondary):
    """Radial impact with spikes. Anticipation: small dot. Peak:
    large radial burst with 8 spikes. Decay: spikes recede."""
    p = primary + (255,)
    s = secondary + (255,)
    h = lighten(primary, 0.5) + (255,)
    o = darken(primary, 0.5) + (255,)

    if f == 0:
        # Tiny anticipation spark
        d.ellipse((CX - 2, CY - 2, CX + 2, CY + 2), fill=h)
    elif f == 1:
        # Slightly bigger pre-burst
        d.ellipse((CX - 5, CY - 5, CX + 5, CY + 5), fill=p, outline=o)
        d.ellipse((CX - 2, CY - 2, CX + 2, CY + 2), fill=h)
    elif f == 2:
        # Peak burst — radial spikes + glowing core
        for ang_deg in range(0, 360, 45):
            import math
            r = math.radians(ang_deg)
            x1 = int(CX + math.cos(r) * 8)
            y1 = int(CY + math.sin(r) * 8)
            x2 = int(CX + math.cos(r) * 26)
            y2 = int(CY + math.sin(r) * 26)
            d.line((x1, y1, x2, y2), fill=p, width=3)
            d.line((x1, y1, x2, y2), fill=h)
        d.ellipse((CX - 12, CY - 12, CX + 12, CY + 12), fill=p, outline=o)
        d.ellipse((CX - 6, CY - 6, CX + 6, CY + 6), fill=h)
    elif f == 3:
        # Just past peak — softer, shorter spikes
        for ang_deg in range(0, 360, 45):
            import math
            r = math.radians(ang_deg)
            x1 = int(CX + math.cos(r) * 10)
            y1 = int(CY + math.sin(r) * 10)
            x2 = int(CX + math.cos(r) * 22)
            y2 = int(CY + math.sin(r) * 22)
            d.line((x1, y1, x2, y2), fill=s, width=2)
        d.ellipse((CX - 9, CY - 9, CX + 9, CY + 9), fill=p, outline=o)
        d.ellipse((CX - 4, CY - 4, CX + 4, CY + 4), fill=h)
    elif f == 4:
        # Fade — soft halo, no spikes
        d.ellipse((CX - 14, CY - 14, CX + 14, CY + 14), outline=s, width=1)
        d.ellipse((CX - 5, CY - 5, CX + 5, CY + 5), fill=p, outline=o)
    else:
        # Almost gone
        d.ellipse((CX - 16, CY - 16, CX + 16, CY + 16), outline=s, width=1)
        d.point((CX, CY), fill=h)


def render_ring(d, f, primary, secondary):
    """Expanding AoE ring."""
    p = primary + (255,)
    s = secondary + (255,)
    h = lighten(primary, 0.5) + (255,)
    o = darken(primary, 0.5) + (255,)

    if f == 0:
        d.ellipse((CX - 4, CY - 4, CX + 4, CY + 4), fill=h)
    elif f == 1:
        d.ellipse((CX - 10, CY - 10, CX + 10, CY + 10), outline=p, width=2)
        d.ellipse((CX - 3, CY - 3, CX + 3, CY + 3), fill=h)
    elif f == 2:
        d.ellipse((CX - 18, CY - 18, CX + 18, CY + 18), outline=p, width=3)
        d.ellipse((CX - 14, CY - 14, CX + 14, CY + 14), outline=h, width=1)
        # Sparkle dots around ring
        import math
        for ang_deg in range(0, 360, 60):
            r = math.radians(ang_deg)
            sx = int(CX + math.cos(r) * 22)
            sy = int(CY + math.sin(r) * 22)
            d.ellipse((sx - 1, sy - 1, sx + 1, sy + 1), fill=h)
    elif f == 3:
        d.ellipse((CX - 24, CY - 24, CX + 24, CY + 24), outline=p, width=2)
        d.ellipse((CX - 20, CY - 20, CX + 20, CY + 20), outline=s, width=1)
    elif f == 4:
        d.ellipse((CX - 28, CY - 28, CX + 28, CY + 28), outline=s, width=1)
    else:
        d.ellipse((CX - 30, CY - 30, CX + 30, CY + 30), outline=darken(secondary, 0.7) + (255,), width=1)


def render_aura(d, f, primary, secondary):
    """Centered self-cast aura with rays."""
    p = primary + (255,)
    s = secondary + (255,)
    h = lighten(primary, 0.5) + (255,)
    o = darken(primary, 0.5) + (255,)
    import math

    if f == 0:
        d.ellipse((CX - 3, CY - 3, CX + 3, CY + 3), fill=h)
    elif f == 1:
        d.ellipse((CX - 8, CY - 8, CX + 8, CY + 8), fill=p, outline=o)
        for ang_deg in range(0, 360, 60):
            r = math.radians(ang_deg)
            sx = int(CX + math.cos(r) * 14)
            sy = int(CY + math.sin(r) * 14)
            d.line((CX, CY, sx, sy), fill=s)
    elif f == 2:
        d.ellipse((CX - 14, CY - 14, CX + 14, CY + 14), fill=p, outline=o)
        d.ellipse((CX - 8, CY - 8, CX + 8, CY + 8), fill=h)
        # Rays
        for ang_deg in range(0, 360, 30):
            r = math.radians(ang_deg)
            x1 = int(CX + math.cos(r) * 16)
            y1 = int(CY + math.sin(r) * 16)
            x2 = int(CX + math.cos(r) * 28)
            y2 = int(CY + math.sin(r) * 28)
            d.line((x1, y1, x2, y2), fill=s, width=2)
    elif f == 3:
        d.ellipse((CX - 12, CY - 12, CX + 12, CY + 12), fill=p, outline=o)
        for ang_deg in range(15, 360, 30):
            r = math.radians(ang_deg)
            x1 = int(CX + math.cos(r) * 14)
            y1 = int(CY + math.sin(r) * 14)
            x2 = int(CX + math.cos(r) * 24)
            y2 = int(CY + math.sin(r) * 24)
            d.line((x1, y1, x2, y2), fill=s, width=1)
    elif f == 4:
        d.ellipse((CX - 8, CY - 8, CX + 8, CY + 8), outline=p, width=1)
        d.ellipse((CX - 14, CY - 14, CX + 14, CY + 14), outline=s, width=1)
    else:
        d.ellipse((CX - 16, CY - 16, CX + 16, CY + 16), outline=darken(secondary, 0.7) + (255,), width=1)


def render_beam(d, f, primary, secondary):
    """Vertical beam descending from above + ground flare."""
    p = primary + (255,)
    s = secondary + (255,)
    h = lighten(primary, 0.5) + (255,)
    o = darken(primary, 0.5) + (255,)

    if f == 0:
        # Sky telegraph — small marker at top, ground hint at bottom
        d.line((CX, 0, CX, 8), fill=s, width=1)
        d.ellipse((CX - 4, FRAME - 6, CX + 4, FRAME - 2), outline=s, width=1)
    elif f == 1:
        # Beam descending halfway
        d.rectangle((CX - 2, 0, CX + 2, FRAME // 2), fill=p, outline=o)
        d.ellipse((CX - 6, FRAME - 8, CX + 6, FRAME - 2), outline=p, width=1)
    elif f == 2:
        # Peak beam + ground impact
        d.rectangle((CX - 4, 0, CX + 4, FRAME - 4), fill=p, outline=o)
        d.rectangle((CX - 1, 0, CX + 1, FRAME - 4), fill=h)
        # Ground flare
        d.ellipse((CX - 18, FRAME - 14, CX + 18, FRAME - 2), fill=p, outline=o)
        d.ellipse((CX - 12, FRAME - 12, CX + 12, FRAME - 2), fill=h)
    elif f == 3:
        # Beam fading, flare at peak
        d.rectangle((CX - 2, 8, CX + 2, FRAME - 4), fill=p, outline=o)
        d.ellipse((CX - 22, FRAME - 16, CX + 22, FRAME - 2), fill=s, outline=o)
        d.ellipse((CX - 14, FRAME - 14, CX + 14, FRAME - 2), fill=p)
    elif f == 4:
        # Just flare residue
        d.ellipse((CX - 24, FRAME - 16, CX + 24, FRAME - 2), outline=s, width=1)
        d.ellipse((CX - 16, FRAME - 14, CX + 16, FRAME - 2), outline=p, width=1)
    else:
        # Almost gone
        d.ellipse((CX - 26, FRAME - 14, CX + 26, FRAME - 2), outline=darken(secondary, 0.7) + (255,), width=1)


ARCHETYPE_FN = {
    'burst': render_burst,
    'ring':  render_ring,
    'aura':  render_aura,
    'beam':  render_beam,
}


def render_sheet(hero: str, key: str) -> Image.Image:
    primary = hex_to_rgb(HERO_PALETTE[hero][0])
    secondary = hex_to_rgb(HERO_PALETTE[hero][1])
    archetype = ABILITY_ARCHETYPES[hero][key]
    fn = ARCHETYPE_FN[archetype]

    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for f in range(FRAMES):
        frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        fn(d, f, primary, secondary)
        sheet.paste(frame, (FRAME * f, 0))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    n = 0
    for hero in HERO_PALETTE:
        for key in ('Q', 'W', 'E', 'R'):
            sheet = render_sheet(hero, key)
            out_path = OUT_DIR / f'{hero}_{key}.png'
            sheet.save(out_path, 'PNG')
            size_kb = out_path.stat().st_size / 1024
            print(f'  ✓ {out_path.relative_to(ROOT)}  ({W}x{H}, {size_kb:.1f}K)')
            n += 1
    print(f'Generated {n} ability VFX sheets → {OUT_DIR.relative_to(ROOT)}/')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
