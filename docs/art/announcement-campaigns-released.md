# Art PRD — Campaigns Released announcement

## Context

In-game first-time announcement modal that pops up nearly full-screen on the main menu the first time a player opens the build after the campaign system shipped. Frames the launch of:

- The campaign framework + Arcane M1–M10 storyline
- The faction tree unlock route (Shards → campaign → playable)
- Mission archetypes (Boss Rush, Speedrun, Hero Duel, Final Showdown, etc.)
- The Plan-3 SplashScreen first-launch onboarding

Players see this once. Closing it marks it read; older announcements are re-readable from the mailbox panel inside the Settings screen.

## What it has to do

- Telegraph **"campaigns are here, this is a major drop"** at a glance
- Lean aspirational, not instructional — the body copy carries the actual feature list
- Survive being scaled across desktop (16:9 landscape) and phone portrait (9:16)
- Read at low contrast against the modal scrim + foreground copy without competing

## Composition

**Hero subject**: a coalition of the campaign factions — implied "the heroes assemble" tone. Suggested shape:
- Three to five iconic silhouettes from the shipped campaign factions (Arcane mage, Mech soldier, Nature druid, etc.) staggered in depth
- Centre-frame focus on Arcane (the campaign that's actually content-complete in this drop)
- Banner / standard prop in the foreground or behind the figures — flag-of-coalition motif
- Sky / horizon line behind them suggests the campaign-map vista (mountain range, distant spire, etc.)

**Negative space**: the bottom 40% of the frame must be visually quiet — the modal renders headline + body copy stacked vertically over that region. Composition should weight subjects in the upper-third, not centre.

**Lighting direction**: warm rim light from the upper-left (matches the gold accent palette in the modal border + buttons). Deep cool shadows fill the lower thirds.

## Mood / palette

- Primary palette: dark navy / charcoal background (~`#15101a`, matches the app's `--bg-base`), with **gold accent** for hero highlights and rim lighting (matches `--gold` token across the app)
- Secondary tints: each faction's signature color in their respective figure, but desaturated so no single faction dominates
- Avoid: flat saturated comic-book colors, purely cinematic-realistic, anything that reads as a UI screenshot
- Closest reference in the codebase: the existing `FactionUnlockSplash` keyart treatment, but more theatrical and less faction-locked

## Deliverables

| File | Aspect | Resolution | Format |
|---|---|---|---|
| `assets/announcements/campaigns_released_landscape.webp` | 16:9 | 1920×1080 | WebP, q≥85 |
| `assets/announcements/campaigns_released_portrait.webp` | 9:16 | 1080×1920 | WebP, q≥85 |

The runtime picks landscape vs portrait via `useIsPortraitViewport()` (same pattern as `LoadingScreen` / `FactionUnlockSplash`).

A landscape-only ship is acceptable if the portrait variant is genuinely a crop of the same composition — flag if the subject would have to shift significantly between the two.

## Constraints

- **No baked-in text**. The headline ("Campaigns Released" or whatever copy lands) is rendered as a Silkscreen-font DOM element on top of the image. The art must work with overlay text.
- **Bottom-left and bottom-right corners** must avoid bright detail — those zones get the close button + faction-accent border glow.
- **Centre vertical band** between roughly 35% and 65% horizontally must avoid hard rim-light highlights — the headline overlay sits there.

## Until art lands

Modal renders with the existing fullscreen-overlay scrim (dark gradient + tinted noise) using `factionAccent: 'arcane'` (purple-violet glow tint). No image fetch. The modal is shippable in this state — the art is enhancement, not blocker.

## Acceptance

- Subject + lighting reads at 1080×1920 (portrait) WITHOUT cropping the hero figures' faces / shoulders
- Headline overlay (white-on-dark, ~64px Silkscreen, centre-screen) is legible against every region of the lower 40% in both aspects
- File sizes ≤ 250KB landscape, ≤ 200KB portrait
- Sits comfortably alongside the existing FactionUnlockSplash keyart in tone (not louder, not muddier)
