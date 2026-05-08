import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isCaptureEnabled, setCaptureEnabled,
  startSession, recordAction, finishSession,
  exportJSONL, clearAll,
} from './LiveCapture';

const SESSION_KEY = 'learning.capture.session';
const ROWS_KEY = 'learning.capture.rows';
const ENABLE_KEY = 'learning.capture';

// Minimal BotContext mock — FeatureExtractor must accept it. We pass
// the smallest viable shape; the real flow has GameScene assemble the
// full context, but for testing the capture timing/quality fields we
// only need the parts FeatureExtractor reads.
function mockCtx(wave = 5) {
  return {
    playerIndex: 0,
    faction: 'arcane',
    candidateCells: [],
    towerPool: [],
    budget: 100,
    wave,
    lives: 20,
    grid: { rows: 26, cols: 36, cells: [] },
    allPaths: [],
    placedTowers: [],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: false,
    upcomingWaves: [],
    creepRoster: [],
    factionPool: [],
  } as unknown as Parameters<typeof recordAction>[0];
}

describe('LiveCapture v6.1.c quality fields', () => {
  beforeEach(() => {
    clearAll();
    localStorage.removeItem(ENABLE_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROWS_KEY);
  });

  afterEach(() => {
    clearAll();
    localStorage.removeItem(ENABLE_KEY);
  });

  it('exports captureVersion=2 by default', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal', 'plains', null);
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const jsonl = exportJSONL();
    expect(jsonl).toContain('"captureVersion":2');
  });

  it('records decisionAtMs as ms-from-session-start', async () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal');
    // Wait a tiny bit so decisionAtMs is non-zero.
    await new Promise(r => setTimeout(r, 30));
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const jsonl = exportJSONL();
    const row = JSON.parse(jsonl.trim().split('\n')[0]);
    expect(row.decisionAtMs).toBeGreaterThanOrEqual(20);
    expect(row.decisionAtMs).toBeLessThan(5000);
  });

  it('does NOT export thinkingMs (removed from v6.1.c per user direction)', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal');
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const jsonl = exportJSONL();
    const row = JSON.parse(jsonl.trim().split('\n')[0]);
    expect(row.thinkingMs).toBeUndefined();
  });

  it('aborted flag defaults to false', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal');
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const row = JSON.parse(exportJSONL().trim().split('\n')[0]);
    expect(row.aborted).toBe(false);
  });

  it('aborted flag set when finishSession receives aborted=true', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal');
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('loss', 3, true);
    const row = JSON.parse(exportJSONL().trim().split('\n')[0]);
    expect(row.aborted).toBe(true);
  });

  it('modifier persists from startSession through export', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal', 'plains', 'aether_storm');
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const row = JSON.parse(exportJSONL().trim().split('\n')[0]);
    expect(row.modifier).toBe('aether_storm');
  });

  it('mapId persists from startSession through export', () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal', 'serpentine', null);
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    const row = JSON.parse(exportJSONL().trim().split('\n')[0]);
    expect(row.mapId).toBe('serpentine');
  });

  it('durationMs is non-zero and ≥ session lifespan', async () => {
    setCaptureEnabled(true);
    startSession('arcane', 'normal');
    recordAction(mockCtx(1), { kind: 'skip' });
    await new Promise(r => setTimeout(r, 25));
    finishSession('win', 20);
    const row = JSON.parse(exportJSONL().trim().split('\n')[0]);
    expect(row.durationMs).toBeGreaterThanOrEqual(20);
  });

  it('does NOT record any rows when capture is disabled', () => {
    setCaptureEnabled(false);
    expect(isCaptureEnabled()).toBe(false);
    startSession('arcane', 'normal');
    recordAction(mockCtx(1), { kind: 'skip' });
    finishSession('win', 20);
    expect(exportJSONL()).toBe('');
  });
});
