/**
 * Tracks which creep types the player has seen in a live match.
 *
 * Persists the discovered set to `StorePersistence.discoveredCreeps`
 * so Encyclopedia gating survives sessions + reinstalls (within the
 * same device's localStorage — cloud-sync is future work, see
 * memory/project_cloud_save.md).
 *
 * Subscribes to the `creepSpawned` EventBus event from SpawnManager.
 * First time a given type is spawned in a match, adds it to the
 * persistent set AND ticks the `DISCOVER_CREEPS` incremental
 * achievement — Play Games Services auto-unlocks the achievement
 * when the 17th increment lands.
 *
 * Deliberately skipped during the tutorial match: the scripted
 * tutorial only spawns a couple of creep types and we don't want
 * to prematurely award discovery for content the player hasn't
 * fairly encountered through normal play.
 */

import { EventBus } from '../EventBus';
import { StorePersistence } from './StorePersistence';
import { incrementAchievement } from '../../data/Achievements';

export class DiscoveryTracker {
  private events: EventBus;
  private skipTutorial: boolean;
  private handler: (typeId: string) => void;

  constructor(events: EventBus, matchMode: string) {
    this.events = events;
    this.skipTutorial = matchMode === 'tutorial';
    this.handler = (typeId: string) => this.onSpawned(typeId);
    this.events.on('creepSpawned', this.handler);
  }

  private onSpawned(typeId: string): void {
    if (this.skipTutorial) return;
    const state = StorePersistence.load();
    if (state.discoveredCreeps.includes(typeId)) return;
    StorePersistence.update(s => {
      if (!s.discoveredCreeps.includes(typeId)) s.discoveredCreeps.push(typeId);
    });
    // Fire-and-forget — native call no-ops on web / missing id.
    void incrementAchievement('DISCOVER_CREEPS', 1);
  }

  destroy(): void {
    this.events.off('creepSpawned', this.handler);
  }

  // ─── Static read helpers for the UI layer ─────────────────

  /** Has the player ever seen this creep type in a match? */
  static isDiscovered(typeId: string): boolean {
    return StorePersistence.load().discoveredCreeps.includes(typeId);
  }

  /** Full list of discovered creep type ids. */
  static all(): string[] {
    return [...StorePersistence.load().discoveredCreeps];
  }
}
