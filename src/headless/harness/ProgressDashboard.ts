/**
 * Live terminal dashboard for the harness. Redraws in place on
 * stderr using ANSI escapes so the status stays pinned to the
 * bottom of the terminal even as the full log streams to disk.
 *
 * Design goals:
 *   - Zero new dependencies (no blessed / ink).
 *   - Works on any VT100-ish terminal; no-op when not a TTY.
 *   - Doesn't fight with the stdout report — writes to stderr.
 *   - Throttled to ~4 FPS so fast task completions don't churn.
 *
 * Layout (redrawn each frame):
 *
 *   ╭─ balance harness ──────────────────────────────────╮
 *   │ 184/233  [██████████████████░░░░] 78.9%  ETA 1m52s │
 *   │ elapsed 6m12s  ·  rate 29.6 /min  ·  ✗ errors: 0   │
 *   ├─ workers (18) ─────────────────────────────────────┤
 *   │ w0  busy   arcane.3    8.2s                        │
 *   │ w1  busy   nature.12   4.1s                        │
 *   │ ...                                                │
 *   ╰────────────────────────────────────────────────────╯
 */
import type { ProgressEvent, WorkerStatus } from './Pool';

const ANSI = {
  cursorUp: (n: number) => `\x1b[${n}A`,
  clearLine: '\x1b[2K',
  cursorToCol0: '\r',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

export interface DashboardOpts {
  /** Force enable/disable. Default: enabled if stderr is a TTY. */
  enabled?: boolean;
  /** Minimum ms between redraws. */
  redrawEveryMs?: number;
}

export class ProgressDashboard {
  private enabled: boolean;
  private redrawEveryMs: number;
  private startMs = Date.now();
  private lastDrawMs = 0;
  private linesDrawn = 0;
  private errors = 0;
  private lastDone = 0;
  private lastEvent: ProgressEvent | null = null;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(opts: DashboardOpts = {}) {
    this.enabled = opts.enabled ?? Boolean(process.stderr.isTTY);
    this.redrawEveryMs = opts.redrawEveryMs ?? 250;
  }

  start(): void {
    if (!this.enabled) return;
    process.stderr.write(ANSI.hideCursor);
    // Periodic tick so elapsed time + active-task durations refresh
    // even when no new events arrive.
    this.tickTimer = setInterval(() => {
      if (this.lastEvent) this.draw(this.lastEvent, true);
    }, this.redrawEveryMs);
  }

  stop(): void {
    if (!this.enabled) return;
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
    this.clear();
    process.stderr.write(ANSI.showCursor);
  }

  onProgress = (ev: ProgressEvent): void => {
    this.lastEvent = ev;
    if (ev.kind === 'taskError') this.errors++;
    this.draw(ev, false);
  };

  private draw(ev: ProgressEvent, throttled: boolean): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (throttled && now - this.lastDrawMs < this.redrawEveryMs) return;
    this.lastDrawMs = now;

    const lines = this.render(ev);
    this.clear();
    process.stderr.write(lines.join('\n') + '\n');
    this.linesDrawn = lines.length;
  }

  private clear(): void {
    if (!this.enabled || this.linesDrawn === 0) return;
    // draw() ends with a trailing '\n', so the cursor sits one line
    // below the last rendered line. Move up onto the first rendered
    // line before clearing, otherwise we wipe blank rows below and
    // the previous frame stays visible.
    process.stderr.write(ANSI.cursorUp(this.linesDrawn) + ANSI.cursorToCol0);
    for (let i = 0; i < this.linesDrawn; i++) {
      process.stderr.write(ANSI.clearLine);
      if (i < this.linesDrawn - 1) process.stderr.write('\x1b[1B'); // down one
    }
    process.stderr.write(ANSI.cursorUp(this.linesDrawn - 1));
    this.linesDrawn = 0;
  }

  private render(ev: ProgressEvent): string[] {
    const { done, total, workers } = ev;
    const elapsedSec = (Date.now() - this.startMs) / 1000;
    const ratePerMin = done > 0 ? (done / elapsedSec) * 60 : 0;
    const pct = total > 0 ? (done / total) * 100 : 0;

    const remaining = total - done;
    const etaSec = ratePerMin > 0 ? (remaining / ratePerMin) * 60 : null;

    const width = Math.min(process.stderr.columns ?? 60, 80) - 4; // leave border
    const barWidth = Math.max(10, width - 24);
    const filled = Math.round((done / Math.max(1, total)) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    const busyCount = workers.filter(w => w.state === 'busy').length;

    const lines: string[] = [];
    lines.push(`${ANSI.bold}${ANSI.cyan}─── balance harness ───${ANSI.reset}`);
    lines.push(`  ${ANSI.bold}${done}/${total}${ANSI.reset}  [${ANSI.green}${bar}${ANSI.reset}]  ${pct.toFixed(1)}%`);
    lines.push(
      `  elapsed ${fmtDuration(elapsedSec)}  ·  rate ${ratePerMin.toFixed(1)}/min  ·  ` +
      `ETA ${etaSec !== null ? fmtDuration(etaSec) : '—'}  ·  ` +
      `${this.errors > 0 ? ANSI.red : ANSI.dim}errors ${this.errors}${ANSI.reset}`
    );
    lines.push(`  ${ANSI.dim}workers: ${busyCount}/${workers.length} busy${ANSI.reset}`);

    // One line per worker, sorted by index.
    for (const w of workers) {
      lines.push('  ' + fmtWorker(w));
    }
    return lines;
  }
}

function fmtWorker(w: WorkerStatus): string {
  const idx = `w${w.index.toString().padEnd(2)}`;
  if (w.state === 'busy' && w.currentTask && w.taskStartMs) {
    const secs = (Date.now() - w.taskStartMs) / 1000;
    const task = w.currentTask.padEnd(14);
    return `${ANSI.yellow}${idx}${ANSI.reset} ${task} ${secs.toFixed(1)}s  ${ANSI.dim}(${w.tasksCompleted} done)${ANSI.reset}`;
  }
  if (w.state === 'idle') {
    return `${ANSI.dim}${idx} idle           —     (${w.tasksCompleted} done)${ANSI.reset}`;
  }
  if (w.state === 'exited') {
    return `${ANSI.dim}${idx} exited         —     (${w.tasksCompleted} done)${ANSI.reset}`;
  }
  return `${ANSI.dim}${idx} starting…${ANSI.reset}`;
}

function fmtDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m${rem.toString().padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  const mrem = m % 60;
  return `${h}h${mrem.toString().padStart(2, '0')}m`;
}
