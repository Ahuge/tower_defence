"""Shared palette + motif data for arena art generators.

Each faction has 3 colors: primary (body), secondary (highlight),
tertiary (glow/accent). The tertiary is the recognizable "pop"
color — runes, ember, lava-cracks, neon, halo-light. Used
consistently across base art + floor accent tiles + future ability
VFX so the player can identify a faction at a glance.

Motif sets define faction-specific small shapes that the art
generators can scatter onto ground tiles or layer onto bases.
"""

FACTION_PALETTE: dict[str, dict[str, int]] = {
    'arcane': {
        'primary':   0x6644ff,  # deep violet body
        'secondary': 0x9988ff,  # lavender body lit
        'tertiary':  0xffd966,  # warm gold runes (pop)
    },
    'mechanical': {
        'primary':   0xcc8833,  # bronze body
        'secondary': 0xeebb66,  # bronze highlight
        'tertiary':  0xffaa22,  # furnace orange glow
    },
    'nature': {
        'primary':   0x33aa44,  # forest green body
        'secondary': 0x66dd77,  # leaf highlight
        'tertiary':  0xffee66,  # leaf-pollen yellow (pop)
    },
    'void': {
        'primary':   0x8822aa,  # deep purple body
        'secondary': 0xbb55dd,  # rift lavender
        'tertiary':  0xff44aa,  # magenta rift glow
    },
    'military': {
        'primary':   0x556b2f,  # olive body
        'secondary': 0x8fbc8f,  # tan highlight
        'tertiary':  0xff5544,  # red-tracer accent (pop)
    },
    'aliens': {
        'primary':   0x88ff44,  # toxic green body
        'secondary': 0xaaff66,  # green-yellow lit
        'tertiary':  0xff44ee,  # magenta vein/ichor (pop)
    },
    'cypherpunk': {
        'primary':   0x00ffcc,  # cyan body
        'secondary': 0x44ffdd,  # cyan-light
        'tertiary':  0xff44aa,  # neon magenta (pop)
    },
    'infernal': {
        'primary':   0xff4422,  # red-orange body
        'secondary': 0xff8844,  # orange highlight
        'tertiary':  0xffe066,  # ember yellow (pop)
    },
    'celestial': {
        'primary':   0xffffaa,  # ivory body
        'secondary': 0xffffff,  # white highlight
        'tertiary':  0xffcc44,  # gold halo (pop)
    },
    'psionic': {
        'primary':   0xdd88ff,  # violet-pink body
        'secondary': 0xee99ff,  # lighter violet
        'tertiary':  0xff66cc,  # hot magenta brain pulse
    },
    'harmonic': {
        'primary':   0xffcc44,  # gold body
        'secondary': 0xffee88,  # gold highlight
        'tertiary':  0xffffff,  # prism white (pop)
    },
    # Coalition — generic pre-Arcane kit. Faction-neutral steel + leather +
    # grey-stone. No glow accent; "tertiary" reuses leather brown rather
    # than a magic pop color so Coalition reads visually mundane.
    'coalition': {
        'primary':   0x9aa3ad,  # steel grey body
        'secondary': 0xc8cfd6,  # light steel highlight
        'tertiary':  0x4a4035,  # leather brown (no glow — Coalition is non-magic)
    },
}


def hex_to_rgb(c: int):
    return ((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)


def darken(rgb, k: float):
    return tuple(max(0, min(255, int(c * k))) for c in rgb)


def lighten(rgb, k: float):
    return tuple(max(0, min(255, int(c + (255 - c) * k))) for c in rgb)


def rgba(rgb, a: int = 255):
    return (rgb[0], rgb[1], rgb[2], a)


def faction_palette(faction: str) -> dict:
    """Returns full art palette for a faction:
       primary / secondary / tertiary (raw RGB),
       deep / shadow / mid / highlight / specular (derived from primary),
       outline (darkened primary),
       glow_dim / glow_mid / glow_bright (derived from tertiary)."""
    p = FACTION_PALETTE[faction]
    primary = hex_to_rgb(p['primary'])
    secondary = hex_to_rgb(p['secondary'])
    tertiary = hex_to_rgb(p['tertiary'])
    return {
        'primary':   primary,
        'secondary': secondary,
        'tertiary':  tertiary,
        'deep':      darken(primary, 0.30),
        'shadow':    darken(primary, 0.55),
        'mid':       primary,
        'highlight': lighten(primary, 0.30),
        'specular':  lighten(secondary, 0.50),
        'outline':   darken(primary, 0.25),
        'glow_dim':  darken(tertiary, 0.55),
        'glow_mid':  tertiary,
        'glow_bright': lighten(tertiary, 0.50),
    }


# ─── Faction motif id → "what to scatter on ground tiles" ───────────
# Each motif renderer takes (draw, x, y, palette) and stamps a small
# faction-specific texture mark. Used in render_ground_tile to give
# every faction its recognizable ambient texture (rivets for mech,
# circuit traces for cypherpunk, lava cracks for infernal, etc).

def motif_arcane_speck(d, x, y, pal):
    """Tiny 4-point sparkle in tertiary gold."""
    glow = rgba(pal['glow_mid'])
    d.point((x, y), fill=glow)
    d.point((x + 1, y), fill=rgba(pal['glow_dim']))
    d.point((x, y + 1), fill=rgba(pal['glow_dim']))


def motif_mech_rivet(d, x, y, pal):
    """Round rivet head with shaded edge."""
    d.point((x, y), fill=rgba(pal['outline']))
    d.point((x + 1, y), fill=rgba(pal['outline']))
    d.point((x, y + 1), fill=rgba(pal['highlight']))


def motif_nature_flower(d, x, y, pal):
    """Tiny pollen-yellow speck on leaf."""
    d.point((x, y), fill=rgba(pal['glow_mid']))


def motif_void_crack(d, x, y, pal):
    """Magenta rift crack — diagonal line of 3 pixels."""
    d.point((x, y), fill=rgba(pal['glow_dim']))
    d.point((x + 1, y + 1), fill=rgba(pal['glow_mid']))
    d.point((x + 2, y + 2), fill=rgba(pal['glow_dim']))


def motif_military_pebble(d, x, y, pal):
    """Small gravel pebble with shadow."""
    d.point((x, y), fill=rgba(pal['highlight']))
    d.point((x + 1, y), fill=rgba(pal['shadow']))


def motif_aliens_vein(d, x, y, pal):
    """Pulsing magenta vein dot."""
    d.point((x, y), fill=rgba(pal['glow_mid']))
    d.point((x + 1, y), fill=rgba(pal['glow_dim']))


def motif_cypherpunk_trace(d, x, y, pal):
    """Tiny circuit-trace L."""
    d.point((x, y), fill=rgba(pal['glow_mid']))
    d.point((x + 1, y), fill=rgba(pal['glow_mid']))
    d.point((x + 1, y + 1), fill=rgba(pal['glow_dim']))


def motif_infernal_ember(d, x, y, pal):
    """Hot ember pixel with halo."""
    d.point((x, y), fill=rgba(pal['glow_bright']))
    d.point((x + 1, y), fill=rgba(pal['glow_dim']))


def motif_celestial_glint(d, x, y, pal):
    """Gold glint — tiny cross."""
    d.point((x, y), fill=rgba(pal['glow_mid']))
    d.point((x - 1, y), fill=rgba(pal['glow_dim']))
    d.point((x + 1, y), fill=rgba(pal['glow_dim']))
    d.point((x, y - 1), fill=rgba(pal['glow_dim']))
    d.point((x, y + 1), fill=rgba(pal['glow_dim']))


def motif_psionic_pulse(d, x, y, pal):
    """Pulsing brain-coral pink dot."""
    d.point((x, y), fill=rgba(pal['glow_mid']))
    d.point((x + 1, y + 1), fill=rgba(pal['glow_dim']))


def motif_harmonic_prism(d, x, y, pal):
    """Tiny diamond prism with white center."""
    d.point((x, y), fill=rgba(pal['glow_bright']))
    d.point((x + 1, y), fill=rgba(pal['glow_dim']))
    d.point((x, y + 1), fill=rgba(pal['glow_dim']))


GROUND_MOTIF: dict[str, callable] = {
    'arcane':     motif_arcane_speck,
    'mechanical': motif_mech_rivet,
    'nature':     motif_nature_flower,
    'void':       motif_void_crack,
    'military':   motif_military_pebble,
    'aliens':     motif_aliens_vein,
    'cypherpunk': motif_cypherpunk_trace,
    'infernal':   motif_infernal_ember,
    'celestial':  motif_celestial_glint,
    'psionic':    motif_psionic_pulse,
    'harmonic':   motif_harmonic_prism,
}


# Per-faction "ground texture treatment" — overlaid on top of the
# dithered base. These are larger features than the ambient motifs:
# brick lines for arcane, plate seams for mech, leaf debris for nature.

def texture_arcane_runeline(d, tw, th, pal):
    """Faint geometric rune lines along tile edges."""
    # 1-pixel diagonal rune flecks scattered light, plus a faint
    # central seam line. The motif speck handles the bright runes
    # separately.
    d.line((0, th // 2, tw // 4, th // 2), fill=rgba(pal['shadow']))
    d.line((3 * tw // 4, th // 2, tw, th // 2), fill=rgba(pal['shadow']))


def texture_mech_plates(d, tw, th, pal):
    """Iron plate seams + horizontal joint."""
    d.line((0, th // 2 - 1, tw, th // 2 - 1), fill=rgba(pal['shadow']))
    d.line((0, th // 2, tw, th // 2), fill=rgba(pal['highlight']))


def texture_nature_grass(d, tw, th, pal):
    """Tiny grass blades scattered."""
    for x in range(2, tw, 5):
        d.line((x, th - 4, x, th - 2), fill=rgba(pal['secondary']))
        d.line((x + 1, th - 5, x + 1, th - 2), fill=rgba(pal['secondary']))


def texture_void_fissure(d, tw, th, pal):
    """Faint fissure crack across the tile."""
    d.line((0, th // 3, tw // 2, th // 2), fill=rgba(pal['outline']))
    d.line((tw // 2, th // 2, tw, 2 * th // 3), fill=rgba(pal['outline']))


def texture_military_tread(d, tw, th, pal):
    """Tire-tread style horizontal stripes."""
    for y in (th // 3, 2 * th // 3):
        for x in range(0, tw, 3):
            d.line((x, y, x + 1, y), fill=rgba(pal['shadow']))


def texture_aliens_pores(d, tw, th, pal):
    """Bio-pore dots scattered."""
    for cx, cy in ((tw // 4, th // 4), (3 * tw // 4, 2 * th // 3),
                   (tw // 2, th // 2)):
        d.point((cx, cy), fill=rgba(pal['glow_dim']))


def texture_cypherpunk_grid(d, tw, th, pal):
    """Faint circuit grid lines."""
    d.line((tw // 2, 0, tw // 2, th), fill=rgba(pal['shadow']))
    d.line((0, th // 2, tw, th // 2), fill=rgba(pal['shadow']))
    d.point((tw // 2, th // 2), fill=rgba(pal['glow_dim']))


def texture_infernal_lava(d, tw, th, pal):
    """Lava-crack network with glow underneath."""
    d.line((0, th // 2, tw // 3, th // 3), fill=rgba(pal['glow_dim']))
    d.line((tw // 3, th // 3, 2 * tw // 3, th // 2), fill=rgba(pal['glow_mid']))
    d.line((2 * tw // 3, th // 2, tw, 2 * th // 3), fill=rgba(pal['glow_dim']))


def texture_celestial_marble(d, tw, th, pal):
    """Marble-vein gold streaks."""
    d.line((0, th // 4, tw // 3, th // 5), fill=rgba(pal['glow_dim']))
    d.line((2 * tw // 3, 3 * th // 4, tw, 4 * th // 5), fill=rgba(pal['glow_dim']))


def texture_psionic_membrane(d, tw, th, pal):
    """Pulsing membrane swirl."""
    d.arc((-2, 0, tw + 2, th * 3 // 2), start=180, end=360, fill=rgba(pal['shadow']))


def texture_harmonic_geom(d, tw, th, pal):
    """Geometric crystal pattern — small triangle on each tile."""
    d.polygon([(tw // 2, th // 4), (tw // 2 + 3, th // 2),
               (tw // 2 - 3, th // 2)], outline=rgba(pal['shadow']))


GROUND_TEXTURE: dict[str, callable] = {
    'arcane':     texture_arcane_runeline,
    'mechanical': texture_mech_plates,
    'nature':     texture_nature_grass,
    'void':       texture_void_fissure,
    'military':   texture_military_tread,
    'aliens':     texture_aliens_pores,
    'cypherpunk': texture_cypherpunk_grid,
    'infernal':   texture_infernal_lava,
    'celestial':  texture_celestial_marble,
    'psionic':    texture_psionic_membrane,
    'harmonic':   texture_harmonic_geom,
}
