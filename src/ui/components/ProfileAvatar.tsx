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

interface Props {
  size?: number;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileAvatar({ size = 32 }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => platformBridge().profile.getProfile());
  const [imgFailed, setImgFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Refresh on the custom event so async sign-in results land.
  useEffect(() => {
    const onChanged = () => {
      setProfile(platformBridge().profile.getProfile());
      setImgFailed(false);
    };
    window.addEventListener('td-profile-changed', onChanged);
    return () => window.removeEventListener('td-profile-changed', onChanged);
  }, []);

  // Click → trigger sign-in if no profile yet. For platforms that
  // support re-authentication (e.g. Game Center's account picker),
  // future enhancement: open a "switch account" menu here instead.
  const onClick = useCallback(async () => {
    if (profile || busy) return;
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
  }, [profile, busy]);

  const hasImage = profile?.avatarUrl && !imgFailed;
  const title = profile
    ? `${profile.displayName} — ${profile.provider}`
    : busy
      ? 'Signing in…'
      : 'Tap to sign in';

  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: '2px solid var(--gold, #e8b76d)',
    cursor: profile ? 'default' : 'pointer',
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

  if (hasImage) {
    return (
      <img
        src={profile!.avatarUrl!}
        alt={profile!.displayName}
        title={title}
        width={size}
        height={size}
        style={baseStyle}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Placeholder — initials (if we have a display name) or a single
  // '?' when there's no profile at all.
  return (
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
}
