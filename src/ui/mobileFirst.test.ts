/**
 * Pins — mobile-first UI invariants.
 *
 * Two static-text checks across every .tsx file under src/ui/:
 *
 *  1. **No uncapped `UIScale.font(N)` in DOM components.** The
 *     `font()` helper multiplies the desktop value by 2.5 on phone
 *     with no upper bound — `UIScale.font(17)` becomes 43px, which
 *     is how the Snake Eyes Wager name overflowed the Pactbook card
 *     and how the M10 ending glyph could overflow its card face.
 *     Use `UIScale.fontCapped(desktopPx, maxPhonePx)` instead so the
 *     phone size has an explicit ceiling chosen for the element's
 *     role (prose ≤16, labels 22–28, headlines 28+).
 *
 *  2. **Prose render sites must declare `whiteSpace: pre-wrap`.**
 *     Campaign intros / outros / mission stories are author-written
 *     with literal `"\n" + "\n"` paragraph breaks. Without pre-wrap
 *     every break collapses into a single space and the briefing
 *     reads as one wall — the regression the player flagged on
 *     Snake Eyes' "He's already here." beat. Any block that renders
 *     `{campaign.intro}`, `{campaign.outro}`, `{mission.story}`, or
 *     `{pendingMission.story}` must have `whiteSpace: 'pre-wrap'`
 *     in the enclosing element's style.
 *
 * Both checks read source as text (same style as
 * `src/data/campaigns/customKeys.test.ts`) — fast, no JSDOM render,
 * runs in milliseconds.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const UI_ROOT = 'src/ui';

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      yield* walk(p);
    } else if (
      p.endsWith('.tsx') &&
      !p.endsWith('.test.tsx')
    ) {
      yield p;
    }
  }
}

describe('Mobile-first pins', () => {
  it('no uncapped UIScale.font(N) in DOM components — use UIScale.fontCapped(desktopPx, maxPhonePx)', () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    // Match `UIScale.font(...)` but NOT `UIScale.fontCapped(...)`.
    // `(?!Capped)` lookahead distinguishes the two.
    const re = /UIScale\.font(?!Capped)\(/;
    for (const file of walk(UI_ROOT)) {
      const src = readFileSync(file, 'utf-8');
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (re.test(line)) {
          // Skip lines that mention font( inside a comment about the
          // uncapped pattern (the explanatory blocks we added in the
          // PactbookPanel + SnakeEyesEndingPanel fixes reference
          // `font(N)` historically). Comments start with `//` or `*`.
          const trimmed = line.trimStart();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
          offenders.push({ file, line: i + 1, text: line.trim() });
        }
      });
    }
    expect(
      offenders.length,
      `Uncapped UIScale.font() found in DOM component(s):\n` +
      offenders.map(o => `  ${o.file}:${o.line}  ${o.text}`).join('\n') + `\n\n` +
      `Use UIScale.fontCapped(desktopPx, maxPhonePx) so the phone size has a ceiling.\n` +
      `Pick the cap per the element's role: prose ≤16, labels 22–28, headlines 28+.`,
    ).toBe(0);
  });

  it('prose render sites declare whiteSpace: pre-wrap', () => {
    // Each entry is a render expression we expect to see inside a
    // styled element whose style object contains `whiteSpace`. We
    // search for the expression, then check the preceding ~30 lines
    // (the enclosing element's style block) for `whiteSpace`.
    const PROSE_RENDERS = [
      '{campaign.intro}',
      '{campaign.outro}',
      '{mission.story}',
      '{pendingMission.story}',
    ];
    const offenders: Array<{ file: string; line: number; expr: string }> = [];

    for (const file of walk(UI_ROOT)) {
      const src = readFileSync(file, 'utf-8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const expr of PROSE_RENDERS) {
          if (!lines[i].includes(expr)) continue;
          // Walk back up to 40 lines (or to the previous tag) looking
          // for whiteSpace. Empirically the enclosing div's style
          // block is within 15-20 lines of the render expression.
          let foundWhiteSpace = false;
          const start = Math.max(0, i - 40);
          for (let j = i; j >= start; j--) {
            if (/whiteSpace\s*:/.test(lines[j])) {
              foundWhiteSpace = true;
              break;
            }
            // Stop searching if we hit a `return (` or a previous
            // closing tag — different element, different scope.
            if (/^\s*return\s*\(\s*$/.test(lines[j])) break;
          }
          if (!foundWhiteSpace) {
            offenders.push({ file, line: i + 1, expr });
          }
        }
      }
    }

    expect(
      offenders.length,
      `Prose render site(s) without whiteSpace: pre-wrap:\n` +
      offenders.map(o => `  ${o.file}:${o.line}  renders ${o.expr}`).join('\n') + `\n\n` +
      `Campaign intros / outros / mission stories use literal "\\n" + "\\n" paragraph\n` +
      `breaks. Without whiteSpace: pre-wrap, every break collapses into a single space\n` +
      `and the briefing reads as one wall of text. Add whiteSpace: 'pre-wrap' (or\n` +
      `'pre-line') to the enclosing element's style object.`,
    ).toBe(0);
  });
});
