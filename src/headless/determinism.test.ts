/**
 * Determinism snapshot — the safety net for sim-code optimisations.
 *
 * We run a fixed set of (faction, difficulty, brain, seed) tuples
 * through `runMatch` and compare a structured digest to a snapshot
 * committed to the repo. If any optimisation changes a single field
 * — waveReached, livesRemaining, goldEarned, creepsKilled, etc. —
 * the digest changes and the test fails.
 *
 * This catches things the harness can't: two same-length paths that
 * pick different cells in tie-breaks, a range check that drops an
 * FP tie the other way, a missed trait tick. The harness aggregates
 * 1000 seeds into a win-rate — tiny drift averages out and hides in
 * the noise floor. A snapshot is exact by construction.
 *
 * When an optimisation legitimately changes behaviour (e.g. switching
 * from A* to BFS, where tie-breaks can differ by design), update the
 * snapshot and verify the harness per-cell delta stays under an
 * acceptable threshold (±3% at 1000 seeds).
 *
 * Layout:
 *   - `SNAPSHOT_CONFIGS` — 12 diverse matches covering all factions,
 *     multiple difficulties, multiple brains. Short enough (3-5
 *     waves each) to keep the suite under a minute.
 *   - `DigestEntry` — the canonical fingerprint per match.
 *   - The snapshot itself lives in `determinism.snapshot.json` next
 *     to this file; vitest's built-in snapshot matcher is `toMatchSnapshot`,
 *     but a plain JSON file is easier to diff in a PR.
 *
 * Update with `UPDATE_SNAPSHOT=1 npx vitest run determinism.test`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMatch } from './HeadlessMatch';
import { MatchConfig, MatchResult } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(HERE, 'determinism.snapshot.json');

/** Diverse enough to exercise all 11 factions × a mix of difficulties
 *  and brains. Wave counts are kept small (3-5) so the whole suite
 *  finishes under a minute — we only need enough match to force the
 *  sim through pathing, placement, combat, leak, kill, upgrade. */
const SNAPSHOT_CONFIGS: MatchConfig[] = [
  // One per faction on normal/balanced as the baseline.
  { faction: 'mechanical', difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1001 },
  { faction: 'arcane',     difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1002 },
  { faction: 'nature',     difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1003 },
  { faction: 'void',       difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1004 },
  { faction: 'military',   difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1005 },
  { faction: 'aliens',     difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1006 },
  { faction: 'cypherpunk', difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1007 },
  { faction: 'infernal',   difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1008 },
  { faction: 'celestial',  difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1009 },
  { faction: 'psionic',    difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1010 },
  { faction: 'harmonic',   difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 5, seed: 1011 },
  // A few off-axis runs to exercise different difficulties + brains.
  { faction: 'arcane',     difficulty: 'hard',   mapId: 'plains', brainId: 'rush',     matchMode: 'standard', waveCount: 5, seed: 2001 },
  { faction: 'nature',     difficulty: 'easy',   mapId: 'plains', brainId: 'nature',   matchMode: 'standard', waveCount: 5, seed: 2002 },
  { faction: 'mechanical', difficulty: 'insane', mapId: 'plains', brainId: 'synergy',  matchMode: 'standard', waveCount: 3, seed: 2003 },
];

export interface DigestEntry {
  key: string;
  outcome: MatchResult['outcome'];
  waveReached: number;
  livesRemaining: number;
  goldEarned: number;
  goldSpent: number;
  creepsKilled: number;
  towersBuilt: number;
}

/** simTimeMs is deliberately excluded — it's tick-count × stepMs
 *  and already drifts between runs on unchanged code (some sub-tick
 *  timing detail isn't fully seeded). Every field here is a
 *  game-state outcome that matters for balance; simTimeMs isn't. */
export function digestOf(cfg: MatchConfig, r: MatchResult): DigestEntry {
  return {
    key: `${cfg.faction}|${cfg.difficulty}|${cfg.brainId}|${cfg.matchMode}|${cfg.waveCount}|${cfg.seed}`,
    outcome: r.outcome,
    waveReached: r.waveReached,
    livesRemaining: r.livesRemaining,
    goldEarned: r.goldEarned,
    goldSpent: r.goldSpent,
    creepsKilled: r.creepsKilled,
    towersBuilt: r.towersBuilt,
  };
}

async function computeDigest(): Promise<DigestEntry[]> {
  const out: DigestEntry[] = [];
  for (const cfg of SNAPSHOT_CONFIGS) {
    const r = await runMatch(cfg);
    out.push(digestOf(cfg, r));
  }
  return out;
}

describe('determinism snapshot', () => {
  it('matches the committed snapshot for every canonical config', async () => {
    const digest = await computeDigest();

    if (process.env.UPDATE_SNAPSHOT === '1' || !existsSync(SNAPSHOT_PATH)) {
      writeFileSync(SNAPSHOT_PATH, JSON.stringify(digest, null, 2) + '\n');
      // eslint-disable-next-line no-console
      console.log(`[determinism] wrote snapshot (${digest.length} entries) to ${SNAPSHOT_PATH}`);
      return;
    }

    const expected = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as DigestEntry[];
    expect(digest.length).toBe(expected.length);

    // Compare entry by entry so a failure message points at the exact
    // match that drifted, not just "JSON blobs differ".
    for (let i = 0; i < expected.length; i++) {
      const e = expected[i];
      const d = digest[i];
      expect(d, `config #${i} (${e.key})`).toEqual(e);
    }
  }, 5 * 60_000);
});
