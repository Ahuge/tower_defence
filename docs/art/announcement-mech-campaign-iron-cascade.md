# Art PRD — Iron Cascade announcement

## Context

In-game first-time announcement modal that pops up nearly full-screen on the main menu the first time a player opens the build after the Mechanical campaign shipped. Frames the launch of:

- The 10-mission Iron Cascade story arc (Vael vs Voss)
- The `final_sabotage` archetype (Workshop + Raider squad finale)
- The Suppression Pylon antagonist mechanic
- The auto-unlock of Mechanical as a playable faction on completion

Players see this once. Closing it marks it read; older announcements are re-readable from the mailbox panel inside the Settings screen.

## What it has to do

- Telegraph **"the second campaign is here, and the antagonist is mechanised"** at a glance
- Lean **antagonist-iconic** — unlike the first announcement (which celebrated a coalition assembling), this one foregrounds the threat the player is striking against
- Survive being scaled across desktop (16:9 landscape) and phone portrait (9:16)
- Read at low contrast against the modal scrim + foreground copy without competing

## Composition

**Hero subject**: a Mech-faction figure centre-frame — *the* Mech soldier / pilot / commander. Suggested shape:
- A single iconic Mech-soldier centrepiece, armoured, mid-stride or planted in stance. Visible weapon / equipment that reads as industrial-war (rifle, mech-glove, pauldron with rivets, exhaust vents on the back, etc.).
- Two to three smaller Mech-faction silhouettes flanking the centrepiece, slightly behind and out of focus — implies the column / army behind the hero figure. Crawler-scout / heavy walker silhouettes work well.
- Optional: a single faint Vael / Arcane silhouette far in the background — a single mage figure on a distant ridge, reading as resistance. Don't overweight; the visual story is "the Mech threat is real and the player will have to face it."
- Banner / standard prop with Voss's iron-cog sigil behind or above the centrepiece — the iron-cog motif from `mechanical_emblem.png` works.
- Sky / horizon line behind suggests Voss's industrial empire — smoke columns, a foundry silhouette, gear-stack mountains.

Reference image already in the repo: `public/assets/mechanical/mechanical_hero.png` should be the visual anchor for the centrepiece — same character, posed for hero-shot.

**Negative space**: the bottom 40% of the frame must be visually quiet — the modal renders headline + body copy stacked vertically over that region. Composition should weight subjects in the upper-third, not centre.

**Lighting direction**: warm rim light from the upper-left (matches the gold accent palette in the modal border + buttons) but with a secondary mech-orange / forge-fire under-glow lighting the centrepiece from below — reads as "the foundry's heat behind him." Deep cool shadows fill the lower thirds.

## Mood / palette

- Primary palette: dark navy / charcoal background (~`#15101a`, matches the app's `--bg-base`), with **mech-orange accent** for hero highlights and foundry under-glow (matches the `mechanical` faction `primaryColor` token — the same orange used for the modal accent border).
- Secondary tints:
  - Mech-faction bronze / iron / steel (greys + warm bronzes) on armour
  - Voss's signature suppression violet on one element (banner glow, sigil pulse, eyepiece) as a callback to the pylon mechanic
  - Background smoke / sky in cool desaturated navy — keeps the centrepiece warm and centre-of-attention
- Avoid: flat saturated comic-book colors, purely cinematic-realistic, anything that reads as a UI screenshot, any visible Arcane-coalition motifs (this announcement is about the *antagonist*, not the protagonist's faction)
- Closest reference in the codebase:
  - `public/assets/mechanical/mechanical_keyart.png` for palette + figure rendering style
  - `public/assets/announcements/campaigns_released_landscape.webp` for the announcement-shape composition (figure-forward, dark backdrop, negative space below)

## Deliverables

| File | Aspect | Resolution | Format |
|---|---|---|---|
| `assets/announcements/mech_campaign_iron_cascade_landscape.webp` | 16:9 | 1920×1080 | WebP, q≥85 |
| `assets/announcements/mech_campaign_iron_cascade_portrait.webp` | 9:16 | 1080×1920 | WebP, q≥85 |

The runtime picks landscape vs portrait via `useIsPortraitViewport()` (same pattern as `LoadingScreen` / `FactionUnlockSplash` / the existing `campaigns_released_*` files).

A landscape-only ship is acceptable if the portrait variant is genuinely a crop of the same composition — flag if the centrepiece would have to shift significantly between the two.

## Constraints

- **No baked-in text**. The headline ("Iron Cascade") is rendered as a Silkscreen-font DOM element on top of the image. The art must work with overlay text.
- **Bottom-left and bottom-right corners** must avoid bright detail — those zones get the close button + faction-accent border glow.
- **Centre vertical band** between roughly 35% and 65% horizontally must avoid hard rim-light highlights in the lower 40% — the headline overlay sits there. The centrepiece's chest / face is welcome there in the upper 60%, just not the rim-light hotspot.

## Until art lands

Modal renders with the existing fullscreen-overlay scrim (dark gradient + tinted noise) using `factionAccent: 'mechanical'` (mech-orange glow tint). No image fetch. The modal is shippable in this state — the art is enhancement, not blocker.

When the keyart lands, add the `heroArt` field to the announcement entry in `src/data/Announcements.ts`:

```ts
heroArt: 'assets/announcements/mech_campaign_iron_cascade_landscape.webp',
// optional:
heroArtPortrait: 'assets/announcements/mech_campaign_iron_cascade_portrait.webp',
```

## Acceptance

- Subject + lighting reads at 1080×1920 (portrait) WITHOUT cropping the centrepiece's face / shoulders / chest sigil
- Headline overlay (white-on-dark, ~64px Silkscreen, centre-screen) is legible against every region of the lower 40% in both aspects
- File sizes ≤ 250KB landscape, ≤ 200KB portrait
- Sits comfortably alongside the existing `campaigns_released` keyart in tone (not louder, not muddier) — same dark navy backdrop, complementary warm accent, similar figure scale
- Antagonist read: a player who has never opened the campaign menu should see this and understand "the next campaign's enemy is mechanised and organised" without reading a word of body copy
