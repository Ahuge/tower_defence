/**
 * v6.1.b — Capture Campaign state manager.
 *
 * Orchestrates a sequence of standard-mode matches (one per faction)
 * with capture auto-enabled and per-match auto-export. Campaign state
 * is persisted in localStorage so it survives tab refreshes / accidental
 * navigation. After the last faction, capture is auto-disabled and the
 * player gets a summary.
 *
 * Why UI-orchestrated rather than a new MatchMode:
 *   - Each match is a normal Standard run — no engine plumbing needed.
 *   - We want CLEAN per-faction matches (no income carry-over from
 *     Gauntlet's stage progression), so the cross-stage wiring in
 *     GauntletMode is actively wrong for our use case.
 *   - GameOverScreen reads the campaign state and shows
 *     "Save & Next Faction" instead of normal buttons.
 *
 * State shape (in localStorage under STATE_KEY):
 *   {
 *     active: true,
 *     difficulty: 'normal' | ...,
 *     factionOrder: ['arcane', 'void', ...],
 *     currentIndex: 0..N-1,
 *     startedAt: number (ms),
 *     results: [{ faction, outcome, waveReached, savedFilename }, ...]
 *   }
 */
import { FactionId, REAL_FACTIONS } from '../data/Factions';
import { DifficultyLevel } from '../data/Difficulty';
import { setCaptureEnabled } from './learning/LiveCapture';

const STATE_KEY = 'td_capture_campaign_state';

export interface CaptureCampaignResult {
  faction: FactionId;
  outcome: 'win' | 'loss' | 'timeout' | 'error';
  waveReached: number;
  savedFilename?: string;  // filled in after the player saves the recording
}

export interface CaptureCampaignState {
  active: boolean;
  difficulty: DifficultyLevel;
  factionOrder: FactionId[];
  currentIndex: number;
  startedAt: number;
  results: CaptureCampaignResult[];
}

/** Read current state from localStorage. Returns null when no campaign
 *  is active (or storage is sandboxed). */
export function getState(): CaptureCampaignState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaptureCampaignState;
    if (!parsed.active) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: CaptureCampaignState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (state === null) window.localStorage.removeItem(STATE_KEY);
    else window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch { /* ignore sandboxed env */ }
}

/** Start a new capture campaign. Auto-enables capture. Optional preset
 *  faction order; default is a shuffled REAL_FACTIONS list. */
export function startCampaign(
  difficulty: DifficultyLevel = 'normal',
  factionOrder?: FactionId[],
): CaptureCampaignState {
  const order = factionOrder ?? shuffle([...REAL_FACTIONS]);
  const state: CaptureCampaignState = {
    active: true,
    difficulty,
    factionOrder: order,
    currentIndex: 0,
    startedAt: Date.now(),
    results: [],
  };
  writeState(state);
  setCaptureEnabled(true);
  return state;
}

/** Record the just-finished match's outcome and advance to the next
 *  faction. Returns the next faction id, or null if the campaign just
 *  completed (in which case capture is auto-disabled). */
export function recordResultAndAdvance(
  outcome: CaptureCampaignResult['outcome'],
  waveReached: number,
  savedFilename?: string,
): FactionId | null {
  const state = getState();
  if (!state) return null;
  state.results.push({
    faction: state.factionOrder[state.currentIndex],
    outcome, waveReached, savedFilename,
  });
  state.currentIndex++;
  if (state.currentIndex >= state.factionOrder.length) {
    // Campaign complete.
    state.active = false;
    writeState(state);
    setCaptureEnabled(false);
    return null;
  }
  writeState(state);
  return state.factionOrder[state.currentIndex];
}

/** Mark the just-finished match's filename. Useful if the player
 *  saves the file AFTER recordResultAndAdvance has already moved on
 *  (e.g. the GameOverScreen shows the "Save" button alongside the
 *  "Next" button). For v6.1.b we record both atomically. */
export function setLastSavedFilename(filename: string): void {
  const state = getState();
  if (!state) return;
  if (state.results.length === 0) return;
  state.results[state.results.length - 1].savedFilename = filename;
  writeState(state);
}

/** Abort the campaign without going through every faction. Disables
 *  capture and clears state. */
export function cancelCampaign(): void {
  writeState(null);
  setCaptureEnabled(false);
}

/** Read the completed campaign's results without clearing state. Used
 *  by the summary screen. Returns null if no campaign was started. */
export function getCompletedResults(): CaptureCampaignState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CaptureCampaignState;
  } catch {
    return null;
  }
}

/** Clear a finished campaign's saved state (e.g. after the player
 *  acknowledges the summary screen). */
export function clearCompletedCampaign(): void {
  writeState(null);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
