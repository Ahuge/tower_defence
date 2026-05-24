/**
 * Pin — `MissionResult.custom` keys are namespaced by `factionId`.
 *
 * Why this test exists:
 *   `MissionResult.custom` is a `Record<string, unknown>` shared by
 *   every campaign's star objective predicates and UI surface. A flat
 *   key like `ruinsClaimed` is silently aliased if two campaigns happen
 *   to pick the same name — one campaign's predicate would read the
 *   other's value and either accept a star it shouldn't, or reject one
 *   it should. The author convention (CONTEXT.md, "Author conventions")
 *   is to prefix every new key with `<factionId>_`, e.g.
 *   `void_mirrorWagerWon` instead of `mirrorWagerWon`.
 *
 *   This is item 7 of the campaign-#5-unblocker audit. Existing
 *   un-prefixed keys are GRANDFATHERED via the allowlist below; the
 *   test fails when a new un-prefixed key appears in the source. To
 *   silence the failure on a legitimate cross-campaign key, add it
 *   to the allowlist with a comment.
 *
 * How it works:
 *   - Greps every `*.custom.X` / `*.custom['X']` access and every
 *     `setCustom('X', ...)` call across the source.
 *   - Adds the field names from `GreenwardMissionCustom` (the only
 *     campaign with a typed custom shape today; new campaigns should
 *     follow the same pattern with prefixed keys).
 *   - Each discovered key must either:
 *     (a) match `<factionId>_*` for a known factionId, or
 *     (b) be in the GRANDFATHERED list.
 *   - Otherwise the test fails with a message explaining how to fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Faction-id prefixes that satisfy the namespacing convention. The
 *  set must exactly match the `factionId` values registered in
 *  `CampaignRegistry` (today: arcane, mechanical, nature, void). Add
 *  campaign #5's factionId here when that campaign lands. */
const FACTION_PREFIXES = ['arcane_', 'mechanical_', 'nature_', 'void_'];

/** Keys that existed before this convention was established. Do not
 *  add to this list without first asking "could I rename instead?".
 *  New campaign work MUST use the `<factionId>_*` pattern.
 *
 *  Original ownership:
 *    arcane:   channelsCompleted, channelsInterrupted, heroDeaths
 *    greenward: chantInterruptedFastMs, childUnharmed, civiliansKilled,
 *               distinctCreepUnitsSent, distinctTowerTypesUsed,
 *               headwaterClaimed, heraldKilled, knightKilled,
 *               naveCommittedNonSiege, naveResolvedMode,
 *               reservesRemaining, reservesSpent, ruinsClaimed,
 *               watcherUnharmed, ceremonyClaims, siegeClaims,
 *               mercyClaims
 *    mech:     attackerLeaks, heroHpMin, sendsBought
 *    void:     hotStreakHit, mirrorWagerWon */
const GRANDFATHERED = new Set([
  // arcane
  'channelsCompleted',
  'channelsInterrupted',
  'heroDeaths',
  // greenward
  'ceremonyClaims',
  'chantInterruptedFastMs',
  'childUnharmed',
  'civiliansKilled',
  'distinctCreepUnitsSent',
  'distinctTowerTypesUsed',
  'headwaterClaimed',
  'heraldKilled',
  'knightKilled',
  'mercyClaims',
  'naveCommittedNonSiege',
  'naveResolvedMode',
  'reservesRemaining',
  'reservesSpent',
  'ruinsClaimed',
  'siegeClaims',
  'watcherUnharmed',
  // mech
  'attackerLeaks',
  'heroHpMin',
  'sendsBought',
  // void
  'hotStreakHit',
  'mirrorWagerWon',
]);

/** Files to scan. Keep narrow — only the places where MissionResult.custom
 *  keys are originated, read by predicates, or surfaced to UI. Test files
 *  are excluded; they may probe internals without committing to a key. */
const SCAN_ROOTS = [
  'src/data/campaigns',
  'src/systems/greenward',
  'src/systems/voidc',
];
/** Files outside SCAN_ROOTS that contain setCustom / r.custom accesses
 *  worth scanning. Kept in a separate list so the test can read them
 *  individually (avoids walking all of src/). */
const SCAN_FILES = [
  'src/scenes/GameScene.ts',
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      yield* walk(p);
    } else if (
      (p.endsWith('.ts') || p.endsWith('.tsx')) &&
      !p.endsWith('.test.ts') &&
      !p.endsWith('.test.tsx')
    ) {
      yield p;
    }
  }
}

/** Extract `r.custom.NAME`, `result.custom.NAME`, `ctx.custom.NAME` —
 *  and the bracket forms. */
const ACCESS_RE = /\b(?:[a-zA-Z_$][\w$]*)\.custom(?:\.([a-zA-Z_$][\w$]*)|\[['"]([\w$]+)['"]\])/g;

/** Extract `setCustom('NAME', ...)` / `setCustom("NAME", ...)`. */
const SET_RE = /setCustom\(\s*['"]([\w$]+)['"]/g;

/** Extract field declarations inside a `GreenwardMissionCustom`-style
 *  interface. We look for any interface whose name ends in `Custom`
 *  and pull its top-level field names. */
const INTERFACE_BLOCK_RE = /export\s+interface\s+\w*Custom\s*\{([^}]+)\}/g;
const FIELD_RE = /^\s*([a-zA-Z_$][\w$]*)\s*[?:]/gm;

function extractKeysFromSource(src: string): Set<string> {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = ACCESS_RE.exec(src)) !== null) {
    const key = m[1] ?? m[2];
    if (key) found.add(key);
  }
  while ((m = SET_RE.exec(src)) !== null) {
    found.add(m[1]);
  }
  while ((m = INTERFACE_BLOCK_RE.exec(src)) !== null) {
    const body = m[1];
    let f: RegExpExecArray | null;
    while ((f = FIELD_RE.exec(body)) !== null) {
      found.add(f[1]);
    }
  }
  return found;
}

describe('MissionResult.custom keys — factionId namespacing', () => {
  it('every custom key is either grandfathered or prefixed with a factionId', () => {
    const allKeys = new Set<string>();
    for (const root of SCAN_ROOTS) {
      for (const file of walk(root)) {
        const src = readFileSync(file, 'utf-8');
        for (const k of extractKeysFromSource(src)) allKeys.add(k);
      }
    }
    for (const file of SCAN_FILES) {
      const src = readFileSync(file, 'utf-8');
      for (const k of extractKeysFromSource(src)) allKeys.add(k);
    }

    const offenders: string[] = [];
    for (const key of allKeys) {
      if (GRANDFATHERED.has(key)) continue;
      if (FACTION_PREFIXES.some(p => key.startsWith(p))) continue;
      offenders.push(key);
    }

    expect(
      offenders.length,
      `Un-namespaced MissionResult.custom key(s) found: ${offenders.join(', ')}.\n\n` +
      `Per the author convention in CONTEXT.md, new keys MUST be prefixed with the\n` +
      `owning campaign's factionId, e.g. "arcane_channelsInterrupted" or "void_mirrorWagerWon".\n` +
      `If the key is intentionally shared across campaigns (rare — confirm with the user),\n` +
      `add it to the GRANDFATHERED set in this file with a comment explaining why.`,
    ).toBe(0);
  });
});
