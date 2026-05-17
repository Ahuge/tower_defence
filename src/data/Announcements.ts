/**
 * Announcements — feature-launch broadcast registry.
 *
 * One entry per major drop ("Campaigns Released", "Hero Defense
 * arrives", etc.). The newest unseen announcement auto-pops on the
 * main menu via AnnouncementModal; older unseen ones surface only as
 * a count badge on the profile avatar, and the player reads them
 * from the Settings/Profile screen's mailbox section.
 *
 * Schema is structured (not markdown / JSX) so a future server-fetch
 * path can serialise it without a parser. Each consumer (modal,
 * mailbox row) decides how to render the section types.
 *
 * Persistence — seen state lives on `PlayerProfile.flags` under the
 * key `announcement_seen.<id>`. See PlayerProfile.markAnnouncement
 * Seen / hasSeenAnnouncement.
 */
import type { FactionId } from './Factions';
import { PlayerProfile } from '../systems/profile/PlayerProfile';

export { ANNOUNCEMENT_CHANGED_EVENT, ANNOUNCEMENT_OPEN_EVENT } from './AnnouncementEvents';

/** "2026-05-09" → "May 9, 2026". Shared between modal headline + mailbox
 *  row so they stay consistent. The registry validates date format in
 *  Announcements.test.ts, so `toLocaleDateString` always sees a real
 *  date; no parse-failure branch. */
export function formatAnnouncementDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** One body section. The modal renders these top-to-bottom; the
 *  mailbox preview only uses `summary` + the first `lead`. */
export type AnnouncementSection =
  | { kind: 'lead'; text: string }
  | { kind: 'feature'; title: string; body: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export interface Announcement {
  /** Stable id — used as the persistence key. Never rename. */
  id: string;
  /** ISO date string. Used to sort newest-first. */
  publishedAt: string;
  /** Headline shown in the modal + mailbox row. */
  title: string;
  /** One-line teaser shown in the mailbox row underneath the title. */
  summary: string;
  /** Optional hero art URL — landscape variant. The modal swaps to a
   *  portrait variant on phone via the `heroArtPortrait` field. */
  heroArt?: string;
  heroArtPortrait?: string;
  /** Optional faction id — drives the accent colour for borders +
   *  highlight glows in the modal. */
  factionAccent?: FactionId;
  /** Body sections, rendered in order in the modal. */
  body: AnnouncementSection[];
}

/** Authoritative registry. Add new announcements at the TOP — the
 *  helpers below sort by `publishedAt` so insertion order doesn't
 *  matter for correctness, but reviewers will look at the top first. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'mech-campaign-iron-cascade',
    publishedAt: '2026-05-10',
    title: 'Iron Cascade',
    summary: 'The Mechanical campaign is live. Ten missions of collapsing spires, industrial warfare, and the hunt for Lord-Architect Voss.',
    factionAccent: 'mechanical',
    heroArt: 'assets/announcements/mech_campaign_iron_cascade_landscape.webp',
    body: [
      {
        kind: 'lead',
        text: 'Lord-Architect Voss has outlawed magic. As Master Vael of the Eastern Spire, you must survive the fall of the old world, pursue the foundry-legions across the frontier, and bring down the machines before they consume the last Arcane strongholds.',
      },
      {
        kind: 'feature',
        title: 'A Three-Act Campaign',
        body: 'Defend Arcane outposts, recover stolen tomes, survive the fall of the Eastern Spire, and strike back against Voss\'s industrial empire. The campaign escalates from desperate defensive battles into sabotage missions, mechanized duels, and a final assault on the foundry-throne itself.',
      },
      {
        kind: 'feature',
        title: 'Suppression Pylons',
        body: 'Voss\'s signature anti-Arcane weapon appears throughout the campaign. These towering field generators periodically disrupt nearby towers, forcing players to either disable them mid-battle or fight through stalled defenses. Carry the rhythm of the pylons, or lose the line.',
      },
      {
        kind: 'feature',
        title: 'M10 — The Overthrow',
        body: 'The finale introduces a new assault-focused mission structure. Train Raider squads from a forward Workshop, upgrade them throughout the battle, and push deep into the foundry complex while dismantling the shield network protecting Voss\'s throne. Destroy the generators, collapse the defenses, and bring the Architect down inside his own fortress.',
      },
      {
        kind: 'feature',
        title: 'Mechanical Faction Unlock',
        body: 'Complete Iron Cascade to unlock the Mechanical faction across every other game mode. Players who already purchased Mechanical with Shards receive their Core refund automatically.',
      },
      {
        kind: 'paragraph',
        text: 'Mechanical visuals, faction storylines, and campaign presentation continue to expand in future drops. The full ten-mission campaign is playable now.',
      },
    ],
  },
  {
    id: 'campaigns-released',
    publishedAt: '2026-05-09',
    title: 'Arcane Campaign',
    summary: 'Faction campaigns, mission archetypes, and the full Arcane M1–M10 storyline are now live.',
    factionAccent: 'arcane',
    heroArt: 'assets/announcements/campaigns_released_landscape.webp',
    body: [
      {
        kind: 'lead',
        text: 'The campaign system has arrived. Choose a faction, fight through its ten-mission storyline, and unlock new towers, powers, and playable factions along the way.',
      },
      {
        kind: 'feature',
        title: 'Arcane Campaign — M1 to M10',
        body: 'Fight through ten handcrafted missions as the Coalition struggles against the Arcane Cabal invasion. What begins as a desperate defense slowly transforms into a war fought with stolen Arcane weapons, culminating in The Reckoning, a final siege where you summon the Forgemaster herself to break the Cabal fortress.',
      },
      {
        kind: 'feature',
        title: 'Mission Archetypes',
        body: 'Campaign missions now span multiple archetypes including Boss Rush, Speedrun, Frugal Loadout, Hero Duel, Co-op Defense, Restriction Missions, and Final Showdowns. Each archetype ships with tailored rules, pacing, and objectives built around its scenario.',
      },
      {
        kind: 'feature',
        title: 'Faction Tree Unlock Route',
        body: 'Arcane serves as the starting faction path. Spend Shards to unlock new faction campaigns, complete them to make those factions playable across every game mode, and progress deeper into advanced faction branches. Capstone factions like Harmonic require multiple faction completions before they unlock.',
      },
      {
        kind: 'feature',
        title: 'First-Launch Onboarding',
        body: 'New players now begin with an optional guided tutorial run designed to teach the fundamentals in under three minutes. Returning players still boot directly into the main menu with tutorial access available on demand.',
      },
      {
        kind: 'paragraph',
        text: 'Every campaign mission tracks star objectives, faction completion progress, and your overall cross-campaign completion total in the player profile.',
      },
    ],
  },
];

// ─── Read API ─────────────────────────────────────────────────

/** Sort newest-first (string-compare on ISO dates is correct). */
function byPublishedDesc(a: Announcement, b: Announcement): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

/** All announcements in the registry, newest-first. */
export function getAnnouncements(): Announcement[] {
  return [...ANNOUNCEMENTS].sort(byPublishedDesc);
}

/** Look up by id. Used by the mailbox row → re-open flow. */
export function getAnnouncement(id: string): Announcement | null {
  return ANNOUNCEMENTS.find(a => a.id === id) ?? null;
}

/** Newest unseen announcement, or null if the player has read every
 *  one. Drives AnnouncementModal's auto-pop on menu mount. */
export function getNewestUnseen(): Announcement | null {
  for (const a of getAnnouncements()) {
    if (!PlayerProfile.hasSeenAnnouncement(a.id)) return a;
  }
  return null;
}

/** Number of unseen announcements. Drives the badge on ProfileAvatar.
 *  Computed against the live profile flags each call — no caching, the
 *  registry is small (<100 entries forever) so the linear scan is
 *  cheap. */
export function getUnseenCount(): number {
  let n = 0;
  for (const a of ANNOUNCEMENTS) {
    if (!PlayerProfile.hasSeenAnnouncement(a.id)) n++;
  }
  return n;
}
