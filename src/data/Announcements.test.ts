import { describe, it, expect, beforeEach } from 'vitest';
import {
  ANNOUNCEMENTS,
  getAnnouncements,
  getAnnouncement,
  getNewestUnseen,
  getUnseenCount,
} from './Announcements';
import { PlayerProfile } from '../systems/profile/PlayerProfile';
import { PlayerProfileStore } from '../systems/profile/PlayerProfileStore';

describe('Announcements registry', () => {
  beforeEach(() => {
    PlayerProfileStore.reset();
  });

  it('exposes at least one announcement', () => {
    expect(ANNOUNCEMENTS.length).toBeGreaterThan(0);
  });

  it('every entry has the required fields', () => {
    for (const a of ANNOUNCEMENTS) {
      expect(a.id).toMatch(/^[a-z0-9-]+$/);
      expect(a.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.summary.length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
    }
  });

  it('ids are unique', () => {
    const ids = new Set(ANNOUNCEMENTS.map(a => a.id));
    expect(ids.size).toBe(ANNOUNCEMENTS.length);
  });

  it('getAnnouncements sorts newest-first', () => {
    const list = getAnnouncements();
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].publishedAt >= list[i].publishedAt).toBe(true);
    }
  });

  it('getAnnouncement returns null for unknown id', () => {
    expect(getAnnouncement('does-not-exist')).toBeNull();
  });
});

describe('Announcement seen state', () => {
  beforeEach(() => {
    PlayerProfileStore.reset();
  });

  it('getNewestUnseen returns the newest entry on a fresh profile', () => {
    const newest = getAnnouncements()[0];
    expect(getNewestUnseen()?.id).toBe(newest.id);
  });

  it('getUnseenCount equals the registry size on a fresh profile', () => {
    expect(getUnseenCount()).toBe(ANNOUNCEMENTS.length);
  });

  it('marking the newest as seen surfaces the next-newest', () => {
    if (ANNOUNCEMENTS.length < 2) return; // can't exercise with single entry
    const [first, second] = getAnnouncements();
    PlayerProfile.markAnnouncementSeen(first.id);
    expect(getNewestUnseen()?.id).toBe(second.id);
    expect(getUnseenCount()).toBe(ANNOUNCEMENTS.length - 1);
  });

  it('marking every announcement seen returns null + zero count', () => {
    for (const a of ANNOUNCEMENTS) PlayerProfile.markAnnouncementSeen(a.id);
    expect(getNewestUnseen()).toBeNull();
    expect(getUnseenCount()).toBe(0);
  });

  it('markAnnouncementSeen is idempotent', () => {
    const first = getAnnouncements()[0];
    PlayerProfile.markAnnouncementSeen(first.id);
    PlayerProfile.markAnnouncementSeen(first.id); // second call should no-op
    expect(getUnseenCount()).toBe(ANNOUNCEMENTS.length - 1);
    expect(PlayerProfile.hasSeenAnnouncement(first.id)).toBe(true);
  });
});
