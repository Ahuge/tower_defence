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
    summary: 'The Mechanical campaign is live — ten missions of Vael vs Voss, a new finale mechanic, and Voss\'s Suppression Pylons across the frontier.',
    factionAccent: 'mechanical',
    body: [
      {
        kind: 'lead',
        text: 'Lord-Architect Voss has outlawed magic. Master Vael — Arcane archmage of the Eastern Spire — has ten engagements to break the foundries and end the cascade.',
      },
      {
        kind: 'feature',
        title: 'A Three-Act Arc',
        body: 'M1–M3 defend the spire\'s outposts and recover stolen tomes. M4 is the inciting loss — the spire falls. M5–M7 pursue Voss east on rationed reserves. M8–M10 strike at his industrial heart: a saboteur attacker run, a duel with his Ace, and the throne overthrow.',
      },
      {
        kind: 'feature',
        title: 'Suppression Pylons',
        body: 'Voss\'s signature device. Pre-placed on M2 / M5 / M6 / M8, indestructible by spell, project a stress field that stalls Arcane towers inside it after a few shots. Click a pylon to channel a 2.5s counter — mutes it for 15s. Carry the rhythm or lose the engagement.',
      },
      {
        kind: 'feature',
        title: 'M10 — The Overthrow',
        body: 'New finale mechanic. A pre-placed Workshop trains Raider units on a gold + cooldown gate; three global upgrade tiers (Plate / Edge / Tread) stamp at build time, not retroactively. Four power generators each guard a tower cluster — destroying a generator cascade-kills its towers, and the Throne is invulnerable until every generator falls. Permadeath Raiders, no caps, no auto-respawn. Squad-management TD inside the campaign\'s last hour.',
      },
      {
        kind: 'feature',
        title: 'Mechanical Unlocked on Completion',
        body: 'Beating M10 unlocks Mechanical in every other mode for free — the spoils of Voss\'s foundry. Players who already paid Shards for Mechanical get the Cores refund as normal.',
      },
      {
        kind: 'paragraph',
        text: 'Story copy + Mech-themed visuals. Bespoke art is rolling in over the next drops; the gameplay is shippable today.',
      },
    ],
  },
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
