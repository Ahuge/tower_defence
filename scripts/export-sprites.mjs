/**
 * Automated sprite export — launches headless browser, loads sprites.html,
 * clicks "Download All Sprites (ZIP)", and extracts to public/assets/.
 *
 * Usage: node scripts/export-sprites.mjs [--terrain-only] [--structures-only]
 */
import puppeteer from 'puppeteer';
import { execSync, spawn } from 'child_process';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const ASSETS = join(ROOT, 'public', 'assets');
const DOWNLOAD_DIR = join(ROOT, '.sprite-export-tmp');
const args = process.argv.slice(2);

// Clean up download dir
if (existsSync(DOWNLOAD_DIR)) execSync(`rm -rf "${DOWNLOAD_DIR}"`);
mkdirSync(DOWNLOAD_DIR, { recursive: true });

console.log('Starting Vite dev server...');
const vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Wait for Vite to be ready
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 30000);
  vite.stdout.on('data', (data) => {
    const str = data.toString();
    if (str.includes('localhost:5199')) {
      clearTimeout(timeout);
      setTimeout(resolve, 1000); // extra settling time
    }
  });
  vite.stderr.on('data', (data) => {
    const str = data.toString();
    if (str.includes('Error') || str.includes('error')) {
      console.error('Vite error:', str);
    }
  });
});

console.log('Vite ready. Launching browser...');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

// Set download behavior
const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: DOWNLOAD_DIR,
});

// Increase timeout for heavy rendering
page.setDefaultTimeout(120000);

console.log('Loading sprites.html...');
await page.goto('http://localhost:5199/tower_defence/sprites.html', { waitUntil: 'networkidle2', timeout: 60000 });

// Wait for React to render
console.log('Waiting for React render...');
await page.waitForFunction(() => document.querySelectorAll('button').length > 0, { timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));

console.log('Clicking "Download All Sprites (ZIP)"...');
const buttons = await page.$$('button');
let clicked = false;
for (const btn of buttons) {
  const text = await btn.evaluate(el => el.textContent);
  if (text && text.includes('Download All Sprites')) {
    await btn.click();
    clicked = true;
    console.log('Download initiated...');
    break;
  }
}

if (!clicked) {
  console.error('Could not find "Download All Sprites" button');
  await browser.close();
  vite.kill();
  process.exit(1);
}

// Wait for download to complete — poll for the ZIP file
console.log('Waiting for ZIP download...');
let zipPath = null;
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 2000));
  // Check for completed zip file
  try {
    const files = execSync(`ls "${DOWNLOAD_DIR}"/*.zip 2>/dev/null`).toString().trim().split('\n');
    const completed = files.filter(f => f && !f.endsWith('.crdownload'));
    if (completed.length > 0) {
      zipPath = completed[0];
      break;
    }
  } catch { /* no files yet */ }

  // Check status text on page
  try {
    const status = await page.evaluate(() => {
      const spans = document.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent && (s.textContent.includes('Rendering') || s.textContent.includes('Creating') || s.textContent.includes('Packing') || s.textContent.includes('Done'))) {
          return s.textContent;
        }
      }
      return '';
    });
    if (status) process.stdout.write(`\r  Status: ${status.padEnd(60)}`);
    if (status.includes('Done')) {
      // Give a moment for the file to finish writing
      await new Promise(r => setTimeout(r, 3000));
      try {
        const files = execSync(`ls "${DOWNLOAD_DIR}"/*.zip 2>/dev/null`).toString().trim().split('\n');
        const completed = files.filter(f => f && !f.endsWith('.crdownload'));
        if (completed.length > 0) zipPath = completed[0];
      } catch { /* */ }
      break;
    }
  } catch { /* page might have navigated */ }
}

console.log('');

if (!zipPath) {
  console.error('ZIP download timed out');
  await browser.close();
  vite.kill();
  process.exit(1);
}

console.log(`ZIP downloaded: ${zipPath}`);
console.log('Extracting to public/assets/...');

// Extract ZIP, overwriting existing files
execSync(`unzip -o "${zipPath}" -d "${ASSETS}"`, { stdio: 'inherit' });

// Clean up
execSync(`rm -rf "${DOWNLOAD_DIR}"`);
console.log('Sprites exported successfully!');

await browser.close();
vite.kill();
process.exit(0);
