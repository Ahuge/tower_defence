# Campaign Texts

All player-facing campaign narrative — campaign title, intro/outro, mission names, mission stories, and objective labels — lives in this directory, one file per campaign.

**Edit freely.** The corresponding `<campaign>.ts` files in the parent directory hold only gameplay logic (archetypes, maps, wave scripts, predicates). They import from here.

## Files

| File | Owns |
|---|---|
| `types.ts` | `CampaignTexts` shape — campaign meta + per-mission `name` / `story` / `objectives.{star2,star3}` |
| `arcane.texts.ts` | Arcane Reckoning — 10 missions |
| `mechanical.texts.ts` | Iron Cascade — 10 missions |

## Editing rules

1. **Don't rename mission keys.** The `missions: { <missionId>: ... }` keys are referenced by ID from the campaign def. Renaming a key (e.g. `first_sigil` → `opening_sigil`) breaks the compile. If you need to rename a mission's *display name*, change `.name` only; leave the key alone.

2. **Stories are template literals.** Use blank lines for paragraph breaks. The briefing UI renders the string verbatim, preserving the line breaks.

   ```ts
   story:
   `First paragraph.

   Second paragraph after a blank line.`,
   ```

3. **Objective labels are surfaced verbatim** on the mission-result screen with star icons. Keep them short and direct (≤ 8 words). The predicate logic stays in `<campaign>.ts`; the text here is just the label.

4. **Campaign intro/outro** show on the campaign lobby. Long-form prose, two-to-four sentences typical.

## Verifying changes

```bash
npx tsc --noEmit         # missing keys / type errors
npx vitest run           # campaign tests still pass
npm run dev              # eyeball briefings in the campaign lobby
```

## Adding a new mission

1. Add the entry to `<campaign>.ts` with a fresh `id`.
2. Add a matching `missions.<id>` entry here.
3. TypeScript will flag missing keys at the reference site if you forget step 2.
