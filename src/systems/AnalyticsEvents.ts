/**
 * AnalyticsEvents — typed event catalog.
 *
 * Every new analytics event added to the game should be defined here so that
 * call sites get compile-time payload validation and a future dashboard
 * consumer has a single source of truth for the event schema.
 *
 * Adding an event:
 *   1. Add a member to the AnalyticsEvent union with `type: 'event_name'` and
 *      its payload fields.
 *   2. Call `Analytics.track('event_name', { ...payload })` at the call site.
 *
 * Notes:
 *   - The legacy `Analytics.event(type, data)` method still works for
 *     untyped events; new code should prefer `track`.
 *   - Every event auto-receives `platform` and `sessionId` at flush time;
 *     do NOT include those fields in payloads.
 *   - Player context (`playerLevel`, `unlockedFactionsCount`, `cores`,
 *     `shards`) is auto-attached once Plan 2's PlayerProfile lands and
 *     the AnalyticsClient context hook is wired.
 */

import type { FactionId } from '../data/Factions';

/** All known analytics event shapes. */
export type AnalyticsEvent =
  // ---- Foundation ----------------------------------------------------------
  | { type: 'app_boot'; viewportW: number; viewportH: number; touch: boolean; build?: string }
  | { type: 'menu_view' }
  | { type: 'screen_view'; screen: string }
  | { type: 'telemetry_self_test'; bufferedCount: number }

  // ---- Game lifecycle (existing) -------------------------------------------
  | { type: 'game_start'; mode: string; faction: string; difficulty: string; map: string }
  | { type: 'game_end'; mode: string; result: 'victory' | 'defeat'; wave: number; duration?: number }
  | { type: 'faction_pick'; faction: string }
  | { type: 'multiplayer_start'; mode: 'versus' | 'circle'; players: number }

  // ---- Mode lifecycle ------------------------------------------------------
  | { type: 'mode_entered'; mode: string }
  | { type: 'mode_exited'; mode: string; durationMs: number }

  // ---- Tutorial / FTG / splash ---------------------------------------------
  | { type: 'splash_shown' }
  | { type: 'splash_play_tapped' }
  | { type: 'splash_skip_tapped' }
  | { type: 'tutorial_step_seen'; trackId: string; stepId: string }
  | { type: 'tutorial_step_completed'; trackId: string; stepId: string }
  | { type: 'tutorial_step_skipped'; trackId: string; stepId: string }
  | { type: 'tutorial_track_started'; trackId: string }
  | { type: 'tutorial_track_completed'; trackId: string }
  | { type: 'tutorial_quit'; trackId: string; atStepId: string }

  // ---- Monetization --------------------------------------------------------
  | { type: 'store_view' }
  | { type: 'purchase_attempted'; itemId: string; currency: 'shards' | 'cores' | 'iap'; cost: number }
  | { type: 'purchase_completed'; itemId: string; currency: 'shards' | 'cores' | 'iap'; cost: number }
  | { type: 'purchase_failed'; itemId: string; reason: string }
  | { type: 'bp_xp_awarded'; amount: number; source: string }
  | { type: 'bp_level_up'; from: number; to: number }
  | { type: 'bp_reward_claimed'; track: 'free' | 'premium'; level: number; rewardType: string }
  | { type: 'bp_premium_purchased' }

  // ---- Settings ------------------------------------------------------------
  | { type: 'settings_changed'; key: string; value: string | number | boolean }
  | { type: 'analytics_optout_changed'; optedOut: boolean }

  // ---- Encyclopedia / discovery / achievements -----------------------------
  | { type: 'encyclopedia_opened' }
  | { type: 'encyclopedia_entry_revealed'; category: string; id: string }
  | { type: 'achievement_unlocked'; id: string }
  | { type: 'achievement_progress'; id: string; current: number; target: number }

  // ---- Player profile (Plan 2 hooks; emit when those land) ----------------
  | { type: 'profile_initialized'; level: number; cores: number }
  | { type: 'profile_migrated_from_legacy'; inferredLevel: number; gamesPlayed: number }
  | { type: 'xp_awarded'; amount: number; source: string }
  | { type: 'level_up'; from: number; to: number }
  | { type: 'unlock_revealed'; unlockType: 'mode' | 'map' | 'faction' | 'feature'; id: string; atLevel: number }
  | { type: 'menu_locked_tile_tapped'; id: string }

  // ---- Faction unlock tree (Plan 5) ----------------------------------------
  | { type: 'faction_tree_opened' }
  | { type: 'faction_tree_node_focused'; factionId: FactionId | string }
  | { type: 'faction_unlock_attempted'; factionId: FactionId | string; route: 'shards' | 'campaign' }
  | { type: 'faction_unlocked'; factionId: FactionId | string; route: 'shards' | 'campaign'; shardsSpent: number }
  | { type: 'faction_unlock_failed'; factionId: FactionId | string; reason: string };

/** Convenience union of all event names. */
export type EventName = AnalyticsEvent['type'];

/** Payload for a given event name (the event object minus the `type` field). */
export type EventPayload<T extends EventName> = Omit<Extract<AnalyticsEvent, { type: T }>, 'type'>;
