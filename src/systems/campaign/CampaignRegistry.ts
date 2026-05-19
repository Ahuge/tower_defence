/**
 * CampaignRegistry — typed registry for Campaign Extensions.
 *
 * See `docs/campaign-aspects-refactor-prd.md` Phase A. This is the
 * post-refactor home of `getCampaign` / `listCampaigns` — currently
 * empty, with the legacy registry at `src/data/campaigns/index.ts`
 * still authoritative.
 *
 * The boundary types use `unknown` for `TState` and `TCfg` because
 * the registry holds heterogeneous campaigns. Inside any single
 * campaign module both generics are concrete; the `unknown` only
 * shows up here.
 *
 * Phase B: `MissionRunner` and `GameScene` feature-detect via
 * `'buildRuntime' in ext` to choose the new path. Phase E deletes
 * the legacy `src/data/campaigns/index.ts` and replaces every
 * caller with this module.
 */

import type { FactionId } from '../../data/Factions';
import type { CampaignExtension, StarCount } from './types';

// Registry storage. Empty during Phase A — campaigns register
// themselves in Phases C/D via `registerCampaign` once each is
// ported to a `CampaignExtension`.
const REGISTRY: Partial<Record<FactionId, CampaignExtension<unknown, unknown>>> = {};

/**
 * Register a Campaign Extension. Called from each campaign module's
 * top level (side-effect import in `main.ts`). Idempotent: re-registering
 * the same factionId overwrites — Hot Module Replacement-safe.
 */
export function registerCampaign<TState, TCfg>(
  ext: CampaignExtension<TState, TCfg>,
): void {
  // Stored as `unknown,unknown` at the boundary; callers narrow via
  // the campaign-specific consumer paths inside each campaign module.
  REGISTRY[ext.factionId] = ext as CampaignExtension<unknown, unknown>;
}

/**
 * Resolve a Campaign Extension by faction id. Returns null if the
 * faction has no campaign yet shipped.
 */
export function getCampaignExtension(
  factionId: FactionId,
): CampaignExtension<unknown, unknown> | null {
  return REGISTRY[factionId] ?? null;
}

/** All registered campaigns. */
export function listCampaignExtensions(): CampaignExtension<unknown, unknown>[] {
  return Object.values(REGISTRY).filter(
    (c): c is CampaignExtension<unknown, unknown> => c !== undefined,
  );
}

/**
 * True if a campaign is fully completed (every mission has ≥1 star).
 * Lives in the registry rather than `PlayerProfile` so the answer
 * requires knowing the campaign's mission count, which is data-driven.
 */
export function isCampaignComplete(
  factionId: FactionId,
  missionStarsByIdx: { [idx: number]: number },
): boolean {
  const ext = getCampaignExtension(factionId);
  if (!ext) return false;
  return ext.missions.every(
    (m) => ((missionStarsByIdx[m.idx] ?? 0) as StarCount) >= 1,
  );
}
