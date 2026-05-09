/** Window event names for the announcements pub/sub. Lives in its own
 *  file so PlayerProfile (the publisher) and Announcements.ts (which
 *  imports PlayerProfile) can both reference them without a cycle. */

export const ANNOUNCEMENT_CHANGED_EVENT = 'td-announcements-changed';
export const ANNOUNCEMENT_OPEN_EVENT = 'td-announcement-open';
