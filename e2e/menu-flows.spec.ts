/**
 * Menu-level flows that don't require running a match.
 *
 *  - Skip the first-launch basics track.
 *  - Open the `?` help modal, click a track, confirm it dismisses
 *    and routes through the right branch (replay vs launchMatch).
 *  - Skip basics -> verify the skip-hint mini-track surfaces on
 *    the next menu interaction.
 */
import { test, expect, waitForTutorialStep, waitForNoTutorial, dismissAllAutoTutorials } from './fixtures';

test.describe('menu — basics skip', () => {
  test('basics auto-starts, can be skipped, stays dismissed', async ({ page, gotoFresh }) => {
    await gotoFresh();
    // basics kicks off ~200ms after splash dismiss.
    await waitForTutorialStep(page, 'intro', 8_000);

    // The popover "Skip" button dismisses the current track.
    await page.getByRole('button', { name: 'Skip' }).click();
    await waitForNoTutorial(page);

    // dismissedFirstLaunch should have been set, so a reload with
    // state preserved shouldn't re-auto-start basics.
    const stillDismissed = await page.evaluate(() => {
      const raw = localStorage.getItem('td_tutorial_state');
      if (!raw) return false;
      try { return !!JSON.parse(raw).dismissedFirstLaunch; } catch { return false; }
    });
    expect(stillDismissed).toBe(true);
  });
});

test.describe('menu — help modal (? button)', () => {
  test('opens, lists tracks, and dismisses on Close', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    // Click the ? button (portaled modal opens to the How-To-Play
    // carousel by default). ProfileAvatar renders a "?" button when
    // no profile is signed in (`title="Tap to sign in"`), colliding
    // with the Tutorials help button by accessible name; disambiguate
    // by title.
    await page.getByTitle('Tutorials').click();
    await expect(page.getByText('How To Play', { exact: true }).first()).toBeVisible();

    // Switch to the explicit tracks list — that's where the
    // individual replay entries live.
    await page.getByRole('button', { name: 'All Tutorials →' }).click();
    await expect(page.getByText('All Tutorials', { exact: true }).first()).toBeVisible();

    // A well-known track should be listed (we don't assert the full
    // set — that's what the unit-level schema spec is for).
    await expect(page.getByText('Welcome Tour')).toBeVisible();

    // `name: 'Close'` (loose) also matches a track button whose label
    // text contains "Close" — use exact match for the modal's footer
    // button.
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('All Tutorials', { exact: true }).first()).toBeHidden();
  });

  test('tutorial_match entry launches the match via launchTutorialMatch', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    await page.getByTitle('Tutorials').click();
    // Modal defaults to the How-To-Play carousel; flip to the tracks
    // list before clicking a specific entry.
    await page.getByRole('button', { name: 'All Tutorials →' }).click();
    await expect(page.getByText('All Tutorials', { exact: true }).first()).toBeVisible();
    await page.getByText('Tutorial Match').first().click();

    // The match-load splash should appear ("PREPARING DEFENSES...").
    await expect(page.getByText('PREPARING DEFENSES...')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('menu — skip-hint mini-track', () => {
  test('surfaces on the menu after basics is skipped', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await waitForTutorialStep(page, 'intro', 8_000);
    await page.getByRole('button', { name: 'Skip' }).click();

    // Skip-hint is gated on "completed one other track AND on menu"
    // with a 500ms post-skip delay. Wait for its step to appear.
    await waitForTutorialStep(page, 'hint', 5_000);

    const activeTrack = await page.evaluate(() => window.__td_test?.getActiveTutorialTrack());
    expect(activeTrack).toBe('skip_hint');
  });
});
