/**
 * Campaign registry. Maps `FactionId` → `CampaignDef` for every
 * faction whose campaign content has shipped.
 *
 * Plan 14 v1 ships only Arcane. Other factions return null until
 * their content drops; the campaign lobby surfaces "Campaign coming
 * soon" for those (handled in Plan 5's faction tree UI later).
 */
import type { CampaignDef } from './CampaignDef';
import type { FactionId } from '../Factions';
import { ARCANE_CAMPAIGN } from './arcane';
import { MECHANICAL_CAMPAIGN } from './mechanical';
import { GREENWARD_CAMPAIGN } from './greenward';

const CAMPAIGNS: Partial<Record<FactionId, CampaignDef>> = {
  arcane: ARCANE_CAMPAIGN,
  mechanical: MECHANICAL_CAMPAIGN,
  nature: GREENWARD_CAMPAIGN,
};

/** Returns the campaign def for a faction, or null if not yet shipped. */
export function getCampaign(factionId: FactionId): CampaignDef | null {
  return CAMPAIGNS[factionId] ?? null;
}

/** All shipped campaigns. Useful for menus that list "available campaigns". */
export function listCampaigns(): CampaignDef[] {
  return Object.values(CAMPAIGNS).filter((c): c is CampaignDef => c !== undefined);
}

/** True if a campaign is fully completed (every mission has at least 1 star).
 *  Lives in the registry rather than PlayerProfile so the answer requires
 *  knowing the campaign's mission count, which is data-driven. */
export function isCampaignComplete(factionId: FactionId, missionStarsByIdx: { [idx: number]: number }): boolean {
  const def = getCampaign(factionId);
  if (!def) return false;
  return def.missions.every(m => (missionStarsByIdx[m.idx] ?? 0) >= 1);
}
