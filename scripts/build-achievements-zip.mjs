/**
 * Produce a Play Console bulk-import ZIP for the 13 achievements
 * Factions currently ships:
 *
 *   • FIRST_WIN                   standard (existing)
 *   • FIRST_WIN_<FACTION>  ×11    standard (from plan item 4)
 *   • DISCOVER_CREEPS             incremental, 17 steps (plan item 3)
 *
 * Play Console's import format expects:
 *   AchievementsMetadata.csv       one row per achievement (type,
 *                                  points, steps, initial state, …)
 *   AchievementsLocalizations.csv  (achievement_key, locale, name, description)
 *   AchievementsIconsMappings.csv  (achievement_key, icon_filename)
 *   icons/*.png                    the icons themselves
 *
 * Google's docs are a moving target — the exact CSV column names
 * change between releases. This script emits a documented set of
 * columns that's worked for community imports; adjust if Play
 * Console rejects the upload. Each CSV gets a header row, and the
 * README inside the ZIP explains the structure so a human reviewer
 * can tweak before uploading.
 *
 *   node scripts/build-achievements-zip.mjs
 *
 * Output: store-listing/achievements/factions-achievements.zip
 *
 * Pre-req: run scripts/generate-achievement-icons.js first so the
 * icons exist at store-listing/achievements/icons/.
 */
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(REPO_ROOT, 'store-listing/achievements/icons');
const OUT_ZIP = path.join(REPO_ROOT, 'store-listing/achievements/factions-achievements.zip');

// ───────────────────────────────────────────────────────────
// Achievement definitions
// ───────────────────────────────────────────────────────────
// Each entry drives one row in each CSV.
//   key          snake_case stable key (matches icon filename)
//   name         shown in Play Games UI
//   description  shown under the name
//   type         'standard' | 'incremental'
//   steps        for incremental achievements only
//   points       XP/score weight — Play Games caps total at 1000
//                across all achievements. 13 achievements × ~75 each
//                keeps us inside that budget with headroom.
//   initial      'revealed' (player sees locked icon) | 'hidden'
//                (fully hidden until unlocked). Faction wins are
//                revealed so the player sees a clear "12 factions
//                to beat" goal.
// ───────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // Meta / incremental
  { key: 'first_win',          name: 'First Blood',         description: 'Win your first match.',
    type: 'standard',  points: 20, initial: 'revealed' },

  { key: 'discover_creeps',    name: 'Creep Cataloguer',    description: 'Encounter all 17 creep types in live matches.',
    type: 'incremental', steps: 17, points: 100, initial: 'revealed' },

  // Faction wins
  { key: 'first_win_arcane',     name: 'Arcane Ascendant',   description: 'Win a match as Arcane.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_mechanical', name: 'Industrial Might',   description: 'Win a match as Mechanical.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_nature',     name: 'Overgrowth',         description: 'Win a match as Nature.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_void',       name: 'Void Walker',        description: 'Win a match as Void.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_military',   name: 'By the Book',        description: 'Win a match as Military.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_aliens',     name: 'The Hive Wins',      description: 'Win a match as Spawn Aliens.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_cypherpunk', name: 'Root Access',        description: 'Win a match as Cypherpunk.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_infernal',   name: 'Burn It Down',       description: 'Win a match as Infernal.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_celestial',  name: 'Divine Verdict',     description: 'Win a match as Celestial.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_psionic',    name: 'Mind Over Matter',   description: 'Win a match as Psionic.',
    type: 'standard', points: 40, initial: 'revealed' },
  { key: 'first_win_harmonic',   name: 'In Harmony',         description: 'Win a match as Harmonic.',
    type: 'standard', points: 40, initial: 'revealed' },
];

// ───────────────────────────────────────────────────────────
// CSV builders
// ───────────────────────────────────────────────────────────

/** CSV-escape: quote any field containing a comma, quote, or newline
 *  and double inner quotes. Keeps the files parseable by Excel /
 *  Google Sheets / Play Console's importer alike. */
function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function csvRow(fields) {
  return fields.map(csvEscape).join(',');
}

// Play Console's bulk-import format (verified against repeated
// 2026 importer errors). The key insights:
//   • NO header rows. Play Console iterates every row as data and
//     validates each column, so a text header fails every column's
//     value check ("Wrong initial state: Name", "Wrong incremental
//     value: Name", etc. — "Name" there was the literal header).
//     The importer is purely positional.
//   • Metadata column order (7 cols):
//         1. Name            (unique id)
//         2. Initial State   (Revealed / Hidden)
//         3. Incremental     (True / False)
//         4. Number of Steps (whole number, only if Incremental)
//         5. Points          (whole number, multiple of 5, 5-200)
//         6. List Order      (whole number, 1-based)
//         7. Published       (True / False)
//   • Localization row (4 cols): name, locale, title, description.
//     Locale must match a language enabled for this game in Play
//     Console (usually "en-US"). If you get "Locale not supported",
//     enable en-US in Play Console → Game Services → Listings first.
//   • Icons row (2 cols): name, icon PNG filename (flat at ZIP root).

function metadataCsv() {
  const rows = [];
  ACHIEVEMENTS.forEach((a, i) => {
    rows.push(csvRow([
      a.key,
      a.initial === 'hidden' ? 'Hidden' : 'Revealed',
      a.type === 'incremental' ? 'True' : 'False',
      a.type === 'incremental' ? a.steps : '',
      a.points,
      i + 1,
      'True',
    ]));
  });
  return rows.join('\n') + '\n';
}

function localizationsCsv() {
  const rows = [];
  for (const a of ACHIEVEMENTS) {
    rows.push(csvRow([a.key, 'en-US', a.name, a.description]));
  }
  return rows.join('\n') + '\n';
}

function iconMappingsCsv() {
  const rows = [];
  for (const a of ACHIEVEMENTS) {
    rows.push(csvRow([a.key, `${a.key}.png`]));
  }
  return rows.join('\n') + '\n';
}

// ───────────────────────────────────────────────────────────
// ZIP assembly
// ───────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    throw new Error(`Icons directory missing: ${ICONS_DIR}\nRun scripts/generate-achievement-icons.js first.`);
  }

  // Play Console's bulk-import rejects any ZIP with folders — the
  // CSVs and icons must all live at the root. That means no
  // `icons/` subfolder; every PNG sits next to the CSVs and the
  // mapping file references them by bare filename.
  const zip = new JSZip();
  // Play Console rejects any non-CSV/PNG at the ZIP root — no
  // README, no stray files. Keep upload strictly to the three
  // required CSVs + the icon PNGs.
  zip.file('AchievementsMetadata.csv', metadataCsv());
  zip.file('AchievementsLocalizations.csv', localizationsCsv());
  zip.file('AchievementsIconsMappings.csv', iconMappingsCsv());

  let missing = 0;
  for (const a of ACHIEVEMENTS) {
    const iconPath = path.join(ICONS_DIR, `${a.key}.png`);
    if (!fs.existsSync(iconPath)) {
      console.warn(`  missing icon: ${iconPath}`);
      missing++;
      continue;
    }
    // Flat at ZIP root — no `icons/` prefix.
    zip.file(`${a.key}.png`, fs.readFileSync(iconPath));
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.mkdirSync(path.dirname(OUT_ZIP), { recursive: true });
  fs.writeFileSync(OUT_ZIP, buf);

  const sizeKB = (buf.byteLength / 1024).toFixed(1);
  console.log(`\nZIP written: ${path.relative(REPO_ROOT, OUT_ZIP)} (${sizeKB} KB)`);
  console.log(`  ${ACHIEVEMENTS.length} achievements, ${ACHIEVEMENTS.length - missing} icons packed, ${missing} missing.`);
  console.log(`  Total Play Games points budget: ${ACHIEVEMENTS.reduce((s, a) => s + (a.points ?? 0), 0)} / 1000.`);
  if (missing > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
