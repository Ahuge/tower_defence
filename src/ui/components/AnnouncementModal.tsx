/**
 * AnnouncementModal — full-screen take-over for the newest unseen
 * announcement on the main menu.
 *
 * Self-gates on three conditions, polled on mount + on
 * `td-announcements-changed`:
 *   1. There IS a newest-unseen announcement (registry vs profile flags)
 *   2. The current screen is `'menu'` (we don't pop over the in-game
 *      HUD, the loading screen, the lobby, etc. — only on the main
 *      menu where the player isn't actively doing something else)
 *   3. No level-up / faction-unlock modal is currently in the queue
 *      (those carry more immediate intent — see `<LevelUpModal />`,
 *      `<FactionUnlockSplash />`. We just yield by checking
 *      `td-modal-active` window flag below.)
 *
 * Closing the modal calls `PlayerProfile.markAnnouncementSeen(id)`
 * which dispatches `td-announcements-changed` so the profile-avatar
 * badge + the mailbox panel re-render.
 *
 * Mailbox row click flows through here too via the `td-announcement-
 * open` event — the modal opens the requested id even when it's
 * already been seen, so a player can re-read any past announcement.
 */
import { useEffect, useState } from 'preact/hooks';
import { FACTIONS } from '../../data/Factions';
import {
  getNewestUnseen,
  getAnnouncement,
  type Announcement,
  type AnnouncementSection,
} from '../../data/Announcements';
import { PlayerProfile } from '../../systems/profile/PlayerProfile';
import { UIBridge } from '../UIBridge';
import { FullscreenOverlay } from './FullscreenOverlay';

const BASE_URL: string = (import.meta as any).env?.BASE_URL ?? '/';

/** Picks the portrait hero art variant on tall viewports (phone), falls
 *  back to the landscape file on wide viewports / when only landscape is
 *  authored. Mirrors the same media query LoadingScreen uses. */
function useIsPortraitViewport(): boolean {
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-aspect-ratio: 1/1)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-aspect-ratio: 1/1)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return portrait;
}

export function AnnouncementModal() {
  const [active, setActive] = useState<Announcement | null>(null);
  /** True when the player explicitly opened a past announcement from
   *  the mailbox. Suppresses the auto-mark-seen on close so re-reading
   *  doesn't change anything. */
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    // Auto-pop the newest unseen IF we're on the menu. Polled on
    // mount + on screen-change events.
    const tryAutoPop = () => {
      if (active) return;                              // a modal is already open
      if (UIBridge.getScreen() !== 'menu') return;     // wrong screen
      const next = getNewestUnseen();
      if (!next) return;
      setActive(next);
      setReviewMode(false);
    };
    tryAutoPop();
    const unsubScreen = UIBridge.onScreenChange(() => tryAutoPop());

    // Mailbox rows fire this event with the requested id. Bypasses
    // the seen check so the player can re-read.
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { id?: string } | undefined;
      if (!detail?.id) return;
      const a = getAnnouncement(detail.id);
      if (!a) return;
      setActive(a);
      setReviewMode(true);
    };
    window.addEventListener('td-announcement-open', onOpen);
    return () => { unsubScreen(); window.removeEventListener('td-announcement-open', onOpen); };
  }, [active]);

  const isPortrait = useIsPortraitViewport();

  if (!active) return null;
  const accentColor = active.factionAccent
    ? '#' + FACTIONS[active.factionAccent].primaryColor.toString(16).padStart(6, '0')
    : 'var(--gold)';
  const heroArtSrc = active.heroArt
    ? `${BASE_URL}${(isPortrait && active.heroArtPortrait) ? active.heroArtPortrait : active.heroArt}`
    : null;

  const dismiss = () => {
    if (!reviewMode) PlayerProfile.markAnnouncementSeen(active.id);
    setActive(null);
    setReviewMode(false);
  };

  return (
    <FullscreenOverlay onClose={dismiss} backdrop="gradient" zIndex={850}>
      <style>{`
        @keyframes announcementRise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes announcementGlow {
          0%, 100% { box-shadow: 0 0 0 1px ${accentColor}55, 0 24px 64px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 1px ${accentColor}aa, 0 24px 72px ${accentColor}33; }
        }
      `}</style>

      {/* Backdrop accent glow — sits behind the card and tints the
          fullscreen scrim toward the announcement's faction colour. */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 35%, ${accentColor}22 0%, transparent 60%)`,
      }} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          width: 'min(92vw, 720px)',
          maxHeight: '88vh',
          padding: '32px clamp(20px, 4vw, 40px)',
          background: 'var(--bg-surface)',
          border: `1px solid ${accentColor}`,
          borderRadius: '14px',
          overflowY: 'auto',
          animation: 'announcementRise 320ms ease-out, announcementGlow 4s ease-in-out infinite',
        }}
      >
        {heroArtSrc && (
          <img
            src={heroArtSrc}
            alt=""
            aria-hidden="true"
            style={{
              display: 'block',
              width: 'calc(100% + clamp(40px, 8vw, 80px))',
              margin: '-32px calc(clamp(20px, 4vw, 40px) * -1) 0',
              aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
              objectFit: 'cover',
              borderTopLeftRadius: '13px',
              borderTopRightRadius: '13px',
              maskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent 100%)',
            }}
          />
        )}

        <div style={{
          fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>Announcement · {formatDate(active.publishedAt)}</div>

        <div style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: 'clamp(28px, 5vw, 40px)',
          color: accentColor,
          lineHeight: 1.1,
        }}>{active.title}</div>

        {active.body.map((s, i) => <SectionView key={i} section={s} accent={accentColor} />)}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button class="btn btn-gold" onClick={dismiss}>
            {reviewMode ? 'Close' : 'Got it'}
          </button>
        </div>
      </div>
    </FullscreenOverlay>
  );
}

function SectionView({ section, accent }: { section: AnnouncementSection; accent: string }) {
  switch (section.kind) {
    case 'lead':
      return (
        <div style={{
          fontSize: 'clamp(14px, 2.4vw, 17px)',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
        }}>{section.text}</div>
      );
    case 'paragraph':
      return (
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>{section.text}</div>
      );
    case 'feature':
      return (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderLeft: `2px solid ${accent}`,
          borderRadius: '0 6px 6px 0',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: 'bold', color: accent, marginBottom: '4px',
          }}>{section.title}</div>
          <div style={{
            fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55,
          }}>{section.body}</div>
        </div>
      );
    case 'list':
      return (
        <ul style={{
          margin: 0, paddingLeft: '20px',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
  }
}

/** "2026-05-09" → "May 9, 2026" — keeps the modal headline approachable
 *  without forcing every consumer to import a date library. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
