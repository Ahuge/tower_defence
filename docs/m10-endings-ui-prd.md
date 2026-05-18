# PRD — M10 Endings UI

**Status:** Active. Branch: `ah/feature/m10-endings-ui` (off `ah/feature/greenward-campaign`; rebases to develop once PR #74 merges).
**Owner:** Alex
**Trigger:** PR #74 shipped the three M10 ending tableaux as baked sprite frames (`public/assets/arena/greenward_endings.png`) and three branched outro paragraphs (`GREENWARD_M10_ENDINGS` in `greenward.texts.ts`). The data is shipped — but the GameOverScreen doesn't yet render any of it. Players who finish M10 see the generic GameOver screen instead of their chosen ending's tableau + outro.

---

## Goal

When the player wins M10, the GameOver screen must surface the resolved Nave ending: the ending's title, its illustrated tableau, and its writer-locked outro paragraph. The choice the player made across the campaign must *land visibly* on the end-screen.

## Non-goals

- New tableau art (three frames shipped; this PR uses them as-is).
- New outro text (three paragraphs shipped; verbatim use).
- Re-balancing mode-lean thresholds. Not in scope.
- Non-Greenward GameOver flow changes. The existing screen for Arcane / Mech finales stays untouched.

## Architecture

Three layers, three commits.

### Layer 1 — Thread `naveResolvedMode` from controller into MissionResult.custom

`GreenwardFinaleController.getSnapshot()` already exposes `resolvedNaveMode: RuinMode | null`. `GameScene.goToGameOver()` already spreads `_greenwardController.finalize()` into `missionResult.custom`. We add one extra line that writes the resolved mode from the FinaleController (when present) into the same custom bag.

### Layer 2 — GameOverScreen renders the ending

`GameOverScreen.tsx` detects `data.missionResult?.archetypeId === 'final_greenward'` AND `won === true`. When both are true, it renders:

- **Title** from `GREENWARD_M10_ENDINGS[mode].title`.
- **Tableau** — Phaser sprite is at `assets/arena/greenward_endings.png` (128×288 sheet, 3 frames vertical). For the DOM render we can either:
  - Use an `<img>` tag with `object-position` clipping to extract one frame, or
  - Bake a single image per ending at render time via a hidden canvas, or
  - Use the existing `factionKeyartSrc`-style asset helper if there's one.
  
  Lean: simple `<img>` with `object-position` — minimal new infrastructure.
- **Outro** — multi-paragraph `GREENWARD_M10_ENDINGS[mode].outro` rendered with paragraph break handling.

Fallback: if `naveResolvedMode` is somehow missing from custom on a `final_greenward` win, fall back to the Siege ending text + tableau (the narrowest fallback per design).

### Layer 3 — e2e spec

`e2e/greenward-smoke.spec.ts` extends with one new test that:
1. Boots M10 directly via `__td_test.launchCampaignMission('nature', 9)`.
2. Force-claims the Courtyard ruin (via a new test hook `forceClaimGreenwardRuin(ruinId)` — mirrors `forceKillSabotageTarget` from M10 Mech).
3. Force-claims the Nave (which will be in Siege fallback since no mode-lean was accrued).
4. Force-claims the Throne.
5. Waits for `gameWon` event.
6. Asserts the GameOver screen renders the Siege tableau frame + the Siege ending title.

## Commits

### Commit 1 — `M10 endings UI: thread naveResolvedMode into MissionResult.custom`

- `GreenwardMissionCustom` shape (`GreenwardMissionController.ts`) gains a `naveResolvedMode?: 'ceremony' | 'mercy' | 'siege' | null` field.
- `GameScene.goToGameOver` reads `this._greenwardFinaleController?.getSnapshot().resolvedNaveMode` and merges it into the spread of `controller.finalize()`. Falls back to `null` when no finale controller.
- Update `GreenwardMissionController.test.ts` with one assertion: finalize output carries the `naveResolvedMode` field when injected via setCustom (the GameScene-side wiring is the integration point — unit-test just verifies the field is in the schema).

**Acceptance:** `npx tsc --noEmit` clean; full unit suite green.

### Commit 2 — `M10 endings UI: GameOverScreen renders the resolved ending`

- New conditional render block in `GameOverScreen.tsx` (or extracted as `src/ui/screens/GreenwardEndingPanel.tsx` if the GameOverScreen is already crowded).
- Reads `data.missionResult?.archetypeId === 'final_greenward'` + `data.won === true` + `data.missionResult?.custom?.naveResolvedMode`.
- Renders title (Silkscreen font, nature-green accent), tableau (`<img src="assets/arena/greenward_endings.png">` with `object-position` clipping by frame index), outro paragraphs (line-broken on `\n\n`).
- Three frames mapped: ceremony=0 (offset 0px), mercy=1 (offset -96px), siege=2 (offset -192px).
- Fallback: missing `naveResolvedMode` on a `final_greenward` win renders the Siege ending (narrative-safe fallback).
- Add one Vitest test for the render branch using `@testing-library/preact` or DOM-render-via-string if the project uses that pattern (check existing GameOverScreen tests).

**Acceptance:** `npx tsc --noEmit` clean; full unit suite green; manual smoke through M10 to one ending verifies the screen renders.

### Commit 3 — `M10 endings UI: e2e spec with forceClaimGreenwardRuin hook`

- New `__td_test` hook: `forceClaimGreenwardRuin(ruinId: string): boolean`. Implementation walks `_greenwardController.consecration.getRuin(id)` and force-marks `claimed: true` (or routes through `forceClaimRuin` on the manager if cleaner — add the method).
- Update `e2e/fixtures.ts` type augmentation.
- Extend `e2e/greenward-smoke.spec.ts` (or new `e2e/greenward-m10-endings.spec.ts`) with the M10 walkthrough described above.
- Assert: GameOver screen has a visible element containing one of the three ending titles after the walkthrough.

**Acceptance:** `npx tsc --noEmit` clean; full unit suite green; new e2e green; existing greenward-smoke + m10-overthrow + tutorial-match regression green.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| GameOverScreen architecture surprises | Low | Existing M10 Arcane / Mech finales render bespoke UI through the same screen; pattern exists |
| Sprite-frame clipping via `object-position` doesn't render well on all viewports | Low | Phone responsive — use `UIScale` if width-clipping is needed |
| The "no mode-lean" → Siege fallback obscures testing | Low | The e2e spec walks all three ruins as Siege by default (no lean accrued); other endings get tested by the manual smoke + by future commit that injects mode-lean state via test hook |

## Safety nets

- `GreenwardFinaleController.test.ts` already asserts the Nave-resolution logic. This PRD adds only the UI rendering of an already-tested decision.
- Existing `e2e/greenward-smoke.spec.ts` covers M10 boot. This PRD's spec covers M10 walk-to-end.

## Effort estimate

3 commits, ~2 hrs end-to-end with focused work.
