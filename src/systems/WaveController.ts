import { WaveDefinition } from '../data/WaveDefinitions';
import { SpawnManager } from './SpawnManager';
import { SendManager } from './SendManager';
import { PathPoint } from './Pathfinding';
import { DEBUG } from './DebugFlags';

export interface WaveCallbacks {
  onWaveStart(wave: WaveDefinition, waveNum: number, totalWaves: number): void;
  onWaveCleared(waveNum: number): void;
  canStartWave(): boolean; // e.g. check if path exists
  /** Auto-recovery hook — called once when a wave has been active
   *  past `STUCK_FORCE_CLEAR_THRESHOLD` with no spawning/sending in
   *  flight but creeps still on the field. Implementation should
   *  cull or force-leak the remaining creeps so the wave can clear.
   *  Without this, a single mis-pathed creep can hang the entire
   *  match indefinitely (reported by users on first-match runs). */
  onStuckForceClear?(): void;
}

/** How often to log "wave still stuck" diagnostics, ms. */
const STUCK_LOG_INTERVAL = 3000;
/** How long a wave has to be active without completing before we
 *  start logging the why-it's-stuck breakdown. */
const STUCK_THRESHOLD = 5000;
/** How long the wave can go without any forward progress (a creep
 *  advancing its pathIndex OR a creep dying) before auto-recovery
 *  kicks in. Replaces the older "total wave duration" trigger:
 *  v2 caster missions can legitimately drag past 30-60s of clean
 *  play, and force-clearing them as if mis-pathed bled lives the
 *  player wasn't owed. Now: only fires when nothing has changed
 *  on the field for the entire window. */
const STUCK_NO_PROGRESS_WINDOW = 15000;

/**
 * Controls wave lifecycle: start, spawning, clear detection.
 * Fires callbacks — GameScene handles side effects.
 */
export class WaveController {
  waves: WaveDefinition[];
  currentWave: number = 0;
  waveActive: boolean = false;
  betweenWaves: boolean = true;

  private spawner: SpawnManager;
  private sendMgr: SendManager;
  private callbacks: WaveCallbacks;
  /** Per-wave latch — once auto-recovery has fired for this wave we
   *  don't fire it again, even if the recovery doesn't fully clear
   *  (e.g. extra creeps still spawning). Reset on each wave start. */
  private forceClearFired: boolean = false;
  /** ms since the current wave started. Used to gate stuck logging. */
  private waveElapsed: number = 0;
  /** ms since last stuck-log so we don't spam the console every frame. */
  private lastStuckLog: number = 0;
  /** Max pathIndex any alive creep has reached this wave. Bumped
   *  each frame in checkWaveComplete. Combined with `lastAliveCount`
   *  to gate the force-clear: progress = any creep advances OR any
   *  creep dies. */
  private maxPathIndexReached: number = 0;
  /** waveElapsed at the last frame where progress was observed
   *  (advance or death). Force-clear fires when (waveElapsed -
   *  lastProgressAt) exceeds STUCK_NO_PROGRESS_WINDOW. */
  private lastProgressAt: number = 0;
  /** Last frame's alive-creep count. A drop counts as progress. */
  private lastAliveCount: number = 0;

  constructor(
    waves: WaveDefinition[],
    spawner: SpawnManager,
    sendMgr: SendManager,
    callbacks: WaveCallbacks,
  ) {
    this.waves = waves;
    this.spawner = spawner;
    this.sendMgr = sendMgr;
    this.callbacks = callbacks;
  }

  /** Start the next wave. Returns false if can't start. */
  startWave(allPaths: (PathPoint[] | null)[]): boolean {
    if (!this.callbacks.canStartWave()) {
      if (DEBUG) console.warn('[wave] startWave rejected: canStartWave() === false (usually !currentPath)');
      return false;
    }
    if (this.currentWave >= this.waves.length) {
      if (DEBUG) console.warn(`[wave] startWave rejected: all waves exhausted (${this.currentWave}/${this.waves.length})`);
      return false;
    }

    this.betweenWaves = false;
    this.waveActive = true;
    this.waveElapsed = 0;
    this.forceClearFired = false;
    this.maxPathIndexReached = 0;
    this.lastProgressAt = 0;
    this.lastAliveCount = 0;
    this.lastStuckLog = 0;
    const wave = this.waves[this.currentWave];
    this.currentWave++;

    // Start spawning
    const numPaths = allPaths.filter(p => p !== null).length;
    this.spawner.startWave(wave, numPaths);

    // Activate queued sends
    const baseHp = wave.groups[0]?.hpScale || 30;
    const baseSpeed = wave.groups[0]?.speedScale || 1;
    this.sendMgr.activateSends(baseHp, baseSpeed);

    // Notify
    this.callbacks.onWaveStart(wave, this.currentWave, this.waves.length);
    return true;
  }

  /** Check if the current wave is complete. Call each frame.
   *  `creeps` is optional; when provided, the controller tracks max
   *  pathIndex advancement to differentiate "slow but progressing"
   *  from "actually stuck" — only the latter triggers force-clear. */
  checkWaveComplete(creepCount: number, delta: number = 0, creeps?: Array<{ pathIndex: number; alive: boolean }>): void {
    if (!this.waveActive) return;

    this.waveElapsed += delta;

    const spawning = this.spawner.isSpawning();
    const sending = this.sendMgr.isSpawning();

    if (creeps) {
      let frameMax = 0;
      let frameAlive = 0;
      for (const c of creeps) {
        if (c.alive) {
          frameAlive++;
          if (c.pathIndex > frameMax) frameMax = c.pathIndex;
        }
      }
      // Progress = any creep advanced OR any creep died this window.
      // Both are signs the wave is healthy; only their absence means
      // the field is genuinely frozen.
      if (frameMax > this.maxPathIndexReached || frameAlive < this.lastAliveCount) {
        this.maxPathIndexReached = Math.max(this.maxPathIndexReached, frameMax);
        this.lastProgressAt = this.waveElapsed;
      }
      this.lastAliveCount = frameAlive;
    }

    if (spawning || sending || creepCount > 0) {
      // Log a "why isn't the wave ending?" breakdown once the wave
      // has been active well past its normal length. Throttled so
      // the console doesn't get flooded. This is the single most
      // useful diagnostic when the Next Wave button stays greyed.
      if (DEBUG &&
          this.waveElapsed > STUCK_THRESHOLD &&
          this.waveElapsed - this.lastStuckLog > STUCK_LOG_INTERVAL) {
        this.lastStuckLog = this.waveElapsed;
        console.warn(
          `[wave] wave ${this.currentWave} stuck at ${Math.round(this.waveElapsed / 1000)}s — ` +
          `spawning=${spawning} sending=${sending} creeps=${creepCount}`,
        );
      }
      // Auto-recovery: force-clear when nothing has happened on the
      // field for STUCK_NO_PROGRESS_WINDOW. Progress = any creep
      // advancing pathIndex OR any creep dying (tracked above). If
      // the caller didn't pass `creeps` we can't gate, so fall back
      // to firing after the same window using waveElapsed.
      const noRecentProgress = creeps === undefined
        ? this.waveElapsed > STUCK_NO_PROGRESS_WINDOW
        : (this.waveElapsed - this.lastProgressAt) > STUCK_NO_PROGRESS_WINDOW;
      if (!spawning && !sending && creepCount > 0 &&
          noRecentProgress &&
          !this.forceClearFired) {
        this.forceClearFired = true;
        if (DEBUG) {
          console.warn(`[wave] wave ${this.currentWave} auto-recovering after ` +
            `${Math.round((this.waveElapsed - this.lastProgressAt) / 1000)}s without progress — force-leaking ${creepCount} creep(s)`);
        }
        this.callbacks.onStuckForceClear?.();
      }
      return;
    }

    // Wave cleared!
    this.waveActive = false;
    this.betweenWaves = true;
    if (DEBUG) console.log(`[wave] wave ${this.currentWave} cleared in ${Math.round(this.waveElapsed / 1000)}s`);
    this.callbacks.onWaveCleared(this.currentWave);
  }

  /** Update spawning each frame */
  updateSpawning(delta: number, allPaths: (PathPoint[] | null)[], currentPath: PathPoint[] | null, creeps: any[]): void {
    this.spawner.update(delta, allPaths, creeps);
    this.sendMgr.update(delta, currentPath, creeps);
  }

  hasMoreWaves(): boolean {
    return this.currentWave < this.waves.length;
  }

  isComplete(): boolean {
    return this.currentWave >= this.waves.length && !this.waveActive;
  }
}
