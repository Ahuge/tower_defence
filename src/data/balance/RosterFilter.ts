/**
 * v5.4 — RosterFilter
 *
 * Reads `FACTION_ROSTER_<FACTION>_EXCLUDE` env var (comma-separated
 * tower-id list) and returns the excluded set. HeadlessMatch filters
 * its bot tower pool through this.
 *
 * Used by the v5.4 ablation harness: run a match with one tower
 * removed from the roster to measure that tower's contribution
 * (Δ win rate). Redundant towers show ~0 Δ; load-bearing towers show
 * a meaningful drop.
 *
 * Faction-scoped to mirror FactionBalanceLoader: only the named
 * faction's roster is filtered. Other factions in the same process
 * are unaffected.
 */
import { FactionId } from '../Factions';

/** Returns the set of tower-ids to exclude from this faction's roster
 *  for the current match. Empty set when env var is unset / malformed. */
export function loadRosterExcludes(faction: FactionId): Set<string> {
  const envVar = `FACTION_ROSTER_${faction.toUpperCase()}_EXCLUDE`;
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env[envVar] : undefined;
  if (!raw) return new Set();
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  return new Set(ids);
}
