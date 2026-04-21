/**
 * Reverse of `extract-game-text.mjs` — parses the rewritten markdown
 * under `text-rewrites/` and patches the corresponding string
 * literals back into the TypeScript source.
 *
 * Usage:
 *   node scripts/apply-text-rewrites.mjs
 *     → applies every text-rewrites/*.md file that has edits
 *   node scripts/apply-text-rewrites.mjs tutorial factions
 *     → only those files (match against filename without .md)
 *
 * Safety design:
 *   - Only UPDATES existing string-literal property values. Never
 *     adds new properties or deletes existing ones.
 *   - Resolves each entry by (source file, line number, context id)
 *     — if all three match, apply; otherwise warn + skip.
 *   - Applies all edits per-file right-to-left so earlier
 *     substitutions don't shift later positions.
 *   - Preserves the original quote style (single / double / template
 *     literal) and re-escapes content appropriately.
 *   - Skips fields whose markdown value is identical to the current
 *     source value — no touching lines that didn't change.
 *
 * This does NOT run a typecheck or test pass after applying; do that
 * manually (`npx tsc --noEmit && npm test`) before committing.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REWRITES_DIR = path.join(REPO_ROOT, 'text-rewrites');

// Target domains → source filename under text-rewrites. Kept in
// lockstep with JOBS in extract-game-text.mjs.
const DOMAINS = ['tutorial', 'factions', 'towers', 'heroes', 'creeps', 'maps', 'draft-modifiers', 'skins'];

/**
 * Parse a rewritten markdown file into `{sourceFile, line, context, copy}[]`.
 *
 * Each entry in the markdown looks like:
 *
 *     ### `id=arcane` `towerId=arcane_bolt`
 *     <sub>src/data/Factions.ts:13</sub>
 *
 *     **name**:
 *
 *     > Arcane
 *
 *     **description**:
 *
 *     > High Fantasy precision magic.
 *     > Second-line continuation.
 *
 * Blockquote prefixes (`> `) are stripped and joined with '\n' so
 * multi-line strings round-trip cleanly.
 */
function parseMarkdown(text) {
  const entries = [];
  const lines = text.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      // Entry header. Parse context pairs like `key=value`.
      const context = {};
      const contextPairs = line.slice(4).matchAll(/`([^`=]+)=([^`]+)`/g);
      for (const m of contextPairs) context[m[1]] = m[2];

      // Next line must be the <sub>src/...ts:N</sub> location. Allow
      // a blank line between header and sub in case markdown
      // renderers normalise that.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const subMatch = lines[j]?.match(/^<sub>(.+?):(\d+)<\/sub>/);
      if (!subMatch) {
        // Malformed — skip this header.
        i = j + 1;
        continue;
      }
      const sourceFile = subMatch[1];
      const sourceLine = parseInt(subMatch[2], 10);

      // Walk forward collecting copy fields until the next `---` or
      // the next `### ` header.
      const copy = {};
      j++;
      let currentField = null;
      let currentLines = [];
      const flush = () => {
        if (currentField) {
          // Trim trailing empty lines — markdown often has a blank
          // line between blockquote and the next `**field**:`.
          while (currentLines.length > 0 && currentLines[currentLines.length - 1] === '') {
            currentLines.pop();
          }
          copy[currentField] = currentLines.join('\n');
        }
        currentField = null;
        currentLines = [];
      };
      while (j < lines.length) {
        const cur = lines[j];
        if (cur.startsWith('### ') || cur.trim() === '---') {
          flush();
          break;
        }
        const fieldMatch = cur.match(/^\*\*(\w+)\*\*:$/);
        if (fieldMatch) {
          flush();
          currentField = fieldMatch[1];
        } else if (currentField) {
          if (cur.startsWith('> ')) {
            currentLines.push(cur.slice(2));
          } else if (cur.startsWith('>')) {
            // Empty blockquote line.
            currentLines.push(cur.slice(1).replace(/^ /, ''));
          }
          // Lines that are plain blank between paragraphs are
          // dropped — the > prefix is the canonical source-of-truth.
        }
        j++;
      }
      flush();
      entries.push({ sourceFile, line: sourceLine, context, copy });
      i = j;
      continue;
    }
    i++;
  }
  return entries;
}

function getOriginalStringContent(sourceText, node) {
  // StringLiteral / NoSubstitutionTemplateLiteral carry .text already
  // unescaped. Return the decoded content for equality comparisons.
  return node.text;
}

function getNodeQuoteStyle(sourceText, node) {
  const raw = sourceText.slice(node.getStart(), node.getEnd());
  if (raw.startsWith('`')) return 'template';
  if (raw.startsWith('"')) return 'double';
  return 'single';
}

function escapeForQuoteStyle(value, style) {
  if (style === 'template') {
    return '`' + value
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${') + '`';
  }
  const quote = style === 'double' ? '"' : "'";
  // Escape backslash, the quote character, and newlines.
  const body = value
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote, 'g'), '\\' + quote)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return quote + body + quote;
}

function chooseQuoteStyleForNewValue(originalStyle, newValue) {
  // If the original was a template literal, keep it as one — the
  // author may have chosen backticks specifically for multi-line
  // authoring readability even if the value fits in a single line.
  if (originalStyle === 'template') return 'template';
  // If the new value contains a newline and the original wasn't
  // template, upgrade to template so the source reads nicely
  // instead of embedding "\n" escapes across long copy.
  if (/\n/.test(newValue)) return 'template';
  return originalStyle;
}

const COPY_FIELDS = new Set([
  'name', 'description', 'title', 'body', 'flavour', 'flavor',
  'label', 'sublabel', 'text', 'summary',
]);
const CONTEXT_FIELDS = ['id', 'towerId', 'heroId', 'factionId', 'mapId', 'creepTypeId'];

/** For an object literal AST node, read its context fields (id etc.)
 *  so we can match against the markdown entry's context block. */
function readObjectContext(node) {
  const ctx = {};
  if (!ts.isObjectLiteralExpression(node)) return ctx;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    let key;
    if (ts.isIdentifier(prop.name)) key = prop.name.text;
    else if (ts.isStringLiteral(prop.name)) key = prop.name.text;
    else continue;
    if (!CONTEXT_FIELDS.includes(key)) continue;
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      ctx[key] = prop.initializer.text;
    }
  }
  return ctx;
}

/** For an object literal, find the property assignment whose key is
 *  `field` and whose initializer is a string / template literal.
 *  Returns the initializer node, or null. */
function findCopyInitializer(node, field) {
  if (!ts.isObjectLiteralExpression(node)) return null;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    let key;
    if (ts.isIdentifier(prop.name)) key = prop.name.text;
    else if (ts.isStringLiteral(prop.name)) key = prop.name.text;
    else continue;
    if (key !== field) continue;
    const init = prop.initializer;
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init;
    return null;
  }
  return null;
}

/** Walk an AST and collect every object-literal node that starts on
 *  the given 1-based line number. Usually exactly one; we return
 *  the list so callers can match by context fields when there's
 *  ambiguity. */
function objectLiteralsAtLine(sourceFile, line) {
  const hits = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      if (startLine + 1 === line) hits.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return hits;
}

function applyEntriesToSource(sourceFile, sourceText, entries, warnings) {
  // Collect all per-field edits first, then apply right-to-left.
  const edits = [];
  for (const entry of entries) {
    const candidates = objectLiteralsAtLine(sourceFile, entry.line);
    if (candidates.length === 0) {
      warnings.push(`${entry.sourceFile}:${entry.line} — no object literal found (source moved since extract?). Entry context: ${JSON.stringify(entry.context)}`);
      continue;
    }
    // Pick the candidate whose context fields match the markdown's
    // context block. If no context was extracted (anonymous entry),
    // require exactly one candidate.
    let match = null;
    if (Object.keys(entry.context).length === 0) {
      if (candidates.length === 1) match = candidates[0];
      else {
        warnings.push(`${entry.sourceFile}:${entry.line} — multiple anonymous object literals here, can't disambiguate`);
        continue;
      }
    } else {
      for (const c of candidates) {
        const ctx = readObjectContext(c);
        const same = Object.entries(entry.context).every(([k, v]) => ctx[k] === v);
        if (same) { match = c; break; }
      }
      if (!match) {
        warnings.push(`${entry.sourceFile}:${entry.line} — no object literal matched context ${JSON.stringify(entry.context)}`);
        continue;
      }
    }

    // Apply each copy field.
    for (const [field, newValue] of Object.entries(entry.copy)) {
      if (!COPY_FIELDS.has(field)) continue;
      const init = findCopyInitializer(match, field);
      if (!init) {
        warnings.push(`${entry.sourceFile}:${entry.line} — field "${field}" not found on matched object`);
        continue;
      }
      const currentValue = init.text;
      if (currentValue === newValue) continue;  // unchanged, skip

      const style = getNodeQuoteStyle(sourceText, init);
      const chosen = chooseQuoteStyleForNewValue(style, newValue);
      const replacement = escapeForQuoteStyle(newValue, chosen);
      edits.push({
        start: init.getStart(sourceFile),
        end: init.getEnd(),
        replacement,
        field,
        contextLabel: Object.entries(entry.context).map(([k, v]) => `${k}=${v}`).join(' '),
      });
    }
  }
  // Sort right-to-left by start offset, apply.
  edits.sort((a, b) => b.start - a.start);
  let patched = sourceText;
  for (const e of edits) {
    patched = patched.slice(0, e.start) + e.replacement + patched.slice(e.end);
  }
  return { patched, editCount: edits.length, edits };
}

function run(domains) {
  const filter = domains.length > 0 ? new Set(domains) : null;
  const entriesByFile = new Map();
  let totalEntries = 0;

  for (const domain of DOMAINS) {
    if (filter && !filter.has(domain)) continue;
    const mdPath = path.join(REWRITES_DIR, `${domain}.md`);
    if (!fs.existsSync(mdPath)) {
      console.warn(`skip: ${mdPath} does not exist`);
      continue;
    }
    const text = fs.readFileSync(mdPath, 'utf-8');
    const entries = parseMarkdown(text);
    totalEntries += entries.length;
    for (const entry of entries) {
      const abs = path.resolve(REPO_ROOT, entry.sourceFile);
      if (!entriesByFile.has(abs)) entriesByFile.set(abs, []);
      entriesByFile.get(abs).push(entry);
    }
    console.log(`parsed ${domain}.md: ${entries.length} entries`);
  }

  console.log(`\nApplying to ${entriesByFile.size} source files...`);
  const warnings = [];
  let totalEdits = 0;
  for (const [abs, entries] of entriesByFile) {
    const sourceText = fs.readFileSync(abs, 'utf-8');
    const sf = ts.createSourceFile(abs, sourceText, ts.ScriptTarget.Latest, true);
    const { patched, editCount, edits } = applyEntriesToSource(sf, sourceText, entries, warnings);
    if (editCount === 0) {
      console.log(`  ${path.relative(REPO_ROOT, abs)}: 0 changes`);
      continue;
    }
    fs.writeFileSync(abs, patched, 'utf-8');
    console.log(`  ${path.relative(REPO_ROOT, abs)}: ${editCount} changes`);
    for (const e of edits) {
      console.log(`      · [${e.contextLabel || '?'}] ${e.field}`);
    }
    totalEdits += editCount;
  }

  console.log(`\nTotal: ${totalEdits} string literals rewritten across ${entriesByFile.size} source files.`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warnings:`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  console.log('\nVerify with: npx tsc --noEmit && npm test');
}

const argv = process.argv.slice(2);
run(argv);
