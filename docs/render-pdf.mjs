#!/usr/bin/env node
/**
 * Render a markdown doc to PDF.
 *
 * Usage: node docs/render-pdf.mjs <input.md> <output.pdf>
 *
 * Uses `marked` for markdown -> HTML and wkhtmltopdf (installed on the
 * host; see `which wkhtmltopdf`) for HTML -> PDF. Wraps the rendered
 * HTML in an inline-styled shell so the PDF is readable without
 * external CSS assets.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { marked } from 'marked';

const [, , mdPath, pdfPath] = process.argv;
if (!mdPath || !pdfPath) {
  console.error('usage: render-pdf.mjs <input.md> <output.pdf>');
  process.exit(1);
}

const md = readFileSync(mdPath, 'utf-8');
const body = marked.parse(md);

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>Cross-Platform Release Plan</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 11pt; line-height: 1.5; color: #1a1a1a; max-width: 7.5in; margin: 0 auto; padding: 0.3in 0.5in; }
  h1 { font-size: 22pt; margin-top: 0; border-bottom: 2px solid #444; padding-bottom: 6pt; }
  h2 { font-size: 15pt; margin-top: 18pt; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
  h3 { font-size: 12pt; margin-top: 14pt; color: #2a4770; }
  p, li { font-size: 10.5pt; }
  ul, ol { padding-left: 1.2em; }
  li { margin-bottom: 3pt; }
  code { background: #f4f4f4; padding: 1pt 4pt; border-radius: 3px; font-size: 9.5pt;
    font-family: ui-monospace, Consolas, 'Courier New', monospace; }
  pre { background: #f6f8fa; padding: 8pt; border-radius: 4px; overflow-x: auto;
    font-size: 9.5pt; font-family: ui-monospace, Consolas, 'Courier New', monospace; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 9.5pt; }
  th, td { border: 1px solid #ccc; padding: 4pt 8pt; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  blockquote { border-left: 3px solid #aac; margin: 8pt 0; padding: 2pt 10pt; color: #555; }
  a { color: #2b5aa0; text-decoration: none; }
  strong { color: #000; }
  hr { border: none; border-top: 1px solid #ddd; margin: 18pt 0; }
</style>
</head><body>
${body}
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'pdf-'));
const htmlPath = join(tmp, 'doc.html');
writeFileSync(htmlPath, html);

execSync(
  `wkhtmltopdf --quiet --enable-local-file-access --margin-top 15mm --margin-bottom 15mm --margin-left 15mm --margin-right 15mm "${htmlPath}" "${pdfPath}"`,
  { stdio: 'inherit' },
);
console.log(`Wrote ${pdfPath}`);
