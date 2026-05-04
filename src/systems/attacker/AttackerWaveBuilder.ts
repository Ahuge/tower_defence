/**
 * AttackerWaveBuilder — converts a player's AttackerComposer picks
 * into a WaveDefinition the SpawnManager can consume (Plan 12 v2
 * Phase 1).
 *
 * The player composes a wave from the palette by spending essence;
 * when they hit Send Wave, GameScene calls buildWave() with the
 * locked picks + current wave number to produce the actual wave.
 *
 * hpScale/speedScale scale with wave number so attacker creeps stay
 * threatening as the AI defender's tower grid matures. Numbers tuned
 * to roughly match the standard generator's curve.
 */
import type { WaveDefinition, WaveCreepGroup } from '../../data/WaveDefinitions';
import type { AttackerPick } from './AttackerComposer';
import type { AttackerPrepDef } from '../../data/AttackerPreps';
import { prepHpMultiplier } from '../../data/AttackerPreps';

/** Compute hp scale for a given wave number. Mirrors the standard
 *  generator's curve: 20 + 8*w + 0.4*w^2. */
function hpScaleForWave(waveNum: number): number {
  return Math.round(20 + waveNum * 8 + waveNum * waveNum * 0.4);
}

/** Speed scale for a given wave number. Slow ramp. */
function speedScaleForWave(waveNum: number): number {
  return 1 + waveNum * 0.02;
}

/** Spawn interval for a given wave number. Tighter as waves climb. */
function spawnIntervalForWave(waveNum: number): number {
  return Math.max(150, 600 - waveNum * 12);
}

export interface BuildWaveOptions {
  /** 1-indexed wave number being sent. */
  waveNum: number;
  /** Locked picks from the composer. */
  picks: AttackerPick[];
  /** Defender prep for this wave — applies an HP multiplier per
   *  creep type. Null = no prep (no penalty). */
  prep?: AttackerPrepDef | null;
}

export interface BuildWaveResult {
  wave: WaveDefinition;
  /** Total raider count in the wave (sum of all group counts). Used by
   *  GameScene to decide how many spawned creeps get the Anti-magic
   *  Wagon shield (first N spawned). */
  totalRaiders: number;
}

/** Build a WaveDefinition from the player's composed picks. */
export function buildAttackerWave(opts: BuildWaveOptions): WaveDefinition {
  const { waveNum, picks, prep } = opts;
  const hp = hpScaleForWave(waveNum);
  const speed = speedScaleForWave(waveNum);

  const groups: WaveCreepGroup[] = picks
    .filter(p => p.count > 0)
    .map(pick => ({
      creepType: pick.entry.creepType,
      count: pick.count,
      // Defender prep multiplies HP per creep type at spawn time.
      // Player sees the prep before composing and can route around it.
      hpScale: hp * prepHpMultiplier(prep ?? null, pick.entry.creepType),
      speedScale: speed,
    }));

  // Treat any wave containing a 'boss' creep as a boss wave so the
  // wave HUD / camera focus behave correctly.
  const isBoss = picks.some(p => p.entry.creepType === 'boss' && p.count > 0);

  return {
    wave: waveNum,
    groups,
    spawnInterval: isBoss ? 0 : spawnIntervalForWave(waveNum),
    isBoss,
  };
}
