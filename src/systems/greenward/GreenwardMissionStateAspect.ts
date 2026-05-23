/**
 * Greenward — MissionState aspect (Phase D2).
 *
 * Adapts the existing module-level WildwoodReserves API
 * (`getGreenwardState`, `applyMissionRegen`, etc.) to the new aspect
 * shape. `read`/`write` go through `CampaignState` (which is where the
 * legacy API also reads/writes), so the aspect path and any remaining
 * legacy code see the same persistent slot — no parallel storage.
 *
 *   read()                     → getGreenwardState()
 *   write(state)               → CampaignState.set(state)
 *   tickBetweenMissions(state) → regen +10 (capped per hasSpent rule)
 *   applyMissionResult         → no-op; legacy mid-mission `deduct()`
 *                                calls + GreenwardMissionController.finalize()
 *                                already mutate state during gameplay.
 *                                Kept as a no-op pass-through so the
 *                                aspect shape is complete.
 */
import { CampaignState } from '../campaign/CampaignState';
import {
  DEFAULT_GREENWARD_STATE,
  INITIAL_RESERVES,
  MAX_AFTER_SPEND,
  REGEN_PER_MISSION,
  type GreenwardState,
} from './WildwoodReserves';
import type { MissionStateAspect } from '../campaign/types';
import type { MissionResult } from '../campaign/types';

const FACTION_ID = 'nature';

// Parameterised with `any` for TCfg so the same instance plugs into the
// extension's specific `GreenwardMissionCfg` discriminated union. The
// type erasure is contained — applyDynamicOverrides is a pass-through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const greenwardMissionStateAspect: MissionStateAspect<GreenwardState, any> = {
  defaults: DEFAULT_GREENWARD_STATE,

  read(): GreenwardState {
    return CampaignState.get<GreenwardState>(FACTION_ID, DEFAULT_GREENWARD_STATE);
  },

  write(next: GreenwardState): void {
    CampaignState.set<GreenwardState>(FACTION_ID, next);
  },

  /** Pass the mission entry through unchanged. Greenward's
   *  per-mission ruin specs live entirely on `mission.campaign`;
   *  there's no dynamic per-state mission rewrite needed today.
   *  When the M10 mode-lean reads need to mutate the entry (e.g.
   *  pre-resolving the Nave's RuinMode), this is where it lands. */
  applyDynamicOverrides(_state, entry) {
    return entry;
  },

  /** Mission-end writeback. Greenward's heavy lifting happens via
   *  mid-mission `deduct()` calls + `GreenwardMissionController.finalize()`
   *  which already persist through the CampaignState slot. Nothing
   *  to do here — but the hook exists so future end-of-mission
   *  state mutations (e.g. unlocking a follow-up campaign chapter)
   *  have a place to land without breaking the aspect contract. */
  applyMissionResult(state: GreenwardState, _result: MissionResult): GreenwardState {
    return state;
  },

  /** Per-mission regen. Mirrors `applyMissionRegen()` from
   *  `WildwoodReserves.ts`: +10 to reserves, capped at INITIAL when
   *  no spending has occurred and at MAX_AFTER_SPEND once it has.
   *  Returns the new state — MissionRunner.startV2 persists it
   *  via `write()`. `entry` is accepted to match the aspect interface
   *  but not read — Greenward's regen is mission-agnostic. */
  tickBetweenMissions(state: GreenwardState, _entry): GreenwardState {
    const cap = state.hasSpent ? MAX_AFTER_SPEND : INITIAL_RESERVES;
    const nextReserves = Math.min(state.reserves + REGEN_PER_MISSION, cap);
    return { ...state, reserves: nextReserves };
  },
};
