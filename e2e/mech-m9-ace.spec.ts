/**
 * Mech M9 — The Ace wave-script integrity guard.
 *
 * The Mech M9 mission ships a hand-authored 5-phase duel against
 * `mech_ace_pilot` — every wave is an explicit `isBoss: true` phase
 * with the Ace + escalating walker squadrons. The `archetypeId:
 * 'hero_vs_boss'` routing in GameScene triggers a "promote the last
 * wave to a boss" auto-mutation block; a Phase F regression briefly
 * activated it for v2 missions and clobbered the entire Ace from
 * wave 5, replacing it with a generic `'boss'` creep at hpScale 245.
 *
 * This spec locks the integrity of the scripted waves end-to-end.
 * Boots M9 through the live MissionRunner path; asserts the Ace
 * pilot is in waves 1-5 and the final wave isn't a generic boss.
 */
import { test, expect } from './fixtures';

const SCENE_BOOT_TIMEOUT_MS = 15_000;

test.describe('Mech M9 — The Ace wave script integrity', () => {
  test.setTimeout(30_000);

  test('wave 5 retains the Ace pilot (auto-promotion does not clobber custom waveScript)', async ({ page, gotoFresh }) => {
    await gotoFresh();
    const ok = await page.evaluate(
      () => window.__td_test?.launchCampaignMission('mechanical', 8) ?? false,
    );
    expect(ok, 'launchCampaignMission(mechanical, 8) returned false').toBe(true);
    await page.waitForFunction(
      () => window.__td_test?.isGameSceneActive() ?? false,
      null,
      { timeout: SCENE_BOOT_TIMEOUT_MS },
    );
    await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));
    await page.waitForFunction(
      () => window.__td_test?.isGameSceneActive() ?? false,
      null,
      { timeout: 5_000 },
    );

    const waves = await page.evaluate(() => window.__td_test?.getScheduledWaves() ?? null);
    expect(waves, 'getScheduledWaves returned null').not.toBeNull();
    expect(waves).toHaveLength(5);

    // Every wave is a boss phase + carries the Ace as a credible threat.
    for (let i = 0; i < 5; i++) {
      const w = waves![i];
      expect(w.isBoss, `wave ${i + 1} should be isBoss`).toBe(true);
      const creepTypes = w.groups.map(g => g.creepType);
      expect(creepTypes, `wave ${i + 1} should include mech_ace_pilot`).toContain('mech_ace_pilot');
    }

    // Wave 5 was the regression target — the auto-promotion replaced
    // it with `groups: [{ creepType: 'boss', count: 1, ... }]`. Assert
    // the Ace + escort survived intact (3 groups: ace + armored + light).
    expect(waves![4].groups, 'wave 5 should have 3 groups (ace + escorts)').toHaveLength(3);
    const w5Types = waves![4].groups.map(g => g.creepType);
    expect(w5Types).toContain('mech_armored_walker');
    expect(w5Types).toContain('mech_light_walker');
    // The generic 'boss' creep type must NOT have been injected.
    expect(w5Types).not.toContain('boss');
  });
});
