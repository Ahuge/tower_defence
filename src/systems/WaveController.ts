import { WaveDefinition } from '../data/WaveDefinitions';
import { SpawnManager } from './SpawnManager';
import { SendManager } from './SendManager';
import { PathPoint } from './Pathfinding';
import { DEBUG } from './DebugFlags';

export interface WaveCallbacks {
  onWaveStart(wave: WaveDefinition, waveNum: number, totalWaves: number): void;
  onWaveCleared(waveNum: number): void;
  canStartWave(): boolean; // e.g. check if path exists
}

/** How often to log "wave still stuck" diagnostics, ms. */
const STUCK_LOG_INTERVAL = 3000;
/** How long a wave has to be active without completing before we
 *  start logging the why-it's-stuck breakdown. */
const STUCK_THRESHOLD = 5000;

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
  /** ms since the current wave started. Used to gate stuck logging. */
  private waveElapsed: number = 0;
  /** ms since last stuck-log so we don't spam the console every frame. */
  private lastStuckLog: number = 0;

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

  /** Check if the current wave is complete. Call each frame. */
  checkWaveComplete(creepCount: number, delta: number = 0): void {
    if (!this.waveActive) return;

    this.waveElapsed += delta;

    const spawning = this.spawner.isSpawning();
    const sending = this.sendMgr.isSpawning();

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
