/**
 * LiveCapture — records human-player decisions during live gameplay
 * for later training-data export. Activated via URL param
 * `?capture=1` or localStorage flag `learning.capture=1`. When off,
 * all hooks are no-ops (zero overhead in normal play).
 *
 * Captured rows match the same schema RecorderBrain emits in the
 * headless harness (turns.jsonl), so once exported they concatenate
 * directly into the bot dataset before retraining. Proposer is
 * tagged `'human'` — extends the brain-id one-hot the regressor
 * sees during inference.
 *
 * Storage:
 *   localStorage[learning.capture.session]   — one in-flight match
 *                                              (cleared on finish)
 *   localStorage[learning.capture.rows]      — completed-match rows,
 *                                              one match per JSON
 *                                              array entry
 *
 * Use exportAll() to download as JSONL. Use clear() to reset.
 */
import { BotContext, BotDecision, PlacedTower } from '../bots/BotBrain';
import { extractStateFeatures, extractActionFeatures } from '../bots/learning/FeatureExtractor';

interface InFlightTurn {
  turnIdx: number;
  stateFeatures: number[];
  actionFeatures: number[];
  decisionKind: BotDecision['kind'];
  /** Raw decision shape — needed to reconstruct the action so a
   *  HumanReplayBrain can re-emit it later. Captures col/row plus
   *  the tower id (for places) or branch id (for upgrades).
   *  The encoded actionFeatures vector is lossy; this preserves
   *  every dimension of the original choice. */
  decisionRaw: {
    kind: BotDecision['kind'];
    col?: number;
    row?: number;
    towerId?: string;
    branch?: string;
    sendOptionId?: string;
    buildingId?: string;
    /** frontierManage extras — `action` is one of overcharge / dig
     *  / harvest; target is exactly one of (idx for a single owned
     *  building, defId for batch-of-type). */
    action?: 'overcharge' | 'dig' | 'harvest';
    defId?: string;
    idx?: number;
  };
  faction: string;
  difficulty: string;
  wave: number;
  /** v6.1.c: ms elapsed from session start to this decision. Lets us
   *  reconstruct the pacing of the match — how soon the player got
   *  the maze up, how long they let waves stew before adjusting. */
  decisionAtMs: number;
}

interface FinishedMatch {
  matchId: number;
  generatedAt: string;
  faction: string;
  difficulty: string;
  outcome: 'win' | 'loss' | 'error';
  waveReached: number;
  turns: InFlightTurn[];
  /** v6.1.c: capture-format version. Bump on schema changes so the
   *  training-side ingest can detect / migrate / drop incompatible
   *  rows. v1 = original schema (no timing, no quality fields). */
  captureVersion: number;
  /** v6.1.c: true when finishSession() was called via the abort path
   *  (player quit out of the match) rather than a natural game-over
   *  event. Training filters out aborted runs that died early since
   *  they don't represent intentional play. */
  aborted: boolean;
  /** v6.1.c: the match's modifier-lock state. null when modifiers
   *  were locked off (the standard capture path); the modifier id
   *  when one was active despite the lock (signals data corruption,
   *  ingest filter drops these rows). */
  modifier: string | null;
  /** v6.1.c: the map this match ran on. Currently always 'plains'
   *  for standard mode but stored explicitly for forward compat. */
  mapId: string;
  /** v6.1.c: total wall time in ms from session start to finish.
   *  Useful for cross-matching with thinkingMs and for filtering
   *  unrealistically-fast matches (sub-1-min full play). */
  durationMs: number;
}

const SESSION_KEY = 'learning.capture.session';
const ROWS_KEY    = 'learning.capture.rows';
const ENABLE_KEY  = 'learning.capture';

let session: {
  faction: string;
  difficulty: string;
  mapId: string;
  modifier: string | null;
  startedAt: number;
  turnIdx: number;
  turns: InFlightTurn[];
} | null = null;

const CAPTURE_VERSION = 2;

export function isCaptureEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('capture') === '1') return true;
    if (window.localStorage.getItem(ENABLE_KEY) === '1') return true;
  } catch { /* sandboxed env, ignore */ }
  return false;
}

export function setCaptureEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(ENABLE_KEY, '1');
    else window.localStorage.removeItem(ENABLE_KEY);
  } catch { /* ignore */ }
}

/** Begin a new capture session. Idempotent — recalls overwrite the
 *  in-flight session, dropping its turns (so a quit-restart cycle
 *  doesn't bleed across matches). */
export function startSession(
  faction: string, difficulty: string,
  mapId: string = 'plains', modifier: string | null = null,
): void {
  if (!isCaptureEnabled()) { session = null; return; }
  session = {
    faction,
    difficulty,
    mapId,
    modifier,
    startedAt: Date.now(),
    turnIdx: 0,
    turns: [],
  };
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch { /* ignore */ }
}

/** Record one human action. `ctx` is a synthetic BotContext built
 *  from GameScene state at the moment of action — the same featurizer
 *  the bot pathway uses runs against it, so train and infer match. */
export function recordAction(ctx: BotContext, decision: BotDecision): void {
  if (!session) return;
  try {
    // Preserve the raw shape so HumanReplayBrain can reconstruct
    // the exact action later. The actionFeatures vector is lossy
    // (encodes role/cost/etc but not towerId/cell/branch).
    const raw: InFlightTurn['decisionRaw'] = { kind: decision.kind };
    if (decision.kind === 'place') {
      raw.col = decision.col;
      raw.row = decision.row;
      raw.towerId = decision.type.id;
    } else if (decision.kind === 'upgrade') {
      raw.col = decision.col;
      raw.row = decision.row;
      if (decision.branch) raw.branch = decision.branch;
    } else if (decision.kind === 'sell') {
      raw.col = decision.col;
      raw.row = decision.row;
    } else if (decision.kind === 'send') {
      raw.sendOptionId = decision.sendOptionId;
    } else if (decision.kind === 'frontier') {
      raw.buildingId = decision.buildingId;
    } else if (decision.kind === 'frontierManage') {
      raw.action = decision.action;
      if (decision.idx !== undefined) raw.idx = decision.idx;
      if (decision.defId) raw.defId = decision.defId;
    }
    // v6.1.c: per-turn timestamp — ms offset from session start.
    // Lets us reconstruct match pacing later without tracking a
    // running thinking-time field.
    const decisionAtMs = Date.now() - session.startedAt;
    const turn: InFlightTurn = {
      turnIdx: session.turnIdx++,
      stateFeatures: extractStateFeatures(ctx),
      actionFeatures: extractActionFeatures(ctx, decision, 'human'),
      decisionKind: decision.kind,
      decisionRaw: raw,
      faction: session.faction,
      difficulty: session.difficulty,
      wave: ctx.wave,
      decisionAtMs,
    };
    session.turns.push(turn);
  } catch (err) {
    // Capture must never crash the game. Swallow any extraction
    // errors and keep the session alive.
    if (typeof console !== 'undefined') console.warn('[LiveCapture] recordAction failed:', err);
  }
}

/** Close out the current session with its outcome. Appends the
 *  finished match to localStorage rows; the player exports later.
 *  v6.1.c: `aborted=true` flags non-natural endings (player quit
 *  out via menu, scene-stop without a game-over event). Training
 *  filters drop aborted runs that died early. */
export function finishSession(
  outcome: 'win' | 'loss' | 'error',
  waveReached: number,
  aborted: boolean = false,
): void {
  if (!session) return;
  if (session.turns.length === 0) {
    // No actions captured (player quit before doing anything).
    session = null;
    return;
  }
  try {
    const matchId = Date.now();
    const durationMs = matchId - session.startedAt;
    const finished: FinishedMatch = {
      matchId,
      generatedAt: new Date().toISOString(),
      faction: session.faction,
      difficulty: session.difficulty,
      outcome,
      waveReached,
      turns: session.turns,
      captureVersion: CAPTURE_VERSION,
      aborted,
      modifier: session.modifier,
      mapId: session.mapId,
      durationMs,
    };
    if (typeof window !== 'undefined') {
      const existingRaw = window.localStorage.getItem(ROWS_KEY);
      const existing: FinishedMatch[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(finished);
      window.localStorage.setItem(ROWS_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    if (typeof console !== 'undefined') console.warn('[LiveCapture] finishSession failed:', err);
  }
  session = null;
}

/** Clear all captured data. */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(ROWS_KEY);
  } catch { /* ignore */ }
  session = null;
}

/** Stats for the dev UI: total finished matches, total wins,
 *  total turns. */
export function getStats(): { matches: number; wins: number; turns: number } {
  if (typeof window === 'undefined') return { matches: 0, wins: 0, turns: 0 };
  try {
    const raw = window.localStorage.getItem(ROWS_KEY);
    if (!raw) return { matches: 0, wins: 0, turns: 0 };
    const rows: FinishedMatch[] = JSON.parse(raw);
    let wins = 0, turns = 0;
    for (const m of rows) {
      if (m.outcome === 'win') wins++;
      turns += m.turns.length;
    }
    return { matches: rows.length, wins, turns };
  } catch {
    return { matches: 0, wins: 0, turns: 0 };
  }
}

/** Export everything captured as JSONL. Same row schema as
 *  ml/training-data/turns.jsonl from the headless harness, so the
 *  exported file appends directly. */
export function exportJSONL(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(ROWS_KEY);
    if (!raw) return '';
    const rows: FinishedMatch[] = JSON.parse(raw);
    const lines: string[] = [];
    for (const m of rows) {
      const won = m.outcome === 'win' ? 1 : 0;
      for (const t of m.turns) {
        lines.push(JSON.stringify({
          matchId: m.matchId,
          turnIdx: t.turnIdx,
          stateFeatures: t.stateFeatures,
          actionFeatures: t.actionFeatures,
          decisionKind: t.decisionKind,
          decisionRaw: t.decisionRaw,
          faction: t.faction,
          brain: 'human',
          difficulty: t.difficulty,
          wave: t.wave,
          outcome: m.outcome,
          won,
          waveReached: m.waveReached,
          // v6.1.c: per-turn timing
          decisionAtMs: t.decisionAtMs ?? null,
          // v6.1.c: match-level quality. Older matches without these
          // fields export as nulls; ingest filter drops them when
          // captureVersion < 2.
          captureVersion: m.captureVersion ?? 1,
          aborted: m.aborted ?? false,
          modifier: m.modifier ?? null,
          mapId: m.mapId ?? null,
          durationMs: m.durationMs ?? null,
        }));
      }
    }
    return lines.join('\n') + '\n';
  } catch {
    return '';
  }
}

/** Trigger a browser download of the JSONL. Convenience for the
 *  dev UI button. */
export function downloadJSONL(filename = 'human-turns.jsonl'): void {
  if (typeof window === 'undefined') return;
  const text = exportJSONL();
  if (!text) return;
  const blob = new Blob([text], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a synthetic BotContext from live game state. Same shape
 *  as the BotAI driver assembles for bot brains — featurizer can't
 *  tell the difference. Faction and difficulty come from the
 *  in-flight session; everything else is read from the GameScene's
 *  current snapshot. */
export interface CtxSnapshot {
  faction: string;
  wave: number;
  lives: number;
  budget: number;
  candidateCells: { col: number; row: number }[];
  placedTowers: PlacedTower[];
  allPaths: any[]; // PathPoint[][] — opaque for capture, only featurizer reads it
  betweenWaves: boolean;
}

export function buildCtxFromSnapshot(snap: CtxSnapshot): BotContext {
  return {
    playerIndex: 0,
    faction: snap.faction as any,
    candidateCells: snap.candidateCells,
    towerPool: [],
    budget: snap.budget,
    wave: snap.wave,
    lives: snap.lives,
    grid: null as any, // featurizer doesn't read grid directly
    allPaths: snap.allPaths,
    placedTowers: snap.placedTowers,
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: snap.betweenWaves,
  };
}

// Expose for power users / debugging from the browser console.
if (typeof window !== 'undefined') {
  (window as any).__learningCapture = {
    isEnabled: isCaptureEnabled,
    setEnabled: setCaptureEnabled,
    stats: getStats,
    exportJSONL,
    downloadJSONL,
    clear: clearAll,
  };
}
