/**
 * SnakeEyesPalette — single source of truth for the Snake Eyes
 * campaign's UI palette across panels.
 *
 * The lobby (CampaignLobbyScreen) uses Factions.void.primaryColor
 * (0x8822aa) for the campaign's frame + keyart accents — that's the
 * BRIGHT primary. Snake Eyes' own panels (VoidStatePanel /
 * PactbookPanel / SnakeEyesEndingPanel) use this softer sibling
 * palette INSIDE the frame — bright primary frames the content,
 * calmer secondaries live within. The two-palette read is intentional.
 *
 * If you find yourself adding a new hex to a Snake Eyes UI file,
 * add it here first. The audit caught three panels independently
 * hardcoding the same hexes — drift risk was real.
 */

export const SNAKE_EYES_PALETTE = {
  /** Body / surface violet. Used for panel borders, T1 wager tile
   *  borders, headings, button accents. Softer than
   *  Factions.void.primaryColor so it sits well on dark backgrounds
   *  without competing with the lobby frame. */
  violet: '#a288d0',
  /** T2 + accent. The House's gold. Used for tier-2 wager borders,
   *  Divergence chip, "tableau" framing on M10. */
  gold: '#d4b04a',
  /** T3 / danger tile. Used for tier-3 wager borders. */
  redT3: '#d04848',
  /** Settled-with-the-House success state (negative Debt). */
  settledGreen: 'rgba(60, 200, 90, 0.9)',
  /** Lost-this-Wager / general red bad-state. */
  lossRed: 'rgba(220, 80, 80, 0.85)',
  /** Card-back gradient stops (dark → darker, playing-card style). */
  cardBack: {
    from: 'rgba(40, 24, 60, 0.95)',
    to: 'rgba(20, 14, 32, 0.95)',
  },
  /** Card-face background (M10 reveal). */
  cardFace: 'rgba(8, 4, 16, 0.95)',
  /** Panel surface backgrounds. */
  surface: {
    /** Lobby state panel. */
    statePanel: 'rgba(16, 8, 24, 0.4)',
    /** Pactbook tier-1 wager tile body. */
    tile1: 'rgba(40, 30, 60, 0.6)',
    /** Pactbook tier-2 tile body. */
    tile2: 'rgba(50, 40, 20, 0.6)',
    /** Pactbook tier-3 tile body. */
    tile3: 'rgba(55, 24, 30, 0.6)',
    /** Decline button. */
    decline: 'rgba(40, 40, 50, 0.5)',
    /** M10 ending panel. */
    ending: 'rgba(16, 8, 24, 0.55)',
  },
  /** Border variants. */
  border: {
    /** State panel outer border. */
    statePanel: 'rgba(162, 136, 208, 0.3)',
    /** Translucent violet at 55% — used for the M10 ending panel border. */
    endingViolet: '#a288d055',
    /** Subtle white for the decline button + dividers. */
    subtle: 'rgba(255,255,255,0.18)',
    /** Faint white for tally-chip dividers. */
    fainter: 'rgba(255,255,255,0.08)',
    /** Card-face-divider inside tile (separates summary from body). */
    cardDivider: 'rgba(255,255,255,0.1)',
  },
  /** Tick mark on the Debt meter. */
  meterTick: 'rgba(255,255,255,0.4)',
  /** Bar background behind the Debt fill. */
  meterTrack: 'rgba(0,0,0,0.4)',
} as const;

/** Helper: per-tier border + body palette for the Pactbook tiles.
 *  Order is [T1, T2, T3]; index by `wager.tier - 1`. */
export const TIER_PALETTE: ReadonlyArray<{ border: string; bg: string; label: string }> = [
  { border: SNAKE_EYES_PALETTE.violet, bg: SNAKE_EYES_PALETTE.surface.tile1, label: 'Tier 1' },
  { border: SNAKE_EYES_PALETTE.gold,   bg: SNAKE_EYES_PALETTE.surface.tile2, label: 'Tier 2' },
  { border: SNAKE_EYES_PALETTE.redT3,  bg: SNAKE_EYES_PALETTE.surface.tile3, label: 'Tier 3' },
] as const;
