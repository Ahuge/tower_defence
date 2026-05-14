/**
 * Shared shape for per-campaign text files.
 *
 * Every campaign exports a `CampaignTexts` object containing all
 * player-facing narrative content: the campaign's title + intro/outro,
 * plus each mission's name, story, and the two objective labels.
 *
 * The corresponding `CampaignDef` (e.g. `arcane.ts`) holds only logic:
 * archetype, mapId, restrictions, waveScript, predicates. It imports
 * its texts file and references entries by mission `id` — so editors
 * can audit and rewrite story copy without touching gameplay code, and
 * the TS compiler enforces that every mission has a matching text
 * entry.
 */
export interface MissionText {
  /** Mission display name (e.g. "The Pass"). */
  name: string;
  /** Multi-paragraph story shown on the briefing screen. Plain text;
   *  use blank lines for paragraph breaks. */
  story: string;
  /** Star objective labels. Bound by `idx` (star 2 / star 3) — star 1
   *  is "win the mission", always implicit. */
  objectives: {
    star2: string;
    star3: string;
  };
}

export interface CampaignTexts {
  campaign: {
    /** Campaign title shown in the lobby and on the map. */
    name: string;
    /** Pre-mission intro shown when the player first opens this
     *  campaign tab. */
    intro: string;
    /** Post-mission outro shown after the final mission completes. */
    outro: string;
  };
  /** Keyed by `MissionDef.id`. Order in the file should mirror mission
   *  order so an editor can read the campaign top-to-bottom. */
  missions: Record<string, MissionText>;
}
