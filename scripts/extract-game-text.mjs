/**
 * Extract every piece of player-facing copy from the game's data +
 * tutorial sources into per-domain markdown files. Purpose: give a
 * writer a single place to propose rewrites without hunting through
 * TypeScript.
 *
 * Output: `text-rewrites/*.md`. Each file has the original source
 * location annotated per entry so edits can be applied back by hand.
 *
 * Usage:
 *   node scripts/extract-game-text.mjs
 *
 * Implementation: uses the TypeScript compiler API (already a
 * project dependency) to parse each source file's AST and extract
 * string-literal values at known property names (name, description,
 * title, body, flavour, label, etc.). More robust than grep/regex
 * since template literals and multi-line strings parse correctly.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'text-rewrites');

// The property names we treat as "copy" worth extracting. Everything
// else in the AST is ignored. Keep this list deliberate — we don't
// want accidentally-captured non-copy strings (e.g. asset keys).
const COPY_FIELDS = new Set([
  'name', 'description', 'title', 'body', 'flavour', 'flavor',
  'label', 'sublabel', 'text', 'summary',
]);

// Property names we capture AS CONTEXT but don't treat as copy (so
// the markdown shows which entity each rewrite belongs to).
const CONTEXT_FIELDS = new Set([
  'id', 'towerId', 'heroId', 'factionId', 'mapId', 'creepTypeId',
]);

function loc(sourceFile, node) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(REPO_ROOT, sourceFile.fileName)}:${line + 1}`;
}

/** Extract a string value from a literal or no-substitution template. */
function stringValue(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

/**
 * Walk a source file and return every object literal that has at
 * least one COPY_FIELDS property. Each returned record:
 *   { location, context: { id?, ... }, copy: { name?, description?, ... } }
 * Nested objects are returned independently — good for tutorial
 * tracks where each step is its own object.
 */
function extractCopyEntries(sourceFile) {
  const entries = [];

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const context = {};
      const copy = {};
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        let key;
        if (ts.isIdentifier(prop.name)) key = prop.name.text;
        else if (ts.isStringLiteral(prop.name)) key = prop.name.text;
        else continue;

        const value = stringValue(prop.initializer);
        if (value == null) continue;

        if (COPY_FIELDS.has(key)) copy[key] = value;
        else if (CONTEXT_FIELDS.has(key)) context[key] = value;
      }
      if (Object.keys(copy).length > 0) {
        entries.push({ location: loc(sourceFile, node), context, copy });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return entries;
}

function readSource(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  const text = fs.readFileSync(abs, 'utf-8');
  return ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);
}

function renderEntry(entry) {
  const contextPairs = Object.entries(entry.context);
  const header = contextPairs.length > 0
    ? contextPairs.map(([k, v]) => `\`${k}=${v}\``).join(' ')
    : '(anonymous)';
  const lines = [`### ${header}`, `<sub>${entry.location}</sub>`, ''];
  for (const [field, text] of Object.entries(entry.copy)) {
    lines.push(`**${field}**:`);
    lines.push('');
    // Preserve multi-line text as a blockquote so it reads cleanly
    // in markdown without losing paragraph breaks.
    for (const line of text.split('\n')) lines.push(`> ${line}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderFile(title, description, entries) {
  const header = [
    `# ${title}`,
    '',
    description,
    '',
    `Extracted by \`scripts/extract-game-text.mjs\` — re-run after source edits to refresh this file. Each entry shows the source location; apply edits by hand back to the TS source, then regenerate to confirm.`,
    '',
    `**Entries**: ${entries.length}`,
    '',
    '---',
    '',
  ].join('\n');
  const body = entries.map(renderEntry).join('\n---\n\n');
  return header + body;
}

const JOBS = [
  {
    title: 'Tutorial — Steps + Track Metadata',
    description: 'Every tutorial step\'s title, body, and CTA label, plus the track-level name/summary. Ordered by source file appearance — which matches gameplay order within each track.',
    source: 'src/systems/Tutorial/TutorialTracks.ts',
    outFile: 'tutorial.md',
  },
  {
    title: 'Factions — Names + Descriptions',
    description: 'The short faction-identity blurbs shown on Faction Select cards, the LoadingScreen tagline, and the in-game tower-pick summary.',
    source: 'src/data/Factions.ts',
    outFile: 'factions.md',
  },
  {
    title: 'Towers — Names + Descriptions',
    description: 'One entry per tower across all 12 factions. Tower tooltips pull from these fields directly.',
    source: 'src/data/TowerTypes.ts',
    outFile: 'towers.md',
  },
  {
    title: 'Heroes — Names + Descriptions',
    description: 'Hero cards in Hero Select + in-game hero HUD.',
    source: 'src/data/HeroTypes.ts',
    outFile: 'heroes.md',
  },
  {
    title: 'Creeps — Names + Descriptions',
    description: 'Creep inspector panel text + wave preview tooltips.',
    source: 'src/data/CreepTypes.ts',
    outFile: 'creeps.md',
  },
  {
    title: 'Maps — Names + Descriptions',
    description: 'Menu map-picker tooltips + LoadingScreen map line. The Gauntlet JSON maps under src/data/maps/ are separate — only the map metadata defined in-code is extracted here.',
    source: 'src/data/Maps.ts',
    outFile: 'maps.md',
  },
  {
    title: 'Draft Modifiers',
    description: 'The Gold Rush / Glass Cannon / etc. cards shown between Faction Select and match start.',
    source: 'src/data/DraftModifiers.ts',
    outFile: 'draft-modifiers.md',
  },
  {
    title: 'Skin Packs',
    description: 'Skin names + one-line descriptions — shown in the Store "Skins" tab and on roll-result cards. Rarity labels are separate (see RARITY_LABELS in the source).',
    source: 'src/systems/monetization/StoreDefinitions.ts',
    outFile: 'skins.md',
  },
];

function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let totalEntries = 0;
  for (const job of JOBS) {
    const sf = readSource(job.source);
    const entries = extractCopyEntries(sf);
    totalEntries += entries.length;
    const markdown = renderFile(job.title, job.description, entries);
    const outPath = path.join(OUT_DIR, job.outFile);
    fs.writeFileSync(outPath, markdown, 'utf-8');
    console.log(`  ${path.relative(REPO_ROOT, outPath)}: ${entries.length} entries`);
  }
  // Write an index pointing at each file.
  const index = [
    '# Factions — Copy Rewrite Index',
    '',
    'Every piece of player-facing copy in the game, grouped by domain. Edit each file; apply changes back to the TypeScript source by hand; re-run the extractor to confirm.',
    '',
    '```',
    'node scripts/extract-game-text.mjs',
    '```',
    '',
    '## Files',
    '',
    ...JOBS.map(j => `- [${j.outFile}](${j.outFile}) — ${j.description.split('\n')[0]}`),
    '',
    '## Not covered here',
    '',
    '- Achievement labels (`src/data/Achievements.ts`) — only one entry (`FIRST_WIN`); edit directly.',
    '- UI button text, headers, section titles — hardcoded in `src/ui/screens/*.tsx`. A future pass could extract these; for now edit the .tsx files directly.',
    '- Frontier building names / mechanics copy (`src/data/Frontier*.ts`) — not yet in the extractor.',
    '- Event log messages — scattered across `src/systems/` and interpolate runtime values; would need selective extraction.',
    '- Loading-screen faction-tagline lookup — drives from `src/data/Factions.ts` which IS extracted.',
    '- Store tab labels + Purchase tab copy — hardcoded in `src/ui/screens/StoreScreen.tsx`.',
    '',
    '## Applying edits',
    '',
    'Open the TypeScript source at the line referenced under each entry\'s header (`src/...ts:N`), edit in place, save. The app\'s unit tests verify nothing structural broke; `npm run build` plus a sideload verifies the copy displays right.',
    '',
    `**Total entries: ${totalEntries}**`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), index, 'utf-8');
  console.log(`\nTotal: ${totalEntries} entries across ${JOBS.length} files.`);
  console.log(`Index: text-rewrites/README.md`);
}

run();
