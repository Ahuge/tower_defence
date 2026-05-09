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
    id: 'campaigns-released',
    publishedAt: '2026-05-09',
    title: 'Arcane Campaign',
    summary: 'Story-driven faction campaigns, mission archetypes, and the Arcane M1–M10 storyline are live.',
    factionAccent: 'arcane',
    heroArt: 'assets/announcements/campaigns_released_landscape.webp',
    body: [
      {
        kind: 'lead',
        text: 'The campaign system shipped. Pick a faction, beat their ten-mission storyline, and unlock them in every other mode along the way.',
      },
      {
        kind: 'feature',
        title: 'Arcane Campaign — M1 to M10',
        body: 'Ten hand-authored missions that take the Arcane Coalition from Briarroot patrol duty all the way to The Reckoning at the Archmage Spire — a hybrid siege finale where you summon a controllable mage hero and raze a fortified throne.',
      },
      {
        kind: 'feature',
        title: 'Mission Archetypes',
        body: 'Beyond Standard, missions can ship as Boss Rush, Speedrun, Frugal-loadout, Hero Duel, Coop-with-Bot, Restriction, or Final Showdown. Each archetype defaults the difficulty + wave count + restrictions so the design stays consistent across a campaign.',
      },
      {
        kind: 'feature',
        title: 'Faction Tree Unlock Route',
        body: 'Factions tier off Arcane (free root). Spend Shards to purchase a faction\'s campaign, beat the campaign, and the faction becomes playable in every other mode. Capstone factions like Harmonic require unlocking N peers first.',
      },
      {
        kind: 'feature',
        title: 'First-Launch Onboarding',
        body: 'Brand-new players land on a welcome splash that offers a 3-minute guided tutorial round. Returning players boot straight into the menu with the existing tutorial-on-demand carousel.',
      },
      {
        kind: 'paragraph',
        text: 'Every campaign mission tracks per-mission stars (1 for win, 2-3 for objectives), rolls into a per-faction completion bar, and feeds the cross-campaign total in your profile.',
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
