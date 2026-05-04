import * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { Creep } from '../entities/Creep';
import { PathPoint } from './Pathfinding';
import { WaveDefinition } from '../data/WaveDefinitions';
import { rng } from './Rng';
import { CREEP_TYPES } from '../data/CreepTypes';
import { DifficultyHints } from '../data/Difficulty';
import { EventBus } from './EventBus';
import { SpawnerDef } from '../data/Maps';

/** Simple seeded PRNG for deterministic wave spawning */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface SpawnEntry {
  creepType: string;
  hpScale: number;
  speedScale: number;
  isBoss: boolean;
  groupBurst: number;
  pathIndex: number; // which path/entry to use
}

export class SpawnManager {
  private scene: Phaser.Scene;
  private events: EventBus;
  private spawnQueue: SpawnEntry[] = [];
  spawnTimer: number = 0;
  private spawnInterval: number = 0;
  private difficulty: DifficultyHints;
  private flyingPath: PathPoint[] | null = null;
  private seed: number;
  private rng: () => number;
  /**
   * Map's spawner list (Circle Co-op waypoint-chained maps) indexed
   * by pathIndex. Attached to every creep at spawn time so reroutes
   * can re-run `findPathWithWaypoints` through the correct remaining
   * waypoints instead of guessing a destination. Null on standard
   * entry→exit maps.
   */
  private spawners: SpawnerDef[] | null = null;
  /**
   * Circle Co-op: each spawner belongs to a player (spawner index
   * = player index = zone index). Wave creeps that spawn from
   * spawner `i` carry `spawnOwnerIndex = i` so the shared-economy
   * death handler can pay the spawn-owner their half of the kill
   * gold. Disabled on non-Circle maps where spawnOwnerIndex has
   * no meaning (stays null on the creep).
   */
  private trackSpawnOwnership: boolean = false;
  /**
   * Wave-count multiplier for co-op modes. In Circle Co-op we scale
   * creep counts with team size so defence stays challenging — a
   * 4-player match faces 4× the creeps a solo match would. Set
   * once at match start via `setCountMultiplier`; 1 by default so
   * non-co-op modes are unaffected.
   */
  private countMultiplier: number = 1;
  /**
   * Per-wave HP ramp for Circle Co-op. Player DPS compounds fast
   * once zones have frontier-paid-for upgrades, so creep HP needs
   * its own additive ramp on top of difficulty + the natural
   * wave-count scaling to keep late game honest. Callback form so
   * the coop side can plug in `(wave) => 1 + wave * 0.035` without
   * SpawnManager caring about wave number at construction time.
   * Default returns 1 (no change) — non-coop modes stay identical.
   */
  private hpWaveMultiplier: (wave: number) => number = () => 1;

  constructor(scene: Phaser.Scene, events: EventBus, difficulty: DifficultyHints, seed: number = 0) {
    this.scene = scene;
    this.events = events;
    this.difficulty = difficulty;
    this.seed = seed || Math.floor(Math.random() * 999999);
    this.rng = seededRandom(this.seed);
  }

  /** Attach the map's spawner list so new creeps carry their
   *  spawner's waypoint chain + exit. Call once per map change
   *  (null for non-waypoint maps). */
  setSpawners(spawners: SpawnerDef[] | null): void {
    this.spawners = spawners;
  }

  /** Turn on Circle Co-op ownership tagging — every wave creep
   *  spawned from spawner `i` gets `spawnOwnerIndex = i` so the
   *  shared-economy death handler can credit that zone's player
   *  their half of the kill gold. Default off. */
  setTrackSpawnOwnership(enabled: boolean): void {
    this.trackSpawnOwnership = enabled;
  }

  /** Global creep-count multiplier applied on top of per-creep
   *  difficulty scaling. Used by Circle Co-op to size waves against
   *  team size. 1 = no change. */
  setCountMultiplier(mult: number): void {
    this.countMultiplier = Math.max(1, mult);
  }

  /** Callback that returns an extra HP multiplier per wave. Only
   *  wired in Circle Co-op today (solo / 1v1 leave it at the
   *  default `() => 1`). The callback is evaluated once per
   *  wave-start so the returned factor is stable across the whole
   *  wave's spawns. */
  setHpWaveMultiplier(fn: (wave: number) => number): void {
    this.hpWaveMultiplier = fn;
  }

  setFlyingPath(entry: { col: number; row: number }, exit: { col: number; row: number }): void {
    this.flyingPath = [
      { col: entry.col, row: entry.row },
      { col: exit.col, row: exit.row },
    ];
  }

  startWave(waveDef: WaveDefinition, numPaths: number = 1): void {
    this.spawnQueue = [];
    // Stack two HP modifiers onto every creep's base scaling:
    //  * difficulty ramp — per-wave additive multiplier from the
    //    selected `DifficultyHints.toughnessPerWave`. Applies to
    //    every mode so the late game has teeth.
    //  * coop ramp — independent multiplier Circle Co-op sets via
    //    `setHpWaveMultiplier`, stacking on top to offset team DPS.
    const difficultyWaveBoost = 1 + waveDef.wave * (this.difficulty.toughnessPerWave ?? 0);
    const coopWaveBoost = this.hpWaveMultiplier(waveDef.wave);
    const hpWaveBoost = difficultyWaveBoost * coopWaveBoost;

    for (const group of waveDef.groups) {
      const ct = CREEP_TYPES[group.creepType];
      if (!ct) continue;

      const resolved = ct.applyDifficulty(this.difficulty);
      const baseCount = group.count * (ct.count || 1);
      // Apply both per-creep difficulty scaling AND the global
      // coop team-size multiplier.
      const actualCount = Math.round(baseCount * resolved.countMult * this.countMultiplier);

      for (let i = 0; i < actualCount; i++) {
        const groupBurst = ct.spawnBehavior === 'group' ? 4 : 1;
        // Distribute creeps across paths (round-robin)
        const pathIndex = numPaths > 1 ? (i % numPaths) : 0;
        this.spawnQueue.push({
          creepType: group.creepType,
          hpScale: group.hpScale * resolved.hpMult * hpWaveBoost,
          speedScale: group.speedScale * resolved.speedMult,
          isBoss: waveDef.isBoss,
          groupBurst,
          pathIndex,
        });
      }
    }

    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    // Stable-partition 'last' creeps to the end. Caster creeps use this
    // so they're the wave's finale, not a random mid-wave surprise the
    // player can't telegraph against. Sort is stable so creeps sharing
    // a tier preserve their post-shuffle order.
    this.spawnQueue.sort((a, b) => {
      const ta = CREEP_TYPES[a.creepType]?.spawnOrder === 'last' ? 1 : 0;
      const tb = CREEP_TYPES[b.creepType]?.spawnOrder === 'last' ? 1 : 0;
      return ta - tb;
    });

    // Co-op: with N× the creep count, keep the wave duration roughly
    // constant by spawning N× faster. Without this the wave trickles
    // out for minutes on larger teams. Floor at 30ms so bursts stay
    // visually readable. waveDef.spawnInterval === 0 (boss wave / set
    // pieces) stays 0.
    const interval = waveDef.spawnInterval > 0
      ? Math.max(30, Math.round(waveDef.spawnInterval / this.countMultiplier))
      : 0;
    this.spawnInterval = interval;
    this.spawnTimer = 0;
  }

  /** Pass all available paths. Creeps spawn from the path matching their pathIndex. */
  update(delta: number, allPaths: (PathPoint[] | null)[], creeps: Creep[]): void {
    if (this.spawnQueue.length === 0) return;
    // Need at least one valid path
    if (!allPaths.some(p => p !== null)) return;

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const entry = this.spawnQueue.shift()!;
      const ct = CREEP_TYPES[entry.creepType];

      // Pick the path for this creep
      let path: PathPoint[] | null = null;
      if (ct?.spawnBehavior === 'flying' && this.flyingPath) {
        path = this.flyingPath;
      } else {
        // Use assigned path, fallback to first valid
        path = allPaths[entry.pathIndex] ?? allPaths.find(p => p !== null) ?? null;
      }

      if (!path) return;

      const burstCount = entry.groupBurst;
      // Attach spawner waypoints + exit so the creep can be correctly
      // re-pathed mid-wave (see Creep.rerouteViaWaypoints). Non-
      // waypoint maps leave this null.
      const spawner = this.spawners ? this.spawners[entry.pathIndex] ?? null : null;
      // Plan A: Counterspell channel-completion buff. Each completed
      // `buff_next_wave_hp` cast adds to the running multiplier. Reads
      // off the scene because it's a per-mission accumulator that
      // SpawnManager doesn't otherwise need to know about.
      const channelHpBuff = (this.scene as any)._channelHpBuff ?? 0;
      const hpScaleWithBuff = entry.hpScale * (1 + channelHpBuff);
      // Plan 12 v2 — Anti-magic Wagon: drain the scene-level pending
      // wagon counter onto each new creep. First N spawned creeps
      // inherit a 2-hit shield via Creep._wagonHits.
      const sceneAny = this.scene as { _pendingWagonCount?: number };
      for (let b = 0; b < burstCount; b++) {
        const creep = new Creep(
          this.scene,
          [...path],
          hpScaleWithBuff,
          entry.speedScale,
          entry.isBoss,
          entry.creepType,
          (this.scene as any).creepFaction,
        );
        // Stamp the buff value at spawn so the visualization layer
        // can render a per-creep glow scaled to how buffed each one
        // is. Zero-buff spawns leave the field absent → cheap default.
        if (channelHpBuff > 0) {
          (creep as { _channelBuff?: number })._channelBuff = channelHpBuff;
        }
        if ((sceneAny._pendingWagonCount ?? 0) > 0) {
          creep._wagonHits = 2;
          sceneAny._pendingWagonCount = (sceneAny._pendingWagonCount ?? 0) - 1;
        }
        if (spawner) {
          creep.spawnerWaypoints = spawner.waypoints.map(p => ({ col: p.col, row: p.row }));
          creep.spawnerExit = { col: spawner.exit.col, row: spawner.exit.row };
        }
        if (this.trackSpawnOwnership) creep.spawnOwnerIndex = entry.pathIndex;
        creeps.push(creep);
        // Notify discovery tracker + any other subscriber each time
        // a creep construct appears. Subscribers de-dup via persisted
        // state — emit is cheap, per-spawn is fine.
        this.events.emit('creepSpawned', entry.creepType);
      }

      if (this.spawnQueue.length > 0) {
        this.spawnTimer = this.spawnInterval;
      }
    }

    // Handle split_on_death
    this.processSplits(allPaths, creeps);
  }

  private processSplits(allPaths: (PathPoint[] | null)[], creeps: Creep[]): void {
    const newCreeps: Creep[] = [];

    for (const creep of creeps) {
      if (creep.alive || creep.reached) continue;
      if (creep.hp > -900) continue;

      for (const trait of creep.creepType.traits) {
        if (trait.id === 'split_on_death') {
          const splitCount = trait.splitCount ?? 2;
          const splitType = trait.splitType ?? 'splitter_child';
          const pathIdx = Math.max(0, creep.pathIndex - 1);
          const remainingPath = creep.path.slice(pathIdx);
          if (remainingPath.length < 2) continue;

          for (let s = 0; s < splitCount; s++) {
            const child = new Creep(
              this.scene,
              [...remainingPath],
              creep.maxHp * 0.4,
              creep.baseSpeed / 80,
              false,
              splitType,
              (this.scene as any).creepFaction,
            );
            child.x = creep.x + (rng() - 0.5) * TILE_SIZE;
            child.y = creep.y + (rng() - 0.5) * TILE_SIZE;
            newCreeps.push(child);
          }
          break;
        }
      }
    }

    creeps.push(...newCreeps);
  }

  /** Spawn a leaked creep mid-wave with specific HP. Used by Circle Co-op. */
  spawnLeakedCreep(
    scene: Phaser.Scene,
    path: PathPoint[],
    hp: number,
    speed: number,
    isBoss: boolean,
    creepType: string,
    creeps: Creep[],
  ): void {
    if (path.length < 2) return;
    const creep = new Creep(
      scene,
      [...path],
      1, // hpScale=1, we override HP directly
      speed / 80, // convert back to speed multiplier (CREEP_BASE_SPEED = 80)
      isBoss,
      creepType,
      (scene as any).creepFaction,
    );
    // Override HP with the actual leaked value
    creep.hp = Math.round(hp);
    creep.maxHp = Math.round(hp);
    creeps.push(creep);
  }

  isSpawning(): boolean {
    return this.spawnQueue.length > 0;
  }
}
