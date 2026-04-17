/**
 * Renders all faction sprite generators to PNG files.
 * Extracts drawing logic from *_sprites.ts files and runs via node-canvas.
 *
 * Usage: node scripts/render_sprites.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const FACTIONS = [
  'void', 'arcane', 'mechanical', 'nature', 'military',
  'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'
];

const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

// We need to parse each sprite file and extract:
// 1. The color palette (const C={...})
// 2. The drawing helper (mk function)
// 3. The tower/projectile/hero render functions
// Then call them with a node-canvas context

for (const faction of FACTIONS) {
  const filename = faction === 'void' ? 'void_sprits.ts' : `${faction}_sprites.ts`;
  const filepath = path.join(__dirname, '..', filename);

  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${faction} — no sprite file found`);
    continue;
  }

  console.log(`Processing ${faction}...`);

  // Read the file
  const src = fs.readFileSync(filepath, 'utf-8');

  // Extract the palette
  const paletteMatch = src.match(/const C=\{[\s\S]*?\};/);
  if (!paletteMatch) {
    console.log(`  Skipping ${faction} — no palette found`);
    continue;
  }

  // Create output directory
  const outDir = path.join(ASSETS_DIR, faction);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Instead of trying to parse and eval the complex drawing code,
  // we'll create a simple HTML file that runs the generator and saves PNGs.
  // This is safer and more reliable.

  const htmlPath = path.join(outDir, '_render.html');
  const html = `<!DOCTYPE html>
<html><body>
<script>
// Faction: ${faction}
${src.replace(/import.*?;/g, '').replace(/export default.*/, '').replace(/export /, '')}

// Auto-render: find all canvases after component mounts and save
setTimeout(() => {
  document.querySelectorAll('canvas').forEach((c, i) => {
    const names = ['towers', 'projectiles', 'hero'];
    const link = document.createElement('a');
    link.download = '${faction}_' + (names[i] || 'sheet_' + i) + '.png';
    link.href = c.toDataURL('image/png');
    link.textContent = 'Download ' + link.download;
    document.body.appendChild(link);
    document.body.appendChild(document.createElement('br'));
  });
}, 1000);
</script>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</body></html>`;

  console.log(`  Note: ${faction} sprites need browser rendering. Open the sprite generator directly.`);
}

// Alternative approach: generate a single HTML page that renders ALL faction sprites
const allSpritesHtml = path.join(ASSETS_DIR, 'render_all_sprites.html');
let htmlContent = `<!DOCTYPE html>
<html>
<head><title>Sprite Sheet Renderer</title>
<style>
  body { background: #111; color: #fff; font-family: monospace; }
  .faction { margin: 20px; padding: 10px; border: 1px solid #333; }
  canvas { border: 1px solid #444; margin: 5px; }
  h2 { color: #ff8; }
  button { margin: 5px; padding: 8px 16px; cursor: pointer; background: #333; color: #fff; border: 1px solid #666; }
  button:hover { background: #555; }
</style>
</head>
<body>
<h1>Factions — Sprite Sheet Renderer</h1>
<p>Click "Save PNGs" for each faction to download the spritesheets.</p>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script>
`;

for (const faction of FACTIONS) {
  const filename = faction === 'void' ? 'void_sprits.ts' : `${faction}_sprites.ts`;
  const filepath = path.join(__dirname, '..', filename);

  if (!fs.existsSync(filepath)) continue;

  let src = fs.readFileSync(filepath, 'utf-8');
  // Strip imports and TypeScript-specific syntax
  src = src.replace(/import\s+\{[^}]*\}\s+from\s+["'][^"']*["'];?\n?/g, '');
  src = src.replace(/:\s*(number|string|boolean|any|void|React\.RefObject<[^>]*>|HTMLCanvasElement)\b/g, '');
  src = src.replace(/as\s+HTMLCanvasElement/g, '');
  src = src.replace(/<HTMLCanvasElement>/g, '');
  src = src.replace(/export\s+default\s+/g, 'window._faction_' + faction + ' = ');

  htmlContent += `\n// ===== ${faction.toUpperCase()} =====\n`;
  htmlContent += src;
  htmlContent += '\n';
}

htmlContent += `
// Render all factions
const e = React.createElement;

function AllFactions() {
  const factions = ${JSON.stringify(FACTIONS)};
  return e('div', null, factions.map(f => {
    const Component = window['_faction_' + f];
    if (!Component) return e('div', {key: f}, 'Missing: ' + f);
    return e('div', {key: f, className: 'faction'},
      e('h2', null, f.toUpperCase()),
      e(Component)
    );
  }));
}

ReactDOM.createRoot(document.getElementById('root')).render(e(AllFactions));
</script>
</body></html>`;

fs.writeFileSync(allSpritesHtml, htmlContent);
console.log(`\nGenerated: ${allSpritesHtml}`);
console.log('Open this file in a browser to view and download all sprite sheets.');
console.log('Then copy the downloaded PNGs to public/assets/{faction}/');
