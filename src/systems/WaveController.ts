import { WaveDefinition } from '../data/WaveDefinitions';
import { SpawnManager } from './SpawnManager';
import { SendManager } from './SendManager';
import { PathPoint } from './Pathfinding';
import { DEBUG } from './DebugFlags';
import { WaveDirectorBrain, WaveObservation } from './bots/WaveDirectorBrain';

export interface WaveCallbacks {
  onWaveStart(wave: WaveDefinition, waveNum: number, totalWaves: number): void;
  onWaveCleared(waveNum: number): void;
  canStartWave(): boolean; // e.g. check if path exists
}

/** v4.2: callback the host (HeadlessMatch / GameScene) provides so the
 *  controller can build a WaveObservation for the director without
 *  reaching into match-level state. The host owns lives, towers, path
 *  geometry; the controller calls this between waves to assemble the
 *  context the director's `nextWave` needs. */
export type WaveObservationProvider = (waveIndex: number) => WaveObservation;

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

  // v4.2: optional director-driven lazy generation. When set, the
  // controller calls `director.nextWave(obs)` lazily as waves run out
  // and appends the result to `this.waves`. When unset, `this.waves`
  // is treated as a pre-computed static list (legacy v4.1 behaviour).
  private director: WaveDirectorBrain | null = null;
  private observationProvider: WaveObservationProvider | null = null;
  /** Total waves the match expects. Used as the exhaustion bound when
   *  director is set (so we don't generate forever). 0 = use waves.length
   *  (legacy). */
  private expectedTotal: number = 0;

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

  /** v4.2: opt into director-driven lazy wave generation. Call after
   *  construction with the director (already initialised via its own
   *  `init`), the observation provider that the host implements, and
   *  the total wave count the match expects. The controller starts
   *  fetching from the director once it runs out of pre-loaded waves.
   *  When `expectedTotal=0` (default), the director extends
   *  indefinitely (intended for endless mode where the host caps via
   *  maxWaves elsewhere). */
  setDirector(
    director: WaveDirectorBrain,
    observationProvider: WaveObservationProvider,
    expectedTotal: number = 0,
  ): void {
    this.director = director;
    this.observationProvider = observationProvider;
    this.expectedTotal = expectedTotal;
  }

  /** Start the next wave. Returns false if can't start. */
  startWave(allPaths: (PathPoint[] | null)[]): boolean {
    if (!this.callbacks.canStartWave()) {
      if (DEBUG) console.warn('[wave] startWave rejected: canStartWave() === false (usually !currentPath)');
      return false;
    }
    // v4.2: lazy-fetch from director when we don't have a wave for
    // this index yet. Done before the exhaustion check so we don't
    // spuriously reject when the static array is empty but the director
    // can still produce waves.
    if (this.currentWave >= this.waves.length && this.director && this.observationProvider) {
      if (this.expectedTotal > 0 && this.currentWave >= this.expectedTotal) {
        if (DEBUG) console.warn(`[wave] startWave rejected: director-bounded total reached (${this.currentWave}/${this.expectedTotal})`);
        return false;
      }
      const obs = this.observationProvider(this.currentWave + 1);
      const next = this.director.nextWave(obs);
      this.waves.push(next);
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

  /** v4.2: ensure the next `count` waves are materialised in `waves[]`
   *  by calling `director.nextWave()` for any missing entries. Called
   *  by the host (e.g. HeadlessMatch.makeCtx) before the brain reads
   *  `upcomingWaves` for counter-pick lookahead. The contract:
   *  whatever the director commits via peekAhead is FROZEN — the
   *  director cannot retroactively change a wave it has already
   *  promised. Reactive directors observe the defender's state at
   *  peek time and must accept that they see the state-as-of-now,
   *  not the state-after-N-more-placements. */
  peekAhead(count: number): WaveDefinition[] {
    if (!this.director || !this.observationProvider) {
      // Legacy path: just return the slice we already have.
      return this.waves.slice(this.currentWave, this.currentWave + count);
    }
    const targetIndex = this.currentWave + count;
    while (this.waves.length < targetIndex) {
      if (this.expectedTotal > 0 && this.waves.length >= this.expectedTotal) break;
      const nextIdx = this.waves.length + 1;
      const obs = this.observationProvider(nextIdx);
      this.waves.push(this.director.nextWave(obs));
    }
    return this.waves.slice(this.currentWave, this.currentWave + count);
  }

  hasMoreWaves(): boolean {
    if (this.currentWave < this.waves.length) return true;
    // v4.2: when director-driven, we're not done until expectedTotal.
    if (this.director && (this.expectedTotal === 0 || this.currentWave < this.expectedTotal)) {
      return true;
    }
    return false;
  }

  isComplete(): boolean {
    return this.currentWave >= this.waves.length && !this.waveActive;
  }
}
