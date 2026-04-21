/**
 * Drive the running preview server through the Factions screens at
 * every Play Store-supported screenshot size and save PNGs into
 * `store-listing/screenshots/`.
 *
 * Prereq: run `npm run preview -- --port 4173 --strictPort` in a
 * separate terminal before kicking this off. (The script could spin
 * the server itself, but reusing an already-running preview lets
 * you iterate on copy/layout tweaks with hot-rebuild plus a fresh
 * `npm run build` in between without killing the preview process.)
 *
 * Usage:
 *   npm run screenshots
 *
 * Output layout:
 *   store-listing/screenshots/phone/<screen>-<widthxheight>.png
 *   store-listing/screenshots/tablet-7/<screen>-<widthxheight>.png
 *   store-listing/screenshots/tablet-10/<screen>-<widthxheight>.png
 *
 * Upload any 2-8 phone PNGs to Play Console's "Phone screenshots"
 * field. The tablet slots are optional but increase listing
 * visibility on Android tablets — upload 2-8 from tablet-7 and
 * tablet-10 if you want them.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:4173/tower_defence/?test=1';

/**
 * Play Store-supported device buckets. The game's ResponsiveManager
 * picks layout by CSS innerWidth, NOT by physical pixel count, so
 * screenshots have to use CSS viewport + deviceScaleFactor to land
 * in the right layout while producing the physical-pixel resolution
 * Play Console expects.
 *
 * Breakpoints (src/systems/ResponsiveManager.ts):
 *   - phone:   CSS width < 600
 *   - tablet:  CSS width 600 – 1199
 *   - desktop: CSS width ≥ 1200
 *
 * Each entry below lists CSS viewport, deviceScaleFactor, and the
 * resulting physical pixel dimensions (what the saved PNG ends up
 * being at). All fall inside Play Console's 320 – 3840 / 16:9 – 9:16
 * constraints.
 */
const DEVICES = [
  // Phone — portrait, phone layout (CSS < 600). DPR 3 on 360×640
  // yields physical 1080×1920 — the Play Store "standard" phone.
  { bucket: 'phone', label: 'phone-1080x1920', css: { width: 360, height: 640 },  dpr: 3,    isMobile: true  },
  // Pixel 7-ish tall aspect: 412×915 CSS × DPR 2.625 ≈ 1080×2400.
  { bucket: 'phone', label: 'phone-1080x2400', css: { width: 412, height: 915 },  dpr: 2.625, isMobile: true  },
  // 7-inch tablet — portrait, tablet layout (CSS 600–1199). 800×1280
  // × DPR 1.5 = 1200×1920.
  { bucket: 'tablet-7', label: 'tablet7-1200x1920', css: { width: 800, height: 1280 }, dpr: 1.5, isMobile: false },
  // 10-inch tablet — landscape, desktop layout (CSS ≥ 1200). 1280×800
  // × DPR 2 = 2560×1600.
  { bucket: 'tablet-10', label: 'tablet10-2560x1600', css: { width: 1280, height: 800 }, dpr: 2, isMobile: false },
];

/** Screens to capture per device. Each entry: { id, label, before? }.
 *  `before` runs inside the page context (via page.evaluate) to drive
 *  UIBridge / test hook into the target state before the screenshot
 *  fires. */
const SCREENS = [
  { id: 'menu',         label: '01-menu',        beforeArgs: null },
  { id: 'factionselect', label: '02-factions',   beforeArgs: { mode: 'standard' } },
  { id: 'store',        label: '03-store',       beforeArgs: null },
  { id: 'battlepass',   label: '04-battlepass',  beforeArgs: null },
  { id: 'inventory',    label: '05-inventory',   beforeArgs: null },
  { id: 'draft',        label: '06-draft',       beforeArgs: { mode: 'standard', faction: 'arcane', map: 'plains', difficulty: 'normal' } },
];

async function waitForBoot(page) {
  // Poll the test-hook boot flag so we only shoot after the splash
  // has dismissed and the menu has mounted.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const ready = await page.evaluate(() => window.__td_test?.isBootComplete?.() === true);
    if (ready) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for app boot (testHook.isBootComplete)');
}

async function captureOne(page, screen, outDir, sizeLabel) {
  if (screen.id === 'menu') {
    // Menu is the default post-boot screen; just make sure we're
    // showing it (in case a previous screen left the UI in a
    // non-menu state for this page instance).
    await page.evaluate(() => window.__td_test?.showScreen?.('menu'));
  } else {
    await page.evaluate(
      ({ id, data }) => window.__td_test?.showScreen?.(id, data ?? {}),
      { id: screen.id, data: screen.beforeArgs },
    );
  }
  // Give Preact a couple of ticks + a render settle beat — splash
  // animations + CSS transitions take ~150-300ms to land.
  await page.waitForTimeout(450);
  const fileName = `${screen.label}-${sizeLabel}.png`;
  const outPath = path.join(outDir, fileName);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  ${path.relative(REPO_ROOT, outPath)}`);
}

async function captureDevice(browser, device) {
  const outDir = path.join(REPO_ROOT, 'store-listing', 'screenshots', device.bucket);
  fs.mkdirSync(outDir, { recursive: true });
  const physW = Math.round(device.css.width * device.dpr);
  const physH = Math.round(device.css.height * device.dpr);
  console.log(`\n[${device.label}] CSS ${device.css.width}×${device.css.height} @${device.dpr}x → ${physW}×${physH} physical`);

  const context = await browser.newContext({
    viewport: device.css,
    deviceScaleFactor: device.dpr,
    hasTouch: device.isMobile,
    isMobile: device.isMobile,
  });
  // Pre-seed localStorage with the "all tutorials already seen" state
  // so the first-launch basics tour + skip-hint don't pop over the
  // menu during capture. The initScript runs before any page code,
  // so the tutorial manager reads "already done" on boot.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('td_tutorial_state', JSON.stringify({
        completedTracks: ['basics', 'skip_hint', 'tutorial_match', 'income_standard'],
        dismissedFirstLaunch: true,
        version: 1,
      }));
    } catch {}
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await waitForBoot(page);

    for (const screen of SCREENS) {
      await captureOne(page, screen, outDir, device.label);
    }
  } finally {
    await page.close();
    await context.close();
  }
}

async function main() {
  console.log(`Factions store-screenshot capture`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Devices: ${DEVICES.length}, screens per device: ${SCREENS.length}`);

  const browser = await chromium.launch({ headless: true });
  try {
    for (const device of DEVICES) {
      await captureDevice(browser, device);
    }
  } finally {
    await browser.close();
  }
  console.log(`\nDone. Open store-listing/screenshots/ to review.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
