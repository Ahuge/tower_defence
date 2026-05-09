/**
 * Player profile avatar — shows the signed-in player's image from
 * whichever `ProfileBridge` implementation is active:
 *
 *   - Android:  Play Games Services profile photo
 *   - iOS:      Game Center profile photo (when we wire it)
 *   - Steam:    Steam profile avatar (when we wire it)
 *   - Electron: falls through to whichever of the above applies
 *   - Web:      no photo — renders an initials circle placeholder
 *
 * The contract is `platformBridge().profile.getProfile()`; everything
 * else — the URL, the provider id, the display name — is whatever
 * that bridge returns. Swapping platforms requires zero component
 * changes as long as the new bridge implements the same interface.
 *
 * Self-refreshes on the window event `td-profile-changed`, which
 * main.ts dispatches after the async sign-in resolves. So a player
 * who lands on the menu before Play Games finishes sign-in sees the
 * avatar pop in a moment later without any manual poll.
 */
import { useEffect, useState, useCallback } from 'preact/hooks';
import { platformBridge } from '../../systems/platform';
import type { PlayerProfile } from '../../systems/platform';
import { getUnseenCount } from '../../data/Announcements';
import { ANNOUNCEMENT_CHANGED_EVENT } from '../../data/AnnouncementEvents';

interface Props {
  size?: number;
  /**
   * Override for the default click behavior. When present, the
   * avatar calls this instead of triggering `profile.signIn()` on
   * tap. Used by the shared Header to route every avatar click
   * into the Settings screen — sign-in lives inside Settings as
   * one affordance among several (restore purchases, tutorial
   * reset, analytics opt-out), so the avatar click only needs to
   * get the user to that screen.
   */
  onClickOverride?: () => void;
}

function computeTitle(
  profile: PlayerProfile | null,
  busy: boolean,
  routesToSettings: boolean,
): string {
  if (!profile) return busy ? 'Signing in…' : 'Tap to sign in';
  const base = `${profile.displayName} — ${profile.provider}`;
  return routesToSettings ? `${base} · tap for settings` : base;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileAvatar({ size = 32, onClickOverride }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => platformBridge().profile.getProfile());
  const [imgFailed, setImgFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unseenAnnouncements, setUnseenAnnouncements] = useState(() => getUnseenCount());

  // Refresh on the custom event so async sign-in results land.
  useEffect(() => {
    const onChanged = () => {
      setProfile(platformBridge().profile.getProfile());
      setImgFailed(false);
    };
    window.addEventListener('td-profile-changed', onChanged);
    return () => window.removeEventListener('td-profile-changed', onChanged);
  }, []);

  // Live-refresh the announcements badge when the player marks one
  // seen (modal close, mailbox row click) anywhere in the app.
  useEffect(() => {
    const onAnnouncements = () => setUnseenAnnouncements(getUnseenCount());
    window.addEventListener(ANNOUNCEMENT_CHANGED_EVENT, onAnnouncements);
    return () => window.removeEventListener(ANNOUNCEMENT_CHANGED_EVENT, onAnnouncements);
  }, []);

  // Click behaviour. The shared Header passes `onClickOverride` that
  // routes every tap to the Settings screen — sign-in is one option
  // inside Settings, alongside restore purchases / tutorial reset /
  // analytics opt-out. When there's no override (legacy standalone
  // use), fall back to triggering sign-in directly on a missing
  // profile; that preserves the behaviour of the first landing
  // before the Header refactor.
  const onClick = useCallback(async () => {
    if (busy) return;
    if (onClickOverride) {
      onClickOverride();
      return;
    }
    if (profile) return;
    setBusy(true);
    try {
      const p = await platformBridge().profile.signIn();
      setProfile(p);
      setImgFailed(false);
      window.dispatchEvent(new Event('td-profile-changed'));
    } catch {
      // Ignore — the profile stays null, user sees placeholder.
    } finally {
      setBusy(false);
    }
  }, [profile, busy, onClickOverride]);

  const hasImage = profile?.avatarUrl && !imgFailed;
  const clickable = !!onClickOverride || !profile;
  const title = computeTitle(profile, busy, !!onClickOverride);

  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: '2px solid var(--gold, #e8b76d)',
    cursor: clickable ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-panel, #1a1520)',
    color: 'var(--gold, #e8b76d)',
    fontFamily: 'VT323, ui-monospace, monospace',
    fontSize: `${Math.round(size * 0.5)}px`,
    lineHeight: 1,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const inner = hasImage
    ? (
      <img
        src={profile!.avatarUrl!}
        alt={profile!.displayName}
        title={title}
        width={size}
        height={size}
        style={baseStyle}
        onClick={clickable ? onClick : undefined}
        onError={() => setImgFailed(true)}
      />
    )
    : (
      // Placeholder — initials (if we have a display name) or a single
      // '?' when there's no profile at all.
      <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={busy}
        style={{ ...baseStyle, padding: 0 }}
      >
        {busy ? '…' : initialsOf(profile?.displayName)}
      </button>
    );

  // Wrap in a positioned container so the unread-announcements badge
  // can overlay the upper-right corner of the avatar without
  // disturbing surrounding layout.
  if (unseenAnnouncements <= 0) return inner;
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: `${size}px`, height: `${size}px` }}>
      {inner}
      <UnreadBadge count={unseenAnnouncements} avatarSize={size} />
    </div>
  );
}

/** Red-pill count overlay anchored to the upper-right of the avatar.
 *  Caps display at "9+" so a backlog of announcements doesn't break
 *  the avatar's circular silhouette. */
function UnreadBadge({ count, avatarSize }: { count: number; avatarSize: number }) {
  const label = count > 9 ? '9+' : String(count);
  const dim = Math.max(14, Math.round(avatarSize * 0.5));
  return (
    <div
      title={`${count} unread announcement${count === 1 ? '' : 's'}`}
      aria-label={`${count} unread announcements`}
      style={{
        position: 'absolute',
        top: `-${Math.round(dim * 0.2)}px`,
        right: `-${Math.round(dim * 0.2)}px`,
        minWidth: `${dim}px`,
        height: `${dim}px`,
        padding: '0 5px',
        borderRadius: `${dim}px`,
        background: 'var(--jewel-red, #d04848)',
        color: '#fff',
        fontFamily: 'VT323, ui-monospace, monospace',
        fontSize: `${Math.round(dim * 0.7)}px`,
        lineHeight: `${dim}px`,
        textAlign: 'center',
        border: '2px solid var(--bg-base, #15101a)',
        boxSizing: 'content-box',
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
  );
}
