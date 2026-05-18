/**
 * spawnGreenwardNamed — GameScene-side spawn pipeline for the
 * named-character NAMED_SPAWNS registry.
 *
 * Called from GameScene.create() AFTER:
 *   - `_greenwardController` is constructed (so we can bind), AND
 *   - `creepMgr` is constructed (so we can push the new Creep into
 *     its tracked list).
 *
 * For each NAMED_SPAWNS entry on the active mission:
 *   - **watcher_at_cell**: instantiates a stationary Creep at the
 *     recorded cell with a single-point path. The creep's
 *     `speedMultiplier: 0` (set on its CREEP_TYPES entry) keeps it
 *     in place. Bound to MercyWatcherTracker immediately.
 *   - **watcher_in_wave**: registers a pending binding on the
 *     controller. The controller's per-frame tick scans live creeps
 *     and binds the first match.
 *
 * Sits in a separate file (not GameScene) so the spawn logic stays
 * unit-testable without Phaser scene scaffolding.
 */

import type * as Phaser from 'phaser';
import { Creep } from '../../entities/Creep';
import { getCreepType } from '../../data/CreepTypes';
import type { CreepManager } from '../CreepManager';
import type { FactionId } from '../../data/Factions';
import type { GreenwardMissionController } from './GreenwardMissionController';
import { namedSpawnsFor, type WatcherAtCellSpawn } from './GreenwardSpawns';

export interface SpawnGreenwardNamedArgs {
  scene: Phaser.Scene;
  creepMgr: CreepManager;
  controller: GreenwardMissionController;
  missionIdx: number;
  creepFaction?: FactionId;
}

/** Dispatch named-character spawns for the active Greenward mission.
 *  Idempotent — calling twice with the same args spawns twice; the
 *  caller (GameScene.create) is responsible for calling exactly once
 *  per mission boot. */
export function spawnGreenwardNamed(args: SpawnGreenwardNamedArgs): void {
  const { scene, creepMgr, controller, missionIdx, creepFaction } = args;
  for (const spawn of namedSpawnsFor(missionIdx)) {
    switch (spawn.kind) {
      case 'watcher_at_cell':
        _spawnWatcherAtCell(scene, creepMgr, controller, spawn, creepFaction);
        break;
      case 'watcher_in_wave':
        controller.registerPendingWatcherBinding(spawn);
        break;
    }
  }
}

function _spawnWatcherAtCell(
  scene: Phaser.Scene,
  creepMgr: CreepManager,
  controller: GreenwardMissionController,
  spawn: WatcherAtCellSpawn,
  creepFaction?: FactionId,
): void {
  const ct = getCreepType(spawn.typeId);
  // Single-point path — combined with the type's speedMultiplier=0,
  // the creep instantiates at the cell and stays there. hpMultiplier
  // gets multiplied internally by the Creep constructor (line 168);
  // we pass `1` as the base hp so the resulting hp matches the
  // type's hpMultiplier scale (consistent with how wave-spawned
  // Watchers will scale).
  const path = [{ col: spawn.col, row: spawn.row }];
  const baseHp = 100; // wave-spawned creeps scale baseHp by the wave's hpScale;
                     // stationary Watchers don't have a wave so this is a flat baseline.
  const creep = new Creep(scene, path, baseHp, 1, false, spawn.typeId, creepFaction);
  creepMgr.creeps.push(creep);
  controller.mercyWatcher.attach(
    {
      creepId: creep.id,
      col: spawn.col,
      row: spawn.row,
      ruinId: spawn.ruinId,
    },
    creep.hp,
  );
}
