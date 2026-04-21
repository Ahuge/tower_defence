# Factions — Copy Rewrite Index

Every piece of player-facing copy in the game, grouped by domain. Edit each file; apply changes back to the TypeScript source by hand; re-run the extractor to confirm.

```
node scripts/extract-game-text.mjs
```

## Files

- [tutorial.md](tutorial.md) — Every tutorial step's title, body, and CTA label, plus the track-level name/summary. Ordered by source file appearance — which matches gameplay order within each track.
- [factions.md](factions.md) — The short faction-identity blurbs shown on Faction Select cards, the LoadingScreen tagline, and the in-game tower-pick summary.
- [towers.md](towers.md) — One entry per tower across all 12 factions. Tower tooltips pull from these fields directly.
- [heroes.md](heroes.md) — Hero cards in Hero Select + in-game hero HUD.
- [creeps.md](creeps.md) — Creep inspector panel text + wave preview tooltips.
- [maps.md](maps.md) — Menu map-picker tooltips + LoadingScreen map line. The Gauntlet JSON maps under src/data/maps/ are separate — only the map metadata defined in-code is extracted here.
- [draft-modifiers.md](draft-modifiers.md) — The Gold Rush / Glass Cannon / etc. cards shown between Faction Select and match start.
- [skins.md](skins.md) — Skin names + one-line descriptions — shown in the Store "Skins" tab and on roll-result cards. Rarity labels are separate (see RARITY_LABELS in the source).

## Not covered here

- Achievement labels (`src/data/Achievements.ts`) — only one entry (`FIRST_WIN`); edit directly.
- UI button text, headers, section titles — hardcoded in `src/ui/screens/*.tsx`. A future pass could extract these; for now edit the .tsx files directly.
- Frontier building names / mechanics copy (`src/data/Frontier*.ts`) — not yet in the extractor.
- Event log messages — scattered across `src/systems/` and interpolate runtime values; would need selective extraction.
- Loading-screen faction-tagline lookup — drives from `src/data/Factions.ts` which IS extracted.
- Store tab labels + Purchase tab copy — hardcoded in `src/ui/screens/StoreScreen.tsx`.

## Applying edits

Open the TypeScript source at the line referenced under each entry's header (`src/...ts:N`), edit in place, save. The app's unit tests verify nothing structural broke; `npm run build` plus a sideload verifies the copy displays right.

**Total entries: 322**
