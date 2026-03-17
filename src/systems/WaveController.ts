import { WaveDefinition } from '../data/WaveDefinitions';
import { SpawnManager } from './SpawnManager';
import { SendManager } from './SendManager';
import { PathPoint } from './Pathfinding';

export interface WaveCallbacks {
  onWaveStart(wave: WaveDefinition, waveNum: number, totalWaves: number): void;
  onWaveCleared(waveNum: number): void;
  canStartWave(): boolean; // e.g. check if path exists
}

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
    if (!this.callbacks.canStartWave()) return false;
    if (this.currentWave >= this.waves.length) return false;

    this.betweenWaves = false;
    this.waveActive = true;
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
  checkWaveComplete(creepCount: number): void {
    if (!this.waveActive) return;
    if (this.spawner.isSpawning()) return;
    if (this.sendMgr.isSpawning()) return;
    if (creepCount > 0) return;

    // Wave cleared!
    this.waveActive = false;
    this.betweenWaves = true;
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
