/**
 * Campaign coop_with_bot — bot ally instantiation guard.
 *
 * Two missions ship as `archetypeId: 'coop_with_bot'`:
 *   - Arcane M9 `allied_circle` (idx 8) — Coalition kit, bot ally
 *   - Greenward M6 `tarrenford`     (idx 5) — Nature kit, bot ally
 *
 * Both launch directly into GameScene (not via CircleLobbyScene) so
 * GameScene's `init()` block at ~line 1162 synthesizes a CircleManager
 * + adds an `'arcane'` bot to fill the second slot. That branch went
 * dormant between commits C4b and d9023d6e (the v2 routing
 * synthesized `archetypeId: 'v2:circle_coop'` which didn't match the
 * legacy `'coop_with_bot'` equality). d9023d6e re-activated it. Lock
 * the contract end-to-end so a future regression that re-clobbers
 * the synthesis path fails CI.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;

async function launchCoopMission(page: Page, factionId: string, missionIdx: number): Promise<void> {
  const ok = await page.evaluate(
    ({ f, i }) => window.__td_test?.launchCampaignMission(f, i) ?? false,
    { f: factionId, i: missionIdx },
  );
  if (!ok) throw new Error(`launchCampaignMission(${factionId}, ${missionIdx}) returned false`);
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
}

test.describe('coop_with_bot — campaign bot ally synthesis', () => {
  test.setTimeout(30_000);

  test('Arcane M9 allied_circle boots with one Arcane bot ally', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchCoopMission(page, 'arcane', 8);

    const status = await page.evaluate(() => window.__td_test?.getCircleStatus() ?? null);
    expect(status, 'getCircleStatus returned null — CircleManager not built').not.toBeNull();
    expect(status!.botSlots.length, 'should have exactly 1 bot ally').toBe(1);
    // Player slot 0 gets the campaign's kit (coalition for Arcane).
    expect(status!.playerFactions[0]).toBe('coalition');
    // Bot ally is hardcoded to Arcane per GameScene.ts line ~1176.
    const botSlot = status!.botSlots[0];
    expect(status!.playerFactions[botSlot]).toBe('arcane');
  });

  test('Greenward M6 tarrenford boots with one Arcane bot ally on the Nature kit', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchCoopMission(page, 'nature', 5);

    const status = await page.evaluate(() => window.__td_test?.getCircleStatus() ?? null);
    expect(status, 'getCircleStatus returned null — CircleManager not built').not.toBeNull();
    expect(status!.botSlots.length, 'should have exactly 1 bot ally').toBe(1);
    // Greenward's defaultPlayerFaction is 'nature'.
    expect(status!.playerFactions[0]).toBe('nature');
    const botSlot = status!.botSlots[0];
    expect(status!.playerFactions[botSlot]).toBe('arcane');
  });
});
