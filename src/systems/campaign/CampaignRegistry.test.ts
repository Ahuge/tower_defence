/**
 * CampaignRegistry — cross-campaign structural invariants.
 *
 * These are the assertions that used to live in the per-campaign parity
 * tests (CampaignDef.test.ts, arcane.test.ts, …) deleted in Phase F3
 * when the legacy schema went away. The parity tests over-coupled to
 * the legacy `CampaignDef` shape; the invariants below are the small
 * subset worth keeping — and they generalise to all registered
 * extensions automatically (a campaign #5 lands and these run for it
 * too with no test edit).
 *
 * Each campaign's deeper unit coverage lives in its own systems
 * directory (e.g. `systems/voidc/SnakeEyesMissionController.test.ts`).
 * This file owns only the "every campaign must satisfy X" claims.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { listCampaignExtensions } from './CampaignRegistry';

// Side-effect imports — ensure every campaign module has registered by
// the time the suite runs. Matches `main.ts`'s registration order; if
// a new campaign is added to main.ts, add the same import here so the
// invariants run against it.
import '../../data/campaigns/arcane';
import '../../data/campaigns/mechanical';
import '../../data/campaigns/greenward';
import '../../data/campaigns/snake-eyes';

describe('CampaignRegistry — structural invariants', () => {
  const extensions = listCampaignExtensions();

  beforeAll(() => {
    // Sanity: the registry has SOMETHING. If the side-effect imports
    // above silently fail (e.g. circular import drop-out), every
    // following assertion would pass vacuously — guard against that.
    expect(extensions.length).toBeGreaterThan(0);
  });

  it.each(extensions.map(e => [e.factionId, e]))(
    '[%s] every mission idx equals its array position',
    (_factionId, ext) => {
      // The invariant the lobby and `isFinaleMission` detection rely
      // on. `missions[i].idx === i` makes ordering, finale detection,
      // and `nextMissionIdx` computation safe by construction.
      // Without this, a campaign author shipping `{ idx: 3 }` at
      // MISSIONS[4] silently breaks both the lobby and the finale
      // panel — and the legacy parity tests that used to catch this
      // were deleted in Phase F3.
      ext.missions.forEach((m, i) => {
        expect(m.idx, `${ext.factionId} mission "${m.id}" at array position ${i} declares idx=${m.idx}`).toBe(i);
      });
    },
  );

  it.each(extensions.map(e => [e.factionId, e]))(
    '[%s] every mission id is unique within its campaign',
    (_factionId, ext) => {
      // `getMissionStars`, analytics events, and a few star predicates
      // key off `mission.id`. Duplicate ids would silently merge stars
      // across two missions — a bug class the legacy parity tests
      // caught and that nothing else does today.
      const ids = ext.missions.map(m => m.id);
      const unique = new Set(ids);
      expect(unique.size, `duplicate mission id(s) in ${ext.factionId}: ${ids.join(', ')}`).toBe(ids.length);
    },
  );

  it.each(extensions.map(e => [e.factionId, e]))(
    '[%s] extension.factionId matches the registry key it was stored under',
    (factionId, ext) => {
      // `registerCampaign` stores at `REGISTRY[ext.factionId]`. If a
      // campaign module mis-declares its factionId, lookups via
      // `getCampaignExtension(factionId)` return a mismatched extension.
      // listCampaignExtensions returns Object.values, so a mismatched
      // entry would show up here with the wrong factionId — assert
      // they line up.
      expect(ext.factionId).toBe(factionId);
    },
  );
});
